angular.module("formsApp")
    .controller('vsViewerCtrl',
        function ($scope,vsUrl,formsSvc,$http) {
            $scope.vsUrl = vsUrl
            $scope.termServer = formsSvc.getServers().termServer

            $scope.qry = $scope.termServer + "ValueSet/$expand?url=" + $scope.vsUrl
            $http.get($scope.qry).then(
                function (data) {
                    $scope.selectedValueSet = data.data
                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )

        }
    )