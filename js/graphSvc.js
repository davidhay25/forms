angular.module("formsApp")

    .service('graphSvc', function($filter) {

        var objColours ={};
        objColours.Patient = '#93FF1A';
        objColours.Composition = '#E89D0C';
        objColours.Encounter = '#E89D0C';
        objColours.List = '#ff8080';
        objColours.Observation = '#FFFFCC';
        objColours.ValueSet = '#FFFFCC';
        objColours.Practitioner = '#FFBB99';
        objColours.MedicationStatement = '#ffb3ff';
        objColours.MedicationRequest = '#ffb3ff';
        objColours.CarePlan = '#FF9900';
        objColours.Sequence = '#FF9900';
        objColours.CareTeam = '#ffe6ff'
        objColours.Condition = '#cc9900';
        objColours.LogicalModel = '#ff8080';
        objColours.ServiceRequest = '#ff8080';
        objColours.Composition = '#ff8080';
        objColours.Organization = '#FF9900';
        objColours.ProviderRole = '#FFFFCC';
        objColours.Location = '#cc9900';
        objColours.HealthcareService = '#FFFFCC';
        objColours.MedicationDispense = '#FFFFCC';
        //objColours.Composition = '#FFFFCC';
        objColours.Medication = '#FF9900';
        objColours.Measure = '#FF9900';
        objColours.Task = '#FF9900';
        objColours.Immunization = '#aeb76c';


        return {

            //assume all references are to GUID - reference pattern = urn:uuid:{target ersource id}

            makeGraph: function (options) {

                //let objColours = {}
                let missingReferences = {}      //where a resource references a missing entry...

                var arNodes = [], arEdges = [];
                var objNodes = {};

                var allReferences = [];
                //let centralResourceNodeId;      //the node id of the centralNode (if any)

                //create a single array of all resources, including contained
                let arResources = []
                let tmpHash = {}

                options.arResources.forEach(function(item) {
                    let resource = angular.copy(item.resource)
                    arResources.push(resource)
                    /*
                    if (resource.contained) {
                        resource.contained.forEach(function (cr) {
                            //let id = '#' + cr.id
                            cr.id = '#' + cr.id
                            if (!tmpHash[cr.id]) {
                                arResources.push(cr)
                                tmpHash[cr.id] = cr
                            }

                        })
                    */
                })


                //create the nodes...
                arResources.forEach(function(resource,inx) {
                    //let resource = item.resource
                    let url = `urn:uuid:${resource.id}`
                    /* assume uuid
                    let url = resource.id
                    if (resource.id.substr(0,1) == '#') {
                       //'# url =  "#" + resource.id    //this is to a conained resource

                    } else {

                        //changed Jul 24 when doing instance graphs. Not sure if it will much up the 'test extraction' in designer
                        //url =  "urn:uuid:" + resource.id    //assume all references are to uuids
                        url =  resource.resourceType + "/" + resource.id    //assume all references are to uuids
                    }
*/


                    objNodes[url] = resource

                    let node = {id: url, label: resource.resourceType,
                        shape: 'box'}//,url:url,resource:resource};  //
                    node.data = {resource:resource}

                    if (objColours[resource.resourceType]) {
                        node.color = objColours[resource.resourceType];
                    }

                    arNodes.push(node);

                    var refs = [];
                    findReferences(refs,resource,resource.resourceType);

                    //console.log(refs);
                    let cRefs = []

                    refs.forEach(function(ref){
                        allReferences.push({src:node,path:ref.path,targ:ref.reference,index:ref.index})
                        //gAllReferences.push({src:url,path:ref.path,targ:ref.reference,index:ref.index});    //all relationsin the collection
                    })
                });

                // console.log(objNodes)

                //so now we have the references, build the graph model...
                //let hash = {};      //this will be a hash of nodes that have a reference to centralResourceId (if specified)


                //console.log(allReferences)

                allReferences.forEach(function(ref){


                    let targetNode = objNodes[ref.targ];


                    if (targetNode) {
                        //var label = $filter('dropFirstInPath')(ref.path);
                        let ar = ref.path.split('.')
                        ar.splice(0,1)
                        let label = ar.join('.')
                        arEdges.push({id: 'e' + arEdges.length +1,
                            from: ref.src.id,
                            to: ref.targ, // targetNode.id,
                            label: label,arrows : {to:true}})
                    } else {
                        /* - Not sure how useful this is...
                        missingReferences[ref.targ] = missingReferences[ref.targ] || []
                        let err = {ref:ref}
                        missingReferences[ref.targ].push(err)
*/
                        console.log('>>>>>>> error Node Id '+ref.targ + ' is not present')
                    }
                });

                let nodes;
                let edges;

                    //nodes = new vis.DataSet(arNodes);
                    nodes = new vis.DataSet(arNodes)
                    edges = new vis.DataSet(arEdges);


                // provide the data in the vis format
                var data = {
                    nodes: nodes,
                    edges: edges
                };


                if (missingReferences && Object.keys(missingReferences).length > 0) {
                    console.log(missingReferences)
                }


                return {graphData : data};


                function findReferences(refs,node,nodePath,index) {
                    angular.forEach(node,function(value,key){

                        //if it's an object, does it have a child called 'reference'?

                        if (angular.isArray(value)) {
                            value.forEach(function(obj,inx) {
                                //examine each element in the array
                                if (obj) {  //somehow null's are getting into the array...
                                    var lpath = nodePath + '.' + key;
                                    if (obj.reference) {
                                        //this is a reference!
//console.log(obj)
                                        //there are also circumstances where this is an element name
                                        //mar 15 - 2022

                                        let thing = obj.reference;
                                        if (thing.reference) {
                                            thing = thing.reference
                                        }
                                        refs.push({path: lpath, reference: obj.reference})
                                        /*
                                        //if (obj.reference && obj.reference.indexOf('urn:uuid') !== -1) {
                                        if (thing.indexOf('urn:uuid') !== -1) {
                                            // this is an uuid
                                            refs.push({path: lpath, reference: obj.reference})
                                        } else {
                                            if (thing.indexOf('http') == 0) {
                                                //if (obj.reference.indexOf('http') == 0) {
                                                //this is an absolute reference
                                                refs.push({path: lpath, reference: obj.reference})
                                            } else {
                                                //construct an absolute reference from the server root if possible
                                                //get the 'serverRoot' from the fullUrl of the entry




                                                if (serverRoot) {
                                                    //if there's a serverRoot and it this is a relative reference, then convert to an absolute reference

                                                    refs.push({path: lpath, reference: serverRoot + obj.reference})

                                                } else {
                                                    refs.push({path: lpath, reference: obj.reference})
                                                }
                                            }
                                        }
                                        */
                                    } else {
                                        //if it's not a reference, then does it have any children?
                                        findReferences(refs,obj,lpath,inx)
                                    }
                                }

                            })
                        } else

                        if (angular.isObject(value)) {
                            var   lpath = nodePath + '.' + key;
                            if (value.reference) {
                                //this is a reference!
                                //if (showLog) {console.log('>>>>>>>>'+value.reference)}

                                refs.push({path: lpath, reference: value.reference, index: index})
                                /*
                                if (value.reference.indexOf('urn:uuid') !== -1) {
                                    // this is an uuid
                                    //refs.push({path: lpath, reference: obj.reference})
                                    refs.push({path: lpath, reference: value.reference, index: index})
                                } else {

                                    if (value.reference.indexOf('http') == 0) {
                                        //this is an absolute reference
                                        refs.push({path: lpath, reference: value.reference, index: index})
                                    } else {
                                        if (serverRoot) {
                                            //if there's a serverRoot and it this is a relative reference, then convert to an absolute reference
                                            //todo check if relative first!
                                            refs.push({path: lpath, reference: serverRoot + value.reference, index: index})
                                        } else {
                                            refs.push({path: lpath, reference: value.reference, index: index})
                                        }
                                    }

                                }
                                */

                            } else {
                                //if it's not a reference, then does it have any children?
                                findReferences(refs,value,lpath)
                            }
                        }


                    })
                }




            }
        }
    })