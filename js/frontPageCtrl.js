angular.module("formsApp")
    .controller('frontPageCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService,$timeout) {

            //system url for author tags
            let tagAuthorSystem = "http://clinfhir.com/fhir/NamingSystem/qAuthorTag"

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
           $scope.$on("qrCreated",function(ev,qr){
               $scope.formQR = qr
               console.log($scope.formQR)
           })

            $scope.submitForm = function() {
                //$scope.makeQR()  //updates $scope.QR
                //let QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)

                if ($scope.formQR.item.length == 0) {
                    alert("You must enter some data first!")
                    return
                }

                if (confirm("Are you sure you're ready to submit this form")){
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
                            alert("Form has been saved.")
                            //window.location = "afterReview.html"

                            //$scope.selectPatient()  //to read the new data
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }
            //-----------  login & user stuff....

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    modalService.showModal({}, {bodyText: 'You have been logged out'})

                }, function(error) {
                    modalService.showModal({}, {bodyText: 'Sorry, there was an error logging out - please try again'})
                });

            };

            function updateQEdit(email) {
                //update whether the current user can edit the Q in the ballot list
                //need to wait until the ballot list is available (it's all async)

                //to keep it simple for now, we'll just wait a couple of seconds - todo a more sophisticated method needed...

               // while (! $scope.ballotList) {
                    console.log('checking author...')
                    $timeout(function(){
                        if ($scope.ballotList) {
                            $scope.ballotList.entry.forEach(function (item) {
                                if (item.item.Q && item.item.Q.meta && item.item.Q.meta.tag) {
                                    item.item.Q.meta.tag.forEach(function (tag) {
                                        if ( tag.system == tagAuthorSystem && tag.code == email) {
                                            item.item.canAuthor = true

                                        }
                                    })

                                }

                            })
                        } else {
                            console.log("ballot list not available - increase wait time")
                        }

                    },2000)
              //  }
            }

            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                    updateQEdit(user.email)       //update whether the current user can edit the Q in the ballot list
                    $scope.$digest()
                } else {
                    delete $scope.user
                    //need to remove any author permissions...
                    if ($scope.ballotList) {
                        $scope.ballotList.entry.forEach(function (item) {
                            item.item.canAuthor = false
                        })
                    }
                }

            });

            //------------------------------


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

            $scope.download = function(Q){

            }

            //get the list of active ServiceRequests and get a count by Q
            let qrySR = "/ds/fhir/ServiceRequest?status=active"
            $scope.SRbyQ = {}
            $http.get(qrySR).then(
                function(data) {
                    data.data.entry.forEach(function (entry) {
                        let SR = entry.resource

                        if (SR.supportingInfo) {
                            SR.supportingInfo.forEach(function (si) {
                                if (si.reference && si.reference.indexOf('Questionnaire/') > -1) {
                                    //this is a reference to the Q
                                    let qUrl = si.display
                                    $scope.SRbyQ[qUrl] =  $scope.SRbyQ[qUrl] || 0
                                    $scope.SRbyQ[qUrl] ++
                                }

                            })

                        }

                    })
                    console.log($scope.SRbyQ)
                }
            )
/*
            //get all the VS from the dev server
            //todo - need a more refined way - ?from all VS like we do in the dashboard pr some other tag
            let vsUrl = "/ds/fhir/ValueSet"
            $scope.allVS = []
            $http.get(vsUrl).then(
                function(data) {
                    data.data.entry.forEach(function (entry) {
                        $scope.allVS.push(entry.resource)
                    })
                }
            )

*/
            $scope.reviewCommentsDEP = function() {
                alert("Todo. Intended for project team members and/or anyone who can review & create dispositions. Need login created.")
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

            $scope.viewModel = function(Q) {


                $scope.selectedQ = Q
                $scope.model = exportSvc.createJsonModel(Q)

                delete $scope.selectedSection       //the form section

                //for the form ui
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                $scope.formTemplate = $scope.objFormTemplate.template

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
                        $scope.dispositionsForQ = data

                    }
                )

                //get the vs
                $scope.vsForQ = terminologySvc.getValueSetsForQ(Q)

            }

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