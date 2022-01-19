//Forms receiver module. Receives a QR and processes it

const axios = require('axios').default;
let serverRoot

function setup(app,sr) {
    serverRoot = sr
    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //Receive a QR resource. Process and save.
    app.post('/fr/fhir/receiveQR',async function(req,res){

        let QR = req.body
        try {
            let resources = await extractResources(QR)
            let arObservations = resources.obs     //An array of created observations

            //construct transaction bundle
            let bundle = {resourceType:"Bundle",type:'transaction',entry:[]}
            bundle.entry.push(createEntry(QR))
            arObservations.forEach(function (observation){
                bundle.entry.push(createEntry(observation))
            })

            axios.post('http://localhost:9099/baseR4/', bundle)
                .then(function (response) {
                    //console.log(response);
                    res.status(response.status).json(response.data)
                })
                .catch(function (error) {
                    console.log(error);
                    res.status(error.response.status).json(error.response.data)



                });



        } catch (ex) {
            res.status(500).json(ex.message)
        }

        function createEntry(resource) {
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
            //console.log('y',resources)
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
    let url = serverRoot + "Questionnaire?url=" + qUrl // + "&status=active"

    let response = await axios.get(url)
    let bundle = response.data

    if (bundle.entry && bundle.entry.length == 1) {
        let Q = bundle.entry[0].resource
        //perform processing
        let resources = performObservationExtraction(Q,QR)
        return resources


    } else {
        return makeOO("There needs to be a single Q with the url:" )
    }

}

function performObservationExtraction(Q,QR) {
    const extractObsUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
    const unitsUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
    arObservations = []     //the extracted observations

    //iterate over the Q to create a hash (by linkId) of items with the Observation extraction set
    let hashQ = {}      //hash of items that have the Observation extract extension set
    let hashQR = {}     //hash of items in QR qith an answer

    function parseQ(hashQ,item) {
        if (item.item) {
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
        //parseQ(hashQ,Q.item[0])
        parseQ(hashQ,topLevel)
    })


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
    parseQR(hashQR,QR.item[0])

    //now we can match the answers to the questions. Iterate over the hash from Q that has possible extracts
    Object.keys(hashQ).forEach(function (key){
        let QItem = hashQ[key]  //the Q item that this QR item is an answer to
        //is there a QR item with a matching linkId?
        if (hashQR[key]) {
            // yes there is. Create an observation for each answer.
            let QRItem = hashQR[key]    //the item from the QR
            //console.log('a',QRItem,QItem)
            QRItem.answer.forEach(function (theAnswer){  //there can be multiple answers for an item
                //theAnswer is a single answer value...
                let observation = {resourceType:'Observation'}
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
                observation.derivedFrom = [{reference:"QuestionnaireResponse/" + QR.id}]

                //console.log(theAnswer)
                //todo - the dtatypes for Observation and Questionnaire aren't the same!
                if (theAnswer.valueDecimal) {
                    //if a decimal, then look for the unit extension to create a Quantity
                    let ar = findExtension(QItem,unitsUrl)
                    //console.log(ar)
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
/*
                if (theAnswer.answerQuantity) {
                    observation.valueQuantity = theAnswer.answerQuantity
                }
*/
                if (theAnswer.valueCoding) {
                    observation.valueCodeableConcept = {coding:[theAnswer.valueCoding]}
                    text += theAnswer.valueCoding.code + " (" + theAnswer.valueCoding.system + ")"
                }

                observation.text.div="<div xmlns='http://www.w3.org/1999/xhtml'> + text + </div>"

                arObservations.push(observation)

            })
        }
    })



    //console.log('hash',hashQ)
    return {'obs':arObservations,QHash:hashQ,QRHash:hashQR};

    //return {resourceType:"Observation"}
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