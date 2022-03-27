angular.module("formsApp")
    .controller('designerCtrl',
        function ($scope,$http,formsSvc,$uibModal,$localStorage,designerSvc) {
            $scope.input = {dirty:false}

            $scope.hisoDT = ['Alphabetic','Date','DateTime','Numeric','Alphanumeric','Boolean']

            //update the ddItem.
            $scope.saveDdItem = function() {
                let url = "/designer/ddItem"
                $http.post(url,$scope.selectedddItem).then(
                    function(data) {
                        alert("Item has been updated.")
                        loadAllLibrary()
                    },function(err) {
                        alert(angular.toJson(err.data))
                        console.log(err)
                    }
                )
                //manually assemble the ddItem from the controls
            }

            $scope.newDdItem = function() {
                //todo - have a separate more readable linkId for the Q
                $scope.selectedddItem = {id:'id-'+ new Date().getTime()}
                $scope.input.ddItemDirty = false
            }

            $scope.selectddItem = function(ddItem) {
                $scope.selectedddItem = ddItem

                //set the histDatatype to the one in the list (for angular tracking)
                let idt = ddItem.hisoDT
                $scope.hisoDT.forEach(function (dt){
                    if (dt == idt) {
                        ddItem.hisoDT = dt
                    }
                })

                $scope.input.ddItemDirty = false
            }


            //----------- collection stuff

            //create the Q from the collection data and show the form...
            $scope.refreshForm = function() {
                $scope.Q = designerSvc.makeQ($scope.selectedCollection)
            }

            $scope.saveCollection = function() {
                let url = "/designer/collection"
                $http.post(url,$scope.selectedCollection).then(
                    function(data) {
                        alert("Collection has been updated.")

                    },function(err) {
                        alert(angular.toJson(err.data))
                        console.log(err)
                    }
                )
                //manually assemble the ddItem from the controls
            }

            $scope.newCollection = function() {
                $scope.selectedCollection = {id:'id-' + new Date().getTime(),items:[]}
            }

            $scope.selectCollection = function(collection) {
                $scope.selectedCollection = collection
                createPossibleItemsForCollection(collection)
                $scope.input.collectionDirty = false
                //

            }

            //create an array of library items that are not in the collection
            function createPossibleItemsForCollection(collection) {
                $scope.possibleItems = []
                //create hash of items already in collection
                let hash = {}
                if (collection) {
                    collection.items.forEach(function (vo){
                        hash[vo.item.id] = true
                    })
                }



                $scope.library.forEach(function (item){
                    if (! hash[item.id]) {
                        $scope.possibleItems.push(item)
                    }
                })

            }

            $scope.addItemToCollection = function(item){
                //just during dev
                if (!$scope.selectedCollection) {
                    $scope.newCollection()
                }

                //add the entire item so that it can be customized within the collection.
                $scope.selectedCollection.items.push({item:item})
                createPossibleItemsForCollection($scope.selectedCollection)
                $scope.input.collectionDirty = true
            }

            $scope.removeItemFromCollection = function (inx) {
                $scope.selectedCollection.items.splice(inx)
                createPossibleItemsForCollection($scope.selectedCollection)
                $scope.input.collectionDirty = true
            }

            //get all the library items
            function loadAllLibrary() {
                $http.get('/designer/library').then(
                    function (data) {
                        $scope.library = data.data
                        createPossibleItemsForCollection()  //todo - just during dev!!

                    },
                    function(err) {
                        console.log(err)
                    })
            }
            loadAllLibrary()

            //get all the collections
            function loadAllCollections() {
                $http.get('/designer/collections').then(
                    function (data) {
                        $scope.collections = data.data
                    },
                    function(err) {
                        console.log(err)
                    })
            }
            loadAllCollections()


        })