angular.module("formsApp")
    .controller('editItemCtrl',
        function ($scope,formsSvc,item,itemTypes,editType,codeSystems,insertType,hashAllItems,parent) {



            $scope.parent = parent
            $scope.editType = editType  //editType id 'new' or 'edit'
            $scope.insertType = insertType  //insertType is 'section' or 'child' or 'grandchild'

            $scope.input = {}

            if (! item) {
                item = {}
                item.tmp = {codeSystem: codeSystems[0] } //default to snomed
                item.linkId = "id-" + new Date().getTime()
                item.type = itemTypes[0]
                item.text = 'Test insert'
                $scope.newItem = item
            } else {
                $scope.newItem = angular.copy(item)
            }

            //construct an array of all the items which can be a conditional source where the type is choice or boolean
            //at the same time, see if this item is a dependenct source for another - if so, linkId is read-only. And display those sources in the UI
            $scope.dependencySources = []       //items that can be the source of a dependanys
            $scope.dependantOnThis = []         //those items dependant on this one...


            Object.keys(hashAllItems).forEach(function (key) {
                let item1 = hashAllItems[key].item

                if (item1.enableWhen) {
                    item1.enableWhen.forEach(function (ew){
                        if (ew.question == $scope.newItem.linkId) {
                            $scope.dependantOnThis.push(item1)
                        }
                    })
                }


                if (item1.type == 'choice' || item1.type == 'boolean') {
                    $scope.dependencySources.push(item1)
                }
            })

            //needs to be at the top
            $scope.ewSelected = function(sourceItem) {
                console.log(sourceItem)

                $scope.input.ewQuestionOptions = []
                if (sourceItem.type == 'choice' || sourceItem.type == 'open-choice') {
                    if (sourceItem.answerOption) {
                        sourceItem.answerOption.forEach(function (opt) {
                            $scope.input.ewQuestionOptions.push(opt.valueCoding)
                        })
                    }

                }

            }

            if (item) {
                //in particular gets the extensions into a easier format
                $scope.meta = formsSvc.getMetaInfoForItem(item)

                //the 'display as radio' for lists
                if ($scope.meta.itemControl && $scope.meta.itemControl.coding) {
                    if ($scope.meta.itemControl.coding[0].code == 'radio-button') {
                        $scope.input.displayAsRadio = true
                    }

                }

                //set the 'enableWhen' - only 1 supported at present...
                if (item.enableWhen && item.enableWhen.length > 0) {
                    let ew = item.enableWhen[0]
                    let linkId = ew.question

                    $scope.dependencySources.forEach(function(choiceItem) {
                        if (choiceItem.linkId == linkId) {
                            $scope.input.ewQuestion = choiceItem
                            if (ew.answerCoding) {
                                //the value to check is Coding
                                let answerCode = ew.answerCoding.code   //the current code value. ignore the system
                                $scope.ewSelected(choiceItem)       //sets the list of values

                                $scope.input.ewQuestionOptions.forEach(function (concept) {
                                    if (concept.code == answerCode) {
                                        $scope.input.ewAnswer = concept
                                    }
                                })
                            }

                            if (ew.answerBoolean !== null) {
                                //the value to check is boolean
                                $scope.input.ewAnswer =  ew.answerBoolean ? "yes" : "no"
                            }
                        }
                    })

                    /*

                    //the value to check is Coding
                    if (ew.answerCoding) {
                        let answerCode = ew.answerCoding.code   //the current code value. ignore the system
                        $scope.dependencySources.forEach(function(choiceItem){
                            if (choiceItem.linkId == linkId) {
                                $scope.input.ewQuestion = choiceItem

                                $scope.ewSelected(choiceItem)       //sets the list of values

                                $scope.input.ewQuestionOptions.forEach(function (concept) {
                                    if (concept.code == answerCode) {
                                        $scope.input.ewAnswer = concept
                                    }
                                })

                            }
                        })
                    }
                    //the value to check is boolean
                    if (ew.answerBoolean !== null) {

                        $scope.input.ewQuestion = choiceItem

                        $scope.input.ewAnswer = ew.answerBoolean
                    }

                    */

                }
            }

            if (item.item && item.item.length > 0) {
                //this has child elements. The type must remain as group.
                $scope.hideType = true
            }





            $scope.hashAllItems = hashAllItems

            let lcHashAllItems = {}
            Object.keys(hashAllItems).forEach(function(key) {
                lcHashAllItems[key.toLowerCase()] = true
            })

            if (insertType == 'section'){
                $scope.newItem.type = 'group'
                $scope.hideType = true
            }

            //todo get units if extension present

            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems


            //$scope.originalItem = angular.copy(item)    //save the original in case of cancel


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


            $scope.moveAnswerUp = function(inx) {
                let ar = $scope.newItem.answerOption.splice(inx-1,1)
                $scope.newItem.answerOption.splice(inx,0,ar[0])
            }

            $scope.moveAnswerDown = function(inx) {
                let ar = $scope.newItem.answerOption.splice(inx,1)
                $scope.newItem.answerOption.splice(inx+1,0,ar[0])
            }

            $scope.addOtherAnswerOption = function(opt) {
                $scope.newItem.answerOption = $scope.newItem.answerOption || []
                switch ($scope.newItem.type) {
                    case 'integer' :
                        $scope.newItem.answerOption.push({valueInteger:opt})
                        break
                    case 'string' :
                        $scope.newItem.answerOption.push({valueString:opt})
                        break
                }

                delete $scope.input.newAnswerOption
            }


            $scope.addAnswerOption = function(code,system,display){
                if ($scope.newItem.answerValueSet) {
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
                //$scope.$close($scope.originalItem)
                $scope.$close()
            }

            $scope.save = function() {

                //todo - check for answerOption when type is not choice...

                console.log($scope.input.ewQuestion)
                console.log($scope.input.ewAnswer)

                if ($scope.input.ewQuestion && $scope.input.ewAnswer) {

                    let ew
                    if ($scope.input.ewQuestion.type == 'choice' || $scope.input.ewQuestion.type == 'open-choice') {
                        ew = {question:$scope.input.ewQuestion.linkId,operator:"=",answerCoding:$scope.input.ewAnswer}
                    }

                    if ($scope.input.ewQuestion.type == 'boolean') {

                        ew = {question:$scope.input.ewQuestion.linkId,operator:"="}
                        ew.answerBoolean = $scope.input.ewAnswer == 'yes' ? true : false
                    }


                    if (ew) {
                        $scope.newItem.enableWhen = [ew]
                    }


                }

                if (! $scope.newItem.linkId) {
                    alert("The linkId is mandatory...")
                    return
                }

                //the radio
                if ($scope.input.displayAsRadio) {
                    $scope.meta.itemControl = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"radio-button"}]}
                } else {
                    //todo - this will delete all controls....
                    delete $scope.meta.itemControl
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