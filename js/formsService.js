angular.module("formsApp")

    .service('formsSvc', function($q,$http,$filter,moment) {

        extUrlFormControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extUrlObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"

        return {

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
                if (item.extension) {
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


            makeQR : function(Q,form,hash,patient,practitioner) {
                //make the QuestionnaireResponse from the form data
                //hash is items from the Q keyed by linkId
                //form is the data enterd keyed by linkId
                //todo - make recursive...
                let err = false
                console.log(form)
                console.log(hash)
                let QR = {resourceType:'QuestionnaireResponse',id:"qr-" + new Date().getTime(),status:'in-progress'}
                QR.text = {status:'generated'}
                QR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>QR resource</div>"
                QR.questionnaire = Q.url
                QR.authored = new Date().toISOString()
                QR.subject = {reference:"Patient/"+patient.id}
                QR.author = {reference:"Practitioner/"+practitioner.id}
                QR.item = []



                let topNode = []
                //node is the structure that is being constructed. It has an item[] property
                //As this routine is called
                //item is the item from the Q that is being parsed...
                function parseQ(node,item) {
                    if (item.item) {

                        let parentNode = {linkId:item.linkId,item:[],text:item.text}
                        node.item.push(parentNode)

                        item.item.forEach(function(child){

                            parseQ(parentNode,child)
                        })

                    } else {
                        //is there a value:
                        let value = form[item.linkId]
                        let itemToAdd = {linkId : item.linkId,answer:[],text:item.text}

                        if (value) {
                            switch (item.type) {
                                case "choice":
                                    console.log(value)
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
                    parseQ(childrenOfNode,topLevelItem)

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
                console.log(topNode.item)
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
                //make a set of Q items from the tree. 2 levels only. todo make recursive
                //console.log(treedata)


                //create an array of root nodes
                let arItems = []    //the Q has an array of items - not a single element...
                let parentItem = {}
                treedata.forEach(function (node){

                    if (node.parent == '#') {
                        //ignore the root
                    } else if (node.parent == 'root') {
                        //this is a node off the root - ie a top level item
                        parentItem = node.data.item
                        parentItem.item = []

                        parentItem.type = 'group'  //force the type

                        arItems.push(parentItem)
                    } else {
                        //this is a child off the top level. Here is where any recursion would go if > 2 levels
                        //note that recursion is on tree structure
                        let leafItem = node.data.item
                        delete leafItem.item    //just in case - shouldn't be here at 2 levels....

                        parentItem.item.push(leafItem)
                    }
                })
                //console.log(arItems)
                return arItems



            },

            makeTreeFromQ : function (Q) {
                //specifically 2 levels. Not recursive
                let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                let treeData = []
                let hash = {}
                let root = {id:'root',text:'Root',parent:'#',state:{},data:{level:'root'}}
                treeData.push(root)

                Q.item.forEach(function(parentItem){

                    let item = {id: parentItem.linkId,state:{},data:{}}
                    item.text = parentItem.text;
                    item.parent = "root";
                    item.data = {item:parentItem,level:'parent'}
                    //item.meta = {level:'parent'}
                    //item.data = {type:parentItem.type,text:parentItem.text};

                    //item.data.mult = makeMult(parentItem) //mult
                    item.answerValueSet = parentItem.answerValueSet
                    // why do I need this?item.data.description = getDescription(parentItem)

                    hash[item.id] = item.data;
                    treeData.push(item)

                    if (parentItem.item) {
                        parentItem.item.forEach(function (child) {
                            let item = {id: child.linkId,state:{},data:{}}
                            item.text = child.text;
                            item.parent = parentItem.linkId;
                            item.data = {item:child,level:'child'} //child
                            //item.meta = {level:'child'}
                            /*
                            item.data = {type:child.type,text:child.text};
                            item.data.answerOption = child.answerOption
                            item.data.mult = makeMult(child) //mult
                            item.data.description = getDescription(child)
                            */
                            hash[item.id] = item.data;
                            treeData.push(item)
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

                function makeMult(item) {
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