//controller for forms UI. Mayme move to a directive at some stage...

angular.module("formsApp")
    .controller('formsCtrl',
        function ($scope,$http,formsSvc,$uibModal) {


            //return true if the item will be extracted as an observation by the forms receiver
            $scope.observationExtract = function(item) {
                let extUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
                let ar = formsSvc.findExtension(item,extUrl)
                //console.log(ar)
                if (ar.length > 0) {
                    return true
                }

            }

            //when a top level item is selected in the tabbed interface
            $scope.selectSection = function(section) {
                $scope.selectedSection = section

            }

            //count the number of completed answers in each section - used by tabbed form...
            $scope.completedAnswersInSection = function(section) {
                //console.log(section)
                let cnt = 0
                section.item.forEach(function (item){
                    if ($scope.form[item.linkId]) {
                        cnt ++
                    }
                })

                return cnt

            }


            //determine if an element should be displayed
            $scope.showConditional = function (cell) {

                if (! cell.meta) {
                    console.log(cell.item.text + " no meta")
                }

                //the group item doesn't have a meta directly
                if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                    return false
                }

                return formsSvc.checkConditional(cell.item,$scope.form)



            }

            //code to show (or not) a conditional group - limited to Coding comparisons ATM
            $scope.showConditionalGroupDEP = function(group) {
                return formsSvc.checkConditional(group,$scope.form)
/*
                //console.log(item)
               // if (item.length > 0) {
                    //we're assuming that there is only a single item of type group
                    //let group = item[0]
                    if (group.enableWhen && group.enableWhen.length > 0) {
                        let conditional = group.enableWhen[0]       //only looking at the first one for now
                        console.log(conditional)
                        let referenceValue = $scope.form[conditional.question]  //the value from the form to be compared
                        console.log(referenceValue)
                        if (referenceValue) {
                            switch(conditional.operator) {
                                case '=' :
                                    //todo - check for different datatypes...
                                    return checkEqualCoding(referenceValue.valueCoding,conditional.answerCoding)

                                    break
                            }
                        }
                    }
               // }
                */
            }

            //a function to check whether 2 codings are equal
            function checkEqualCodingDEP(source,target) {
                if ((source.system == target.system) && (source.code == target.code)) {
                    return true
                }

            }

            //the type of this item is reference
            $scope.selectResourceFromService = function (item) {
                console.log(item)

                let ar = formsSvc.findExtension(item,"http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource")

                console.log(ar)
                if (ar.length > 0) {
                    let resourceType = ar[0].valueCode
                    console.log(resourceType)

                    $uibModal.open({
                        templateUrl: 'modalTemplates/selectFromHPI.html',
                        backdrop: 'static',
                        controller: function($scope,resourceType,serverRoot,formsSvc){
                            $scope.resourceType = resourceType
                            $scope.formsSvc = formsSvc

                            $scope.selectResource = function(resource) {
                                $scope.$close(resource)
                            }

                            $scope.selectFromHPI = function (name) {
                                let qry = serverRoot + resourceType
                                    if (name) {
                                        qry += "?name=" + name
                                    }
                                $http.get(qry).then(
                                    function (data) {
                                        $scope.matchesBundle = data.data
                                    }
                                )
                            }

                        },
                        resolve: {
                            resourceType: function () {
                                return resourceType
                            },
                            serverRoot: function () {
                                return formsSvc.getHPIRoot()
                            }
                        }
                    }).result.then(
                        function (resource) {

                            console.log(resource)
                            //this is actually the scope from the parent...

                            if (resource.resourceType == "Practitioner") {
                                $scope.form[item.linkId] =
                                    {reference:resourceType + "/" + resource.id,display:formsSvc.getHN(resource.name[0])}
                            } else {
                                //Organization
                                $scope.form[item.linkId] =
                                    {reference:resourceType + "/" + resource.id,display:resource.name}
                            }



                                //also the parent scope
                            $scope.makeQR(item.linkId)
                            //currently only a practitioner, but could
                        }
                    )


                }


            }

        }
    )