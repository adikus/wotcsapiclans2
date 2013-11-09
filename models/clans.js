var BaseCollection = require('wotcs-api-system').BaseCollection('PG');
var _ = require('underscore');
var Regions = require('../shared/regions');

module.exports = BaseCollection.extend({

    dbName: 'MainDB',

    inRegion: function() {
        var args = _.toArray(arguments);
        var callback = args.pop();
        var region = args.shift();
        var options = args.pop();
        var bounds = Regions.bounds[region];
        var where = ["id > ? AND id < ?",bounds.min, bounds.max];
        this.where(where, options, callback);
    },

    countInRegion: function( region, callback ) {
        var bounds = Regions.bounds[region];
        var where = ["id > ? AND id < ?",bounds.min, bounds.max];
        this.count(where, callback);
    }

});