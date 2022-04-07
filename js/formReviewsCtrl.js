
angular.module("formsApp")
    .controller('formReviewsCtrl',
        function ($scope,$http,formsSvc) {

            //load outstanding SR's
            function loadActiveSR() {
                let qry = "/ds/fhir/ServiceRequest?category=reviewRefer&status=active"
                $http.get(qry).then(
                    function(data) {
                        console.log(data)
                        $scope.serviceRequestsBundle = data.data;

                    }
                )
            }
            loadActiveSR()

            $scope.markSRComplete = function(SR) {
                SR.status = "completed"
                let qry = `/ds/fhir/ServiceRequest/${SR.id}`
                $http.put(qry,SR).then(
                    function(data) {
                        loadActiveSR()
                        delete $scope.selectedSR
                        delete $scope.selectedQR
                        delete $scope.selectedReview
                    }, function(err) {
                        alert(angular.toJson(err))
                    }
                )

            }

            $scope.selectSR = function(sr){
                $scope.selectedSR = sr
                //get the QR from the 'supportinginfo in the SR

                if (sr.supportingInfo) {
                    sr.supportingInfo.forEach(function (si) {
                        if (si.reference.indexOf('QuestionnaireResponse') > -1) {
                            //this is the reference to the QR that this SR is for.
                            let ar = si.reference.split('/')
                            let QRid = ar[1]
                            $http.get("/ds/fhir/QuestionnaireResponse/"+QRid).then(
                                function(data) {
                                    console.log(data)
                                    let QR = data.data

                                    //now get the associated Q
                                    formsSvc.loadQByUrl(QR.questionnaire).then(   //returns a bundle
                                        function(data) {
                                            console.log(data)
                                            if (data.data.entry && data.data.entry.length > 0) {
                                                let Q = data.data.entry[0].resource

                                                let hashIds = {}
                                                Q.item.forEach(function (item) {
                                                    getReviewerLinkId(hashIds,item)
                                                })


                                                let arReviewComments = []
                                                QR.item.forEach(function (item) {
                                                    getReviewItems(arReviewComments,hashIds,item)

                                                })
                                                // if (arReviewComments.length > 0) {

                                                $scope.selectedReview = {QR:QR,reviews:arReviewComments}
                                                //$scope.reviewQRs.push({QR:QR,reviews:arReviewComments})

                                                $scope.selectedQR = QR
                                                $scope.selectedQ = Q
                                            }

                                        }
                                    )


                                }, function (err) {
                                    alert(`The Questionnaire with the id: ${QRid} was not found.`)
                                }
                            )
                        }
                    })
                }

            }

            let reviewCommentsSystem = "http://canshare.com/cs/review"

            $scope.selectReview = function(review) {
                delete $scope.selectedSR

                $scope.selectedReview = review
                $scope.selectedQR = review.QR       //for the display
            }

            //iterate through QR to get comments
            function getReviewItems(arReview,hashCommentItems,item) {
                if (item.item) {
                    item.item.forEach(function (child) {
                        getReviewItems(arReview,hashCommentItems,child)
                    })

                } else {
                    //a leaf item
                    if (hashCommentItems[item.linkId]) {
                        arReview.push(item)
                    }
                }
            }

            //iteate Q to find linkId's that are for reviewer comments
            function getReviewerLinkId(hashLinkId,item) {
                if (item.item) {
                    item.item.forEach(function (child) {
                        getReviewerLinkId(hashLinkId,child)
                    })

                } else {
                    //a leaf item
                    if (item.code && item.code[0].system == reviewCommentsSystem) {
                        hashLinkId[item.linkId] = (item)
                    }
                }
            }


            $scope.selectQReviews = function(Q) {
                delete $scope.reviewQRs
                delete $scope.selectedQR
                delete $scope.selectedReview
                $scope.selectedReviewQ = Q
                $scope.selectedQ = Q
                $scope.reviews = []     //QRs that have reviews...

                //get the linkId's of reviewer comment items in the Q based on the code system
                let hashIds = {}
                Q.item.forEach(function (item) {
                    getReviewerLinkId(hashIds,item)
                })

                formsSvc.getQRforQ(Q.url).then(
                    function(bundleResponses) {
                        //let bundleResponses = formsSvc.getQRforQ(Q.url)
                        $scope.reviewQRs = []       //will have all the QRs that have any comments...
                        if (bundleResponses.entry) {
                            bundleResponses.entry.forEach(function (entry) {
                                let QR = entry.resource
                                let arReviewComments = []

                                QR.item.forEach(function (item) {
                                    getReviewItems(arReviewComments,hashIds,item)

                                })
                                if (arReviewComments.length > 0) {

                                    $scope.reviewQRs.push({QR:QR,reviews:arReviewComments})

                                }
                                //console.log(arReviewComments)
                            })
                        }
                    }
                )





            }
        }
    )