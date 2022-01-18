// data server API
const axios = require('axios').default;



function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //return all the QRs for a patient
    app.get('/ds/fhir/QuestionnaireResponse',function(req,res){
        console.log(req.query)
        if (req.query.patient) {
            let id = req.query.patient
            let url = serverRoot + "QuestionnaireResponse?patient=" + id
            axios.get(url)
                .then(function (response){
                    res.status(response.status).json(response.data)
                })
                .catch(function (err){
                    console.log(err)
                    res.status(response.status).send(err)
                })

        } else {
            res.status(300).send("must have patient parameter")
        }
        //let

    })

    //return all the patients (can add query params - like in patcorrect proxy...
    app.get('/ds/fhir/Patient',function(req,res){
        let url = serverRoot + "Patient"
        console.log(url)
        axios.get(url)
            .then(function (response){
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                console.log(err)
                res.status(response.status).send(err)
            })
    })
}

module.exports = {
    setup : setup
};