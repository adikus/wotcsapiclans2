var BaseCollection = require('wotcs-api-system').BaseCollection('Mongo');

module.exports = BaseCollection.extend({

    schema: {
        c: 'number',
        p: 'number',
        ch: 'number',
        u: 'date'
    },

    dbName: 'ChangeDB'

});