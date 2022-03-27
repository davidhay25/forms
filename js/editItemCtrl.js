angular.module("formsApp")
    .controller('editItemCtrl',
        function ($scope,formsSvc,item,itemTypes,editType,codeSystems,insertType) {

            //editType id 'new' or 'edit'
            //insertType is 'section' or 'item'

            //todo get units if extension present
            $scope.editType = editType
            $scope.insertType = insertType
            $scope.input = {}
            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems
            $scope.newItem = item

            if (item) {
                //in particular gets the extensions into a easier format
                $scope.meta = formsSvc.getMetaInfoForItem(item)
            }




            //set the code controls
            if ($scope.newItem.code && $scope.newItem.code.length > 0) {
                let code = $scope.newItem.code[0]
                $scope.newItem.tmp = {codeCode : code.code, codeDisplay :code.display }

                $scope.input.codeSystems.forEach(function (cs){
                    if (cs.url == code.system) {
                        $scope.newItem.tmp.codeSystem = cs
                    }
                })
            }

            $scope.removeAnswerOption = function(inx){
                $scope.newItem.answerOption.splice(inx)
            }

            $scope.addAnswerOption = function(code,system,display){
                if ($scope.newItem.valueSet) {
                    alert("You can't have both a ValueSet and list of options.")
                    return
                }

                $scope.newItem.answerOption = $scope.newItem.answerOption || []
                let opt = {valueCoding:{}}
                opt.valueCoding.code = code

                opt.valueCoding.system = system
                opt.valueCoding.display = display

                //let the selected system remain
                delete $scope.input.newAnswerCode
                delete $scope.input.newAnswerDisplay

                $scope.newItem.answerOption.push(opt)

            }

            $scope.save = function() {

                if ( $scope.newItem.tmp && $scope.newItem.tmp.units) {
                    let unitsExtension = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit" //defined in the core spec
                    let coding = {code:$scope.newItem.tmp.units,system:"http://unitsofmeasure.org",display:$scope.newItem.tmp.units}
                    $scope.newItem.code = [coding]

                    $scope.newItem.extension = $scope.newItem.extension || []
                    $scope.newItem.extension.push({url:unitsExtension,valueCoding : coding})

                    //delete $scope.newItem.tmp.units

                }



                if ($scope.newItem.tmp && $scope.newItem.tmp.codeCode) {
                    let code = {code:$scope.newItem.tmp.codeCode,
                        //system:$scope.newItem.tmp.codeSystem.url,
                        display:$scope.newItem.tmp.codeDisplay}

                        if ($scope.newItem.tmp.codeSystem) {
                            code.system = $scope.newItem.tmp.codeSystem.url
                        }


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