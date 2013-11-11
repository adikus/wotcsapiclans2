var Worker = require('wotcs-api-system').Worker;
var config = require('./config');

var worker = new Worker(__dirname, config);

worker.setup(4, 'clan_loader');