// data server API
const axios = require('axios').default;

function setup(app,serverRoot) {
    
    app.post('/ds/removeqtag/:qid',async function(req,res){
        //delete a questionnaire tag
        let tag = req.body
        if (tag) {
            //console.log(tag)

            let params = {resourceType: "Parameters",parameter:[]}
            let param = {name:'meta'}
            param.valueMeta = {tag:tag}
            params.parameter.push(param)

            //console.log("param %j",params)
            let url = serverRoot + "Questionnaire/" + req.params.qid + "/$meta-delete"
            try {
                let results = await axios.post(url,params)      //get the first
                res.json()
            } catch (ex) {
                console.log(ex)
                res.status(500).json({err:ex})
            }

        } else {
            res.status(400).json({msg:'Tag missing'})
        }
    })

    app.delete('/ds/fhir/Questionnaire/:id',function(req,res){
        let url = serverRoot + "Questionnaire/" + req.params.id

        axios.delete(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                res.status(err.response.status).send(err.response.data)
            })
    })

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

    app.get('/ds/fhir/ValueSet/\[$]expand',function(req,res){
//console.log(req.query)
        let url = serverRoot + "ValueSet/$expand?url=" + req.query.url

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
console.log(url)
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

        if (Object.keys(req.query).length ==0 &&  ! checkAuth(req)) {
            res.status(403).json()
            return
        }

/*
        //resources that anyone can access without auth
        let allowedResources = ['Questionnaire','ServiceRequest']

        //Anyone can get all the Questionnaires...
        //if (req.params.type !== 'Questionnaire' &&  ! checkAuth(req)) {
        if ( allowedResources.indexOf(req.params.type) == -1  &&  ! checkAuth(req)) {
            res.status(403).json()
            return
        }
*/
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

        delete bundle.link       //this is the link from the first query


        res.json(bundle)



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


//check that the call is authorized. very basic ATM!
function checkAuth(req) {
    if (req.headers.authorization == 'dhay') {
        return true
    }

}

module.exports = {
    setup : setup
};