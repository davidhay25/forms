angular.module('formsApp')
    .directive('renderformastree', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            transclude: 'true',  //this is new!!!
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                qr : '='
            },

            templateUrl: 'directive/renderForm/renderFormAsTreeDir.html',
            controller: function($scope,renderFormsSvc,$timeout,renderFormsSvc){


                $scope.form = {}        //a hash containing form data entered by the user
                $scope.input = {};

                $scope.datePopup = {}
                $scope.openDate = function(linkId) {
                    $scope.datePopup[linkId] = {opened:true}
                    // $scope.datePopup.opened = true
                }

                //a hash of items that failed the most current dependency check
                //we used to remove the values of hidden items, but that started causing an infinite digest error when in a directive. dunno why...
                $scope.notShown = {}

                $scope.$watch(
                    function() {return $scope.q},
                    function() {

                        if ($scope.q) {
                            //$scope.selectedQ = $
                            delete $scope.selectedNode
                            let vo = renderFormsSvc.makeTreeFromQ($scope.q)
                            $scope.hashItem = vo.hashItem

                            //console.log(vo.treeData)
                            //show sections

                            vo.treeData.forEach(function (item) {
                                item.state = item.state || {}
                                item.state.opened = true
                                if (item.parent == 'root') {
                                    item.state.opened = false;
                                }
                            })

                            drawTree(vo.treeData)       //for drawing the tree


                        }

                    }
                );


                $scope.showConditional = function(){
                    return true
                }

                let drawTree = function(treeData){
                    //console.log(treeData)
         /*           treeData.forEach(function (item) {
                        item.state.opened = true
                        if (item.parent == 'root') {
                            item.state.opened = false;
                        }
                    })
*/
                    $('#reviewTree').jstree('destroy');

                    let x = $('#reviewTree').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...

                        if (data.node) {
                            $scope.selectedNode = data.node;
                            console.log(data.node)

                            $scope.cell = {item:$scope.selectedNode.data.item}
                            $scope.cell.meta = {}
                        }

                        $scope.$digest();       //as the event occurred outside of angular...
                    })


                }


                //note that this is called every time there is a change (eg keypress) in the forms component
                //this is to ensure that the QR is always up to date. onBlur could miss the most recently updated firld...
                $scope.makeQR = function() {

                    $scope.qr = renderFormsSvc.makeQR($scope.q, $scope.form,$scope.hashItem)
                    //emit the QR so it can be captured by the containing hierarchy. Otherwise the scopes get complicated...
                    $scope.$emit('qrCreated',{QR:$scope.qr,formData:$scope.form,hashItem:$scope.hashItem})

                }

                //when a top level item is selected in the tabbed interface
                $scope.selectSection = function(section) {
                    $scope.selectedSection = section
                    //console.log(section)
                }






            }
        }
    });