var cls = require("./../lib/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function (db, constructors) {
        this.db = db;
        var self = this;
        this.db.databases.Mongo[this.dbName].client.collection(this.collectionName, function(err, collection) {
            if(err){
                console.log('Error retrieving collection',err);
            }else{
                self.collection = collection;
            }
        });
        this.constructor = constructors[this.name];
    },

    where: function(where, callback) {
        var self = this;
        var ret = [];

        var stream = this.collection.find(where).stream();
        stream.on("data", function(item) {
            ret.push(self.new(item));
        });
        stream.on("end", function(err) {
            callback(err, ret);
        });
    },

    new: function (params) {
        return new this.constructor(this.db, params);
    }

});