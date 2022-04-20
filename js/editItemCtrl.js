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

                //this item has a dependancy on the current one being edited
                if (item1.enableWhen) {
                    item1.enableWhen.forEach(function (ew){
                        if (ew.question == $scope.newItem.linkId) {
                            $scope.dependantOnThis.push(item1)
                        }
                    })
                }

                //an item with a type of choice or boolean or string with is considered to be a possible source of a dependency
                if (item1.type == 'choice' || item1.type == 'boolean' ||
                    (item1.type == 'string' && item1.answerOption && item1.answerOption.length > 0) ||
                    (item1.type == 'integer' && item1.answerOption && item1.answerOption.length > 0)) {
                    $scope.dependencySources.push(item1)
                }


            })

            //when a possible dependency source is selected. Will get the vakues from the source answerOption
            //needs to be at the top
            $scope.ewSelected = function(sourceItem) {

                console.log(sourceItem)

                $scope.selectedSourceItem = sourceItem
/*
                switch (sourceItem.type) {
                    case "choice" :
                        $scope.input.ewQuestionOptions = []
                        if (sourceItem.type == 'choice' || sourceItem.type == 'open-choice') {
                            if (sourceItem.answerOption) {
                                sourceItem.answerOption.forEach(function (opt) {
                                    $scope.input.ewQuestionOptions.push(opt.valueCoding)
                                })
                            }

                        }
                        break

                }


*/
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

                    //locate the
                    $scope.dependencySources.forEach(function(choiceItem) {
                        if (choiceItem.linkId == linkId) {
                            $scope.input.ewQuestion = choiceItem  //this is the 'source' item whose value will determine if this one is shown
                            $scope.selectedSourceItem = choiceItem
                            switch (choiceItem.type) {
                                case 'string' :

                                    choiceItem.answerOption.forEach(function(opt){
                                        if (opt.valueString == ew.answerString) {
                                            $scope.input.ewAnswerString = opt
                                        }
                                    })

                                    break

                                case 'integer' :
                                    $scope.input.conditionalOperator = ew.operator      //Integer allows more filter options
                                    choiceItem.answerOption.forEach(function(opt){
                                        if (opt.valueInteger == ew.answerInteger) {
                                            $scope.input.ewAnswerInteger = opt
                                        }
                                    })


                                    break
                                case 'boolean' :
                                    $scope.input.ewAnswerBoolean = ew.answerBoolean ? "yes" : "no"
                                    break
                                case 'choice' :
                                    choiceItem.answerOption.forEach(function(opt){
                                        let c = opt.valueCoding
                                        if (c.code == ew.answerCoding.code && c.system == ew.answerCoding.system) {
                                            $scope.input.ewAnswer = opt
                                        }

                                    })

                                    break

                            }

                        }
                    })



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

            if (insertType == 'section' || insertType == 'group' ){
                $scope.newItem.type = 'group'
                $scope.hideType = true
            }

            //todo get units if extension present

            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems


            //$scope.originalItem = angular.copy(item)    //save the original in case of cancel

            $scope.clearConditional = function() {
                let msg = "This will clear conditional show/hide for this question. Are you sure?"
                if (confirm(msg)) {
                    delete $scope.newItem.enableWhen
                    delete $scope.input.ewQuestion
                    delete $scope.input.ewQuestionOptions
                }
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


            //when adding a new answer option which is a Coding
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

                //console.log($scope.input.ewQuestion)
                //console.log($scope.input.ewAnswer)



                //is there a conditional defined?
                if ($scope.selectedSourceItem) {
                    let ew
                    switch ($scope.selectedSourceItem.type) {
                        case "choice":
                        case "open-choice":
                            if ($scope.input.ewAnswer) {
                                ew = {question:$scope.input.ewQuestion.linkId,operator:"=",answerCoding:$scope.input.ewAnswer.valueCoding}
                            }
                            break
                        case "string" :
                            if ($scope.input.ewAnswerString) {
                                ew = {question:$scope.input.ewQuestion.linkId,operator:"="}
                                ew.answerString = $scope.input.ewAnswerString.valueString       //seems a bit convuluted...
                            }
                            break
                        case "integer" :
                            if ($scope.input.ewAnswerInteger) {

                                let operator = '='
                                if ($scope.input.conditionalOperator) {
                                    operator = $scope.input.conditionalOperator
                                }



                                ew = {question:$scope.input.ewQuestion.linkId,operator:operator}
                                ew.answerInteger = $scope.input.ewAnswerInteger.valueInteger       //seems a bit convuluted...
                            }
                            break
                        case "boolean" :
                            ew = {question:$scope.input.ewQuestion.linkId,operator:"="}
                            ew.answerBoolean = $scope.input.ewAnswerBoolean == 'yes' ? true : false
                            break
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


                    //explicetely set
                    //$scope.newItem.extension = $scope.newItem.extension || []
                    //$scope.newItem.extension.push({url:formsSvc.getObsExtension(),valueBoolean:true})

                }

                delete $scope.newItem.tmp

                $scope.$close($scope.newItem)

            }

        }
    )