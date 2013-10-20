var cls = require("./lib/class");
var _ = require("underscore");
var pg = require('pg');
var Builder = require('./builder');

module.exports = cls.Class.extend({
    init: function(){
        this.ready = false;
        this.builder = new Builder(this);
        this.connect();
    },

    connect: function() {
        var conString = process.env.API_POSTGRE || process.env.HEROKU_POSTGRESQL_MAROON_URL;
        var self = this;

        pg.connect(conString, function(err, client, done) {
            if(err) {
                return console.error('Error fetching client from pool', err);
            }
            self.client = client;
            if(self.ready_callback){
                self.ready_callback();
            }
            self.ready = true;
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