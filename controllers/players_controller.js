var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');
var fs = require('fs');

module.exports = BaseController.extend({

    changes: function (req, res) {
        var self = this;
        var id = parseInt(req.params.id);
        fs.readFile('queries/select_player_changes.sql', function(err, template) {
            var sql = _(template.toString()).template()({player_id: id});
            self.MemberChanges.query(sql, function(err, changes) {
                res.json({changes: _(changes).invoke('getDataWRTPlayer')});
            });
        });
    }

});