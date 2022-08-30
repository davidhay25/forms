angular.module("formsApp")
    .controller('importGroupCtrl',
        function ($scope,$http,allQ) {

            $scope.allQ = allQ
            $scope.input = {}
            $scope.input.section = {}

            $scope.canInsert = function () {
                let canInsert = false
                if ($scope.input.section) {
                    Object.keys($scope.input.section).forEach(function (key) {
                        if ($scope.input.section[key]) {
                            canInsert = true
                        }
                    })
                }

                return canInsert
            }

            $scope.showGroup = function(group) {
                $scope.selectedGroup = group
            }

            $scope.selectExistingQ = function (eQ) {
                //get all the groups in this section
                $scope.arGroups = []

                $http.get(`/ds/fhir/Questionnaire/${eQ.id}`).then(
                    function(data) {
                        $scope.eQ = data.data

                        if ($scope.eQ.item) {
                            $scope.eQ.item.forEach(function (sect){
                                if (sect.item) {
                                    let sectionGroups = {section:sect,groups:[]}


                                    sect.item.forEach(function (child){
                                        if (child.type == 'group' && child.item) {
                                            sectionGroups.groups.push(child)
                                        }
                                    })

                                    $scope.arGroups.push(sectionGroups)
                                }
                            })

                        }
                    }, function(err) {
                        alert(angular.toJson(err.data))
                    }
                )


            }


            $scope.showSectionDEP = function(linkId){
                $scope.eQ.item.forEach(function (item) {
                    if (item.linkId == linkId) {
                        $scope.selectedSection = item
                    }
                })
            }

            $scope.save = function() {
                //create ar array of sections to insert
                let arSection = []

                //todo - check for duplicate linkIds
                $scope.$close($scope.selectedGroup)

                /*
                $scope.eQ.item.forEach(function (section) {
                    if ($scope.input.section[section.linkId]) {
                        arSection.push(section)
                    }

                })

                //Check that all the linkId's are unique  ??option to make them unique
                let duplicates = qSvc.checkUniqueLinkId(Q,arSection)
                if (duplicates) {
                    alert("Duplicate linkId/s found: \n" + duplicates + "\n Section/s cannot be inserted.")
                    return
                }

                $scope.$close(arSection)

*/

            }

        }
    )