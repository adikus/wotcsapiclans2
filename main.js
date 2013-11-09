var App = require('wotcs-api-system').App;
var Queue = require('./queue');
var config = require('./config');

var app = new App(__dirname, config);

if (app.isMaster){
    var queue = new Queue();
    app.setupWorkers(4, 'clan_loader', queue);
}