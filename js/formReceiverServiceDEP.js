//formsreceiver services

angular.module("formsApp")

    .service('frSvc', function($q,$http,$filter,moment) {

        return {
            //make the treeData from the Q


            extractResources: function (QR,Q) {
                //extract resources from QR
                let deferred = $q.defer()

                //retrieve Q if not supplied

                return deferred.promise

            }
        }
    })