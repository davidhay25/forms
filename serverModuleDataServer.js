// data server API
//
const axios = require('axios').default;
let prepopData = require("./prePopData.json")



function setup(app,serverRoot,systemConfig) {

    //copy the Q from the local server to the one in the config
    //This is called from the designer during the publish operation - it initiates the call
    app.put('/ds/publish/:id',async function(req,res) {

        try {
            //first retrieve the Q from the local server
            let url = serverRoot + "Questionnaire/"+ req.params.id
            let result = await axios.get(url)
            //console.log(result)
            let Q = result.data

            //now send it to the public server
            //this will go to a nodejs endpoint (not the hapi server - will firewall that off eventually)
            let publishQry = systemConfig.publicServer + "fm/fhir/Questionnaire"
            let config = {headers:{Authorization:'dhay'}}
            console.log(publishQry)
            let publishResult
            try {
                publishResult = await axios.post(publishQry,Q,config)
            } catch (ex) {
                if (ex.response) {
                    console.log(ex.response.data)
                    res.status (400).json(ex.response.data)
                    return
                } else {
                    console.log(ex.message)
                    res.status (500).json(ex.message)
                    return
                }
            }


            console.log("publishResult " ,publishResult)
            res.json(publishResult.data)

           // res.json(Q)
        } catch (ex) {
            console.log(ex.data)
            if (ex.response) {
                res.status (400).json(ex.response.data)
            } else {
                res.status (500).json(ex.message)
            }

        }





    })


    app.get('/ds/api/prepop',async function(req,res) {
        //get prepop data. currently fixed, but will enhance ? possible set by management app
        //based on linkId at present, as item codes not fully established
        res.json(prepopData)
    })

    app.get('/ds/api/proxyDEP',async function(req,res) {

        let url = req.query.url
        console.log(url)
        try {
            let results = await axios.get(url)      //get the first
            console.log(results.data)

            res.send(results.data)
        } catch (ex) {
            res.status(404).send("The url could not be loaded")
        }
    })

    //returns an uploaded document.
    app.get('/ds/api/document/:id',function(req,res){
        let id = req.params.id
        let url = `${serverRoot}DocumentReference/${id}`

        axios.get(url)
            .then(function (response){

                if (response.data) {
                    //must be a DocumentReference resource
                    let DocumentReference = response.data
                    //assume a single attachment containing the document
                    if (DocumentReference.content && DocumentReference.content.length > 0) {
                        let buff = Buffer.from(DocumentReference.content[0].attachment.data, 'base64')
                        let mimetype = DocumentReference.content[0].attachment.contentType
                        //res.setHeader("Content-Type", mimetype)
                        res.setHeader("Content-Type", "application/pdf")
                        res.status(200).send(buff)
                    } else {
                        res.status(500).send("No attachment")
                    }

                } else {
                    res.status(500).send()
                }

            })
            .catch(function (err){

                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send("Unknown error")
                }
            })
    })

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

/*
    app.delete('/ds/fhir/Questionnaire/:id',function(req,res){
        let url = serverRoot + "Questionnaire/" + req.params.id

        axios.delete(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                //todo - err.response only available when the server responded
                // err.request if the request was made
                // neither if there was an error making the request in the first place

                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }


              //  res.status(err.response.status).send(err.response.data)
            })
    })
*/
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
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
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
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
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
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
            })

    })

    app.put('/ds/fhir/:type/:id',function(req,res){
        let url = serverRoot + req.params.type + "/" + req.params.id
        let resource = req.body

        //console.log(resource.id)

        //uploading a file requires more than the default size...
        axios.put(url,resource,{maxBodyLength:Infinity,maxContentLength:Infinity})
            .then(function (response){
                //console.log('r',response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err)
                }
            })
    })


    //get history


    //get specific version
    app.get('/ds/fhir/:type/:id/:version',function(req,res){
        let url = serverRoot + req.params.type + "/" + req.params.id + "/_history/" + req.params.version
        console.log(url)
        axios.get(url)
            .then(function (response){
                //console.log(response.data)
                res.status(response.status).json(response.data)
            })
            .catch(function (err){
                //console.log(err)
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
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
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
            })
    })

    app.get('/ds/fhir/:type',async function(req,res){
        let url = serverRoot + req.params.type

        if (Object.keys(req.query).length ==0 &&  ! checkAuth(req)) {
            res.status(403).json()
            return
        }


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
                if (err.response) {
                    res.status(err.response.status).send(err.response.data)
                } else {
                    res.status(500).send(err.response.data)
                }
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