angular.module("formsApp")
    .controller('frontPageCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService,$timeout) {

            //system url for author tags
            let tagAuthorSystem = "http://clinfhir.com/fhir/NamingSystem/qAuthorTag"

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
                                    console.log(data.data)
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

                //create the download
                let json = angular.toJson(Q,null,2)
                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([json],{type:"application/json"}))
                var now = moment().format();
                $scope.downloadLinkJsonName =  Q.name + '_' + now + '.json';

                //make the tree
                let vo = formsSvc.makeTreeFromQ(Q)
                drawTree(vo.treeData)

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