//create a summary of all the comments by Q id

angular.module("formsApp")
    .controller('formReviewsSummaryCtrl',
        function ($scope,$http) {

            //when a Q has been selected from the list to the left
            $scope.selectQ = function(summary) {

                $scope.summary = summary
                $scope.arComments = []
                let Q_url = summary.Q.url

                //retrieve the actual QR & observations from the server. This includes the Observations
                let qry = `/ds/fhir/QuestionnaireResponse?questionnaire=${Q_url}&_revinclude=Observation:focus`
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        let bundle = data.data      //will be a combo of QR & Obs

                        //first create a hash of Observations keyed by Q url & linkid
                        hashObservations = {}
                        bundle.entry.forEach(function (entry) {
                            if (entry.resource.resourceType == "Observation") {
                                let obs = entry.resource

                                //need to look at the components to find the linkId
                                let linkId
                                let item = {}
                                obs.component.forEach(function (comp) {
                                    if (comp.code.coding[0].code == "linkId") {
                                        linkId = comp.valueString
                                        item.linkId = linkId
                                        item.status = obs.valueCodeableConcept.coding[0].display
                                    }
                                    if (comp.code.coding[0].code == "note") {
                                        item.note = comp.valueString
                                    }
                                })
                                //let key = `${Q_url}-${linkId}`
                                //need to get the id of the QR that this Observation refers to from the 'derivedFrom' reference
                                if (obs.derivedFrom && obs.derivedFrom.length > 0) {
                                    let key = `${obs.derivedFrom[0].reference}-${linkId}`   //QR.id - linkId


                                    //let key = `${Q_url}-${linkId}`
                                    hashObservations[key] = item
                                }


                            }
                        })

                        console.log(hashObservations)
                        $scope.arComments = []

                        //now get the comments for each QR
                        bundle.entry.forEach(function (entry) {
                            if (entry.resource.resourceType == "QuestionnaireResponse") {
                                let QR = entry.resource
                                let arComments = processQR(summary.hashCommentItems,QR) // {linkId, text, sectionText,reviewer,comment}
                                arComments.forEach(function (comment) {
                                    //let key = `${QR.questionnaire}-${comment.linkId}`
                                    //let key = `${QR.questionnaire}-${comment.linkId}`
                                    let key = `QuestionnaireResponse/${QR.id}-${comment.linkId}`
                                    if (hashObservations[key]) {
                                        //there is an observation that references this linkId in this QR
                                        let obj = hashObservations[key]
                                        comment.status = obj.status
                                        comment.notes = obj.note

                                    }
                                })

                                console.log(arComments)

                                $scope.arComments = $scope.arComments.concat(arComments)


                                //now attach the resolution (Observation) to the comment - if any


                            }
                        })

                        //now we can build the download
                        //sort by section then comment text
                        $scope.arComments.sort(function(a,b){
                            let key1 = a.sectionText + a.text
                            let key2 = b.sectionText + b.text
                            if (key1 > key2) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        //create download tsv
                        let arDownload = []
                        arDownload.push("Reviewer,Section,Item,Comment,Status,Notes")
                        $scope.arComments.forEach(function (item) {
                            let lne = cleanText(item.reviewer) + "," + item.sectionText + "," + item.text + "," + cleanText(item.comment) + "," + item.status + "," + cleanText(item.notes)
                            arDownload.push(lne)

                        })

                        let fle = "\ufeff" + arDownload.join("\r\n")
                        //let fle =  "\ufeff" +  voHISO.fle // arHISO.join("\r\n")
                        $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([fle],{type:"text/csv"}))
                        var now = moment().format();
                        $scope.downloadLinkCsvName =  summary.Q.name + '_comments_' + now + '.csv';



                    }
                )



                function cleanText(text) {
                    if (text) {
                        text = text.replace(/\r\n|\r|\n/g ,' ');      //get rid of cr/lf
                        text = text.replace(/,/g ,'-');      //and the comma
                        return text
                    }
                    return ""

                }

            }

            //perform the analysis
            $scope.refresh = function () {
                delete $scope.allQ
                delete $scope.arComments
                $scope.loading = true

                findCommentItems(function(hashQ){
                    $scope.allQ = hashQ
                    $scope.loading = false
                })
            }


            //load all the Questionnaires and extract the linkIds that are reviewer comments
            function findCommentItems(cb) {

                let hashQ = {}      //a hash of all Q with comments
                let now = new Date(), start = new Date()  //to check timing
                let qry = "ds/fhir/Questionnaire?_elements=url,item,name"
                //let hash = {}       //hash by url
                let config = {headers:{Authorization:'dhay'}}
                $http.get(qry).then(
                    function (data) {
                        console.log('Time to load Q: ',moment().diff(now))
                        let bundle = data.data
                        bundle.entry.forEach(function (entry) {
                            let Q = entry.resource

                            if (Q.item) {
                                Q.item.forEach(function (section) {
                                    let sectionText = section.text
                                    if (section.item) {
                                        section.item.forEach(function (child) {
                                            if (child.code) {
                                                child.code.forEach(function (concept) {
                                                    if (concept.system == 'http://clinfhir.com/fhir/CodeSystem/review-comment') {

                                                        hashQ[Q.url] = hashQ[Q.url] || {Q:Q,hashCommentItems:{},lstQR:[]}

                                                        hashQ[Q.url].hashCommentItems[child.linkId] = {text:child.text,sectionText:sectionText,linkId:child.linkId}
                                                        //hash[Q.url].push({linkId: child.linkId,text:child.text,sectionText:sectionText})
                                                    }
                                                })
                                            }
                                        })
                                    }


                                })
                            }

                        })

                        //At this point hashQ has all known Q and the items within then (direct childrem of the section)
                        //Now load all the QR and add them to the hash. This means we can display a count of comments per Q
                        console.log('Time to create hash: ',moment().diff(start))

                        //really only doing this to collect the numbers of responses now...
                        let qry = "ds/fhir/QuestionnaireResponse"

                        let arComments = []
                        let config = {headers:{Authorization:'dhay'}}
                        $http.get(qry,config).then(
                            function(data){
                            let bundleQR = data.data
                                bundleQR.entry.forEach(function (entry) {
                                    let QR = entry.resource
                                    let url = QR.questionnaire
                                    if (url) {
                                        hashQ[url]  =  hashQ[url] ||{ Q:{url:url,name:"unknown"},hashCommentItems:{},lstQR:[]}
                                        hashQ[url].lstQR.push(entry.resource)


                                    } else {
                                        console.log("Url: " + url + " not found")
                                    }
                                })
                                console.log('Time to create summary: ',moment().diff(start))
                                cb(hashQ)
                        })
                    }
                )


            }

            //create an array with all the comments - items that caoment type
            function processQR(hashCommentItems,QR) {
                let arComments = []

                //get the reviewer (a contained resource within the QR)
                let reviewer = ""
                if (QR.contained) {
                    let pr = QR.contained[0]    //only possible resource
                    if (pr.practitioner) {
                        reviewer = pr.practitioner.display
                    }
                    if (pr.organization) {
                        reviewer += "  " + pr.organization.display
                    }
                }
                reviewer = reviewer || "Not known"

                QR.item.forEach(function (section) {
                    section.item.forEach(function (child) {
                        let key = child.linkId
                        if (hashCommentItems[key]) {
                            let contents = hashCommentItems[key]
                            if (child.answer) {
                                child.answer.forEach(function (ans) {

                                    let comment = ans.valueString
                                    comment = comment.replace(/\r\n|\r|\n/g ,' ');
                                    let lne = {linkId:contents.linkId,text:contents.text,sectionText:contents.sectionText,reviewer:reviewer,comment:comment}
                                    if (QR.meta && QR.meta.versionId) {
                                        lne.version = QR.meta.versionId
                                    }

                                    lne.status = QR.status
                                    arComments.push(lne)
                                })
                            }
                        }
                    })

                })



                return arComments


            }


        })


