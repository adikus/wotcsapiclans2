var _ = require('underscore');

module.exports = function( db ) {
    var ret = {};
    var models = {};

    require("fs").readdirSync("./models").forEach(function(file) {
        if(file === 'index.js' || file === 'base_model.js' || file === 'base_collection.js') { return false; }
        var parts = file.split('.')[0].split('_');
        var name = _.map(parts,function (part) {
            return part.charAt(0).toUpperCase() + part.slice(1);
        }).join('');
        models[name] = require("./" + file);
        return true;
    });

    _.each(models,function (model, name) {
        if(name.slice(-1) == 's'){
            ret[name] = new model(db, models);
        }
    });

    return ret;
};