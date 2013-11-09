var Eventer = require('wotcs-api-system').Eventer;
var Regions = require('./shared/regions');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(app) {
        this.app = app;

        this.toDoQueue = [];
        this.pendingQueue = {};
        this.pendingID = 0;
        this.clansPerItem = 30;

        this.totalCount = 0;
        this.doneCount = 0;

        this.fillingQueue = false;
        this.start = null;
    },

    setModels: function(models){
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    fillQueue: function() {
        if(!this.models){
            return false;
        }
        var self = this;
        this.fillingQueue = true;
        var tempQueues = [];

        var buildQueue = _.after(Regions.supportedRegions.length, function(){

            var queue = [];
            tempQueues.sort(function(a, b) {
                return a.length - b.length;
            });
            _.each(tempQueues, function(q) {
                queue = queue.length > 0 ? self.mixArrays(q, queue) : q;
            });

            self.toDoQueue.push.apply(self.toDoQueue, queue);
            self.fillingQueue = false;
            self.totalCount = self.toDoQueue.length;
            self.doneCount = 0;
            self.start = new Date();
            self.emit('filled');
            self.emit('update', self.getCurrentStatus(), true);
        });

        _.each(Regions.supportedRegions, function(region) {
            this.Clans.countInRegion(region, function(err, count) {
                tempQueues[region] = [];
                for(var i = 0; i < count/self.clansPerItem; i++){
                    tempQueues[region].push({
                        skip: i*self.clansPerItem,
                        limit: self.clansPerItem,
                        region: region
                    });
                }
                buildQueue();
            });
        }, this);
    },

    mixArrays: function (a1, a2){
        var result = [];
        var length = a2.length;
        for(var i = 0; i < length; i++){
            var ratio = a1.length/a2.length;
            result.push(a2.shift());
            for(var j = 0; j < Math.round(ratio); j++){
                result.push(a1.shift());
            }
        }
        return result;
    },

    getCurrentStatus: function() {
        return {
            totalCount: this.totalCount,
            doneCount: this.doneCount,
            pending: _.size(this.pendingQueue),
            start: this.start
        }
    },

    getFromQueue: function(callback) {
        var self = this;

        if(this.toDoQueue.length == 0){
            this.once('filled', function() {
                self.getFromQueue(callback);
            });
        }else{
            var elem = this.toDoQueue.shift();
            var ret = {};
            this.pendingQueue[this.pendingID] = elem;
            ret[this.pendingID++] = elem;

            this.emit('update', this.getCurrentStatus(), true);

            callback(ret);
        }

        if(this.toDoQueue.length < _.size(this.pendingQueue)*2 && !this.fillingQueue){
            this.fillQueue();
        }
    },

    confirmSuccess: function(ID) {
        delete this.pendingQueue[ID];
        this.doneCount++;
        this.emit('update', this.getCurrentStatus(), true);
    },

    reportFail: function(id) {
        this.toDoQueue.unshift(this.pendingQueue[id]);
        this.emit('update', this.getCurrentStatus(), true);
    }

});