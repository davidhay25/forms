// forms manager API
const axios = require('axios').default;

function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    app.put('/fm/fhir/Questionnaire/:id',function(req,res){
        let Q = req.body
        let url = serverRoot + "Questionnaire/" + Q.id
        //console.log(url)
        axios.put(url,Q)
            .then(function (response){
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                console.log(err.response.data)
                res.status(400).send(err.response.data)
            })

    })


    //return all the questionnaires - or search by url
    app.get('/fm/fhir/Questionnaire',function(req,res){
        let url = serverRoot + "Questionnaire"

        if (req.query.url) {
            url += "?url=" + req.query.url
        } else if (req.query.name) {
            url += "?name=" + req.query.name
        }

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