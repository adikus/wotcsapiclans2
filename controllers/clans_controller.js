var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function () {
        var id = parseInt(this.req.params.id);
        var self = this;
        this.app.Clans.find(id, function(err, clan){
            self.res.json({status: 'ok', clan_id: id, clan: clan.getData(), members: []});
        });
    },

    changes: function () {
        var id = parseInt(this.req.params.id);
        var self = this;
        this.app.MemberChanges.where({c: id}, function(err, changes) {
            self.res.json({status: 'ok', clan_id: id, changes: _.map(changes, function(change) {
                return change.getData();
            })});
        });
    }

});