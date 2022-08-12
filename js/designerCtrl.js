//Dashboard controller

angular.module("formsApp")
    .controller('designerCtrl',
        function ($scope,$http,formsSvc,$uibModal,$localStorage,qSvc,exportSvc, fhirSvc,
                  terminologySvc,graphSvc,$timeout,$window,modalService) {

            //see if there was a Q url passed in the initial query. If so, it will be selected once the Q's have loaded...
            let search = $window.location.search;
            if (search) {
                $scope.QfromUrl = search.substr(1)
            }

            $http.get("/config").then(
                function(data) {
                    $scope.systemConfig = data.data
                    console.log($scope.systemConfig)
                    //if ($scope.systemConfig.type == 'public') {
                       // alert("You can't edit Standards directly on the public site. The app will be set to read-only (ie checkout will be disabled).")
                    //}
                }
            )


            //when the terminology import has imported answerOptions, it emits this event so the UI can be updated
            $scope.$on('termImported',function(){
                $scope.drawQ($scope.selectedQ)  //in dashboard.js
                $scope.input.dirty = true   //in dashboard.js
                updateReport()
            })

            //When the QR is created in formCtrl it emits an event
            $scope.$on('qrCreated',function(evt,qr){
                $scope.selectedQR = qr
            })

            //load all the disposition Observations for a Q
            $scope.loadDispositionsForQDEP = function(Q) {
                delete $scope.dispositionsForQ
                $scope.selectedQ = Q
                formsSvc.loadDispositionsForQ(Q).then(
                    function(data) {
                        $scope.dispositionsForQ = data.result
                    }
                )
            }

            $scope.input = {}
            $scope.input.itemTypes = ['string','quantity','text','boolean','decimal','integer','date','dateTime', 'choice','open-choice','display','group','reference','display']

            $scope.input.codeSystems = []   //used by the editItem function
            $scope.input.codeSystems.push({display:'SNOMED CT',url:'http://snomed.info/sct'})
            $scope.input.codeSystems.push({display:'LOINC',url:'http://loinc.org'})
            $scope.input.codeSystems.push({display:'UCUM',url:'http://unitsofmeasure.org'})

            //don't change the rev-comment url!!!!
            $scope.input.codeSystems.push({display:'csReview',url:'http://clinfhir.com/fhir/CodeSystem/review-comment'})
            $scope.input.codeSystems.push({display:'Unknown',url:'http://unknown.com'})

            //system url for folder tags
            $scope.tagFolderSystem = "http://clinfhir.com/fhir/NamingSystem/qFolderTag"

            //system url for author tags
            $scope.tagAuthorSystem = "http://clinfhir.com/fhir/NamingSystem/qAuthorTag"

            //system url for author tags
            $scope.tagCheckout = "http://clinfhir.com/fhir/NamingSystem/qCheckoutTag"


            $scope.qStatus = ["draft","active","retired","unknown"]

            $scope.arHisoStatus = ['development','draft','standard']

            $scope.makeSampleDEP = function(Q) {
                $scope.arResourceInstance = fhirSvc.makeResourceArray(Q)
            }

            //toggle the left pane with the Q list
            $scope.input.leftPane = "col-md-2"
            $scope.input.rightPane = "col-md-10"

            $scope.input.togglePane = function() {
                if ($scope.input.rightPane == "col-md-10") {
                    //console.log('hide left pane')
                    $scope.input.leftPane = "hide"
                    $scope.input.rightPane = "col-md-12"
                } else {
                    //console.log('show left pane')
                    $scope.input.leftPane = "col-md-2"
                    $scope.input.rightPane = "col-md-10"
                }
            }

            $scope.dependencyErrors = function(){
                if ($scope.dependencyAudit) {
                    return $scope.dependencyAudit.filter((aud) => ! aud.ok).length
                } else {
                    return ""
                }

            }

            $scope.doSearch = function(searchText) {
                $scope.searchResults = qSvc.search($scope.selectedQ,searchText)
            }

            $scope.selectSearchItem = function(thing){

                $scope.selectedSearchItem = thing

                let selectedItemId = thing.item.linkId  //the linkId and node id are the same

                $scope.showSection()       //collapse to section level

                //set the selectedNode for this item

                $scope.treeData.forEach(function (node) {
                    if (node.id === selectedItemId) {
                        $scope.selectedNode = node

                        //unselect all nodes
                        $("#designTree").jstree("deselect_all")


                        //need to select that item in the main tree
                        $("#designTree").jstree("select_node", node.id);
                        try {
                        //    $scope.$digest()
                        } catch(ex) {}


                    }
                })



            }

            //uploading a document (Used to upload docs and attach to a Q)
            $scope.uploadDocument = function(){
                let id = "#fileUploadFileRef"    //in qMetadata
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
                    let dr = {resourceType:"DocumentReference",id:'id-' + new Date().getTime(),status:"current",content:[]}
                    let att = {}



                    //works with the readAsArrayBuffer but runs out of stack...const base64String = btoa(String.fromCharCode(...new Uint8Array(data)));

                    att.data =  btoa(data)
                    //works as aboveatt.data = base64String // btoa(data)
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
                            $scope.addAttachment(fileObject.name,pathToDoc)
                            $scope.updateQ()   //update the Q immediately (or the user might forget!)


                        },function (err) {
                            alert(angular.toJson(err))
                        }
                    )



                }

                //perform the read...
                r.readAsBinaryString(fileObject);
            }


            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {
                console.log('auth state change')
                if (user) {
                    console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                    console.log($scope.user)
                    $scope.loadAllQ()
                    $scope.$digest()
                } else {
                    delete $scope.user

                    $scope.loadAllQ()
                    $scope.$digest()
                }



            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    modalService.showModal({}, {bodyText: 'You have been logged out'})

                }, function(error) {
                    modalService.showModal({}, {bodyText: 'Sorry, there was an error logging out - please try again'})
                });

            };


            //--------
            //checkin/out stuff
            //$scope.checkedOutTo is the email of the person the Q is checked out to (if any)

            $scope.codeGroup = function (node) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editCodes.html',
                    backdrop: 'static',
                    controller: 'editCodesCtrl',
                    size : 'vlg',
                    resolve: {
                        item: function () {
                            return node.data.item
                        }
                    }
                }).result.then(
                    function (item) {

                    }
               )
            }

            //when the Q is checked out to the current user, and they want to update the local copy
            $scope.updateLocalCache = function() {
                //save a copy in the local browser cache and clear the dirty flag

                let nameInCache = "coq-" + $scope.selectedQ.url


                now = new Date()

                $localStorage[nameInCache] = $scope.selectedQ

                console.log("Time to generate update local cache ",moment().diff(now))

                //console.log("Updating local cache")
                //delete $scope.dirty
            }

            //make a copy for editing

            $scope.checkout = function(Q) {
                //make a copy of the Q in the local browser. Update the checkout tag on the Q and save.
                //Q is the full Questionnaire loaded after selection
                //miniQ is the Q in the list

                if ($scope.user && $scope.user.email) {
                    $scope.checkoutIdentifier = formsSvc.checkoutQ(Q,$scope.user.email)     //marks the Q with being checked out, returning teh Identifier

                    $scope.updateQ(function(){
                        //update the Q in the forms manager and call back when done


                        let nameInCache = "coq-" + Q.url
                        $localStorage[nameInCache] = Q

                        $scope.miniQ.checkedoutTo = 'me'      //so that the list can be updated

                    })
                }
            }

            //discard the local changes. Clear the checkout flag on the server
            //receives miniQ
            $scope.revert = function(QtoRevert) {
                //get the server copy of the Q
                if (confirm("Are you sure you want to abandon any changes you have made")) {
                    //clear the tag on the server copy of the Q

                let qry = `/ds/fhir/Questionnaire/${QtoRevert.id}`
                $http.get(qry).then(
                    function(data) {

                        let Q = data.data
                        //clear the checkout information
                        formsSvc.clearQCheckout(Q)

                        //now, save the updated Q back to the server
                        let url = "/fm/fhir/Questionnaire/" + QtoRevert.id
                        $http.put(url,Q).then(
                            function (data) {
                                delete QtoRevert.checkedoutTo
                                alert("Local changes have been discarded")
                                $scope.input.dirty = false;
                                processQ(Q)

                            }, function(err) {
                                alert(angular.toJson(err.data))
                            }
                        )


                       // $scope.showLoading = false

                    },
                    function(err) {
                        alert(angular.toJson(err.data))
                    }
                )

                }

            }


            //check the updated copy back in
            $scope.checkin = function() {

                if (confirm("Are you sure you're ready to upload your changes?")) {
                    //Update the checkout tag in the Q first.
                    formsSvc.clearQCheckout($scope.selectedQ)


                    // now save the Q
                    $scope.updateQ(function(){
                        delete $scope.checkoutIdentifier
                        //and clear the browser cache on successful save

                        let nameInCache = "coq-" + $scope.selectedQ.url
                        delete $localStorage[nameInCache]

                        delete $scope.miniQ.checkedoutTo

                        //Now check for any deleted tags (userSelected = true). If there are, then call the delete tag operation for them
                        if ($scope.selectedQ.meta && $scope.selectedQ.meta.tag) {
                            $scope.selectedQ.meta.tag.forEach(function (tag) {
                                if (tag.userSelected) {
                                    let url = `/ds/removeqtag/${$scope.selectedQ.id}`
                                    $http.post(url,tag).then(
                                        function (data) {
                                            console.log('removed tag ',tag)
                                            $scope.loadAllQ()       //if there are multiple tags to delete this will be called multiple times...
                                        }, function (err) {
                                            alert('error updating tag' + angular.toJson( err.data))
                                        }
                                    )
                                }

                            })
                        } else {
                            $scope.loadAllQ()
                        }


                    })
                }



            }

            $scope.retireQ = function() {
                //remove the Q
                if (confirm("Are you sure you want to remove this Questionnaire? (It can be recovered if needed)")) {

                    $scope.selectedQ.status = "retired"
                    let url = "/fm/fhir/Questionnaire/" + $scope.selectedQ.id
                    $http.put(url,$scope.selectedQ).then(

                        function (data) {
                            $scope.loadAllQ()
                            alert("The status of the Questionnaire has been set to 'retired' and will no longer appear in lists.")
                        },
                        function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }
            }

            $scope.publish = function(Q) {

                alert("This will copy the Specification to the public server")
                return

                if (confirm(`Are you sure you want to publish this Standard to the public server (${$scope.publicServer})?`)){
                    //use the custom publish endpoint on the local server to send to the public server


                }
            }

            //------

            $scope.makeQDependancyAudit = function() {
                $scope.dependencyAudit = qSvc.auditDependencies($scope.selectedQ,$scope.hashAllItems)
            }

            $scope.removeAttachment = function(url) {
                formsSvc.removeQAttachment($scope.selectedQ,url)
                $scope.allAttachments = formsSvc.getQAttachments($scope.selectedQ)
                $scope.objFormTemplate = formsSvc.makeFormTemplate($scope.selectedQ)
                $scope.input.dirty = true
                $scope.updateLocalCache()
            }

            $scope.addAttachment = function(title,url) {
                formsSvc.addQAttachment($scope.selectedQ,{title:title,url:url})
                $scope.allAttachments = formsSvc.getQAttachments($scope.selectedQ)
                $scope.objFormTemplate = formsSvc.makeFormTemplate($scope.selectedQ)
                $scope.input.dirty = true
                delete $scope.input.newAttachmentTitle
                delete $scope.input.newAttachmentUrl
            }

            $scope.viewVS = function(url,useRemote){
                $uibModal.open({
                    templateUrl: 'modalTemplates/vsEditor.html',
                    backdrop: 'static',
                    controller: 'vsEditorCtrl',
                    size : 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        },
                        modes: function () {
                            return ['view','edit']  //todo remove select
                        },
                        server : function() {
                            if (useRemote) {
                                return formsSvc.getServers().termServer
                            } else {
                                return null         //defaults to local
                            }

                        }
                    }
                })
            }

            $scope.saveTreeStateDEP = function() {
                $scope.currentTreeState = {}
                $scope.treeData.forEach(function (node){
                    if (node.state.opened) {
                        $scope.currentTreeState[node.id] = 'opened'
                    }

                    // node.state = node.state || {}
                    // node.state.opened = hashState[node.id]
                })
                console.log($scope.currentTreeState)

            }


            $scope.makeChoiceElement = function(node) {

                //$scope.saveTreeState()

                //save current state of tree (todo move to function



                let ar = formsSvc.makeChoiceElement($scope.selectedQ, node.data.item.linkId,$scope.hashAllItems)
                if (ar && ar.length > 0) {
                    //this is a list of items that have a conditional reference to one of the child items being
                    //converted to a list. The conversion did not proceed.
                    console.log(ar)
                    alert(ar)
                }

                let vo = formsSvc.makeTreeFromQ($scope.selectedQ)
                $scope.treeData = vo.treeData       //for drawing the tree

                drawTree()
                makeQDependancyAudit()

             //   $scope.showSection()
                $("#designTree").jstree("select_node",  node.id);
            }

            $scope.addTag = function(code) {

                $scope.selectedQ.extension = $scope.selectedQ.extension || []
                let ext = {url:formsSvc.getFolderTagExtUrl(),valueString:code}
                $scope.selectedQ.extension.push(ext)


                $scope.miniQ.hashFolderTag[code] = code
                delete $scope.input.newTagCode
                if ($scope.folderTags.indexOf(code) == -1) {
                    $scope.folderTags.push(code)
                }


                $scope.updateLocalCache()

                /*
                $scope.folderTags[code] = {code:code}
                $scope.selectedQ.meta = $scope.selectedQ.meta || {}
                $scope.selectedQ.meta.tag = $scope.selectedQ.meta.tag || []
                $scope.selectedQ.meta.tag.push({code:code,system:system,display:display})
                delete $scope.input.newTagDisplay
                delete $scope.input.newTagCode
                $scope.input.dirty = true
                $scope.updateLocalCache()
                */
            }



            $scope.removeTag = function(tag) {
                let extFolderTag = formsSvc.getFolderTagExtUrl()  //the extension url
                let currentExtensions = $scope.selectedQ.extension  //must be present if remove is being called
                $scope.selectedQ.extension = []
                //delete $scope.miniQ
                currentExtensions.forEach(function (ext) {
                    if (ext.url == extFolderTag && ext.valueString == tag) {
                        //do nothing - it will be removed
                    } else {
                        $scope.selectedQ.extension.push(ext)
                    }
                })

                //remove the entry from miniQ

//miniQ.hashFolderTag
                //mark the tag for deletion by setting userselcted to true. Not really the purpose of this element...
                //$scope.selectedQ.meta.tag[inx].userSelected = true


            }

            //clear the currently selected Q when changing selected tag. tag is a string
            $scope.selectTag = function(tag){
                delete $scope.selectedQ
                delete $scope.dependencyAudit
                $localStorage.selectedFolderTag = tag  // .code  //only save the code
            }


            //perform validation functions

            $scope.validateQ = function() {
                //$scope.dependencyReport
                let url = "/ds/fhir/Questionnaire/validate"
                $http.post(url,$scope.selectedQ).then(
                    function(data) {
                        $scope.QValidation = data.data
                    },
                    function(err) {
                        $scope.QValidation = err.data
                    }
                )
            }

            //determines if an individual Q can be shown in the list - folder support
            //note: can't select Q from here as loading Q is now async
            $scope.canShowQDEP = function(miniQ) {

                if ($scope.input.selectedFolderTag == 'all') {
                    return true
                } else {
                   // if (miniQ.hashFolderTag[])
                }

                /*

                if ($scope.input.selectedFolderTag) {
                    //a folder has been selected - does this Q have the required tag?
                    if ($scope.input.selectedFolderTag.code == 'all') {


                        return true
                    } else {
                        if (Q.meta && Q.meta.tag) {
                            let rslt = false
                            Q.meta.tag.forEach(function (tag) {
                                if (tag.system == $scope.tagFolderSystem && tag.code == $scope.input.selectedFolderTag.code) {


                                    rslt = true
                                }
                            })
                            return  rslt
                        } else {
                            return false
                        }
                    }

                } else {
                    return true
                }
*/


            }

            $scope.checkStatusDEP = function (status) {
                //todo check status state machine
                //if the status is active then remove from the ballot list
                if (status == 'active') {
                    if ($scope.isQinBallot()) {
                        alert("An active Q should not also be in the ballot list")
                    } else {
                        $scope.input.dirty = true
                    }
                } else {
                    $scope.input.dirty = true
                }

            }

            //let termServer = "https://r4.ontoserver.csiro.au/fhir/"

            //see what resources are generated on a submit (and any errors)
            $scope.testSubmit = function () {
                if ($scope.selectedQR) {
                    let url = "/fr/testextract"

                    if ($scope.submitChart) {
                        $scope.submitChart.destroy()
                    }

                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}
                    bundle.entry.push({resource:$scope.selectedQR})

                    $http.post(url,bundle).then(
                        function(data) {

                            $scope.extractedResources = []

                            $scope.extractedResources.push({resource:$scope.selectedQR,OO:{},valid:true})
                            //validate all the resources

                            data.data.obs.forEach(function (resource){
                                let url = validationServer + resource.resourceType + "/$validate"
                                $http.post(url,resource).then(
                                    function(data) {
                                        $scope.extractedResources.push({resource:resource,OO:data.data,valid:true})
                                    },function(err){
                                        $scope.extractedResources.push({resource:resource,OO:err.data,valid:false})
                                    }
                                )
                            })

                            //create the graph
                            // todo -  convert the above to promise based...
                            $timeout(function(){
                                let vo = graphSvc.makeGraph({arResources: $scope.extractedResources})

                                let container = document.getElementById('submitGraph');
                                let graphOptions = {
                                    physics: {
                                        enabled: true,
                                        barnesHut: {
                                            gravitationalConstant: -10000,
                                        }
                                    }
                                };
                                $scope.submitChart = new vis.Network(container, vo.graphData, graphOptions);

                                $scope.submitChart.on("click", function (obj) {
                                    let nodeId = obj.nodes[0];  //get the first node
                                    let node = vo.graphData.nodes.get(nodeId);

                                    if (node.data && node.data.resource) {
                                        $scope.selectResource({resource:node.data.resource,OO:{}})
                                        $scope.$digest()
                                    }



                                })

                                $scope.submitChart.on("stabilizationIterationsDone", function () {
                                    $scope.submitChart.setOptions( { physics: false } );
                                });


                            },2000)



                        }, function(err) {
                            alert(angular.toJson(err.data))
                            console.log(err)
                        }
                    )
                }
            }

            $scope.selectResource = function(item) {
                $scope.selectedResource = item.resource
                $scope.selectedResourceValidation = item.OO
            }



            //---- tabbed forms support

            $scope.form = {}
            //when a top level item is selected in the tabbed interface
            $scope.selectSection = function(section) {
                $scope.selectedSection = section
            }


            $scope.expandAll = function() {
                $("#designTree").jstree("open_all");
                //expandAll()
                //drawTree()
            }

            //collapse to sections
            $scope.showSection = function() {

                // close all the elements that have a parent of 'root'

                $("#designTree").jstree("close_all");
                $("#designTree").jstree("open_node","root");


return
                $scope.treeData.forEach(function (item) {
                    //temp - is this helpful?    item.state.opened = true
                    if (item.parent == 'root') {
                        $("#designTree").jstree("close_node",  item.id);

                    }
                })
                drawTree()
            }


            //create a new Q
            $scope.newQ = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/newQ.html',
                    backdrop: 'static',
                    controller: 'newQCtrl',
                    //size : 'lg',
                    resolve: {
                        Q: function () {
                            return null
                        },
                        allQ : function () {
                            return $scope.allQ
                        }
                    }
                }).result.then(
                    function (Q) {
                        if (Q) {
                            Q.id = "cf-" + new Date().getTime()

                            //now set as 'checked out' to current user
                            $scope.checkoutIdentifier = formsSvc.checkoutQ(Q,$scope.user.email)     //marks the Q with being checked out, returning teh Identifier

                            //the empty Q needs to be saved to the server so it will appear in the list of Q
                            let url = "/fm/fhir/Questionnaire/" + Q.id
                            $http.put(url,Q).then(
                                function (data) {
                                    $scope.selectedQ = Q

                                    $scope.miniQ = Q                    //version for the list
                                    $scope.miniQ.checkedoutTo = 'me'      //so that the list can be updated

                                    //copy in browser cache
                                    let nameInCache = "coq-" + Q.url
                                    $localStorage[nameInCache] = Q

                                    $scope.allQ.push($scope.miniQ)

                                    $scope.allQ.sort(function(a,b){
                                        if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                            return 1
                                        } else {
                                            return -1
                                        }
                                    })

                                    $scope.drawQ(Q)

                                },
                                function (err) {
                                    alert(angular.toJson(err.data))
                                })


                        }
                    }
                )
            }



            $scope.importGroup = function(node){
                //the node will be a section node

                $uibModal.open({
                    templateUrl: 'modalTemplates/importGroup.html',
                    backdrop: 'static',
                    controller: 'importGroupCtrl',
                    resolve: {
                        allQ: function () {
                            return $scope.allQ
                        }
                    }
                }).result.then(
                    function (group) {

                        $scope.selectedQ.item.forEach(function (section){
                            if (section.linkId == node.id) {  //node.id = linkId
                                section.item = section.item || []
                                section.item.push(group)
                            }
                        })
                        $scope.treeIdToSelect = node.id
                        $scope.drawQ($scope.selectedQ) //,true)
                        $scope.input.dirty = true;
                        $scope.updateLocalCache()
                        updateReport()


                    }
                )

            }


            $scope.importSection = function(){
                $uibModal.open({
                    templateUrl: 'modalTemplates/importSection.html',
                    backdrop: 'static',
                    controller: 'importSectionCtrl',
                    resolve: {
                        allQ: function () {
                            return $scope.allQ
                        },
                        Q: function () {
                            return $scope.selectedQ
                        }
                    }
                }).result.then(
                    function (arSection) {
                        //add the sections to the Q. The linkIds have been checked to be unique
                        arSection.forEach(function (section) {
                            $scope.selectedQ.item = $scope.selectedQ.item || []
                            $scope.selectedQ.item.push(section)

                            //$scope.treeIdToSelect = node.id
                            $scope.drawQ($scope.selectedQ,true)
                            $scope.input.dirty = true;
                            $scope.updateLocalCache()
                            //$scope.editingQ = false

                            updateReport()
                        })
                    }
                )
            }

            //update the selctedQ on the forms manager server
            $scope.updateQ = function(cb) {
                qSvc.updatePrefix($scope.selectedQ)     //update the item.prefix
                let duplicates = qSvc.checkUniqueLinkId($scope.selectedQ)
                if (duplicates) {
                    alert("Duplicate linkId found:\n " + duplicates + "\n Q not saved.")
                    return
                }

                if ($scope.input.hisoStatus) {
                    formsSvc.setHisoStatus($scope.selectedQ,$scope.input.hisoStatus)
                }

                if ($scope.input.hisoNumber) {
                    formsSvc.setHisoNumber($scope.selectedQ,$scope.input.hisoNumber)
                }


                let url = "/fm/fhir/Questionnaire/" + $scope.selectedQ.id

                $http.put(url,$scope.selectedQ).then(
                    function (data) {

                        $scope.input.dirty = false;
                        if (cb) {
                            cb()
                        }

                    }, function(err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            //------------ QR related functions
            //invoked from ng-blur on for elements in renderSingleItem



            $scope.validateQR = function(QR){

                delete  $scope.qrValidationResult
                let url =  "/ds/fhir/QuestionnaireResponse/validate"
                $http.post(url,QR).then(
                    function(data) {
                        $scope.qrValidationResult = data.data
                    },function(err){
                        $scope.qrValidationResult = err.data

                    }
                )
            }


            $scope.moveUp = function(node) {
                if (! $scope.editingQ) {
                    $scope.editingQ = true

                    $scope.selectedQ = qSvc.moveItem($scope.selectedQ,'up',node.data.item.linkId)
                    // moveItem : function(Q,dirn,linkId) {

                    $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ,false)
                    $scope.updateLocalCache()
                    $scope.input.dirty = true;
                    $scope.editingQ = false

                    updateReport()
                }

            }

            $scope.moveDown = function(node) {
                if (! $scope.editingQ) {
                    $scope.editingQ = true
                    $scope.selectedQ = qSvc.moveItem($scope.selectedQ, 'dn', node.data.item.linkId)
                    // moveItem : function(Q,dirn,linkId) {

                    $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ, false)
                    $scope.updateLocalCache()
                    $scope.input.dirty = true;
                    $scope.editingQ = false

                    updateReport()
                }

            }

            //note that when the Q is build, the structure comes from the tree - not the item.items element.
            $scope.removeElement = function(node) {

                //need to check that this item is not a dependency source
                let hash = $scope.hashAllItems[node.id]
                if (hash && hash.dependencies && hash.dependencies.length > 0) {
                    let msg = ""
                    hash.dependencies.forEach(function (dep) {
                        msg += dep.item.linkId + " "
                    })
                    alert("There are items with a dependency on this one: "+ msg)
                } else {
                    $scope.selectedQ = qSvc.removeItem($scope.selectedQ,node.data.item.linkId)

                    $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ,false)
                    $scope.updateLocalCache()
                    $scope.input.dirty = true;

                    updateReport()
                }



            }

            $scope.editItemFromLinkId = function(linkId){
                let node = findNodeById(linkId)     //the node.id is the same as the linkId
                if (node) {
                    $scope.editItem(node)
                }
                //edit an item just from the linkId
            }

            $scope.editItemFromReport = function (entry) {
                if (entry) {
                    let item = entry.item
                    let node = findNodeById(item.linkId)

                    $scope.editItem(node)
                } else {
                    alert("There is no item with this linkId in the Q")
                }
            }


            //edit an existing item
            $scope.editItem = function(node) {

                let item = node.data.item

                $uibModal.open({
                    templateUrl: 'modalTemplates/editItem.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'editItemCtrl',
                    resolve: {
                        itemTypes: function () {
                            return $scope.input.itemTypes
                        },
                        item: function () {
                            return item
                        },
                        editType: function() {
                            return "edit"
                        },
                        codeSystems: function() {
                            return $scope.input.codeSystems
                        },
                        insertType : function() {
                            return node.data.level
                        },
                        hashAllItems : function() {
                            return $scope.hashAllItems
                        },
                        parent : function(){
                            return $scope.hashAllItems[node.parent]
                        }
                    }
                }).result.then(

                    function (updatedItem) {
                        if (updatedItem) {

                            let originalLinkId
                            //if the linkId has changed, then pass the original linkId into the editItem service so the original can be replaced...
                            if (updatedItem.linkId !== item.linkId) {
                                originalLinkId = item.linkId
                            }

                            qSvc.editItem($scope.selectedQ,updatedItem,originalLinkId)

                            $scope.treeIdToSelect = updatedItem.linkId
                            $scope.drawQ($scope.selectedQ,false)
                            $scope.updateLocalCache()
                            $scope.input.dirty = true;

                            updateReport()
                            $scope.makeQDependancyAudit()
                        }
                    })
            }
            //set up to add new item

            $scope.addItem = function(node,insertType,isSibling) {
                //insertType is 'section' or 'child' or 'grandchild' or 'group'
                //tree.id is the linkId


                //levels root, section, child, grandchild
                let currentLevel = node.data.level      //shouldn't see grandchild here

                $uibModal.open({
                        templateUrl: 'modalTemplates/editItem.html',
                        backdrop: 'static',
                        controller: 'editItemCtrl',
                        size: 'lg',
                        resolve: {
                            itemTypes: function () {
                                return $scope.input.itemTypes
                            },
                            item: function () {
                                return null
                            },
                            editType: function() {
                                return "new"
                            },
                            codeSystems: function() {
                                return $scope.input.codeSystems
                            },
                            insertType : function() {
                                return insertType
                            },
                            hashAllItems : function() {
                                return $scope.hashAllItems
                            },
                            parent : function() {
                                if (isSibling) {
                                    return $scope.hashAllItems[node.parent]
                                } else {
                                    return $scope.hashAllItems[node.id]
                                }

                            }
                        }
                    }).result.then(
                    function (item) {
                        if (item) {
                            if (currentLevel == 'root') {
                                //this is a section - directly off the root
                                $scope.selectedQ.item = $scope.selectedQ.item || []
                                $scope.selectedQ.item.push(item)
                            } else {

                                //the linkId of the item to add this new item to...
                                let parentLinkId = node.id
                                //if a sibling is being added, the linkId is the linkId of the parent...
                                if (isSibling) {
                                    parentLinkId = node.parent
                                }

                                //could be a child or grandchild. need to iterate through the Q to find the parent item
                                $scope.selectedQ = qSvc.addItem($scope.selectedQ,parentLinkId,item)

                            }

                            $scope.treeIdToSelect =  item.linkId    //tree id is the linkid...  node.id
                            $scope.drawQ($scope.selectedQ,false)    //will re-create the tree...
                            $scope.updateLocalCache()
                            $scope.input.dirty = true;

                            updateReport()

                        }
                    })
            }

            //save new item (insert it into the treeData). Later, will convert the tree data to a Q
            //and update. Note that update is only for the items in the Q - leave the others

            function updateReport() {
                qSvc.updatePrefix($scope.selectedQ)
                let vo = formsSvc.generateQReport($scope.selectedQ)
                $scope.report = vo.report
                $scope.hashAllItems = vo.hashAllItems

                makeCsvAndDownload($scope.selectedQ,vo.hashAllItems)
                makeQDownload($scope.selectedQ)
            }

            //-----------  tree utility functions

            //return all the direct child elements of the node
            function findChildElementsDEP(inNode) {
                let ar=[]
                $scope.treeData.forEach(function(node,inx) {
                    if (node.parent == inNode.id) {
                        ar.push(node)
                    }

                })
                return ar
            }

            function findNodeById(id) {
                let resultNode;
                $scope.treeData.forEach(function(node,inx) {
                    if (node.id == id) {
                        resultNode = node
                    }
                })
                return resultNode
            }


            clearWorkArea = function() {
                delete $scope.selectedVs;
                //delete $scope.selectedQ
                delete $scope.expandedVs
                delete $scope.selectedVsItem
            }



            //load a single Q
            function loadQ(QtoSelect) {
                //display the loading alert...
                $scope.showLoading = true

                $('#designTree').jstree('destroy');
                delete $scope.selectedQ
                delete $scope.treeData
                //delete $scope.checkedOutTo      //the email of the person who has checked out this email
                delete $scope.checkoutIdentifier

                delete $scope.input.hisoStatus
                delete $scope.dependencyAudit

                //$timeout(function(){},1)

                let qry = `/ds/fhir/Questionnaire/${QtoSelect.id}`
                let now = new Date(), start = new Date()

                if (QtoSelect.checkedoutTo == 'me') {
                    //if the Q has been checked out to the local user, then get the Q from the local cache
                    let nameInCache = "coq-" + QtoSelect.url


                    try {
                        $scope.$digest()
                    } catch (ex) {}

                    let Q = $localStorage[nameInCache]
                    //$timeout(function(){},100)
                    //console.log('readfromLS')
                    if (!Q) {
                        alert(`The local copy of the model was not found in the browser cache (${nameInCache}). Did you check out on a different machine?`)
                        delete $scope.showLoading

                        //remove the checkout lock on the server Q
                        return

                    }
                    //return

                   // processQ(Q)
                    //a short delay to allow the digest to run and display the loading alert
                    $timeout(function(){
                        processQ(Q)
                    },1)

                    //for some reason which I can't figure out, the showLoading alert won't show unless there is an http
                    //operation here. timeout & digest don't work. In any case, it would be nice to show a diff at some point
                    //so I'll just make the call so that the UI updates
                 /*   $http.get(qry).then(
                        function () {
                            processQ(Q)
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
*/

                } else {
                    $http.get(qry).then(
                        function(data) {
                            console.log('Time to load: ',moment().diff(now))
                            let Q = data.data
                            processQ(Q)
                           // $scope.showLoading = false

                        },
                        function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }
            }

            //set up the UI for the selected Q
            function processQ(Q) {
                //delete $scope.showLoading
                $scope.selectedQ = Q

                $scope.checkoutIdentifier = formsSvc.getCheckoutIdentifier(Q)  //the identifier of who has checked this out (if any)

                $scope.input.hisoStatus = formsSvc.getHisoStatus(Q)
                $scope.input.hisoNumber = formsSvc.getHisoNumber(Q)
                now = new Date()

                let vo = formsSvc.generateQReport(Q)
                console.log("Time to generate report ",moment().diff(now))
                $scope.report = vo.report
                $scope.hashAllItems = vo.hashAllItems       //{item: dependencies: }}
                $scope.makeQDependancyAudit()
                makeCsvAndDownload(Q,vo.hashAllItems)
                makeQDownload(Q)

                $scope.allAttachments = formsSvc.getQAttachments(Q)
                //the template for the forms preview
                //$scope.formTemplate = formsSvc.makeFormTemplate(Q)

                $scope.treeIdToSelect = "root"
                $scope.input.dirty = false

                now = new Date()
                $scope.drawQ(Q,true)        //sets scope.selectedQ
                console.log("Time to make tree ",moment().diff(now))
                $scope.treeIdToSelect = "root"

                //let any other controller that might be interested about the new Q
                $scope.$broadcast("selectedQ",Q)
                //console.log("Time to load complete ",moment().diff(start))

            }


            //when called from Q list. Passes in the 'mini-Q'
            $scope.selectQ = function(QtoSelect) {
                $scope.showLoading = true

                $scope.miniQ = QtoSelect    //save the miniQ so that if the Q is checked in or out rge display can be updated...
                    //As any edits are saved immediately in the local cache, there's nothing stopping an immediate load...
                    //$scope.miniQ = QtoSelect    //save the miniQ so that if the Q is checked in or out rge display can be updated...
                loadQ(QtoSelect)


                //console.log("selecting ",QtoSelect)

            }

            function makeCsvAndDownload(Q,hashAllItems) {
                $scope.exportJsonList = exportSvc.createJsonModel(Q,hashAllItems)

                let csv = exportSvc.createDownloadCSV($scope.exportJsonList)
                let ar = csv.split('\r\n')
                $scope.auditReport = []

                //need to pull out header to allow the table scroll with fixed header

                ar.forEach(function (lne,inx) {
                    if (inx == 0) {
                        $scope.auditReportHeader = lne.split(',')
                    } else {
                        $scope.auditReport.push(lne.split(','))
                    }

                })

                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([csv],{type:"text/csv"}))
                var now = moment().format();
                $scope.downloadLinkCsvName =  Q.name + '_' + now + '.csv';
            }

            function makeQDownload(Q) {
                $scope.downloadLinkQ = window.URL.createObjectURL(new Blob([angular.toJson(Q,null,2)],{type:"application/json"}))
                var now = moment().format();
                $scope.downloadLinkQName =  Q.name + '_' + now + '.json';
            }


            $scope.setDefaults = function(){
                //need to wait for the form to be rendered before checking the defaults
                $scope.form = formsSvc.prepop($scope.selectedQ)
            }

            //perfroms a 'redraw' of the Q - called frequently
            $scope.drawQ = function(Q,resetToSection) {
                //save the current state of node expansion from the jstree - not the treedata!!!
                now = new Date()



                let hashState = {}
                try {
                    let ar = $('#designTree').jstree('get_state').core.open
                    ar.forEach(function (id) {
                        hashState[id] = true
                    })

                } catch (ex) {

                }

                clearWorkArea()
                //$scope.selectedQ = Q

                let vo = formsSvc.makeTreeFromQ(Q)
                $scope.treeData = vo.treeData       //for drawing the tree

                //todo - change to use jstree functions
                if (resetToSection) {
                 //   $scope.showSection()
                } else {
                    //restore the opened state
                    $scope.treeData.forEach(function (node){
                        node.state = node.state || {}
                        node.state.opened = hashState[node.id]
                    })
                }

                drawTree()

                now = new Date()
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                console.log("Time to make form template ",moment().diff(now))
                $scope.formTemplate = $scope.objFormTemplate.template

                $scope.v2List = exportSvc.createV2Report(Q)

                console.log("Time to draw Q ",moment().diff(now))

            }

            let drawTree = function() {
                if (!$scope.treeData) {
                    return
                }


                now = new Date()


                $('#designTree').jstree('destroy');
                //https://www.c-sharpcorner.com/article/drag-and-drop-in-jstree/
                let x = $('#designTree').jstree(
                    {'core':
                            {'multiple': false,
                            'data': $scope.treeData,
                            'check_callback' : function(operation, node, node_parent, node_position, more) {
                                //return false to prevent the tree being updated (we'd re-create it on a successful move anyway
                                delete $scope.dndTarget
                                if (more.ref) {
                                    let target = more.ref.id    //the id of the node being dragged over

                                    let item = $scope.hashAllItems[target].item
                                    if (item && item.type == 'group') {
                                        //only set the drop target for a group
                                        $scope.dndTarget = item
                                        return false
                                    }
                                }

                                return false
                                },
                                'themes': {name: 'proton', responsive: true}},
                        plugins:['dnd','state'],
                        dnd: {
                            'is_draggable' : function(nodes,e) {
                                //don't allow groups to be dragged
                                delete $scope.dndSource
                                let node = nodes[0]
                                if (node.data && node.data.item && node.data.item.type == 'group') {
                                    return false
                                } else {
                                    $scope.dndSource = node.data.item
                                    return true
                                }

                            }
                        }
                    }
                ).on('changed.jstree', function (e, data) {
                    //The node selection event...
                    delete $scope.newItem

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        //todo - get from hashNode

                    }
                    try {
                        $scope.$digest();       //as the event occurred outside of angular...
                    } catch (ex) {}

                }).on('redraw.jstree', function (e, data) {


                    delete $scope.showLoading

                    console.log("Time to draw tree ",moment().diff(now))

                    //ensure the selected node remains so after a redraw...
                    if ($scope.treeIdToSelect) {
                        $("#designTree").jstree("select_node",  $scope.treeIdToSelect);
                        delete $scope.treeIdToSelect
                    }
/*
                    //restore state
                    $scope.treeData.forEach(function(node){
                        if (node.id == data.node.id){
                            node.state.opened = data.node.state.opened;
                        }
                    });
*/

                })
            }

            $(document).on('dnd_stop.vakata', function (e, data) {

                if ($scope.dndSource && $scope.dndTarget) {
                    //this is a valid dnd  - from a non-group to a group.
                    //if the dnd rules change, then the move function may need to change also
                    qSvc.dnd($scope.selectedQ, $scope.dndSource, $scope.dndTarget)       //perform the move

                    //temp $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ, false)
                    $scope.updateLocalCache()
                    $scope.input.dirty = true;
                }

            })

            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })
            }



            $scope.loadAllQ = function() {
                //a summary of fields only - miniQ. Structure may not be exactly the same as a Q (eg folder hash)
                let url = "/ds/fhir/Questionnaire?_elements=url,title,name,description,extension&_sort=name&status:not=retired"
                let t = {code:'all'}
                let extFolderTag = formsSvc.getFolderTagExtUrl()     //the extension url for folder tag extensions
                $scope.folderTags = [] //
                $scope.folderTags.push('all')
                $scope.input.selectedFolderTag = $scope.folderTags[0]

                $http.get(url).then(
                    function (data) {
                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry){

                            //these are 'miniQ' - and have the checkedoutTo entry set to 'me' or the email of the person who has checked it out

                            //create hash of all tag extensions and attach to the miniQ
                            let miniQ = entry.resource
                            miniQ.hashFolderTag = {all:'all'}
                            if (miniQ.extension) {
                                miniQ.extension.forEach(function (ext) {
                                    if (ext.url == extFolderTag) {
                                        let tag = ext.valueString
                                        miniQ.hashFolderTag[ext.valueString] = tag
                                        if ($scope.folderTags.indexOf(tag) == -1) {
                                            $scope.folderTags.push(tag)
                                        }
                                        //$scope.folderTags[ext.valueString] = ext.valueString
                                    }
                                })
                            }

                            //get the checkout status for the model. This is used for display, and also if the model is to be edited will cause the local copy to be edited
                            //when the full Q is loaded, the $scope.checkoutIdentifier variable is set. Used to control the actions..
                            let checkOut = formsSvc.getCheckoutIdentifier(entry.resource)
                            if (checkOut) {
                                //this model is checked out to someone
                                if ($scope.user && $scope.user.email == checkOut.value) {
                                    entry.resource.checkedoutTo = 'me'

                                    //need to see if a tag has been added - it may need to be added to the folder list
                                    let nameInCache = "coq-" + miniQ.url
                                    let Q = $localStorage[nameInCache]
                                    if (Q && Q.extension) {
                                        Q.extension.forEach(function(ext) {
                                            if (ext.url == extFolderTag) {
                                                let tag = ext.valueString
                                                miniQ.hashFolderTag[ext.valueString] = tag
                                                if ($scope.folderTags.indexOf(tag) == -1) {
                                                    $scope.folderTags.push(tag)
                                                }
                                                //$scope.folderTags[ext.valueString] = ext.valueString
                                            }
                                        })
                                    }

                                } else {
                                    entry.resource.checkedoutTo = checkOut.value
                                }
                            }


                            $scope.allQ.push(miniQ)
                            //console.log(entry.resource.extension)

/*
                            //populate tag list - todo this should go...
                            if (entry.resource && entry.resource.meta && entry.resource.meta.tag) {
                                entry.resource.meta.tag.forEach(function (tag) {
                                    if (tag.system == $scope.tagFolderSystem) {
                                        $scope.folderTags[tag.code] = tag
                                    }
                                })
                            }
                            */

                        })

                        if ($scope.QfromUrl) {
                            // a Q was specified when the page was loaded...
                            let ar = $scope.allQ.filter(item => item.url == decodeURIComponent($scope.QfromUrl))
                            if (ar.length > 0) {
                                $scope.input.togglePane()
                                $scope.selectQ(ar[0])
                            }
                        } else {

                        }

                        //this is used in the 'ValueSets used' top level tab. Think I drop that anyway...
                        //$scope.hashTerminology = terminologySvc.setValueSetHash($scope.allQ)

                        //set any saved foldertag
                        if ($localStorage.selectedFolderTag) {
                            $scope.input.selectedFolderTag = $localStorage.selectedFolderTag // $scope.folderTags[$localStorage.selectedFolderTag]

                        } else {
                            //select the first one
                        }
                    }
                )
            }

            //now done when the auth state changes as the user identity is needed
            //$scope.loadAllQ()
        })
