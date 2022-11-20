

//not used
const axios = require('axios').default;
const fs = require('fs')



function setup(app,inSourceServer,systemConfig) {
    sourceServer = inSourceServer       //the rool url of the FHIR server

    console.log('SS setup')



    //Generate the status site
    app.post('/staticsite', async function(req,res){
        if (checkAuth(req)) {
            res.send('ok')

            //




        } else {
            res.status(403).send()
        }
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
