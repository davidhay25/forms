angular.module("formsApp")

    .service('formsSvc', function($q,$http,$filter,moment) {

        let globals
        $http.get("globals.json").then(
            function(data) {
                globals = data.data
            }
        )

        let tagFolderSystem = "http://clinfhir.com/fhir/NamingSystem/qFolderTag"

        let extensionUrl = {}

        //termServer = "https://r4.ontoserver.csiro.au/fhir/"
        termServer = "https://terminz.azurewebsites.net/fhir/"


        validationServer = "http://localhost:9099/baseR4/"

        HPIRoot = "http://home.clinfhir.com:8054/baseR4/"

        csHisoNumber = "https://standards.digital.health.nz/ns/hiso-number"

        extItemControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extUrlObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
        extResourceReference = "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource"
        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"


        //todo fsh doesn't underatnd expression extension...
        //extPrepop = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-prepop"

        extPrepop = "http://canshare.com/fhir/StructureDefinition/sdc-questionnaire-initialExpression"

        extExtractNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNotes"
        extExtractPath = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractPath"
        extExtractType = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractType"
        extExtractNone = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNone"

        extUsageNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-usageNotes"

        extVerification= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-verification"
        extNotes= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-notes"

        extSourceStandard = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-sourceStandard"

        extHisoClass = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-class"
        extHisoLength = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-length"
        extHisoDT = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-dt"
        extHisoLayout = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-layout"

        extColumn = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column"
        extColumnCount = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"
        extDescription = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-item-description"

       // extAuthor = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-author"
        extQAttachment = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-attachment"
        extHL7v2Mapping = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-v2mapping"
        extCheckOutQ = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-check-out"

        extHisoStatus = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hisostatus"
        extHisoUOM = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-unit-of-measure"

        extFolderTag = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-folder-tag"

        //extensionUrl.extRenderVS = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-render-vs"
        extensionUrl.extCanPublish = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaireresponse-can-publish-reviewer"
        extensionUrl.extPublishOia = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaireresponse-can-publish-reviewer-oia"

        canShareServer = "http://canshare/fhir/"

        //ballotList

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

        let arExpandedVsCache = {}      //cache of expanded VS

        return {

            checkForConditional(Q,linkId) {
                //Find all items that have a conditional on the linkId (ie the enableWhen.question is the same as the linkId
                let lst = []
                if (Q.item) {
                    Q.item.forEach(function (section) {
                        checkEW(section,linkId)
                        if (section.item) {
                            section.item.forEach(function (child) {
                                if (child.item) {
                                    child.item.forEach(function (grandChild) {
                                        checkEW(grandChild,linkId)
                                    })
                                } else {
                                    checkEW(child,linkId)
                                }
                            })
                        }

                    })
                }
                return lst

                function checkEW(item,linkId) {
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            if (ew.question == linkId) {
                                lst.push(item.linkId)
                            }
                        })
                    }
                }

            },


            makeChoiceElementDEP : function(Q,linkId) {
                //take an item with child elements (a group) and convert it into a cholce element, removing the children

                //if (item.item) {
                //need to locate the item in the Q with the given linkId
                let that = this
                let sectionToUpdate, originalChild, pos
                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {

                    let section = Q.item[sectionIndex]
                    if (section.item) {
                        section.item.forEach(function (child,inx) {
                            if (child.linkId == linkId) {
                                //this is the item in the Q that will be converted to a choice.

                                //Insert a copy of item after conversion. It must be deleted at some point as the linkId's will be the same
                                originalChild = angular.copy(child)
                                sectionToUpdate = section
                                pos = inx
                                child.text = child.text + " (converted)"
                                child.answerOption = []
                                child.item.forEach(function (grandChild) {
                                    //construct a coding
                                    child.answerOption.push({valueCoding:{display:grandChild.text}})
                                })

                                child.type = "choice"
                                //remove the column count extension
                                if (child.extension) {
                                    let arExtensions = child.extension
                                    child.extension = []
                                    arExtensions.forEach(function (ext) {
                                        if (ext.url !== extColumnCount) {
                                            child.extension.push(ext)
                                        }
                                    })
                                }
                                delete child.item

                            }
                        })

                        if (pos) {
                            //convert all the linkIds
                            originalChild.linkId = 'delete-' + originalChild.linkId
                            originalChild.item.forEach(function (item) {
                                item.linkId = 'delete-' + item.linkId
                                delete item.enableWhen  //always show the item
                                //check and conditionals
                                /*
                                if (item.enableWhen) {
                                    item.enableWhen.forEach(function (ew) {
                                        ew.question =
                                    })
                                }
                                */
                            })
                            //delete originalChild.item
                            sectionToUpdate.item.splice(pos,0,originalChild)
                        }
                    }
                }


            },

            makeChoiceElement : function(Q,linkId) {
                //take an item with child elements (a group) and create a cholce element, with the children of the original as options in the answerOptions element
                //need to locate the item in the Q with the given linkId
                let choiceItem;         //the item to be created
                let that = this
                let ewList = []     //list of enableWhen (delendencies) that could refer to any child elements
                let sectionToUpdate, originalChild, pos
                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {

                    let section = Q.item[sectionIndex]
                    if (section.item) {

                        section.item.forEach(function (child,inx) {

                            if (child.linkId == linkId) {
                                //this is the item in the Q that will be converted to a choice.

                                //Insert a copy of item after conversion. It must be deleted at some point as the linkId's will be the same
                                choiceItem = angular.copy(child)
                                //sectionToUpdate = section
                                pos = inx
                                choiceItem.text = child.text + " (converted)"
                                choiceItem.linkId = choiceItem.linkId + "-converted"
                                choiceItem.answerOption = []
                                child.item.forEach(function (grandChild) {
                                    //construct a coding
                                    let ao = {valueCoding:{code:grandChild.text,display:grandChild.text}}
                                    choiceItem.answerOption.push(ao)

                                    //create what an 'enableWhen' from another element (ie a dependeny) would look like.
                                    //this will be used to update other items that have a dependency on this one
                                    let ew = {question:grandChild.linkId}    //the question would have been be this one
                                    ew.answerCoding = ao //how the dependant item would refer to this one now
                                    ew.newQuestion = choiceItem.linkId //the new linkId that a dependant item should use
                                    ewList.push(ew)  //don't need the operator - this will be on the item that is dependant on this one...

                                })

                                choiceItem.type = "choice"

                                //set the column count and control type xtensions
                                choiceItem.extension = []
                                choiceItem.extension.push({url:extColumnCount,valueInteger:1})

                                let ext = {url:extItemControl}
                                ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"check-box"}]}
                                choiceItem.extension.push(ext)

                                delete choiceItem.item      //remove the children

                            }
                        })

                        if (pos !== undefined) {          //ie the item to convert was found
                            section.item.splice(pos,0,choiceItem)
                            console.log('inserting...')
                            //Only want to insert it once!
                            return ewList
                        }
                    }
                }




            },

            getFolderTagExtUrl : function(){
                return extFolderTag
            },

            QhasFolderTag : function(Q,tag) {

                //return true if the Q has the given folder tag (case insensitive)
                let hasTag = false
                let tagLC = tag.toLowerCase()


                if (Q.extension) {
                    Q.extension.forEach(function (ext) {
                        if (ext.url == extFolderTag) {
                            if (ext.valueString && ext.valueString.toLowerCase() == tagLC) {
                                hasTag = true
                            }
                        }
                    })
                }

                return hasTag

            },

            getHisoNumber : function(Q,number) {
                let hisoNumber = ""
                if (Q) {
                    if (Q.identifier) {
                        Q.identifier.forEach(function (ident) {
                            if (ident.system == csHisoNumber) {
                                hisoNumber = ident.value
                            }

                        })
                    }
                }

                return hisoNumber
            },
            setHisoNumber : function(Q,number) {
                let arIdentifiers = []
                if (Q.identifier) {
                    Q.identifier.forEach(function (ident) {
                        if (ident.system !== csHisoNumber) {
                            arIdentifiers.push(ident)
                        }
                    })
                }
                Q.identifier = arIdentifiers
                Q.identifier.push({system:csHisoNumber,value:number})

            },

            getCheckoutIdentifier : function(Q) {
                if (Q) {
                    let arExt = this.findExtension(Q,extCheckOutQ)
                    if (arExt.length > 0) {
                        return arExt[0].valueIdentifier     //identifier useas has email & dates
                    }
                }
            },

            clearQCheckout : function(Q) {
                //prepare for checkin - clear the checkout extension
                let ar = []
                Q.extension.forEach(function (ext) {
                    if (ext.url !== extCheckOutQ) {
                        ar.push(ext)
                    }
                })
                Q.extension = ar
            },

            checkoutQ : function(Q,email) {
                //create the Q extension for checkout. Remove any others there may be...
                Q.extension = Q.extension || []
                let valueIdentifier = {system:"http://www.faqs.org/rfcs/rfc2822.html",value:email}        //using an identifier as it also has a date...
                valueIdentifier.period = {start: new Date().toISOString()}
                //remove any existing checkout elements...

                let ar = []
                Q.extension.forEach(function (ext) {
                    if (ext.url !== extCheckOutQ) {
                        ar.push(ext)
                    }
                })
                Q.extension = ar
                Q.extension.push({url:extCheckOutQ,valueIdentifier: valueIdentifier})
                return valueIdentifier
            },

            getHisoStatus : function(Q) {
                if (Q) {
                    let arExt = this.findExtension(Q,extHisoStatus)
                    if (arExt.length > 0) {
                        return arExt[0].valueCode
                    }
                }

            },
            setHisoStatus : function(Q,status) {
                Q.extension = Q.extension || []

                let ar = []
                Q.extension.forEach(function (ext) {
                    if (ext.url !== extHisoStatus) {
                        ar.push(ext)
                    }
                })
                Q.extension = ar
                Q.extension.push({url:extHisoStatus,valueCode : status})

            },

            ehrPrepop : function(Q,form,cb) {
                //demo the pre-population from an ehr

                $http.get("/ds/api/prepop").then(
                    function(data) {
                        form = form || {}
                        let hashPrepop = data.data

                        if (Q.item) {
                            Q.item.forEach(function (sectionItem) {
                                if (sectionItem.item) {
                                    sectionItem.item.forEach(function(child){
                                        if (child.item) {
                                            //a group

                                        } else {
                                            //a leaf
                                            setValue(hashPrepop,form,child)
                                        }
                                    })
                                }
                            })
                        }


                        if (cb) {
                            cb()
                        }

                    }
                )

                function setValue(hash,form,item){
                    if (hash[item.linkId]) {
                        let prepop = hash[item.linkId]
                        if (prepop.valueCoding && item.answerOption) {
                            item.answerOption.forEach(function (opt) {
                                if (opt.valueCoding.display == prepop.valueCoding.display) {
                                    form[item.linkId] = opt
                                }
                            })
                        } else {
                            form[item.linkId] = hash[item.linkId]
                        }


                    }
                }
            },

            prepop : function(Q) {
                //where the Q has an 'initial' element set
                let formData = {}
                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function(child){
                                if (child.item) {
                                    //a group
                                    child.item.forEach(function (grandChild) {
                                        getValue(formData,grandChild)
                                    })
                                } else {
                                    //a leaf
                                    getValue(formData,child)
                                }
                            })
                        }
                    })
                }
                return formData

                function getValue(form,child) {
                    //assume only a single initial of type coding
                    let initial = child.initial
                    if (initial && initial.length > 0) {
                        let coding = initial[0].valueCoding
                        if (coding && child.answerOption) {

                            //have to find the value from the list of options - angular needs it
                            child.answerOption.forEach(function (opt) {
                                if (opt.valueCoding.display == coding.display) {
                                    form[child.linkId] = opt
                                }
                            })
                        }
                    }
                }
            },

            getQAttachments : function(Q) {
                //return an array of attachments
                let arExt = this.findExtension(Q,extQAttachment)
                let ar = []
                arExt.forEach(function (ext) {
                    ar.push(ext.valueAttachment)
                })

                return ar

            },
            addQAttachment : function(Q,att) {
                Q.extension = Q.extension || []
                Q.extension.push({url:extQAttachment,valueAttachment : att})
            },
            removeQAttachment : function(Q,url) {
                let pos = -1
                if (Q.extension) {
                    Q.extension.forEach(function (ext,inx) {
                        if (ext.url == extQAttachment && ext.valueAttachment && ext.valueAttachment.url == url) {
                            pos = inx
                        }

                    })
                    if (pos > -1) {
                        Q.extension.splice(pos,1)
                    }
                }

            },

            removeQfromBallotListDEP : function(Q) {
                //remove the Q with the id from the ballot list
                let deferred = $q.defer()
                this.getBallotList().then(
                    function (list) {
                        let inx = -1
                        let ref = `Questionnaire/${Q.id}`
                        list.entry.forEach(function (entry,ctr) {
                            if (entry.item.reference == ref) {
                                inx = ctr
                            }
                        })

                        if (inx > -1) {
                            list.entry.splice(inx,1)
                            $http.put("/ds/fhir/List/ballot",list).then(
                                function (data) {
                                    deferred.resolve(list)
                                }, function(err) {
                                    //create and return an empty ballot list
                                    deferred.reject( err)
                                }
                            )
                        } else {
                            deferred.reject({ msg:"id not found in list"})
                        }

                        //list.entry.push({item:{display:'Lung Cancer request',reference:`Questionnaire/${id}`}})



                    }
                )

                return deferred.promise

            },
            addQtoBallotListDEP : function(Q) {
                //add the Q with the id to the ballot list
                let deferred = $q.defer()
                this.getBallotList().then(
                    function (list) {
                        list.entry = list.entry || []
                        list.entry.push({item:{display:Q.title,reference:`Questionnaire/${Q.id}`}})
                        $http.put("/ds/fhir/List/ballot",list).then(
                            function (data) {
                                deferred.resolve(list)
                            }, function(err) {
                                //create and return an empty ballot list
                                deferred.reject( err)
                            }
                        )
                    }
                )

                return deferred.promise

            },
            getBallotListDEP : function() {
                //get List of Q's open for ballot (same as for comment)
                let deferred = $q.defer()
                $http.get("/ds/fhir/List/ballot").then(
                    function (data) {

                        deferred.resolve(data.data)
                    }, function(err) {
                        //create and return an empty ballot list
                        deferred.resolve( {resourceType:"List",id:"ballot", status:'current',mode:'snapshot',entry:[]})
                    }
                )
                return deferred.promise
            },

            getServers : function(){
                return {termServer: termServer,validationServer:validationServer}
            },

            makeHashAllItems(Q) {
                let that = this
                let hash = {}
                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {
                        hash[sectionItem.linkId] = {item:sectionItem,meta:that.getMetaInfoForItem(sectionItem)}

                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (childItem) {
                                hash[childItem.linkId] = {item:childItem,meta:that.getMetaInfoForItem(childItem)}
                                //hash[childItem.linkId] = childItem


                                if (childItem.item) {
                                    childItem.item.forEach(function (grandchildItem) {
                                        hash[grandchildItem.linkId] = {item:grandchildItem,meta:that.getMetaInfoForItem(grandchildItem)}
                                        //hash[grandchildItem.linkId] = grandchildItem

                                    })
                                }

                            })
                        }

                    })
                }
                return hash

            },
            getExtUrl : function(key) {
                return extensionUrl[key]
            },
            loadDispositionsForQ : function(Q) {
                let deferred = $q.defer()
                let arResult = []
                let qry = `/ds/fhir/Observation?focus=${Q.url}`  //add category
                let hashLinkId = {}
                $http.get(qry).then(
                    function(data){
                        if (data.data.entry) {
                            let hashLike = {}       //trach likes
                            data.data.entry.forEach(function(entry){
                                let obs = entry.resource
                                if (false && obs.derivedFrom) {
                                    //this is a 'like' from another user - set the likes in the
                                    hashLike[obs.id] = hashLike[obs.id] || 0
                                    hashLike[obs.id] = hashLike[obs.id] + 1
                                } else {
                                    let result = {}

                                    result.id = obs.id
                                    result.disposition = {code:'unknown',display:'unknown'}

                                    if (obs.valueCodeableConcept) {
                                        result.disposition = obs.valueCodeableConcept.coding[0]
                                    }


                                    result.dispositionDate = obs.effectiveDateTime
                                    result.QR_url = obs.derivedFrom[0].reference //the QR that had the initial comment

                                    obs.component.forEach(function (comp){
                                        let code = comp.code.coding[0].code
                                        switch (code) {
                                            case "comment" :
                                                result.comment = comp.valueString
                                                break
                                            case "note" :
                                                result.note = comp.valueString
                                                break
                                            case "reviewer" :
                                                result.author = comp.valueString
                                                break
                                            case "linkId" :
                                                result.linkId = comp.valueString
                                                break
                                            case "authored" :
                                                result.authored = comp.valueDateTime
                                                break
                                        }
                                    })
                                    arResult.push(result)

                                    let linkId = result.linkId || 'unknown'
                                    hashLinkId[linkId] = hashLinkId[linkId] || []
                                    hashLinkId[linkId].push(result)
                                }
                            })

                            //now, update the result with any likes
                            arResult.forEach(function (result) {
                                if (hashLike[result.id]) {
                                    result.likes = hashLike[result.id]
                                }
                            })


                            deferred.resolve({result:arResult,hashLinkId:hashLinkId})
                        }




                        //$scope.dispositionsForQ = data.data
                    },
                    function(err){
                        console.log(err)
                    })
                return deferred.promise
            },
            loadQByUrl : function(url) {
                let qry = "/fm/fhir/Questionnaire?url=" + url
                return $http.get(qry)

            },
            loadQByName : function(name) {
                let qry = "/fm/fhir/Questionnaire?name=" + name
                return $http.get(qry)

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

                                            //"patient-gender": "{\"valueCoding\":{\"system\":\"http://hl7.org/fhir/administrative-gender\",\"code\":\"male\",\"display\":\"Male\"}}"
                                            // }
                                            let coding = {system:"http://hl7.org/fhir/administrative-gender",code:resource.gender,display:resource.gender}


                                            hashData[linkId] = coding
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


                if (meta.extraction) {
                    updateExtension(item,extUrlObsExtract,"Boolean",meta.extraction.extractObservation)

                    updateExtension(item,extExtractNotes,"String",meta.extraction.notes)
                    updateExtension(item,extExtractPath,"String",meta.extraction.path)
                    updateExtension(item,extExtractType,"String",meta.extraction.type)
                    updateExtension(item,extExtractNone,"Boolean",meta.extraction.none)

                }

                //usage notes
                updateExtension(item,extUsageNotes,"String",meta.usageNotes)

                //description
                updateExtension(item,extDescription,"String",meta.description)

                //source standard
                updateExtension(item,extSourceStandard,"String",meta.sourceStandard)

                //display columns
                updateExtension(item,extColumn,"Integer",meta.column)

                updateExtension(item,extColumnCount,"Integer",meta.columnCount)

                //form control
                updateExtension(item,extItemControl,"CodeableConcept",meta.itemControl)

                //hidden
                updateExtension(item,extHidden,"Boolean",meta.hidden)

                //renderVS
                //this is actually saved as an item control extension
                if (meta.renderVS) {
                    let cc = {coding:[{system:'http://hl7.org/fhir/questionnaire-item-control',code:meta.renderVS}]}
                    updateExtension(item,extItemControl,"CodeableConcept",cc)
                }

                //hiso class
                updateExtension(item,extHisoClass,"String",meta.hisoClass)
                updateExtension(item,extHisoLength,"Integer",meta.hisoLength)
                updateExtension(item,extHisoDT,"String",meta.hisoDT)
                updateExtension(item,extHisoLayout,"String",meta.hisoLayout)

                updateExtension(item,extVerification,"String",meta.verification)
                updateExtension(item,extNotes,"String",meta.notes)

                updateExtension(item,extHL7v2Mapping,"String",meta.v2mapping)
                updateExtension(item,extHisoUOM,"String",meta.UOM)



               // updateExtension(item,extHISOStatus,"Code",meta.HISOStatus)

               //extVerification=
                   // extNotes


                //updateExtension(item,extAuthor,"String",meta.author)

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
                var that = this
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

                let ar1b = this.findExtension(item,extExtractPath)
                if (ar1b.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.path = ar1b[0].valueString
                }

                let ar1c = this.findExtension(item,extExtractType)
                if (ar1c.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.type = ar1c[0].valueString
                }

                let ar1d = this.findExtension(item,extExtractNone)
                if (ar1d.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.none = ar1d[0].valueBoolean
                }


                //now look for description
                let arDesc = this.findExtension(item,extDescription)
                if (arDesc.length > 0) {

                    meta.description = arDesc[0].valueString
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
               // meta.columnCount = 2       //default column count

                let ar6 = this.findExtension(item,extColumnCount)
                if (ar6.length > 0) {
                    meta.columnCount = ar6[0].valueInteger

                }

                //form control
                let ar7 = this.findExtension(item,extItemControl)
                if (ar7.length > 0) {
                    meta.itemControl = ar7[0].valueCodeableConcept

                    //set the element 'renderVS' to the code. Used when rendering a valueset
                    if (meta.itemControl.coding) {
                        meta.renderVS = meta.itemControl.coding[0].code
                    }

                }

                //hidden
                let ar8 = this.findExtension(item,extHidden)
                if (ar8.length > 0) {
                    meta.hidden = ar8[0].valueBoolean
                }


                //hiso code
                let ar10 = this.findExtension(item,extHisoClass)
                if (ar10.length > 0) {
                    meta.hisoClass = ar10[0].valueString
                }
//hiso code
                let ar11 = this.findExtension(item,extHisoLength)
                if (ar11.length > 0) {
                    meta.hisoLength= ar11[0].valueInteger
                }

                let ar12 = this.findExtension(item,extHisoDT)
                if (ar12.length > 0) {
                    meta.hisoDT= ar12[0].valueString
                }

                let ar13 = this.findExtension(item,extHisoLayout)
                if (ar13.length > 0) {
                    meta.hisoLayout= ar13[0].valueString
                }


                let ar14 = this.findExtension(item,extVerification)
                if (ar14.length > 0) {
                    meta.verification = ar14[0].valueString
                }

                let ar15 = this.findExtension(item,extNotes)
                if (ar15.length > 0) {
                    meta.notes= ar15[0].valueString
                }

                let ar16 = this.findExtension(item,extHL7v2Mapping)
                if (ar16.length > 0) {
                    meta.v2mapping= ar16[0].valueString
                }

                let ar17 = this.findExtension(item,extHisoUOM)
                if (ar17.length > 0) {
                    meta.UOM = ar17[0].valueString
                }

                //updateExtension(item,extHL7v2Mapping,"String",meta.v2mapping)


                return meta

                function getSingleExtValueTypeDEP(meta,item,url,type) {
                    let ar = that.findExtension(item,url)
                    if (ar.length > 0) {
                        let v = ar[0]
                        return v[type]
                    }
                }
            },

            generateQReport : function(Q) {
                //generate report for Q

                if (! Q) {
                    return
                }

                let clone = angular.copy(Q)

                let that = this;
                let hashAllItems = {}
                let report = {section:[],coded:[],conditional:[],reference:[]}
                let issues = []     //issues found during report generation

                if (clone.item) {
                    clone.item.forEach(function(sectionItem){
                        //items off the root are the top level sections. They have children that are either single questions
                        //or groups of questions. A group has only a single level of child questions

                        let section = {item:sectionItem,children:[],meta:{}}
                        populateMeta(section)
                        hashAllItems[sectionItem.linkId] = {item:sectionItem,dependencies:[]}

                        report.section.push(section)

                        updateSpecificArrays(section,report,sectionItem)


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

                                    populateMeta(group)

                                    //step through the children of the group..
                                    if (child.item) {
                                        child.item.forEach(function (grandChild) {

                                            updateSpecificArrays(sectionItem,report,grandChild)

                                            let entry = {item:grandChild,meta:{}}
                                            populateMeta(entry)

                                            group.children.push(entry)
                                        })
                                    }

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
                }

                //there's a issue when importing a section if there is a dependency on a non-existant item
                //this creates an entry ion hashAllItems for that non-existont item.
                //for now, we'll remove any entry in hashAllItems that hasn't got an ite, property...
                let tempHash = {}
                Object.keys(hashAllItems).forEach(function (key) {
                    let i = hashAllItems[key]
                    if (i.item && i.section) {
                        tempHash[key] = i
                    }
                })

                return {report:report,hashAllItems:tempHash}
                //return {report:report,hashAllItems:hashAllItems}

                function populateMeta(entry) {
                    //populate meta info - like resource extraction
                    entry.meta = that.getMetaInfoForItem(entry.item)

                }

                function updateSpecificArrays(sectionItem,report,child) {
                    //update the coded & reference

                    //because a dependency could be an item after the current one in the tree, there may be a hash entry that just has the dependencies
                    if (hashAllItems[child.linkId]) {
                        hashAllItems[child.linkId].item = child
                        hashAllItems[child.linkId].section = sectionItem

                    } else {
                        hashAllItems[child.linkId] = {item:child,dependencies:[],section:sectionItem}
                    }

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
                            hashAllItems[ew.question] = hashAllItems[ew.question] || {dependencies : []}
                            hashAllItems[ew.question].dependencies.push({item:child,ew:ew})
                        })

                    }

                }
            },
            makeFormTemplate : function(Q) {
                let that = this;
                let hiddenFields = {}
                let hiddenSections = []
                //let termServer = that.termServer

                //create a template suitable for rendering in up to 4 columns
                //is a collection of sections. Each section contains an array of rows,
                // each row is an array with up to 4 elements (col1-4) and the cell has an array of items

                //if the item has answerValueSet then call fillFromValueSet() to populate meta.expandedVSOptions

                let template = []

                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {
                        let section = {linkId:sectionItem.linkId,text:sectionItem.text,rows:[],item:sectionItem}
                        section.meta = that.getMetaInfoForItem(sectionItem)
                        if (section.meta.hidden) {
                            hiddenSections.push(section)
                        }
                        template.push(section)

                        //now look at the items below the section level.

                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (item) {
                                let meta = that.getMetaInfoForItem(item)
                                if (meta.hidden) {
                                    hiddenFields[sectionItem.linkId] = hiddenFields[sectionItem.linkId] || []
                                    hiddenFields[sectionItem.linkId].push(item)
                                   // hiddenFields.push(item)
                                }
                                if (item.type == 'group') {
                                    //groups has a specific structure ATM
                                    //the first item goes in col 1
                                    //other items go in col 2 - and will often have conditionals on them

                                    let row = {}    //will have multiple columns

                                    row.meta = meta   //this is the meta for the group item...
                                    row.text = item.text
                                    row.group = item

                                    if (item.item) {    //these are the child items
                                        if (meta.columnCount) {
                                            //if there's a column count, then fill rows left -> right
                                            let col = 1
                                            //let rowHasBeenAdded =
                                            item.item.forEach(function (child,inx) {

                                                let side = 'col' + col
                                                let cell = {item:child,meta:that.getMetaInfoForItem(child)}
                                                fillFromValueSet(cell,termServer)
                                                setDecoration(cell,child)
                                                row[side] = row[side] || []
                                                row[side].push(cell)

                                                //dirty = true

                                                if (col % meta.columnCount == 0) {
                                                    //add the current row, and move on to the next..
                                                    section.rows.push(row)
                                                    row = {}
                                                    row.meta = meta
                                                    row.group = item        //need to group to be able to check show/hide for all rows in a group...
                                                    col = 1

                                                } else {
                                                    col++
                                                }
                                            })

                                            if (row.col1) {
                                                //why was I doing this?
                                               // section.rows.push(row)
                                            }

                                        } else {

                                            //when the columnCount is not present or 0, use the strategy first in left, others in right
                                            //this is to make it easier to have the 'control' item in the left column and the others in th eright
                                            item.item.forEach(function (child,inx) {
                                                let childMeta = that.getMetaInfoForItem(child)
                                                if (childMeta.hidden) {
                                                    hiddenFields[sectionItem.linkId] = hiddenFields[sectionItem.linkId] || []
                                                    hiddenFields[sectionItem.linkId].push(item)

                                                }
                                                //ignore any item entries on the child - we don't go any deeper atm

                                                if (inx == 0) {
                                                    //this is the first item in the group - it goes in the left
                                                    let cell = {item:child,meta:childMeta}      //to allow for ither elements like control type...
                                                    fillFromValueSet(cell,termServer)
                                                    setDecoration(cell,child)        //sets things like control type
                                                    //row.left = [cell]
                                                    row['col1'] = [cell]
                                                } else {
                                                    //this is a subsequent item - it will go in the right col by default
                                                    //let side = "right"
                                                    let side = 'col2'
                                                    /* for now, ignore the column number. re-visit when I think more about fill startegies...
                                                    if (childMeta.column ) {
                                                        side = 'col' + childMeta.column
                                                    }*/


                                                    let cell = {item:child,meta:childMeta}
                                                    fillFromValueSet(cell,termServer)
                                                    //,that.getMetaInfoForItem(child)
                                                    setDecoration(cell,child)
                                                    row[side] = row[side] || []
                                                    row[side].push(cell)
                                                }
                                            })
                                            //section.rows.push(row)   //assume that the whole group fits in a single row...
                                        }



                                    }
                                    //add the row even if there are no items in there yet
                                    section.rows.push(row)   //assume that the whole group fits in a single row...

                                } else {
                                    //if the item isn't a group, then add it to column 1.
                                    let row = {}   //will have a single entry - left
                                    row.item = item
                                    row.meta = meta
                                    let cell = {item:item,meta:meta}      //to allow for ither elements like control type...
                                    fillFromValueSet(cell,termServer)
                                    setDecoration(cell,item)
                                    //row.left = [cell]             //make it an array to match the group
                                    row['col1'] = [cell] //make it an array to match the group

                                    section.rows.push(row)

                                }

                            })
                        }

                    })
                }

                let attachments = that.getQAttachments(Q)

                return {template:template,
                    hiddenFields:hiddenFields,
                    hiddenSections: hiddenSections,
                    attachments: attachments
                }

                //looks for specific instructions from the Q about an item - eg render as radio
                //todo - does this overlap with the meta stuff??

                function setDecoration(cell,item) {

                    //look for item control
                    //let extControlType = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
                    let ar = that.findExtension(item,extItemControl)
                    if (ar.length > 0) {
                        let ext = ar[0].valueCodeableConcept
                        if (ext && ext.coding.length > 0) {
                            let controlHint = ext.coding[0].code
                            cell.displayHint = controlHint

                        }
                    }

                    //check required

                    cell.required = item.required


                    //look for observation extraction
                    //let extExtractObs = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
                    let arObs = that.findExtension(item,extUrlObsExtract)
                    if (arObs.length > 0) {
                        if (arObs[0].valueBoolean) {

                            cell.extractObservation = true
                        }

                    }

                }


                //if the item has answerValueSet and the rendering is dropdown or radio then fetch the values from the
                //term server and add them to the meta (so they can't update the item). They will never be saved back....
                //todo - this could be non-perormant when editing / previewing, do we care?
                function fillFromValueSet(cell,termServer) {

                    if (cell.item.answerOption) {
                        //ATM there can be both answerOption and answerValueSet as an artifact of authoring (strictly incorrect).
                        //If there is an answerOption, then use that rather than the valueSet
                        return
                    }

                    if (cell.item.answerValueSet && (cell.meta.renderVS !== 'lookup')) {
                        //if (cell.item.answerValueSet && (cell.meta.renderVS == 'radio' || cell.meta.renderVS == 'dropdown')) {
                        //We can't use the termserver $expand operation on VS created by canshare as we need to support 'uncoded'
                        //concepts - where the code is set to ‘261665006’. When there are multiple entries
                        //with the same code, only 1 of them is returned by $expand - which seems reasonable actually.
                        //so, we get the copy of the VS from the local server and just pull out the elements...

                        //note also that Ontoserver by default returns ValuSets as if _summary was set - no compose element...
                        let vsUrl = cell.item.answerValueSet
                        cell.meta.expandedVSOptions = []

                        if (vsUrl.indexOf('canshare') > -1) {

                            //this is a canshare created VS - enumerate the concepts from the local copy
                            let qry = "/ds/fhir/ValueSet?url=" + vsUrl

                            $http.get(qry).then(
                                function(data) {
                                    if (data.data && data.data.entry) {
                                        //assume only a single VS with this url. todo will need to re-visit is we want to support versions...
                                        let vs = data.data.entry[0].resource
                                        //cell.meta.expandedVSOptions = []
                                        if (vs.compose.include && vs.compose.include[0].concept) {
                                            let system =vs.compose.include[0].system
                                            vs.compose.include[0].concept.forEach(function (concept) {
                                                cell.meta.expandedVSOptions.push({system:system,code:concept.code,display:concept.display})

                                            })
                                        }
                                    }

                                }, function (err) {

                                }
                            )

                        } else {


                            //this is a VS produced by someone else - likely the spec - use $expand on the term server
                            //let vs = cell.item.answerValueSet
                            //maximum number to return is 50

                            if (arExpandedVsCache[vsUrl]) {
                                //present in the cache
                                cell.meta.expandedVSOptions = arExpandedVsCache[vsUrl]
                                console.log('cache hit')
                            } else {
                                let qry =  termServer + "ValueSet/$expand?url=" + vsUrl + "&count=50"

                                $http.get(qry).then(
                                    function(data){

                                        let expandedVS = data.data
                                        arExpandedVsCache[vsUrl] = []
                                        if (expandedVS.expansion && expandedVS.expansion.contains) {
                                            expandedVS.expansion.contains.forEach(function (concept) {
                                                let coding = {system:concept.system,code:concept.code,display:concept.display}
                                                cell.meta.expandedVSOptions.push(coding)
                                                arExpandedVsCache[vsUrl].push(coding)
                                            })
                                        }
                                    },
                                    function(err){

                                        console.log(err)
                                        alert("There was an error expanding the VS with the url: "+ vsUrl + " " + angular.toJson(err.data))
                                        return [{display:"no matching values"}]
                                    }
                                )
                            }


                        }



                            /* don't delete for now...
                        let vs = cell.item.answerValueSet
                        let qry =  termServer + "ValueSet/$expand?url=" + vs

                         $http.get(qry).then(
                            function(data){

                                let vs = data.data

                                if (vs.expansion) {
                                    cell.meta.expandedVSOptions = vs.expansion.contains
                                } else {
                                    cell.meta.expandedVSOptions = []
                                }


                            },
                            function(err){
                                console.log(err)
                                alert("There was an error expanding the VS with the url: "+ vs + " " + angular.toJson(err.data))
                                return [{display:"no matching values"}]
                            }
                        ).finally(
                            function(){
                                $scope.showWaiting = false
                            }
                        )

                        */
                    }

                }

            },
            //determine whether the condition on an item is true...
            checkConditional : function(item,formData) {

                //operates like an OR - return true if any of the conditionals match

                if (item.enableWhen && item.enableWhen.length > 0) {
                    let canShow = false     //default is to hide (ie it is an OR )

                    item.enableWhen.forEach(function(conditional){

                        let formValue = formData[conditional.question]  //the value from the form to be compared
                        
                        if (! formValue) {
                            //if the question is from a VS rendered as a checkbox, each checkbox has the
                            //id of linkid--{n} so the value could be in any of them (but a simple lookup like this will fail).

                            let prefix = conditional.question + "--"   //any answers will start with this
                            Object.keys(formData).forEach(function (key) {
                                if (key.indexOf(prefix) > -1) {
                                    //this formData item belongs to the set of controls rendered for this question.
                                    //does the value match the answerCoding?
                                    let stringValueCoding = formData[key]
                                    if (stringValueCoding) {
                                        let ans = JSON.parse(stringValueCoding)   //It will be a string representation
                                        if (checkEqualCoding(ans.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }
                                }
                            })
                        }

                        //when a radio is used as the input, the value is a string rather than an object
                        if (typeof formValue === 'string' || formValue instanceof String) {
                            formValue = JSON.parse(formValue)
                        }

                        if (formValue !== undefined && formValue !== null) {        //note that value may be boolean false...
                            //if (formValue !== null) {
                            switch(conditional.operator) {

                                case '!=' :
                                    if (conditional.answerString) {
                                        if (formValue.valueString !== conditional.answerString) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerCoding) {
                                        if (! checkEqualCoding(formValue.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }

                                    break
                                case '=' :
                                    //all kinds of conditional support '='
                                    if (conditional.answerCoding) {
                                        if (checkEqualCoding(formValue.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerString) {
                                        if (formValue.valueString == conditional.answerString) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerBoolean !== undefined) {

                                        if (conditional.answerBoolean) {
                                            //when the trigger value is true
                                            if (formValue) {
                                                canShow = true
                                            }
                                        } else {
                                            //when the triggervalue is false
                                            if (! formValue) {
                                                canShow = true
                                            }
                                        }

                                    }
    /*
                                    //when a radio is used as the input, the value is a string rather than an object
                                    if (typeof formValue === 'string' || formValue instanceof String) {
                                        formValue = JSON.parse(formValue)
                                    }
                                    */
                                    break
                                case ">" :
                                    //Only supported by integer

                                    if (conditional.answerInteger !== undefined) {
                                        let targetValue = parseInt(conditional.answerInteger)
                                        let value = formValue.valueInteger

                                        if (value > targetValue) {
                                            canShow = true
                                        }

                                    }
                                    break
                            }
                        }

                        })

                    return canShow

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


            makeQR :  function(Q,form,hash,patient,practitioner,reviewerName,reviewOrganization,reviewerEmail) {
                let that = this


                //todo - working on multiple values for a single linkId.
                //the form var is a hash keyed by the linkId containing the value (if any).
                // For now, make that an array = and only take the first value when processing. Later - allow more than one

                let hashFormValues = {}
                Object.keys(form).forEach(function (key) {
                    let value = form[key]       //the value entered. if this item can have multiple values, then the linkId will have a sufffix separated by -- - eg linkId--1 and linkId--2
                    let ar = key.split('--')
                    let realKey = ar[0]  //strip off any suffix - eg linkid--1 will become just linkid
                    hashFormValues[realKey] = hashFormValues[realKey] || []
                    hashFormValues[realKey].push(value)

                })


                //make the QuestionnaireResponse from the form data
                //hash is items from the Q keyed by linkId - not used any more!
                //form is the data entered keyed by linkId
                let qrId = this.createUUID()
                let err = false

                let QR = {resourceType:'QuestionnaireResponse',id:qrId,status:'in-progress'}
                QR.text = {status:'generated'}
                QR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>QR resource</div>"
                QR.questionnaire = Q.url
                QR.authored = new Date().toISOString()

                //the author will always be a PR
                let PR = {resourceType:"PractitionerRole",id:"pr1"}

                let display = ""

                if (practitioner) {
                    PR.practitioner = {reference:practitioner}
                    if (practitioner.name) {
                        display += getHN(practitioner.name[0])
                    }
                } else {
                    let practitionerName = reviewerName || "No practitioner supplied"
                    PR.practitioner = {display: practitionerName}
                    display += practitionerName
                }

                if (reviewOrganization) {
                    PR.organization = {display:reviewOrganization}
                    display += " at " + reviewOrganization
                }

                if (reviewerEmail) {
                    PR.telecom = [{system:'email',value:reviewerEmail}]

                }
                PR.text = {status:'generated'}
                PR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>"+display+"</div>"

                QR.contained = [PR]
                QR.author = {reference:'#pr1',display:display}



                let patientName = "No patient supplied"
                if (patient) {
                    if (patient.name) {
                        patientName = getHN(patient.name[0])
                    }
                    QR.subject = {reference:"Patient/"+patient.id,display:patientName}
                } else {
                    QR.subject = {display:patientName}
                }


                QR.item = []

                //the top level items - sections - directly off the Q root...
                Q.item.forEach(function (section) {
                        let parentItem = null

                    if (section.item) {
                        section.item.forEach(function (child) {
                            //items off the section. they will either be data elements, or groups

                            let itemToAdd = {linkId : child.linkId,answer:[],text:child.text}

                            let key = child.linkId  //the key for this Q item
                            let value = form[key]
                            let arValues = hashFormValues[key]


                            if (arValues) {        //is there a value for this item. Won't be if this is a group...
                                if (! parentItem) {
                                    parentItem = {linkId : section.linkId,text:section.text,item: []}
                                    QR.item.push(parentItem)
                                }

                                arValues.forEach(function (value) {
                                    let result = getValue(child,value)
                                    if (result ) {
                                        itemToAdd.answer.push(result)
                                    }

                                })
                                parentItem.item = parentItem.item || []
                                parentItem.item.push(itemToAdd)

                            }



                            //Are there any grandchildren? If so, they will be conditional items...
                            //the immediate child is of type group, with the actual data items as grandchildren below that
                            if (child.item) {
                                //so this will be the groups - with child items
                                //the first is the 'main' item that goes in the left pane,
                                // others are in the right pane. May have conditionals (but do we care here? )
                                //but all are at the some level in the QR - on an item off the parent
                                //with the conditional statements on it, and child items (great granschild) below that
                                let gcRootItem     //the item in the QR that any conditional values get added
                                child.item.forEach(function (gcItem) {      //gc is grandChild...
                                    //is there data for this iyem
                                    //todo - not checking whether the item has conditions - should we?
                                    //let gcValue = form[gcItem.linkId]

                                    let arValues = hashFormValues[gcItem.linkId]

                                    if (arValues) {

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

                                        arValues.forEach(function (v) {
                                            let result = getValue(gcItem,v)
                                            if (result) {
                                                gcItemToInsert.answer.push(result)
                                            }

                                        })

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
                    }

                })

                return QR

                function getValue(item,value) {
                    let result;
                    switch (item.type) {
                        case "choice":

                            //check added Aug 2
                            if (! value) {
                                return null
                            }

                            //when a radio is used as the input, the value is a string rather than an object
                            //but when pre-popping it is just the text, so trap the error
                            if (typeof value === 'string' || value instanceof String) {
                                try {
                                    value = JSON.parse(value)
                                } catch(ex) {
                                    console.log("The value was not json")
                                }
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

                        case "date":
                            result = {valueDate: moment(value).format("YYYY-MM-DD")}


                            break;
                        case "dateTime":

                            result = {valueDateTime: moment(value).format("YYYY-MM-DDThh:mm:ssZ")}


                            break;


                        case "reference" :
                            result = {valueReference : value}
                            //itemToAdd.answer.push({valueReference : value})
                            break

                        case "integer" :
                            result = {valueInteger : parseInt(value)}
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

                return arItems
            },

            makeTreeFromQ : function (Q,options) {
                //specifically 3 levels. Not recursive
                //levels root, section, child, grandchild
                options = options || {}     //display options - not currently used...
                let hashEnableWhen = {} //key is the element with EW set, value is the item they are dependant on
                let that = this
                //let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                let treeData = []
                let hash = {}
                let root = {id:'root',text:'Root',parent:'#',state:{},data:{level:'root'}}
                treeData.push(root)

                if (Q.item) {
                    Q.item.forEach(function(sectionItem){
                        //each top level item is a section
                        let item = {id: sectionItem.linkId,state:{},data:{}}
                        item.text = sectionItem.text //+ " " + treeData.length;
                        item.parent = "root";
                        item.icon = "icons/icon-qi-horizontal.png"
                        let meta = that.getMetaInfoForItem(sectionItem)
                        item.data = {item:sectionItem,level:'section',meta:meta}

                        item.answerValueSet = sectionItem.answerValueSet
                        // why do I need this?item.data.description = getDescription(parentItem)

                        hash[item.id] = item.data;
                        treeData.push(item)

                        //second layer - contents of each section
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (child,childInx) {
                                let item = {id: child.linkId,state:{},data:{}}
                                item.text = child.text || child.linkId //+ " " + treeData.length;
                                item.parent = sectionItem.linkId;
                                let meta = that.getMetaInfoForItem(child)
                                item.data = {item:child,level:'child',meta:meta,parentItem : sectionItem, parentItemInx:childInx} //child

                                let iconFile = "icons/icon-q-" + child.type + ".png"
                                item.icon = iconFile

                                hash[item.id] = item.data;
                                treeData.push(item)
                                // not sure what this was checkEnableWhen(child)

                                //third level - the contents of a group...
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        let item = {id: grandchild.linkId, state: {}, data: {}}
                                        item.text = grandchild.text || grandchild.linkId//+ " " + treeData.length;
                                        item.parent = child.linkId;

                                        let iconFile = "icons/icon-q-" + grandchild.type + ".png"
                                        item.icon = iconFile

                                        //item.icon = "icons/icon_q_item.png"
                                        let meta = that.getMetaInfoForItem(grandchild)
                                        item.data = {item: grandchild, level: 'grandchild', meta:meta} //child

                                        hash[grandchild.id] = grandchild.data;
                                        treeData.push(item)
                                        // not sure why this wascheckEnableWhen(grandchild)
                                    })
                                }

                            })

                        }

                    })
                }



                /*
                //adjust the parent of all 'enableWhen' - todo is this the best visualization? - not in the editor
                treeData.forEach(function (item){
                    if (hashEnableWhen[item.id]) {
                        item.parent = hashEnableWhen[item.id]
                    }
                })
*/

                return {treeData : treeData,hash:hash}


                function checkEnableWhenDEP(item) {
                    if (item.enableWhen) {
                        hashEnableWhen[item.linkId] = item.enableWhen[0].question
                    }
                }


                function getDescriptionDEP(item) {
                    //let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                    let v = ""
                    if (item.extension) {
                        item.extension.forEach(function (ext) {
                            if (ext.url == extDescription ) {

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