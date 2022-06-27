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
let targetServer = "http://localhost:9999/baseR4/"      // todo - config

let db

let backupPeriod =  24 * 60 * 60 * 1000      //1 day - add to config in mongo

async function doBackup(ignoreLastEntry,cb) {
    let collection = db.collection('backupLog')   //the mongo collection with the log entries
    let issues = []         //issues during processing that won't interfere with the backup

    //retrieve the previous backup run
    const cursor = collection.find({}).sort({ time: -1 }).limit(1);
    const allValues = await cursor.toArray();

    //console.log('all',allValues)
    let lastTimeRun = new Date(2000,1,1).toISOString()  //default start
    if (allValues.length > 0) {
        let logEntry = allValues[0]
        if (logEntry.status == 'fail') {
            //the last time the backup ran it failed. Wait until issue is checked before starting again
            //???? write an entry here
            if (cb) {
                cb(logEntry)    //?? return the old logEntry here
            }
            return

        }
        lastTimeRun = logEntry.time
    }

    console.log('from: ',lastTimeRun)

    let time = new Date().toISOString()

    let logEntry = {time:time,status:"",count:0,msg:"",item:[]}
    let transactionBundle = {resourceType:'Bundle',type:'transaction',entry:[]}

    let url = sourceServer + "_history?_since=" + lastTimeRun + "&_count=10"

    let results
    console.log('first',url)
    try {
        results = await axios.get(url)      //get the first page
    } catch (ex)  {
        //oops - there was an error contacting the server


        if (cb) {
            cb(ex)
        }
        return
    }

    let bundle = results.data       //the first bundle

    //add the entries from the bundle to the transaction...
    processBundle(transactionBundle,logEntry,bundle,issues)

    let nextPageUrl = getNextPageUrl(bundle)
    console.log('page',nextPageUrl)
    while (nextPageUrl) {
        try {
            results = await axios.get(nextPageUrl)
            let nextBundle = results.data
            processBundle(transactionBundle,logEntry,nextBundle,issues)
            //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
            nextPageUrl = getNextPageUrl(nextBundle)
        } catch (ex) {
            //the hapi server paging seems to return an OO with status 500 at the end of the page set...
            nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
        }
    }

    //now the transaction bundle has been created and can be saved

    //update the log
    logEntry.count = logEntry.item.length
    logEntry.issues = issues

    let updateQry = `${targetServer}`   //POST to the endpoint
    console.log('POSTing to ' + updateQry)

    try {
        let result = await axios.post(updateQry,transactionBundle)  //send the bundle.
        if (result.status !== '200') {
            //there was an error processing the bundle
            logEntry.status = 'fail'
            logEntry.msg = result.data      //should be an OO describing the error
            logEntry.time = lastTimeRun     //need to set the time to the last successful run...

        } else {
            //all good!
            logEntry.status = 'success'
            logEntry.time = time        //set the time the backup run was performed

        }

        saveLogEntry(logEntry)

    } catch (ex) {
        //the update failed. create a failure logEntry
        logEntry.status = 'fail'
        logEntry.msg = ex.message
        saveLogEntry(logEntry)
    }

    function saveLogEntry(logEntry) {
        //save the log
        try {
            collection.insertOne(logEntry);

        } catch (ex) {
            // If the log is not saved, then the mongo server is down. Backups may or may not have been made.
            //eventually, the clients will notice that the backup is out of date and alert admin
        }
    }

}


//schedule the backup runs
setInterval(doBackup,backupPeriod)

//create a
//only do this for non-numeric id's (which should be all of them now
function processBundle(transactionBundle,logEntry,bundle,issues) {
    if (bundle.entry) {
        bundle.entry.forEach(function (entry) {
            let tEntry = {resource:entry.resource}
            let id = entry.resource.id

            //need to test for a numeric id - these can't be backed up.
            //do this by pareseInt - if not a NNnumber, then is NaN so !n is teh check...

            //let n = parseInt(entry.resource.id)

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
                issues.push({msg:"Id is a number",display:entry.resource.resourceType + "/" + entry.resource.id})
            }

        })
    }
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
        let collection = db.collection('log')

        //last 10 log entries
        const cursor = collection.find({}).sort({ time: -1 }).limit(10);
        const allValues = await cursor.toArray();

        res.json({log:allValues,serverTime:new Date().toISOString()})

    })

    //allows an immediate backup to be performed, ignoring the error flag
    app.post('/backup/doit', function(req,res){
        doBackup(true,function(log){
            res.json(log)
        })
    })
}

module.exports = {
    setup : setup
};