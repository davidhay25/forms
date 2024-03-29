//functions releted to generating the HSIO representations

angular.module("formsApp")

    .service('hisoSvc', function(formsSvc) {


        //constants for the tables
        const header = `   
                    <html><head>
                    <meta charset="utf-8">
                    <style>
                    
                        h1, h2, h3, h4 {
                         font-family: Arial, Helvetica, sans-serif;
                        }
                    
                        tr, td {
                            border: 1px solid black;
                            padding : 8px;
                        }
                    
                        .dTable {
                            font-family: Arial, Helvetica, sans-serif;
                            width:100%;
                            border: 1px solid black;
                            border-collapse: collapse;
                        }
                        
                        .col1 {
                            background-color:Gainsboro;
                        }
                        
                        .title {
                            background-color: #c9e2b3;
                        }
                        
                         .meta {
                            background-color: #e4b9c0;
                        }
                                   
                    </style>
                    </head>
                    <body style="padding: 8px;">
                    
                `;

        const footer = "</body></html>"



        return {



            createHisoArray: function(obj){
                //obj is an array of sections, each of which has a lines property containing the elements - including group level

                let arHisoLine = []         //an array of detail objects - one for each hiso element
                let arFle = []              // a matching array of csv lines
                arFle.push("Name,Definition,Source Standards,Data domain,Datatype,UOM,Layout,Obligation,Guide for use")
                //console.log(obj)
                obj.forEach(function (sect) {

                    //create an entry for the section - use in html download
                    arHisoLine.push({type:'section',name:sect.display})


                    sect.lines.forEach(function (line) {
                        //console.log(line)
                        if (! line.exclude) {
                            let hiso = {}
                            //hiso.type = line.type

                            hiso.name = line.name
                            hiso.definition = line.description
                            hiso.sourceStandards = line.sourceStandard
                            hiso.domain = line.dataDomain
                            hiso.dataType = line.hisoDT
                            hiso.uom = line.UOM
                            hiso.layout = line.hisoLayout
                            hiso.obligation = line.obligation
                            hiso.guide = line.usageNotes
                            arHisoLine.push(hiso)
                            arFle.push(makeDownloadLine(hiso))
                        }


                    })
                })

                let fle = arFle.join("\r\n")


                return {array:arHisoLine,fle:fle}

                //make a csv line
                function makeDownloadLine(hiso) {
                    let lne = ""

                    lne += makeSafe(hiso.name) + ","
                    lne += makeSafe(hiso.definition) + ","
                    lne += makeSafe(hiso.sourceStandards) + ","
                    lne += makeSafe(hiso.domain) + ","
                    lne += makeSafe(hiso.dataType) + ","
                    lne += makeSafe(hiso.uom) + ","
                    lne += makeSafe(hiso.layout) + ","
                    lne += makeSafe(hiso.obligation) + ","
                    lne += makeSafe(hiso.guide)
                    return lne
                }
                //convert put quotes around commas
                function makeSafe(txt) {
                    if (txt) {

                        //don't seem to use these when encoding as UTF8 - adding a BOM to the file before downloading...
                      //temp  txt = txt.replace(/’/g ,"");
                     //   txt = txt.replace(/‘/g ,'');
                     //   txt = txt.replace(/'/g ,'');
                      //  txt = txt.replace(/"/g ,'');
                        txt = txt.replace(/,/g ,'');

                        txt = txt.replace(/\r\n|\r|\n/g ,' ');      //get rid of cr/lf
                        return txt
                    } else {
                        return ""
                    }

                }
            },
            createHtmlDownload : function(Q,lines) {
                //create an html download file. Each line from the input is represented as a table in the file
                //create a table for each item
                let ar = []
                ar.push(`<h1>${Q.title}</h1>`)
                ar.push("Generated by the CanShare Standards Manager")
                ar.push("We could put some boilerplate text (not specific to the standard) here if you like...")

                //Q metadata
                ar.push("<h3>Standard metadata</h3>")

                ar.push('<table cellspacing="0" width="100%">')


                ar.push(`<tr><td class="meta" width="30%">Description</td><td>${cleanText(Q.description)}</td></tr>`)
                ar.push(`<tr><td class="meta" width="30%">Name</td><td>${cleanText(Q.name)}</td></tr>`)
                ar.push(`<tr><td class="meta" width="30%">Version</td><td>${cleanText(Q.version)}</td></tr>`)
                ar.push(`<tr><td class="meta" width="30%">HISO Status</td><td>${formsSvc.getHisoStatus(Q)}</td></tr>`)
                ar.push(`<tr><td class="meta" width="30%">HISO Number</td><td>${formsSvc.getHisoNumber(Q)}</td></tr>`)

                ar.push(`<tr><td class="meta" width="30%">Internal Url</td><td>${cleanText(Q.url)}</td></tr>`)


                ar.push('</table>')
                ar.push('<br/>')

                lines.forEach(function (lne) {
                   // console.log(lne)
                    if (lne.type == 'section') {
                        ar.push(`<h3>${lne.name}</h3>`)
                    } else {
                        ar.push('<table cellspacing="0" width="100%">')
                        ar.push(`<tr><td class="title" width="30%">Name</td><td>${cleanText(lne.name)}</td></tr>`)
                        ar.push(`<tr><td class="title">Definition</td><td>${cleanText(lne.definition)}</td></tr>`)
                        ar.push(`<tr><td class="title">Source Standards</td><td>${cleanText(lne.sourceStandards)}</td></tr>`)
                        ar.push(`<tr><td class="title">Data Domain</td><td>${cleanText(lne.domain)}</td></tr>`)
                        ar.push(`<tr><td class="title">Data type</td><td>${cleanText(lne.dataType)}</td></tr>`)
                        ar.push(`<tr><td class="title">Unit of measure</td><td>${cleanText(lne.uom)}</td></tr>`)
                        ar.push(`<tr><td class="title">Layout</td><td>${cleanText(lne.layout)}</td></tr>`)
                        ar.push(`<tr><td class="title">Obligation</td><td>${cleanText(lne.obligation)}</td></tr>`)
                        ar.push(`<tr><td class="title">Guide for use</td><td>${cleanText(lne.guide)}</td></tr>`)

                        ar.push('</table>')
                        ar.push('<br/>')
                    }

                })



                //let document = "<table><tr><td>"+ar.join("\n")+"</td></tr></table>"

                return header + ar.join("\n") + footer

                function cleanText(txt) {
                    if (txt) {
                        return txt
                    } else {
                        return ""
                    }
                }

            }

        }

    })