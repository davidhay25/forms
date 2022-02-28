//Forms receiver module. Receives a QR and processes it
//hapi server in ~/hapi-forms on dev machine
const axios = require('axios').default;
let serverRoot

function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function setup(app,sr) {
    serverRoot = sr
    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //Receive a QR resource. Process and save.
    app.post('/fr/fhir/receiveQR',async function(req,res){

        let QR = req.body
        QR.id = createUUID();
        try {
            let result = await extractResources(QR)
            let arResources = result.obs     //An array of created observations todo - and others, rename

            //need to add other resources to provenance
            //let provenance = resources.provenance

            //construct transaction bundle
            let bundle = {resourceType:"Bundle",type:'transaction',entry:[]}
            bundle.entry.push(createEntry(QR))

            arResources.forEach(function (observation){
                bundle.entry.push(createEntry(observation))
            })

            axios.post('http://localhost:9099/baseR4/', bundle)
                .then(function (response) {
                    //console.log(response);
                    res.status(response.status).json(response.data)
                })
                .catch(function (error) {
                    //console.log(error);
                    res.status(error.response.status).json(error.response.data)

                });

        } catch (ex) {
            res.status(500).json(ex.message)
        }

        function createEntry(resource) {
            //assume that these are all POST with uuid as id...
            let entry = {}

            entry.resource = resource
            entry.request = {method:'POST',url:resource.resourceType}
            return entry
        }

    })


    //peform the extraction from an FSH. Used for testing and display in the EHR
    app.post('/fr/testextract',async function(req,res){
        try {
            let resources = await extractResources(req.body)

            res.json(resources)
        } catch (ex) {
            res.status(500).json(ex.message)
        }
    })
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
        let Q = bundle.entry[0].resource    //todo - assume only 1

        //retrieve Observations
        let resources = performObservationExtraction(Q,QR)

        // now create other resources
        let provenance = resources.provenance

        //the service request - always added ATM
        let sr =  createServiceRequest(QR)      //todo refactor names of vo returned
        provenance.target.push({reference: "urn:uuid:"+ sr.id})
        resources.obs.push(sr)          //not really all obs...
        //resources.others = []       //all resources



        return resources


    } else {
        return makeOO("There needs to be a single Q with the url:" )
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

    //QR.id = createUUID()    //needed so provenance works

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

    Q.item.forEach(function(topLevel){
        parseQ(hashQ,topLevel)
    })


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

    QR.item.forEach(function(topLevel){
        parseQR(hashQR,topLevel)
    })

    //parseQR(hashQR,QR.item[0])

    //the provenance resource for this action
    let provenance = {resourceType:"Provenance"}
    provenance.id = createUUID()   //will be ignored by fhir server
    provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Resources extracted from QR</div>"}
    provenance.recorded = new Date().toISOString()
    provenance.entity = []
    provenance.agent = []

    provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})

    //set the agent to the author of the QR todo ?should this be to a 'Device' representing the forms receiver
    provenance.agent.push({who:QR.author})

    //now we can match the answers to the questions. Iterate over the hash from Q that has possible extracts and look for a matching QR
    Object.keys(hashQ).forEach(function (key){
        let QItem = hashQ[key]  //the Q item that this QR item is an answer to
        //is there a QR item with a matching linkId?
        //console.log(key)
        if (hashQR[key]) {
            // yes there is. Create an observation for each answer.
            let QRItem = hashQR[key]    //the item from the QR

            QRItem.answer.forEach(function (theAnswer){  //there can be multiple answers for an item
                //theAnswer is a single answer value...
                let observation = {resourceType:'Observation'}
                observation.id = createUUID()
                observation.text = {status:'generated'}
                let text = ""
                observation.status = "final"
                observation.effectiveDateTime = QR.authored
                observation.subject = QR.subject
                observation.performer = [QR.author]
                //the code comes from the Q
                //The Q.code is an array of coding. Add them all to Observation.code as per the IG
                let oCode = {coding:[]}
                if (QItem.code) {
                    QItem.code.forEach(function (coding){
                        oCode.coding.push(coding)
                        text += oCode.display + " "
                    })
                }

                observation.code = oCode

                observation.derivedFrom = [{reference:"urn:uuid:" + QR.id}]
                //console.log(theAnswer)
                //todo - the dtatypes for Observation and Questionnaire aren't the same!
                if (theAnswer.valueDecimal) {
                    //if a decimal, then look for the unit extension to create a Quantity
                    let ar = findExtension(QItem,unitsUrl)
                    if (ar.length > 0) {
                        let coding = ar[0].valueCoding
                        //Can create a Quantity. should only be 1 really...
                        let qty = {value:theAnswer.valueDecimal,system:coding.system,code:coding.code}
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
                    observation.valueCodeableConcept = {coding:[theAnswer.valueCoding]}
                    text += theAnswer.valueCoding.code + " (" + theAnswer.valueCoding.system + ")"
                }

                observation.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>" + text + "</div>"

                arObservations.push(observation)
                provenance.target = provenance.target || []

                provenance.target.push({reference: "urn:uuid:"+ observation.id})

            })
        }
    })



    //now go through and pull out any items that use definition based
    Object.keys(hashQDefinition).forEach(function (key){
        let vo = hashQDefinition[key]   //{item: resourceType:}
        let resourceType = vo.resourceType
        let item = vo.item

        if (item.item){     //assume that any contents of the resource are child elements
            let resource = {resourceType:resourceType}
            resource.id = createUUID()
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
                provenance.target.push({reference: "urn:uuid:"+ resource.id})
            }

        }

    })

    arObservations.push(provenance)

    return {'obs':arObservations,provenance:provenance,QHash:hashQ,QRHash:hashQR};

}

//create a ServiceRequest resource. For now, just do it - eventually may get info from the QR
function createServiceRequest(QR,arExtractedResources) {
    let sr = {resourceType:"ServiceRequest"}
    sr.id = createUUID()   //will be ignored by fhir server
    sr.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>Pathology request form</div>",status:"additional"}
    sr.status = "active"
    sr.intent = "order"
    sr.subject = QR.subject;
    sr.category = [{coding:[{code:"108252007",system:"http://snomed.info/sct"}],  text:"Pathology request"}]
    sr.supportingInfo = []
    sr.supportingInfo.push({reference: "QuestionnaireResponse/"+QR.id})
    if (arExtractedResources) {
        arExtractedResources.forEach(function (resource){
            sr.supportingInfo.push({reference: resource.resourceType +  "/"+resource.id})
        })
    }
    return sr
}

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
    setup : setup
};