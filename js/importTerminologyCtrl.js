angular.module("formsApp")
    .controller('importTerminologyCtrl',
        function ($scope,item,Q,termIOSvc) {

            $scope.item = item
            $scope.Q = Q
            $scope.input = {}

            //called when the user clicks the 'do import' option...
            $scope.doImport = function(){
                // {options
                let report = termIOSvc.UpdateFromFile(item,$scope.input.data,Q)

                $scope.$close(report)

              //  $scope.options = report.options
              //  $scope.updatedConditionals = report.updatedConditionals
              //  console.log(Q)
               // $scope.drawQ(Q)  //in dashboard.js
                //$scope.input.dirty = true   //in dashboard.js
            }


            $scope.upload = function(item){
                let id = "#termUploadFileRef"
                    //var file = $("#termUploadFilepatient-gender")
                    let file = $(id)
                    let fileList = file[0].files
                    if (fileList.length == 0) {
                            alert("Please select a file first")
                            return;
                    }
                    console.log(fileList)


                    let r = new FileReader();

                    r.onloadend = function(e) {
                        let data = e.target.result;
                        console.log(data)
                        $scope.input.data = data

                        let ar = data.split("\r\n")

                        //make an array for display before update
                        $scope.displayHash = {}
                        for (var i = 0 ; i < 4; i++) {
                            let lne = ar[i]
                            let ar1 = lne.split('\t')
                            if (ar1.length > 1) {
                                let key = ar1[0]
                                $scope.displayHash[key] = ar1[1]
                            }
                        }

                        //check that this file is from an export for this item
                        $scope.errMsg = []

                        if ($scope.displayHash.Q !== Q.name) {
                            $scope.errMsg.push("Not from this Questionnaire")
                        }

                        if ($scope.displayHash.linkId !== item.linkId) {
                            $scope.errMsg.push("LinkId's are not the same")
                        }


                        $scope.input.lines = []

                        //let Qname = ar[]


                        for (var i=6;i<ar.length;i++ ) {
                            let lne = ar[i]
                            let arLine = lne.split("\t")
                            $scope.input.lines.push(arLine)

                        }

                        console.log($scope.input.lines)
                        $scope.$digest()
                    }

                    //perform the read...
                    r.readAsBinaryString(fileList[0]);



            }


        })