
angular.module("formsApp")
    .controller('formReviewsCtrl',
        function ($scope,$http,formsSvc) {


            let reviewCommentsSystem = "http://canshare.com/cs/review"

            $scope.selectReview = function(review) {


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
                $scope.reviews = []     //QRs that have reviews...

                //get the linkId's of reviewer comment items in the Q based on the code system
                let hashIds = {}
                Q.item.forEach(function (item) {
                    getReviewerLinkId(hashIds,item)
                })

                //console.log(hashIds)

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