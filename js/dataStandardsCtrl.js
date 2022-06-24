angular.module("formsApp")
    .controller('dataStandardsCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService,$timeout) {

            //system url for author tags
            let tagAuthorSystem = "http://clinfhir.com/fhir/NamingSystem/qAuthorTag"

            //system url for folder tags
            let tagFolderSystem = "http://clinfhir.com/fhir/NamingSystem/qFolderTag"


            $scope.input = {}

            //defaults for the form
            $scope.form = {}        //for the form
            $scope.input.canPublish = true
            $scope.input.includeOIA = true

            $scope.input.leftPane = "col-md-2"
            $scope.input.rightPane = "col-md-10"



            $scope.input.togglePane = function() {
                if ($scope.input.rightPane == "col-md-10") {
                    console.log('hide left pane')
                    $scope.input.leftPane = "hide"
                    $scope.input.rightPane = "col-md-12"
                } else {
                    console.log('show left pane')
                    $scope.input.leftPane = "col-md-2"
                    $scope.input.rightPane = "col-md-10"
                }
            }

            //functions to support form submission

            //the QR is created in formsCtrl, but we need it in this scope. todo - once the dev dust settles, ?remove from formsCtrl???
            //actually, call it again so we can add the reviewer details. todo: definately need to tidy this up!!! - just need to add to dashboard.js & remove from formsCtrl

            $scope.$on("qrCreated",function(ev,qr){

               let patient = null
               let practitioner = null
               $scope.formQR = formsSvc.makeQR($scope.selectedQ, $scope.form,null,patient,practitioner,
                   $scope.input.reviewerName,$scope.input.reviewerOrganization,$scope.input.reviewerEmail)
               console.log($scope.formQR)
           })

            $scope.selectQR = function (QR) {
                $scope.selectedQR = QR
            }

            $scope.submitForm = function() {
                //$scope.makeQR()  //updates $scope.QR
                //let QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)

                if ($scope.formQR.item.length == 0) {
                    alert("You must enter some data first!")
                    return
                }

                if (! $scope.input.reviewerName) {
                    alert("Please enter your name in the review name box at the upper right")
                    return
                }

                if (confirm("Are you sure you're ready to submit this form? You should only do this once the form is complete.")){
                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}

                    if (! $scope.input.canPublish) {
                        $scope.formQR.extension = $scope.formQR.extension || []
                        $scope.formQR.extension.push({url:formsSvc.getExtUrl('extCanPublish'),valueBoolean:false})
                    }

                    if (! $scope.input.includeOIA) {
                        $scope.formQR.extension = $scope.formQR.extension || []
                        $scope.formQR.extension.push({url:formsSvc.getExtUrl('extPublishOia'),valueBoolean:false})
                    }

                    bundle.entry.push({resource:$scope.formQR})

                    let url = "/fr/fhir/receiveQR"
                    $http.post(url,bundle).then(
                        function(data) {
                            //console.log(data.data)
                            //alert("Form has been saved.")
                            //window.location = "afterReview.html"
                            $scope.formState = "complete"

                            //$scope.selectPatient()  //to read the new data
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }


            //retrieve all Q to determine their status and populate the selectors
            let qry = "/ds/fhir/Questionnaire?_elements=url,title,name,description,extension"
            $scope.allQ = []
            $scope.tags = []
            $scope.hisoStatuses = []
            $http.get(qry).then(
                function (data) {
                    if (data.data && data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            let Q = entry.resource
                            $scope.allQ.push(Q)         //note that this is a minimal Q

                            Q.hisoStatus = 'development'      //default
                            if (Q.extension) {
                                let hs = formsSvc.getHisoStatus(Q)
                                if (hs) {
                                    Q.hisoStatus = hs
                                }
                            }

                            if ($scope.hisoStatuses.indexOf(Q.hisoStatus) == -1) {
                                $scope.hisoStatuses.push(Q.hisoStatus)
                            }

                            //the folder tag
                            Q.tags = []      //make it easier to access
                            if (Q.meta && Q.meta.tag) {
                                let rslt = false
                                Q.meta.tag.forEach(function (tag) {
                                    if (tag.system == tagFolderSystem) {
                                        let code = tag.code
                                        Q.tags.push(code)
                                        if ($scope.tags.indexOf(code) == -1) {
                                            $scope.tags.push(code)
                                        }
                                    }
                                })
                            }
                            $scope.input.selectedTag = $scope.tags[0]
                            $scope.input.selectedHisoStatus = $scope.hisoStatuses[0]
                        })
                    }
                }, function (err) {
                    console.log(err)
                }
            )

/*
            formsSvc.getBallotList().then(
                function (list) {
                    $scope.ballotList = list
                    //load the questionnaires so the details can be displayed. Just add the Q to the item - it isn't being saved back so no-one will know...

                    if ($scope.ballotList.entry) {
                        $scope.ballotList.entry.forEach(function (item) {
                            let url = `/ds/fhir/${item.item.reference}`   //a reference to the Q
                            $http.get(url).then(
                                function (data) {
                                    item.item.Q = data.data

                                }, function (err) {
                                    console.log(err)
                                }
                            )

                        })
                    }
                }
            )

*/
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

            $scope.loadQ = function(Q) {
                //The Q passed in is a minimal Q so we need to load the full one...
                delete $scope.hisoNumber
                delete $scope.selectedNode
                let qry = `/ds/fhir/Questionnaire/${Q.id}`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function(data) {
                        $scope.hisoNumber = formsSvc.getHisoNumber(data.data)
                        $scope.viewModel(data.data)

                        //needed for showing the source items in dependencies
                        let vo = formsSvc.generateQReport(data.data)
                        $scope.hashAllItems = vo.hashAllItems       //{item: dependencies: }}

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function() {
                        $scope.showWaiting = false
                    }
                )


            }

            $scope.viewModel = function(Q) {

                delete $scope.formState
                delete $scope.dispositionsForQ
                delete $scope.hashDispositionsByLinkId
                delete $scope.selectedQR
                delete $scope.selectedSection       //the form section

                //lets the child controllers (eg formsCtrl) know that a new Q has been selected so it can clear the display...
                $scope.$broadcast('newQSelected')

                $scope.selectedQ = Q
                $scope.model = exportSvc.createJsonModel(Q)

                //for the form ui
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                $scope.formTemplate = $scope.objFormTemplate.template

                //need to wait for the form to be rendered before checking the defaults
                $timeout(function(){
                    //returns any initial values
                    $scope.form = formsSvc.prepop(Q)

                    //lets the child controllers (eg formsCtrl) know that a new Q has been selected...
                    //$scope.$broadcast('newQSelected')
                },1000)


                //for the HISO table display
                let voHiso = formsSvc.generateQReport($scope.selectedQ)

                let hashAllItems = voHiso.hashAllItems
                $scope.exportJsonList = exportSvc.createJsonModel(Q,hashAllItems)
                //convert the object into a single level for the table
                $scope.arHisoAllRows = []
                $scope.exportJsonList.forEach(function (sect) {
                    $scope.arHisoAllRows.push({type:'section',display:sect.display})
                    sect.lines.forEach(function (line) {
                        $scope.arHisoAllRows.push(line)
                    })

                })


                //create the download
                let json = angular.toJson(Q,null,2)
                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([json],{type:"application/json"}))
                var now = moment().format();
                $scope.downloadLinkJsonName =  Q.name + '_' + now + '.json';

                //make the tree
                let vo = formsSvc.makeTreeFromQ(Q)
                drawTree(vo.treeData)

                $scope.addLike = function(report){
                    //need to collect the user email
                    report.likes = report.likes || 0
                    report.likes++
                }

                //get the dispositions
                formsSvc.loadDispositionsForQ(Q).then(
                    function(data) {
                        $scope.dispositionsForQ = data.result
                        $scope.hashDispositionsByLinkId = data.hashLinkId

                        //create hash by element linkId



                    }, function (err) {
                        console.log(err)
                    }
                )

                //get the vs

                $scope.vsForQ = terminologySvc.getValueSetsForQ(Q)


                //The v2 report
                $scope.v2List = exportSvc.createV2Report(Q)

                //The list of QRs for example display
                formsSvc.getQRforQ(Q.url).then(
                    function (bundle) {
                        $scope.allQRforQ = bundle
                        if (bundle.entry && bundle.entry.length > 0) {
                            $scope.selectedQR = bundle.entry[0].resource
                        }

                    }
                )


            }
/*
            //retrieve all active Q for the 'approved' ds list
            let url = "/ds/fhir/Questionnaire?status=active"
            $http.get(url).then(
                function (data) {
                    $scope.activeQ = [];
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry){
                            $scope.activeQ.push(entry.resource)
                        })
                    }
                }
            )
*/

            let drawTree = function(treeData){
                //console.log(treeData)

                treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })


                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
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



/*
                //load all the disposition Observations for a Q
                $scope.loadDispositionsForQ = function(Q) {
                        delete $scope.dispositionsForQ
                        $scope.selectedQ = Q
                        formsSvc.loadDispositionsForQ(Q).then(
                            function(data) {
                                    $scope.dispositionsForQ = data

                            }
                        )
                }

                function loadAllQ() {
                        let url = "/ds/fhir/Questionnaire"
                        //let url = "/fm/fhir/Questionnaire"
                        $http.get(url).then(
                            function (data) {
                                    $scope.allQ = [];
                                    data.data.entry.forEach(function (entry){

                                            $scope.allQ.push(entry.resource)

                                    })
                                    //$scope.hashTerminology = terminologySvc.setValueSetHash($scope.allQ)
                                    // console.log($scope.hashTerminology)
                            }
                        )
                }

                loadAllQ()
*/
        })