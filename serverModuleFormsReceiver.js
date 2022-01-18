//Forms receiver module. Receives a QR and processes it

const axios = require('axios').default;
let serverRoot

function setup(app,sr) {
    serverRoot = sr
    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //Receive a QR resource. Process and save.
    app.post('/fr/fhir/QuestionnaireResponse',function(req,res){

        let Q = reg.body;
        res.json()

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
            //console.log('ar',ar)
            if (ar.length > 0) {
                //in this case the extension is a boolean. Assume only 1
                if (ar[0].valueBoolean) {
                    //todo - ?need to check that there is a code
                    hashQ[item.linkId] = item
                }
            }
        }
    }
    parseQ(hashQ,Q.item[0])

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
                let observation = {resourceType:'Observation'}
                observation.code = QItem.code   //the code comes from the Q

                console.log(theAnswer)
                //todo - the dtatypes for Observation and Questionnaire aren't the same!
                if (theAnswer.valueDecimal) {
                    //if a decimal, then look for the unit extension to create a Quantity
                    let ar = findExtension(QItem,unitsUrl)
                    console.log(ar)
                    if (ar.length > 0) {
                        let coding = ar[0].valueCoding
                        //Can create a Quantity. should only be 1 really...
                        let qty = {value:theAnswer.valueDecimal,system:coding.system,code:coding.code}
                        observation.valueQuantiy = qty
                    } else {
                        //not sure what to do if there's no extension. Is that a QA that should be applied to the Q? ie that decimal must have the extension?
                    }

                }

                if (theAnswer.answerString) {
                    observation.valueString = theAnswer.answerString
                }

                if (theAnswer.answerQuantity) {
                    observation.valueQuantiy = theAnswer.answerQuantity
                }



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