angular.module("formsApp")
    .controller('editItemCtrl',
        function ($scope,formsSvc,item,itemTypes,editType,codeSystems) {

            //todo get units if extension present
            $scope.editType = editType
            $scope.input = {}
            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems
            $scope.newItem = item

            $scope.save = function() {
                //todo if units specified, then set extension

                if ( $scope.newItem.tmp && $scope.newItem.tmp.units) {
                    let unitsExtension = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit" //defined in the core spec
                    let coding = {code:$scope.newItem.tmp.units,system:"http://unitsofmeasure.org",display:$scope.newItem.tmp.units}
                    $scope.newItem.code = [coding]

                    $scope.newItem.extension = $scope.newItem.extension || []
                    $scope.newItem.extension.push({url:unitsExtension,valueCoding : coding})

                    //delete $scope.newItem.tmp.units

                }

                //todo ? should also set the code here (rather than in the dashboardCtrl)

                if ($scope.newItem.tmp.codeCode) {
                    let code = {code:$scope.newItem.tmp.codeCode,system:$scope.newItem.tmp.codeSystem.url,display:$scope.newItem.tmp.codeDisplay}
                    $scope.newItem.code = [code]
                    //delete item.tmp

                    $scope.newItem.extension = $scope.newItem.extension || []
                    $scope.newItem.extension.push({url:formsSvc.getObsExtension(),valueBoolean:true})


                    //add the extension for observation extraction
                  //  item.extension = []
                  //  item.extension.push({url:formsSvc.getObsExtension(),valueBoolean:true})
                }

                delete $scope.newItem.tmp


                $scope.$close($scope.newItem)

            }

        }
    )