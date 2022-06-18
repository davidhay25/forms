#!/usr/bin/env node

/*
* Script to copy new resources to another server.
* Used to perform an incremental backup, and run by a crow job of some sort
*
* */

let axios = require('axios')
let fs = require('fs')

let currentFolder = process.cwd()

console.log(currentFolder)
return

//load the last

//the server to copy resources from. This is the hapi server on the local machine...

let sourceServer = "http://localhost:9099/baseR4/"


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

doCopy(sourceServer + "_history")

async function doCopy(url) {
    console.log(url)
    let results = await axios.get(url)      //get the first
    let bundle = results.data       //the first bundle
    console.log('1',bundle.entry.length)

    let nextPageUrl = getNextPageUrl(bundle)
//console.log('next ' + nextPageUrl)

    while (nextPageUrl) {
        try {
            results = await axios.get(nextPageUrl)
            let nextBundle = results.data
            console.log(nextBundle.entry.length)

            //get the next page. Note that hapi seems to keep on generating page links, returning an OO status 500 on the last one
            nextPageUrl = getNextPageUrl(nextBundle)
        } catch (ex) {
            //the hapi server paging seems to return an OO with status 500 at the end of the page set...
            //??? should check the result anyway?
            //console.log('error ' + ex.message)
            nextPageUrl = null           //will terminate the while() loop, returning the results thus far..
        }
    }

    console.log('end')



}










