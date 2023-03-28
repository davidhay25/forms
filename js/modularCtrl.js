angular.module("formsApp")
    .controller('modularCtrl',
        function ($scope,$http) {

            $scope.input = {}

            let id = "cf-1654205531202"


            //cf-1653444860285


            let qry = `/ds/fhir/Questionnaire/${id}`

            $http.get(qry).then(
                function(data) {
                    $scope.input.selectedQ = data.data
                }
            )



        }
    )