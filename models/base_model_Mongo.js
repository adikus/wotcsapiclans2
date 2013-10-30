var cls = require("./../lib/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function (db, app, params) {
        this.db = db;
        this.app = app;
        var self = this;
        _.each(params, function(value, key) {
            self[key] = value;
        });
    }

});