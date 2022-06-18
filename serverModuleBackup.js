const axios = require("axios");
let sourceServer // = "http://localhost:9099/baseR4/"
let db

let backupPeriod =  24 * 60 * 60 * 1000      //1 day

async function doBackup(cb) {
    let collection = db.collection('log')   //the mongo collection with the log entries

    //retrieve the previous backup run
    const cursor = collection.find({}).sort({ time: -1 }).limit(1);
    const allValues = await cursor.toArray();
    let lastTimeRun = allValues[0].time


    let time = new Date().toISOString()
    let logEntry = {time:time,count:0,item:[]}
    let transactionBundle = {resourceType:'Bundle',type:'transaction',entry:[]}

    let url = sourceServer + "_history?_since=" + lastTimeRun

    let results = await axios.get(url)      //get the first
    let bundle = results.data       //the first bundle
    //add all the resources to the transaction bundle, and update the log entry
    processBundle(transactionBundle,logEntry,bundle)


    //convert to a transaction
    //bundle.type = 'transaction'

    //console.log('1',bundle.entry.length)

    let nextPageUrl = getNextPageUrl(bundle)

    while (nextPageUrl) {
        try {
            results = await axios.get(nextPageUrl)
            let nextBundle = results.data
            processBundle(transactionBundle,logEntry,nextBundle)
            //console.log(nextBundle.entry.length)

            //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
            nextPageUrl = getNextPageUrl(nextBundle)
        } catch (ex) {
            //the hapi server paging seems to return an OO with status 500 at the end of the page set...
            nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
        }
    }

    //console.log('end')
    logEntry.count = logEntry.item.length
    //console.log(logEntry)

    //save the log

    try {
        const result = await collection.insertOne(logEntry);
        //console.log(result)
    } catch (ex) {
        // ??? what to do if can't insert the log
    }



    //let log = {time:time,'error':false}
    if (cb) {
        cb(logEntry)
    }

}


setInterval(doBackup,backupPeriod)

//add all the resources to the transaction bundle, and update the log entry
function processBundle(transactionBundle,logEntry,bundle) {
    if (bundle.entry) {
        bundle.entry.forEach(function (entry) {
            let tEntry = {resource:entry.resource}
            tEntry.request = {method:'PUT',url:entry.resource.resourceType + "/" + entry.resource.id}
            transactionBundle.entry.push(tEntry)
            let le = {type:entry.resource.resourceType,id:entry.resource.id}
            if (entry.resource.meta) {
                le.version = entry.resource.meta.versionId
            }
            logEntry.item.push(le)
        })
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
    app.get('/backup/log', function(req,res){
        res.json({})

    })

    app.post('/backup/doit', function(req,res){
        doBackup(function(log){
            res.json(log)
        })


    })
}

module.exports = {
    setup : setup
};