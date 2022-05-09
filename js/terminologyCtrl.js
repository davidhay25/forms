angular.module("formsApp")
    .controller('terminologyCtrl',
        function ($scope,terminologySvc,$http,$window,formsSvc) {

            $scope.input = {}
            $scope.input.expandCount = 20

            $scope.input.codeSystems = [{display:'snomed',url:'http://snomed.info/ct'}]

            $scope.newVS = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/vsEditor.html',
                    backdrop: 'static',
                    controller: 'vsEditorCtrl',
                    size : 'lg',
                    resolve: {
                        vsUrl: function () {
                            return url
                        },
                        modes : function() {
                            return ['select','view','edit']
                        }
                    }
                }).result.then(
                    function (vs) {
                        if (vs) {
                           //add
                        }
                    }

                )

                /*
                let name = $window.prompt("Enter name for vs (no spaces, will become url). Make sure it's unique")
                if (name) {
                    let url = "http://canshare.com/fhir/ValueSet/temp-"+name
                    let qry = formsSvc.getServers().termServer + "ValueSet?identifier=" + url
                    $http.get(qry).then(
                        function(data) {
                            if (data.data.entry && data.data.entry.length >0) {
                                alert("Sorry, that name has been used, try again")
                            } else {
                                $scope.selectedValueSet = {resourceType:"ValueSet",url:url, status:'draft', name:name, compose:{system:'http:/snomed.info/ct',include:[]}}
                                $scope.selectedValueSet.id = "cf-" + name

                            }
                        }
                    )
                }
                */
            }


            $scope.removeOptionDEP = function(inx){
                $scope.selectedValueSet.compose.include.splice(inx)
            }


            $scope.moveAnswerUpDEP = function(inx) {
                let ar =  $scope.selectedValueSet.compose.include.splice(inx-1,1)
                $scope.selectedValueSet.compose.include.splice(inx,0,ar[0])
            }

            $scope.moveAnswerDownDEP = function(inx) {
                let ar =  $scope.selectedValueSet.compose.include.splice(inx,1)
                $scope.selectedValueSet.compose.include.splice(inx+1,0,ar[0])
            }

            $scope.addOtherAnswerOptionDEP = function(opt) {
                $scope.newItem.answerOption = $scope.newItem.answerOption || []
                switch ($scope.newItem.type) {
                    case 'integer' :
                        $scope.newItem.answerOption.push({valueInteger:opt})
                        break
                    case 'string' :
                        $scope.newItem.answerOption.push({valueString:opt})
                        break
                }

                delete $scope.input.newAnswerOption
            }


            //when adding a new answer option which is a Coding
            $scope.addOptionDEP = function(code,system,display){
                $scope.selectedValueSet.compose.include = $scope.selectedValueSet.compose.include || []

                let opt = {valueCoding:{}}
                opt.valueCoding.code = code
                opt.valueCoding.system = system
                opt.valueCoding.display = display

                //let the selected system remain
                delete $scope.input.newAnswerCode
                delete $scope.input.newAnswerDisplay

                $scope.selectedValueSet.compose.include.push(opt)

            }

            $scope.save = function(){
                let url = formsSvc.getServers().termServer + "ValueSet/" + $scope.selectedValueSet.id
                $http.put(url,$scope.selectedValueSet).then(
                    function(data) {
                        alert("ValueSet updated")
                        $scope.hashTerminology[$scope.selectedValueSet.url] = $scope.selectedValueSet
                    },function(err) {
                        alert(angular.toJson(err))
                }
                )
            }

            $scope.expandVS = function(url,filter) {
                let qry =  terminologySvc.getTerminologyServer() + "ValueSet/$expand?url=" + url
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
                delete $scope.termVS
                $scope.selectedVSUrl = vsUrl
                $scope.selectedVSEntry = entry

                let url = "/ds/fhir/ValueSet?url=" + vsUrl

                $http.get(url).then(
                    function(data) {
                        if (data.data && data.data.entry) {
                            $scope.termVS = data.data.entry[0].resource

                        }
                    }
                )
            }

        }
    )
