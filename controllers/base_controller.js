var cls = require("./../lib/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function () {
        this.action = 'index';
        this.startedAt = new Date();
    },

    callAction: function (action) {
        this.action =  action || this.action;
        if(typeof this[this.action] !== 'function'){
            this.res.render('index', {error: 'Action not found ('+this.action+').'});
            return;
        }
        return this[this.action](this.req, this.res);
    },

    duration: function () {
        return (new Date()).getTime() - this.startedAt.getTime();
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    },

});