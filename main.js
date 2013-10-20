var Server = require('./server');
var App = require('./app');
var DB = require('./db');
var ClanLoader = require('./clan_loader');

function main(){
    var db = new DB();
    var app = new App();
    var server;
    db.onReady(function(){
        server = new Server();
        server.dependencies({
            app: app
        });
        server.onReady(function(){
            app.dependencies({
                db: db,
                server: server
            });
            app.addWorker(new ClanLoader('EU'));
        });
    });
}

main();