var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function (req, res) {
        var self = this;
        var worker = parseInt(req.query.w) || 'all';
        if(worker != 'all'){
            worker--;
        }
        var ret = {
            title: 'Clan loader',
            workers: {}, worker: worker, queue: this.workerManager.queue.getCurrentStatus()
        };
        var count = worker == 'all' ? _.size(self.workerManager.workers) : 1;
        var func = _.after(count, function(){

            ret.workers['all'] = self.sumAllWorkers(ret.workers);
            res.render('index', ret);
        });
        _.each(this.workerManager.workers, function(w, index) {
            if(worker != index && worker != 'all'){
                ret.workers[index] = {
                    stats:{
                        finishedRequests: 0,
                        errorRequests: 0,
                        finishedClans: 0
                }};
            }else{
                w.execute('getCurrentState', function(data) {
                    ret.workers[index] = data;
                    _.defer(func);
                });
            }
        });
    },

    sumAllWorkers: function(workers){
        var all = {stats: {
            finishedRequests: 0,
            errorRequests: 0,
            finishedClans: 0
        }};
        _.each(workers, function(worker) {
            if(worker.stats){
                all.stats.finishedRequests += worker.stats.finishedRequests;
                all.stats.finishedClans += worker.stats.finishedClans;
                all.stats.errorRequests += worker.stats.errorRequests;
            }
        });
        return all;
    },

    login: function (req, res){
        res.render('login',{title: 'Login into admin interface'});
    },

    auth: function (req, res) {
        if(req.body.admin_password == process.env.WOTCS_ADMIN_PASSWORD){
            res.cookie('role','admin',{signed: true}).redirect('/admin');
        }else{
            res.render('login',{error: 'Wrong password', title: 'Login into admin interface'});
        }
    },

    admin: function(req, res) {
        var self = this;
        if(req.signedCookies.role == 'admin'){
            var ret = {title: 'WoTcsClans API Admin interface', workers: {}, worker: 'all', queue: this.workerManager.queue.getCurrentStatus()};
            var done = _.after(_.size(self.workerManager.workers), function(){
                ret.workers.all = self.sumAllWorkers(ret.workers);
                res.render('admin', ret);
            });
            _.each(this.workerManager.workers, function(worker, index) {
                worker.execute('getCurrentState', {config: true}, function(data) {
                    ret.workers[index] = data;
                    done();
                });
            });
        }else{
            res.render('login',{error: 'Please login'});
        }

    },

    worker: function (req, res){
        res.render('worker',{title: 'Clan worker'});
    }

});