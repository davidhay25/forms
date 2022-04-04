angular.module("formsApp")
    .controller('editItemCtrl',
        function ($scope,formsSvc,item,itemTypes,editType,codeSystems,insertType,hashAllItems) {


            //don't use copy() as intending to update item object from Q. todo need to think about cancel...
            $scope.newItem = item; ///angular.copy(item)             //<<<<<<<<<< new on sunday

            //editType id 'new' or 'edit'
            //insertType is 'section' or 'child' or 'grandchild'
            $scope.hashAllItems = hashAllItems

            let lcHashAllItems = {}
            Object.keys(hashAllItems).forEach(function(key) {
                lcHashAllItems[key.toLowerCase()] = true
            })

            if (insertType == 'section'){
                $scope.newItem.type = 'group'
            }

            //todo get units if extension present
            $scope.editType = editType
            $scope.insertType = insertType
            $scope.input = {}
            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems


            $scope.originalItem = angular.copy(item)    //save the original in case of cancel

            if (item) {
                //in particular gets the extensions into a easier format
                $scope.meta = formsSvc.getMetaInfoForItem(item)
            }

            $scope.checkUniqueLinkId = function(linkId){

                if (linkId.indexOf(" ") > -1) {
                    alert("Sorry, no spaces allowed")
                    return
                }

                let tmp = linkId.toLowerCase()

                if (lcHashAllItems[tmp]) {
                    alert("This linkId has been used in this Q. Choose another one. (The check is case insensitive)")
                    $scope.newItem.linkId = ""
                }
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

            $scope.cancel = function() {
                $scope.$close($scope.originalItem)
            }

            $scope.save = function() {

                if (! $scope.newItem.linkId) {
                    alert("The linkId is mandatory...")
                    return
                }

                //update the extensions in the item based on the meta object
                formsSvc.updateMetaInfoForItem($scope.newItem,$scope.meta)

                //?? move to ,eat
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