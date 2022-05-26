angular.module("formsApp")
    .controller('coderCtrl',
        function ($scope,$http,termUpdateSvc,formsSvc) {

            $scope.input = {};
            let server = "https://r4.ontoserver.csiro.au/fhir/"

            $scope.input.filter = "indic"   //temp


            $scope.input.valueSets = []
            $scope.input.valueSets.push({display:"Observable Entities",id:""})  //todo - maybe url
            $scope.input.valueSets.push({display:"Another VS",id:""})

            $scope.input.vs = $scope.input.valueSets[0]

            let hashConceptCode = {}

            $scope.setCode = function(concept) {
                $scope.selectedItem.code = [concept]
            }

            $scope.loadQ = function(miniQ) {
                delete $scope.expandedVS
                clearSelection()
                $http.get(`/ds/fhir/Questionnaire/${miniQ.id}`).then(
                    function(data) {
                        $scope.selectedQDetail = data.data   //the full Q
                        let vo = formsSvc.makeTreeFromQ($scope.selectedQDetail)

                        //show sections
                        vo.treeData.forEach(function (item) {
                            item.state.opened = true
                            if (item.parent == 'root') {
                                item.state.opened = false;
                            }
                        })

                        drawTree(vo.treeData)       //for drawing the tree

                    }
                )
            }

            let url = "/ds/fhir/Questionnaire?_elements=url,title,name,description"
            $http.get(url).then(
                function(data) {
                    $scope.allQ = []
                    data.data.entry.forEach(function (entry) {

                        $scope.allQ.push(entry.resource)
                    })
                    //note that 'input.selectedQ' this is the Q from the the all list - not the details
                   $scope.input.selectedQ = $scope.allQ[0]
                   $scope.loadQ($scope.allQ[0])

                }
            )

            //load a Q as a trial


            let drawTree = function(treeData) {


                $('#designTree').jstree('destroy');

                //https://www.c-sharpcorner.com/article/drag-and-drop-in-jstree/
                let x = $('#designTree').jstree(
                    {'core':
                            {'multiple': false,
                                'data': treeData,
                                'themes': {name: 'proton', responsive: true}}

                    }
                ).on('changed.jstree', function (e, data) {
                    //The node selection event...
                    clearSelection()
                    delete $scope.newItem
                    delete $scope.expandedVS

                    if (data.node) {
                        clearSelection()
                        $scope.selectedNode = data.node;

                        $scope.input.filter = $scope.selectedNode.text
                        $scope.selectedItem = data.node.data.item
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })
            }


            clearSelection = function () {
                delete $scope.selectedConcept
                delete $scope.parents
                delete $scope.children

            }

            $scope.selectConcept = function (concept) {

                clearSelection()
                concept.system = concept.system || "http://snomed.info/sct"
                $scope.selectedConcept = concept

                let qry = `${server}CodeSystem/$lookup?system=${concept.system}&code=${concept.code}&includeDefinition=true`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function (data) {
                        $scope.selectedConceptLookup = data.data

                        if ($scope.selectedConceptLookup.parameter) {

                            if (! $scope.selectedConcept.display) {     //when selected from parent or child
                                for (var i=0; i <$scope.selectedConceptLookup.parameter.length; i++) {
                                    let p = $scope.selectedConceptLookup.parameter[i]
                                    if (p.name == "display") {
                                        $scope.selectedConcept.display = p.valueString

                                        break
                                    }

                                }
                            }


                            $scope.parents = getRelations($scope.selectedConceptLookup.parameter,'parent')
                            $scope.children = getRelations($scope.selectedConceptLookup.parameter,'child')
                        }
                    }
                ).finally(function() {
                    $scope.showWaiting = false
                })
            }

            function getRelations(params,type) {
                // go through all the parameters
                let ar = []
                params.forEach(function (param) {
                    if (param.name == 'property' && param.part) {
                        let isMatch = false
                        let value;
                        param.part.forEach(function (part) {
                            if (part.name == 'code' && part.valueCode == type) {
                                isMatch = true
                            }
                            if (part.name == 'value'  ) {
                                value = part.valueCode
                            }
                        })
                        if (isMatch && value) {
                            getConceptName(value,function(display){
                                ar.push({sctId:value,display:display})
                            })
                           // let display = getConceptName(value)

                            //now get the


                        }


                    }
                })
                return ar

            }

            function getConceptName(sctid,cb) {
                if (hashConceptCode[sctid]) {
                    cb(hashConceptCode[sctid])
                } else {
                    let qry = `${server}CodeSystem/$lookup?code=${sctid}&system=http://snomed.info/sct`
                    //let url = `${server}\CodeSystem?code=${sctid}`
                    $http.get(qry).then(
                        function(data) {
                            //returns a Parameters resource
                            let display = "Unknown display"
                            for (var i=0; i < data.data.parameter.length; i++) {
                                let p = data.data.parameter[i]
                                if (p.name == "display") {
                                    display = p.valueString
                                    hashConceptCode[sctid] = display
                                    break
                                }

                            }
                            cb(display)
                            //cb("test")
                        }

                    )
                }

            }

            $scope.findByFilter = function(filter) {
                clearSelection()
                delete $scope.expandedVS
                let qry =`${server}ValueSet/canshare-oe/$expand?filter=${filter}`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function (data) {
                        $scope.expandedVS = data.data

                    }
                ).finally(function(){
                    $scope.showWaiting = false
                })


            }


        })