
angular.module("formsApp")
    .controller('fhirCtrl',
        function ($scope,fhirSvc,graphSvc,$http,$uibModal) {

            $scope.instance = {}        //analagous to input as a holder instance



            $scope.selectResource = function(resource) {
                $scope.instance.resource = resource
            }

            $scope.validate = function() {
                delete  $scope.validationErrors, $scope.validationSuccess
                let validationServer = "http://home.clinfhir.com:8054/baseR4/"

                $scope.validationBundle = makeBundle($scope.instance.arResourceInstance)
                let qry = validationServer + "Bundle/$validate"
                $http.post(qry,$scope.validationBundle).then(
                    function (data) {

                        $scope.validationErrors = data.data
                    },function (err) {
                        $scope.validationErrors = err.data

                    }
                )
            }

            $scope.selectFromValidation = function(loc,iss){
                $scope.selectedValidationIssue = iss.diagnostics
                //Bundle.entry[1].resource
                let ar = loc.split('[')
                let ar2 = ar[1].split(']')
console.log(ar2[0])
                let seq = parseInt(ar2[0])
                if (seq) {
                    $scope.selectedFromValidation = $scope.instance.arResourceInstance[seq-1].resource
                }
            }

            function makeBundle(arResources) {
                let serverRoot = "http://canshare.co.nz/fhir/"
                let bundle = {resourceType:"Bundle",type:"collection",entry:[]}
                arResources.forEach(function (vo) {
                    let entry = {resource:vo.resource}
                    entry.fullUrl = serverRoot + vo.resource.resourceType + "/" + vo.resource.id
                    bundle.entry.push(entry)
                })
                return bundle
            }


            //edit the mapping components of the model
            $scope.editItem = function(item) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editMapping.html',
                    backdrop: 'static',
                    controller: function ($scope,item) {

                        $scope.save = function () {
                            $scope.$close()
                        }


                    },
                    //size : 'lg',
                    resolve: {
                        item: function () {
                            return item
                        }
                    }
                }).result.then(
                    function (vo) {

                        updateMappingItem({linkId:item.linkId})



                    }
                )
            }

            //generate the sample
            //todo add QR to the list for data
            $scope.makeSample = function(Q) {
                $scope.selectedQ = Q        //save the Q so we can make changes to it...

                let vo = fhirSvc.makeResourceArray(Q)

                $scope.instance.arResourceInstance = vo.resources
                $scope.instance.arMappingItems = vo.arMappingItems
                $scope.instance.processLog = vo.processLog
                makeGraph($scope.instance.arResourceInstance)

                $scope.validate()       //always validate
                    /*
                $timeout(function(){
                    makeGraph($scope.instance.arResourceInstance)
                },1000)
*/
            }

            //update the mapping funciton in the Q from
            function updateMappingItemDEP(vo) {
                let linkId = vo.linkId
                $scope.selectedQ.item.forEach(function (section) {
                    section.item.forEach(function (child) {
                        if (child.item) {
                            //a group
                        } else {
                            // a leaf
                            if (child.linkId == linkId) {
                                makeChange(child)
                            }

                        }

                    })

                })

                function makeChange(item) {
                    item.text = item.text + " updated"
                }

            }

            function makeGraph(arResources) {
                let vo = graphSvc.makeGraph({arResources: arResources})

                let container = document.getElementById('instanceGraph');
                let graphOptions = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };

                $scope.instanceGraph = new vis.Network(container, vo.graphData, graphOptions);

                $scope.instanceGraph.on("click", function (obj) {
                    let nodeId = obj.nodes[0];  //get the first node
                    let node = vo.graphData.nodes.get(nodeId);

                    //$scope.selectedFromSingleGraph = node.resource;



                    if (node.data && node.data.resource) {
                        console.log(node.data.resource)
                        $scope.instance.graphResource = node.data.resource
                        //$scope.selectResource({resource:node.data.resource,OO:{}})
                        $scope.$digest()
                    }



                })

                $scope.instanceGraph.on("stabilizationIterationsDone", function () {
                    $scope.instanceGraph.setOptions( { physics: false } );      //stop movement after stabilization
                });

            }


        }
    )


