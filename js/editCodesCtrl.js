angular.module("formsApp")
    .controller('editCodesCtrl',
        function ($scope,$http,item) {

            let server = "https://r4.ontoserver.csiro.au/fhir/"

            $scope.clone = angular.copy(item)
            if (item.code) {
                $scope.itemCode = item.code[0].code
            }


            let hashConceptCode = {}

            $scope.selectConcept = function (code) {

                code = "195967001"

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