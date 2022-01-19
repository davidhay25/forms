//Dashboard controller

angular.module("formsApp")
    .controller('dashboardCtrl',
        function ($scope,$http,formsSvc) {

            $scope.QVS = []

            $scope.input = {}

            let termServer = "https://r4.ontoserver.csiro.au/fhir/"

            $scope.vsList = []      //populate from List of VS
            $scope.vsList.push({display:"Yes, No, Don't know",description:"Standard VS to replace boolean",url:"http://hl7.org/fhir/ValueSet/yesnodontknow"})
            $scope.vsList.push({display:"Condition codes",description:"Codes used for Condition.code",url: "http://hl7.org/fhir/ValueSet/condition-code"})




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

            clearWorkArea = function() {
                delete $scope.selectedVs;
                delete $scope.selectedQ
                delete $scope.expandedVs
                delete $scope.selectedVsItem
            }

            $scope.selectQ = function(Q) {
                clearWorkArea()
                $scope.selectedQ = Q
                let vo = formsSvc.makeTreeFromQ(Q)
                $scope.treeData = vo.treeData
                $scope.hashItem = vo.hash
                drawTree()
                makeFormDef()
            }

            let drawTree = function(){
                if (! $scope.treeData) {
                    return
                }

                expandAll()
                //deSelectExcept()
                $('#designTree').jstree('destroy');
                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': $scope.treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })
                console.log($scope.treeData)

            }

            let expandAll = function() {
                $scope.treeData.forEach(function (item) {
                    item.state.opened = true;
                })

            }

            function makeFormDef() {
                $scope.formDef = angular.copy($scope.treeData)
                $scope.formDef.splice(0,1)      //remove the root

                //expand the valueset into the form def
                $scope.formDef.forEach(function (def) {
                    /*
                    if (def.data && def.data.type == 'choice' && def.data.vsName) {
                        //find the valueset by name and copy into the model

                        $scope.QVS.forEach(function (vs) {
                            if (vs.name == def.data.vsName) {
                                def.data.vs = angular.copy(vs)      // here are the contents for the form preview
                            }
                        })

                    }

                    */
                })

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
