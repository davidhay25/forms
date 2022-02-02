angular.module("formsApp")

    .filter('HumanName',function(){
        return function (hn) {
            if (hn.text) {
                return hn.text
            }
           // if ()


        }
    })

    .filter('NHI',function(){
        return function (patient) {
            let nhi = ""
            if (patient && patient.identifier) {
                patient.identifier.forEach(function (ident){

                    if (ident.system == "https://standards.digital.health.nz/ns/nhi-id") {
                        nhi = ident.value
                    }
                })
            }
            return nhi
        }})

        .filter('age',function(){
            return function(da){
                if (da) {
                    var diff = moment().diff(moment(da),'days');
                    var disp = "";

                    if (diff < 0) {
                        //this is a future date...
                        return "";
                    }

                    if (diff < 14) {
                        disp = diff + " days";
                    } else if (diff < 32) {
                        disp = Math.floor( diff/7) + " weeks";
                    } else {
                        disp = Math.floor( diff/365) + " years";
                        //todo logic for better age
                    }
                    return disp;

                } else {
                    return '';
                }

            }
        })

        .filter('prettyDate',function(){
            return function(da){
                if (da) {
                    return moment(da).format('Do MMM  hh:mm a')
                }

            }
        })

