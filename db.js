var cls = require("./lib/class");
var _ = require("underscore");
var pg = require('pg');
var MongoClient = require('mongodb').MongoClient;
var SQLBuilder = require('./builder');

module.exports = cls.Class.extend({
    init: function(){
        this.ready = false;
        this.databases = {};
        this.connectToPG();
        this.connectToMongo();
        this.toBeConnected = 2;
    },

    connectToPG: function() {
        var conString = process.env.API_POSTGRE || process.env.DATABASE_URL;
        var self = this;

        pg.connect(conString, function(err, client, done) {
            if(err) {
                return console.error('Error fetching client from pool', err);
            }
            self.databases.PG = {
                client: client,
                builder: new SQLBuilder(client)
            };
            self.toBeConnected--;
            if(self.toBeConnected == 0){
                if(self.ready_callback){
                    self.ready_callback();
                }
                self.ready = true;
            }
        });
    },

    connectToMongo: function() {
        var self = this;

        MongoClient.connect(process.env.WOTCS_CLANDB, function(err, db) {
            if(err) {
                return console.error('Error connecting to Mongo', err);
            }
            self.databases.Mongo = { clan: {
                client: db
            }};
            self.toBeConnected--;
            if(self.toBeConnected == 0){
                if(self.ready_callback){
                    self.ready_callback();
                }
                self.ready = true;
            }
        });
    },

    onReady: function(callback){
        if(this.ready){
            callback();
        }else{
            this.ready_callback = callback;
        }
    }
});