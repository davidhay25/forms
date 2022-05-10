// data server API
const axios = require('axios').default;

function setup(app,serverRoot) {

    //routes that are intended to be 'public' routes - ie that matches what the IG requires


    //custom service for the lab to submit the report
    //take a bundle containing DR, Obs & SR
    //set DR.basedOn to the SR
    //create an update bundle:
    //PUT SR, POST DR & Obs
    //app.post('/ds/fhir/Questionnaire/validate',function(req,res) {
    app.post('/ds/fhir/:type/validate',function(req,res) {

        let resource = req.body
        //let url = serverRoot + "Questionnaire/$validate"
        let url = serverRoot + req.params.type +"/$validate"
        axios.post(url,resource)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })

    })


    app.post('/ds/fhir/:type/',function(req,res){
        let url = serverRoot + req.params.type
        let resource = req.body


        axios.post(url,resource)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })

    app.put('/ds/fhir/:type/:id',function(req,res){
        let url = serverRoot + req.params.type + "/" + req.params.id
        let resource = req.body


        axios.put(url,resource)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })

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

    app.get('/ds/fhir/:type',async function(req,res){
        let url = serverRoot + req.params.type

        //console.log(req.query)
        let delimiter = '?'
        Object.keys(req.query).forEach(function(key,inx){
            let val = req.query[key]        //can be an array
            if (Array.isArray(val)) {
                val.forEach(function (v) {
                    url += delimiter + key + "=" + v
                    delimiter = "&"
                })
            } else {
                url += delimiter + key + "=" + val
                delimiter = "&"
            }

        })

        //console.log(req.query)
        //console.log(url)



        let results = await axios.get(url)      //get the first
        let bundle = results.data       //the first bundle

        let nextPageUrl = getNextPageUrl(bundle)
        //console.log('next ' + nextPageUrl)

        while (nextPageUrl) {
           try {
               results = await axios.get(nextPageUrl)
               let nextBundle = results.data

               //append the new bundles data to the first bundle
               if (nextBundle.entry) {
                   nextBundle.entry.forEach(function (entry){
                       bundle.entry.push(entry)
                   })
               }
               //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
               nextPageUrl = getNextPageUrl(nextBundle)
           } catch (ex) {
               //the hapi server paging seems to return an OO with status 500 at the end of the page set...
               //??? should check the result anyway?
               //console.log('error ' + ex.message)
               nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
           }
       }


        res.json(bundle)

/*
        axios.get(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
*/

    })

    function getNextPageUrl(bundle) {
        //console.log('gm' + bundle.resourceType)
        let url = null
        if (bundle && bundle.link) {
            bundle.link.forEach(function (link){
                if (link.relation == 'next') {
                    url = link.url
                }
            })
        }
        //console.log(url)
        return url

    }

    //this is to the root of the server - ie a transaction. The route must be the last of the POSRs!
    app.post('/ds/fhir',function(req,res){
        let url = serverRoot
        let bundle = req.body

        //console.log(bundle)


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