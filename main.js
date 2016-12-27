var App = require('wotcs-api-system').App;
var Queue = require('./queue');
var config = require('./config');

var app = new App(__dirname, config);
app.setErrorHandler('Errors');

if (app.isMaster){
    var queue = new Queue();
    app.setupWorkers(1, 'clan_loader', 'clan_loader_client', queue);
}