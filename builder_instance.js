var cls = require("./lib/class");
var _ = require("underscore");

module.exports = cls.Class.extend({
    init: function(db, squel, builder){
        this.db = db;
        this.squel = squel;
        this.builder = builder;
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
        var self = this;
        var start = new Date();
        this.db.query(query, function(err, results) {
            if(err) {
                console.error('Error running query', err, query);
            }else{
                var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                var tables = self.squel.blocks[3].tables ? self.squel.blocks[3].tables : self.squel.blocks[1].tables;
                if(!tables){
                    var tableName = self.squel.blocks[1].table;
                }else{
                    var tableName = tables[0].table;
                }
                var method = self.squel.blocks[0].str;
                if(method != 'SELECT')console.log(method, results.rowCount, tableName, duration);
            }
            callback(err, results);
        });
    },

    execBatch: function(tableName) {
        var sql = this.squel.toString();
        var method = sql.split(' ')[0];
        this.builder.addQueryToBatch(sql, method, tableName);
    }
});