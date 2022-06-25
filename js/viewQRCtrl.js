angular.module("formsApp")
    .controller('viewQRCtrl',
        function ($scope,$http,QR) {
                $scope.QR = QR
        })