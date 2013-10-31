module.exports = {
    ws: {
        server: {
            SYNC: 0,
            ADD_REQ: 1,
            FINISH_REQ: 2,
            PAST_REQS: 3,
            CYCLE_DATA: 4,
            CYCLE_START: 5,
            MEMBER_JOINED: 6,
            MEMBER_LEFT: 7,
            WORKER_STOPPED: 8,
            WORKER_STARTED: 9
        },
        client: {
            SYNC: 0,
            SECRET: process.env.WOTCS_ADMIN_SECRET
        }
    },

    cluster: {
        master: {
            ASSIGN_TASK: 0,
            GET_WORKER_DATA: 1,
            ADD_CLAN: 2,
            GET_WORKER_CONFIG: 3,
            SET_WORKER_CONFIG: 4,
            PAUSE_WORKER: 5
        },
        client: {
            GET_TASK: 0,
            SEND_WORKER_DATA: 1,
            WORKER_UPDATE: 2,
            ADD_CLAN_RESPONSE: 3,
            SEND_WORKER_CONFIG: 4
        }
    }
};