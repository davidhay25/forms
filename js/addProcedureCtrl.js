angular.module("formsApp")
    .controller('addProcedureCtrl',
        function ($scope) {

            $scope.patterns = []
            $scope.input = {}

            $scope.patterns.push({key:"list",display:"Select a procedure performed from a list"})
            $scope.patterns.push({key:"specify-bool",display:"Specify the procedure in the question, use a boolean to indicate if it was done"})
            $scope.patterns.push({key:"specify-coding",display:"Specify the procedure in the question, use a choice to indicate if it was done"})

            $scope.selectPattern = function (pattern) {
                $scope.input.selectedPattern = pattern
            }

            $scope.save = function(){

                let group = makeGroup()

            }

            function makeGroup(suffix,text) {
                let item = {}
                item.linkId = suffix
                //item.linkId = $scope.input.name + "-" + suffix
                item.type = 'group'
                item.text = text
                item.item = []
                item.code = [{code:"ancillary"}]     //temp

                return item
            }


        }
    )