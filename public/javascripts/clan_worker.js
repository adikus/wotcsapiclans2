ClanWorker = Class.extend({

    init: function() {
        if (!window.location.origin) {
            this.url = "ws://" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
        }else{
            this.url = location.origin.replace(/^http/, 'ws');
        }
        this.connect();

        this.config = {
            maxActiveRequests: 2,
            waitMultiplier: 1.25,
            minWaitTime: 1500
        };

        this.options = {
            version: 1,
            type: 'clans',
            region: 1
        };

        this.stats = {
            finishedRequests: 0,
            errorRequests: 0,
            finishedClans: 0,
            start: new Date()
        };

        this.newTasks = [];
        this.currentRequests = {};
        this.interval = null;
        this.paused = false;

        this.lastRequestAt = new Date();

        this.waitTime = 2000;
    },

    connect: function() {
        console.log('Connecting');
        var self = this;
        var ws = new WebSocket(this.url);
        ws.onopen = function(){
            console.log('Connected');
            self.ws = ws;

            self.send(['client-worker', self.getQueueOptions()]);
        };
        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            self.handleMessage(msg);
        };
        ws.onclose = function(data) {
            if(data.reason == 'version'){
                console.log('Disconnected - incompatible server version');
                return;
            }else if(data.reason == 'client-limit'){
                console.log('Disconnected - too many clients connected to server');
                return;
            }
            console.log('Reconnect in 1s');
            setTimeout(function(){
                self.connect();
            },1000);
        };
    },

    handleMessage: function(msg) {
        var self = this;
        var action = msg.shift();
        if(action == 'set-task'){
            var task = msg.shift();
            console.log('Task received:', task.ID);
            this.newTasks.push(task);
            if(this.interval === null){
                this.start();
            }
            if(this.paused){
                this.pause(false, true);
            }
        }else if(action == 'execute'){
            var ID = msg.shift();
            var method = msg.shift();
            var data = this[method] ? this[method].apply(this, msg): {error: 'No such method'};
            this.send(['emit', 'executed.'+ID, data]);
        }else if(action == 'executeAsync'){
            var ID = msg.shift();
            var method = msg.shift();

            msg.push(function() {
                var args = [];
                for(var i in arguments){
                    args.push(arguments[i]);
                }
                args.unshift('emit', 'executed.'+ID);
                self.send(args);
            });
            if(this[method]){
                this[method].apply(this, msg);
            }else{
                this.send(['emit', 'executed.'+ID, {error: 'No such method'}]);
            }
        }else{
            console.log(action, msg);
        }
    },

    send: function(msg){
        if(!this.ws){
            console.log('Not connected');
        }else{
            this.ws.send(JSON.stringify(msg));
        }
    },

    start: function(silent) {
        var self = this;
        this.paused = false;
        if(!silent){
            console.log('Worker started.');
            this.send(['emit', 'start', true]);
        }
        this.interval = setInterval(function() {self.step(); }, 10);
    },

    pause: function(pause, silent){
        if(pause && !this.paused){
            clearInterval(this.interval);
            this.paused = true;
            this.silentPause = silent;
            if(!silent){
                console.log('Worker paused.');
                this.send(['emit', 'pause', true]);
            }
        }else if(!pause && this.paused){
            this.start(silent);
        }
    },

    getQueueOptions: function() {
        return this.options;
    },

    getCurrentState: function(options){
        var ret = {paused: this.paused && !this.silentPause, stats: this.stats};
        if(options && options.config){
            ret.config = this.getConfig();
        }
        return ret;
    },

    getConfig: function() {
        var ret = this.config;
        ret.paused = this.paused && !this.silentPause;
        return ret;
    },

    setConfig: function(config){
        _.each(config, function(value, name){
            if(name != 'paused'){
                this.config[name] = value;
            }else{
                this.pause(value)
            }
        },this);
        return this.getConfig();
    },

    getNumberOfCurrentRequests: function() {
        var count = 0;
        for(var i in this.currentRequests){
            count++;
        }
        return count;
    },

    step: function() {
        var sinceLastRequest = (new Date()).getTime() - this.lastRequestAt.getTime();

        if(this.getNumberOfCurrentRequests() < this.config.maxActiveRequests
            && sinceLastRequest > Math.max(this.waitTime,this.config.minWaitTime)){
            if(this.newTasks.length > 0){
                this.loadClans(this.newTasks.shift());
            }else{
                this.pause(true, true);
                console.log('Worker ready');
                this.send(['emit','ready', false]);
            }
        }
    },

    loadClans: function(task) {
        var ID = task.ID;
        var self = this;
        var IDs = task.clans;

        this.addRequest(task);
        var req = new Request('clan',IDs,'description_html,abbreviation,motto,name,members.account_name');

        req.onSuccess(function(data) {
            if(self.checkData(data, IDs)){
                self.finishRequest(task, false);
                self.send(['process-task', ID, data.data]);
            }else{
                self.finishRequest(task, data.status + ' ' + JSON.stringify(data.error));
                console.log('Report fail', ID);
                self.send(['emit', 'fail-task', ID]);
            }
        });

        req.onError(function(error){
            self.finishRequest(task, error);
            self.newTasks.unshift(task);
        });
    },

    addRequest: function(task){
        var ID = task.ID;
        this.lastRequestAt = new Date();
        this.currentRequests[ID] = {
            start: new Date(),
            count: task.clans.length,
            task: {ID: ID, region: task.region, skip: task.skip}
        };
        this.send(['emit', 'start-request', this.currentRequests[task.ID], true]);
    },

    finishRequest: function(task, error){
        var ID = task.ID;
        this.currentRequests[ID].end = new Date();
        this.currentRequests[ID].duration = this.currentRequests[ID].end.getTime() - this.currentRequests[ID].start.getTime();
        this.currentRequests[ID].error = error;

        this.stats.finishedClans += error ? 0 : this.currentRequests[ID].count;
        this.stats.finishedRequests += 1;
        if(error){
            this.stats.errorRequests += 1;
        }
        this.send(['emit', 'update', this.getCurrentState(), true]);

        this.waitTime = this.currentRequests[ID].duration*this.config.waitMultiplier/this.config.maxActiveRequests;

        this.send(['emit', 'finish-request', this.currentRequests[ID], true]);

        delete this.currentRequests[ID];
    },

    checkData: function(parsed, IDs){
        if(parsed.status == 'ok'){
            for(var i in IDs){
                var ID = IDs[i];
                if(parsed.data[ID] === undefined){
                    return false;
                }
            }
            return true;
        }else{
            return false;
        }
    }

});