angular.module("formsApp")
    .controller('editItemCtrl',
        function ($scope,formsSvc,item,itemTypes,editType,codeSystems,
                  $http,insertType,hashAllItems,parent,$uibModal,canEdit) {


            let extAoTerm = "http://clinfhir.com/fhir/StructureDefinition/cs-term"

            $scope.canEdit = canEdit
            $scope.parent = parent

            //Used by mapping so we can show the extraction resource type - parentMeta.extraction.type
            if (parent) {
                $scope.parentMeta = formsSvc.getMetaInfoForItem(parent.item)
            }

            //set the full definition value for a definition based resource extraction mapping
            $scope.completeMappingPath = function (text) {
                if ($scope.parentMeta) {
                    let type = $scope.parentMeta.extraction.type
                    $scope.newItem.definition = `http://hl7.org/fhir/${type}#${type}.${text}`
                }

            }

            $scope.editType = editType  //editType id 'new' or 'edit'
            $scope.insertType = insertType  //insertType is 'section' or 'child' or 'grandchild' ?or group

            $scope.input = {}
            $scope.input.aoedit= {}
            $scope.input.colCount = [0,1,2,3,4]
           // $scope.input.hisoClass = ["code","free text","value","identifier","full date","partial date"]
           // $scope.input.hisoDT = ["Alphabetic (A)","Date","Date/Time","Numeric (N)","Alphanumeric (X)","Boolean"]

            if (item) {
                if (hashAllItems && hashAllItems[item.linkId]) {
                    $scope.sectionItem = hashAllItems[item.linkId].section
                }

                if (item.answerOption) {
                    //make a copy of the original so that if codes are changes then the dependenciew can be updated
                    $scope.originalAnswerOption = [] //angular.copy(item.answerOption)


                    $scope.input.answerOptionsAsText = ""
                    item.answerOption.forEach(function (option,inx) {

                        //add a clone of the original to the original array
                        let clone = angular.copy(option)
                        clone.inx = inx         //so we knwo which was the original one if the order in the list is changed
                        option.inx = inx        //this will match the clone
                        $scope.originalAnswerOption.push(clone)


                        let ar = formsSvc.findExtension(option,extAoTerm)
                        if (ar.length > 0) {
                            option.term = ar[0].valueString
                        }


                        $scope.input.answerOptionsAsText += option.valueCoding.display + "\r\n"
                    })

                }

                //if it's a boolean - set the initialValue
              //  if (item.type == 'boolean' && item.initial && item.initial.length > 0) {

               // }

            }

            $scope.setDefaultBoolean = function(on) {
                $scope.newItem.initial = []         //remove any existing
                if (on) {
                    $scope.newItem.initial[0] = {valueBoolean: true}
                }

            }

            //lookup the value in the term server
            $scope.lookupCoding = function(system,code) {

            }

            //for a choice option, set the ())single) default
            $scope.setDefault = function(coding){
                $scope.newItem.initial = []         //remove any existing
                $scope.newItem.initial[0] = {valueCoding : coding}
            }

            $scope.copyOptionsToClipboardDEP = function(){
                let txt = ""
                $scope.newItem.answerOption.forEach(function (option) {
                    txt += option.valueCoding.display + "\r\n"
                })

                navigator.clipboard.write(txt)

                /*
                //https://stackoverflow.com/questions/29267589/angularjs-copy-to-clipboard#42393479
                var copyElement = document.createElement("span");
                copyElement.appendChild(document.createTextNode(txt));
                copyElement.id = 'tempCopyToClipboard';
                angular.element(document.body.append(copyElement));

                // select the text
                var range = document.createRange();
                range.selectNode(copyElement);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);

                // copy & cleanup
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
                copyElement.remove();
*/

                alert("List of items copied to clipboard")
            }




            $scope.fillConcept = function(code,system) {
                console.log(system,code)

                let codeSystem = codeSystems[0].url   // default to the first (snomed)

                if (system && system.url) {
                    codeSystem = system.url
                }

                let server = formsSvc.getServers().termServer //  "https://r4.ontoserver.csiro.au/fhir/"

                //let server = "https://snomednz.digital.health.nz/fhir/"

                let qry = `${server}CodeSystem/$lookup?system=${codeSystem}&code=${code}&includeDefinition=true`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        let parameters = data.data

                        if (parameters.parameter) {
                            for (var i = 0; i < parameters.parameter.length; i++) {
                                let p = parameters.parameter[i]
                                if (p.name == "display") {
                                   // $scope.selectedConcept.display = p.valueString
                                    $scope.newItem.tmp.codeDisplay = p.valueString
                                    if (!system) {
                                        //need to set the system dropdown also
                                        //Note: assume that
                                        $scope.newItem.tmp.codeSystem = codeSystems[0]
                                    }
                                    break
                                }
                            }
                        }
                    },
                    function(err) {
                        alert("No concept found: " + code + " (" + codeSystem + ")")
                    }

                    )
                }

            //Is this ever the case?
            if (! item) {
                item = {}
                item.tmp = {codeSystem: codeSystems[0] } //default to snomed
                item.linkId = "id-" + new Date().getTime()
                item.type = itemTypes[0]
                //item.text = 'Test insert'
                $scope.newItem = item
            } else {
                $scope.newItem = angular.copy(item)
            }

            //set the code system to default to snomed (the forst in the list)
            //if (! $scope.newItem.)


            $scope.viewVS = function(url) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/vsViewer.html',
                    backdrop: 'static',
                    controller: 'vsViewerCtrl',
                    size: 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        }
                    }
                })

            }

            //create a new VS for this item - or edit the existing
            $scope.editVSDEP = function(url){
                $uibModal.open({
                    templateUrl: 'modalTemplates/vsEditor.html',
                    backdrop: 'static',
                    controller: 'vsEditorCtrl',
                    size : 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        },
                        modes : function() {
                            return ['select','view','edit']
                        },
                        server : function() {
                            return null
                        }
                    }
                }).result.then(
                    function (vs) {
                        if (vs) {
                            $scope.newItem.answerValueSet = vs.url
                        }


                    }

                )
            }

            //create a set on anserOptopns from the contents of the text box
            $scope.parseOptionsText = function(options){
                let ar = options.split("\n")
                $scope.newItem.answerOption = []
                ar.forEach(function (lne) {
                    let code = lne.replace(/\s+/g, '').toLowerCase()



                    let opt = {valueCoding:{}}
                    opt.valueCoding.code = code
                   // opt.valueCoding.system = system
                    opt.valueCoding.display = lne

                    //let the selected system remain
                   // delete $scope.input.newAnswerCode
                   // delete $scope.input.newAnswerDisplay

                    $scope.newItem.answerOption.push(opt)



                   // $scope.newItem.answerOption.push({answerOption:opt})
                })
                delete $scope.input.answerOptionsInput      //clear the text area so we know on exit whether they have been parsed...
            }


            //has to be above check for new
            $scope.setHISODefaults = function(typ) {
                let meta = formsSvc.getHisoDefaults(typ)
                $scope.meta.hisoDT = meta.hisoDT
                $scope.meta.hisoLength = meta.hisoLength
                $scope.meta.hisoLayout = meta.hisoLayout
              //  $scope.meta.hisoClass = meta.hisoClass



            }




            //construct an array of all the items which can be a conditional source where the type is choice or boolean
            //at the same time, see if this item is a dependenct source for another - if so, linkId is read-only. And display those sources in the UI
            $scope.dependencySources = []       //items that can be the source of a dependanys
            $scope.dependantOnThis = []         //those items dependant on this one...


            //determine potential dependency sources
            $scope.dependencySections = []      //sections that have potential sources
            Object.keys(hashAllItems).forEach(function (key) {
                let item1 = hashAllItems[key].item
                let section =  hashAllItems[key].section;

                //this item has a dependancy on the current one being edited
                if (item1.enableWhen) {
                    item1.enableWhen.forEach(function (ew){
                        if (ew.question == $scope.newItem.linkId) {
                            $scope.dependantOnThis.push(item1)
                        }
                    })
                }

                //an item with a type of choice or boolean or string/integer with options is considered to be a possible source of a dependency
                if (item1.type == 'choice' || item1.type == 'boolean' ||
                    (item1.type == 'string' && item1.answerOption && item1.answerOption.length > 0) ||
                    (item1.type == 'integer' && item1.answerOption && item1.answerOption.length > 0))
                {

                    item1.display = item1.text
                    if (section) {
                       // item1.display = "("+ section.linkId + ") " + item1.display

                        item1.sectionLinkId = section.linkId    //todo - does this update the child item? seems OK...

                        if ($scope.dependencySections.indexOf(section) == -1) {
                            $scope.dependencySections.push(section)
                        }

                    }

                    $scope.dependencySources.push(item1)


                }
            })

            $scope.shouldShow = function (permissionLevel) {
                // put your authorization logic here
                return $scope.permission.canWrite || permissionLevel.value !== 'ROLE_WRITE';
            }


            $scope.dependencySources.sort(function (a,b){
                //let key1 = a.section
                if (a.display > b.display) {
                    return 1
                } else {
                    return -1
                }
            })


            //when a possible dependency source is selected. Will get the values from the source answerOption
            //needs to be at the top
            $scope.ewSelected = function(sourceItem) {
                $scope.selectedSourceItem = sourceItem              //this is the original - can be removed eventually
                $scope.newEwSelectedSourceItem = sourceItem
            }

            //remove one of the enableWhens
            $scope.deleteSourceTrigger = function(inx) {
                $scope.newItem.enableWhen.splice(inx,1)
            }

            $scope.selectSectionForEW = function(section){
                $scope.ewOptions = []
                $scope.dependencySources.forEach(function(src){
                    if (src.sectionLinkId == section.linkId) {
                        $scope.ewOptions.push(src)
                    }

                })

            }

            //add a new enableWhen - when supporting multiple
            $scope.addNewEw = function() {
                let source = $scope.input.newEwQuestion
                let operator = $scope.input.conditionalOperator || "="
                let ew = {question:source.linkId,operator:operator}

                switch ($scope.newEwSelectedSourceItem.type) {
                    case "string" :
                        ew.answerString = $scope.input.ewAnswerString.valueString
                        break
                    case "boolean" :
                        if ($scope.input.ewAnswerBoolean == 'yes') {
                            ew.answerBoolean = true
                        } else {
                            ew.answerBoolean = false
                        }

                        break
                    case "integer" :
                        ew.answerInteger = $scope.input.ewAnswerInteger.valueInteger
                        ew.operator = $scope.input.conditionalOperator
                        break
                    case "choice" :
                    case "open-choice":
                        if ($scope.input.ewAnswerConcept) {
                            ew.answerCoding = $scope.input.ewAnswerConcept.valueCoding
                        }

                        break
                }
                $scope.newItem.enableWhen = $scope.newItem.enableWhen || []
                $scope.newItem.enableWhen.push(ew)



            }


            if (item) {         //todo - needs refactoring - there's always an item ATM
                //in particular gets the extensions into a easier format
                $scope.meta = formsSvc.getMetaInfoForItem(item)

                if ($scope.meta.renderVS) {
                    $scope.input.vs = {rendermode: $scope.meta.renderVS}
                }


                //the 'display as radio' for lists
                if ($scope.meta.itemControl && $scope.meta.itemControl.coding) {
                    if ($scope.meta.itemControl.coding[0].code == 'radio-button') {
                        $scope.input.displayAsRadio = true
                    }
                }


/*
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
                                        if (ew.answerCoding) {
                                            if (c.code == ew.answerCoding.code && c.system == ew.answerCoding.system) {
                                                $scope.input.ewAnswer = opt
                                            }

                                        }

                                    })

                                    break

                            }

                        }
                    })



                }
*/
                if (editType == 'new') {
                    $scope.setHISODefaults('string')
                }

            }

            if (item.item && item.item.length > 0) {
                //this has child elements. The type must remain as group.
                $scope.fixType = true
            }


            $scope.hashAllItems = hashAllItems

            let lcHashAllItems = {}
            Object.keys(hashAllItems).forEach(function(key) {
                lcHashAllItems[key.toLowerCase()] = true
            })

            if (insertType == 'section' || insertType == 'group' ){
                $scope.newItem.type = 'group'
                $scope.fixType = true
            }

            //todo get units if extension present

            $scope.input.itemTypes = itemTypes
            $scope.input.codeSystems = codeSystems

            //update the hiso fields if they are empty
            $scope.updateHisoDEP = function(type) {
                $scope.meta.hisoLength = 100        //default to 100
                switch ($scope.newItem.type) {
                    case "text" :
                        $scope.meta.hisoLength = 1000
                        break
                    case "choice" :
                    case "open-choice" :
                        $scope.meta.hisoLength = 18
                        break
                    case "integer" :
                        $scope.meta.hisoLength = 3
                        break
                }
            }

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

            //default to the first codesystem
          //  if (! $scope.newItem.tmp.codeSystem) {
            //    $scope.newItem.tmp.codeSystem = $scope.input.codeSystems[0]
         //   }

            $scope.removeAnswerOption = function(inx){
                $scope.newItem.answerOption.splice(inx,1)
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
            $scope.addAnswerOption = function(code,system,display,term){
                if ($scope.newItem.answerValueSet) {
                    alert("You can't have both a ValueSet and list of options.")
                    return
                }

                $scope.newItem.answerOption = $scope.newItem.answerOption || []
                let opt = {valueCoding:{}}
                opt.valueCoding.code = code
                opt.valueCoding.system = system
                opt.valueCoding.display = display
                opt.term = term

                //let the selected system remain
                delete $scope.input.newAnswerCode
                delete $scope.input.newAnswerDisplay

                $scope.newItem.answerOption.push(opt)

            }

            $scope.cancel = function() {
                //$scope.$close($scope.originalItem)
                $scope.$close()
            }

            $scope.makeLinkId = function(text) {
                if ($scope.editType !== 'new') {
                    //not for editing
                    return
                }
                //construct a unique linkId from the text
                let t = text.replace(/\s+/g, '')  //remove all spaces
                t = t.substr(0,20)   //max length of linkId
                t = t.toLowerCase()

                let tBase = t       //so we can add integers to the base to make it unique
                let ctr = 1
                while (lcHashAllItems[t] && ctr < 100) {
                    t = tBase + ctr
                    ctr ++
                }
                if (ctr < 100) {
                    $scope.newItem.linkId = t

                } else {
                    //more than 100 matches>=? gosh...
                }

            }
            


            $scope.save = function() {

                if ($scope.input.answerOptionsInput) {
                    alert("You have entered text into the options box without parsing...")
                    return
                }


                //for a checkbox, the repeats should be set.
                if ($scope.input.vs.rendermode == "check-box") {
                    $scope.newItem.repeats = true
                }


                if ($scope.newItem.answerOption) {
                    //add the term extension if needed
                    $scope.newItem.answerOption.forEach(function (opt) {
                        if (opt.term) {
                            opt.extension = []      //assume only 1 extension for now
                            opt.extension.push({url:extAoTerm,valueString:opt.term})
                            delete opt.term         //this is not al element of Coding
                        }
                    })

                }

                //now create the map that can be used to update the dependencies.
                //for each option in $scope.originalAnswerOption see what the new one is
                let map = {}     //key is the original code & system
                if ($scope.originalAnswerOption) {
                    $scope.originalAnswerOption.forEach(function (originalOption) {
                        let inx = originalOption.inx
                        //now locate the option in newItem.answerOption that has the same inx.
                        //we're not concerned with new ones, as they almost certainly won't have and dependencies to be updated
                        if ($scope.newItem.answerOption) {
                            $scope.newItem.answerOption.forEach(function (opt) {
                                if (opt.inx == inx) {
                                    //this is the matching option (there can only be 1). Check the code+system to see if they are the same
                                    let newKey =   opt.valueCoding.system + "|" + opt.valueCoding.code  //the current key
                                    let originalKey = originalOption.valueCoding.system + "|" + originalOption.valueCoding.code //the original key
                                    if (newKey !== originalKey) {
                                        //either the code or the system (or both) have changed. Add to the map
                                        map[originalKey] = opt      //this will be changed
                                    }
                                }

                            })
                        } else {
                            //this is an item that was deleted. We don't manage that yet...
                        }
                    })

                }

                //now we can remove the inx and term from the coding
                if ($scope.newItem.answerOption) {
                    $scope.newItem.answerOption.forEach(function (opt) {
                        delete opt.inx
                        delete opt.term
                    })
                }


                if ($scope.input.vs && $scope.input.vs.rendermode) {
                    $scope.meta.renderVS = $scope.input.vs.rendermode
                }

                if (! $scope.newItem.linkId) {
                    alert("The linkId is mandatory...")
                    return
                }

                //todo - not actually updating the display
                $scope.showUpdating = true

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
                }

                if ($scope.newItem.tmp && $scope.newItem.tmp.codeCode) {
                    let code = {code:$scope.newItem.tmp.codeCode,
                        display:$scope.newItem.tmp.codeDisplay}

                        if ($scope.newItem.tmp.codeSystem) {
                            code.system = $scope.newItem.tmp.codeSystem.url
                        }

                    $scope.newItem.code = [code]

                }

                delete $scope.newItem.tmp

                //pass back both the updated item and the map of changes to options...
                $scope.$close({item:$scope.newItem,'map':map})

            }

        }
    )