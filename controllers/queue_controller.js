var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');

module.exports = BaseController.extend({

    client: function (req, res) {
        var count = 0;
        this.workerManager.forAll(function(worker){
            count += worker.type == 'client' ? 1 : 0;
        });
        var limit = this.workerManager.config.clientLimit;

        res.json({clients: count, accept_new: count < limit});
    }

});