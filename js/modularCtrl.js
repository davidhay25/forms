angular.module("formsApp")
    .controller('modularCtrl',
        function ($scope,$http) {

            $scope.input = {}
            $scope.allQ = []        //all the sub-Q in the Q

            //cf-1653444860285
            $scope.listQ = ['cf-1653444860285','cf-1654205531202']
            let ctr = 0

            let treeData = []
            let root = {id:'root',text:'Root',parent:'#',state:{}}
            treeData.push(root)

            function addItemToTree(parent,item,level,chapterId) {
                let idForThisItem =  chapterId + "-" + item.linkId
                let thisItem = angular.copy(item)
                delete thisItem.item
                let node = {id:idForThisItem,text:item.text,parent:parent,data:{level:level,item:thisItem}}
                treeData.push(node)
                if (item.item) {
                    item.item.forEach(function (child) {
                        let newLevel = "item"
                        if (child.item) {
                            newLevel = 'group'
                         }
                        addItemToTree(idForThisItem,child,newLevel,chapterId)
                    })
                }
            }

            function addQToTree(Q) {
                //create a parent for this Q
                let qParentId = `q${ctr}`
                let node = {id:qParentId,text:Q.title || `q${ctr}`,parent:"root",data:{level:'chapter'}}
                ctr++
                treeData.push(node)
                Q.item.forEach(function (item) {
                    addItemToTree(qParentId,item,'section',qParentId)
                })
            }


            //load all the sub-Q and construct a single tree
            async function load() {
                for (const id of $scope.listQ) {

                    let qry = `/ds/fhir/Questionnaire/${id}`
                    let result = await $http.get(qry)
                    $scope.allQ.push(result.data)
                    console.log(result.data.url)
                    addQToTree(result.data)

                }

                drawTree(treeData)


            }

            load()

            $scope.selectQ = function(Q) {
                $scope.input.selectedQ = Q
            }

            let drawTree = function(treeData){

                $('#fullTree').jstree('destroy');

                let x = $('#fullTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    // the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).on('loaded.jstree',function(){
                    $("#fullTree").jstree("close_all");
                    $("#fullTree").jstree("open_node","root");
                })


            }



            /*


            $http.get(qry).then(
                function(data) {
                    $scope.input.selectedQ = data.data
                }
            )

*/

        }
    )