// forms manager API
const axios = require('axios').default;
const fs = require('fs')

//a folder that, if it exists, will have a copy of the Q when they are checked in, out or reverted
const backupFolder = "/tmp/cs-backups"

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
        //note that there are actually 2 endpoints responding to this, one in the design & another in public
        //the only difference is that the one on the public site requires authorization
        //called when a Q is checked out (to set the checkout indicator) and when it is checked in...
        app.put('/fm/fhir/Questionnaire/:id',function(req,res){

            let Q = req.body
            let url = serverRoot + "Questionnaire/" + Q.id
            //console.log(url)
            console.log(`Saving ${Q.id}`)
            axios.put(url,Q)
                .then(function (response){

                    //this code saves the Q as a file on the design server (updated as the Q is updated)
                    //this is another backup - and there is a separate process that will save that to a git repo

                    if (fs.existsSync(backupFolder)) {
                        let fileName = `${backupFolder}/${Q.resourceType}-${Q.id}.json`
                        fs.writeFileSync(fileName,JSON.stringify(Q))
                    } else {
                        console.log(`folder ${backupFolder} does not exist, so the Q was not saved in it.`);
                    }



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

        //THIS HAS CHANGED. We now do assume that the id of the questionnaire is the same on both
        //design and public servers - set when the Q is created in design. So the public server accepts
        //a PUT to the location of the Q - though must be authorized

        //todo - why should the public site need to PUT a Q????

        //this endpoint (exposed only by the public server) required authentication.
        // Functionally it's otherwise the same as the one exposed by the design site
        app.put('/fm/fhir/Questionnaire/:id',function(req,res){

            if (! checkAuth(req)) {
                res.status(403).json()
                return
            }

            let Q = req.body
            let url = serverRoot + "Questionnaire/" + Q.id
            console.log('#' + url + "#")
            console.log('#' + url + "#")

            axios.put(url,Q)
                .then(function (response){
                    console.log(response.status)
                    res.status(response.status).json(response.data)
                })
                .catch(function (err){
                    console.log(err.response.data)
                    res.status(400).send(err.response.data)
                })

        })

/*

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

                            let results
                            try {
                                results = await axios.post(url,Q)      //get the first
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

                            //let results = await axios.post(url,Q)      //get the first
                            res.json(results.data)
                            break
                        case 1:
                            //1 existing - PUT to the id on the local (public) server

                           // console.log(`Update Q: ${url} ${version}`)
                            let currentQ = bundle.entry[0].resource     //the current Q on the server
                            Q.id = currentQ.id      //the id needs to be the one on the target server
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



                } catch (e) {
                    console.log(e)
                    res.status(500).json(e)
                }
            }




        })

        */

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