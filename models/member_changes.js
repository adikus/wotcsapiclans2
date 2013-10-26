var BaseCollection = require('./base_collection_Mongo');

module.exports = BaseCollection.extend({

    schema: {
        c: 'number',
        p: 'number',
        ch: 'number',
        u: 'date'
    },

    name: 'MemberChange',
    dbName: 'clan',
    collectionName: 'memberchanges'

});