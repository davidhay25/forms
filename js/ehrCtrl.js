//Dashboard controller

angular.module("formsApp")
    .controller('ehrCtrl',
        function ($scope,$http,formsSvc) {

            $scope.input = {}
            $scope.form = {}


            // ------------ this code is almost the same as that in the dashboard. ? move to a service

            //load all the questionnaires
            $http.get("/fm/fhir/Questionnaire").then(
                function (data) {
                    $scope.allQ = [];
                    data.data.entry.forEach(function (entry){
                        $scope.allQ.push(entry.resource)
                    })
                }
            )


            $scope.selectQ = function(Q) {
                $scope.selectedQ = Q
                let vo = formsSvc.makeTreeFromQ(Q)
                //$scope.treeData = vo.treeData
                $scope.hashItem = vo.hash       //all items in teh form hashed by id

                $scope.formDef = vo.treeData

                $scope.makeQR()


              //  drawTree()
              // makeFormDef()
            }

            //---------------------------------------------------------------------------------


            //invoked whenever an item in the generated form changes...
            $scope.makeQR = function(key) {
                $scope.QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)
                console.log($scope.QR)
            }


            $scope.selectQR = function(QR) {
                $scope.selectedQR = QR
            }

            $scope.submitForm = function() {
                $scope.QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)




            }

            //when a patient is selected - load the QR from the data server
            $scope.selectPatient = function() {
                $scope.existingQR = []
                console.log($scope.input.selectedPatient)
                //get all the QR for this patient from the data server
                let url = "/ds/fhir/QuestionnaireResponse?patient="+$scope.input.selectedPatient.resource.id
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        if (data.data && data.data.entry) {
                            data.data.entry.forEach(function (entry){
                                let QR = entry.resource
                                $scope.existingQR.push({QR:QR,display:QR.questionnaire})
                            })
                        }
                    }
                )
            }

            //load the patients directly from the data server
            let url = "/ds/fhir/Patient"
            $http.get(url).then(
                function (data) {

                    $scope.allPatients = [];
                    data.data.entry.forEach(function (entry){
                        let display = entry.resource.name[0].text
                        $scope.allPatients.push({display:display,resource:entry.resource})
                        $scope.input.selectedPatient = $scope.allPatients[0]
                        $scope.selectPatient()
                    })

                }
            )
        })