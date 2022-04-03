angular.module("formsApp")
    .controller('qEditCtrl',
        function ($scope,formsSvc) {

            $scope.moveUp = function() {
                alert('up')
            }

        }
    )