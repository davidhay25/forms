//Smoking status
Alias: $ss-vs = http://clinfhir.com/ValueSet/ss
Alias: $ss-cs = http://clinfhir.com/CodeSystem/ss

//site
Alias: $site-vs = http://clinfhir.com/ValueSet/site
Alias: $site-cs = http://clinfhir.com/CodeSystem/site

//resection
Alias: $resection-vs = http://clinfhir.com/ValueSet/resection
Alias: $resection-cs = http://clinfhir.com/CodeSystem/resection

//general
Alias: $snomed = http://snomed.info/sct
Alias: $loinc = http://loinc.org
Alias: $ucum = http://unitsofmeasure.org

Instance: QLungCancerInstance
InstanceOf: QuestionnaireResponse
Description: "A QR instance"

* status = #completed
* questionnaire = "http://clinfhir.com/Questionnaire/lungcancer"
* subject = Reference(Patient/patient1)
* authored = 2022-01-18T12:00:00Z

* item[+].linkId = "clinicalinfo"
* item[=].text = "Clinical Information"

* item[=].item[+].linkId = "height"
* item[=].item[=].answer[0].valueDecimal = 160

* item[=].item[+].linkId = "weight"
* item[=].item[=].answer[0].valueDecimal = 80

//------------------------------------------------------------

Instance: QLungCancer
InstanceOf: Questionnaire
Description: "Questionnaire for Lung Cancer histology request"

* url = "http://clinfhir.com/Questionnaire/lungcancer"
* status = #draft
* name = "LungCancerHistologyRequest"
* title = "A form to capture data to accompany a histology request for lung cancer"



//-----  clinical information

* item[+].linkId = "test"
* item[=].text = "test question at top level"
* item[=].type = #text

* item[+].linkId = "clinicalinfo"
* item[=].text = "Clinical Information"
* item[=].type = #group

* item[=].item[+].linkId = "provdx"
* item[=].item[=].text = "Provisional Diagnosis"
* item[=].item[=].type = #choice
* item[=].item[=].code = $snomed#148006
* item[=].item[=].code.display = "Provisional Diagnosis" 
* item[=].item[=].answerValueSet = "http://hl7.org/fhir/ValueSet/condition-code"
* item[=].item[=].extension[+].url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
* item[=].item[=].extension[=].valueBoolean = true

* item[=].item[+].linkId = "height"
* item[=].item[=].text = "Current height (m)"
* item[=].item[=].type = #decimal
* item[=].item[=].code = $loinc#8302-2
* item[=].item[=].code.display = "Height" 
* item[=].item[=].extension[+].url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
* item[=].item[=].extension[=].valueBoolean = true
* item[=].item[=].extension[+].url = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
* item[=].item[=].extension[=].valueCoding = $ucum#cm


* item[=].item[+].linkId = "weight"
* item[=].item[=].text = "Current weight (Kg)"
* item[=].item[=].type = #decimal
* item[=].item[=].code = $loinc#29463-7
* item[=].item[=].code.display = "Weight" 
* item[=].item[=].extension[+].url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
* item[=].item[=].extension[=].valueBoolean = true
* item[=].item[=].extension[+].url = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
* item[=].item[=].extension[=].valueCoding = $ucum#kg




* item[=].item[+].linkId = "ss"
* item[=].item[=].text = "Smoking Status"
* item[=].item[=].type = #choice
* item[=].item[=].code = $loinc#272166-2
* item[=].item[=].code.display = "Smoking Status" 

* item[=].item[=].answerOption[+].valueCoding = $ss-cs#current "current"
* item[=].item[=].answerOption[+].valueCoding  = $ss-cs#current "ex"
* item[=].item[=].answerOption[+].valueCoding  = $ss-cs#current "never"

* item[=].item[=].extension[+].url = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
* item[=].item[=].extension[=].valueBoolean = true


* item[=].item[+].linkId = "absestos"
* item[=].item[=].text = "Asbestos exposure"
* item[=].item[=].type = #boolean

* item[=].item[+].linkId = "previousCx"
* item[=].item[=].text = "Details of previous cytology or biopsies for this tumour"
* item[=].item[=].type = #text

* item[=].item[+].linkId = "previousTx"
* item[=].item[=].text = "Details of previous treatment for this tumour"
* item[=].item[=].type = #text

* item[=].item[+].linkId = "previousCancer"
* item[=].item[=].text = "Details of previous cancer diagnosis"
* item[=].item[=].type = #text

* item[=].item[+].linkId = "site"
* item[=].item[=].text = "Site and laterality"
* item[=].item[=].type = #choice
//* item[=].item[=].answerValueSet = $site-vs

* item[=].item[=].answerOption[+].valueCoding = $site-cs#rul "Right Upper Lobe"
* item[=].item[=].answerOption[+].valueCoding = $site-cs#rml "Right Middle Lobe"
* item[=].item[=].answerOption[+].valueCoding = $site-cs#rll "Right Lower Lobe"
* item[=].item[=].answerOption[+].valueCoding = $site-cs#lul "Left Upper Lobe"
* item[=].item[=].answerOption[+].valueCoding = $site-cs#lll "Left Lower Lobe"
* item[=].item[=].answerOption[+].valueCoding = $site-cs#mb "Main Bronchus"

* item[=].item[+].linkId = "resection"
* item[=].item[=].text = "Nature of the resection"
* item[=].item[=].type = #choice
//* item[=].item[=].answerValueSet = $resection-vs

* item[=].item[=].answerOption[+].valueCoding = $resection-cs#wedge "wedge"
* item[=].item[=].answerOption[+].valueCoding = $resection-cs#segmentectomy "segmentectomy"
* item[=].item[=].answerOption[+].valueCoding = $resection-cs#bilobectomy "bilobectomy"
* item[=].item[=].answerOption[+].valueCoding = $resection-cs#lobectomy "lobectomy"
* item[=].item[=].answerOption[+].valueCoding = $resection-cs#pneumonectomy "pneumonectomy"
* item[=].item[=].answerOption[+].valueCoding = $resection-cs#other "Other"


//--------- specimen
* item[+].linkId = "specimen"
* item[=].text = "Specimen Information"
* item[=].type = #group

* item[=].item[+].linkId = "specLabel"
* item[=].item[=].text = "Specimen Label"
* item[=].item[=].type = #string

* item[=].item[+].linkId = "specReturn"
* item[=].item[=].text = "Patient requests specimen return"
* item[=].item[=].type = #boolean

// Resection
CodeSystem:  Resection
Id: resection
Title: "Nature of the resection"

* ^url = $resection-cs

* #wedge "wedge"
* #segmentectomy "segmentectomy"
* #bilobectomy "bilobectomy"
* #lobectomy "lobectomy"
* #pneumonectomy "pneumonectomy"
* #other "Other"

ValueSet : Resection
Id: resection
Title: "Nature of the resection"

* ^url = $resection-vs
* codes from system $resection-cs

//site
CodeSystem:  Site
Id: site
Title: "Smoking Status"

* ^url = $site-cs

* #rul "Right Upper Lobe"
* #rml "Right Middle Lobe"
* #rll "Right Lower Lobe"
* #lul "Left Upper Lobe"
* #lll "Left Lower Lobe"
* #mb "Main Bronchus"

ValueSet : Site
Id: site
Title: "Site and laterality"

* ^url = $site-vs
* codes from system $site-cs

//smoking status
CodeSystem:  SmokingStatus
Id: smoking-status
Title: "Smoking Status"

* ^url = $ss-cs

* #current "current" "The person is currently a smoker"
* #ex "ex" "The person is an ex smoker."
* #never "never" "The person has never smoked."


ValueSet : AliasTypeSmokingStatus
Id: smoking-status
Title: "Smoking Status"

* ^url = $ss-vs
* codes from system $ss-cs