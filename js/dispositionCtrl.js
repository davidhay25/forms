angular.module("formsApp")
    .controller('dispositionCtrl',
        function ($scope,$http,$uibModal) {

            $scope.addDisposition = function(QR,review){
                $uibModal.open({
                    templateUrl: 'modalTemplates/disposition.html',
                    backdrop: 'static',
                    controller: function($scope,review,QR){

                        $scope.QR = QR

                        let category = {coding:[{code:"disposition",display:"Disposition of Q comment"}]}

                        $scope.input = {}

                        $scope.input.dispositionOptions = []
                        $scope.input.dispositionOptions.push({code:'accept','display':"Accept"})
                        $scope.input.dispositionOptions.push({code:'mod','display':"Accept with mod"})
                        $scope.input.dispositionOptions.push({code:'decline','display':"Decline"})

                        $scope.review = review
                        let linkId = review.linkId      //the comment in the QR

                        $scope.saveDisposition = function(){
                            let obs = {resourceType:'Observation'}
                            obs.focus = {reference:QR.questionnaire}   //apparently it's OK to reference resources like this...
                            obs.derivedFrom = {reference:`QuestionnaireResponse/${QR.id}`}
                            obs.status = "final"
                            obs.category = category
                            obs.effectiveDateTime = new Date().toISOString()
                            obs.code = {coding:[{system:"http://canshare.com",
                                    code:$scope.input.disposition.code,
                                    display:$scope.input.disposition.display}]}

                            obs.component = []
                            obs.component.push({code:{coding:[{code:'comment'}],text:'comment'},valueString:review.answer[0].valueString})
                            obs.component.push({code:{coding:[{code:'reviewer'}],text:'reviewer'},valueString:QR.author.display})
                            obs.component.push({code:{coding:[{code:'authored'}],text:'authored'},valueDateTime:QR.authored})
                            obs.component.push({code:{coding:[{code:'linkId'}],text:'linkId'},valueString:review.linkId})

                            if ($scope.input.dispositionNote) {
                                obs.component.push({code:{coding:[{code:'note'}],text:'note'},valueString:$scope.input.dispositionNote})
                            }

                            console.log(obs)
                            $http.post('/ds/fhir/Observation',obs).then(
                                function(data) {
                                    $scope.$close()
                                }, function(err) {
                                    alert(angular.toJson(err))
                                }
                            )
                        }



                },
                    resolve: {
                        review: function () {
                            return review
                        },

                        QR : function() {
                            return QR
                        }
                    }
                }).result.then(
                    function (Q) {

                    })
            }
        })