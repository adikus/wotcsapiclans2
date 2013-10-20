var cls = require("./lib/class");
var _ = require("underscore");
var squel = require("squel");
var BuilderInstance = require("./builder_instance");

module.exports = cls.Class.extend({
    init: function(db){
        this.db = db;
        var self = this;
        _.each(squel, function(func, name){
            if(_.isFunction(func) ){
                self.addFunction(name, func);
            }
        });
    },

    addFunction: function(name, func){
        this[name] = function(){
            return new BuilderInstance(this.db, func.apply(this, arguments));
        };
    }
});