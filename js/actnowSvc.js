angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('actnowSvc', function($q,$http,$filter,moment) {

        const exIOT = "http://actnow/intent-of-treatment"
        const exCN = "http://actnow/cycle-number"
        const exAssertedDate = "http://hl7.org/fhir/StructureDefinition/condition-assertedDate"
        const exLaterality = "http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-laterality-qualifier"
        const maBasedOn = "http://clinfhir.com/StructureDefinition/based-on"


        const codeBSA = "8277-6"        //code for Body Surfave Area observation
        const codeTNM = "21908-9"       //clinical TNM Group Observation
        const codeTNM_T = "21905-5"       //clinical T Observation
        const codeTNM_N = "21906-3"       //clinical N Observation
        const codeTNM_M = "21907-3"       //clinical M Observation

        //find a resource that has an element with a given value
        //for now, assume we're looking for a resource with
        //elementName is the name of the element to check
        //code is the code to look for (ignoring system for now
        //hash is the hash of all resources
        function findResourceWithCode(hash, code, elementName) {
            elementName = elementName || 'code'
            let ar = []
            Object.keys(hash).forEach(function (k,v) {
                let resource = hash[k]
                console.log(resource)
                if (resource[elementName]) {
                    let v = resource[elementName]
                    if (Array.isArray(v)) {
                        //not sure of best way to handle this. Ignore until I need to...
                    } else {
                        if (v.coding) {
                            v.coding.forEach(function (coding){
                                if (coding.code == code) {
                                    ar.push(resource)
                                }
                            })
                        }
                    }
                }
            })
            return ar
        }

        //find an extension by url
        function getExtension(resource,url) {
            let extensions = []
            if (resource && resource.extension) {

                extensions = resource.extension.filter(ext => ext.url == url)   //should be equivalent

                /*resource.extension.forEach(function (ext) {
                    if (ext.url == url) {
                        extensions.push(ext)
                    }
                })
                */
            }
            return extensions
        }

        //return true if this resource has a .code element with the given code
        //ignore code system for now
        function doesResourceHaveMatchingCode(resource,code) {
            outcome = false
            if (resource.code && resource.code.coding) {
                resource.code.coding.forEach(function (coding){
                    if (coding.code == code) {
                        outcome = true
                    }
                })
            }
            return outcome
        }

        return {


            makeRegimenLM: function (regimenCP,hashResources) {
                //construct a LM from FHIR data. Easier to manipulate in UI
                //In theory, could be a 'templated' function - graphQL, CQL, FHIR mapping
                //hashResources key is type/id
                //note that intended to be compliant with the CanShare IG - it's not generic.
                //in particular, a number of elements in the model are multiple - but we're only taking the first one...
                //and for CodeableConcept only the forst coding is taken
                //todo - this should feed back into the LM - and get clinical sign off on that


                let lm = {model:{}, cycles:[]}

                lm.model.title = regimenCP.title
                lm.model.regimen = {url:regimenCP.instantiatesCanonical}
                //lm.resource = regimenCP     //the original CP (for reference only)
                
                //get the diagnosis info - found in the Condition resource/s from the addresses link of the regimen CP
                lm.model.diagnosis = []
                if (regimenCP.addresses) {
                    regimenCP.addresses.forEach(function (ref) {
                        let condition = hashResources[ref.reference]    //can only be a condition
                        if (condition) {
                            let item = {}
                            if (condition.code && condition.code.coding){
                                item.histology = condition.code.coding[0]
                            }

                            if (condition.bodySite) {
                                //Only choose the first bodtSite and the first coding.assume this is the primary site
                                item.primarySite = condition.bodySite[0].coding[0]
                            }

                            //todo - needs more thought, esp in relation to TNM and other staging
                            if (condition.stage && condition.stage[0].summary.coding) {
                                item.grade = condition.stage[0].summary.coding[0]
                            }


                            //dateDX from asserted date extension
                            let cn = getExtension(condition,exAssertedDate)
                            if (cn.length > 0) {
                                item.diagnosisDate = cn[0].valueDate
                            }

                            //laterality from laterality extension - assume only a single laterality
                            let d = getExtension(condition,exLaterality)
                            if (d.length > 0) {
                                item.laterality = d[0].valueCodeableConcept.coding[0]
                            }

                            lm.model.diagnosis.push(item)

                        } else {
                            console.log("resource not found: " + ref.reference)
                        }


                    })
                }

                //examine the supportingInfo references - currently only TNM obs, but others likely
                if (regimenCP.supportingInfo) {
                    regimenCP.supportingInfo.forEach(function(si){
                        let resource = hashResources[si.reference]      //currently only an Observation todo should we check?
                        if (resource) {
                            if (resource.code && resource.code.coding && resource.code.coding.length > 0) {
                                let coding = resource.code.coding[0]
                                console.log(coding)
                                //there could be other resources referenced from the CP - each needs to be processed separately into the model
                                switch (coding.code) {
                                    case codeTNM :
                                        //this is the 'parent' TNM Observation. Need to find the child obs from the  hasMember element
                                        let tnm = {}
                                        let hasMember = resource.hasMember
                                        if (hasMember) {
                                            hasMember.forEach(function (memberRef) {

                                                let child = hashResources[memberRef.reference]
                                                if (child) {
                                                    //this will be an Observation of T, N or M
                                                    //todo - not checking for null...
                                                    let childCode = child.code.coding[0].code
                                                    switch (childCode) {
                                                        case codeTNM_T :
                                                            tnm.T = child.valueCodeableConcept.coding[0]
                                                            break
                                                        case codeTNM_N :
                                                            tnm.N = child.valueCodeableConcept.coding[0]
                                                            break
                                                        case codeTNM_M :
                                                            tnm.M = child.valueCodeableConcept.coding[0]
                                                            break
                                                    }
                                                }

                                            })

                                        }

                                        lm.model.tnm = tnm
                                        break
                                }
                            }

                        }
                    })
                }


                //locate cycle careplans related to this one
                Object.keys(hashResources).forEach(function (key){
                    //key is type/id
                    let resource = hashResources[key]
                    if (resource.resourceType == 'CarePlan' && resource.partOf) {
                        resource.partOf.forEach(function (po){
                            if (po.reference == "CarePlan/"+ regimenCP.id) {
                                //this is a cycle CP that is 'partOf' the regimen CP
                                let cyleCP = resource
                                let item = {}
                                //item.resource = resource
                                item.model = {}     //this will be the 'extracted' data
                                item.model.id = resource.id
                                item.model.status = resource.status
                                item.model.period = resource.period
                                item.model.title = resource.title

                                //get cycle number
                                let cn = getExtension(resource,exCN)
                                if (cn.length > 0) {
                                    item.model.cycleNumber = cn[0].valueInteger
                                }

                                //get all 'supportingInfo' resources (currently only Observations)
                                // these are references from the plan to the observations
                                if (resource.supportingInfo) {
                                    resource.supportingInfo.forEach(function (ref){
                                        let referredToResource = hashResources[ref.reference]
                                        if (referredToResource) {
                                            if (doesResourceHaveMatchingCode(referredToResource,codeBSA)) {
                                                //this is an observation for body surface area
                                                item.model.BSA = referredToResource.valueQuantity
                                            }
                                        }

                                    })
                                }

                                //get all the activities in the careplan
                                if (cyleCP.activity) {
                                    item.model.activities = []
                                    cyleCP.activity.forEach(function (act){

                                        item.model.activities.push({display: act.detail.description,
                                            product:act.detail.productCodeableConcept})
                                    })
                                }


                                //get all the data from Observations with a 'basedOn' reference
                                //these are resources with a link back to the plan (_revinclude stuff)
                                item.model.outcome = {}
                                Object.keys(hashResources).forEach(function (key) {
                                    let resource = hashResources[key]
                                    if (resource && resource.resourceType == 'Observation') {
                                        if (resource.basedOn && resource.basedOn.reference == "CarePlan/" + cyleCP.id) {
                                            //need to get the specific LM elements that this represents
                                        }
                                    }
                                })


                                //get all the MedicationAdministrations associated with the cycleCP
                                item.model.medications = []
                                Object.keys(hashResources).forEach(function (key) {
                                    //key is type/id

                                    let resource = hashResources[key]

                                    if (resource.resourceType == 'MedicationAdministration') {
                                        //get the 'based-on' extension to see if it refers to the cycle being examined
                                        let ext = getExtension(resource,maBasedOn)
                                        if (ext.length > 0) {
                                            //should only be 1
                                            if (ext[0].valueReference && ext[0].valueReference.reference == "CarePlan/" + cyleCP.id) {
                                                let maElement = {}
                                                maElement.drugName = resource.medicationCodeableConcept.text
                                                maElement.drugCode = resource.medicationCodeableConcept.coding
                                                maElement.dosage = resource.dosage.text
                                                maElement.period = resource.effectivePeriod
                                                item.model.medications.push(maElement)
                                            }
                                        }




                                    }
                                })


                                lm.cycles.push(item)
                            }
                        })
                    }
                })

                lm.cycles.sort(function(a,b){
                    let n1 = a.model.cycleNumber
                    let n2 = b.model.cycleNumber
                    if (n1 > n2) {
                        return 1
                    } else {
                        return -1
                    }
                })



                return lm



            }
        }

    })
