angular.module('formsApp')
    .directive('renderform', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            transclude: 'true',  //this is new!!!
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                qr : '='
            },

            templateUrl: 'directive/renderForm/renderFormDir.html',
            controller: function($scope,renderFormsSvc,$timeout){

                $scope.datePopup = {}

                //for some reason when the q changes, the change doesn't ripple through to the directive, so $scope.$broadcast is needed
                $scope.$on("q-updated",function(){
                    console.log("q updated broadcast")
                    if ($scope.q) {
                        $timeout(function(){

                            $scope.form = {}    //todo - is this right re-set all the form data when re-building the template

                            let vo = renderFormsSvc.makeFormTemplate($scope.q, $scope.form)
                            if (vo) {
                                $scope.formTemplate = vo.template
                                $scope.hashItem = vo.hashItem

                            }
                        },1000)

                    }
                })


                $scope.openDate = function(linkId) {
                    $scope.datePopup[linkId] = {opened:true}
                    // $scope.datePopup.opened = true
                }

                $scope.form = {}        //a hash containing form data entered by the user
                $scope.input = {};

                //a hash of items that failed the most current dependency check
                //we used to remove the values of hidden items, but that started causing an infinite digest error when in a directive. dunno why...
                $scope.notShown = {}

                $scope.$watch(
                    function() {return $scope.q},
                    function() {
                       console.log('watch')
                        delete $scope.selectedSection       //c;ears the current section display
                        if ($scope.q) {



                            let vo = renderFormsSvc.makeFormTemplate($scope.q,$scope.form)
                            if (vo) {
                                $scope.formTemplate = vo.template
                                $scope.hashItem = vo.hashItem

                            }
                        } else {
                           // delete $scope.formTemplate
                            //delete $scope.hashItem
                        }

                    }
                );


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


                //called by a cell to indicate if it should be shown
                $scope.showConditional = function (cell,form) {
                   // console.log(cell.item.linkId)


                    if (! cell.meta) {
                        console.log(cell.item.text + " no meta")
                    }

                    //If the item is hidden and the showHidden is not set then return false
                    if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                        return false
                    }


                    //let copy = angular.copy($scope.form)

                    let copyItem = angular.copy(cell.item)
                    let show = renderFormsSvc.checkConditional(copyItem,form)

                    //console.log(show)
                    //return true  //<<<<<<<<<<<,

                    //if it isn't to be shown, clear any content  (Aug31)

                    //if it isn't to be shown, then set the notShown hash. For some reason, clearing the
                    //value causes infinite digest in some cases - possiblr circular or overly complex - though only started when implementing a directive...
                    $scope.notShown[cell.item.linkId] = ! show
                    if (!show) {
                        //**** this is causing an infinite digest issue with some forms - specifically ancillary studies
                       //delete $scope.form[cell.item.linkId]
                     //   $scope.notShown[cell.item.linkId] = true

                        //delete form[cell.item.linkId]
                    }

                    return show

                }

                //code to show (or not) a conditional group - limited to Coding comparisons ATM
                $scope.showConditionalGroup = function(group,form) {



                    if (group) {


                        //let show = renderFormsSvc.checkConditional(group,$scope.form)
                        let show = renderFormsSvc.checkConditional(group,form)

                        return show
                    } else {
                        //if not a group then show. child elements will be individually assessed later...
                        return true
                    }



                }



            }
        }
    });