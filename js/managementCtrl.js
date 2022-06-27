
angular.module("formsApp")
    .controller('monitorCtrl',
        function ($scope,$http,moment) {

            $scope.input = {}
            $scope.moment = moment
            $scope.now = moment()

            $scope.preface = "/ds/api/document/id-1656094903114"

            $scope.selectedDocumentId =  "preface" // "id-1656094903114"
            $scope.selectedDocumentLocation = "/ds/api/document/" + $scope.selectedDocumentId

            //uploading a document (Used to upload docs and attach to a Q)
            $scope.uploadDocument = function(drId){
                //drid is the DocumentReference Id
                let id = "#fileUploadFileRef"
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }
                let fileObject = fileList[0]  //is a complex object
                //console.log(fileList)

                let r = new FileReader();

                r.onloadend = function(e) {
                    let data = e.target.result;

                    let arKnownFileTypes = [{key:'.pdf',mime:'application/pdf'}]
                    arKnownFileTypes.push({key:'.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})


                    //save the uploaded data as a binary, then create an attachment extension from the Q
                    let dr = {resourceType:"DocumentReference",id:drId,status:"current",content:[]}
                    let att = {}

                    att.data =  btoa(data)
                    att.title = fileObject.name         //the name of the file
                    console.log(att.data.length)

                    att.contentType = "application/octet-stream"
                    arKnownFileTypes.forEach(function (typ) {
                        if (fileObject.name.indexOf(typ.key) > -1) {
                            att.contentType = typ.mime
                        }
                    })
                    dr.content.push({attachment:att})
                    let qry = `/ds/fhir/DocumentReference/${dr.id}`

                    $http.put(qry,dr).then(
                        function (data) {
                            //now add the attachment
                            //let url = `/ds/fhir/Binary/${}`
                            //think it's best to use the dataserver endpoint (rather than the native fhir endpoint)
                            let pathToDoc = `/ds/api/document/${dr.id}`
                            alert("Document uploaded. Refresh app to see preview")

                        },function (err) {
                            alert(angular.toJson(err))
                        }
                    )



                }

                //perform the read...
                r.readAsBinaryString(fileObject);
            }

            $scope.getPreface = function() {
             //   /id-1656094903114
            }

            //get the most recent log entries
            let qry = "/backup/log"
            $http.get(qry).then(
                function (data) {
                    $scope.log = data.data.log
                    $scope.serverTime = data.data.serverTime        //current time on the server
                }
            )

            $scope.getResource = function(item) {
                let qry = `/ds/fhir/${item.type}/${item.id}`
                $http.get(qry).then(
                    function(data) {
                        $scope.currentResource = data.data
                    }
                )
            }

            $scope.selectLogItem = function(logItem) {
                $scope.input.logItem = logItem
            }

        })