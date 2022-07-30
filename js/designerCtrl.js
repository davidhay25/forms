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

                if (user) {
                    console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                    console.log($scope.user)
                    $scope.$digest()
                } else {
                    delete $scope.user
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



            //------

            $scope.removeAttachment = function(url) {
                formsSvc.removeQAttachment($scope.selectedQ,url)
                $scope.allAttachments = formsSvc.getQAttachments($scope.selectedQ)
                $scope.objFormTemplate = formsSvc.makeFormTemplate($scope.selectedQ)
                $scope.input.dirty = true
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

            $scope.addTag = function(code,system,display) {
                $scope.folderTags[code] = {code:code}
                $scope.selectedQ.meta = $scope.selectedQ.meta || {}
                $scope.selectedQ.meta.tag = $scope.selectedQ.meta.tag || []
                $scope.selectedQ.meta.tag.push({code:code,system:system,display:display})
                delete $scope.input.newTagDisplay
                delete $scope.input.newTagCode
                $scope.input.dirty = true
            }

            //removing a tag means using the meta-delete operation
            $scope.removeTag = function(inx) {
                let tags = $scope.selectedQ.meta.tag.splice(inx,1)
                let url = `/ds/removeqtag/${$scope.selectedQ.id}`
                $http.post(url,tags[0]).then(
                    function (data) {
                       // alert('Folder tag')
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
/*
console.log(tags)
                let params = {resourceType: "Parameters",parameter:[]}
                let param = {name:'meta'}
                param.valueMeta = {tag:tags[0]}
                params.parameter.push(param)

*/

            }



            //clear the currently selected Q when changing selected tag
            $scope.selectTag = function(tag){
                delete $scope.selectedQ
                $localStorage.selectedFolderTag = tag.code  //only save the code
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
            $scope.canShowQ = function(Q) {
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

            let termServer = "https://r4.ontoserver.csiro.au/fhir/"
/*
            $localStorage.formsVS = $localStorage.formsVS || []
            if ($localStorage.formsVS.length == 0) {

                $localStorage.formsVS.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $localStorage.formsVS.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})
            }
            */
/*
            //retrieve the list of Qs to be balloted
            formsSvc.getBallotList().then(
                function (list) {
                    $scope.ballotList = list
                }
            )

            //return true if this Q is in the ballot list
            $scope.isQinBallot = function() {
                if ($scope.selectedQ && $scope.ballotList && $scope.ballotList.entry) {
                    let ref = `Questionnaire/${$scope.selectedQ.id}`
                    let ar = $scope.ballotList.entry.filter(e => e.item.reference == ref)
                    if (ar.length >0 ) {
                        return true
                    }

                }

            }


            $scope.addToBallotList = function() {
                //add the current Q to the ballot list
                formsSvc.addQtoBallotList($scope.selectedQ).then(
                    function (list) {
                        $scope.ballotList = list
                        alert("Form has been added to the list to be balloted")

                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )
            }
            
            $scope.removeFromBallotList = function () {
                formsSvc.removeQfromBallotList($scope.selectedQ).then(
                    function (list) {
                        $scope.ballotList = list
                        alert("Form has been removed from the list to be balloted")
                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )
            }

            */

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

                                    //$scope.selectedFromSingleGraph = node.resource;



                                    if (node.data && node.data.resource) {
                                        $scope.selectResource({resource:node.data.resource,OO:{}})
                                        $scope.$digest()
                                    }



                                })

                                $scope.submitChart.on("stabilizationIterationsDone", function () {
                                    $scope.submitChart.setOptions( { physics: false } );
                                });


                            },2000)

                            //add other resources so they're visible in the display
                            //$scope.extractedResources.push({resource:$scope.QR,OO:{},valid:true})


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

            //count the number of completed answers in each section - used by tabbed form...
            $scope.completedAnswersInSectionDEP = function(section) {

                let cnt = 0
                section.item.forEach(function (item){
                    if ($scope.form[item.linkId]) {
                        cnt ++
                    }
                })

                return cnt
            }



            $scope.expandAll = function() {
                expandAll()
                drawTree()
            }

            //collapse to sections
            $scope.showSection = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })
                drawTree()
            }

/*

            if (!  $scope.input.vsList)  {

                $scope.input.vsList = []      //populate from List of VS from forms server

                $scope.input.vsList.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $scope.input.vsList.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})

            }

*/
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
                            //Q.resourceType = "Questionnaire"
                            $scope.selectedQ = Q
                            $scope.updateQ(function(){
                                $scope.allQ.push(Q)
                                $scope.drawQ(Q)
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
                        updateReport()


                        /*
                        //add the sections to the Q. The linkIds have been checked to be unique
                        arSection.forEach(function (section) {
                            $scope.selectedQ.item = $scope.selectedQ.item || []
                            $scope.selectedQ.item.push(section)

                            //$scope.treeIdToSelect = node.id
                            $scope.drawQ($scope.selectedQ,true)
                            $scope.input.dirty = true;
                            //$scope.editingQ = false

                            updateReport()
                        })
                        */
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
                        alert("Questionnaire updated on the Forms Manager")
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

            $scope.makeQRDEP = function() {
                $scope.selectedQR = formsSvc.makeQR($scope.selectedQ, $scope.form)
            }

            $scope.validateQR = function(QR){
                //let url = formsSvc.getServers().validationServer + "QuestionnaireResponse/$validate"
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
                    $scope.input.dirty = true;

                    updateReport()
                }
                /*

                let item = hash.item    //there must be an entre in hashallitems



                if (item.de)

                //if ()
                let isaSource = ""
                Object.keys($scope.hashAllItems).forEach(function (key) {
                    if (key !== node.id) {
                        let item = $scope.hashAllItems[key].item
                        if (item.enableWhen) {
                            item.enableWhen.forEach(function (ew) {
                                if (ew.question == node.id) {isaSource += key + " "}
                            })
                        }
                    }
                })

                if () {
                   // if (isaSource) {

                    alert("There are items with a dependency on this one: "+ isaSource)
                } else {
                    $scope.selectedQ = qSvc.removeItem($scope.selectedQ,node.data.item.linkId)


                    $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ,false)
                    $scope.input.dirty = true;

                    updateReport()
                }

                //let linkId = node.data.item.linkId

*/


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
                            $scope.input.dirty = true;

                            updateReport()
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

            //find the position of the indicated node in the treeData
            function findPositionInTreeDEP(inNode) {
                let index = -1
                $scope.treeData.forEach(function(node,inx) {
                    if (node.id == inNode.id) {
                        index = inx
                    }

                })
                return index
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

                delete $scope.input.hisoStatus
                let qry = `/ds/fhir/Questionnaire/${QtoSelect.id}`
                let now = new Date(), start = new Date()
                $http.get(qry).then(
                    function(data) {
                        console.log('Time to load: ',moment().diff(now))
                        let Q = data.data
                        $scope.selectedQ = Q
                        $scope.input.hisoStatus = formsSvc.getHisoStatus(Q)
                        $scope.input.hisoNumber = formsSvc.getHisoNumber(Q)
                        now = new Date()

                        let vo = formsSvc.generateQReport(Q)
                        console.log("Time to generate report ",moment().diff(now))
                        $scope.report = vo.report
                        $scope.hashAllItems = vo.hashAllItems       //{item: dependencies: }}

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
                        console.log("Time to load complete ",moment().diff(start))

                        $scope.showLoading = false

                    },
                    function(err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            //when called from Q list
            $scope.selectQ = function(QtoSelect) {
                console.log("selecting ",QtoSelect)
                if ($scope.input.dirty) {
                    if (confirm("the Q has been updated. If you select another the changes will be lost. Are you sure you want to select this one?")) {
                        loadQ(QtoSelect)

                    }
                } else {

                    //the Q that was passed in is only a minimal Q. load the complete one first
                    loadQ(QtoSelect)



                }
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

                if (resetToSection) {
                    $scope.showSection()
                } else {
                    //restore the opened state
                    $scope.treeData.forEach(function (node){
                        node.state = node.state || {}
                        node.state.opened = hashState[node.id]
                    })
                }

                drawTree()
                //makeFormDef()
                //$scope.formTemplate = formsSvc.makeFormTemplate(Q)
                now = new Date()
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                console.log("Time to make form template ",moment().diff(now))
                $scope.formTemplate = $scope.objFormTemplate.template

                $scope.v2List = exportSvc.createV2Report(Q)

              //  $scope.input.dirty = false
            }

            let drawTree = function() {
                if (!$scope.treeData) {
                    return
                }

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
                        plugins:['dnd'],
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


                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).on('redraw.jstree', function (e, data) {

                    //ensure the selected node remains so after a redraw...
                    if ($scope.treeIdToSelect) {
                        $("#designTree").jstree("select_node", "#" + $scope.treeIdToSelect);
                        delete $scope.treeIdToSelect
                    }


                })
            }

            $(document).on('dnd_stop.vakata', function (e, data) {

                if ($scope.dndSource && $scope.dndTarget) {
                    //this is a valid dnd  - from a non-group to a group.
                    //if the dnd rules change, then the move function may need to change also
                    qSvc.dnd($scope.selectedQ, $scope.dndSource, $scope.dndTarget)       //perform the move

                    //temp $scope.treeIdToSelect = node.id
                    $scope.drawQ($scope.selectedQ, false)
                    $scope.input.dirty = true;
                }

            })

            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            //used in the preview
            function makeFormDefDEP() {
                return  //todo - think this is no longer used...


                formsSvc.makeFormDefinition(angular.copy($scope.treeData)).then(
                    function (data) {
                        $scope.formDef = data
                    }
                )

            }

            $scope.loadAllQ = function() {
                //a summary of fields only
                let url = "/ds/fhir/Questionnaire?_elements=url,title,name,description"
                let t = {code:'all'}
                $scope.folderTags = {} //
                $scope.folderTags['all'] = t
                $scope.input.selectedFolderTag = $scope.folderTags['all']

                $http.get(url).then(
                    function (data) {
                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry){
                            $scope.allQ.push(entry.resource)

                            //populate tag list
                            if (entry.resource && entry.resource.meta && entry.resource.meta.tag) {
                                entry.resource.meta.tag.forEach(function (tag) {
                                    if (tag.system == $scope.tagFolderSystem) {
                                        $scope.folderTags[tag.code] = tag
                                    }
                                })
                            }

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
                            $scope.input.selectedFolderTag = $scope.folderTags[$localStorage.selectedFolderTag]

                        } else {
                            //select the first one
                        }
                    }
                )
            }

            $scope.loadAllQ()
        })
