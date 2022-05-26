angular.module("formsApp")
    .controller('importSectionCtrl',
        function ($scope,$http,allQ,Q,qSvc) {

            $scope.allQ = allQ      //note that allQ is a minimal set of data...
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

            $scope.checkSection = function(linkId,checked) {
                console.log(linkId,checked)
            }

            $scope.selectExistingQ = function (eQ) {

                $http.get(`/ds/fhir/Questionnaire/${eQ.id}`).then(
                    function(data) {
                        $scope.eQ = data.data
                    }, function(err) {
                        alert(angular.toJson(err.data))
                    }
                )



            }


            $scope.showSection = function(linkId){
                $scope.eQ.item.forEach(function (item) {
                    if (item.linkId == linkId) {
                        $scope.selectedSection = item
                    }
                })
            }

            $scope.save = function() {
                //create ar array of sections to insert
                let arSection = []

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

                //check dependency sources missing
                let ar = qSvc.checkDependencyTargets(Q,arSection)
                if (ar.length > 0) {

                    console.log(ar)
                   // let msg = ""
                }

                $scope.$close(arSection)



            }

        }
    )