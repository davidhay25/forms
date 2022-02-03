
//http://tutorials.jenkov.com/angularjs/custom-directives.html
angular.module("formsApp")
    .directive('displayform', function() {
    var directive = {};

    directive.restrict = 'E';

    directive.templateUrl = "/directive/renderForm.html"
    //directive.template = "My first directive: {{dqr.id}}";
    directive.scope = {
        patient : "=patient",
        qr : "=qr"
    }

    return directive;
});