
angular.module("formsApp")
    .controller('monitorCtrl',
        function ($scope,$http,moment,analyticsSvc,formsSvc) {

            $scope.input = {}
            $scope.moment = moment
            $scope.now = moment()

            $scope.input.logfilter = "last20"
            $scope.updateLog = function(){
                updateLog()
                console.log($scope.input.logfilter)
            }

            $scope.selectedDocumentId =  "preface"
            $scope.selectedDocumentLocation = "/ds/api/document/" + $scope.selectedDocumentId

            //get the errors
            $http.get("management/errors").then(
                function (data) {
                    $scope.errors = data.data
                }
            )

            //get the config
            $http.get("backup/config").then(
                function (data) {
                    $scope.config = data.data
                }
            )

            //get the pre-pop data
            $http.get('/ds/api/prepop').then(
                function (data) {
                    $scope.prepop = data.data
                }
            )


            //----------- functions for analytics
            //set up the analytics
            $scope.setUpAnalytics = function() {
                analyticsSvc.makeAllItemsList().then(
                    function (data) {
                        console.log(data)
                        $scope.analyticsLoaded = true
                    }
                )
            }

            $scope.findItemsWithText = function(text) {
                delete $scope.selectedItem
                delete $scope.selectedQ
                delete $scope.selectedNode
                $('#designTree').jstree('destroy');
                $scope.searchResults = analyticsSvc.findItemsWithText(text)

            }

            //$scope.setUpAnalytics()     //todo - should this be invoked by UI - expensive...

            $scope.selectThing = function(thing) {
                $('#designTree').jstree('destroy');
                //delete $scope.searchResultsx
                $scope.selectedItem = thing.item
                $scope.selectedQ = thing.Q

                $scope.selectedNode = {data:{item:$scope.selectedItem}}
               // $scope.input.selectedItem = thing.item
                console.log(thing)

                let qId = thing.Q.id
                $http.get('/ds/fhir/Questionnaire/'+qId).then(
                    function (data) {
                        let Q = data.data
                        let vo = formsSvc.makeTreeFromQ(Q)

                        vo.treeData.forEach(function (item) {
                            item.state.opened = true

                            //by default sections are closed
                            if (item.parent == 'root') {
                                item.state.opened = false;
                            }

                            //open the containing section
                            if (item.id == thing.sectionId) {
                                item.state.opened = true;
                            }

                            //bold the selected item
                            if (item.id == thing.item.linkId) {

                                item['a_attr'] = {style:'font-weight:bold;background-color: lightgrey'};
                            }
                        })

                        drawTree(vo.treeData)



                    }
                )

            }

            let drawTree = function(treeData,cb){

                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })


            }

            //-----------------------------------

            //load the ServiceRequests
            function loadSR(activeOnly) {
                $scope.reviewRequests = []
                let qry = "/ds/fhir/ServiceRequest?category=reviewRefer"
                if (activeOnly) {
                    qry += "&status=active"
                }

                $http.get(qry).then(
                    function(data) {
                        //console.log(data)

                        if (data.data && data.data.entry) {
                            data.data.entry.forEach(function (entry) {
                                let sr = entry.resource
                                let item = {status:sr.status,date : sr.authoredOn}
                                if (sr.supportingInfo) {
                                    sr.supportingInfo.forEach(function (si) {
                                        if (si.reference) {
                                            if (si.reference.indexOf('QuestionnaireResponse') > -1) {
                                                item.QR = si.reference
                                            } else if (si.reference.indexOf('Questionnaire') > -1) {
                                                item.Q = si.reference
                                            }
                                        }

                                    })
                                }
                                $scope.reviewRequests.push(item)


                            })



                        }
                        //$scope.serviceRequestsBundle = data.data;

                    }
                )
            }
            loadSR(true)

            $scope.showQR = function (url) {
                let qry = "/ds/fhir/"+url
                $http.get(qry).then(
                    function (data) {
                        $scope.selectedQR = data.data
                    }
                )
            }

            //uploading a document (Used to upload docs and attach to a Q)
            $scope.uploadDocument = function(drId){
                //drid is the DocumentReference Id
                let id = "#fileUploadFileRef"
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }
                let fileObject = fileList[0]  //is a complex object
                //console.log(fileList)

                let r = new FileReader();

                r.onloadend = function(e) {
                    let data = e.target.result;

                    let arKnownFileTypes = [{key:'.pdf',mime:'application/pdf'}]
                    arKnownFileTypes.push({key:'.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})


                    //save the uploaded data as a binary, then create an attachment extension from the Q
                    let dr = {resourceType:"DocumentReference",id:drId,status:"current",content:[]}
                    let att = {}

                    att.data =  btoa(data)
                    att.title = fileObject.name         //the name of the file
                    console.log(att.data.length)

                    att.contentType = "application/octet-stream"
                    arKnownFileTypes.forEach(function (typ) {
                        if (fileObject.name.indexOf(typ.key) > -1) {
                            att.contentType = typ.mime
                        }
                    })
                    dr.content.push({attachment:att})
                    let qry = `/ds/fhir/DocumentReference/${dr.id}`

                    $http.put(qry,dr).then(
                        function (data) {
                            //now add the attachment
                            //let url = `/ds/fhir/Binary/${}`
                            //think it's best to use the dataserver endpoint (rather than the native fhir endpoint)
                            let pathToDoc = `/ds/api/document/${dr.id}`
                            alert("Document uploaded. Refresh app to see preview")

                        },function (err) {
                            alert(angular.toJson(err))
                        }
                    )



                }

                //perform the read...
                r.readAsBinaryString(fileObject);
            }

            $scope.executeBackup = function() {
                if (confirm("Are you sure you wish to perform a backup now?")){
                    $scope.backupInProgress = true
                    $http.post("/backup/doit").then(
                        function(data){
                            alert(angular.toJson(data.data))
                            updateLog()
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    ).finally(function () {
                        $scope.backupInProgress = false
                    })
                }
            }

            updateLog = function(){
                //get the most recent log entries
                let qry = "/backup/log"
                if ($scope.input.logfilter == 'last20gt0') {
                    qry += "?filter=gt0"
                }

                $http.get(qry).then(
                    function (data) {
                        $scope.log = data.data.log
                        $scope.serverTime = data.data.serverTime        //current time on the server
                    }
                )
            }
            updateLog()

            $scope.getResource = function(item) {
                let qry = `/ds/fhir/${item.type}/${item.id}`
                $http.get(qry).then(
                    function(data) {
                        $scope.currentResource = data.data
                    }
                )
            }

            $scope.selectLogItem = function(logItem) {
                $scope.input.logItem = logItem
            }

        })