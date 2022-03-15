//EHR and MDM controller

angular.module("formsApp")
    .controller('pathlabCtrl',
        function ($scope,$http,formsSvc) {

            $scope.input = {}

            $http.get("./globals.json").then(
                function(data) {
                    console.log(data)
                    $scope.globals = data.data
                    getActiveSR()
                }
            )
            //let globals = require("./globals.json")


            //retrieve all active ServiceRequests - todo add filter for type

            //todo - different SR codes for lab

            function getActiveSR() {
                let pathCode = $scope.globals.labrefer.coding[0].system + "|"+ $scope.globals.labrefer.coding[0].code
                let qry = "/ds/fhir/ServiceRequest?status=active&category=" + pathCode

                $http.get(qry).then(
                //$http.get("/ds/fhir/ServiceRequest?status=active&_count=50").then(
                    function (data) {
                        $scope.allSR = [];
                        if (data.data.entry) {
                            data.data.entry.forEach(function (entry){
                                $scope.allSR.push(entry.resource)
                            })
                        }
                    }
                )
            }


            //PathLab: Have the client create an update transaction
            //todo do we want this to go through a custom operation instead? What would be the reason...
            $scope.submitReport = function(){
                let bundle = {resourceType:"Bundle",type:"transaction",entry:[]}

                $scope.selectedSR.status = "completed"
                bundle.entry.push(formsSvc.createPUTEntry($scope.selectedSR))      //add the SR

                let obs = {resourceType:"Observation", id : formsSvc.createUUID()}
                obs.status = "final"
                obs.subject = $scope.selectedSR.subject
                //obs.basedOn = [{reference : "ServiceRequest/" + $scope.selectedSR.id }]
                obs.basedOn = $scope.selectedSR.basedOn
                obs.code = {text:"Pathology report"}
                obs.issued = new Date().toISOString()
                obs.effectiveDateTime = obs.issued
                obs.valueString = $scope.input.report

                let dr = {resourceType:"DiagnosticReport", id : formsSvc.createUUID()}
                dr.status = "final"
                dr.subject = $scope.selectedSR.subject
                dr.result = [{reference:"urn:uuid:" + obs.id}]
                //dr.basedOn = [{reference : "ServiceRequest/" + $scope.selectedSR.id }]
                dr.basedOn = $scope.selectedSR.basedOn
                dr.issued = new Date().toISOString()
                dr.effectiveDateTime = dr.issued

                bundle.entry.push(formsSvc.createPOSTEntry(obs))
                bundle.entry.push(formsSvc.createPOSTEntry(dr))

                console.log(bundle)




                $http.post("/ds/fhir",bundle).then(
                    function (data) {
                        console.log(data)
                        delete $scope.selectedQR
                        delete $scope.selectedSR
                        getActiveSR()
                    },function (err) {
                        console.log(err)
                    }

                )


            }

            $scope.selectSR = function(SR) {
                delete $scope.selectedQR
                $scope.selectedSR = SR
                $scope.input.closeSR = true

                //get the patient
                //let patientRef = SR.patient.reference
                $http.get("/ds/fhir/" + SR.subject.reference).then(
                    function(data) {
                        $scope.selectedPatient = data.data
                    }
                )

                //locate the QR from the SR
                if (SR.supportingInfo) {
                    SR.supportingInfo.forEach(function (si){
                        if (si.reference.startsWith("QuestionnaireResponse") ) {
                            // assume there's only 1
                            $http.get("/ds/fhir/" + si.reference).then(
                                function(data) {
                                    $scope.selectedQR = data.data

                                    //Now retrieve the patient
                                    if ($scope.selectedQR.subject && $scope.selectedQR.subject.reference) {
                                        let patientReference = $scope.selectedQR.subject.reference //Patient/id

                                        let ar = patientReference.split('/')
                                        let patientId = ar[1]

                                        $http.get("/ds/fhir/Patient/"+patientId).then(
                                            function(data) {
                                                $scope.selectedPatient = data.data
                                            },
                                            function(err) {
                                                console.log(err)
                                            }
                                        )

                                    }

                                    //selectedPatient



                                    console.log(data.data)
                                }, function(err) {
                                    alert(angular.toJson(err))
                                    console.log(err)
                                }
                            )
                        }
                    })
                }



            }

        }
    )
