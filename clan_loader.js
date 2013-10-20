var Worker = require("./worker_base");
var _ = require("underscore");
var Request = require("./request");

module.exports = Worker.extend({
    init: function(region){
        this.config = {
            maxActiveRequests: 4,
            clansInRequest: 50,
            waitMultiplier: 1.2,
            region: region
        };

        this.cycleData = {
            activeRequests: 0,
            finishedRequests: 0,
            errorRequests: 0,
            finishedClans: 0,
            totalClans: 0,
            start: null
        };

        this.lastRequests = [];
        this.clansBeingLoaded = {};

        this.interval = null;
        this.stopping = false;
        this.waitTime = 2000;
        this.requestID = 0;
        this.badIDs = [];

        if(this.config.region == 'EU')this.clanIDRange = [500000000,1000000000];
    },

    loadData: function() {
        var self = this;
        this.app.db.builder.select().from("clans").where("id > ? AND id < ?",this.clanIDRange[0],this.clanIDRange[1]).exec(function(err, results){
            self.clans = results.rows;
            self.cycleData.totalClans = results.rowCount;
            self.ready = true;
            if(self.ready_callback){
                self.ready_callback();
            }
            if(self.update_callback){
                var ret = self.getCurrentState();
                ret.actionData = {code: self.app.server.ServerMessages.CYCLE_START};
                self.update_callback(ret);
            }
        });
    },

    getCurrentState: function(){
        var ret = {cycleData: this.cycleData};
        ret.speeds = {currentSpeed: this.getCurrentSpeed(), averageSpeed: this.getAverageSpeed(), duration: this.getCurrentDuration()};
        ret.cycleData.errorRate = this.getErrorRate();
        ret.cycleTimes = {completion: this.getCompletion(), duration: this.getCycleDuration(true), remainingTime: this.getCycleRemainingTime(true)};
        return ret;
    },

    getCycleDuration: function(format) {
        if(!this.cycleData.start)return 0;
        var ret = (new Date()).getTime() - this.cycleData.start.getTime();
        if(format){
            var minutes = Math.floor( ret / 1000 / 60 );
            var seconds = Math.floor( ret / 1000 ) % 60;
            return minutes+' m '+seconds+' s';
        }else{
            return ret;
        }
    },

    getCycleRemainingTime: function(format) {
        var remainingClans = this.cycleData.totalClans - this.cycleData.finishedClans;
        if(this.cycleData.finishedRequests == 0)ret = 0;
        else{
            var ret = remainingClans / this.getAverageSpeed();
        }
        if(format){
            var minutes = Math.floor( ret / 60 );
            var seconds = Math.floor( ret ) % 60;
            return minutes+' m '+seconds+' s';
        }else{
            return ret;
        }
    },

    getConfig: function() {
        return this.config;
    },

    setConfig: function(name, value){
        this.config[name] = value;
    },

    loadClan: function(){
        console.log('TODO');
    },

    stop: function(force){
        if(force || this.cycleData.activeRequests == 0){
            clearInterval(this.interval);
        }else{
            this.stopping = true;
        }
        this.ready = false;
    },

    getRangeOfLast: function() {
        if(this.requestID < 2)return [0,0];
        var top = this.requestID-2 >= 0 ? this.requestID-2 : 0;
        var bottom = this.requestID-12 >= 0 ? this.requestID-12 : 0;
        while(!this.lastRequests[top].end && top > 0){
            top--;
        }
        return [bottom, top];
    },

    getCurrentSpeed: function() {
        var range = this.getRangeOfLast();
        if(range[1] == 0)return 0;
        var topReq = this.lastRequests[range[1]];
        var bottomReq = this.lastRequests[range[0]];
        var duration = topReq.end.getTime() - bottomReq.start.getTime();
        var sum = 0;
        for(var i = range[0]; i <= range[1]; i++){
            sum += this.lastRequests[i].count;
        }
        return Math.round(sum / duration * 1000 * 100) / 100;
    },

    getAverageSpeed: function() {
        if(this.cycleData.finishedRequests == 0)return 0;
        var duration = (new Date()).getTime() - this.cycleData.start.getTime();
        return Math.round(this.cycleData.finishedClans / duration * 1000 * 100) / 100;
    },

    getCurrentDuration: function() {
        if(this.cycleData.finishedRequests == 0)return 0;
        var range = this.getRangeOfLast();
        var sum = 0;
        for(var i = range[0]; i <= range[1]; i++){
            sum += this.lastRequests[i].duration;
        }
        return Math.round(sum / (range[1]-range[0]+1) * 100) / 100;
    },

    getCompletion: function() {
        return Math.round(this.cycleData.finishedClans / this.cycleData.totalClans * 100 * 100) / 100
    },

    getErrorRate: function() {
        if(this.cycleData.finishedRequests == 0)return 0;
        return Math.round( this.cycleData.errorRequests / this.cycleData.finishedRequests * 100 * 100) / 100;
    },

    getLastRequestAt: function() {
        return this.requestID > 0 ? this.lastRequests[this.requestID - 1].start : this.workerStart;
    },

    step: function() {
        var sinceLastRequest = (new Date()).getTime() - this.getLastRequestAt().getTime();

        if(this.cycleData.activeRequests < this.config.maxActiveRequests && sinceLastRequest > this.waitTime){
            var clanList = [];
            for(var i = 0;i<this.config.clansInRequest;i++){
                if(this.clans.length > 0){
                    clanList.push(this.clans.pop());
                }
            }
            if(clanList.length > 0){
                if(this.requestID == 0){
                    this.cycleData.start = new Date();
                }
                this.loadClans(clanList, this.requestID++);
            }else{
                if(this.cycleData.activeRequests == 0){
                    clearInterval(this.interval);
                    this.requestID = 0;
                    this.lastRequests = [];
                    this.cycleData = {
                        activeRequests: 0,
                        finishedRequests: 0,
                        errorRequests: 0,
                        finishedClans: 0,
                        totalClans: 0,
                        start: null
                    };
                    this.stop();
                    this.loadData();
                }
            }
        }
    },

    addRequest: function(ID, clans){
        this.lastRequests[ID] = {
            start: new Date(),
            count: clans.length
        };
        this.cycleData.activeRequests++;
        var self = this;
        this.clansBeingLoaded[ID] = {};
        _.each(clans, function(clan) {
            self.clansBeingLoaded[ID][clan.id] = {
                name: clan.name,
                tag: clan.tag
            };
        });

        if(this.update_callback){
            var ret = this.getCurrentState();
            ret.actionData = {code: this.app.server.ServerMessages.ADD_REQ, id: ID, req: this.lastRequests[ID]};
            this.update_callback(ret);
        }
    },

    finishRequest: function(ID, count, error, clans){
        this.lastRequests[ID].end = new Date();
        this.lastRequests[ID].duration = this.lastRequests[ID].end.getTime() - this.lastRequests[ID].start.getTime();
        this.cycleData.finishedClans += count;
        this.lastRequests[ID].count = count;
        this.cycleData.finishedRequests += 1;
        if(error)this.cycleData.errorRequests += 1;
        this.cycleData.activeRequests--;
        this.waitTime = this.lastRequests[ID].duration*this.config.waitMultiplier/this.config.maxActiveRequests;
        if(this.stopping){
            this.stopping = false;
            clearInterval(this.interval);
        }
        delete this.clansBeingLoaded[ID];

        if(this.update_callback){
            var ret = this.getCurrentState();
            ret.actionData = {code: this.app.server.ServerMessages.FINISH_REQ, id: ID, error: error, req: this.lastRequests[ID]};
            this.update_callback(ret);
        }
    },

    parseAndCheckData: function(data, IDs){
        var parsed = JSON.parse(data);
        if(parsed.status == 'ok'){
            return true;
        }else{
            console.log('API Error.', parsed.status, IDs);
            return false;
        }
    },

    splitRequestToFindBadID: function(clans){
        if(clans.length > 1){
            var breakpoint = Math.floor(clans.length/2);
            this.loadClans(clans.slice(0, breakpoint));
            this.loadClans(clans.slice(breakpoint));
        }else{
            this.badIDs.push(clans[0].id);
        }
    },

    loadClans: function(clans, ID) {
        var self = this;
        var IDs = _.map(clans, function(clan){return clan.id});

        this.addRequest(ID, clans);
        var req = new Request('clan',IDs);

        req.onSuccess(function(data) {
            if(self.parseAndCheckData(data, IDs)){
                self.finishRequest(ID, clans.length, false, clans);
            }else{
                self.finishRequest(ID, 0, true, clans);
                self.splitRequestToFindBadID(clans);
            }
        });

        req.onError(function(){
            self.finishRequest(ID, 0, true, clans);
            _.each(clans,function(clan){self.clans.unshift(clan);});
        });
    },

    onUpdate: function(callback){
        this.update_callback = callback;
    }
});