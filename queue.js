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
        this.queueTreshold = 50;

        this.totalCount = 0;
        this.doneCount = 0;
        this.finishedClans = 0;
        this.finishedTasks = 0;
        this.errorTasks = 0;
        this.speed = 0;

        this.fillingQueue = false;
        this.start = new Date();
        this.regionStats = {};
        _.each(Regions.supportedRegions, function(region) {
            this.regionStats[region] = {
                pending: 0,
                errors: []
            };
        }, this);
        this.recentTasks = [];
    },

    setModels: function(models){
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    fillQueue: function() {
        if(!this.models || this.fillingQueue){
            return;
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
                if(q){
                    queue = queue.length > 0 ? self.mixArrays(q, queue) : q;
                }
            });

            self.toDoQueue.push.apply(self.toDoQueue, queue);
            self.fillingQueue = false;
            self.totalCount = self.toDoQueue.length;
            self.doneCount = 0;
            self.cycleStart = new Date();
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
                        region: region,
                        retryCount: 0
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
            finishedClans: this.finishedClans,
            finishedTasks: this.finishedTasks,
            errorTasks: this.errorTasks,
            speed: this.speed,
            start: this.start,
            cycleStart: this.start
        }
    },

    tooManyErrors: function(i) {
        var task = this.toDoQueue[i];
        var errors = this.regionStats[task.region].errors;
        if(errors.length == 0){
            return false;
        }
        var duration = (new Date()).getTime() - _(errors).first().getTime();
        return errors.length/duration*1000 > 0.25;
    },

    notInRegion: function(i, region) {
        if(region === undefined){
            return false;
        }
        var task = this.toDoQueue[i];
        return region != task.region;
    },

    getFromQueue: function(callback, workerID, options) {
        var self = this;

        if(this.toDoQueue.length == 0){
            this.once('filled', function() {
                self.getFromQueue(callback, workerID, options);
            });
        }else{
            var ret = {};
            var ID = this.pendingID++;

            setTimeout(function(){
                if(self.pendingQueue[ID]){
                    console.log('Task timeout:', ID);
                    self.reportFail(ID);
                }
            },60000);

            var i = 0;
            while(i<this.toDoQueue.length-1 && (this.tooManyErrors(i) || this.notInRegion(i, options.region))){i++;}
            var elem = this.toDoQueue.splice(i,1)[0];
            this.pendingQueue[ID] = elem;

            if(i == this.toDoQueue.length-1 && !this.fillingQueue){
                this.fillQueue();
            }

            ret[ID] = elem;

            this.emit('update', this.getCurrentStatus(), true);

            callback(ret);
        }

        if(this.toDoQueue.length < this.queueTreshold && !this.fillingQueue){
            this.fillQueue();
        }

        _.each(Regions.supportedRegions, function(region) {
            while(this.regionStats[region].errors.length > 0 && (new Date()).getTime() - this.regionStats[region].errors[0].getTime() > 20*1000 ){
                this.regionStats[region].errors.shift();
            }
        }, this);
    },

    confirmSuccess: function(ID, data) {
        delete this.pendingQueue[ID];
        this.doneCount++;
        this.finishedTasks++;
        if(data){
            this.finishedClans += data.count;
        }
        this.calcSpeed(data.count);
        this.emit('update', this.getCurrentStatus(), true);
    },

    calcSpeed: function(count) {
        if(count){
            this.recentTasks.push({
                count: count,
                time: new Date()
            });
        }
        while(this.recentTasks.length > 0 && (new Date()).getTime() - this.recentTasks[0].time.getTime() > 5*1000 ){
            this.recentTasks.shift();
        }
        if(this.recentTasks.length > 1){
            var sum = _.chain(this.recentTasks).pluck('count').reduce(function(memo, num){ return memo + num; }, 0).value();
            var duration = _(this.recentTasks).last().time.getTime() - _(this.recentTasks).first().time.getTime();
            this.speed = Math.round(sum/duration*1000*100)/100;
        }
    },

    reportFail: function(ID) {
        if(!this.pendingQueue[ID]){
            return;
        }
        this.errorTasks++;
        if(this.pendingQueue[ID].limit == 1){
            this.pendingQueue[ID].retryCount++;
            if(this.pendingQueue[ID].retryCount < 3){
                this.toDoQueue.unshift(this.pendingQueue[ID]);
            }else{
                console.log('Too many retries:',this.pendingQueue[ID]);
            }
        } else {
            this.splitTask(this.pendingQueue[ID]);
        }
        var region = this.pendingQueue[ID].region;
        delete this.pendingQueue[ID];
        this.regionStats[region].errors.push(new Date());
        this.calcSpeed();
        this.emit('update', this.getCurrentStatus(), true);
    },

    splitTask: function(task) {
        var task1 = {skip: task.skip, limit: Math.round(task.limit/2), region: task.region, retryCount: 0};
        var task2 = {skip: task.skip+task1.limit, limit: task.limit-task1.limit, region: task.region, retryCount: 0};
        //console.log('Split',task,'into',task1,task2);
        this.toDoQueue.unshift(task1);
        this.toDoQueue.unshift(task2);
        this.totalCount++;
    }

});