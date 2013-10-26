var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function () {
        this.res.json({status: 'ok', id: this.req.params.id});
    },

    changes: function () {
        this.res.json({status: 'ok', id: this.req.params.id});
    }

});