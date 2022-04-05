angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('designerSvc', function($q,$http,$filter,moment) {

        return {
            //create a Q from a collection of items in teh designer
            "makeQ" : function(collection) {
                 let Q = {resourceType:"Questionnaire",status:"draft",item:[]}
                 if (collection && collection.items) {
                     collection.item.forEach(function (vo) {
                         let item = vo.item
                         let qitem = {text:item.name,linkId : item.id}

                         Q.item.push(qitem)
                     })
                 }

                 return Q
            }
        }

    })