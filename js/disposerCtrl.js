angular.module("formsApp")
    .controller('disposerCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService) {


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

            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                    $scope.$digest()
                } else {
                    delete $scope.user
                }

            });

            //------------------------------

/*
            formsSvc.getBallotList().then(
                function (list) {
                    $scope.ballotList = list
                    //load the questionnaires so the details can be displayed. Just add the Q to the item - it isn't being saved back so no-one will know...

                    if ($scope.ballotList.entry) {
                        $scope.ballotList.entry.forEach(function (item) {
                            let url = `/ds/fhir/${item.item.reference}`
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
            */



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


            $scope.reviewComments = function() {
                alert("Todo. Intended for project team members and/or anyone who can review & create dispositions. Need login created.")
            }

            $scope.viewVSDEP = function(url){
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

            $scope.viewModelDEP = function(Q) {
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

            /*
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

*/


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

            /*
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