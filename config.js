module.exports = {
    db: {
        MainDB: {url: process.env.API_POSTGRE || process.env.DATABASE_URL, type: 'PG'},
        ChangeDB: {url: process.env.WOTCS_CLANDB, type: 'Mongo'}
    },
    server: {
        port: process.env.PORT || 3000,
        cookieSecret: process.env.WOTCS_SECRET
    },
    ws: {
        execute: {
            permissions: {
                '*': ['admin']
            }
        }
    },
    worker: {
        url: 'ws://clanapi.wotcs.com'
    }
};