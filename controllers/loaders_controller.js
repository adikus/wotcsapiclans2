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
    },

    login: function (req, res){
        res.render('login',{title: 'Login into admin interface'});
    },

    admin: function (req, res) {
        if(req.body.admin_password == process.env.WOTCS_ADMIN_PASSWORD){
            this.app.getAllWorkersData(function(data) {
                data.key = 'admin'
                data.title = 'WoTcsClans API Admin interface';
                data.secret = process.env.WOTCS_ADMIN_SECRET;
                res.render('admin', data);
            }, true);
        }else{
            res.render('index',{error: 'Wrong password'});
        }
    }

});