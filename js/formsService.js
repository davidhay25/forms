angular.module("formsApp")

    .service('formsSvc', function($q,$http,$filter,moment) {

        //mdmReferral = {text:"xxx"}

        let globals
        $http.get("globals.json").then(
            function(data) {
               // console.log(data.data)
                globals = data.data
            }
        )

        //HPIRoot = "http://localhost:9099/baseR4/"
        HPIRoot = "http://home.clinfhir.com:8054/baseR4/"

        extUrlFormControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extUrlObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
        extResourceReference = "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource"

        //todo fsh doesn't underatnd expression extension...
        extPrepop = "http://canshare.com/fhir/StructureDefinition/sdc-questionnaire-initialExpression"

        extExtractNotes = "http://canshare.com/fhir/StructureDefinition/questionnaire-extractNotes"
        extUsageNotes = "http://canshare.com/fhir/StructureDefinition/questionnaire-usageNotes"
        extSourceStandard = "http://canshare.com/fhir/StructureDefinition/questionnaire-sourceStandard"
        extColumn = "http://canshare.com/fhir/StructureDefinition/questionnaire-column"
        extColumnCount = "http://canshare.com/fhir/StructureDefinition/questionnaire-column-count"

        canShareServer = "http://canshare/fhir/"

        function getHN(hn) {
            let name = "Unknown name"
            if (hn) {
                name = hn.text
                if (! name) {
                    name = ""
                    if (hn.given) {
                        hn.given.forEach(function (n){
                            name += n + " "
                        })
                    }
                    name += hn.family
                }
            }

            return name
        }

        return {

            moveItem : function(Q,dirn,linkId) {
                for (var sectionIndex =0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]
                    if (section.linkId == linkId) {

                        if (dirn == 'up' && sectionIndex > -1) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex-1,0,ar[0])
                        }

                        if (dirn == 'dn' && sectionIndex < Q.item.length) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex+1,0,ar[0])
                        }
                        break

                    } else {
                        //now check the section children
                        for (var childIndex =0; childIndex < section.item.length;childIndex ++) {
                            let child = section.item[childIndex]
                            if (child.linkId == linkId) {
                                console.log('found',childIndex)

                                if (dirn == 'up' && childIndex > 0) {
                                    let ar = section.item.splice(childIndex,1)
                                    section.item.splice(childIndex-1,0,ar[0])

                                }
                                if (dirn == 'dn' && childIndex < section.item.length) {
                                    let ar = section.item.splice(childIndex,1)
                                    section.item.splice(childIndex+1,0,ar[0])

                                }
                                break
                            } else {
                                //grandchildren
                                if (child.item) {
                                    for (var grandchildIndex = 0; grandchildIndex < child.item.length;grandchildIndex ++) {
                                    let grandchild = child.item[grandchildIndex]
                                    if (grandchild.linkId == linkId) {
                                        if (dirn == 'up' && grandchildIndex > 0) {
                                            let ar = child.item.splice(grandchildIndex,1)
                                            child.item.splice(grandchildIndex-1,0,ar[0])

                                        }
                                        if (dirn == 'dn' && grandchildIndex < section.item.length) {
                                            let ar = child.item.splice(grandchildIndex,1)
                                            child.item.splice(grandchildIndex+1,0,ar[0])

                                        }
                                        break
                                    }


                                    }
                                }
                            }

                        }
                    }


                }
                return Q


            },
            moveItemX : function(Q,dirn,linkId) {
                //move an item in the direction
                //locate in Q based on linkId. Then check the item[] collection it is in and see if can move
                //https://javascript.plainenglish.io/a-nice-way-to-iterate-over-collections-in-javascript-254b6f5d9907
                for (const [sectionIndex, section] of Q.item.entries()) {
                    //check for a move at the section level
                    if (section.linkId == linkId) {

                        if (dirn == 'up' && sectionIndex > -1) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex-1,0,ar[0])
                        }

                        if (dirn == 'dn' && sectionIndex < Q.item.length) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex+1,0,ar[0])
                        }

                    }

                    for (const [childIndex,child] of section.item.entries()) {
                        //check for a move at the section child level
                        if (child.linkId == linkId) {
                            console.log('found',childIndex)

                            if (dirn == 'up' && childIndex > 0) {
                                let ar = section.item.splice(childIndex,1)
                                section.item.splice(childIndex-1,0,ar[0])
                            }
                            if (dirn == 'dn' && childIndex < section.item.length) {
                                let ar = section.item.splice(childIndex,1)
                                section.item.splice(childIndex+1,0,ar[0])
                                break
                            }

                        }

                        console.log(child.linkId)
                        if (child.item) {
                            console.log('checking gc')
                            for (const [grandChildIndex, grandChild] of child.item.entries()) {
                                //check for a move at the grandchile level
                                if (grandChild.linkId == linkId) {
                                    console.log('found',grandChildIndex)
                                    if (grandChildIndex > 0) {
                                        let ar = child.item.splice(grandChildIndex,1)
                                        child.item.splice(grandChildIndex-1,0,ar[0])
                                        console.log('delete')
                                        //break
                                    }

                                }
                            }
                        }


                    }

                }
                return Q


            },

            updateQItemDEP : function(Q,updatedItem) {
                //update a single item in the Q


                function parseBranch(item,update) {

                    if (item.linkId == update.linkId) {
                        item = update
                    } else {
                        if (item.item) {
                            //has child elements - will be section or group
                            item.item.forEach(function (child) {
                                parseBranch(child,update)
                            })
                        } else {

                        }
                    }
                }
                Q.item.forEach(function (section) {
                    parseBranch(section,updatedItem)
                })

/*
                Q.item.forEach(function (section) {
                    if (section.linkId == updatedItem.linkId) {
                        section = updatedItem
                    } else {

                    }

                })
*/

            },

            prepopForm : function(hashItems,hashData,resource){
                //perform pre-population - highly limited!!!
                //only for string/date values off the root ATM
                let that = this
                Object.keys(hashItems).forEach(function (key) {
                    let entry = hashItems[key]
                    if (entry) {
                        let ar = that.findExtension(entry.item,extPrepop)
                        if (ar.length > 0 ) {
                            if (ar[0].valueString) {

                                console.log(ar[0].valueString)

                                let linkId = entry.item.linkId

                                //only support specific pre-pop
                                switch (ar[0].valueString) {
                                    case "%patient.family" :
                                        if (resource.name) {
                                            hashData[linkId] = resource.name[0].family
                                        }
                                        break
                                    case "%patient.given" :
                                        if (resource.name) {
                                            hashData[linkId] = resource.name[0].given[0]
                                        }
                                        break
                                    case "%patient.identifier" :
                                        if (resource.identifier) {
                                            hashData[linkId] = resource.identifier[0].value
                                        }
                                        break
                                    case "%patient.birthDate" :
                                        if (resource.birthDate) {
                                            hashData[linkId] = resource.birthDate
                                        }
                                        break
                                    case "%patient.gender" :
                                        if (resource.gender) {
                                            hashData[linkId] = resource.gender
                                        }
                                        break

                                }


/*

                                //for now assume that pre-pop is off the root... - eg %patient.birthDate
                                let ar1 = ar[0].valueString.split('.')
                                let path = ar1[1]
                                let dataToInsert = resource[path]
                                if (dataToInsert) {
                                    if (Array.isArray(dataToInsert)) {
                                        hashData[linkId] = dataToInsert[0]
                                    } else {
                                        hashData[linkId] = dataToInsert
                                    }
                                }

                                */

                            }
                        }
                    }




                })
            },

            getQRforQ : function(url) {
                let deferred = $q.defer()
                //get all the QR's for a given Q
                let qry = "/ds/fhir/QuestionnaireResponse?questionnaire=" + url
                $http.get(qry).then(function(data){
                    console.log(data)
                    deferred.resolve(data.data)

                },
                    function(err){
                    deferred.reject()
                })
                return deferred.promise
            },

            updateMetaInfoForItem (item,meta) {
                //the opposite of getMetaInfoForItem() - update an item (extensions) based on the meta VO
                //assumption that and given extension only appears once...

                //Extract Observation extension...
                /*
                if (meta.extraction && meta.extraction.extractObservation) {
                    let ext = {url:extUrlObsExtract,valueBoolean:true}

                    addExtension(item,ext)
                } else {
                    removeExtension(item,extUrlObsExtract)
                }
                */
                if (meta.extraction) {
                    updateExtension(item,extUrlObsExtract,"Boolean",meta.extraction.extractObservation)

                    updateExtension(item,extExtractNotes,"String",meta.extraction.notes)

                }

                //usage notes
                updateExtension(item,extUsageNotes,"String",meta.usageNotes)

                //source standard
                updateExtension(item,extSourceStandard,"String",meta.sourceStandard)

                //display columns
                updateExtension(item,extColumn,"Integer",meta.columnCount)

                //reference types
/* todo - need to allow multiple extensions of same url...
                meta.referenceTypes = meta.referenceTypes || []
                ar3.forEach(function (ext) {
                    meta.referenceTypes.push(ext.valueCode)
                })
*/
                function updateExtension(item,url,type,value) {
                    //update an extension. Remove the existing one/s then add if not empty
                    removeExtension(item,url)       //clear out existing ones
                    if (value) {
                        item.extension = item.extension || []
                        let ext = {url:url}
                        ext['value'+type] = value
                        item.extension.push(ext)
                    }
                }

                function removeExtension(item,url) {
                    //remove all extensions with this url...
                    if (item.extension) {
                        let ar = []
                        item.extension.forEach(function (ext) {
                            if (ext.url !== url) {
                                ar.push(ext)
                            }
                        })
                        item.extension = ar
                    }
                }

            },
            getMetaInfoForItem : function(item) {
                //populate meta info - like resource extraction. Basically pull all extensions into a VO
                let meta = {}

                //update the Observationextract
                let ar = this.findExtension(item,extUrlObsExtract)
                if (ar.length > 0 ) {
                    if (ar[0].valueBoolean) {
                        meta.extraction = meta.extraction || {}
                        meta.extraction.extractObservation = true
                    }
                }

                //now look for any extraction notes
                let ar1 = this.findExtension(item,extExtractNotes)
                if (ar1.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.notes = ar1[0].valueString
                }

                //and usage notes
                let ar2 = this.findExtension(item,extUsageNotes)
                if (ar2.length > 0) {
                    //meta.extraction = meta.extraction || {}
                    meta.usageNotes = ar2[0].valueString
                }

                //and reference types
                let ar3 = this.findExtension(item,extResourceReference)

                if (ar3.length > 0) {
                    meta.referenceTypes = meta.referenceTypes || []
                    ar3.forEach(function (ext) {
                        meta.referenceTypes.push(ext.valueCode)
                    })
                }

                //and source standard
                let ar4 = this.findExtension(item,extSourceStandard)
                if (ar4.length > 0) {
                    meta.sourceStandard = ar4[0].valueString
                }

                //display col - column number, 1 based
                let ar5 = this.findExtension(item,extColumn)
                if (ar5.length > 0) {
                    meta.column = ar5[0].valueInteger
                }

                //column count
                meta.columnCount = 2       //default column count

                let ar6 = this.findExtension(item,extColumnCount)
                if (ar6.length > 0) {
                    meta.columnCount = ar6[0].valueInteger
                    console.log(ar6[0].valueInteger)
                }



                return meta
            },

            generateQReport : function(Q) {
                //generate report for Q

                let clone = angular.copy(Q)

                let that = this;
                let hashAllItems = {}
                let report = {section:[],coded:[],conditional:[],reference:[]}
                let issues = []     //issues found during report generation

                clone.item.forEach(function(sectionItem){
                    //items off the root are the top level sections. They have children that are either single questions
                    //or groups of questions. A group has only a single level of child questions

                    let section = {item:sectionItem,children:[],meta:{}}
                    populateMeta(section)

                    report.section.push(section)

                    if (sectionItem.item) {        //should always have children
                        sectionItem.item.forEach(function (child){

                            updateSpecificArrays(sectionItem,report,child)


                            if (child.type == 'group') {
                                //this is a group of questions - commonly used for conditionals.
                                //when displayed in the UI, the first item is in the left pane, the others in the right
                                //most commonly, the first item (in the left pane) is the key question, the others
                                //being conditional on the value of that item. ie the answer to the first question will
                                //determine what is shown on the right...
                                let group = {type:'group',item:child,children:[],meta:{}}
                                section.children.push(group)

                                //set the column count
                                populateMeta(group)

                                //step through the children of the group..
                                child.item.forEach(function (grandChild) {

                                    updateSpecificArrays(sectionItem,report,grandChild)
                                    // function updateSpecificArrays(sectionItem,report,child)
                                    let entry = {item:grandChild,meta:{}}
                                    populateMeta(entry)

                                    group.children.push(entry)
                                })


                            } else {
                                //this is a single question with no grandchildren.

                                let entry = {type:'single',item:child,meta:{}}
                                populateMeta(entry)
                                section.children.push(entry)

                                if (child.item) {
                                    //there shouldn't be any child items todo ?issue
                                }
                            }

                        })
                    }
                })

                return {report:report,hashAllItems:hashAllItems}

                function populateMeta(entry) {
                    //populate meta info - like resource extraction
                    entry.meta = that.getMetaInfoForItem(entry.item)


                }
// function updateSpecificArrays(sectionItem,report,child)
                function updateSpecificArrays(sectionItem,report,child) {
                    //update the coded & reference
                    if (hashAllItems[child.linkId]) {
                        console.log("There are multiple items with the linkId: " + child.linkId)
                        return
                    }
                    hashAllItems[child.linkId] = {item:child,dependencies:[]}

                    //update specific summary arrays - coded & reference
                    switch (child.type) {
                        case 'choice' :
                        case 'open-choice':
                            let entry = {section:sectionItem,item:child,options:{}}
                            report.coded.push(entry)
                            //break out any answerOptions by system


                            if (child.answerOption) {
                                child.answerOption.forEach(function (vc) {
                                    let system = vc.valueCoding.system || 'Unknown'
                                    entry.options[system] = entry.options[system] || []
                                    entry.options[system].push(vc.valueCoding)


                                    
                                })
                            }
                            //console.log('code')
                            break
                        case 'reference' :
                            let refEntry = {item:child,resourceTypes:[]}

                            let ar = that.findExtension(child,extResourceReference)
                            if (ar.length > 0) {
                                ar.forEach(function (ext) {
                                    refEntry.resourceTypes.push(ext.valueCode)
                                })
                            }

                            //todo - get the reference types from the extension
                            report.reference.push(refEntry)
                            break;
                    }






                    //update the conditional
                    if (child.enableWhen) {
                        report.conditional.push({item:child})

                        //update the 'parent' hash
                        child.enableWhen.forEach(function (ew) {
                            if (hashAllItems[ew.question]) {
                                hashAllItems[ew.question].dependencies.push({item:child,ew:ew})
                            } else {
                                alert('error: missing linkId of conditional target' + ew.question)
                               // console.log('error: missing linkId' + ew.question)
                            }
                        })



                    }

                }


            },
            makeFormTemplate : function(Q) {
                let that = this;

                //create a template suitable for rendering in 2 columns
                //is a collection of sections. Each section contains an array of rows,
                // each row is an array with 2 elements (left / right) and the cell has an array of items

                let template = []

                Q.item.forEach(function (sectionItem) {
                    let section = {linkId:sectionItem.linkId,text:sectionItem.text,rows:[],item:sectionItem,meta:{}}
                    section.meta = that.getMetaInfoForItem(sectionItem)
                    template.push(section)

                    //now look at the items below the section level.

                    if (sectionItem.item) {
                        sectionItem.item.forEach(function (item) {
                            let meta = that.getMetaInfoForItem(item)

                            if (item.type == 'group') {
                                //groups has a specific structure ATM
                                //the first item goes in col 1
                                //other items go in col 2 - and will often have conditionals on them

                                let row = {}    //will have 2 entries - left and right
                                row.item = item
                                row.meta = meta

                                if (item.item) {    //these are the child items
                                    item.item.forEach(function (child,inx) {
                                        let childMeta = that.getMetaInfoForItem(child)
                                        //ignore any item entries on the child - we don't go any deeper atm

                                        if (inx == 0) {
                                            //this is the first item in the group - it goes in the left
                                            let cell = {item:child,meta:childMeta}      //to allow for ither elements like control type...
                                            setDecoration(cell,child)        //sets things like control type
                                            //row.left = [cell]
                                            row['col1'] = [cell]
                                        } else {
                                            //this is a subsequent item - it will go in the right col by default
                                            //let side = "right"
                                            let side = 'col2'
                                            if (childMeta.column ) {
                                                side = 'col' + childMeta.column
                                            }


                                            let cell = {item:child}
                                            setDecoration(cell,child)
                                            row[side] = row[side] || []
                                            row[side].push(cell)
                                        }
                                    })

                                    section.rows.push(row)

                                }

                            } else {
                                //if the item isn't a group, then add it to column 1.
                                let row = {}   //will have a single entry - left
                                let cell = {item:item,meta:meta}      //to allow for ither elements like control type...
                                setDecoration(cell,item)
                                //row.left = [cell]             //make it an array to match the group
                                row['col1'] = [cell]

                                section.rows.push(row)

                            }

                        })
                    }

                })

                //console.log(template)
                //console.log(angular.toJson(template,null,2))
                return template

                //looks for specific instructions from the Q about an item - eg render as radio
                function setDecoration(cell,item) {

                    //look for item control
                    let extControlType = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
                    let ar = that.findExtension(item,extControlType)
                    if (ar.length > 0) {
                        let ext = ar[0].valueCodeableConcept
                        if (ext && ext.coding.length > 0) {
                            let controlHint = ext.coding[0].code
                            cell.displayHint = controlHint

                        }
                    }
                    //look for observation extraction
                    let extExtractObs = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
                    let arObs = that.findExtension(item,extExtractObs)
                    if (arObs.length > 0) {
                        if (arObs[0].valueBoolean) {

                            cell.extractObservation = true
                        }

                    }

                }


            },
            //determine whether the condition on an item is true...
            checkConditional : function(item,formData) {
                if (item.enableWhen && item.enableWhen.length > 0) {
                    let conditional = item.enableWhen[0]       //only looking at the first one for now
                    //console.log(conditional)
                    let formValue = formData[conditional.question]  //the value from the form to be compared
                    //console.log(referenceValue)
                    if (formValue) {
                        switch(conditional.operator) {
                            case '=' :
                                //todo - check for different datatypes...
                                //right now, we're assuming that Codings are being used...

                               // if (source) {
                                    //when a radio is used as the input, the value is a string rather than an object
                                    if (typeof formValue === 'string' || formValue instanceof String) {
                                        formValue = JSON.parse(formValue)
                                    }
                             //   }

                                return checkEqualCoding(formValue.valueCoding,conditional.answerCoding)
                                break
                        }
                    }
                } else {
                    return true
                }

                function checkEqualCoding(source,target) {
                    //source is from the form, target is the  Q




                    if (source && target) {
                        if (source.system) {
                            if ((source.system == target.system) && (source.code == target.code)) {
                                return true
                            }
                        } else {
                            if (source.code == target.code) {
                                return true
                            }
                        }
                    }


                }
            },

            getHN : function (hn){
                return getHN(hn)
            },

            getHPIRoot : function () {
                return HPIRoot
            },

            makeDRList : function(bundle) {
                //construct an array of DR's with associated Observations
                let hashResource = {}   //all resources other than DR hashed by {type}/{id}
                let arDR = []           //array of DRs - content = {DR,obs[]}
                if (bundle.entry) {
                    bundle.entry.forEach(function (entry) {
                        let resource = entry.resource
                        if (resource.resourceType == 'DiagnosticReport') {
                            arDR.push({resource: resource, obs: []})
                        } else {
                            hashResource[resource.resourceType + "/" + resource.id] = resource
                        }
                    })

                    //go through the DR and add the resources referenced from the .result element to it
                    arDR.forEach(function (item) {
                        item.resource.result.forEach(function (ref) {
                            item.obs.push(hashResource[ref.reference])
                        })
                    })

                    return arDR     //{resource: obs[]: }
                }
            },

            createPOSTEntry : function(resource) {
                //create an entry element to insert into a bundle for a POST
                let that = this;
                let entry = {}

                let resourceType = "urn:uuid:"      //default to a uuid

                if (resource.id && resource.id.split('-') < 4) {
                    //if there are 4 or more '-' we assume this is a uuid
                    resourceType =  resource.resourceType
                }

                entry.fullUrl = resourceType + resource.id

                entry.resource = resource
                entry.request = {method:'POST',url:resource.resourceType}
                return entry
            },

            createPUTEntry : function(resource) {
                //create an entry element to insert into a bundle for a PUT
                let that = this;
                let entry = {}
                if (resource.id) {
                    entry.fullUrl = canShareServer +  resource.resourceType + "/" + resource.id
                    entry.resource = resource
                    entry.request = {method:'PUT',url:resource.resourceType + "/" + resource.id}
                    return entry
                } else {
                    throw "The resource must have an id for PUT operations"
                }

            },

            createUUID : function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        },

            makeParentHash : function(treeData) {
                //create a hash showing where each section is in the tree
                let hashParent = {}
                treeData.forEach(function (item,inx){
                    if (item.parent == 'root') {
                        //this is a parent
                        //hashParent[item.id] =
                    }
                })
            },

            auditQ : function(Q) {
                //generate audit report for Q
                let audit = {'missingvs': [],nocode:[]}

                Q.item.forEach(function(item){
                    if (item.item) {
                        item.item.forEach(function (child){

                            if (! child.code) {
                                audit.nocode.push({item:child,parent:item})
                            }


                            if (child.type == 'choice' || child.type == 'open-choice') {
                                if (! child.valueSet && ! child.answerOption) {
                                    audit.missingvs.push({item:child,parent:item})
                                }
                            }
                        })
                    }
                })

                return audit

            },

            getObsExtension : function() {
                //used by the dashboard...
                return extUrlObsExtract
            },
            findExtension : function(item,url) {
                //return an array with all matching extensions
                let ar = []
                //console.log(item)
                if (item && item.extension) {
                    for (var i=0; i <  item.extension.length; i++){
                        let ext = item.extension[i]
                        if (ext.url == url) {
                            ar.push(ext)
                        }
                    }
                }
                return ar

            },

        //make the treeData from the Q


            makeQR :  function(Q,form,hash,patient,practitioner) {
                let that = this

                //make the QuestionnaireResponse from the form data
                //hash is items from the Q keyed by linkId
                //form is the data enterd keyed by linkId
                //todo - make recursive...
                let qrId = this.createUUID()
                let err = false
               // console.log(form)
                //console.log(hash)
                let QR = {resourceType:'QuestionnaireResponse',id:qrId,status:'in-progress'}
                QR.text = {status:'generated'}
                QR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>QR resource</div>"
                QR.questionnaire = Q.url
                QR.authored = new Date().toISOString()

                let patientName = ""
                if (patient.name) {
                    patientName = getHN(patient.name[0])
                }

                QR.subject = {reference:"Patient/"+patient.id,display:patientName}

                let practitionerName = ""
                if (practitioner.name) {
                    practitionerName = getHN(practitioner.name[0])
                }

                QR.author = {reference:"Practitioner/"+practitioner.id,display:practitionerName}
                QR.item = []

                //the top level items - sections - directly off the Q root...
                Q.item.forEach(function (section) {
                        let parentItem = null

                        section.item.forEach(function (child) {
                            //items off the section. they will either be data elements, or groups

                            let key = child.linkId  //the key for this Q item
                            let value = form[key]

                            let itemToAdd = {linkId : child.linkId,answer:[],text:child.text}

                            if (value) {        //is there a value for this item. Won't be if this is a group...
                               // console.log("adding",key,value)

                                if (! parentItem) {
                                    parentItem = {linkId : section.linkId,text:section.text,item: []}
                                    QR.item.push(parentItem)
                                }

                                let result = getValue(child,value)
                                itemToAdd.answer.push(result)

                                parentItem.item = parentItem.item || []
                                parentItem.item.push(itemToAdd)
                            }



                            //Are there any grandchildren? If so, they will be conditional items...
                            //the immediate child is of type group, with the actual data items as grandchildren below that
                            if (child.item) {
                                //so this will be the groups - with child items ?todo check?. Each item at this level is a group
                                //the first is the 'main' item that goes in the left pane,
                                // others are in the right pane. May have conditionals (but do we care here? )
                                //but all are at the some level in the QR - on an item off the parent
                                //with the conditional statements on it, and child items (great granschild) below that
                                let gcRootItem     //the item in the QR that any conditional values get added
                                child.item.forEach(function (gcItem) {      //gc is grandChild...
                                    //is there data for this iyem
                                    //todo - not checking whether the item has conditions - should we?
                                    let gcValue = form[gcItem.linkId]
                                    if (gcValue) {
                                       // console.log(gcValue)

                                        //the parent (off the section) may not have been created yet
                                        if (! parentItem) {
                                            parentItem = {linkId : section.linkId,text:section.text,item: []}
                                            QR.item.push(parentItem)
                                        }


                                        if (! gcRootItem) {
                                            //the root hasn't been created
                                            gcRootItem = {linkId:child.linkId,text:child.text,item:[]}

                                            parentItem.item = parentItem.item || []
                                            parentItem.item.push(gcRootItem)
                                        }


                                        let gcItemToInsert = {linkId:gcItem.linkId,text:gcItem.text,answer:[]}

                                        let result = getValue(gcItem,gcValue)

                                        gcItemToInsert.answer.push(result)

                                        gcRootItem.item.push(gcItemToInsert)


                                        //
                                    }



                                    //is the conditional met?
                                    if (false && that.checkConditional(conditionalItem,form)) {
                                        //yes! Not check all the items off this item for data
                                        if (conditionalItem.item) {
                                            let ggcRootItem     //the item in the QR that any conditional values get added
                                            conditionalItem.item.forEach(function (ggcItem) {
                                                //ggc = great grand child!

                                                let ggcValue = form[ggcItem.linkId]
                                                if (ggcValue) {
                                                    //if there's a value, then ensure that the QR structure is complete
                                                    let ggcAnswer = getValue(ggcItem,ggcValue)

                                                    if (! ggcRootItem) {
                                                        //the root hasn't been created
                                                        ggcRootItem = {linkId:conditionalItem.linkId,text:conditionalItem.text,item:[]}
                                                        itemToAdd.item = itemToAdd.item || []
                                                        itemToAdd.item.push(ggcRootItem)
                                                    }
                                                    let ggcItemToInsert = {linkId:ggcItem.linkId,text:ggcItem.text,answer:[]}
                                                    ggcItemToInsert.answer.push(ggcAnswer)
                                                    ggcRootItem.item.push(ggcItemToInsert)

                                                }

                                            })
                                        }



                                    }



                                })
                            }



                        })
                })

                return QR

                function getValue(item,value) {
                    let result;
                    switch (item.type) {
                        case "choice":
                            //console.log(value)

                            //when a radio is used as the input, the value is a string rather than an object
                            if (typeof value === 'string' || value instanceof String) {
                                value = JSON.parse(value)
                            }


                            if (value.valueCoding) {
                                //itemToAdd.answer.push(value)    //will be a coding
                                result = value
                            } else {
                                result = {valueCoding : value}
                                //itemToAdd.answer.push({valueCoding : value})
                            }
                            //itemToAdd.answer.push({valueCoding : value})    //will be a coding
                            //itemToAdd.answer.push(value)    //will be a coding
                            break;
                        case "decimal" :
                            let v = parseFloat(value)
                            if (v) {
                                result = {valueDecimal : v }
                                //itemToAdd.answer.push({valueDecimal : v })
                            } else {
                                alert("Item: " + item.text + " must be a number")
                            }

                            break;
                        case "boolean":
                            result = {valueBoolean : value}
                            //itemToAdd.answer.push({valueBoolean : value})    //will be a coding
                            break;

                        case "reference" :
                            result = {valueReference : value}
                            //itemToAdd.answer.push({valueReference : value})
                            break

                        default :
                            result = {valueString : value}
                            //itemToAdd.answer.push({valueString : value})
                    }

                    return result
                    //node.item = node.item || []
                    //node.item.push({answer: answer})
                    //node.item.push(itemToAdd)


                }

            },

            makeQROld : function(Q,form,hash,patient,practitioner) {
                //make the QuestionnaireResponse from the form data
                //hash is items from the Q keyed by linkId
                //form is the data enterd keyed by linkId
                //todo - make recursive...
                let qrId = this.createUUID()
                let err = false
                //console.log(form)
                //console.log(hash)
                let QR = {resourceType:'QuestionnaireResponse',id:qrId,status:'in-progress'}
                QR.text = {status:'generated'}
                QR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>QR resource</div>"
                QR.questionnaire = Q.url
                QR.authored = new Date().toISOString()

                let patientName = ""
                if (patient.name) {
                    patientName = getHN(patient.name[0])
                }

                QR.subject = {reference:"Patient/"+patient.id,display:patientName}

                let practitionerName = ""
                if (practitioner.name) {
                    practitionerName = getHN(practitioner.name[0])
                }

                QR.author = {reference:"Practitioner/"+practitioner.id,display:practitionerName}
                QR.item = []



                let topNode = []
                //node is the structure that is being constructed. It has an item[] property
                //As this routine is called
                //item is the item from the Q that is being parsed...

                function parseQ(node,item,level) {
                    if (item.item) {


                        let parentNode = {linkId:item.linkId,item:[],text:item.text}
                        node.item.push(parentNode)

                        item.item.forEach(function(child){
                            if (level == 0) {
                                level++
                                parseQ(parentNode,child,level)
                            }



                        })

                    } else {
                        //is there a value:
                        let value = form[item.linkId]
                        let itemToAdd = {linkId : item.linkId,answer:[],text:item.text}

                        if (value) {
                            switch (item.type) {
                                case "choice":
                                   // console.log(value)
                                    if (value.valueCoding) {
                                        itemToAdd.answer.push(value)    //will be a coding
                                    } else {
                                        itemToAdd.answer.push({valueCoding : value})
                                    }
                                    //itemToAdd.answer.push({valueCoding : value})    //will be a coding
                                    //itemToAdd.answer.push(value)    //will be a coding
                                    break;
                                case "decimal" :
                                    let v = parseFloat(value)
                                    if (v) {
                                        itemToAdd.answer.push({valueDecimal : v })
                                    } else {
                                        alert("Item: " + item.text + " must be a number")
                                    }

                                    break;
                                case "boolean":
                                    itemToAdd.answer.push({valueBoolean : value})    //will be a coding
                                    break;

                                case "reference" :
                                    itemToAdd.answer.push({valueReference : value})
                                    break

                                default :
                                    itemToAdd.answer.push({valueString : value})
                            }

                            node.item = node.item || []
                            //node.item.push({answer: answer})
                            node.item.push(itemToAdd)
                        }

                    }
                }

                //as the Q doesn't have a single top level item, we need to iterate through them and
                //add them independently to the QR
                Q.item.forEach(function (topLevelItem){
                    let childrenOfNode = {item:[]}
                    parseQ(childrenOfNode,topLevelItem,0)

                    let branchToAdd = childrenOfNode.item[0]
                    if (branchToAdd) {
                        if ( branchToAdd.item) {
                            //this is a top level grouper - ie has children. Only add if there are items..
                            //todo need more testing with more deeply nested nodes...
                            if (branchToAdd.item.length > 0) {
                                topNode.push(branchToAdd)
                            }
                        } else {
                            //this is a 'data' element directly off the top so add it...
                            topNode.push(branchToAdd)
                        }
                    }


                   // console.log(childrenOfNode.item[0])

                   //topNode.push(childrenOfNode.item[0])    //otherwise too deeply nested
                    //console.log(childrenOfNode)
                })


                QR.item = topNode
                //console.log(topNode.item)
               // console.log(QR)


                /*

                Q.item.forEach(function (parent) {
                    let parentItem = {linkId : parent.linkId,text:parent.text,item: []}
                    QR.item.push(parentItem)
                    parent.item.forEach(function (child) {
                        let key = child.linkId  //the key for this Q item
                        let value = form[key]

                        if (value) {
                            console.log("adding",key,value)
                            switch (child.type) {
                                case "boolean" :
                                    //regardless, push the answer
                                   // parentItem.item.push({linkId:key,answer:[{valueBoolean : value}],text:child.text})
                                    break
                                case "choice" :
                                  //  if ( value && value.code) {
                                        parentItem.item.push({linkId: key, answer:[{valueCoding: value.valueCoding}],text:child.text})
                                  //  }
                                    break
                                default:
                                    if ( value) {
                                        parentItem.item.push({linkId:key,answer:[{valueString : value}],text:child.text})
                                    }
                                    break
                            }
                        }




                    })
                })

*/
                return QR
                /*
                                Object.keys(form).forEach(function (key) {
                                    let value = form[key]
                                    let item = hash[key]  //the definition of the question
                                    if (item) {
                                        let answer = {linkId : key}
                                        switch (item.type) {

                                            case "choice":
                                                answer = value      //will be a coding
                                                break;
                                            default :
                                                answer.valueString = value
                                        }
                                        QR.answer.push(answer)
                                    } else {
                                        err = true
                                        console.log("The hash entry for " + key + ' is missing')
                                    }

                                })

                                */
                if (err) {
                    //alert("there was an error creating the QR - see the browser console for details")
                }

                return QR

            },

            makeFormDefinition : function(treeData) {
                //create the form definition object from the treeData derived from the Q. Used by the form render include...
                //needs more thought - this will do...
                let that = this
                let deferred = $q.defer()

                let formDef = angular.copy(treeData)
                formDef.splice(0,1)      //remove the root

/* not sure whether to do this here, or by the QCreator when the Q is created / updated... */

                // Add a flag so can show extractables
                formDef.forEach(function (def) {
                    let ar = that.findExtension(def.data.item, extUrlObsExtract)
                    //console.log(ar.length)
                    if (ar.length > 0 && ar[0].valueBoolean == true) {
                        def.meta = {obsExtract:true}
                    }

                    if (def.data && def.data.type == 'choice' && def.data.answerValueSet) {

                        //is the formcontrl a dropdown

                        //retrieve the VS from the term server and populate the answeroption

                    }
                })



                deferred.resolve(formDef)
                return deferred.promise


            },

            makeQItemsFromTree : function(treedata) {
                //make a set of Q items from the tree. 3 levels only. todo make recursive
                //console.log(treedata)


                //create an array of root nodes
                let arItems = []    //the Q has an array of items - not a single element...
                let sectionItem = {}
                treedata.forEach(function (node){

                    if (node.parent == '#') {
                        //ignore the root
                    } else if (node.parent == 'root') {
                        //this is a node off the root - ie a top level item (section
                        sectionItem = node.data.item
                        sectionItem.item = []

                        //sectionItem.type = 'group'  //force the type

                        arItems.push(sectionItem)
                    } else {
                        //this is a child off the top level/section.

                        let leafItem = node.data.item
                        sectionItem.item.push(leafItem)
                        if (leafItem.item) {
                            //this'll be a group with items...
                            leafItem.item.forEach(function () {

                            })
                        }
                    }
                })
                //console.log(arItems)
                return arItems



            },

            makeTreeFromQ : function (Q) {
                //specifically 3 levels. Not recursive
                let that = this
                let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                let treeData = []
                let hash = {}
                let root = {id:'root',text:'Root',parent:'#',state:{},data:{level:'root'}}
                treeData.push(root)

                Q.item.forEach(function(sectionItem){
                    //each top level item is a section
                    let item = {id: sectionItem.linkId,state:{},data:{}}
                    item.text = sectionItem.text + " " + treeData.length;
                    item.parent = "root";
                    let meta = that.getMetaInfoForItem(sectionItem)
                    item.data = {item:sectionItem,level:'parent',meta:meta}


                    //item.data.mult = makeMult(parentItem) //mult
                    item.answerValueSet = sectionItem.answerValueSet
                    // why do I need this?item.data.description = getDescription(parentItem)

                    hash[item.id] = item.data;
                    treeData.push(item)

                    //second layer - ie each section
                    if (sectionItem.item) {
                        sectionItem.item.forEach(function (child,childInx) {
                            let item = {id: child.linkId,state:{},data:{}}
                            item.text = child.text + " " + treeData.length;
                            item.parent = sectionItem.linkId;
                            let meta = that.getMetaInfoForItem(child)
                            item.data = {item:child,level:'child',meta:meta,parentItem : sectionItem, parentItemInx:childInx} //child
                            //item.meta = {level:'child'}
                            /*
                            item.data = {type:child.type,text:child.text};
                            item.data.answerOption = child.answerOption
                            item.data.mult = makeMult(child) //mult
                            item.data.description = getDescription(child)
                            */
                            hash[item.id] = item.data;
                            treeData.push(item)

                            //third level - the contents of a section element...
                            if (child.item) {
                                child.item.forEach(function (grandchild) {
                                    let item = {id: grandchild.linkId, state: {}, data: {}}
                                    item.text = grandchild.text + " " + treeData.length;
                                    item.parent = child.linkId;
                                    let meta = that.getMetaInfoForItem(grandchild)
                                    item.data = {item: grandchild, level: 'child', meta:meta} //child
                                    //item.meta = {level:'child'}
                                    /*
                                    item.data = {type:child.type,text:child.text};
                                    item.data.answerOption = child.answerOption
                                    item.data.mult = makeMult(child) //mult
                                    item.data.description = getDescription(child)
                                    */
                                    hash[grandchild.id] = grandchild.data;
                                    treeData.push(item)
                                })
                            }



                        })

                    }

                })



                return {treeData : treeData,hash:hash}

                function getDescription(item) {
                    let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                    let v = ""
                    if (item.extension) {
                        item.extension.forEach(function (ext) {
                            if (ext.url == extUrl ) {

                                v = ext.valueString
                            }
                        })
                    }
                    return v
                }

                function makeMultDEP(item) {
                    let mult = ""
                    if (item.required) {
                        mult = "1.."
                    } else {
                        mult = "0.."
                    }

                    if (item.repeats) {
                        mult += "*"
                    } else {
                        mult += "1"
                    }
                    return mult
                }

            }
        }
    })