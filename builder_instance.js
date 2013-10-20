var cls = require("./lib/class");
var _ = require("underscore");

module.exports = cls.Class.extend({
    init: function(db, squel){
        this.db = db;
        this.squel = squel;
        var self = this;
        _.each(squel, function(func, name){
            if(_.isFunction(func) ){
                self.addFunction(name, func);
            }
        });
    },

    addFunction: function(name, func){
        var self = this;
        this[name] = function(){
            self.squel = func.apply(this, arguments);
            return self;
        };
    },

    exec: function(callback){
        var query = this.squel.toString();
        this.db.client.query(query, function(err, results) {
            if(err) {
                console.error('Error running query', err, query);
            }
            callback(err, results);
        })
    }
});