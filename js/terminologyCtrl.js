angular.module("formsApp")
    .controller('terminologyCtrl',
        function ($scope,terminologySvc,$http) {

            $scope.input = {}
            $scope.input.expandCount = 20

            $scope.expandVS = function(url,filter) {
                let qry =  terminologySvc.getTerminologyServer() + "ValueSet/$expand?url=" + url
                if (filter) {
                    qry += "&filter="+filter
                }

                if ($scope.input.expandCount) {
                    qry += "&count=" + $scope.input.expandCount
                }

                $http.get(qry).then(
                    function(data){
                        $scope.expandedVs  = data.data
                    }, function(err) {

                    }
                )
            }

            $scope.selectVSEntry = function (entry,vsUrl) {
                delete $scope.expandedVs
                $scope.selectedVSUrl = vsUrl
                $scope.selectedVSEntry = entry
            }

        }
    )
