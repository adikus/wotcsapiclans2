var cls = require("./../lib/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function (db, constructors) {
        this.db = db;
        this.constructor = constructors[this.name];
    },

    where: function(where, callback) {
        var self = this;

        this.db.databases.PG.builder.select().from(this.tableName).where.apply(this, where).order('id').exec(function(err, result){
            callback(err, _.map(result.rows, function(row) {
                return self.new(row);
            }));
        });
    },

    find: function(id, callback){
        var self = this;

        this.db.databases.PG.builder.select().from(this.tableName).where("id = ?",id).limit(1).exec(function(err, result){
            var clan = self.new(result.rows[0]);
            callback(err, clan);
        });
    },

    new: function (params) {
        return new this.constructor(this.db, params);
    }

});