angular.module("formsApp")
    .controller('dataStandardsCtrl',
        function ($scope,$http,formsSvc,$uibModal,exportSvc,terminologySvc,modalService,$timeout,$window,$sce,hisoSvc) {


            //was a Q Id passed in. It will be selected after the list of Q have been loade
            let search = $window.location.search;
            let QIdfromUrl = null
            if (search) {
                QIdfromUrl = search.substr(1)
            }

            //qrCreated is emitted by the directives that can collect data - just the form now.
            //as they are siblings, this function broadcasts an event so that the QR
            //in each one can be updated even when data changes in the other
            $scope.$on('qrCreated',function(ev,vo){
                console.log('qrcreated')
                // {QR, formData, hashItem}
               // $scope.parentScopeQR = vo.QR        //for the report tab
                $scope.formQR = vo.QR
                console.log($scope.formQR)

                //todo - this was when I was allowing data to be entered in the tree...
                //$scope.$broadcast("externalQRUpdate",vo)
            })


            $scope.$on('commentsUpdated',function(ev,vo) {
                console.log('commentsUpdated',vo.hashComments)
                $scope.hashComments = vo.hashComments  //the comments are incorproated into the QR my makeQR
                //$scope.$broadcast('commentsUpdated',vo.hashComments)
                //$scope.$broadcast('sendCommentsToRenderFormDir',vo.hashComments)
               // makeQR()

                return

                //a copy of the form data. We don't want to update the one that the form is using
                //as the comments from the hash would appear in the comment fields...
                let model = angular.copy($scope.form)

                //updates the items marked as comments (using the code.system)
                //If I was doing this again I'd use an extension, but that will require updating the disposer. Perhaps another time...
                formsSvc.addCommentsToModel($scope.selectedQ,vo.hashComments,model)

                makeQR(model)

                //$scope.form



            })




              //  $scope.formQR = vo1.QR
         //   })

            //system url for author tags
          //  let tagAuthorSystem = "http://clinfhir.com/fhir/NamingSystem/qAuthorTag"

            //system url for folder tags
            //let tagFolderSystem = "http://clinfhir.com/fhir/NamingSystem/qFolderTag"

            let extFolderTag = formsSvc.getFolderTagExtUrl()

            $scope.formsSvc = formsSvc
            $scope.input = {}

            //defaults for the form
            $scope.form = {}        //for the form
            $scope.input.canPublish = true
            $scope.input.includeOIA = true

            $scope.input.leftPane = "col-md-2"
            $scope.input.rightPane = "col-md-10"

            $scope.arHisoStatus = []
            $scope.arHisoStatus.push({code:'development',display:'Development'})
            $scope.arHisoStatus.push({code:'draft',display:'Draft Data Standard'})
            $scope.arHisoStatus.push({code:'standard',display:'Data Standard'})

            $scope.input.togglePane = function() {
                if ($scope.input.rightPane == "col-md-10") {
                    console.log('hide left pane')
                    $scope.input.leftPane = "hide"
                    $scope.input.rightPane = "col-md-12"
                } else {
                    console.log('show left pane')
                    $scope.input.leftPane = "col-md-2"
                    $scope.input.rightPane = "col-md-10"
                }
            }



            //when the forms directive creates a QR it emits this event


            //functions to support form submission

            //the QR is created in formsCtrl, but we need it in this scope and using the reviewer details
            //todo: definately need to tidy this up!!! - just need to add call to designer.js & remove from formsCtrl
            //todo formsctrl could just raise the event...

            function makeQR() {
                let patient = null


                //before building the QR, the comments from the tree need to be incorporated.
                //use a clone of the model data so the displayed form is not updated
                let formData = angular.copy($scope.form)

                //updates the items marked as comments (using the code.system)
                //If I was doing this again I'd use an extension, but that will require updating the disposer. Perhaps another time...
                formsSvc.addCommentsToModel($scope.selectedQ,$scope.hashComments,formData)





                let practitioner = null
//$scope.formQR = formsSvc.makeQR($scope.selectedQ, $scope.form,null,patient,practitioner,
                $scope.formQR = formsSvc.makeQR($scope.selectedQ, formData ,null,patient,practitioner,
                    $scope.input.reviewerName,$scope.input.reviewerOrganization,$scope.input.reviewerEmail)


            }

/*
            $scope.$on("qrCreated",function(ev,qr){
                console.log("qrCreated event called")
                //need to construct a QR that has the reviewers name in it.
                //temp  - don't want to do this right now  makeQR()
               //console.log($scope.formQR)

           })
*/


            $scope.showAboutSite = function() {
                let allClosed = true
                $scope.standardType = "about"
            }

            $scope.accordianOpened = function(type) {
                //type will be 'structuredpath, actnow, mdm


                $scope.standardType = type
                $timeout(function(){
                    //console.log($scope.input.accordianStatus)
                    let allClosed = true
                    Object.keys($scope.input.accordianStatus).forEach(function (key) {
                        if (($scope.input.accordianStatus[key])) {
                            allClosed = false
                        }
                    })
                    if (allClosed) {
                        delete $scope.standardType
                    }

                },100)

                //delete any open Q
                delete $scope.selectedQ


                return

                if ($scope.standardType == type) {
                    delete $scope.standardType
                } else {
                    $scope.standardType = type
                }


            }



            $scope.preview = function(){
                $uibModal.open({
                    templateUrl: 'modalTemplates/previewQR.html',
                    backdrop: 'static',
                    controller: function($scope,QR) {
                        $scope.selectedQR = QR
                        console.log(QR)


                        //doesn't work - https://stackoverflow.com/questions/22189544/print-a-div-using-javascript-in-angularjs-single-page-application#22189651
                        $scope.printDEP = function () {

                            let divName = "onePagePreview"

                            var printContents = document.getElementById(divName).innerHTML;

                            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                                var popupWin = window.open('', '_blank', 'width=600,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
                                popupWin.window.focus();
                                popupWin.document.write('<!DOCTYPE html><html><head>' +
                                    '<link rel="stylesheet" type="text/css" href="style.css" />' +
                                    '</head><body onload="window.print()"><div class="reward-body">' + printContents + '</div></body></html>');
                                popupWin.onbeforeunload = function (event) {
                                    popupWin.close();
                                    return '.\n';
                                };
                                popupWin.onabort = function (event) {
                                    popupWin.document.close();
                                    popupWin.close();
                                }
                            } else {
                                var popupWin = window.open('', '_blank', 'width=800,height=600');
                                popupWin.document.open();
                                popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="style.css" /></head><body onload="window.print()">' + printContents + '</body></html>');
                                popupWin.document.close();
                            }
                            popupWin.document.close();

                            return true;
                        }

                    },
                    size : 'lg',
                    resolve: {
                        QR: function () {
                            return $scope.formQR
                        }
                    }
                })
            }

            $scope.goHome = function() {
                delete $scope.hisoNumber
                delete $scope.selectedNode
                delete $scope.errorOO
                delete $scope.formState
                delete $scope.dispositionsForQ
                delete $scope.hashDispositionsByLinkId
                delete $scope.selectedQR
                delete $scope.selectedSection       //the form section
                delete $scope.selectedQ
                delete $scope.model
                delete $scope.standardType
                $scope.input.leftPane = "col-md-2"
                $scope.input.rightPane = "col-md-10"

                $scope.input.accordianStatus['SP'] = false
                $scope.input.accordianStatus['MDM'] = false
                $scope.input.accordianStatus['AN'] = false

            }

            $scope.selectQR = function (QR) {
                $scope.selectedQR = QR
            }

            $scope.prepopFromEhr = function(){
                //a place holder for getting data from an EHR. Right now, just set some data
                //so form fillers get the idea. Need a more robust approach

                formsSvc.ehrPrepop($scope.selectedQ, $scope.form,function(){
                    makeQR()
                    console.log($scope.formQR)

                })
            }

            $scope.submitForm = function() {

                //don't rebuild the QR here. It is created by the commentsUpdated event handler which
                //incorporates comments from the tree into the QR using a copy of the model.
                //This function will add the reviewer details to the QR before submitting

                //$scope.makeQR()  //updates $scope.QR
                //let QR = formsSvc.makeQR($scope.selectedQ,$scope.form,$scope.hashItem)



                if (! $scope.formQR ||  $scope.formQR.item.length == 0) {
                    console.log($scope.formQR)
                    alert("You must enter some data first!")
                    return
                }

                if (! $scope.input.reviewerName) {
                    alert("Please enter your name in the review name box at the upper right")
                    return
                }

                if (confirm("Are you sure you're ready to submit this form? You should only do this once the form is complete.")){


                    //now need to add the review details to the QR - in $scope.formQR
                    //


                   // $scope.formQR = formsSvc.makeQR($scope.selectedQ, $scope.form,null,patient,practitioner,
                     //   $scope.input.reviewerName,$scope.input.reviewerOrganization,$scope.input.reviewerEmail)


                    let reviewerName = $scope.input.reviewerName
                    let reviewOrganization = $scope.input.reviewerOrganization
                    let reviewerEmail = $scope.input.reviewerEmail

                    //the author will always be a PR
                    let PR = {resourceType:"PractitionerRole",id:"pr1"}


                    let display = ""

                    PR.practitioner = {display: reviewerName}
                    display += reviewerName

/*
                    if (practitioner) {
                        PR.practitioner = {reference:practitioner}
                        if (practitioner.name) {
                            display += getHN(practitioner.name[0])
                        }
                    } else {
                        let practitionerName = reviewerName || "No practitioner supplied"
                        PR.practitioner = {display: practitionerName}
                        display += practitionerName
                    }
                    */

                    if (reviewOrganization) {
                        PR.organization = {display:reviewOrganization}
                        display += " at " + reviewOrganization
                    }

                    if (reviewerEmail) {
                        PR.telecom = [{system:'email',value:reviewerEmail}]

                    }
                    PR.text = {status:'generated'}
                    PR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>"+display+"</div>"

                    $scope.formQR.contained = [PR]
                    $scope.formQR.author = {reference:'#pr1',display:display}



                    console.log($scope.formQR)
                    //return      //temp

                    //-------------------------------------------

                    //makeQR()        //make a final copy of the QR that definately has the revieers details in it
                    let bundle = {'resourceType':'Bundle',type:'collection',entry:[]}

                    if (! $scope.input.canPublish) {
                        $scope.formQR.extension = $scope.formQR.extension || []
                        $scope.formQR.extension.push({url:formsSvc.getExtUrl('extCanPublish'),valueBoolean:false})
                    }

                    if (! $scope.input.includeOIA) {
                        $scope.formQR.extension = $scope.formQR.extension || []
                        $scope.formQR.extension.push({url:formsSvc.getExtUrl('extPublishOia'),valueBoolean:false})
                    }

                    bundle.entry.push({resource:$scope.formQR})

                    let url = "/fr/fhir/receiveQR"
                    $http.post(url,bundle).then(
                        function(data) {
                            //console.log(data.data)
                            //alert("Form has been saved.")
                            //window.location = "afterReview.html"
                            $scope.formState = "complete"

                            //$scope.selectPatient()  //to read the new data
                        }, function(err) {
                            //if there's an error processing, then an OO will be retirned.
                            $scope.errorOO = err.data
                            //alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            //display the QR
            $scope.viewQR = function(QR){
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewQR.html',
                    backdrop: 'static',
                    controller: 'viewQRCtrl',
                    size : 'lg',
                    resolve: {
                        QR: function () {
                            return QR
                        }
                    }
                })
            }

            //set the document to show based on the documentrefaerence id
            $scope.showDocument = function(drId) {
                $scope.selectedDocumentLocation = `/ds/api/document/${drId}`
            }

            //set the document to show based on the url
            $scope.showDocumentByUrl = function(url) {
                let qry = "/ds/api/proxy?url="+url
               // $scope.selectedDocumentLocation = qry
                $scope.selectedDocumentLocation = url
            }



            //retrieve all Q to determine their status and populate the selectors
            //
            let qry = "/ds/fhir/Questionnaire?_elements=url,title,name,description,extension&status:not=retired"
            $scope.allQ = []                    //Structured Path standards
            $scope.allMdm = []                  //Mdm
            $scope.allActnow = []              //actnow

            //$scope.tags = ['All']
            $scope.tags = []
            $scope.hisoStatuses = []
            $http.get(qry).then(
                function (data) {
                    if (data.data && data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            let Q = entry.resource
                            let isActnow, isMdm         //used to create separate actnow & mdmcategories. Tidy up if there are more...

                            //Set the hisoStatus - default to 'development'
                            Q.hisoStatus = 'development'      //default
                            if (Q.extension) {
                                let hs = formsSvc.getHisoStatus(Q)
                                if (hs) {
                                    Q.hisoStatus = hs
                                }
                            }

                            if ($scope.hisoStatuses.indexOf(Q.hisoStatus) == -1) {
                                $scope.hisoStatuses.push(Q.hisoStatus)
                            }

                            //the folder tag
                            Q.tags = []      //make it easier to access (as opposed to the meta element)
                            let isTest = false      //set to true if the Q has a test tag applied - don't show

                            //tags are now extensions

                            if (Q.extension){
                                let rslt = false

                                Q.extension.forEach(function (ext) {
                                    if (ext.url == extFolderTag) {
                                        let code = ext.valueString
                                        if (code) {
                                            isActnow = code.toLowerCase() == 'actnow' ? true : false
                                            isMdm = code.toLowerCase() == 'mdm' ? true : false

                                            //create separate
                                            if  (code.toLowerCase() == 'test') {
                                                isTest = true
                                            } else {
                                                Q.tags.push(code)
                                                if ($scope.tags.indexOf(code) == -1) {
                                                    $scope.tags.push(code)
                                                }
                                            }

                                        }


                                    }
                                })
                            }


                            //Only include the ones NOT tagged with 'test'. todo - not really needed
                            if (! isTest) {
                                //so it's not a test
                                if (isMdm) {
                                    $scope.allMdm.push(Q)
                                } else if (isActnow) {
                                    $scope.allActnow.push(Q)
                                } else {
                                    $scope.allQ.push(Q)         //note that this is a minimal Q
                                }

                            }



                           // $scope.input.selectedTag = $scope.tags[0]
                           // $scope.input.selectedHisoStatus = $scope.hisoStatuses[0]

                        })

                        //sort by title or name
                        $scope.allQ.sort(function(a,b){
                            let txtA = a.title || a.name
                            let txtB = b.title || b.name
                            if (txtA > txtB) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        //sort tags
                        $scope.tags.sort(function (a,b) {
                            if (a.toLowerCase() > b.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }

                        })
                        //insert the 'All' tag
                        $scope.tags.splice(0,0,"All")


                        $scope.input.selectedTag = $scope.tags[0]
                        $scope.input.selectedHisoStatus = $scope.hisoStatuses[0]

                        //-----------
                        if (QIdfromUrl) {
                            //a Q url was passed in on the query url..
                            $scope.input.togglePane()       //hide the list of standards
                            $scope.loadQ({id:QIdfromUrl})

                        }

                    }
                }, function (err) {
                    console.log(err)
                }
            )

            $scope.viewVS = function(url){
                $uibModal.open({
                    templateUrl: 'modalTemplates/vsEditor.html',
                    backdrop: 'static',
                    controller: 'vsEditorCtrl',
                    size : 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        },
                        modes: function () {
                            return ['view']  //todo remove select
                        },
                        server : function() {
                            return null
                        }
                    }
                })
            }

            function makeCsvAndDownload(Q,hashAllItems) {
                $scope.exportJsonList = exportSvc.createJsonModel(Q,hashAllItems)

                let csv = exportSvc.createDownloadCSV($scope.exportJsonList)
                let ar = csv.split('\r\n')
                $scope.auditReport = []

                //need to pull out header to allow the table scroll with fixed header

                ar.forEach(function (lne,inx) {
                    if (inx == 0) {
                        $scope.auditReportHeader = lne.split(',')
                    } else {
                        $scope.auditReport.push(lne.split(','))
                    }

                })

                $scope.downloadLinkCsv = window.URL.createObjectURL(new Blob([csv],{type:"text/csv"}))
                var now = moment().format();
                $scope.downloadLinkCsvName =  Q.name + '_' + now + '.csv';
            }

            $scope.loadQ = function(Q) {
                //The Q passed in is a minimal Q so we need to load the full one...
                delete $scope.hisoNumber
                delete $scope.selectedNode
                let qry = `/ds/fhir/Questionnaire/${Q.id}`
                $scope.showWaiting = true
                $http.get(qry).then(
                    function(data) {
                        $scope.hisoNumber = formsSvc.getHisoNumber(data.data)
                        $scope.viewModel(data.data)

                        //needed for showing the source items in dependencies
                        let vo = formsSvc.generateQReport(data.data)
                        $scope.hashAllItems = vo.hashAllItems       //{item: dependencies: }}

                        makeCsvAndDownload(data.data,vo.hashAllItems)

                        //hide the standards list
                        $scope.input.togglePane()

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    function() {
                        $scope.showWaiting = false
                    }
                )

            }

            //all the function to display a Q - called from $scope. loadQ()
            $scope.viewModel = function(Q) {

                delete $scope.errorOO
                delete $scope.formState
                delete $scope.dispositionsForQ
                delete $scope.hashDispositionsByLinkId
                delete $scope.selectedQR
                delete $scope.selectedSection       //the form section

                //lets the child controllers (eg formsCtrl) know that a new Q has been selected so it can clear the display...
                $scope.$broadcast('newQSelected')

                $scope.selectedQ = Q
                //$scope.selectedQMeta =
                $scope.model = exportSvc.createJsonModel(Q)

                //for the form ui
                $scope.objFormTemplate = formsSvc.makeFormTemplate(Q)

                $scope.formTemplate = $scope.objFormTemplate.template

                //need to wait for the form to be rendered before checking the defaults

                $timeout(function(){
                    //returns any initial values - need to wait for the page to load
                    $scope.form = formsSvc.prepop(Q)
                },1000)


                //for the HISO table display
                // an array - 1 line per section
                // section has .lines array - each line {type: item: linkId: name: description:
                let voReport = formsSvc.generateQReport($scope.selectedQ)

                //create a summary object suitable for the HISO table. Has functionality specific to HISO needs...
                let hashAllItems = voReport.hashAllItems


                $scope.exportJsonList = exportSvc.createJsonModel(Q,hashAllItems)

                //create an array of HISO metadata - one line per element
                //returns {array: fle: }
                let voHISO = hisoSvc.createHisoArray($scope.exportJsonList)
                //now construct the download data

                //prepent the BOM (byte order mark) - https://stackoverflow.com/questions/17879198/adding-utf-8-bom-to-string-blob#17879474
                let fle =  "\ufeff" +  voHISO.fle // arHISO.join("\r\n")
//console.log(fle)

                let uniquer = moment().format()
                $scope.HisoDownloadLinkCsv = window.URL.createObjectURL(new Blob([fle],{type:"text/csv"}))
                $scope.HisoDownloadLinkCsvName = Q.name + '_hiso_' + uniquer + '.csv';

                //Now, create the HTML download
                let htmlDownload = hisoSvc.createHtmlDownload(Q,voHISO.array)
                //console.log(htmlDownload)

                $scope.HisoDownloadLinkHtml = window.URL.createObjectURL(new Blob([htmlDownload],{type:"text/html"}))
                $scope.HisoDownloadLinkHtmlName = Q.name + '_hiso_' + uniquer + '.html';

                //console.log($scope.exportJsonList)

                //convert the object into a single level for the table

                $scope.arHisoAllRows = []
                $scope.exportJsonList.forEach(function (sect) {
                    $scope.arHisoAllRows.push({type:'section',display:sect.display})
                    sect.lines.forEach(function (line) {
                        $scope.arHisoAllRows.push(line)
                    })

                })








                //create the Q download
                let json = angular.toJson(Q,null,2)
                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([json],{type:"application/json"}))
                var now = moment().format();
                $scope.downloadLinkJsonName =  Q.name + '_' + now + '.json';

                //make the tree
                let vo = formsSvc.makeTreeFromQ(Q)
                drawTree(vo.treeData)

                $scope.addLike = function(report){
                    //need to collect the user email
                    report.likes = report.likes || 0
                    report.likes++
                }

                //get the dispositions
                formsSvc.loadDispositionsForQ(Q).then(
                    function(data) {
                        $scope.dispositionsForQ = data.result
                        $scope.hashDispositionsByLinkId = data.hashLinkId

                        //create hash by element linkId



                    }, function (err) {
                        console.log(err)
                    }
                )

                //get the vs

                $scope.vsForQ = terminologySvc.getValueSetsForQ(Q)


                //The v2 report
                $scope.v2List = exportSvc.createV2Report(Q)

                //The list of QRs for example display
                formsSvc.getQRforQ(Q.url).then(
                    function (bundle) {
                        $scope.allQRforQ = bundle
                        if (bundle.entry && bundle.entry.length > 0) {
                            $scope.selectedQR = bundle.entry[0].resource
                        }

                    }
                )


            }


            let drawTree = function(treeData){
                //console.log(treeData)
                treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })

                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })


            }

            let expandAll = function(treeData) {
                treeData.forEach(function (item) {
                    item.state.opened = true;
                })
            }



        })