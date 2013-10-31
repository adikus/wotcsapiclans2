var Worker = require("./worker_base");
var _ = require("underscore");
var Request = require("./request");
var MC = require("./message_codes");
var squel = require("squel");
var shared = require("./shared");

module.exports = Worker.extend({
    init: function(key){
        this.config = {
            maxActiveRequests: 2,
            clansInRequest: 50,
            waitMultiplier: 1.2,
            key: key
        };

        this.cycleData = {
            activeRequests: 0,
            finishedRequests: 0,
            errorRequests: 0,
            finishedClans: 0,
            totalClans: 0,
            start: null
        };

        this.callbacks = {};

        this.lastRequests = [];
        this.clansBeingLoaded = {};

        this.priorityRequests = [];
        this.interval = null;
        this.paused = false;
        this.stopping = false;
        this.waitTime = 2000;
        this.requestID = 0;

        if(this.config.key == 'EU1'){
            this.clanIDRange = [500000000,500016375];
        }
        if(this.config.key == 'EU2'){
            this.clanIDRange = [500016375,1000000000];
        }
        if(this.config.key == 'NA'){
            this.config.maxActiveRequests = 4;
            this.config.clansInRequest = 25;
            this.clanIDRange = [1000000000,2000000000];
        }
        if(this.config.key == 'RU-SEA-KR'){
            this.config.maxActiveRequests = 4;
            this.config.clansInRequest = 25;
            this.clanIDRange = [[0,500000000],[2000000000,2500000000],[3000000000,4000000000]];
        }
    },

    loadData: function() {
        var self = this;

        this.app.Clans.whereIDsBetween(this.clanIDRange, function(err, clans) {
            self.clans = clans;
            self.cycleData.totalClans = clans.length;
            self.ready = true;
            if(self.ready_callback){
                self.ready_callback();
            }
            if(self.update_callback){
                var ret = self.getCurrentState();
                ret.actionData = {code: MC.ws.server.CYCLE_START};
                self.update_callback(ret);
            }
        });
    },

    getCurrentState: function(){
        var ret = {key: this.config.key, cycleData: this.cycleData};
        ret.paused = this.paused;
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

    setConfig: function(config){
        var self = this;
        _.each(config, function(value, name){
            self.config[name] = value;
        });
    },

    addClan: function(id, callback){
        if(!this.registeredCallback(id)){
            if(this.clans){
                var clan = this.app.Clans.new({id: id, status: 0});
                this.clans.push(clan);
            }else{
                callback({error: 'Loader not initialized'});
                return;
            }
        }
        this.registerCallback(id, callback);
    },

    registeredCallback: function(id){
        return !!this.callbacks[id];
    },

    registerCallback: function(id, callback){
        if(!this.callbacks[id]){
            this.callbacks[id] = [];
        }
        this.callbacks[id].push(callback);
    },

    executeCallbacks: function(id, data){
        _.each(this.callbacks[id], function(callback){
            callback(data);
        });
        delete this.callbacks[id];
    },

    stop: function(force){
        if(force || this.cycleData.activeRequests == 0){
            clearInterval(this.interval);
        }else{
            this.stopping = true;
        }
        this.ready = false;
    },

    pause: function(pause){
        if(pause && !this.paused){
            clearInterval(this.interval);
            this.interval = null;
            this.paused = true;
            console.log('Worker stopped.',this.key || this.config.key);
            if(this.update_callback){
                var ret = this.getCurrentState();
                ret.actionData = {code: MC.ws.server.WORKER_STOPPED};
                this.update_callback(ret);
            }
        }else if(!pause && this.paused){
            this.start();
            this.paused = false;
            if(this.update_callback){
                var ret = this.getCurrentState();
                ret.actionData = {code: MC.ws.server.WORKER_STARTED};
                this.update_callback(ret);
            }
        }
    },

    get10LastRequests: function() {
        var i = this.requestID-1;
        while( i > 0 && !this.lastRequests[i].end){
            i--;
        }
        var ret = [];
        while( i > 0 && this.lastRequests[i] && ret.length < 10){
            if(this.lastRequests[i].duration){
                ret.unshift(this.lastRequests[i]);
            }
            i--;
        }
        return ret;
    },

    getCurrentSpeed: function() {
        var last10 = this.get10LastRequests();
        if(last10.length == 0 || this.paused){
            return 0;
        }
        var totalCount = _.reduce(last10, function(memo, req){ return memo + req.count; }, 0);
        var duration = _.last(last10).end.getTime() - _.first(last10).start.getTime();
        return Math.round(totalCount / duration * 1000 * 100) / 100;
    },

    getAverageSpeed: function() {
        if(this.paused){
            return 0;
        }
        if(this.cycleData.finishedRequests == 0)return 0;
        var duration = (new Date()).getTime() - this.cycleData.start.getTime();
        return Math.round(this.cycleData.finishedClans / duration * 1000 * 100) / 100;
    },

    getCurrentDuration: function() {
        var last10 = this.get10LastRequests();
        if(last10.length == 0){
            return 0;
        }
        var totalDuration = _.reduce(last10, function(memo, req){ return memo + req.duration; }, 0);
        return Math.round(totalDuration / last10.length * 100) / 100;
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

        if(this.cycleData.activeRequests < this.config.maxActiveRequests && sinceLastRequest > Math.max(this.waitTime,1000)){
            if(this.priorityRequests.length > 0){
                this.priorityRequests.pop()();
                return;
            }
            var clanList = [];
            var regionChain = true;
            while(clanList.length < this.config.clansInRequest && regionChain && this.clans.length > 0){
                var tempClan = this.clans.pop();
                if(clanList.length == 0 || shared.getRegion(tempClan.id) == shared.getRegion(clanList[0].id)){
                    if(tempClan.status > -1){
                        clanList.push(tempClan);
                    }
                }else{
                    regionChain = false;
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
        if(this.config.key == 'RU-SEA-KR'){
            this.lastRequests[ID].region = shared.TranslatedRegion[shared.getRegion(clans[0].id)];
        }

        if(this.update_callback){
            var ret = this.getCurrentState();
            ret.actionData = {code: MC.ws.server.ADD_REQ, id: ID, req: this.lastRequests[ID]};
            this.update_callback(ret);
        }
    },

    finishRequest: function(ID, count, error, clans){
        this.lastRequests[ID].end = new Date();
        this.lastRequests[ID].duration = this.lastRequests[ID].end.getTime() - this.lastRequests[ID].start.getTime();
        this.cycleData.finishedClans += count;
        this.lastRequests[ID].count = count;
        this.lastRequests[ID].error = error;
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
            ret.actionData = {code: MC.ws.server.FINISH_REQ, id: ID, error: error, req: this.lastRequests[ID]};
            this.update_callback(ret);
        }
    },

    parseAndCheckData: function(data, IDs){
        var parsed = JSON.parse(data);
        if(parsed.status == 'ok'){
            var allOK = true;
            _.each(IDs, function(ID){
                if(parsed.data[ID] === undefined){
                    allOK = false;
                }
            });
            if(!allOK){
                console.log(IDs);
            }
            return allOK ? parsed : false;
        }else{
            return false;
        }
    },

    splitRequestToFindBadID: function(clans){
        var self = this;

        if(clans.length > 1){
            var breakpoint = Math.floor(clans.length/2);
            this.priorityRequests.unshift(function(){
                self.loadClans(clans.slice(0, breakpoint), self.requestID++);
            });
            this.priorityRequests.unshift(function(){
                self.loadClans(clans.slice(breakpoint), self.requestID++);
            });
        }else{
            console.log('Bad ID', clans[0].id);
            var data = {};
            data[clans[0].id] = null;
            self.app.processClans([clans[0]], data);
        }
    },

    loadClans: function(clans, ID) {
        var self = this;
        var IDs = _.map(clans, function(clan){return clan.id});

        this.addRequest(ID, clans);
        var req = new Request('clan',IDs,'description_html,abbreviation,motto,name,members.account_name');

        req.onSuccess(function(data) {
            var parsedData = self.parseAndCheckData(data, IDs);
            if(parsedData){
                self.finishRequest(ID, clans.length, false, clans);
                self.app.processClans(clans, parsedData.data);
            }else{
                self.finishRequest(ID, 0, 'API Error', clans);
                //console.log('API Error.'/*, parsed.status, IDs*/);
                self.splitRequestToFindBadID(clans);
            }
        });

        req.onError(function(error){
            self.finishRequest(ID, 0, error, clans);
            _.each(clans,function(clan){self.clans.unshift(clan);});
        });
    },

    onUpdate: function(callback){
        this.update_callback = callback;
    }
});