//Forms receiver module. Receives a QR and processes it
//hapi server in ~/hapi-forms on dev machine
const axios = require('axios').default;
let serverRoot

let globals = require("./globals.json")
const fs = require("fs");
//console.log(globals.hello)

const serverBase = "http://localhost:9099/baseR4/"
//const serverBase = "http://localhost:9099/fhir/"

//a folder that, if it exists, will have a copy of the Q when they are checked in, out or reverted
const backupFolder = "/tmp/cs-backups"

let debug = true
let db

function logError(OO,QR,msg) {
    if (db) {
        let error = {OO:OO,QR:QR,msg:msg,date:new Date().toISOString(),source:'QRProcessing'}
        db.collection('processingErrors').insertOne(error);
    }
}

function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

//generate a random id as we want to assign the id's here (needed to copy between servers preserving the id)
function createId() {
    let id = 'id-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000)
    return id
}

function setDb(inDb) {
    db = inDb
}

function setup(app,sr) {


    serverRoot = sr
    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //Receive a QR resource. Process and save.
    app.post('/fr/fhir/receiveQR',async function(req,res){

        let QR = extractQRFromBundle(req.body)
        console.log("receiveQR")
        if (QR) {
            QR.id = createId()  // createUUID();

            //save a copy of the QR in the backup folder

            if (fs.existsSync(backupFolder)) {
                let fileName = `${backupFolder}/${QR.resourceType}-${QR.id}.json`
                fs.writeFileSync(fileName,JSON.stringify(QR))
            } else {
                console.log(`folder ${backupFolder} does not exist, so the QR was not saved in it.`);
            }


            try {


                //really, the only thing this will do is to create the SR
                let result = await extractResources(QR)
                if (result.resourceType == "OperationOutcome") {
                    //this indicates an error extracting resources. Return the OO and exit..
                    logError(result,QR)
                    res.status(400).json(result)
                    return
                }

                let arResources = result.obs     //An array of created observations todo - and others, rename
                if (debug) {console.log('arResources',arResources)}





                //need to add other resources to provenance
                //let provenance = resources.provenance

                //construct transaction bundle
                let bundle = {resourceType: "Bundle", type: 'transaction', entry: []}
                bundle.entry.push(createEntry(QR))



               arResources.forEach(function (observation) {
                   bundle.entry.push(createEntry(observation))
               })

               axios.post(serverBase, bundle)
                   .then(function (response) {
                       //console.log(response);
                       res.status(response.status).json(response.data)
                   })
                   .catch(function (error) {
                       //console.log(error);

                       //added Nov 2022
                       logError(error.response.data,QR)

                       res.status(error.response.status).json(error.response.data)

                   });

           } catch (ex) {
               res.status(500).json(ex.message)
           }


       } else {
           res.status(400).json({msg:"Bundle does not contain a QR resource"})
       }

       function createEntry(resource) {
           //assume that these are all POST with uuid as id...
           //not any more! - id's are all assigned by the client to support moving resources to another server
           let entry = {}
           entry.fullUrl = serverRoot + resource.resourceType + "/" + resource.id // "urn:uuid:" + resource.id
           entry.resource = resource
           //entry.request = {method:'POST',url:resource.resourceType}
           entry.request = {method:'PUT',url:resource.resourceType + "/" + resource.id}
           return entry
       }

   })


   //use the Reference Implementation test extraction function
   app.post('/fr/ri/testExtract',async function(req,res){
       let bundle = req.body
       //let url = "http://ri.canshare.co.nz:9300/testExtraction"
       let url = "http://localhost:9300/testExtraction"
//console.log(url)
       try {
           let result = await axios.post(url,bundle)
           res.json(result.data)
       } catch (ex) {
           if (ex.response) {
               res.status(400).json(ex.response.data)
           } else {
               res.status(500).json(ex)
           }
       }

   })

   //perform the extraction from an FSH. Used for testing and display in the EHR module
   app.post('/fr/testextract',async function(req,res){
       try {
           let QR = extractQRFromBundle(req.body)
           //console.log(QR)
           if (QR) {
               let resources = await extractResources(QR)
               res.json(resources)
           } else {
               res.status(400).json({msg:"Bundle does not contain a QR resource"})
           }

       } catch (ex) {
           res.status(500).json(ex.message)
       }
   })
}

//get the QR from the bundle.
function extractQRFromBundle(bundle) {
   let QR;
   //console.log(bundle)
   if (bundle && bundle.entry) {
       bundle.entry.forEach(function (entry){
           let resource = entry.resource
           if (resource && resource.resourceType == 'QuestionnaireResponse'){
               QR = resource
           }
       })
   }
   return QR

}


//extract resources from QR
// http://build.fhir.org/ig/HL7/sdc/extraction.html
//https://medium.com/software-development-turkey/using-async-await-with-axios-edf8a0fed4b1
async function extractResources(QR) {

   //get the Questionnaire. for now, get it derectly from the hapi server...
   let qUrl = QR.questionnaire
   if (! qUrl) {
       return makeOO("No questionnaire element in the QR")
   }

   //retrieve the Q
   let url = serverRoot + "Questionnaire?url=" + qUrl // + "&status=active"
   let response = await axios.get(url)

   let bundle = response.data

   if (bundle.entry && bundle.entry.length == 1) {
       //the Q was retrieved
       let Q = bundle.entry[0].resource    //todo - assume only 1

       //retrieve Observations (and potentially other resources)
       let resources = performObservationExtraction(Q,QR)

       // now create other resources (and track with provenance). The provenance was created and populated during resource extraction
       let provenance = resources.provenance

       let cp = null

       //the service request for a revire request - always added ATM as being used for forms development
       //could add other SR's as needed - or a task

       let sr = createServiceRequest(QR,globals.reviewRefer,cp,"Review request",Q)      //todo refactor names of vo returned
       //provenance.target = provenance.target || []
       //provenance.target.push({reference: "urn:uuid:"+ sr.id})
       provenance.target.push({reference: "ServiceRequest/"+ sr.id})
       resources.obs.push(sr)          //not really all obs...

       //to support more sophisticated workflow
       let task = createTask(QR,sr)
       //provenance.target.push({reference: "urn:uuid:"+ task.id})
       provenance.target.push({reference: "Task/"+ task.id})
       resources.obs.push(task)          //not really all obs...

/* not used now, but keep...
       //generate MDM referral (servicerequest) if requested by QR
       if (resources.QRHash['mdmreferral']) {
           let srMDM =  createServiceRequest(QR,globals.mdmrefer,cp,"MDM referral",Q)      //todo refactor names of vo returned
           provenance.target.push({reference: "urn:uuid:"+ srMDM.id})
           resources.obs.push(srMDM)          //not really all obs...
       }
*/


        return resources


    } else {
        return makeOO("There needs to be a single Q with the url: " + qUrl + ". " + bundle.entry.length + " were found.")
    }

}



function performObservationExtraction(Q,QR) {
    const extractDefinitionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext"

    const extractObsUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
    const unitsUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
    let arObservations = []     //the extracted observations

    //iterate over the Q to create a hash (by linkId) of items with the Observation extraction set
    let hashQ = {}      //hash of items that have the Observation extract extension set
    let hashQR = {}     //hash of items in QR with an answer
    let hashQDefinition = {}    //hash of items that have the definition extraction set. {item: resourceType:}


    //recursive algorithm to create hash of items that are Observation extraction
    function parseQ(hashQ,item) {
        if (item.item) {
            //still need to check for definition based extraction...
            //we're assuming that the extension is on the parent - child items use 'definition' with the resource elements

            //look for definition extractions
            let ar1 = findExtension(item,extractDefinitionUrl)
            //console.log(item.linkId,item.extension,ar1.length)
            if (ar1.length > 0) {
                let resourceType = ar1[0].valueCode
                hashQDefinition[item.linkId] = {item:item,resourceType:resourceType}
            }

            item.item.forEach(function(child){
                parseQ(hashQ,child)
            })

        } else {
            //look for the extract Observation extension
            let ar = findExtension(item,extractObsUrl)
            //console.log(item.linkId)
            if (ar.length > 0) {
                //in this case the extension is a boolean. Assume only 1
                if (ar[0].valueBoolean) {
                    //todo - ?need to check that there is a code
                    hashQ[item.linkId] = item
                }
            }

        }
    }

    if (Q.item) {
        //should never be missing the top level item array...
        Q.item.forEach(function(topLevel){
            parseQ(hashQ,topLevel)
        })
    }

    //go through the QR and generate a hash or response items keyed by linkId
    function parseQR(hashQR,item) {
        if (item.item) {
            item.item.forEach(function(child){
                parseQR(hashQR,child)
            })

        } else {
            //It's assumed that there is only an item if it has a value
            hashQR[item.linkId] = item

        }
    }

    if (QR.item) {
        QR.item.forEach(function(topLevel){
            parseQR(hashQR,topLevel)
        })
    }

    //the provenance resource for this action
    let provenance = {resourceType:"Provenance"}
    provenance.id = createId()  // createUUID()   //will be ignored by fhir server
    //the subject might be a reference to a contained PR resource...
    if (QR.author && QR.author.reference && QR.author.reference.substring(0,1) == '#') {
        provenance.contained = QR.contained
    }

    provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Resources extracted from QR</div>"}
    provenance.recorded = new Date().toISOString()
    provenance.entity = []
    provenance.agent = []
    provenance.target = []

    //provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})
    provenance.entity.push({role:"source",what:{reference:"QuestionnaireResponse/" + QR.id}})
    //set the agent to the author of the QR todo ?should this be to a 'Device' representing the forms receiver
    provenance.agent.push({who:QR.author})

    //now we can match the answers to the questions. Iterate over the hash from Q that has possible extracts and look for a matching QR
    if (debug) {console.log('hashQ',hashQ)}
    Object.keys(hashQ).forEach(function (key){
        let QItem = hashQ[key]  //the Q item that this QR item is an answer to
        //is there a QR item with a matching linkId?
        //console.log(key)
        if (hashQR[key]) {
            // yes there is. Create an observation for each answer.
            let QRItem = hashQR[key]    //the item from the QR
            if (QRItem.answer){
                QRItem.answer.forEach(function (theAnswer) {  //there can be multiple answers for an item
                //theAnswer is a single answer value...
                let observation = {resourceType: 'Observation'}

                //the subject might be a reference to a contained PR resource...
                if (QR.author && QR.author.reference && QR.author.reference.substring(0, 1) == '#') {
                    observation.contained = QR.contained
                }

                observation.id = createId() // createUUID()
                observation.text = {status: 'generated'}
                let text = ""
                observation.status = "final"
                observation.effectiveDateTime = QR.authored
                observation.subject = QR.subject

                observation.performer = [QR.author]
                //the code comes from the Q
                //The Q.code is an array of coding. Add them all to Observation.code as per the IG
                let oCode = {coding: []}
                if (QItem.code) {
                    QItem.code.forEach(function (coding) {
                        oCode.coding.push(coding)
                        if (oCode.display) {
                            text += oCode.display + ": "
                        }

                    })
                }

                observation.code = oCode
                //observation.derivedFrom = [{reference:"urn:uuid:" + QR.id}]
                observation.derivedFrom = [{reference: "QuestionnaireResponse/" + QR.id}]


                //console.log(theAnswer)
                //todo - the dtatypes for Observation and Questionnaire aren't the same!
                if (theAnswer.valueDecimal) {
                    //if a decimal, then look for the unit extension to create a Quantity
                    let ar = findExtension(QItem, unitsUrl)
                    if (ar.length > 0) {
                        let coding = ar[0].valueCoding
                        //Can create a Quantity. should only be 1 really...
                        let qty = {value: theAnswer.valueDecimal, system: coding.system, code: coding.code}
                        observation.valueQuantity = qty
                        text += theAnswer.valueDecimal + " " + coding.display
                    } else {
                        //not sure what to do if there's no extension. Is that a QA that should be applied to the Q? ie that decimal must have the extension?
                    }
                }

                if (theAnswer.valueString) {
                    observation.valueString = theAnswer.valueString
                    text += theAnswer.valueString
                }

                if (theAnswer.valueCoding) {
                    observation.valueCodeableConcept = {coding: [theAnswer.valueCoding]}
                    text += theAnswer.valueCoding.code + " (" + theAnswer.valueCoding.system + ")"
                }

                observation.text.div = "<div xmlns='http://www.w3.org/1999/xhtml'>" + text + "</div>"

                arObservations.push(observation)
                //provenance.target = provenance.target || []

                //provenance.target.push({reference: "urn:uuid:"+ observation.id})
                provenance.target.push({reference: "Observation/" + observation.id})

            })
        }
        }
    })



    //now go through and pull out any items that use definition based
    Object.keys(hashQDefinition).forEach(function (key){
        let vo = hashQDefinition[key]   //{item: resourceType:}
        let resourceType = vo.resourceType
        let item = vo.item

        if (item.item){     //assume that any contents of the resource are child elements
            let resource = {resourceType:resourceType}
            resource.id = createId()  // createUUID()
            resource.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>Specimen from Pathology request form</div>",status:"additional"}
            resource.subject = QR.subject;      //todo - may need to figure out if the type *has* a subject
            let canBeAdded = false      //only add if there is at least one child element entry

            item.item.forEach(function (child){
                if (child.definition) {
                    let QRItem = hashQR[child.linkId]
                    if (QRItem && QRItem.answer) {
                        //there is an answer
                        canBeAdded = true
                        //assume this is a fhirpath expression - 2 level only - eg specimen.type
                        //todo - need a better algorithm here. For now, assume that any value is a top level element....
                        let ar = child.definition.split('.')
                        let elementName = ar[1]

                        //todo - support all the answer types that could be used...
                        //todo - think about multiple answers...
                        if (QRItem.answer[0].valueCoding) {
                            //assume a codeableconcept
                            resource[elementName] = {coding:[QRItem.answer[0].valueCoding]}
                        }

                    }



                }
            })
            if (canBeAdded) {
                arObservations.push(resource)
                provenance.target = provenance.target || []
                //provenance.target.push({reference: "urn:uuid:"+ resource.id})
                provenance.target.push({reference: resource.resourceType +  "/"+ resource.id})
            }

        }

    })

    arObservations.push(provenance)

    return {'obs':arObservations,provenance:provenance,QHash:hashQ,QRHash:hashQR};

}


function createTask (QR,SR) {
    let task = {resourceType:"Task"}
    task.id = createId() // createUUID()   //will be ignored by fhir server
    let description = "Task"
    task.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>"+description+"</div>",status:"additional"}
    task.authoredOn = new Date().toISOString()
    task.status = "requested"
    task.intent = 'plan'
    task.basedOn = []
    //task.basedOn.push({reference: "urn:uuid:"+QR.id})
    //task.focus = {reference: "urn:uuid:"+SR.id}
    task.basedOn.push({reference: "QuestionnaireResponse/"+QR.id})
    task.focus = {reference: "ServiceRequest/"+SR.id}
    return task


}

//create a ServiceRequest resource. For now, just do it - eventually may get info from the QR
function createServiceRequest(QR,category,carePlan,description,Q) {
    let sr = {resourceType:"ServiceRequest"}
    sr.id = createId() // createUUID()   //will be ignored by fhir server
    //the subject might be a reference to a contained PR resource...
    if (QR.author && QR.author.reference && QR.author.reference.substring(0,1)== '#') {
        sr.contained = QR.contained
    }

    sr.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>"+description+"</div>",status:"additional"}
    sr.status = "active"
    sr.intent = "order"
    sr.authoredOn = new Date().toISOString()
    sr.subject = QR.subject;
    sr.requester = QR.author
    sr.category = [category]

    //add the Q title so can show in disposer.
    sr.reasonCode = [{text:Q.title}]

    //sr.category = [{coding:[{code:"108252007",system:"http://snomed.info/sct"}],  text:"Pathology request"}]
    sr.supportingInfo = []
    sr.supportingInfo.push({reference: "QuestionnaireResponse/"+QR.id})
    //sr.supportingInfo.push({reference: "urn:uuid:"+QR.id})

    sr.supportingInfo.push({reference: "Questionnaire/"+Q.id,display: Q.url})

    //if there's a careplan \ then add the SR as an activity, and a reference from SR -> CP
    if (carePlan) {
        carePlan.activity = carePlan.activity || []
        let activity = {}
        //activity.reference = {reference : "urn:uuid:"+ sr.id}
        activity.reference = {reference : "ServiceRequest/"+ sr.id}
        carePlan.activity =  carePlan.activity || []
        carePlan.activity.push(activity)
        //a reference from SR back to the CP
        //sr.basedOn = [{reference : "urn:uuid:"+ carePlan.id}]
        sr.basedOn = [{reference : "CarePlan/"+ carePlan.id}]
    }
/*
    //?? not actually using this ATM
    if (arExtractedResources) {
        arExtractedResources.forEach(function (resource){
            //sr.supportingInfo.push({reference: resource.resourceType +  "/"+resource.id})
            sr.supportingInfo.push({reference: "urn:uuid:"+resource.id})
        })
    }
*/
    return sr
}

/*
function createCarePlan(QR) {
    //what about the Condition it addresses?
    let cpTreat = {resourceType: "CarePlan", id: createUUID()}
    cpTreat.status = "active"
    cpTreat.intent = "plan"
    cpTreat.period = {start:"2022-01-01",end:"2023-01-01"}
    cpTreat.category = [globals.treatmentCPCategory] // {text: "Treatment level plan"}
    cpTreat.title = "The top level plan describing treatment for this condition"
    cpTreat.subject = QR.subject
    cpTreat.supportingInfo = []
    cpTreat.supportingInfo.push({reference: "urn:uuid:"+QR.id})

    return cpTreat
}

*/

//find all extensions in this item with the given url. Return an array of extensions...
function findExtension(item,url) {
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

}

function makeOO(text) {
    let oo = {resourceType:"OperationOutcome",issue:[]}
    let iss = {severity:"error",code:"invalid",diagnostics:text}
    oo.issue.push(iss)
    return oo
}

module.exports = {
    setup : setup,
    setDb : setDb
};