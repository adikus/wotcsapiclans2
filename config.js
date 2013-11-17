module.exports = {
    db: {
        MainDB: {url: process.env.API_POSTGRE || process.env.DATABASE_URL, type: 'PG'},
        ChangeDB: {url: process.env.WOTCS_CLANDB, type: 'Mongo'},
        SupportDB: {url: process.env.MONGOHQ_URL || "mongodb://localhost/wotcsapi", type: 'Mongo'}
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
        version: 3,
        clientLimit: 12,
        configs: {
            local: {
                maxActiveRequests: 4,
                waitMultiplier: 1.05,
                minWaitTime: 650
            },
            server: {
                maxActiveRequests: 4,
                waitMultiplier: 1.05,
                minWaitTime: 650
            },
            client: {
                maxActiveRequests: 3,
                waitMultiplier: 1.2,
                minWaitTime: 750
            }
        }
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