
// a new Q  - NOT editing any more

angular.module("formsApp")
    .controller('newQCtrl',
        function ($scope,$http,formsSvc,allQ) {

            $scope.allQ = allQ
            $scope.input = {}
            $scope.input.section = {}
            let QBase = "http://canshare.com/fhir/Questionnaire/" //just for the url
            $scope.Q = {resourceType:'Questionnaire',status:"draft",item:[]}
            /*
            if (Q) {
                $scope.Q = angular.copy(Q)  //needs to be a clone so can cancel edits
                $scope.editType = "edit"
            } else {
                $scope.editType = "new"
                $scope.Q = {resourceType:'Questionnaire',item:[]}
            }
*/
            //$scope.input = {}

            $scope.updateUrl = function (name) {

                let t = name.replace(/\s+/g, '')  //remove all spaces
                t = t.toLowerCase()

                $scope.Q.url = QBase + t
            }

            $scope.selectExistingQ = function (Q) {
                $scope.eQ = Q
            }

            $scope.checkSection = function(linkId,checked) {
                console.log(linkId,checked)
            }

            $scope.showSection = function(linkId){
                $scope.eQ.item.forEach(function (item) {
                    if (item.linkId == linkId) {
                        $scope.selectedSection = item
                    }
                })
            }

            $scope.save = function() {
                //check for selected sections
                if ($scope.eQ) {
                    $scope.eQ.item.forEach(function (section) {
                        if ($scope.input.section[section.linkId]) {
                            $scope.Q.item = $scope.Q.item || []
                            $scope.Q.item.push(section)
                        }
                    })
                }

                $scope.$close($scope.Q)
                /*

                if ($scope.editType == "edit") {
                    //can update the properties of the Q that was passed in
                    if ($scope.Q.name.indexOf(" ") > -1) {
                        alert("The name cannot have spaces")
                        return
                    }
                    Q.id = $scope.Q.name
                    Q.status = $scope.Q.status
                    Q.url = $scope.Q.url
                    Q.name = $scope.Q.name
                    Q.title = $scope.Q.title
                    Q.description = $scope.Q.description
                    $scope.$close()        //prob. not necessary to pass the Q back as the instance passed in has been modified
                } else {
                    //this is a new Q

                    //check for selected sections
                    if ($scope.eQ) {
                        $scope.eQ.item.forEach(function (section) {
                            if ($scope.input.section[section.linkId]) {
                                $scope.Q.item = $scope.Q.item || []
                                $scope.Q.item.push(section)
                            }
                        })
                    }

                    $scope.$close($scope.Q)
*/
               // }

            }

        }
    )