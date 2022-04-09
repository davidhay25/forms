angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('exportSvc', function($q,$http,$filter,moment) {

            return {
                createDownloadCSV(Qsource) {
                    let Q = angular.copy(Qsource)
                    let rows = []
                    Q.item.forEach(function (section) {
                        rows.push(addLine(section))
                        section.item.forEach(function (child) {
                            rows.push(addLine(child))
                            if (child.item) {
                                child.item.forEach(function (grandChild) {
                                    rows.push(addLine(grandChild))
                                })
                            }
                        })
                    })
                    return rows.join("\r\n")


                    function addLine(item) {
                        let ar = []
                        ar.push(makeSafe(item.text))
                        return ar.join(',')
                    }

                    function makeSafe(str) {
                        if (str) {
                            //convert commas to spaces
                            str = str.replace(/,/g, " ")

                            //convert double to single quote
                            str = str.replace(/"/g, "' '")
                        }
                        return str

                    }
                }
            }
        }


    )