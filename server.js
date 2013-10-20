var express = require('express');
var http = require('http');
var path = require('path');
var WebSocketServer = require('ws').Server;
var cls = require("./lib/class");
var _ = require("underscore");
var LZString = require('./lib/lz-string-1.3.3');

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

        this.ClientMessages = {
            SYNC: 0
        };
        this.ServerMessages = {
            SYNC: 0,
            ADD_REQ: 1,
            FINISH_REQ: 2,
            PAST_REQS: 3,
            CYCLE_DATA: 4,
            CYCLE_START: 5
        };
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
        app.get('/', function(req, res){
            self.app.homepage(req, res);
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
            self.clients[ID] = ws;
            console.log('Websocket connection open');
            if(!self.listeningWorkers){
                self.listenForWorkerUpdate();
            }
            self.sendWorkerData(ws);
            ws.on('message', function(data) {
                var msg = JSON.parse(data);
                if(msg[0] == self.ClientMessages.SYNC){
                    ws.send(self.prepareMessage([self.ServerMessages.SYNC,new Date()]));
                }
            });
            ws.on('close', function() {
                delete self.clients[ID];
                console.log('Websocket connection close');
            });
        });

        setInterval(function(){
            self.sendWorkerData();
        },600000);
    },

    sendWorkerData: function(client) {
        var preparedData = this.prepareMessage([this.ServerMessages.PAST_REQS,this.app.getWorkerData()]);
        if(client){
            client.send(preparedData);
        }else{
            console.log('Broadcasting worker data');
            _.each(this.clients, function(ws){
                ws.send(preparedData);
            });
        }
    },

    prepareMessage: function(msg){
        return  LZString.compressToUTF16(JSON.stringify(msg));
    },

    listenForWorkerUpdate: function(){
        var self = this;
        this.listeningWorkers = true;
        this.app.onWorkerUpdate(function(data) {
            var action = data.actionData.code;
            var preparedData = self.prepareMessage([action,data]);
            _.each(self.clients, function(ws){
                ws.send(preparedData);
            });
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

