
//http://tutorials.jenkov.com/angularjs/custom-directives.html
angular.module("formsApp")
    .directive('displayprovenance', function() {
    var directive = {};

    directive.restrict = 'E';

    directive.templateUrl = "/directive/displayProvenance.html"
    //directive.template = "My first directive: {{dqr.id}}";
    directive.scope = {
        provenance : "=provenance",
        targets : "=targets"
    }
/*
    directive.link = function($scope, element, attributes) {
        $scope.getTargets = function() {
            console.log('ping')
        }
    }

*/
        directive.compile = function(element, attributes,$http) {



            let linkFunction = function($scope, element, attributes) {
                //this is like the controller

                $scope.$watch(function(scope) {
                        return scope.provenance
                    },
                    function(newProv,old) {
                        if (newProv) {
                            console.log('watch called with provenanceid '+ newProv.id)

                            //todo - wait a sec than check targets. get if null
                        }

                    }

                );


                $scope.getTargets = function() {
                    console.log('ping')
                }
            }

            return linkFunction;
        }



    return directive;
});