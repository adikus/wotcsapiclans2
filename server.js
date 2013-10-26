var express = require('express');
var http = require('http');
var path = require('path');
var WebSocketServer = require('ws').Server;
var cls = require("./lib/class");
var _ = require("underscore");
var LZString = require('./lib/lz-string-1.3.3');
var MC = require("./message_codes");

module.exports = cls.Class.extend({
    init: function(){
        this.expressApp = express();
        this.configureExpress(this.expressApp);
        this.configureRoutes(this.expressApp);
        this.configureServer(this.expressApp);
        this.configureWebSocketServer();

        this.ready = false;
        this.clientID = 0;
        this.clients = {};
        this.listeningWorkers = false;
    },

    configureExpress: function(app){
        app.set('port', process.env.PORT || 3000);
        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'jade');

        app.use(express.compress());
        app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
        app.use(express.logger('dev'));
        app.use(express.json());
        app.use(express.urlencoded());
        app.use(express.methodOverride());
        app.use(app.router);
        app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
        app.use(express.static(path.join(__dirname, 'public')));

        if ('development' == app.get('env')) {
            app.use(express.errorHandler());
        }
    },

    configureRoutes: function(app){
        var self = this;
        this.routes = require("./routes");
        _.each(this.routes, function(route, key){
            var routeSplit = route.split('#');
            var controller = routeSplit[0]
            var action = routeSplit[1];
            app.get(key, function(req, res){
                self.app.handleAction(controller, action, req, res);
            });
        });
    },

    configureServer: function(app){
        var self = this;
        this.server = http.createServer(app).listen(app.get('port'), function(){
            console.log('Express server listening on port ' + app.get('port'));

            if(self.ready_callback){
                self.ready_callback();
            }
            self.ready = true;
        });
    },

    configureWebSocketServer: function(){
        var self = this;
        this.wss = new WebSocketServer({server: this.server});
        console.log('Websocket server created');
        this.wss.on('connection', function(ws) {
            var ID = self.clientID++;
            console.log('Websocket connection open');
            if(!self.listeningWorkers){
                self.listenForWorkerUpdate();
            }
            ws.on('message', function(data) {
                var msg = JSON.parse(data);
                if(msg[0] == MC.ws.client.SYNC){
                    self.clients[ID] = {ws: ws, key: msg[1], open: true};
                    self.sendWorkerData(self.clients[ID]);
                    ws.send(self.prepareMessage([MC.ws.server.SYNC,new Date()]));
                }
            });
            ws.on('close', function() {
                self.clients[ID].open = false;
                delete self.clients[ID];
                console.log('Websocket connection close');
            });
        });

        setInterval(function(){
            self.sendWorkerData();
        },600000);
    },

    sendWorkerData: function(client) {
        var self = this;

        if(client){
            if(client.key == 'all'){
                this.app.getAllWorkersData(function(data){
                    _.each(data, function(threadData) {
                        var preparedData = self.prepareMessage([MC.ws.server.PAST_REQS, threadData]);
                        if(client.open){
                            client.ws.send(preparedData);
                        }
                    });
                });
            }else{
                this.app.getWorkerData(client.key,function(data){
                    var preparedData = self.prepareMessage([MC.ws.server.PAST_REQS, data]);
                    if(client.open){
                        client.ws.send(preparedData);
                    }
                });
            }
        }else{
            var listOfKeys = self.getListOfKeys();
            _.each(listOfKeys, function(key) {
                self.app.getWorkerData(key,function(data){
                    var preparedData = self.prepareMessage([MC.ws.server.PAST_REQS, data]);
                    console.log('Broadcasting worker data',key);
                    self.broadcast(key, preparedData);
                });
            });
        }
    },

    broadcast: function(key, data) {
        _.each(this.clients, function(client){
            if(client.key == key || client.key  == 'all'){
                if(client.open){
                    client.ws.send(data);
                }
            }
        });
    },

    getListOfKeys: function() {
        var listOfKeys = [];
        var self = this;
        _.each(this.clients, function(c) {
            if(c.key == 'all'){
                listOfKeys = self.app.getAllWorkerKeys();
            }else{
                if(!_.contains(listOfKeys, c.key)){
                    listOfKeys.push(c.key);
                }
            }
        });
        return listOfKeys;
    },

    prepareMessage: function(msg){
        return  LZString.compressToUTF16(JSON.stringify(msg));
    },

    listenForWorkerUpdate: function(){
        var self = this;
        this.listeningWorkers = true;
        this.app.onWorkerUpdate(function(key, data) {
            var action = data.actionData.code;
            var preparedData = self.prepareMessage([action,data]);
            self.broadcast(key, preparedData);
        });
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    },

    onReady: function(callback){
        if(this.ready){
            callback();
        }else{
            this.ready_callback = callback;
        }
    }
});

