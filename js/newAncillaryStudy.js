angular.module("formsApp")
    .controller('newAncillaryStudyCtrl',
        function ($scope) {
            $scope.input = {}
            $scope.input.fail = "Insufficient material\nOther"
            $scope.input.notdone = "Insufficient material\nOther"
            $scope.input.results = "Failed"

            $scope.save = function() {
                $scope.makeItems()
                $scope.$close($scope.group)
            }

            $scope.makeItems = function() {

                let prefix = $scope.input.name

                //first create the group item that will have all the details for the ancillary test
                $scope.group = makeGroup(prefix,$scope.input.text)

                $scope.group.item.push(workflowItem(prefix))

                //the result list.
                let dep1 = {linkId:$scope.input.name + "-workflow",code:"done", op:'='}
                $scope.group.item.push(makeChoice("results","Result",$scope.input.results,dep1))

                //the reason not done list
                let dep2 = {linkId:$scope.input.name + "-workflow",code:"notdone", op:'='}
                $scope.group.item.push(makeChoice("notdone-reason","Reason not done",$scope.input.notdone,dep2))

                //the 'other' reason for not done. when not-done reason
                let dep3 = {linkId:$scope.input.name + "-notdone-reason",code:"other", op:'='}
                $scope.group.item.push(makeInput("notdone-reason-other","Other reason not done",dep3))

                //the failure reasons
                let dep4 = {linkId:$scope.input.name + "-results",code:"failed", op:'='}
                $scope.group.item.push(makeChoice("failed-reason","Failure reason",$scope.input.fail,dep4))

                //the 'other' reason for fail
                let dep5 = {linkId:$scope.input.name + "-failed-reason",code:"other", op:'='}
                $scope.group.item.push(makeInput("fail-reason-other","Other reason failed",dep5))

                //primary methodology
                if ($scope.input.primary) {
                    //the failure reasons
                    let dep6 = {linkId:$scope.input.name + "-workflow",code:"done", op:'='}
                    $scope.group.item.push(makeChoice("primary-methodology","Primary methodology",$scope.input.primary,dep6))
                }

                //secondary methodology
                if ($scope.input.secondary) {
                    //the failure reasons
                    let dep7 = {linkId:$scope.input.name + "-workflow",code:"done", op:'='}
                    $scope.group.item.push(makeChoice("secondary-methodology","Secondary methodology",$scope.input.secondary,dep7))
                }

                //the 'other' reason for fail
                let dep8 = {linkId:$scope.input.name + "-workflow",code:"done", op:'='}
                $scope.group.item.push(makeInput("comment","Comment",dep8))

               // console.log()

            }

            //the 'top level' group
            function makeGroup(suffix,text) {
                let item = {}
                item.linkId = $scope.input.name + "-" + suffix
                item.type = 'group'
                item.text = text
                item.item = []




                return item
            }

            function makeInput(suffix,text,dep) {
                let item = {}
                item.linkId = $scope.input.name + "-" + suffix
                item.type = 'string'
                item.text = text

                if (dep) {
                    item.enableWhen = []
                    item.enableWhen.push({question:dep.linkId,operator:dep.op,answerCoding:{code:dep.code}})
                }
                return item
            }

            function makeChoice(suffix,text,txtOptions,dep) {
                let item = {}
                item.linkId = $scope.input.name + "-" + suffix
                item.type = 'choice'
                item.text = text
                item.answerOption = []
                let ar = txtOptions.split('\n')
                ar.forEach(function (lne) {
                    if (lne) {
                        let code = lne.replace(/\s+/g, '').toLowerCase()  //remove all spaces
                        item.answerOption.push({valueCoding:{display:lne,code:code}})
                    }
                })
                //create the dependency
                if (dep) {
                    item.enableWhen = []
                    item.enableWhen.push({question:dep.linkId,operator:dep.op,answerCoding:{code:dep.code}})
                }

                return item
            }


            function workflowItem(prefix) {
                //the initial dropdown - done / not done

                let item = {}
                item.linkId = $scope.input.name + "-workflow"
                item.type = 'choice'
                item.text = "Was the test performed"
                item.answerOption = []
                item.answerOption.push({valueCoding:{display:"Performed",code:"done"}})
                item.answerOption.push({valueCoding:{display:"Not Performed",code:"notdone"}})

                //set 'done' as the default
                item.initial = []
                item.initial.push({valueCoding:{display:"Done",code:"done"}})
                return item

            }

        }
    )