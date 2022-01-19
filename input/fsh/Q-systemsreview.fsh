
Alias: $itemControl = http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl

Instance: QSystemsReview
InstanceOf: Questionnaire
Description: "Questionnaire Systems review"

* url = "http://clinfhir.com/Questionnaire/systemsreview"
* status = #draft
* name = "SystemsReview"
* title = "Systems Review"
//https://en.wikipedia.org/wiki/Review_of_systems


* item[+].linkId = "constitition"
* item[=].text = "Constitutional symptoms"
* item[=].type = #group

* item[=].item[+].linkId = "weightloss" 
* item[=].item[=].text = "Any weightloss"
* item[=].item[=].type = #choice

* item[=].item[=].answerOption[+].valueCoding = http://terminology.hl7.org/CodeSystem/v2-0136#Y "Yes"
* item[=].item[=].answerOption[+].valueCoding = http://terminology.hl7.org/CodeSystem/v2-0136#N "No"
* item[=].item[=].answerOption[+].valueCoding = http://terminology.hl7.org/CodeSystem/data-absent-reason#asked-unknown "Don't know"

/* When i implement teh Q creator, need to decide whether to just let
the user select the small vs, and insert the options directly into the Q as answerOptions...
* item[=].item[=].answerValueSet = "http://hl7.org/fhir/ValueSet/yesnodontknow"

//indicate that this is a small VS so drop down is OK
* item[=].item[=].extension[+].url = $itemControl
* item[=].item[=].extension[=].valueCodeableConcept = http://hl7.org/fhir/questionnaire-item-control#drop-down

/**/


//* item[=].item[=].code = $loinc#8302-2
//* item[=].item[=].extension[+].url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
//* item[=].item[=].extension[=].valueBoolean = true


