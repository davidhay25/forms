angular.module("formsApp")
    .controller('newAncillaryStudyCtrl',
        function ($scope) {

            $scope.input = {}
            $scope.input.fail = "Insufficient material\nOther"
            $scope.input.notperformedreason = "Not publicly funded\nInsufficient material\nOther"
            $scope.input.results = "Positive\nNegative\nInconclusive"
            $scope.input.inconclusive = "Insufficient material\nOther"
            $scope.input.status = "Completed\nFailed"


            //This is a codesystem defined so that the wizard can be implemented. ConceptMap can be user
            //to convert to SNOMED codes
            let system = "http://canshare.co.nz/fhir/CodeSystem/ancillary-test-codes"

            //these 2 just for testing
           // $scope.input.methodology = "method1\nmethod2"
            $scope.input.guidelines = "guide1\nguide2"

            $scope.save = function() {
                $scope.makeItems()
                $scope.$close($scope.group)
            }

            $scope.makeItems = function() {

                let prefix = $scope.input.name

                //first create the group item that will have all the details for the ancillary test
                $scope.group = makeGroup(prefix,$scope.input.text)

                $scope.group.item.push(workflowItem(prefix))

                //primary methodology - triggered if the workflow was performed
          /*      if ($scope.input.methodology) {
                    //the methodology
                    let dep6 = {linkId:$scope.input.name + "-workflow",code:"performed", op:'='}
                    $scope.group.item.push(makeChoice("methodology","Methodology",$scope.input.methodology,dep6))
                }
*/
                //the test status. if he workflow was 'performed'
                let dep1b = {linkId:$scope.input.name + "-workflow",code:"performed", op:'='}
                $scope.group.item.push(makeChoice("status","Status",$scope.input.status,dep1b))

                //add boolean for primary methodology
                //dependant on is performed
                $scope.group.item.push(makeBoolean("primary-methodology","Is primary methodology",dep1b))

                //the result list. if the test status was completed
                let dep1 = {linkId:$scope.input.name + "-status",code:"completed", op:'='}
                $scope.group.item.push(makeChoice("results","Result",$scope.input.results,dep1))

                //the reason not done list
                let dep2 = {linkId:$scope.input.name + "-workflow",code:"notperformed", op:'='}
                $scope.group.item.push(makeChoice("notPerformed-reason","Reason not performed",$scope.input.notperformedreason,dep2))

                //the 'other' reason for not done. when not-done reason
                let dep3 = {linkId:$scope.input.name + "-notPerformed-reason",code:"other", op:'='}
                $scope.group.item.push(makeInput("notPerformed-reason-other","Other reason not performed",dep3))

                //the failure reasons when the status is failed
                let dep4 = {linkId:$scope.input.name + "-status",code:"failed", op:'='}
                $scope.group.item.push(makeChoice("failed-reason","Failure reason",$scope.input.fail,dep4))

                //the 'other' reason for fail
                let dep5 = {linkId:$scope.input.name + "-failed-reason",code:"other", op:'='}
                $scope.group.item.push(makeInput("failed-reason-other","Other reason failed",dep5))

                //the inconclusive reasons
                let dep4a = {linkId:$scope.input.name + "-results",code:"inconclusive", op:'='}
                $scope.group.item.push(makeChoice("inconclusive-reason","Inconclusive reason",$scope.input.inconclusive,dep4a))

                //the 'other' reason for inconclusive
                let dep4b = {linkId:$scope.input.name + "-inconclusive-reason",code:"other", op:'='}
                $scope.group.item.push(makeInput("inconclusive-reason-other","Other reason inconclusive",dep4b))


                //if the result was inconclusive



                /*
                //secondary methodology
                if ($scope.input.secondary) {
                    //the failure reasons
                    let dep7 = {linkId:$scope.input.name + "-workflow",code:"done", op:'='}
                    $scope.group.item.push(makeChoice("secondary-methodology","Secondary methodology",$scope.input.secondary,dep7))
                }
*/
                //guidelines. Show if the workflow was performed
                let dep1a = {linkId:$scope.input.name + "-workflow",code:"performed", op:'='}
                $scope.group.item.push(makeChoice("guidelines","Guidelines",$scope.input.guidelines,dep1a))

                //the 'comment
                let dep8 = {linkId:$scope.input.name + "-workflow",code:"performed", op:'='}
                $scope.group.item.push(makeInput("comment","Comment",dep8))



               // console.log()

            }

            //the 'top level' group
            function makeGroup(suffix,text) {
                let item = {}
                item.linkId = suffix
                //item.linkId = $scope.input.name + "-" + suffix
                item.type = 'group'
                item.text = text
                item.item = []
                item.code = [{code:"ancillary"}]     //temp

                //add the SDC extension to support definition based extraction
                let ext

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

            function makeBoolean(suffix,text,dep) {
                let item = {}
                item.linkId = $scope.input.name + "-" + suffix
                item.type = 'boolean'
                item.text = text

                if (dep) {
                    item.enableWhen = []
                    item.enableWhen.push({question:dep.linkId,operator:dep.op,answerCoding:{code:dep.code}})
                }
                return item
            }

            function makeChoice(suffix,text,txtOptions,dep) {
                let item = {}

                let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"radio-button"}]}
                item.extension = [ext]


                item.linkId = $scope.input.name + "-" + suffix
                item.type = 'choice'
                item.text = text
                item.answerOption = []
                if (txtOptions) {
                    let ar = txtOptions.split('\n')
                    ar.forEach(function (lne) {
                        if (lne) {
                            let code = lne.replace(/\s+/g, '').toLowerCase()  //remove all spaces
                            item.answerOption.push({valueCoding:{display:lne,code:code}})
                        }
                    })
                }


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

                let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                ext.valueCodeableConcept = {coding:[{system:"http://hl7.org/fhir/questionnaire-item-control",code:"radio-button"}]}
                item.extension = [ext]

                item.linkId = $scope.input.name + "-workflow"
                item.type = 'choice'
                item.text = "Was the test performed"
                item.answerOption = []
                item.answerOption.push({valueCoding:{display:"Performed",code:"performed"}})
                item.answerOption.push({valueCoding:{display:"Not Performed",code:"notperformed"}})

                //set 'done' as the default - not any more
             //   item.initial = []
              //  item.initial.push({valueCoding:{display:"Performed",code:"performed"}})
                return item

            }

        }
    )