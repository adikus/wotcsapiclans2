var cls = require("./../lib/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function (db, app, constructors) {
        this.db = db;
        this.app = app;
        this.constructor = constructors[this.name];
    },

    where: function(where, options, callback) {
        var self = this;

        var q = this.db.databases.PG.builder.select().from(this.tableName).where.apply(this, where);
        if(_.isFunction(options) && !callback){
            callback = options;
        }else if(options.order){
            q.order(options.order);
        }
        q.exec(function(err, result){
            callback(err, _.map(result.rows, function(row) {
                return self.new(row, true);
            }));
        });
    },

    find: function(id, callback){
        var self = this;

        this.db.databases.PG.builder.select().from(this.tableName).where("id = ?",id).limit(1).exec(function(err, result){
            var clan = result.rows.length > 0 ? self.new(result.rows[0], true) : null;
            callback(err, clan);
        });
    },

    new: function (params, notNew) {
        var record = new this.constructor(this.db, this.app, params);
        record.tableName = this.tableName;
        record.newRecord = !notNew;
        record.oldParams = notNew ? params : null;
        return record;
    }

});