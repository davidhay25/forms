//Dashboard controller

angular.module("formsApp")
    .controller('dashboardCtrl',
        function ($scope,$http,formsSvc,$uibModal,$localStorage) {

            $scope.QVS = []

            $scope.input = {}
            $scope.input.itemTypes = ['string','quantity','text','decimal','integer','date','dateTime','choice','open-choice','display']

            $scope.input.codeSystems = []

            $scope.input.codeSystems.push({display:'Snomed',url:'http://snomed.info/sct'})
            $scope.input.codeSystems.push({display:'Loinc',url:'http://loinc.org'})
            $scope.input.codeSystems.push({display:'Ucum',url:'http://unitsofmeasure.org'})

            let termServer = "https://r4.ontoserver.csiro.au/fhir/"

            $localStorage.formsVS = $localStorage.formsVS || []
            if ($localStorage.formsVS.length == 0) {

                $localStorage.formsVS.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $localStorage.formsVS.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})
            }



            // --------- provenance stuff

            $http.get("/ds/fhir/Provenance").then(
                function(data){
                    $scope.allProvenance = []
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry){
                            $scope.allProvenance.push(entry.resource)
                        })
                    }



                    console.log($scope.allProvenance)

                }, function(err) {

                }
            )

            $scope.selectProvenance = function(prov) {
                $scope.selectedProvenance = prov
            }
            //----------


            $scope.expandAll = function() {
                expandAll()
                drawTree()

            }
            $scope.showSection = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })
                drawTree()
            }


            $scope.input.vsList = $localStorage.formsVS

            if (!  $scope.input.vsList)  {

                $scope.input.vsList = []      //populate from List of VS from forms server

                $scope.input.vsList.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
                $scope.input.vsList.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})

            }


            //retrieve the Provenance resources


            //create a new Q
            $scope.newQ = function() {
                $scope.editQ()
            }

            $scope.editQ = function(Q) {

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
                            //if a Q is passed back, it is a new one

                            $scope.drawQ(Q)
                        }
                    }
                )

            }

            $scope.addVS = function(){
                alert("To be developed")
            }



            //update the selctedQ on the forms manager server
            $scope.updateQ = function() {
                let url = "/fm/fhir/Questionnaire/" + $scope.selectedQ.id
                $http.put(url,$scope.selectedQ).then(
                    function (data) {
                        alert("Q updated on the Forms Manager")
                        $scope.input.dirty = false;
                    }, function(err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            let updateAfterEdit = function(){
                let items = formsSvc.makeQItemsFromTree($scope.treeData)
                $scope.selectedQ.item = items;
                $scope.drawQ($scope.selectedQ)
            }


            let sectionHash = {}
            let makeSectionHash = function(treeData){

            }

            $scope.moveUp = function(node) {
                if (node.data.level == 'child') {
                    //if previous node in the tree has the same parent, then can swap with it
                    let inx = findPositionInTree(node)
                    if (inx > 0) {
                        let previous = $scope.treeData[inx-1]
                        if (previous.parent == node.parent) {
                            //same parent, can swap
                            $scope.treeData.splice(inx-1,0,node)
                            $scope.treeData.splice(inx+1,1)
                            $scope.treeIdToSelect = node.id
                            updateAfterEdit()
                            $scope.input.dirty = true
                        } else {
                            alert("Already at the top of the section")
                        }
                    }
                } else {
                    //create an array of sections
                    //if not at top then can swap
                    //swapping means moving a set of items - can get that from the array of sections
                    console.log($scope.treeData)
                    alert("Section movement not yet enabled")
                }

            }

            $scope.moveDown = function(node) {
                if (node.data.level == 'child') {
                    //if next node in the tree has the same parent, then can swap with it
                    let inx = findPositionInTree(node)
                    if (inx > 0) {
                        let next = $scope.treeData[inx+1]
                        if (next.parent == node.parent) {
                            //same parent, can swap
                            $scope.treeData.splice(inx,1)
                            $scope.treeData.splice(inx+1,0,node)

                            $scope.treeIdToSelect = node.id
                            updateAfterEdit()
                            $scope.input.dirty = true

                        } else {
                            alert("Already at the bottom of the section")
                        }
                    }
                } else {
                    //create an array of sections
                    //if not at top then can swap
                    //swapping means moving a set of items - can get that from the array of sections
                    alert("Section movement not yet enabled")
                }

            }

            //note that when the Q is build, the structure comes from the tree - not the item.items element.
            $scope.removeElement = function(node) {
                let level = node.data.level
                if (level == 'child') {
                    //just delete it
                    let inx = findPositionInTree(node)
                    if (inx > -1) {
                        $scope.treeIdToSelect = $scope.treeData[inx-1].id   //select the previous one...

                        $scope.treeData.splice(inx,1)




                        drawTree()

                    }
                } else if (level == 'parent') {
                    //require that child elements are removed first

                    let ar = findChildElements(node)
                    if (ar.length > 0) {
                        alert("You need to remove all the child elements first")
                        return
                    } else {
                        //no children, can remove
                        let inx = findPositionInTree(node)
                        if (inx > -1) {
                            $scope.treeData.splice(inx,1)
                            drawTree()
                        }
                    }

                }

                let items = formsSvc.makeQItemsFromTree($scope.treeData)
                $scope.selectedQ.item = items;
                $scope.drawQ($scope.selectedQ)
            }


            //edit an existing item
            $scope.editItem = function(node) {
                let item = node.data.item
                $uibModal.open({
                    templateUrl: 'modalTemplates/editItem.html',
                    backdrop: 'static',
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
                        }
                    }
                }).result.then(
                    function (updatedItem) {
                        let inx = findPositionInTree(node)

                        let element = $scope.treeData[inx]
                        element.text = updatedItem.text
                        element.data.item = updatedItem

                        let items = formsSvc.makeQItemsFromTree($scope.treeData)
                        $scope.selectedQ.item = items;

                        $scope.treeIdToSelect = node.id

                        makeFormDef()
                        drawTree()
                        $scope.input.dirty = true
                        //node.data.item = item
                    })
            }
            //set up to add new item

            $scope.addItem = function(node,insertType) {
                //insertType is 'child' or 'sibling'

                let newItem = {}
                newItem.tmp = {codeSystem: $scope.input.codeSystems[0] } //default to snomed
                newItem.linkId = "id-" + new Date().getTime()
                newItem.type = $scope.input.itemTypes[0]
                newItem.text = 'Test insert'

                //$scope.newItem.insertType = type;
                let parentItem = node.data.item
                let parentPosition = findPositionInTree(node)
                if (parentPosition > -1) {

                    $uibModal.open({
                        templateUrl: 'modalTemplates/editItem.html',
                        backdrop: 'static',
                        controller: 'editItemCtrl',
                        resolve: {
                            itemTypes: function () {
                                return $scope.input.itemTypes
                            },
                            item: function () {
                                return newItem
                            },
                            editType: function() {
                                return "new"
                            },
                            codeSystems: function() {
                                return $scope.input.codeSystems
                            }
                        }
                    }).result.then(
                        function (item) {
                            //return the item to insert into the tree...

                            //create the new treeview node
                            let newNode = {id: item.linkId,state:{},data:{}}      //the treeview node
                            newNode.text = item.text;    //text to display in the tree
                            newNode.data = {item:item}


                            //the level is where the node sits relative to the parent
                            switch (insertType) {
                                case 'section' :
                                    //a new section. Add to the end with the parent as 'root'
                                    newNode.parent = 'root'
                                    newNode.data.level = 'parent'
                                    $scope.treeData.splice($scope.treeData.length+1,0,newNode)
                                    break
                                case 'element' :
                                    //the selected node is a child of the parent node
                                    if (node.parent == 'root') {        //ie the parent is a section
                                        //this is a child element
                                        newNode.parent = node.id
                                        newNode.data.level = 'child'

                                        //ensure that the parent is set appropriately
                                        //todo - this only works if only parents are off the root
                                        node.data.item.type = 'group'   //it must be a group
                                        node.data.level = 'parent'      //? need to check for root?

                                        $scope.treeData.splice(parentPosition+1,0,newNode)
                                    } else {
                                        //this is a leaf off a section
                                        newNode.parent = node.parent
                                        newNode.data.level = 'child'

                                        //ensure that the parent is set appropriately
                                        node.data.item.type = 'group'   //it must be a group
                                        node.data.level = 'parent'
                                        $scope.treeData.splice(parentPosition+1,0,newNode)

                                    }
                                    //newNode.parent = node.id
                                    //newNode.data.level = 'child'
                                    break

                            }

                            $scope.treeIdToSelect = newNode.id

                            let items = formsSvc.makeQItemsFromTree($scope.treeData)
                            $scope.selectedQ.item = items;

                            $scope.drawQ($scope.selectedQ)    //sets up tree & draws it
                            $scope.input.dirty = true

                            makeFormDef()


                        })
                }

/*return

                $scope.newItem = {}
                $scope.newItem.tmp = {codeSystem: $scope.input.codeSystems[0] } //default to snomed

                $scope.newItem.linkId = "id-" + new Date().getTime()
                $scope.newItem.type = $scope.input.itemTypes[0]
                $scope.newItem.text = 'Test insert'

                $scope.newItem.insertType = type;
*/
            }

            //save new item (insert it into the treeData). Later, will convert the tree data to a Q
            //and update. Note that update is only for the items in the Q - leave the others

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

            $scope.expandVS = function(url,filter) {
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
                    $scope.drawQ(Q,true)
                    $scope.treeIdToSelect = "root"
                }

            }

            //perfroms a 'redraw' of the Q - called frequently
            $scope.drawQ = function(Q,resetToSection) {
                //save the current state of node expansion
                let hashState = {}
                if ($scope.treeData) {
                    $scope.treeData.forEach(function (node){
                        hashState[node.id] = node.state.opened

                    })
                }


                clearWorkArea()
                $scope.selectedQ = Q
                $scope.QAudit = formsSvc.auditQ(Q)      //the audit report
                let vo = formsSvc.makeTreeFromQ(Q)
                $scope.treeData = vo.treeData       //for drawing the tree
                // - not currently used? $scope.hashItem = vo.hash
                //expandAll()
                //$scope.treeIdToSelect = "root"
                if (resetToSection) {
                    $scope.showSection()
                } else {
                    //restore the opened state
                    $scope.treeData.forEach(function (node){

                        node.state.opened = hashState[node.id]

                    })
                }

                drawTree()
                makeFormDef()
              //  $scope.input.dirty = false
            }

            let drawTree = function() {
                if (!$scope.treeData) {
                    return
                }

                //expandAll()
                //deSelectExcept()
                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': $scope.treeData, 'themes': {name: 'proton', responsive: true}}}
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

                }).on('dblclick.jstree', function (e, data) {
/*
                    if (data.node) {
                        $scope.selectedNode = data.node;

                        $scope.editItem()
                    }
                    */

                    //ensure the selected node remains so after a redraw...
                  //alert('dbl')

                })
            }

            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            //used in the preview
            function makeFormDef() {


                formsSvc.makeFormDefinition(angular.copy($scope.treeData)).then(
                    function (data) {
                        $scope.formDef = data
                    }
                )


                //$scope.formDef = angular.copy($scope.treeData)
                //$scope.formDef.splice(0,1)      //remove the root



            }



            function loadAllQ() {
                let url = "/fm/fhir/Questionnaire"
                $http.get(url).then(
                    function (data) {

                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry){
                            $scope.allQ.push(entry.resource)
                        })

                    }
                )
            }

            loadAllQ()
        })
