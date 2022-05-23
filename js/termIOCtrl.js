angular.module("formsApp")
    .controller('termIOCtrl',
        function ($scope,termIOSvc,$uibModal) {

                //terminology updating

            //file that downloads a file
            function download(filename, text) {
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                element.setAttribute('download', filename);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }

            //upload and process a tsv file for the full Q
            $scope.termUploadQ = function(){
                let id = "#termUploadFileQ"
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }
                console.log(fileList)

                //var f = document.getElementById('termUploadFile').files[0],
                let r = new FileReader();

                r.onloadend = function(e) {
                    var data = e.target.result;
                    console.log(data)
                    termIOSvc.updateFromQFile($scope.selectedQ,data)

                }

                r.readAsBinaryString(fileList[0]);



            }

            $scope.fullQExport = function() {

                let ar = termIOSvc.makeExportQ($scope.selectedQ)
                let content = ar.join('\r\n')
                console.log(content)
                let name = $scope.selectedQ.name.replace(/\s+/g, '')  //remove all spaces - shouldn't be needed,
                let fileName = "termDownloadQ-"+name + ".tsv"
                download(fileName,content)

            }


            $scope.termExport = function(item){
                   // alert("Export the list of concepts from answerOption as a csv to have the coding updated externally")

                if (item.answerOption) {
                    let ar = termIOSvc.makeExportOneItem(item,$scope.selectedQ)  //selectedQ from parent
                    let content = ar.join('\r\n')
                    console.log(content)
                    let fileName = "termDownloadItem-"+item.linkId + ".tsv"
                    download(fileName,content)

                } else {
                    alert("No answerItem element")
                }

                /*
                //https://www.bitdegree.org/learn/javascript-download
                function download(filename, text) {
                    var element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                    element.setAttribute('download', filename);

                    element.style.display = 'none';
                    document.body.appendChild(element);

                    element.click();

                    document.body.removeChild(element);
                }
                */

            }



        // https://www.w3docs.com/snippets/css/how-to-customize-file-inputs.html
            $scope.termUploadDEP = function(item) {

                let id = "#termUploadFile" + item.linkId
                //var file = $("#termUploadFilepatient-gender")
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }
                //console.log(fileList)

                //var f = document.getElementById('termUploadFile').files[0],
                let r = new FileReader();

                r.onloadend = function(e) {
                    var data = e.target.result;
                    //console.log(data)
                    termIOSvc.UpdateFromFile(item,data,$scope.selectedQ)
                }

                r.readAsBinaryString(fileList[0]);

            }


            $scope.termImport = function(item){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/importTerminology.html',
                    controller: 'importTerminologyCtrl',
                    size: 'lg',
                    resolve: {
                        item: function () {
                            return item
                        },
                        Q : function(){
                            return $scope.selectedQ     //from parent scope
                        }
                    }
                }).result.then(function(){
                    console.log($scope.selectedQ)

                    $scope.$emit('termImported')



                })
            }

            $scope.termEdit = function(){
                    alert("edit the answeroptions directly in a modal dialog")
            }

            $scope.termConvert = function(){
                    alert("generate a VS from the answerOptions and change to answerValueSet ")
            }


        })