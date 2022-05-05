//Dashboard controller

angular.module("formsApp")
    .controller('dashboardCtrl',
        function ($scope,$http,formsSvc,$uibModal,$localStorage,qSvc,exportSvc,terminologySvc,graphSvc,$timeout) {


            //load all the disposition Observations for a Q
            $scope.loadDispositionsForQ = function(Q) {
                delete $scope.dispositionsForQ
                $scope.selectedQ = Q
                formsSvc.loadDispositionsForQ(Q).then(
                    function(data) {
                        $scope.dispositionsForQ = data

                    }
                )
            }



            $scope.input = {}
            $scope.input.itemTypes = ['string','quantity','text','boolean','decimal','integer','date','choice','open-choice','display','group','reference','display']

            $scope.input.codeSystems = []
            $scope.input.codeSystems.push({display:'Snomed',url:'http://snomed.info/sct'})
            $scope.input.codeSystems.push({display:'Loinc',url:'http://loinc.org'})
            $scope.input.codeSystems.push({display:'Ucum',url:'http://unitsofmeasure.org'})

            //don't change the rev-comment url!!!!
            $scope.input.codeSystems.push({display:'csReview',url:'http://clinfhir.com/fhir/CodeSystem/review-comment'})
            $scope.input.codeSystems.push({display:'Unknown',url:'http://unknown.com'})

            $scope.qStatus = ["draft","active","retired","unknown"]
            $scope.checkStatus = function (status) {
                //todo check status state machine
                //if the status is active then remove from the ballot list
                if (status == 'active') {
                    if ($scope.isQinBallot()) {
                        alert("An active Q should not also be in the ballot list")
                    }
                } else {
                    $scope.input.dirty = true
                }


            }

            let termServer = "https://r4.ontoserver.csiro.au/fhir/"

            $localStorage.formsVS = $localStorage.formsVS || []
            if ($localStorage.formsVS.length == 0) {

                $localStorage.formsVS.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $localStorage.formsVS.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})
            }

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
                            console.log(data)
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


                                    console.log(obj)
                                    if (node.data && node.data.resource) {
                                        $scope.selectResource({resource:node.data.resource,OO:{}})
                                        $scope.$digest()
                                    }



                                })

                                $scope.submitChart.on("stabilizationIterationsDone", function () {
                                    $scope.submitChart.setOptions( { physics: false } );
                                });

                                console.log(vo)
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
            $scope.completedAnswersInSection = function(section) {

                let cnt = 0
                section.item.forEach(function (item){
                    if ($scope.form[item.linkId]) {
                        cnt ++
                    }
                })

                return cnt
            }


            // --------- provenance stuff
/*
            $http.get("/ds/fhir/Provenance").then(
                function(data){
                    $scope.allProvenance = []
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry){
                            $scope.allProvenance.push(entry.resource)
                        })
                    }
                }, function(err) {

                }
            )

            $scope.selectProvenance = function(prov) {
                $scope.selectedProvenance = prov
            }

*/

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


            $scope.makeCSVDEP = function() {
                let csv = exportSvc.createDownloadCSV($scope.selectedQ)
                console.log(csv)
            }

            $scope.input.vsList = $localStorage.formsVS

            if (!  $scope.input.vsList)  {

                $scope.input.vsList = []      //populate from List of VS from forms server

                $scope.input.vsList.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $scope.input.vsList.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})

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

            $scope.editQDEP = function(Q) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editQ.html',
                    backdrop: 'static',
                    controller: 'editQCtrl',
                    resolve: {
                        Q: function () {
                            return Q
                        }
                    }
                }).result.then(
                    function (Q) {
                        if (Q) {

                            $scope.drawQ(Q)
                        }
                    }
                )

            }

            $scope.importGroup = function(node){
                //the node will be a section node
                console.log(node)

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
                        console.log(group)
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

            $scope.makeQR = function() {
                //console.log('makeQR',$scope.form,$scope.hashItem)
                //$scope.formQR = formsSvc.makeQR($scope.selectedQ, $scope.form)

                $scope.selectedQR = formsSvc.makeQR($scope.selectedQ, $scope.form)
                //console.log($scope.formQR)
            }

            $scope.validateQR = function(QR){
                let url = formsSvc.getServers().validationServer + "QuestionnaireResponse/$validate"
                $http.post(url,QR).then(
                    function(data) {
                        $scope.qrValidationResult = data.data
                    },function(err){
                        $scope.qrValidationResult = err.data

                    }
                )
            }

            //--------------------

/*
            let updateAfterEditDEP = function(){
                let items = formsSvc.makeQItemsFromTree($scope.treeData)
                $scope.selectedQ.item = items;
                $scope.drawQ($scope.selectedQ)
            }


            let sectionHash = {}
            let makeSectionHash = function(treeData){

            }
*/
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

                let linkId = node.data.item.linkId

                $scope.selectedQ = qSvc.removeItem($scope.selectedQ,node.data.item.linkId)


                $scope.treeIdToSelect = node.id
                $scope.drawQ($scope.selectedQ,false)
                $scope.input.dirty = true;

                updateReport()


            }

            $scope.editItemFromLinkId = function(linkId){
                let node = findNodeById(linkId)     //the node.id is the same as the linkId
                if (node) {
                    $scope.editItem(node)
                }
                //edit an item just from the linkId
            }

            $scope.editItemFromReport = function (entry) {
               // console.log(entry)
                let item = entry.item
                let node = findNodeById(item.linkId)
                /*
                let node = {data:{}}
                node.data.item = item
                node.data.level = "item"
                node.id = entry.item.linkId     //needed to find node in tree...
                */
                $scope.editItem(node)
            }


            //edit an existing item
            $scope.editItem = function(node) {

               // let parentId = node.parent

                let item = node.data.item
                //console.log(node.data.level)    //child or parent
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


                            //delete $scope.selectedSection

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
            }

            //-----------  tree utility functions



            //return all the direct child elements of the node
            function findChildElements(inNode) {
                let ar=[]
                $scope.treeData.forEach(function(node,inx) {
                    if (node.parent == inNode.id) {
                        ar.push(node)
                    }

                })
                return ar
            }

            //find the position of the indicated node in the treeData
            function findPositionInTree(inNode) {
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

            $scope.expandVSDEP = function(url,filter) {
                let qry =  termServer + "ValueSet/$expand?url=" + url
                if (filter) {
                    qry += "&filter="+filter
                }

                $http.get(qry).then(
                    function(data){
                        $scope.expandedVs  = data.data

                    }, function(err) {

                    }
                )
            }

            $scope.selectVS = function(vsItem) {
                clearWorkArea()
                $scope.selectedVsItem = vsItem
                let qry =  termServer + "ValueSet?url=" + vsItem.url

                //get the ValueSet resource
                $scope.showWaiting = true;
                $http.get(qry).then(
                    function(data){
                        let bundle = data.data
                        if (bundle.entry && bundle.entry.length > 0) {
                            //todo think about multiple VS with the same url... ? get most recent version
                            $scope.selectedVs = bundle.entry[0].resource
                        }

                    }, function(err) {

                    }
                ).finally(function(){
                    $scope.showWaiting = false;
                })
            }

            //used by the preview for coded elements
            $scope.getConcepts = function(val,url) {
                $scope.showWaiting = true
                let qry =  termServer + "ValueSet/$expand?url=" + url
                //let qry = "https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=" + url
                qry += "&filter=" + val

                return $http.get(qry).then(
                    function(data){
                        //console.log(data.data)
                        let vs = data.data
                        if (vs.expansion) {
                            let ar = []
                            return vs.expansion.contains

                        } else {
                            return [{display:"no matching values"}]
                        }

                        //return [{display:"aaa"},{display:'bbbb'}]
                    },
                    function(err){
                        console.log(err)
                        return [{display:"no matching values"}]
                    }
                ).finally(
                    function(){
                        $scope.showWaiting = false
                    }
                )
            };

            clearWorkArea = function() {
                delete $scope.selectedVs;
                delete $scope.selectedQ
                delete $scope.expandedVs
                delete $scope.selectedVsItem
            }

            //when called from Q list
            $scope.selectQ = function(Q) {
                if ($scope.input.dirty) {
                    if (confirm("the Q has been updated. If you select another the changes will be lost. Are you sure you want to select this one?")) {
                        $scope.drawQ(Q,true)
                        $scope.treeIdToSelect = "root"
                        $scope.input.dirty = false
                    }
                } else {


                    //for the summary tab...
                    let vo = formsSvc.generateQReport(Q)
                    $scope.report = vo.report
                    $scope.hashAllItems = vo.hashAllItems       //{item: dependencies: }}

                    makeCsvAndDownload(Q,vo.hashAllItems)

                    //the template for the forms preview
                    //$scope.formTemplate = formsSvc.makeFormTemplate(Q)
                    $scope.drawQ(Q,true)
                    $scope.treeIdToSelect = "root"
                }
            }

            function makeCsvAndDownload(Q,hashAllItems) {
                $scope.exportJsonList = exportSvc.createJsonModel(Q,hashAllItems)

                let csv = exportSvc.createDownloadCSV($scope.exportJsonList)

                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([csv],{type:"text/csv"}))
                var now = moment().format();
                $scope.downloadLinkCsvName =  Q.name + '_' + now + '.csv';

               // console.log(csv)
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
                $scope.selectedQ = Q
               // - not doing audit I think... $scope.QAudit = formsSvc.auditQ(Q)      //the audit report
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
                makeFormDef()
                //$scope.formTemplate = formsSvc.makeFormTemplate(Q)
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)
                $scope.formTemplate = $scope.objFormTemplate.template
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
                                            //console.log('good')
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

                        //console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).on('redraw.jstree', function (e, data) {

                    //ensure the selected node remains so after a redraw...
                    if ($scope.treeIdToSelect) {
                        $("#designTree").jstree("select_node", "#" + $scope.treeIdToSelect);
                        delete $scope.treeIdToSelect
                    }
                    //console.log($scope.treeData)

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
/*
            $(document).on('dnd_start.vakata', function (e, data) {
                console.log('Started');
            });
*/
            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            //used in the preview
            function makeFormDef() {
                return  //todo - think this is no longer used...


                formsSvc.makeFormDefinition(angular.copy($scope.treeData)).then(
                    function (data) {
                        $scope.formDef = data
                    }
                )

            }

            function loadAllQ() {
                let url = "/ds/fhir/Questionnaire"
                //let url = "/fm/fhir/Questionnaire"
                $http.get(url).then(
                    function (data) {
                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry){

                            $scope.allQ.push(entry.resource)

                        })
                        $scope.hashTerminology = terminologySvc.setValueSetHash($scope.allQ)
                       // console.log($scope.hashTerminology)
                    }
                )
            }

            loadAllQ()
        })
