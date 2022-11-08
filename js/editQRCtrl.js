angular.module("formsApp")
    .controller('editQRCtrl',
        function ($scope,$http,QR) {
            $scope.QR = QR
            $scope.input = {}

            //construct an object containing items that have valueString as answer types
            $scope.answers = []     //
            if (QR.item) {
                QR.item.forEach(function (section) {
                    let thing = {sectionText: section.text,answers : []}        //this will be an array containing string answers - {linkId, value}
                    $scope.answers.push(thing)
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.item) {
                                //this is a group
                                child.item.forEach(function (gc) {
                                    if (gc.answer && gc.answer[0].valueString) {
                                        thing.answers.push({linkId:gc.linkId,value:gc.answer[0].valueString})
                                        $scope.input[gc.linkId] = gc.answer[0].valueString
                                    }

                                })

                            } else {
                                //this is a leaf. Is the answer type string  ? )nly look at the first answer - we don't have multiple (I think)
                                if (child.answer && child.answer.length > 0) {
                                    if (child.answer[0].valueString) {
                                        thing.answers.push({linkId:child.linkId,value:child.answer[0].valueString})
                                        $scope.input[child.linkId] = child.answer[0].valueString
                                    }
                                }
                            }

                        })
                    }

                })

            }


            $scope.save = function() {
                if (confirm("Are you sure you wish to update this response?")) {
                    //go through the QR. If there is an entry in $scope.input, then update answer string
                    QR.item.forEach(function (section) {
                        if (section.item) {
                            section.item.forEach(function (child) {
                                if (child.item) {
                                    child.item.forEach(function (gc) {
                                        if ($scope.input[gc.linkId]) {
                                            gc.answer = []
                                            gc.answer.push({valueString:$scope.input[gc.linkId]})
                                        }
                                    })
                                } else {
                                    if ($scope.input[child.linkId]) {
                                        child.answer = []
                                        child.answer.push({valueString:$scope.input[child.linkId]})
                                    }
                                }

                            })
                        }

                    })

                    $scope.$close(QR)

                }
            }


        }
    )