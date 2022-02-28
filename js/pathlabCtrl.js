//Dashboard controller

angular.module("formsApp")
    .controller('pathlabCtrl',
        function ($scope,$http,formsSvc) {

            $scope.input = {}

            //retrieve all active ServiceRequests - todo add filter for type

            $http.get("/ds/fhir/ServiceRequest?status=active&_count=50").then(
                function (data) {
                    $scope.allSR = [];
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry){
                            $scope.allSR.push(entry.resource)
                        })
                    }

                }
            )

            //Have the client create an update transaction
            //todo do we want this to go through a custom operation instead? What would be the reason...
            $scope.submitReport = function(){
                let bundle = {resourceType:"Bundle",type:"transaction",entry:[]}

                $scope.selectedSR.status = "completed"
                bundle.entry.push(formsSvc.createPUTEntry($scope.selectedSR))      //add the SR

                let obs = {resourceType:"Observation", id : formsSvc.createUUID()}
                obs.status = "final"
                obs.code = {text:"Pathology report"}
                obs.issued = new Date().toISOString()
                obs.effectiveDateTime = obs.issued
                obs.valueString = $scope.input.report

                let dr = {resourceType:"DiagnosticReport", id : formsSvc.createUUID()}
                dr.status = "final"
                dr.subject = $scope.selectedSR.subject
                dr.result = [{reference:"Observation/" + obs.id}]
                dr.basedOn = [{reference : "ServiceRequest/" + $scope.selectedSR.id }]
                dr.issued = new Date().toISOString()
                dr.effectiveDateTime = dr.issued

                bundle.entry.push(formsSvc.createPOSTEntry(obs))
                bundle.entry.push(formsSvc.createPOSTEntry(dr))

                console.log(bundle)

                $http.post("/ds/fhir",bundle).then(
                    function (data) {
                        console.log(data)
                    },function (err) {
                        console.log(err)
                    }

                )


            }

            $scope.selectSR = function(SR) {
                $scope.selectedSR = SR

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
