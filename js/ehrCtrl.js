//Dashboard controller

angular.module("formsApp")
    .controller('ehrCtrl',
        function ($scope,$http,formsSvc,actnowSvc) {

            $scope.input = {}
            $scope.form = {}

            let validationServer = "http://localhost:9099/baseR4/"
            let termServer = "https://r4.ontoserver.csiro.au/fhir/"

            // ------------ this code is almost the same as that in the dashboard. ? move to a service

            //load all the questionnaires
            $http.get("/fm/fhir/Questionnaire").then(
                function (data) {
                    $scope.allQ = [];
                    data.data.entry.forEach(function (entry){
                        $scope.allQ.push(entry.resource)
                    })
                }
            )



            //when a DiagnosticReport is selected in the Path reports tab
            $scope.selectDR = function (dr) {
                $scope.selectedDR = dr
            }

            //when a CarePlan is selected in the CP tab
            $scope.selectCP = function(cp) {
                $scope.selectedCP = cp

                delete $scope.input.selectedIncommingResource
                //select the incoming resources
                //http://localhost:9099/baseR4/CarePlan?_id=regimenPlan1&_revinclude=Observation:*
                //let qry = "/ds/fhir/DiagnosticReport?based-on="+sr.id+"&_include=DiagnosticReport:result"
                $scope.hashIncomming = {}
                $scope.incommingCount = 0

                let types = ['Observation','ServiceRequest','DiagnosticReport','CarePlan']
                types.forEach(function(type){
                    getResources(cp.id,type,function(ar){
                        $scope.hashIncomming[type] = ar
                        $scope.incommingCount += ar.length
                        console.log($scope.hashIncomming)
                    })

                })
                    /*
                getResources(cp.id,'Observation',function(ar){
                    hashIncomming['Observation'] = ar
                    console.log(hashIncomming)
                })

                getResources(cp.id,'ServiceRequest',function(ar){
                    hashIncomming['ServiceRequest'] = ar
                    console.log(hashIncomming)
                })
*/
                function getResources(cpId,type,cb) {

                    let qry = `/ds/fhir/CarePlan?_id=${cpId}&_revinclude=${type}:*`
                    console.log(qry)
                    $http.get(qry).then(
                        function(data) {
                            let ar = []
                            if (data.data && data.data.entry) {

                                data.data.entry.forEach(function (entry){
                                    if (entry.resource.id !== cpId){
                                        ar.push(entry.resource)
                                    }
                                })
                            }
                            cb(ar)
                        },
                        function(err){

                        }
                    )
//console.log(qry)
                   // let qry = `/ds/fhir/`+type+"?__revinclude=DiagnosticReport:result"
                }


            }
            //construct a simplified logical model of a regimen to ease UI
            $scope.getRegimenSummary = function (cp){
                $scope.regimenLM = actnowSvc.makeRegimenLM(cp,$scope.hashAllCarePlans)
            }

            $scope.recordAdministration = function(act) {
                alert("Will allow the administration times to be recorded")
            }

            //===============  functions for form ===================
            //todo move all this stuff to a separate controller for the renderer
            //used by type-ahead for ValueSet based selection
            $scope.getConcepts = function(val,url) {

                $scope.showWaiting = true;
                let qry =  termServer + "ValueSet/$expand?url=" + url
                //let qry = "https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=" + url
                qry += "&filter=" + val

                return $http.get(qry).then(
                    function(data){
                        //console.log(data.data)
                        let vs = data.data
                        if (vs.expansion) {
                            let ar = []
                            return vs.expansion.contains

                        } else {
                            return [{display:"no matching values"}]
                        }

                        //return [{display:"aaa"},{display:'bbbb'}]
                    },
                    function(err){
                        console.log(err)
                        return [{display:"no matching values"}]
                    }
                ).finally(
                    function() {
                        $scope.showWaiting = false
                    }
                )
            };

            //called when a selection in the type-ahead made. We're not using that ATM except to build the QR
            $scope.selectConcept = function(a,b,c){
                console.log(a,b,c)
                $scope.makeQR()
            }

            //code to show (or not) a conditional group
            $scope.showConditionalGroupDEP = function(item) {
                console.log(item)
                if (item.length > 0) {
                    //we're assuming that there is only a single item of type group
                    let group = item[0]
                    if (group.enableWhen && group.enableWhen.length > 0) {
                        let conditional = group.enableWhen[0]       //only looking at the first one for now
                    }
                }
            }

            //============================


            $scope.validateQR = function(QR){
                let url = validationServer + "QuestionnaireResponse/$validate"
                $http.post(url,QR).then(
                    function(data) {
                        $scope.qrValidationResult = data.data
                    },function(err){
                        $scope.qrValidationResult = err.data

                    }
                )
            }

            $scope.testExtraction = function(){
                //let validationServer = "http://localhost:9099/baseR4/"
                if ($scope.QR) {
                    let url = "/fr/testextract"

                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}
                    bundle.entry.push({resource:$scope.QR})
                    $http.post(url,bundle).then(
                        function(data) {
                            console.log(data)
                            $scope.extractedResources = []



                            data.data.obs.forEach(function (resource){
                                let url = validationServer + resource.resourceType + "/$validate"
                                $http.post(url,resource).then(
                                    function(data) {
                                        $scope.extractedResources.push({resource:resource,OO:data.data,valid:true})
                                    },function(err){

                                        $scope.extractedResources.push({resource:resource,OO:err.data,valid:false})

                                    }
                                )

                            })

                            //add other resources so they're visible in the display

                            $scope.extractedResources.push({resource:$scope.QR,OO:{},valid:true})
                            $scope.extractedResources.push({resource:$scope.input.selectedPatient.resource,OO:{},valid:true})
                            $scope.extractedResources.push({resource:$scope.selectedPractitioner.resource,OO:{},valid:true})

                        }, function(err) {
                            alert(angular.toJson(err.data))
                            console.log(err)
                        }
                    )
                }
            }

            $scope.selectQ = function(Q) {
                $scope.selectedQ = Q

                $scope.formTemplate = formsSvc.makeFormTemplate(Q)


                let vo = formsSvc.makeTreeFromQ(Q)

                //$scope.treeData = vo.treeData
                $scope.hashItem = vo.hash       //all items in teh form hashed by id
                //$scope.selectedSection = Q.item[0]  //show first tab in tab view


                //$scope.formDef = vo.treeData
                formsSvc.makeFormDefinition(vo.treeData).then(
                    function (data) {
                        $scope.formDef = data
                    }
                )

                //generate tabbed model (for tab form view)
                //let arSection = []


                $scope.makeQR()     //create initial QR


                drawTree(vo.treeData)
              // makeFormDef()
            }

            //when a top level item is selected in the tabbed interface
            $scope.selectSectionEDP = function(section) {
                $scope.selectedSection = section

            }

            //---------------------------------------------------------------------------------

            $scope.selectSR = function(SR) {
                $scope.selectedSRForList = SR
            }

            //select a single DR that has a reference to the SR
            $scope.selectSRDR = function(srdr) {
                $scope.selectedSRDR = srdr
            }

            // a ServiceRequest is selected in the workflow tab...
            $scope.selectSRforQR = function(sr) {
                $scope.selectedSR = sr
                delete $scope.SRDRs     //the DR's that have a reference to this SR
                delete $scope.selectedSRDR
                //Is there a DiagnosticReport that references this SR in the 'basedOn
                //actually, there could be more than one...

                let qry = "/ds/fhir/DiagnosticReport?based-on="+sr.id+"&_include=DiagnosticReport:result"
                $http.get(qry).then(
                    function(data) {
                        let bundle = data.data
                        console.log(bundle)

                            $scope.SRDRs = formsSvc.makeDRList(bundle)


                    },
                    function(err) {
                        console.log(err)
                    }
                )

            }

            //invoked whenever an item in the generated form changes...
            $scope.makeQR = function() {
                delete $scope.qrValidationResult
                $scope.QR = formsSvc.makeQR($scope.selectedQ,
                    $scope.form,$scope.hashItem,$scope.selectedPatient,
                    $scope.selectedPractitioner.resource)
                console.log($scope.QR)
                $scope.selectedQR = $scope.QR   //for rendering
/*
                //generate the OML
                $scope.OML = formsSvc.makeORM($scope.selectedQ,
                    $scope.form,$scope.hashItem,$scope.selectedPatient,
                    $scope.selectedPractitioner.resource)
*/
            }


            //an existing QR is selected
            $scope.selectQR = function(QR) {
                //$scope.input.selectedQR = QR  //todo temp
                $scope.selectedQR = QR      //todo ?replace with .QR
                //$scope.QR = QR  // as needed by render
                delete $scope.selectedProvenance
                $scope.selectedProvenanceTargets = []

                //retrieve any ServiceRequests generated by QR during QR processing by the forms receiver.
                //For now, get then all for this patient and manually look for a refernece to the QR
                //todo a custom search is probably a good idea


                $scope.SRforQR = []    //all the SR associated with this QR
                let qry = "/ds/fhir/ServiceRequest?patient=" + $scope.selectedPatient.id
                $http.get(qry).then(
                    function(data) {
                        console.log(data)
                        if (data.data.entry && data.data.entry.length > 0) {
                            data.data.entry.forEach(function (entry){
                                let sr = entry.resource;


                                if (sr.supportingInfo) {
                                    sr.supportingInfo.forEach(function (si){
                                        if (si.reference == 'QuestionnaireResponse/'+ QR.id) {
                                            //yes! this SR refers to the QR
                                            $scope.SRforQR.push(sr)
                                        }
                                    })
                                }
                            })


                        }
                        console.log($scope.SRforQR)
                    }, function(err) {
                        console.log(err)
                    }
                )




/* Don't do this now. Use the provenance resource to get the actually extracted resources

                //figure out the extract based on the current Q def
                let url = "/fr/testextract"
                $http.post(url,QR).then(
                    function(data) {
                        //console.log(data)
                        if (data.data.obs) {
                            $scope.resourcesFromExistingQR = data.data.obs
                        } else {
                            $scope.resourcesFromExistingQR = data.data
                        }

                    }, function(err) {
                        console.log(err)
                        $scope.resourcesFromExistingQR = err.data
                    }
                )
*/
                //get the provenance resource for this QR
                $http.get("/ds/fhir/Provenance?entity=" + QR.id + "&_include=Provenance:target").then(
                    function (data) {

                        console.log(data.data)

                        if (! data.data.entry || data.data.entry.length ==0) {
                            console.log("There should be a single Provenance resource for this form")
                        } else {

                            data.data.entry.forEach(function (entry){
                                let resource = entry.resource;
                                if (resource.resourceType == 'Provenance') {
                                    $scope.selectedProvenance = data.data.entry[0].resource
                                } else {
                                    $scope.selectedProvenanceTargets.push(resource)
                                }
                            })

                        }

                    }, function (err) {
                        console.log(err)
                    }
                )
            }


            $scope.selectResource = function(item) {
                $scope.selectedResource = item.resource
                $scope.selectedResourceValidation = item.OO
            }

            //submit a new QR
            $scope.submitForm = function() {

                //let QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)

                if (confirm("Are you sure you're ready to submit this form")){
                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}
                    bundle.entry.push({resource:$scope.QR})

                    let url = "/fr/fhir/receiveQR"
                    $http.post(url,bundle).then(
                        function(data) {
                            console.log(data.data)
                            alert("Form has been saved, and any Observations extracted and saved")
                            $scope.selectPatient()  //to read the new data
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            //when a patient is selected - load the QR from the data server
            $scope.selectPatient = function() {
                delete $scope.allDR
                $scope.existingQR = []
                console.log($scope.input.selectedPatient)
                $scope.selectedPatient = $scope.input.selectedPatient.resource;



                //get all the QR for this patient from the data server
                let url = "/ds/fhir/QuestionnaireResponse?patient="+$scope.input.selectedPatient.resource.id
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        if (data.data && data.data.entry) {
                            data.data.entry.forEach(function (entry){
                                let QR = entry.resource

                                if (QR.questionnaire) {
                                    let ar = QR.questionnaire.split('/')
                                    $scope.existingQR.push({QR:QR,Q:QR.questionnaire,display:ar[ar.length -1]})
                                }

                            })
                        }
                    }
                )

                //get all the DR - DiagnosticReports


                let qry = "/ds/fhir/DiagnosticReport?patient="+$scope.selectedPatient.id+"&_include=DiagnosticReport:result"
                $http.get(qry).then(
                    function(data) {

                        $scope.allDR = formsSvc.makeDRList(data.data)
                        //console.log($scope.allDR)
                    }, function(err) {
                        console.log(err)
                    }
                )

                //get all the observations
                getObservationsForPatient($scope.input.selectedPatient.resource.id)

                //get all the act-now data (assumes the careplan supporting-info search parameter has been applied to the server

                //server script does paging
                let qryActnow = "/ds/fhir/CarePlan?patient=" +$scope.input.selectedPatient.resource.id
                qryActnow += "&_include=CarePlan:condition"
                qryActnow += "&_include=CarePlan:supporting-info"
                qryActnow += "&_include:iterate=Observation:has-member"     //eg the TNM codes
                qryActnow += "&_revinclude=Observation:based-on"
                qryActnow += "&_revinclude=MedicationAdministration:ma-based-on"
                qryActnow += "&_sort=_id"
                //qryActnow += "&_count=50"

                $http.get(qryActnow).then(
                    function(data) {

                        $scope.allCarePlans = []
                        $scope.hashAllCarePlans = {}      //hash by resource id
                        if (data.data.entry) {
                            //convert to list and hash of resources
                            data.data.entry.forEach(function (entry){
                                if (entry.resource.resourceType == 'CarePlan') {
                                    $scope.allCarePlans.push(entry.resource)
                                }
                                //used to create act-now LM - ?needs better name
                                $scope.hashAllCarePlans[entry.resource.resourceType + "/" + entry.resource.id] = entry.resource
                            })
                        }
                        console.log($scope.allCarePlans)




                    }, function(err) {
                        console.log(err)
                    }
                )


                //All service Requests
                let qrySR = "/ds/fhir/ServiceRequest?patient=" +$scope.input.selectedPatient.resource.id
                $scope.allSR = []
                //qryActnow += "&_include=CarePlan:condition"
                //qryActnow += "&_include=CarePlan:supporting-info"
                //qryActnow += "&_include:iterate=Observation:has-member"     //eg the TNM codes
                //qryActnow += "&_revinclude=Observation:based-on"
                //qryActnow += "&_revinclude=MedicationAdministration:ma-based-on"
                $http.get(qrySR).then(
                    function(data) {
                        if (data.data.entry) {
                            //convert to list and hash of resources
                            data.data.entry.forEach(function (entry){
                                $scope.allSR.push(entry.resource)

                            })
                        }

                       // $scope.allSR = data.data
                    }, function(err) {

                    })

            }

            $scope.updateQuery = function(){
                getObservationsForPatient($scope.input.selectedPatient.resource.id)
            }

            $scope.selectObservationGroup = function(group) {
                delete $scope.input.selectedObs
                $scope.observationGroup = group
            }

            let getObservationsForPatient = function(patId){
                let url = "/ds/fhir/Observation?patient="+patId //+ "&_count=50"

                $http.get(url).then(
                    function (data) {
                        $scope.bundleObservations = data.data

                        //create observation hash by code
                        $scope.hashObservations = {}
                        if ($scope.bundleObservations.entry) {
                            $scope.bundleObservations.entry.forEach(function (entry) {
                                let obs = entry.resource
                                let code,display
                                if (obs.code && obs.code.coding && obs.code.coding.length > 0) {
                                    code = obs.code.coding[0].system + "#" + obs.code.coding[0].code
                                    display = obs.code.coding[0].display
                                }
                                if (code) {
                                    $scope.hashObservations[code] = $scope.hashObservations[code] || {display:display,resources:[]}
                                    $scope.hashObservations[code].resources.push(obs)
                                }

                            })
                            console.log($scope.hashObservations)
                        }


                    }
                )
            }

            let drawTree = function(treeData){
console.log(treeData)
                expandAll(treeData)
                //deSelectExcept()
                $('#QTree').jstree('destroy');

                let x = $('#QTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })


            }

            let expandAll = function(treeData) {
                treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            //load the patients directly from the data server
            let url = "/ds/fhir/Patient"
            $http.get(url).then(
                function (data) {

                    $scope.allPatients = [];
                    data.data.entry.forEach(function (entry){
                        let display = entry.resource.name[0].text
                        $scope.allPatients.push({display:display,resource:entry.resource})
                        $scope.input.selectedPatient = $scope.allPatients[0]

                    })
                    $scope.selectPatient()

                }, function(err) {
                    console.log(err)
                }
            )

            //load the practitioners directly from the data server

            $http.get("/ds/fhir/Practitioner").then(
                function (data) {

                    $scope.allPractitioners = [];
                    data.data.entry.forEach(function (entry){
                        let display = "No Name"
                        if (entry.resource.name) {
                            display = entry.resource.name[0].text
                        }

                        $scope.allPractitioners.push({display:display,resource:entry.resource})

                        //$scope.selectPractitioner()
                    })
                    $scope.selectedPractitioner = $scope.allPractitioners[0]
                }, function(err) {
                    console.log(err)
                }
            )


        })