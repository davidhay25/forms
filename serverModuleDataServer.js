// data server API
const axios = require('axios').default;

function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires


    //custom service for the lab to submit the report
    //take a bundle containing DR, Obs & SR
    //set DR.basedOn to the SR
    //create an update bundle:
    //PUT SR, POST DR & Obs

    app.get('/ds/fhir/:type/:id',function(req,res){
        let url = serverRoot + req.params.type + "/" + req.params.id

        axios.get(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })

    app.get('/ds/fhir/:type',function(req,res){
        let url = serverRoot + req.params.type

        //console.log(req.query)
        Object.keys(req.query).forEach(function(key,inx){
            let val = req.query[key]
            if (inx == 0) {
                url += "?" + key + "=" + val
            } else {
                url += "&" + key + "=" + val
            }
        })

        console.log(req.query)

        axios.get(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })


    //this is to the root of the server - ie a transaction. The route must be the last of the POSRs!
    app.post('/ds/fhir',function(req,res){
        let url = serverRoot
        let bundle = req.body

        console.log(bundle)


        axios.post(url,bundle)
            .then(function (response){
                //console.log(response.data)
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