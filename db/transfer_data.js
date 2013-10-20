var MongoClient = require('mongodb').MongoClient;
var pg = require('pg');
var squel = require("squel");

copyClansToPG();

function copyClansToPG(){
    squel.useFlavour('postgres');

    var PGclient = new pg.Client(process.env.API_POSTGRE || process.env.HEROKU_POSTGRESQL_MAROON_URL);
    PGclient.connect(function(err) {
        if(err) {
            return console.error('Could not connect to postgres', err);
        }
        MongoClient.connect(process.env.WOTCS_CLANDB, function(err, db) {
            if (err){
                console.log("DB Error");
                throw err;
            }else{
                db.collection('clans', function(err, collection) {
                    var stream = collection.find().stream();
                    stream.on("data", function(item) {
                        var query = squel.insert({replaceSingleQuotes: true})
                            .into("clans")
                            .set("id", parseInt(item._id,10))
                            .set("description", item.d || '')
                            .set("motto", item.m || '')
                            .set("name", item.n || '')
                            .set("status", 0)
                            .set("tag", item.t || '')
                            .set("updated_at", "NOW()").toString();
                        PGclient.query(query, function(err) {
                            if(err) {
                                console.error('Error running query', err);
                            }
                        });
                    });
                    stream.on("end", function() {
                        console.log('Data copied');
                    });
                });
            }
        });
    });
}