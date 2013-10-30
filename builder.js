var cls = require("./lib/class");
var _ = require("underscore");
var squel = require("squel");
var BuilderInstance = require("./builder_instance");

module.exports = cls.Class.extend({
    init: function(db){
        this.db = db;
        var self = this;
        this.queues = {};
        squel.useFlavour('postgres');
        _.each(squel, function(func, name){
            if(_.isFunction(func) ){
                self.addFunction(name, func);
            }
        });
        setInterval(function() {
            self.step();
        },5000);
    },

    addFunction: function(name, func){
        this[name] = function(){
            return new BuilderInstance(this.db, func.apply(this, arguments), this);
        };
    },

    addQueryToBatch: function(query, method, tableName) {
        if(!this.queues[tableName]){
            this.queues[tableName] = {};
        }
        if(!this.queues[tableName][method]){
            this.queues[tableName][method] = [];
        }
        this.queues[tableName][method].push(query);
    },

    step: function() {
        var self = this;
        _.each(this.queues, function(table, tableName) {
            _.each(table, function(methodQueue, method){
                if(methodQueue.length > 0){
                    var start = new Date();
                    var queue = _.clone(methodQueue);
                    self.queues[tableName][method] = [];
                    var query = queue.join(';');
                    self.db.query(query, function(err) {
                        var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                        console.log('Batch', method, queue.length, tableName, duration);
                        if(err) {
                            console.error('Error running query', err, query);
                        }
                    });
                }
            });
        });
    }
});