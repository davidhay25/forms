//create a summary of all the comments by Q id

angular.module("formsApp")
    .controller('formReviewsSummaryCtrl',
        function ($scope,$http) {

            $scope.selectQ = function(summary) {

                $scope.summary = summary
                $scope.arComments = []
                summary.lstQR.forEach(function (QR) {



                    $scope.arComments =  $scope.arComments.concat(processQR(summary.hashCommentItems,QR))


                })

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
                arDownload.push("Reviewer,Section,Item,Comment")
                $scope.arComments.forEach(function (item) {

                    let comment = item.comment
                    comment = comment.replace(/\r\n|\r|\n/g ,' ');      //get rid of cr/lf
                    comment = comment.replace(/,/g ,'-');      //and the comma
                    let reviewer = item.reviewer.replace(/,/g ,'-');

                    let lne = reviewer + "," + item.sectionText + "," + item.text + "," + comment
                    arDownload.push(lne)

                })

                let fle = arDownload.join("\r\n")

                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([fle],{type:"text/csv"}))
                var now = moment().format();
                $scope.downloadLinkCsvName =  summary.Q.name + '_comments_' + now + '.csv';

            }

            //perform the analysis
            $scope.refresh = function () {
                findCommentItems(function(hashQ){

                    $scope.allQ = hashQ
                })
            }


            //load all the Questionnaires and extract the linkIds that are comments
            function findCommentItems(cb) {

                let hashQ = {}      //a hash of all Q with comments

                let qry = "ds/fhir/Questionnaire?_elements=url,item,name"
                //let hash = {}       //hash by url
                let config = {headers:{Authorization:'dhay'}}
                $http.get(qry).then(
                    function (data) {

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
                                                        //let key = Q.url + ":" + child.linkId
                                                        //hash[key] = {linkId: child.linkId,text:child.text,sectionText:sectionText}

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

                                        //get the list of all comments from the QR
                                        //let ar = processQR(hashQ[url].commentItems,QR)

                                    } else {
                                        console.log("Url: " + url + " not found")
                                    }
                                })
                                cb(hashQ)
                        })
                    }
                )


            }

            //create an array with all the comments - items that caoment type
            function processQR(hashCommentItems,QR) {

                let arComments = []

                //get the reviewer
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


                                    arComments.push(lne)
                                })
                            }
                        }
                    })

                })



                return arComments


            }


        })


