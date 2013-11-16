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
    workerManager: {
        version: 2,
        clientLimit: 12
    },
    worker: {
        url: process.env.API_POSTGRE ? 'ws://localhost:3000' : 'ws://clanapi.wotcs.com'
    },
    assets: {
        compileInDev: false,
        include: [
            'jquery-1.10.2.min.js',
            'request.js',
            'clan_worker.js',
            'main.js'
        ]
    }
};