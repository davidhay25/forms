/*
* Backup module. Strategy is that periodically all resources cretaed since the previous backup
* are copied from the source server (this one) to the backup (target) server - which is a hot backup, and contains
* a copy of the app that can be immediately used if there is an outage.
*
* Using _history, new resources (since the last backup) are loaded in pages, which are appended to a transaction bundle
* and posted to the backup server. If there is an error, then the backup will fail, an error is m=placed in the log
* and the system will retry on the next cycle
*
* The error flag is checked whenever the user app (currently the designer) is invoked, and the user
* notified if there is an error. They can then notify the admin. This is to avoid needing to set up and
* maintain some sort of on-going notification process. However, it is planned to introduce email notification at some point.
* The log is also available in the admin console, which can be manually checked any time
*
* Only the most recent version of a resource is saved, and the version number is not persisted on the target server
* (though the id is).
*
* Resources with a numeric id are not backed up (the hapi server won't allow a PUT operation using a numeric id)
*
* The backup server is configured not to check for referential integrity (references to resources not on the server) though
* that shouldn't happen
*
* */


const axios = require("axios");
let sourceServer // passed in during setup. Defaults to  "http://localhost:9099/baseR4/"

//where backups are posted
let targetServer = "http://138.68.26.195:9999/baseR4/"

//in dev mode, the target server is set on the environment
let svr = process.env.targetServer
if (svr) {
    targetServer = svr
}
console.log('Target server set to ' + targetServer)








let db

let backupInterval =  60 * 60 * 1000      //1 hour - add to config in mongo


//the routine that executes the backup. either from the scheduler (setInterval below) or the 'doit' rest calll
async function doBackup(cb) {
    let collection = db.collection('backupLog')   //the mongo collection with the log entries
    let issues = []         //issues during processing that won't interfere with the backup - eg a numeric id on a resource

    //retrieve the previous backup run
    const cursor = collection.find({}).sort({ time: -1 }).limit(1);
    const allValues = await cursor.toArray();

    //If there's an eror with the run, then the lastSuccessfulRun is copied into the 'failure' logentry so it is always the place to start from
    let lastSuccessfulRun = new Date(2000,1,1).toISOString()  //default start
    if (allValues.length > 0) {
        let logEntry = allValues[0]
        lastSuccessfulRun = logEntry.lastSuccessfulRun
    }


    let time = new Date().toISOString()  //will become the lastSuccessfulRun - all going well

    let hashAllEntries = {} //a hash keyed on resource id - the resourceid cannot be dupliacted in the transaction

    let url = sourceServer + "_history?_since=" + lastSuccessfulRun + "&_count=50"

    let results

    try {
        results = await axios.get(url)      //get the first page
    } catch (ex)  {
        //oops - there was an error contacting the local server. If it's down then tha whole system is down, just stop the backup
        console.log('error getting data')
        if (cb) {
            cb(ex)
        }
        return
    }

    let bundle = results.data       //the first bundle

    //update the hashAllEntries. Most recent resources incldued.
    processBundle(hashAllEntries,bundle,issues)

    let nextPageUrl = getNextPageUrl(bundle)

    while (nextPageUrl) {
        try {
            results = await axios.get(nextPageUrl)
            let nextBundle = results.data
            //update the hash of resources...
            processBundle(hashAllEntries,nextBundle,issues)
            //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
            nextPageUrl = getNextPageUrl(nextBundle)
        } catch (ex) {
            //the hapi server paging seems to return an OO with status 500 at the end of the page set...
            //console.log(ex)
            nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
        }
    }


    //now the hash of resources can be converted into the transaction bundle
    let logEntry = {time:time,status:"",count:0,msg:"",details:"",item:[]}
    let transactionBundle = {resourceType:'Bundle',type:'transaction',entry:[]}

    //update both transaction bundle and log entry
    makeTransactionBundle(hashAllEntries,transactionBundle,logEntry)

    //update the log
    logEntry.count = logEntry.item.length
    logEntry.issues = issues

    let updateQry = `${targetServer}`   //POST to the target server root

    try {
        let result = await axios.post(updateQry,transactionBundle,{maxBodyLength:Infinity,maxContentLength:Infinity})  //send the bundle.
        //console.log('axios status',result.status)
        //console.log('axios response',result.data)
        if (result.status !== 200) {
            //there was an error processing the bundle on the target server
            //actually, axios will throw an exception which is trapped below - this block may not get executed
            logEntry.status = 'fail'
            logEntry.msg = result.data      //should be an OO describing the error
            logEntry.lastSuccessfulRun = lastSuccessfulRun     //need to set the time to the last successful run...

        } else {
            //all good!
            logEntry.status = 'success'
            logEntry.lastSuccessfulRun = time        //set the time the backup run was performed

        }

        const dbresult = await collection.insertOne(logEntry);

        //the 'doit' call defines a callback so it can return...
        if (cb) {
            cb(logEntry)
        }

    } catch (ex) {
        //the update failed. This includes a failure from the FHIR server. create a failure logEntry

        logEntry.status = 'fail'
        logEntry.msg = ex.message   //from axios - saying it failed
        if (ex.response) {
            logEntry.details = ex.response.data     //from the target sever - an operation outcome
        }

        logEntry.lastSuccessfulRun = lastSuccessfulRun     //need to set the time to the last successful run...

        const dbresult = await collection.insertOne(logEntry);

        if (cb) {
            cb(logEntry)
        }
    }
}


//schedule the backup runs
setInterval(doBackup,backupInterval)


//create the hash of resources to backup. Only the most recent version is included
function processBundle(hash,bundle,issues) {
    console.log('processing bundle...')
    if (bundle.entry) {
        console.log('bundle count:',bundle.entry.length)
        bundle.entry.forEach(function (entry) {
            if ( entry.resource) {  //delete has no resource

                let id = entry.resource.id

                //need to test for a numeric id - these can't be backed up.
                if (!parseInt(entry.resource.id)) {
                    if (hash[id]) {
                        //there is already an entry with this id. We want the most recent (we can assume the versions are incrementing numbers)
                        //check the versions. If there is an exception then just replace
                        try {
                            let currentVersion = hash[id].meta.versionId
                            let newVersion = entry.resource.meta.versionId
                            if (newVersion > currentVersion) {
                                hash[id] = entry.resource
                            }
                        } catch (ex) {
                            hash[id] = entry.resource
                        }
                    } else {
                        hash[id] = entry.resource
                    }
                } else {
                    issues.push({
                        msg: "Id is a number, not saved",
                        display: entry.resource.resourceType + "/" + entry.resource.id
                    })
                }


                /*
                            let tEntry = {resource:entry.resource}


                            //need to test for a numeric id - these can't be backed up.

                            if ( !parseInt(entry.resource.id)) {
                                //is Nan (which is what we want
                                tEntry.request = {method:'PUT',url:entry.resource.resourceType + "/" + entry.resource.id}
                                transactionBundle.entry.push(tEntry)

                                let le = {type:entry.resource.resourceType,id:entry.resource.id}
                                if (entry.resource.meta) {
                                    le.version = entry.resource.meta.versionId
                                }
                                logEntry.item.push(le)
                            } else {
                                issues.push({msg:"Id is a number, not saved",display:entry.resource.resourceType + "/" + entry.resource.id})
                            }

                            */
            } else {
                issues.push(entry)
            }

        })
    }
}


function makeTransactionBundle(hashAllEntries,transactionBundle,logEntry) {
    //let transactionBundle = {resourceType:'Bundle',type:'transaction',entry:[]}
    Object.keys(hashAllEntries).forEach(function (key) {
        let resource = hashAllEntries[key]
        let id = resource.id
        let entry = {resource:resource}
        entry.request = {method:'PUT',url:resource.resourceType + "/" + resource.id}
        transactionBundle.entry.push(entry)

        //make the log entry. Note that only the most recent resource in the source bundles will be saved...
        let le = {type:resource.resourceType,id:resource.id}
        if (resource.meta) {
            le.version = resource.meta.versionId
        }
        logEntry.item.push(le)
    })
}


//retrieve the url for the next page from the bundle
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


//set the database, source server and backup API points
function setup(app,inSourceServer,inDb) {
    sourceServer = inSourceServer
    db = inDb

    //check the status of the backup. This will be that status of the last time the backup executed
    app.get('/backup/status', async function(req,res){
        let collection = db.collection('backupLog')

        //last log entry
        const cursor = collection.find({}).sort({ time: -1 }).limit(1);
        const allValues = await cursor.toArray();
        if (allValues.length == 1) {
            let logEntry = allValues[0]
            if (logEntry.status == 'fail') {
                res.send({fail:true,msg:'Last backup failed',serverTime:new Date().toISOString(),logEntry})
            } else {
                res.send({fail:false, msg:'Backups OK',serverTime:new Date().toISOString(),logEntry})
            }

        } else {
            res.send({msg:'No log entries found'})
        }
    })

    //current log of activity
    app.get('/backup/log', async function(req,res){
        let collection = db.collection('backupLog')
        let filter = {}

        if (req.query.filter == 'gt0') {
            filter = {count:{$gt:0}}
        }

        //last 20 log entries
        const cursor = collection.find(filter).sort({ time: -1 }).limit(20);
        const allValues = await cursor.toArray();
        res.json({log:allValues,serverTime:new Date().toISOString()})
    })

    //instructs an immediate backup to be performed
    app.post('/backup/doit', function(req,res){
        doBackup(function(log){
            res.json(log)
        })
    })

    //return the current configuration.
    app.get('/backup/config', async function(req,res){
        let config = {backup:{}}
        config.backup.targetServer = targetServer
        config.backup.interval = backupInterval
        res.json(config)

    })
}

module.exports = {
    setup : setup
};