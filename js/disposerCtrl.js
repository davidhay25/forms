angular.module("formsApp")
    .controller('disposerCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService) {


            $http.get("/config").then(
                function(data) {
                    $scope.systemConfig = data.data
                    console.log($scope.systemConfig)

                }
            )


            //-----------  login & user stuff....

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    modalService.showModal({}, {bodyText: 'You have been logged out'})

                }, function(error) {
                    modalService.showModal({}, {bodyText: 'Sorry, there was an error logging out - please try again'})
                });

            };

            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    console.log('logged in')
                    $scope.user = {email:user.email,displayName : user.displayName}
                    $scope.$digest()
                } else {
                    delete $scope.user
                }
            });

            $scope.deleteForm = function(){
                alert("Will delete QR instance - eg if personal data or inappropriate language (not yet enabled)")
            }


            $scope.reviewComments = function() {
                alert("Todo. Intended for project team members and/or anyone who can review & create dispositions. Need login created.")
            }



            //load all the disposition Observations for a Q
            $scope.loadDispositionsForQ = function(Q) {
                    delete $scope.dispositionsForQ
                    $scope.selectedQ = Q
                    formsSvc.loadDispositionsForQ(Q).then(
                        function(data) {
                                $scope.dispositionsForQ = data.result

                        }
                    )
            }


        })