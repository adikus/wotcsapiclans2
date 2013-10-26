module.exports = {
    ws: {
        server: {
            SYNC: 0,
            ADD_REQ: 1,
            FINISH_REQ: 2,
            PAST_REQS: 3,
            CYCLE_DATA: 4,
            CYCLE_START: 5
        },
        client: {
            SYNC: 0
        }
    },

    cluster: {
        master: {
            ASSIGN_TASK: 0,
            GET_WORKER_DATA: 1
        },
        client: {
            GET_TASK: 0,
            SEND_WORKER_DATA: 1,
            WORKER_UPDATE: 2
        }
    }
};