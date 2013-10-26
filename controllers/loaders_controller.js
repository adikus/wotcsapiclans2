var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function (req, res) {
        var key = req.query.key || 'all';
        if(key == 'all'){
            this.app.getAllWorkersData(function(data) {
                data.key = key;
                data.title = 'Clan loader';
                res.render('all', data);
            });
        }else{
            this.app.getWorkerData(key, function(data) {
                data.key = key;
                data.title = 'Clan loader';
                res.render('index', data);
            });
        }
    }

});