angular.module("formsApp")
    .controller('editQCtrl',
        function ($scope,$http,formsSvc,Q) {

            let QBase = "http://canshare.com/fhir/Questionnaire/" //just for the url

            if (Q) {
                $scope.Q = angular.copy(Q)  //needs to be a clone so can cancel edits
                $scope.editType = "edit"
            } else {
                $scope.editType = "new"
                $scope.Q = {item:[]}
            }

            $scope.input = {}

            $scope.updateUrl = function (name) {
                $scope.Q.url = QBase + name
            }


            $scope.save = function() {
                if ($scope.editType == "edit") {
                    //can update the properties of the Q that was passed in
                    if ($scope.Q.name.indexOf(" ") > -1) {
                        alert("The name cannot have spaces")
                        return
                    }
                    Q.id = $scope.Q.name
                    Q.url = $scope.Q.url
                    Q.name = $scope.Q.name
                    Q.title = $scope.Q.title
                    Q.description = $scope.Q.description
                    $scope.$close()        //prob. not necessary to pass the Q back as the instance passed in has been modified
                } else {
                    //this is a new Q

                    if ($scope.input.startWithBase) {

                        formsSvc.loadQByUrl("http://clinfhir.com/Questionnaire/cervicalcancer").then(
                            function(data) {
                                //a bundle
                                if (data.data && data.data.entry) {
                                    let baseQ = data.data.entry[0].resource
                                    //todo - could pull other elements from the base...
                                    $scope.Q.item = baseQ.item
                                    $scope.$close($scope.Q)
                                }



                            }, function(err) {
                                alert(angular.toJson(err.data))
                            }
                        )
                    } else {
                        $scope.$close($scope.Q)
                    }


                }

            }

        }
    )