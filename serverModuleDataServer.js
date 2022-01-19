// data server API
const axios = require('axios').default;



function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires
/*
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

    */
/*
    //---------------- should there be a 'catch all' query??? ---------------
    //return all the patients (can add query params - like in patcorrect proxy...
    app.get('/ds/fhir/Patient',function(req,res){
        let url = serverRoot + "Patient"
        //console.log(url)
        axios.get(url)
            .then(function (response){
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                console.log(err)
                res.status(response.status).send(err)
            })
    })

    app.get('/ds/fhir/Practitioner',function(req,res){
        let url = serverRoot + "Practitioner"
        //console.log(url)
        axios.get(url)
            .then(function (response){
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                console.log(err)
                res.status(response.status).send(err)
            })
    })

    */

    app.get('/ds/fhir/:type',function(req,res){
        let url = serverRoot + req.params.type

        console.log(req.query)
        Object.keys(req.query).forEach(function(key,inx){
            let val = req.query[key]
            if (inx == 0) {
                url += "?" + key + "=" + val
            } else {
                url += "&" + key + "=" + val
            }
        })

        console.log(url)
        //console.log(url)
        axios.get(url)
            .then(function (response){
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })

}

module.exports = {
    setup : setup
};