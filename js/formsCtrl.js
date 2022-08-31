//controller for forms UI. Mayme move to a directive at some stage...

angular.module("formsApp")
    .controller('formsCtrl',
        function ($scope,$http,formsSvc,$uibModal) {


           // $scope.datePopup = {opened :false}
            $scope.datePopup = {}


            $scope.openDate = function(linkId) {
                $scope.datePopup[linkId] = {opened:true}
               // $scope.datePopup.opened = true
            }

            //used by the preview for coded elements - not sure it is actually used yet
            $scope.searchTermServerDEP = function(val,url) {
                $scope.showWaiting = true
                let qry =  termServer + "ValueSet/$expand?url=" + url
                //let qry = "https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=" + url
                qry += "&filter=" + val

                return $http.get(qry).then(
                    function(data){

                        let vs = data.data
                        if (vs.expansion) {
                            let ar = []
                            return vs.expansion.contains

                        } else {
                            return [{display:"no matching values"}]
                        }

                        //return [{display:"aaa"},{display:'bbbb'}]
                    },
                    function(err){
                        console.log(err)
                        return [{display:"no matching values"}]
                    }
                ).finally(
                    function(){
                        $scope.showWaiting = false
                    }
                )
            };

            //return true if the item will be extracted as an observation by the forms receiver
            $scope.observationExtract = function(item) {
                let extUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
                let ar = formsSvc.findExtension(item,extUrl)

                if (ar.length > 0) {
                    return true
                }

            }

            //when a top level item is selected in the tabbed interface
            $scope.selectSection = function(section) {
                $scope.selectedSection = section
            }

            //when a new template is selected in the parent controller, need to clear details of any previousle selected section
            $scope.$on('newQSelected',function(ev){
                delete $scope.selectedSection
            })

            //invoked from ng-blur on for elements
            $scope.makeQR = function() {
                $scope.formQR = formsSvc.makeQR($scope.selectedQ, $scope.form)
                $scope.$emit('qrCreated',$scope.formQR)

            }


            //determine if an element should be displayed
            $scope.showConditional = function (cell) {

                if (! cell.meta) {
                    console.log(cell.item.text + " no meta")
                }

                //If the item is hidden and the showHidden is not set then return false
                if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                    return false
                }

                let show = formsSvc.checkConditional(cell.item,$scope.form)

                //if it isn't to be shown, clear any content  (Aug31)
                if (!show) {
                    delete $scope.form[cell.item.linkId]
                }

                return show



            }

            //code to show (or not) a conditional group - limited to Coding comparisons ATM
            $scope.showConditionalGroup = function(group) {
                if (group) {
                    let show = formsSvc.checkConditional(group,$scope.form)

                    return show
                } else {
                    //if not a group then show. child elements will be individually assessed later...
                    return true
                }



            }



            //the type of this item is reference
            $scope.selectResourceFromService = function (item) {
                let ar = formsSvc.findExtension(item,"http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource")


                if (ar.length > 0) {
                    let resourceType = ar[0].valueCode


                    $uibModal.open({
                        templateUrl: 'modalTemplates/selectFromHPI.html',
                        backdrop: 'static',
                        controller: function($scope,resourceType,serverRoot,formsSvc){
                            $scope.resourceType = resourceType
                            $scope.formsSvc = formsSvc

                            $scope.selectResource = function(resource) {
                                $scope.$close(resource)
                            }

                            $scope.selectFromHPI = function (name) {
                                let qry = serverRoot + resourceType
                                    if (name) {
                                        qry += "?name=" + name
                                    }
                                $http.get(qry).then(
                                    function (data) {
                                        $scope.matchesBundle = data.data
                                    }
                                )
                            }

                        },
                        resolve: {
                            resourceType: function () {
                                return resourceType
                            },
                            serverRoot: function () {
                                return formsSvc.getHPIRoot()
                            }
                        }
                    }).result.then(
                        function (resource) {


                            //this is actually the scope from the parent...

                            if (resource.resourceType == "Practitioner") {
                                $scope.form[item.linkId] =
                                    {reference:resourceType + "/" + resource.id,display:formsSvc.getHN(resource.name[0])}
                            } else {
                                //Organization
                                $scope.form[item.linkId] =
                                    {reference:resourceType + "/" + resource.id,display:resource.name}
                            }



                                //also the parent scope
                            $scope.makeQR(item.linkId)
                            //currently only a practitioner, but could
                        }
                    )


                }


            }

        }
    )