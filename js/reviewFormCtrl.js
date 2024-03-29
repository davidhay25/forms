//controller for the review form presented to people reviewing a form

angular.module("formsApp")
    .controller('reviewFormCtrl',
        function ($scope,$http,formsSvc,$window,$timeout,designerSvc,exportSvc,$uibModal) {

            $scope.input = {}
            $scope.form = {}

            $scope.input.alertMsg = "This is a test system. Please do not include any real data or Personal Health Information into the form."

            $scope.closeAlert = function() {
                delete $scope.input.alertMsg
            }

            //$scope.input.appTitle = "CanShare: Create Path request and view patient data"

            let validationServer = "http://localhost:9099/baseR4/"
            let termServer = formsSvc.getServers().termServer //let termServer = "https://r4.ontoserver.csiro.au/fhir/"  //todo - move to config of somesort ? odd formsSvc

            let search = $window.location.search;
            if (search) {
                let QUrl = search.substr(1)


                formsSvc.loadQByUrl(QUrl).then(   //returns a bundle - but should only be 1
                    function(data) {
                        console.log(data)
                        if (data.data.entry && data.data.entry.length > 0) {

                            if (data.data.entry.length > 1) {
                                alert("Multiple forms were found. Contact support as this is likely an error.")
                            }

                            let Q = data.data.entry[0].resource  //todo - error if > 1 entry

                            $scope.input.appTitle = "Review form design"

                            $scope.reviewMode = true    //will hide most of the tabs...  todo - can eventually remove
                            $scope.reviewState = "form"  //can be 'form','display','model'
                            $scope.selectQ(Q)  //generates form template & $scope.hashItem

                            $scope.model = exportSvc.createJsonModel(Q)

                            $scope.canMakeComments = true

                            /* apparently comments can be at any time, so this is not needed. Keep the code though - it may be useful...
                            //now determine if this Q is in the ballot state (able to be commented on) or just viewed
                            formsSvc.getBallotList().then(
                                function(ballotList) {
                                    //returns the list of Qs under ballot
                                    if (ballotList.entry) {
                                        let ref = `Questionnaire/${Q.id}`
                                        let ar = ballotList.entry.filter(e => e.item.reference == ref)
                                        if (ar.length >0 ) {
                                            //yes, this Q is being ballotted - can make comments
                                            $scope.canMakeComments = true
                                        }
                                    }
                                }
                            )
                            */



                        } else {
                            window.location = "QNotFound.html"
                        }
                    })
            } else {
                window.location = "QNotFound.html"

            }



            //When the QR is created in formCtrl it emits an event
            $scope.$on('qrCreated',function(evt,qr){
                //$scope.qrFromFormsCtrl = qr
                $scope.selectedQR = qr
            })

            $scope.prepop = function () {
                formsSvc.prepopForm($scope.hashItem,$scope.form,$scope.input.selectedPatient.resource)
                $scope.makeQR()

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
            $scope.showConditionalGroup = function(item) {
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


            $scope.validateQRDEP = function(QR){
                let url = validationServer + "QuestionnaireResponse/$validate"
                $http.post(url,QR).then(
                    function(data) {
                        $scope.qrValidationResult = data.data
                    },function(err){
                        $scope.qrValidationResult = err.data

                    }
                )
            }

            $scope.testExtractionDEP = function(){
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

                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                $scope.formTemplate = $scope.objFormTemplate.template

                //$scope.formTemplate = formsSvc.makeFormTemplate(Q)

                console.log(Q)


                let vo = formsSvc.makeTreeFromQ(Q)



                $scope.treeData = vo.treeData       //for drawing the tree



                //$scope.treeData = vo.treeData
                $scope.hashItem = vo.hash       //all items in teh form hashed by id


                $scope.makeQR()     //create initial QR
                drawTree(vo.treeData)

            }

            //when a top level item is selected in the tabbed interface
            $scope.selectSectionEDP = function(section) {
                $scope.selectedSection = section

            }

            //---------------------------------------------------------------------------------

            $scope.selectSRDEP = function(SR) {
                $scope.selectedSRForList = SR
            }

            //select a single DR that has a reference to the SR
            $scope.selectSRDRDEP = function(srdr) {
                $scope.selectedSRDR = srdr
            }

            // a ServiceRequest is selected in the workflow tab...
            $scope.selectSRforQRDEP = function(sr) {
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

                $scope.QR = formsSvc.makeQR(
                    $scope.selectedQ,
                    $scope.form,
                    $scope.hashItem,
                    $scope.selectedPatient,
                    null,       //no practitioner when reviewing
                    $scope.input.reviewerName,
                    $scope.input.reviewerOrganization,
                    $scope.input.reviewerEmail
                    )
                /*
                if ($scope.selectedPatient && $scope.selectedPractitioner) {
                    $scope.QR = formsSvc.makeQR($scope.selectedQ,
                        $scope.form,$scope.hashItem,$scope.selectedPatient,
                        $scope.selectedPractitioner.resource)
                }
*/

                console.log($scope.QR)
                $scope.selectedQR = $scope.QR   //for rendering

            }


            //an existing QR is selected
            $scope.selectQRDEP = function(QR) {
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


            $scope.selectResourceDEP = function(item) {
                $scope.selectedResource = item.resource
                $scope.selectedResourceValidation = item.OO
            }

            //submit a new QR
            $scope.submitForm = function() {
                $scope.makeQR()  //updates $scope.QR
                //let QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)

                if ($scope.QR.item.length == 0) {
                    alert("You must enter some data first!")
                    return
                }

                if (confirm("Are you sure you're ready to submit this form")){
                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}

                   // if ($scope.reviewMode) {
                      //  let reviewerName = $scope.input.reviewerName || "Unknown reviewer"
                      //  $scope.QR.author = {display : reviewerName}

                        if ($scope.input.canPublish == 'no') {
                            //let url = formsSvc.getExtUrl('extCanPublish')

                            //formsSvc.extCan
                            $scope.QR.extension = $scope.QR.extension || []
                            $scope.QR.extension.push({url:formsSvc.getExtUrl('extCanPublish'),valueBoolean:false})
                        }

                        if ($scope.input.includeOIA == 'no') {
                            $scope.QR.extension = $scope.QR.extension || []
                            $scope.QR.extension.push({url:formsSvc.getExtUrl('extPublishOia'),valueBoolean:false})
                        }

                   // }

                    bundle.entry.push({resource:$scope.QR})

                    let url = "/fr/fhir/receiveQR"
                    $http.post(url,bundle).then(
                        function(data) {
                            //console.log(data.data)
                            //don't want the alert alert("Form has been saved, and any Observations or other resources extracted and saved")
                            window.location = "afterReview.html"

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

/*
                //All service Requests
                let qrySR = "/ds/fhir/ServiceRequest?patient=" +$scope.input.selectedPatient.resource.id
                $scope.allSR = []
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
                */

            }


            $scope.viewVS = function(url){

                $uibModal.open({
                    templateUrl: 'modalTemplates/vsEditor.html',
                    backdrop: 'static',
                    controller: 'vsEditorCtrl',
                    size : 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        },
                        modes: function () {
                            return ['view']  //todo remove select
                        },
                        server : function() {
                            return null
                        }
                    }
                })
            }


            let drawTree = function(treeData){
                //console.log(treeData)

                treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })

                //expandAll(treeData)
                //deSelectExcept()
                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        //console.log(data.node)
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