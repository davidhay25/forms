// forms manager API
const axios = require('axios').default;

function setup(app,serverRoot,systemConfig) {


    /* --------- endpoints for the 'copy to public server

    config.type is environment - 'design' or 'public'

    There is one endpoint specific to the design mode that accepts the Q, and POST's it to the public server.
        This is a custom endpoint (for now) so the meaning is clear

    There is also an endpoint hosted by the public server - it's a POST verb that:
        accepts the Q
        locate any existing Q with the Q.url
        If there are none, then create it, if 1 then replace it, if > 1 return an error

*/

    if (systemConfig.type == 'design') {
        //only the design server supports Q update by Id (PUT)
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

        //the publish endpoint used by the design server
        app.post('/fm/publish', function (req, res) {
            let Q = req.body

            res.status(404).json()  //just while I'm thinking about it
            return

            let url = serverRoot + "Questionnaire/" + Q.id
            //console.log(url)
            axios.put(url, Q)
                .then(function (response) {
                    res.status(response.status).json(response.data)
                })
                .catch(function (err) {
                    console.log(err.response.data)
                    res.status(400).send(err.response.data)
                })

        })
    }



    if (systemConfig.type == 'public') {

        //process a POST of a Q to the public server - used when publishing
        //has to be a post, as we can't assume that the id id the same between servers - we need to use
        //the canonical url
        app.post('/fm/fhir/Questionnaire', async function (req, res) {
            if (! checkAuth(req)) {
                res.status(403).json()
                return
            }

            let Q = req.body
            let url = Q.url
            let version = Q.version

            if (! Q || ! url || ! version) {
                res.status(400).send({msg:"Questionnaire must have url and version"})
            } else {
                console.log("Publishing " + url + " " + version)
                //need to check the number of Q on this server (the public server) with that url
                try {
                  //  if (url && version) {
                    let qry = `${serverRoot}Questionnaire?url=${url}&version=${version}`
                 //   let config
                    let results = await axios.get(qry)      //get the first
                    let bundle = results.data       //matching Q (based on url
                    let cnt = 0
                    if (bundle.entry) {
                        cnt = bundle.entry.length
                    }
                    switch (cnt) {
                        case 0:
                            //No existing Q - POST the Q to the local (public) server

                            let url = `${serverRoot}Questionnaire`
                            console.log(`New Q: ${url} ${version}`)

                            console.log(url)
                            let results = await axios.post(url,Q)      //get the first
                            res.json(results.data)
                            break
                        case 1:
                            //1 existing - PUT to the id on the local (public) server
                           // console.log(`Update Q: ${url} ${version}`)
                            let currentQ = bundle.entry[0].resource     //the current Q on the server
                            let putUrl = `${serverRoot}Questionnaire/${currentQ.id}`
                            console.log(putUrl)
                            let response
                            try {
                                response = await axios.put(putUrl,Q)      //get the first
                            } catch (ex) {
                                //this is directly to the hapiu sever
                                if (ex.response) {
                                    res.status(500).json(ex.response.data)
                                    return
                                } else {
                                    res.status(500).json(ex)
                                    return
                                }
                            }

                            res.json(response.data)
                            break
                        default :
                            //must be > 1 - error
                            console.log(`Multiple Q with ${url} ${version}`)
                            res.status(500).json({msg: "There were multiple Q with this Url & version"})
                            break

                    }

/*
                    } else {
                        res.status(400).json({msg: "Url or version missing"})

                    }
                    */

                } catch (e) {
                    console.log(e)
                    res.status(500).json(e)
                }
            }




        })

    }

    //return all the questionnaires - or search by url
    //todo not sure if this is used...
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

//check that the call is authorized. very basic ATM!
function checkAuth(req) {
    if (req.headers.authorization == 'dhay') {
        return true
    }

}

module.exports = {
    setup : setup
};