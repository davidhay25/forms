//manage the reviews of a form
angular.module("formsApp")
    .controller('formReviewsCtrl',
        function ($scope,$http,formsSvc,$uibModal) {

            let reviewCommentsSystem = "http://clinfhir.com/fhir/CodeSystem/review-comment"


            //load outstanding SR's
            function loadActiveSR() {

                let qry = "/ds/fhir/ServiceRequest?category=reviewRefer&status=active&_sort=authored"
                $http.get(qry).then(
                    function(data) {
                        console.log(data)
                        $scope.serviceRequestsBundle = data.data;

                    }
                )
            }
            loadActiveSR()

            $scope.editQR = function(QR) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editQR.html',
                    backdrop: 'static',
                    size:'lg',
                    controller: "editQRCtrl",
                    resolve: {
                        QR : function() {
                            return QR
                        }
                    }
                }).result.then(
                    function (QR) {
                        //update the QR. Only the textual elements will have changed - everything else should be OK.
                        QR.status = "amended"
                        console.log(QR)
                        let qry = `/ds/fhir/QuestionnaireResponse/${QR.id}`
                        $http.put(qry,QR).then(
                            function () {
                                alert("Amended QR has been saved")
                            },
                            function () {
                                alert("There was an error and the amended QR has NOT been saved")
                            }
                        )


                    })

            }


            $scope.refresh = function() {
                loadActiveSR()
            }

            //add any previous disposition
            function updateReviewWithDispositions(review) {
                console.log(review)
                let QRId = review.QR.id
                //retrieve observations that have a 'derived-from' that refers to this QR
                let qry = `/ds/fhir/Observation?derived-from=${QRId}&code=disposition`
                $http.get(qry).then(
                    function (data) {
                        if (data.data && data.data.entry) {
                            data.data.entry.forEach(function (entry){
                                let obs = entry.resource
                                let disposition = makeDispositionDisplayObj(obs)            //the actual disposition. Allow >1 per comment (though generally only 1)
                                /*
                                disposition.disposition = obs.valueCodeableConcept.coding[0].code
                                if (obs.component) {
                                    obs.component.forEach(function (comp) {
                                        switch (comp.code.coding[0].code) {
                                            case 'comment' :
                                                disposition.comment = comp.valueString
                                                break
                                            case 'reviewer' :
                                                disposition.reviewer = comp.valueString
                                                break
                                            case 'authored' :
                                                disposition.authored = comp.valueDateTime
                                                break
                                            case 'linkId' :
                                                disposition.linkId = comp.valueString
                                                break
                                            case 'note' :
                                                disposition.note = comp.valueString
                                                break
                                        }
                                    })
                                }

                                */
                                //now add the disposition to the correct review
                                review.reviews.forEach(function (rev) {
                                    if (rev.linkId == disposition.linkId) {
                                        rev.disposition = disposition
                                    }
                                })
                                console.log(disposition)
                            })
                        }

                        console.log(data)
                    }, function(err) {
                        console.log(err)
                    }
                )
            }


            function makeDispositionDisplayObj(obs) {
                let disposition = {}            //the actual disposition. Allow >1 per comment (though generally only 1)
                disposition.disposition = obs.valueCodeableConcept.coding[0].code
                if (obs.component) {
                    obs.component.forEach(function (comp) {
                        switch (comp.code.coding[0].code) {
                            case 'comment' :
                                disposition.comment = comp.valueString
                                break
                            case 'reviewer' :
                                disposition.reviewer = comp.valueString
                                break
                            case 'authored' :
                                disposition.authored = comp.valueDateTime
                                break
                            case 'linkId' :
                                disposition.linkId = comp.valueString
                                break
                            case 'note' :
                                disposition.note = comp.valueString
                                break
                        }
                    })
                }
                return disposition
            }

            $scope.markSRComplete = function(SR) {
                if (confirm("Are you sure you wish to mark this form as completed")) {
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


            }

            //pull out key details from QR like access control stuff
            function processQR(QR) {
                $scope.arReviewRestrictions = $scope.arReviewRestrictions || []
                $scope.arReviewRestrictions.length = 0
                let arCanPublish = formsSvc.findExtension(QR,formsSvc.getExtUrl("extCanPublish"))
                if (arCanPublish.length > 0 && ! arCanPublish[0].valueBoolean) {
                    $scope.arReviewRestrictions.push("This review cannot be published")
                }

                let arRemoveOia = formsSvc.findExtension(QR,formsSvc.getExtUrl("extPublishOia"))
                if (arRemoveOia.length > 0 && ! arRemoveOia[0].valueBoolean) {
                    $scope.arReviewRestrictions.push("Please remove contact details from OIA request")
                }
            }

            //when a service request (indicating a review is needed) is selected
            $scope.selectSR = function(sr){

                $scope.selectedSR = sr
                delete $scope.selectedReview
               // delete $scope.selectedSR
                delete $scope.selectedQR

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
                                                if (QR.item) {
                                                    QR.item.forEach(function (item) {
                                                        getReviewItems(arReviewComments,hashIds,item)

                                                    })
                                                }


                                                $scope.selectedReview = {QR:QR,reviews:arReviewComments}
                                                updateReviewWithDispositions($scope.selectedReview)
                                                $scope.selectedQR = QR
                                                $scope.selectedQ = Q
                                                processQR(QR)           //eg access extensions


                                                //load all the dispositions made for this Q
                                                formsSvc.loadDispositionsForQ(Q).then(
                                                    function(data) {
                                                        $scope.dispositionsForQ = data.result

                                                    }
                                                )
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

            //let reviewCommentsSystem = "http://canshare.com/cs/review-comment"      //todo move to service



            //passes in a single review to update
            $scope.addDisposition = function(QR,review){
                $uibModal.open({
                    templateUrl: 'modalTemplates/disposition.html',
                    backdrop: 'static',
                    controller: function($scope,review,QR){
                        csDisposition = "http://clinfhir.com/fhir/CodeSystem/disposition-code"
                        $scope.QR = QR
                        let dispositionCode = {coding:[{code:"disposition",system:"http://clinfhir.com/fhir/CodeSystem/observation-code",display:"Disposition of Q comment"}]}

                        $scope.input = {}

                        $scope.input.dispositionOptions = []
                        $scope.input.dispositionOptions.push({system:csDisposition,code:'accept','display':"Change fully accepted"})
                        $scope.input.dispositionOptions.push({system:csDisposition,code:'mod','display':"Change partially accepted"})
                        $scope.input.dispositionOptions.push({system:csDisposition,code:'decline','display':"Change not accepted"})
                        $scope.input.dispositionOptions.push({system:csDisposition,code:'noted','display':"Noted"})

                        $scope.review = review
                        let linkId = review.linkId      //the comment in the QR

                        $scope.saveDisposition = function(){
                            let obs = {resourceType:'Observation'}
                            obs.id = "disp-" + new Date().getTime()

                            //obs.focus = {reference:QR.questionnaire}   //apparently it's OK to reference resources like this...
                            obs.focus = {reference:"QuestionnaireResponse/" + QR.id}       //this is a 'normal' reference -
                            obs.derivedFrom = {reference:`QuestionnaireResponse/${QR.id}`}

                            obs.status = "final"
                            //obs.category = category
                            obs.code = dispositionCode
                            obs.effectiveDateTime = new Date().toISOString()

                            obs.valueCodeableConcept = {coding:[{system:"http://clinfhir.com/fhir/CodeSystem/disposition-codes",
                                    code:$scope.input.disposition.code,
                                    display:$scope.input.disposition.display}]}

                            obs.component = []

                            obs.component.push({code:{coding:[{code:'comment'}],text:'comment'},valueString:review.answer[0].valueString})
                            obs.component.push({code:{coding:[{code:'reviewer'}],text:'reviewer'},valueString:QR.author.display})
                            obs.component.push({code:{coding:[{code:'authored'}],text:'authored'},valueDateTime:QR.authored})
                            obs.component.push({code:{coding:[{code:'linkId'}],text:'linkId'},valueString:review.linkId})

                            if ($scope.input.dispositionNote) {
                                obs.component.push({code:{coding:[{code:'note'}],text:'note'},valueString:$scope.input.dispositionNote})
                            }

                            console.log(obs)
                            //$http.post('/ds/fhir/Observation',obs).then(
                            //need to assign the id so we can copy resources to another server and preserve the id
                            $http.put('/ds/fhir/Observation/' + obs.id,obs).then(
                                function(data) {
                                    $scope.$close(obs)
                                }, function(err) {
                                    alert(angular.toJson(err))
                                }
                            )
                        }



                    },
                    resolve: {
                        review: function () {
                            return review
                        },

                        QR : function() {
                            return QR
                        }
                    }
                }).result.then(
                    function (obs) {
                        review.disposition = makeDispositionDisplayObj(obs)
                        //updateReviewWithDispositions(review)

                    })
            }



            $scope.selectReview = function(review) {
                delete $scope.selectedSR

                $scope.selectedReview = review
                $scope.selectedQR = review.QR       //for the display
                updateReviewWithDispositions(review)

                processQR($scope.selectedQR)    //the access control stuff
            }

            //iterate through QR to get comments
            //hashCommentItems is a hash of all the linkIds that are comments - ie have a code in the comments system...  http://canshare.com/cs/review
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

            //iterate Q to find linkId's that are for reviewer comments
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

                formsSvc.getQRforQ(Q.url).then(   //get all the QR's for this Q
                    function(bundleResponses) {
                        //let bundleResponses = formsSvc.getQRforQ(Q.url)
                        $scope.reviewQRs = []       //will have all the QRs that have any comments...
                        if (bundleResponses.entry) {
                            bundleResponses.entry.forEach(function (entry) {
                                let QR = entry.resource
                                let arReviewComments = []

                                //get all the review items (codesystem is review comment)
                                if (QR.item) {
                                    QR.item.forEach(function (item) {
                                        getReviewItems(arReviewComments,hashIds,item)
                                    })
                                }


                                if (arReviewComments.length > 0) {

                                    $scope.reviewQRs.push({QR:QR,reviews:arReviewComments})

                                }

                            })
                        }
                    }
                )





            }
        }
    )