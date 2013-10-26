var exports = {};

require("fs").readdirSync("./controllers").forEach(function(file) {
    if(file === 'index.js' || file === 'base_controller.js') { return false; }
    var name= file.split('.')[0].split('_')[0];
    exports[name] = require("./" + file);
    return true;
});

module.exports = exports;