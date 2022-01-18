//Dashboard controller

angular.module("formsApp")
    .controller('dashboardCtrl',
        function ($scope,$http,formsSvc) {

            $scope.QVS = []

            $scope.selectQ = function(Q) {
                $scope.selectedQ = Q
                let vo = formsSvc.makeTreeFromQ(Q)
                $scope.treeData = vo.treeData
                $scope.hashItem = vo.hash
                drawTree()
                makeFormDef()
            }

            let drawTree = function(){
                if (! $scope.treeData) {
                    return
                }

                expandAll()
                //deSelectExcept()
                $('#designTree').jstree('destroy');
                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': $scope.treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })
                console.log($scope.treeData)

            }

            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            function makeFormDef() {
                $scope.formDef = angular.copy($scope.treeData)
                $scope.formDef.splice(0,1)      //remove the root

                //expand the valueset into the form def
                $scope.formDef.forEach(function (def) {
                    if (def.data && def.data.type == 'choice' && def.data.vsName) {
                        //find the valueset by name and copy into the model

                        $scope.QVS.forEach(function (vs) {
                            if (vs.name == def.data.vsName) {
                                def.data.vs = angular.copy(vs)      // here are the contents for the form preview
                            }
                        })

                    }
                })

            }



            function loadAllQ() {
                let url = "/fm/fhir/Questionnaire"
                $http.get(url).then(
                    function (data) {

                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry){
                            $scope.allQ.push(entry.resource)
                        })

                    }
                )
            }

            loadAllQ()
        })
