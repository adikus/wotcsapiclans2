var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function (req, res) {
        var ret = {
            title: 'Clan loader',
            workers: this.workerManager.getWorkersByType(),
            queue: this.workerManager.queue.getCurrentStatus()
        };

        this.render('index', ret);
    },

    login: function (req, res){
        this.render('login',{title: 'Login into admin interface'});
    },

    auth: function (req, res) {
        if(req.body.admin_password == process.env.WOTCS_ADMIN_PASSWORD){
            this.cookie('role','admin',{signed: true}).redirect('/admin');
        }else{
            this.render('login',{error: 'Wrong password', title: 'Login into admin interface'});
        }
    },

    admin: function(req, res) {
        if(req.signedCookies.role == 'admin'){
            var ret = {
                title: 'WoTcsClans API Admin interface',
                workers: this.workerManager.getWorkersByType(),
                queue: this.workerManager.queue.getCurrentStatus()
            };

            this.render('admin', ret);
        }else{
            this.render('login',{error: 'Please login'});
        }

    },

    worker: function (req, res){
        this.render('worker',{title: 'Clan worker'});
    }

});