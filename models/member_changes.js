var BaseCollection = require('wotcs-api-system').BaseCollection('Mongo');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    dbName: 'ChangeDB',

    getPrevious: function(changes, callback) {
        var where = {$or: []};
        var self = this;
        _(changes).each(function(change){
            if(change.ch == 1){
                where.$or.push({
                    p: change.p,
                    u: {$lt: change.u}
                });
            }
        });
        this.collection.aggregate([
            { $match: where },
            { $sort: { u: -1 } },
            { $group: { _id: "$p", c: { $first: "$c" }, u: { $first: "$u" } } },
            { $project : { p:"$_id", c: "$c", u: "$u", _id:0}}
        ], function(err, changes){
            callback(_(changes).map(function(change){
                return self.new(change, true);
            }));
        });
    },

    getNext: function(changes, callback) {
        var where = {$or: []};
        var self = this;
        _(changes).each(function(change){
            if(change.ch == -1){
                where.$or.push({
                    p: change.p,
                    u: {$gt: change.u}
                });
            }
        });
        this.collection.aggregate([
            { $match: where },
            { $sort: { u: 1 } },
            { $group: { _id: "$p", c: { $first: "$c" }, u: { $first: "$u" } } },
            { $project : { p:"$_id", c: "$c", u: "$u", _id:0}}
        ], function(err, changes){
            callback(_(changes).map(function(change){
                return self.new(change, true);
            }));
        });
    }

});