

angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('querySvc', function($q,$http) {

        return {
            performQueryFollowingPaging: function (url, limit) {
                //Get all the resurces specified by a query, following any paging...
                //http://stackoverflow.com/questions/28549164/how-can-i-do-pagination-with-bluebird-promises

                let config = {}

                let returnBundle = {resourceType: 'Bundle', total: 0, type: 'searchset', link: [], entry: []};
                returnBundle.link.push({relation: 'self', url: url})

                var deferred = $q.defer();

                limit = limit || 100;


                getPage(url);

                //get a single page of data
                function getPage(url) {
                    return $http.get(url, config).then(
                        function (data) {
                            var bundle = data.data;     //the response is a bundle...

                            //added May 2019 - check for when the response is not a query...
                            if (bundle && bundle.resourceType !== 'Bundle') {
                                deferred.resolve(bundle);       //isn't really a bundle...
                                return;
                            }

                            //copy all resources into the array..
                            if (bundle && bundle.entry) {
                                bundle.entry.forEach(function (e) {
                                    returnBundle.entry.push(e);
                                })
                            }

                            //is there a link
                            if (bundle.link) {
                                var moreToGet = false;
                                for (var i = 0; i < bundle.link.length; i++) {
                                    var lnk = bundle.link[i];

                                    //if there is a 'next' link and we're not at the limit then get the next page
                                    if (lnk && lnk.relation == 'next') {// && returnBundle.entry.length < limit) {
                                        moreToGet = true;
                                        var url = lnk.url;
                                        getPage(url);
                                        break;
                                    }
                                }

                                //all done, return...
                                if (!moreToGet) {
                                    deferred.resolve(returnBundle);
                                }
                            } else {
                                deferred.resolve(returnBundle);
                            }
                        },
                        function (err) {
                            deferred.reject(err);
                        }
                    )
                }

                return deferred.promise;


            }
        }
    }
    )