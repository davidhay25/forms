//EHR and MDM controller

angular.module("formsApp")
    .controller('mdmCtrl',
        function ($scope,$http,formsSvc) {

            $scope.input = {}
            $scope.allRegimens = [{display:"Lung Cancer regimen",url:"http://canshare.com/lungCancerPlan"}]


            $http.get("./globals.json").then(
                function(data) {
                    console.log(data)
                    $scope.globals = data.data
                    getActiveSR()
                }
            )

            //retrieve all active ServiceRequests, and the CarePlans that reference those SR's through CP.
            function getActiveSR() {
                let pathCode = $scope.globals.mdmrefer.coding[0].system + "|"+ $scope.globals.mdmrefer.coding[0].code
                let qry = "/ds/fhir/ServiceRequest?status=active&category=" + pathCode
                //qry += "&_include=ServiceRequest:based-on"
              //  qry += "&_revinclude=DiagnosticReport:based-on"
              //  qry += "&_revinclude=Observation:based-on"

                $http.get(qry).then(
                    function (data) {
                        $scope.allSR = [];
                        $scope.hashCarePlan = {}
                        if (data.data.entry) {
                            data.data.entry.forEach(function (entry){
                                let resource = entry.resource
                                $scope.allSR.push(resource)
                                /*
                                switch (resource.resourceType) {
                                    case "ServiceRequest" :
                                        $scope.allSR.push(resource)
                                        break
                                    case "carePlan" :
                                        $scope.hashCarePlan["CarePlan/"+resource.id] = resource
                                        break
                                }
                                */

                            })
                        }
                        console.log($scope.allSR)
                    }
                )
            }
            //getActiveSR()


            $scope.applyRegimen = function(regimen,dx) {



                if (confirm("Are you sure you wish to apply this carePlan")) {


                    let bundle = {resourceType: "Bundle", type: "transaction", entry: []}

                    //mark the SR as completed
                    $scope.selectedSR.status = "completed"
                    bundle.entry.push(formsSvc.createPUTEntry($scope.selectedSR))      //add the SR

                    //Create a Condition for the top level CP
                    let condition = {resourceType: "Condition", id: formsSvc.createUUID()}
                    condition.clinicalStatus = "active"
                    condition.verificationStatus = "confirmed"
                    condition.subject = $scope.selectedSR.subject
                    condition.code = {text: dx}
                    bundle.entry.push(formsSvc.createPOSTEntry(condition))

                    //add the condition to the careplan, and add the CP to the bundle for update
                    $scope.selectedCarePlan.addresses = $scope.selectedCarePlan.addresses || []
                    $scope.selectedCarePlan.addresses.push({reference: "urn:uuid:" + condition.id})
                    bundle.entry.push(formsSvc.createPUTEntry($scope.selectedCarePlan))

/*

                    //the top level careplan (created when the pathrequest was submitted) id referenced from the SR
                    //note there is a question around when the top level CP should be created

                    let topLevelPlanRef
                    if ($scope.selectedSR.basedOn) {
                        //for now
                        $scope.selectedSR.basedOn.forEach(function (bo){
                            if (bo.reference && bo.reference.indexOf('CarePlan') > -1) {
                                //topLevelPlan =
                            }
                        })
                    }
*/

/*
                    //create the top level ?treatment CarePlan
                    let cpTreat = {resourceType: "CarePlan", id: formsSvc.createUUID()}
                    cpTreat.status = "active"
                    cpTreat.intent = "plan"
                    cpTreat.period = {start:"2022-01-01",end:"2023-01-01"}
                    cpTreat.category = $scope.globals.treatmentCPCategory // {text: "Treatment level plan"}
                    cpTreat.title = "The top level plan describing treatment for this condition"
                    cpTreat.subject = $scope.selectedSR.subject
                    cpTreat.addresses = [{reference: "urn:uuid:" + condition.id}]
                    bundle.entry.push(formsSvc.createPOSTEntry(cpTreat))
*/

                    //create the regimen CarePlan. dummy data for ow - would come from the regimens service
                    let cpRegimen = {resourceType: "CarePlan", id: formsSvc.createUUID()}
                    cpRegimen.status = "active"
                    cpRegimen.intent = "plan"
                    cpRegimen.period = {start:"2022-01-01",end:"2022-06-01"}
                    cpRegimen.category = $scope.globals.regimenCPCategory //{text: "Treatment level plan"}
                    cpRegimen.partOf = {reference: "CarePlan/" + $scope.selectedCarePlan.id}  //as the CP is not being created in this bundle, the real type is used
                    cpRegimen.title = "CarePlan representing regimen"
                    cpRegimen.subject = $scope.selectedSR.subject
                    bundle.entry.push(formsSvc.createPOSTEntry(cpRegimen))

                    //create the first cycle CP
                    let cpCycle = {resourceType: "CarePlan", id: formsSvc.createUUID()}
                    cpCycle.status = "active"
                    cpCycle.intent = "plan"
                    cpCycle.period = {start:"2022-01-01",end:"2023-02-01"}
                    cpCycle.category = $scope.globals.cycleCPCategory //{text: "Treatment level plan"}
                    cpCycle.partOf = {reference: "urn:uuid:" + cpRegimen.id}
                    cpCycle.title = "First cycle"
                    cpCycle.extension = [{url:$scope.globals.cycleNumberExt,valueInteger:1}]


                    cpCycle.subject = $scope.selectedSR.subject
                    bundle.entry.push(formsSvc.createPOSTEntry(cpCycle))

                    console.log(bundle)

                    //return

                    $http.post("/ds/fhir", bundle).then(
                        function (data) {
                            alert("Resources have been created")
                            console.log(data)
                            delete $scope.selectedQR
                            delete $scope.selectedSR
                            getActiveSR()
                        }, function (err) {
                            alert(angular.toJson(err))
                            console.log(err)
                        }
                    )

                }


            }


            //when a service request is selected
            $scope.selectSR = function(SR) {
                delete $scope.selectedQR
                $scope.selectedSR = SR
                $scope.input.closeSR = true

                //get the patient

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
                                    /* - why again??
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
                                    */

                                }, function(err) {
                                    alert(angular.toJson(err))
                                    console.log(err)
                                }
                            )
                        }
                    })
                }


                //locate the DiagnosticReport. Need the CarePlan id (SR.basedOn) then query DR with based-on set to the CP id
                $scope.pathReport = {}      //the pathology report vo
                let cpId        //CarePlan id
                if (SR.basedOn) {
                    SR.basedOn.forEach(function (ref){
                        if (ref.reference && ref.reference.indexOf('CarePlan')> -1) {
                            //assume only a single careplan (top level)
                            let ar = ref.reference.split('/')   //  carePlan/id
                            cpId = ar[1]
                        }
                    })
                    if (cpId) {
                        //retrieve the CarePlan
                        let qryCP = "/ds/fhir/CarePlan/" + cpId
                        $http.get(qryCP).then(
                            function(data) {
                                $scope.selectedCarePlan = data.data
                            },
                            function (err) {
                                console.log(err)
                            }
                        )


                        //get the DiagnosticReport with 'basedOn' to the careplan
                        let qry = "/ds/fhir/DiagnosticReport?based-on=" + cpId
                        qry += "&_include=DiagnosticReport:result"
                        $http.get(qry).then(
                            function(data) {
                                console.log(data.data)
                                //should be a single DR & Observation
                                if (data.data.entry) {
                                    data.data.entry.forEach(function (entry){
                                        let resource = entry.resource
                                        switch (resource.resourceType) {
                                            case "Observation" :
                                                $scope.pathReport.observation = resource
                                                $scope.pathReport.display = resource.valueString
                                                break
                                            case "DiagnosticReport" :
                                                $scope.pathReport.dr = resource
                                                break
                                        }
                                    })
                                }


                            },
                            function(err) {
                                console.log(err)
                            }
                        )
                    }
                }


            }

        }
    )
