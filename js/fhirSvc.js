angular.module("formsApp")
    //build FSH from Q (anf other
    .service('fhirSvc', function($q,$http,formsSvc) {

        //get the resource element definitions
        $http.get("artifacts/resourceElementsR4.json").then(
            function(data) {
                console.log(data.data)
                resourceElements = data.data     //contains all the resource definitions
            }
        )


        return {
            makeResourceArray : function(Q,QR) {
                //pass in a Q and create a sample of resources
                //quite specific to the structured path requirements at present - and, indeed, the report ...
                //assume that there is only a single specimen & SR. If an element states that it is an element in one of these
                //then use it in the specimen/SR. In real life, each Specimen will be associated with a single DiagnosticReport


                //if a QR is passed in, then extract the sample data from it into a hash on linkId. Otherwies use generated data

                let arResources = []        //a simple array of resources (in a vo)
                let arMappingItems = []     //a list of all the items with mapping data (isObservation & notes)
                let processLog = []         //any issues or notes during processing
                let knownTypes = {}         //a hash of resource types (1 of each) created for the bundle



                //the representative Patient
                let patient = {resourceType:"Patient",id:"cf-patient-1",name:[{text:"John Doe"}]}
                patient.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>John Doe</div>"}

                arResources.push({resource:patient})
                knownTypes.Patient = patient

                //the representative ServiceRequest
                let servicerequest = {resourceType:'ServiceRequest',id:'cf-servicerequest-1',status:'active',intent:'order',supportingInfo:[]}
                servicerequest.subject = {reference:'Patient/'+patient.id}
                servicerequest.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>servicerequest</div>"}


                arResources.push({resource:servicerequest})
                knownTypes.ServiceRequest = servicerequest

                //the representative Specimen
                let specimen = {resourceType:'Specimen',id:'cf-specimen-1'}
                specimen.subject = {reference:'Patient/'+patient.id}
                specimen.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>specimen</div>"}

                arResources.push({resource:specimen})
                knownTypes.Specimen = specimen

                //the representative diagnosticReport. There will be one per specimen
                let diagnosticReport = {resourceType:'DiagnosticReport',id:'cf-diagnosticreport-1',status:"final",result:[]}
                diagnosticReport.code = {text:"Code for a pathology report. Specific to the model."}
                diagnosticReport.subject = {reference:'Patient/'+patient.id}
                diagnosticReport.specimen = [{reference:'Specimen/'+specimen.id}]
                diagnosticReport.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>diagnosticReport</div>"}

                arResources.push({resource:diagnosticReport})
                knownTypes.DiagnosticReport = diagnosticReport

                //the Practitioner for any 'request' resources - ie clinical data in the request
                let requestPractitioner = {resourceType:"Practitioner",id:"prac-request","name":[{text:"Robyn Requestor"}]}
                requestPractitioner.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>Requesting clinician</div>"}
                arResources.push({resource:requestPractitioner})

                //the pathologist in the report
                let reportingPractitioner = {resourceType:"Practitioner",id:"prac-report","name":[{text:"Peter Pathologist"}]}
                reportingPractitioner.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>Reporting clinician</div>"}
                arResources.push({resource:reportingPractitioner})

                Q.item.forEach(function (section) {
                    if (section.item) {
                        //the section has items
                        //sections won't correspond to a resource

                        //an entry that will allow the section to be listed in the audit display
                        arMappingItems.push({item:section,isSection:true})



                        section.item.forEach(function (child) {
                            if (child.item) {
                                //this is a group
                                child.item.forEach(function (grandChild) {

                                    processElement(grandChild,child,section)

                                })
                            } else {
                                //this is a leaf

                                processElement(child,null,section)

                            }
                        })
                    }
                })

                return {resources:arResources,arMappingItems:arMappingItems,processLog : processLog}

                //perform the actual processing
                function processElement(item,parent,section) {
                    let meta = formsSvc.getMetaInfoForItem(item)

                    //every otem in the tree has an entry in arMappingItems
                    let mapItem = {item:item,meta:meta}
                    arMappingItems.push(mapItem)

                    let extraction = meta.extraction || {}
                    if (extraction.none) {
                        processLog.push({msg: "Ignoring " + item.linkId,linkId:item.linkId,type:"info"})
                        return
                    }

                    let isObservation = false
                    if (meta.extraction && meta.extraction.extractObservation) {
                        isObservation = true
                    }

                    if (isObservation) {
                        //this element is marked as an observation

                        let obs = makeObservation(item)
                        let vo = {resource:obs,item:item,section:section}
                        referenceObsFromSource(vo)          //create a reference from the 'parent / source' to the observation
                        arResources.push(vo)
                        return
                    }

                    //now see if a resourceType and path is defined - todo, think about extensions
                    if (extraction.type) {
                        if (extraction.path) {
                            //so there is a type and a path. Is the type one of our recognized ones? (and we are assuming only one at this stage)
                            if (! knownTypes[extraction.type]) {
                                processLog.push({msg: item.linkId + " has a type that is not supported: " + extraction.type,linkId:item.linkId,type:"error"})
                                return
                            }
                            let resourceToUpdate = knownTypes[extraction.type]
                            //todo - need a way to check the path is correct (though should come out in the validation)

                            let response = getElementDefinition(extraction.type,extraction.path)
                            console.log(response)
                            if (response.err) {
                                processLog.push({msg: item.linkId + " has an unknown path: " + response.err,linkId:item.linkId,type:"error"})
                                return
                            }

                            //now need to figure out the datatype to use. For now, just grab the first one
                            //todo - does there need to be some way of specifying the datatype in the model? perhaps when there can be > 1
                            //todo - if so, can the form UI be made smarter? (eg an identifier)
                            let dataType = response.types[0].code

                            //todo this may not be needed when getting sample data from a QR
                            //todo - this will only work for paths where the element os off the root. May need to be smarter (and consider sushi)

                            let value
                            switch (dataType) {
                                case "Identifier" :
                                    value = {system:"http://example.com","value":"dummy identifier " + item.linkId}
                                    break
                                case "string" :
                                    value = "Dummy value " + item.linkId
                                    break
                                case "CodeableConcept" :
                                    value = {text:"Dummy value " + item.linkId}
                                    break
                                default:
                                    processLog.push({msg: item.linkId + " has an unsupported dataType: " + dataType,linkId:item.linkId,type:"error"})
                                    break
                            }

                            if (value) {
                                if (response.max == "*") {
                                    resourceToUpdate[extraction.path] = resourceToUpdate[extraction.path] || []
                                    resourceToUpdate[extraction.path].push(value)
                                } else {
                                    resourceToUpdate[extraction.path] = value
                                }
                            }

                        } else {
                            processLog.push({msg: item.linkId + " has a type but no path",linkId:item.linkId,type:"error"})
                            return
                        }
                    }

                }

                function referenceObsFromSource(vo) {
                    //an Observation is generally referenced by the ServiceRequest if it was supplied
                    //as part of the request, or from the diagnosticreport if provided by the lab.
                    //todo we'll use the section linkId for now - but an extension of some sort on the section might be better
                    //todo - likely need to refine this. One possibility is an extension on the item (though there are lots of them)
                    //todo - will need review if resources other than Observations use this...

                    if (vo.section.linkId == 'clinicalinformation') {
                        servicerequest.supportingInfo.push({reference:vo.resource.resourceType + "/"+ vo.resource.id})
                        vo.resource.performer = [{reference:"Practitioner/" + requestPractitioner.id}]
                        vo.parentType = "ServiceRequest"  //for the table display
                    } else {
                        diagnosticReport.result.push({reference:vo.resource.resourceType + "/"+ vo.resource.id})
                        vo.resource.performer = [{reference:"Practitioner/" + reportingPractitioner.id}]
                        vo.parentType = "DiagnosticReport"  //for the table display
                    }
                }

                //create the base Observation
                function makeObservation(item) {
                    //construct a base Observation
                    let obs = {resourceType:"Observation",id:item.linkId}
                    obs.text = {status:'empty'}
                    obs.text.div = "<div xmlns='http://www.w3.org/1999/xhtml'>Observation</div>"
                    obs.status = "final"

                    //make up a code based on the linkID for now...
                    let code = {system:"http://unknown.com",code:item.linkId}  //item.code    //the code that has been defined in the model
                    obs.code = {coding:[code]}
                    obs.subject = {reference:"Patient/"+patient.id}
                    obs.effectiveDateTime = new Date().toISOString()

                    //when there is a sample QR, get the value from there. for ow - make one up

                    //observation type depends on the Q item type
                    switch (item.type) {
                        case 'choice' :
                            obs.valueCoding = {text:"dummy value"}
                            break
                        default :
                            obs.valueString = "dummy value"

                    }

                    return obs
                }

                function getElementDefinition(type,path) {
                    let arDef = resourceElements[type]
                    if (! arDef) {
                        return {err:true,msg:"Unknown type: " + type}
                    }
                    let fullPath = type + "." + path
                    //let eleDef = null

                    let arResult = arDef.filter(ele => ele.path == fullPath)
                    if (arResult.length !== 1) {
                        return {err:true,msg:"Unknown path:" + fullPath}
                    } else {
                        return arResult[0]
                    }




                }

                function createStandardResourcesDEP() {
                    //resources that will always be part of the report / request
                    //the representative Patient
                    let patient = {resourceType:"Patient",id:"cf-patient-1",name:[{text:"John Doe"}]}
                    patient.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>John Doe</div>"}

                    arResources.push({resource:patient})
                    knownTypes.Patient = patient

                    //the representative ServiceRequest
                    let servicerequest = {resourceType:'ServiceRequest',id:'cf-servicerequest-1',status:'active',intent:'order',supportingInfo:[]}
                    servicerequest.subject = {reference:'Patient/'+patient.id}
                    servicerequest.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>servicerequest</div>"}


                    arResources.push({resource:servicerequest})
                    knownTypes.ServiceRequest = servicerequest

                    //the representative Specimen
                    let specimen = {resourceType:'Specimen',id:'cf-specimen-1'}
                    specimen.subject = {reference:'Patient/'+patient.id}
                    specimen.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>specimen</div>"}

                    arResources.push({resource:specimen})
                    knownTypes.Specimen = specimen

                    //the representative diagnosticReport. There will be one per specimen
                    let diagnosticReport = {resourceType:'DiagnosticReport',id:'cf-diagnosticreport-1',status:"final",result:[]}
                    diagnosticReport.code = {text:"Code for a pathology report. Specific to the model."}
                    diagnosticReport.subject = {reference:'Patient/'+patient.id}
                    diagnosticReport.specimen = [{reference:'Specimen/'+specimen.id}]
                    diagnosticReport.text = {status:'additional',div:"<div xmlns='http://www.w3.org/1999/xhtml'>diagnosticReport</div>"}

                    arResources.push({resource:diagnosticReport})
                    knownTypes.DiagnosticReport = diagnosticReport

                }
            }
        }
    })