angular.module("formsApp")
    .controller('termUpdateCtrl',
        function ($scope,termIOSvc,$uibModal,termUpdateSvc) {


            $scope.input = {allItems:{}}
            $scope.$on("selectedQ",function(ev,Q){
                $scope.itemCodeList = termUpdateSvc.makeItemCodeList(Q)
                $scope.itemCodeList.forEach(function (section) {
                    section.items.forEach(function (thing) {
                        $scope.input.allItems[thing.item.linkId] = thing.item.code[0].code
                    })
                })


                console.log($scope.itemCodeList)
            })

        }
    )