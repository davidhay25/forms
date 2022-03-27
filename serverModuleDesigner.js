// support the designer. Accesses the mongodb
//https://mongodb.github.io/node-mongodb-native/3.0/quick-start/quick-start/
function setup(app,db) {


    app.post('/designer/ddItem', function(req,res){
        let ddItem = req.body
        console.log(ddItem)
        delete ddItem._id

        db.collection("library").replaceOne({ id : ddItem.id }, ddItem, {upsert:true},
            function(err, result) {
                if (err) {
                    console.log(err)
                    res.status(400).json(err)
                } else {
                    res.json()
                }
            })
        })

    app.get('/designer/library', function(req,res){
        db.collection("library").find({}).toArray(
            function(err, docs) {

            res.json(docs)
        })
    })

    //get all collections
    app.get('/designer/collections', function(req,res){
        db.collection("collection").find({}).toArray(
            function(err, docs) {

                res.json(docs)
            })
    })

    //update a collection
    app.post('/designer/collection', function(req,res){
        let ddItem = req.body
        console.log(ddItem)
        delete ddItem._id

        db.collection("collection").replaceOne({ id : ddItem.id }, ddItem, {upsert:true},
            function(err, result) {
                if (err) {
                    console.log(err)
                    res.status(400).json(err)
                } else {
                    res.json()
                }
            })
    })


}

module.exports = {
    setup : setup
};