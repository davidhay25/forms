
//controller for vseditor
//note that all VS are saved on the local server ATM (otherwise there is a dependency on an external term server)
//todo - what if we want to use an existing VS that isn't there?

angular.module("formsApp")
    .controller('vsEditorCtrl',
        function ($scope,terminologySvc,vsUrl,$http,formsSvc, modes) {

            //modes is allowed operations - select, view, edit
            //edit only supported when publisher = 'canshare'. assume a simple set of concepts in compose.include

            $scope.publisher = "canshare"
            $scope.newVsRoot =  "http://canshare.com/fhir/ValueSet/"
            $scope.vsUrl = vsUrl
            $scope.input = {}

            $scope.modes = modes
            $scope.display = modes[0]          // default Initial mode  display can be

            $scope.input.newAnswerSystem = "http://snomed.info/sct"

            //if select allowed, then load all VS published by the project from the local server.
            if (modes.indexOf('select') > -1) {
                $scope.allVS = []
                //let termServer = formsSvc.getServers().termServer
                let termServer = "/ds/fhir/"
                let qry = termServer + "ValueSet?publisher="+$scope.publisher + "&_summary=false"  //otherwise the response is automatically summary only
                $http.get(qry).then(
                    function(data) {
                        if (data.data && data.data.entry) {
                            data.data.entry.forEach(function (entry) {
                                $scope.allVS.push(entry.resource)
                            })
                        }
                    }, function(err) {
                        console.log(err)
                    }
                )
            }

            //select an existing VS for this item
            $scope.selectExistingVS = function(VS) {
                $scope.$close(VS)

            }

            function removeModeFromModes(mode) {
                let g = $scope.modes.indexOf(mode)
                if (g > -1) {
                    $scope.modes.splice(g,1)
                }
            }

            if (vsUrl) {
               //get the VS from the local server
                //let termServer = formsSvc.getServers().termServer
                let termServer = "/ds/fhir/"
                let qry = termServer + "ValueSet?url=" + vsUrl
                 $http.get(qry).then(
                     function(data) {
                         let bundle = data.data
                         if (bundle.entry) {
                             $scope.selectedValueSet = bundle.entry[0].resource     //todo strategy for multiple needed

                             //check the publisher. if not 'canshare' then don't allow edit
                             if ($scope.selectedValueSet.publisher) {
                                 if ($scope.selectedValueSet.publisher !== $scope.publisher) {
                                     removeModeFromModes('edit')
                                 }

                             } else {
                                 //no publisher, disable edit
                                 removeModeFromModes('edit')
                             }

                             $scope.display = "view"
                         } else {
                             alert("No Valueset found with url: "+ vsUrl)
                             $scope.display = "select"
                         }
                     }
                 )

            } else {
                $scope.display = 'select'
            }


            //temp = need to load or create


            //set allowCreate if url is unique
            $scope.checkUniqueName = function(name) {
                let termServer = "/ds/fhir/"
                //let termServer = formsSvc.getServers().termServer
                let url = $scope.newVsRoot +  name
                let qry = termServer + "ValueSet?url=" + url
                $http.get(qry).then(
                    function (data) {
                        let bundle = data.data
                        if (! bundle.entry) {
                           $scope.allowCreate = true
                        } else {
                            alert("This name already in use. Please try another")
                        }
                    })
            }

            $scope.createNewVs = function() {
                //
                $scope.selectedValueSet = {resourceType:'ValueSet', id: 'cf-' + new Date().getTime(),compose: {}}
                $scope.selectedValueSet.publisher = $scope.publisher
                $scope.selectedValueSet.status = 'draft'
                $scope.selectedValueSet.url = $scope.newVsRoot + $scope.input.newVsName
                $scope.selectedValueSet.name = $scope.input.newVsName
                $scope.selectedValueSet.title = $scope.input.newVsTitle
                $scope.selectedValueSet.description = $scope.input.newVsDescription
                console.log($scope.selectedValueSet)
                $scope.dirty = true
                $scope.display = 'edit'

                if ($scope.modes.indexOf('edit') == -1) {
                    $scope.modes.push('edit')
                }
                removeModeFromModes('select')

            }

            $scope.input.expandCount = 20

            //$scope.input.codeSystems = [{display:'snomed',url:'http://snomed.info/sct'}]


            //when some external url - like gender is used. This is only available for the 'select' mode
            $scope.addNonCSUrl = function(url) {
                $scope.$close({url:url})
            }


            $scope.removeConcept = function(inx){
                $scope.selectedValueSet.compose.include[0].concept.splice(inx,1)
                $scope.dirty = true
            }


            $scope.moveConceptUp = function(inx) {
                let ar =  $scope.selectedValueSet.compose.include[0].concept.splice(inx-1,1)
                $scope.selectedValueSet.compose.include[0].concept.splice(inx,0,ar[0])
                $scope.dirty = true
            }

            $scope.moveConceptDown = function(inx) {
                let ar =  $scope.selectedValueSet.compose.include[0].concept.splice(inx,1)
                $scope.selectedValueSet.compose.include[0].concept.splice(inx+1,0,ar[0])
                $scope.dirty = true
            }




            //when adding a new answer option which is a Coding
            $scope.addConcept = function(code,system,display){
                code = code || '261665006'      //snomed code for unknown
                let includeObj = {system:system,concept:[]}
                if ($scope.selectedValueSet.compose.include) {
                    includeObj = $scope.selectedValueSet.compose.include[0]
                } else {
                    $scope.selectedValueSet.compose.include = [includeObj]
                }
                includeObj.concept.push({code:code,display:display})


                //let the selected system remain
                delete $scope.input.newAnswerCode
                delete $scope.input.newAnswerDisplay


                $scope.dirty = true

            }

            //save the VS to local and remote term server
            $scope.save = function(){
                console.log($scope.selectedValueSet)
                //return
                let termServer = "/ds/fhir/"

                let url = termServer + "ValueSet/" + $scope.selectedValueSet.id
                $http.put(url,$scope.selectedValueSet).then(
                    function(data) {

                        //save a copy to the term server
                        url = formsSvc.getServers().termServer + "ValueSet/" + $scope.selectedValueSet.id
                        $http.put(url,$scope.selectedValueSet).then(
                            function(data) {
                                alert("ValueSet updated on local and term server")
                                $scope.$close($scope.selectedValueSet)
                            },
                            function (err) {
                                alert("There was a problem saving the VS to the term server (but is saved locally): "+ angular.toJson(err.data))
                                $scope.$close($scope.selectedValueSet)
                            }
                        )
                      //  $scope.$close($scope.selectedValueSet)
                        //$scope.hashTerminology[$scope.selectedValueSet.url] = $scope.selectedValueSet
                    },function(err) {
                        alert("Error saving the VS:" +angular.toJson(err))
                    }
                )
            }

            $scope.expandVS = function(url,filter) {
                //let termServer = "/ds/fhir/"
                let termServer = formsSvc.getServers().termServer
                let qry =  termServer + "ValueSet/$expand?url=" + url
                if (filter) {
                    qry += "&filter="+filter
                }

                if ($scope.input.expandCount) {
                    qry += "&count=" + $scope.input.expandCount
                }

                $http.get(qry).then(
                    function(data){
                        $scope.expandedVs  = data.data
                    }, function(err) {
                        alert(angular.toJson(err))
                    }
                )
            }

            $scope.selectVSEntry = function (entry,vsUrl) {
                delete $scope.expandedVs
                $scope.selectedVSUrl = vsUrl
                $scope.selectedVSEntry = entry
            }

        }
    )
