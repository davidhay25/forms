// forms manager API
const axios = require('axios').default;

function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires

    //return all the questionnaires
    app.get('/fm/fhir/Questionnaire',function(req,res){
        let url = serverRoot + "Questionnaire"

        if (req.query.url) {
            url += "?url=" + req.query.url
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