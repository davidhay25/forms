angular.module("formsApp")
    .controller('editCodesCtrl',
        function ($scope,$http,item,formsSvc) {

            //todo important - if implementre-ordering, need to adjust the original values array

            let server = formsSvc.getServers().termServer //let server = "https://r4.ontoserver.csiro.au/fhir/"

            $scope.mode = "designer"  //other is valueSet

            $scope.clone = angular.copy(item)

            if (item.code) {
                $scope.itemCode = item.code[0].code
            }


            let hashConceptCode = {}



            $scope.save = function() {

                //set the code of the overall item
                $scope.clone.code = $scope.clone.code || [{system:'http://snomed.info/ct'}]
                $scope.clone.code[0].code = $scope.itemCode


                //create a 'mapping' table between old & new codes so dependencies can be adjusted
              //this will need adjustment if the ability to add of move codes is added...
                let arMapping = []
                if (item.answerOption) {
                    item.answerOption.forEach(function (ao,inx) {
                        let map = {original:ao,mapped:$scope.clone.answerOption[inx]}
                        arMapping.push(map)
                    })
                }


                $scope.$close({item:$scope.clone,mapping:arMapping})
            }

            $scope.setMode = function(mode) {
                $scope.createValueSet()
                $scope.mode = mode
            }


            $scope.createValueSet = function () {
                //assume that they are all snomed codes. If not, will need to filter by system
                let vs = {resourceType:'ValueSet',status:'draft',url:$scope.clone.answerValueSet,compose:{include:[]}}

                let include = {system:'http://snomed.info/ct',concept:[]}
                if ($scope.clone.answerOption) {
                    $scope.clone.answerOption.forEach(function (ao) {
                        include.concept.push({code:ao.valueCoding.code,display:ao.valueCoding.display})
                    })
                }
                vs.compose.include.push(include)

                $scope.vs = vs

            }

            //update the selected answer option from the lookup
            $scope.updateDisplayFromLookup = function(display) {
                if ($scope.selectedAnswerOption) {
                    $scope.selectedAnswerOption.valueCoding.display = display
                }
            }

            //todo should replace the display with the vakue from the term serv.
            $scope.selectConcept = function (ao,code) {
                $scope.selectedAnswerOption = ao
                delete $scope.err
                code = code || "195967001"

                delete $scope.children
                delete $scope.parents


                $scope.selectedCode = code

                delete $scope.selectedConceptLookup

                let concept = {code:code}
                concept.system = "http://snomed.info/sct"

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
                    }, function (err) {
                        $scope.err = err.data
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


        }
    )