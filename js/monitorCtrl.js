
angular.module("formsApp")
    .controller('monitorCtrl',
        function ($scope,$http) {

            $scope.input = {}

            //get the most recent log entries
            let qry = "/backup/log"
            $http.get(qry).then(
                function (data) {
                    $scope.log = data.data.log
                    $scope.serverTime = data.data.serverTime        //current time on the server
                }
            )

            $scope.getResource = function(item) {
                let qry = `/ds/fhir/${item.type}/${item.id}`
                $http.get(qry).then(
                    function(data) {
                        $scope.currentResource = data.data
                    }
                )
            }

            $scope.selectLogItem = function(logItem) {
                $scope.input.logItem = logItem
            }

        })