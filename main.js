var Server = require('./server');
var App = require('./app');
var DB = require('./db');
var cluster = require('cluster');
var Messenger = require("./messenger");

function main(){
    var db = new DB();
    var app;
    var messenger;

    db.onReady(function(){
        if (cluster.isMaster){
            app = new App(true);
            messenger = new Messenger(true);
            var server = new Server();
            server.dependencies({
                app: app
            });
            server.onReady(function(){
                app.dependencies({
                    db: db,
                    server: server,
                    messenger: messenger
                });
                messenger.dependencies({
                    app: app
                });
                app.addWorker('NA');

                messenger.setupWorker(cluster.fork(), 'EU1');
                messenger.setupWorker(cluster.fork(), 'EU2');
                messenger.setupWorker(cluster.fork(), 'RU-SEA-KR');
            });
        }else{
            app = new App(false);
            messenger = new Messenger(false);
            app.dependencies({
                db: db,
                messenger: messenger
            });
            messenger.dependencies({
                app: app
            });
        }
    });
}

main();