/*
* Backup module. Strategy is that periodically all resources cretaed since the previous backup
* are copied from the source server (this one) to the backup server - which is a hot backup, and contains
* a copy of the app that can be immediately used if there is an outage.
*
* Using _history, new resources (since the last backup) are loaded in batches, which are appended to a transaction bundle
* and posted to the backup server. If there is an error, then a flag is set in the mongodb database that
* stores the backup log, and further backups are disabled.
*
* ??? could we not simply try again next time - if the cause of the previous failure has resolved, then it should succeed
*
* The error flag is checked whenever the user app (currently the designer) is invoked, and the user
* notified if there is an error. They can then notify the admin. This is to avoid needing to set up and
* maintain some sort of on-going notification process. However, it is planned to introduce email notification.
* The log is alos available in the admin console, which can be manually checked any time
*
* */


const axios = require("axios");
let sourceServer // passed in during setup. Defaults to  "http://localhost:9099/baseR4/"
//let targetServer = "http://localhost:9999/baseR4/"      // todo - config
let targetServer = "http://138.68.26.195:9999/baseR4/"


let db

let backupInterval =  60 * 60 * 1000      //1 hour - add to config in mongo

//let backupPeriod =   60 * 1000      //1 minute - add to config in mongo


async function doBackup(cb) {
    let collection = db.collection('backupLog')   //the mongo collection with the log entries
    let issues = []         //issues during processing that won't interfere with the backup

    //retrieve the previous backup run
    const cursor = collection.find({}).sort({ time: -1 }).limit(1);
    const allValues = await cursor.toArray();

    //console.log('all',allValues)

    //If there's an eror with the run, then the lastSuccessfulRun is copied into the 'failure' logentry
    let lastSuccessfulRun = new Date(2000,1,1).toISOString()  //default start
    if (allValues.length > 0) {
        let logEntry = allValues[0]

        /* for now, if the last try failed then just try again
        if (logEntry.status == 'fail') {
            //the last time the backup ran it failed. Wait until issue is checked before starting again
            //???? write an entry here
            if (cb) {
                cb(logEntry)    //?? return the old logEntry here
            }
            return

        }

        */

        lastSuccessfulRun = logEntry.lastSuccessfulRun
    }

    console.log('from: ',lastSuccessfulRun)

    let time = new Date().toISOString()



    //
    let hashAllEntries = {}

    let url = sourceServer + "_history?_since=" + lastSuccessfulRun + "&_count=50"

    let results
    console.log('first',url)
    try {
        results = await axios.get(url)      //get the first page
    } catch (ex)  {
        //oops - there was an error contacting the server
        console.log('error getting data')
        if (cb) {
            cb(ex)
        }
        return
    }

    let bundle = results.data       //the first bundle

    //add the entries from the bundle to the transaction...
    //processBundle(transactionBundle,logEntry,bundle,issues)

    //update the hashAllEntries. Most recent resources incldued.
    processBundle(hashAllEntries,bundle,issues)



    let nextPageUrl = getNextPageUrl(bundle)
    console.log('page',nextPageUrl)
    while (nextPageUrl) {
        try {
            results = await axios.get(nextPageUrl)
            let nextBundle = results.data
            //processBundle(transactionBundle,logEntry,nextBundle,issues)
            processBundle(hashAllEntries,nextBundle,issues)
            //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
            nextPageUrl = getNextPageUrl(nextBundle)
        } catch (ex) {
            //the hapi server paging seems to return an OO with status 500 at the end of the page set...
            console.log(ex)
            nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
        }
    }


    //console.log(hashAllEntries)
    //cb(Object.keys(hashAllEntries).length)

    //return
    //now the hash of resources can be converted into the transaction
    let logEntry = {time:time,status:"",count:0,msg:"",details:"",item:[]}
    let transactionBundle = {resourceType:'Bundle',type:'transaction',entry:[]}
    makeTransactionBundle(hashAllEntries,transactionBundle,logEntry)
    //let transactionBundle = vo.transaction


    //update the log
    logEntry.count = logEntry.item.length
    logEntry.issues = issues

    let updateQry = `${targetServer}`   //POST to the endpoint
    console.log('POSTing to ' + updateQry)

    //let result      //needs to be in this scope for the exception handler
    try {
        let result = await axios.post(updateQry,transactionBundle,{maxBodyLength:Infinity,maxContentLength:Infinity})  //send the bundle.
        console.log('axios status',result.status)
        console.log('axios response',result.data)
        if (result.status !== 200) {
            //there was an error processing the bundle on the target server
            //actually, axios will throw an exception - this block may not get executed
            logEntry.status = 'fail'
            logEntry.msg = result.data      //should be an OO describing the error
            console.log('resp',result.data)
            logEntry.lastSuccessfulRun = lastSuccessfulRun     //need to set the time to the last successful run...

        } else {
            //all good!
            logEntry.status = 'success'
            logEntry.lastSuccessfulRun = time        //set the time the backup run was performed

        }
        console.log('inserting log')
        const dbresult = await collection.insertOne(logEntry);
        console.log('log inserted')
       // saveLogEntry(logEntry)
        if (cb) {
            cb(logEntry)
        }

    } catch (ex) {
        //the update failed. This includes a failure from the FHIR server. create a failure logEntry
        console.log('axios post failed')
        logEntry.status = 'fail'
        logEntry.msg = ex.message
        if (ex.response) {
            logEntry.details = ex.response.data
        }

        logEntry.lastSuccessfulRun = lastSuccessfulRun     //need to set the time to the last successful run...

        const dbresult = await collection.insertOne(logEntry);
        //saveLogEntry(logEntry)
        if (cb) {
            cb(logEntry)
        }
    }

    function saveLogEntry(logEntry) {
        //save the log
        try {
            collection.insertOne(logEntry);

        } catch (ex) {
            console.log(ex)
            // If the log is not saved, then the mongo server is down. Backups may or may not have been made.
            //eventually, the clients will notice that the backup is out of date and alert admin
        }
    }

}


//schedule the backup runs
setInterval(doBackup,backupInterval)

//create a
//only do this for non-numeric id's (which should be all of them now

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


function processBundleDEPDEP(transactionBundle,logEntry,bundle,issues) {
    console.log('processing bundle...')
    if (bundle.entry) {
        console.log('bundle count:',bundle.entry.length)
        bundle.entry.forEach(function (entry) {
            let tEntry = {resource:entry.resource}
            let id = entry.resource.id

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

//add all the resources to the transaction bundle, and update the log entry
//only do this for non-numeric id's (which should be all of them now
async function processBundleDEP(bundle,time,issues,server) {
    if (bundle.entry) {
        let logEntry = {time:time,count:0,item:[]}
        let transactionBundle = {resourceType:'Bundle',total:0,type:'transaction',entry:[]}

        bundle.entry.forEach(function (entry) {
            let tEntry = {resource:entry.resource}
            let id = entry.resource.id

            //need to test for a numeric id - these can't be backed up.
            //do this by pareseInt - if not a NNnumber, then is NaN so !n is teh check...
            if ( !parseInt(entry.resource.id)) {
                //is Nan (which is what we want)
                tEntry.request = {method:'PUT',url:entry.resource.resourceType + "/" + entry.resource.id}
                transactionBundle.entry.push(tEntry)
                let le = {type:entry.resource.resourceType,id:entry.resource.id}
                if (entry.resource.meta) {
                    le.version = entry.resource.meta.versionId
                }
                logEntry.item.push(le)
            } else {
                issues.push({msg:"Id is a number",display:entry.resource.resourceType + "/" + entry.resource.id})
            }
        })

        transactionBundle.total = transactionBundle.entry.length

        //write the transaction to the target server
        let updateQry = `${server}`
        console.log('POSTing to ' + updateQry)
        try {
            await axios.post(updateQry,transactionBundle)
            try {
                const result = await collection.insertOne(logEntry);
                //console.log(result)
            } catch (ex) {
                // ??? what to do if can't insert the log
            }



        } catch (ex) {
            //the update failed. create a failure logEntry

        }


        //write the log
    }
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


function setup(app,inSourceServer,inDb) {
    sourceServer = inSourceServer
    db = inDb


    //check the status of the backup. This will be that status of the last time the backup executed
    //as backups are halted on error
    //Once errors are fixed, the 'backup/doit' command will force another try...
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

        //last 10 log entries
        const cursor = collection.find({}).sort({ time: -1 }).limit(10);
        const allValues = await cursor.toArray();
        res.json({log:allValues,serverTime:new Date().toISOString()})
    })

    //allows an immediate backup to be performed, ignoring the error flag
    app.post('/backup/doit', function(req,res){
        console.log('doit')
        doBackup(function(log){
            res.json(log)
        })
    })

    //return the current configuration
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