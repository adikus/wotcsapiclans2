APIData = {lastRequests:{}};
var ClientMessages = {
    SYNC: 0
};
var ServerMessages = {
    SYNC: 0,
    ADD_REQ: 1,
    FINISH_REQ: 2,
    PAST_REQS: 3,
    CYCLE_DATA: 4,
    CYCLE_START: 5
};

$(function(){
    setInterval(function(){
        for(var i in APIData.lastRequests){
            if(!APIData.lastRequests[i].duration){
                var duration = (new Date()).getTime() - (new Date(APIData.lastRequests[i].start)).getTime() + ' ms';
                $('#req_'+i+' .badge').html(duration);
            }
        }
    },100);

    var host = location.origin.replace(/^http/, 'ws')
    var ws = new WebSocket(host);

    ws.onopen = function(){
        ws.send(JSON.stringify([ClientMessages.SYNC]));
        APIData.sync = {start: new Date()};
    }

    ws.onmessage = function (event) {
        var decompressedData = LZString.decompressFromUTF16(event.data);
        var msg = JSON.parse(decompressedData);
        var data = msg[1] || {};
        var action = msg[0];

        if(action == ServerMessages.SYNC){
            APIData.sync.end = new Date();
            APIData.sync.duration = APIData.sync.end.getTime() - APIData.sync.start.getTime();
            APIData.sync.midpoint = new Date((APIData.sync.end.getTime() + APIData.sync.start.getTime())/2);
            APIData.sync.server = new Date(data);
            APIData.sync.offset = APIData.sync.server.getTime() - APIData.sync.midpoint.getTime();
            console.log(APIData.sync);

            $('#request_list').html('');
            for(var i in APIData.lastRequests){
                var req = APIData.lastRequests[i];
                req.start = adjustTime(req.start);
                if(req.end){
                    req.end = adjustTime(req.end);
                }
                APIData.lastRequests[i] = req;
                $('#request_list').prepend(getTemplate('request_template',{req: req, ID: i}));
            }

            return;
        }
        //console.log('Compression',event.data.length/decompressedData.length*100,'%',event.data.length);
        //console.log(msg[0],data);

        $('#current_speed').html(data.speeds.currentSpeed + ' clans/s');
        $('#average_speed').html(data.speeds.averageSpeed + ' clans/s');
        $('#current_duration').html(data.speeds.duration + ' ms');

        $('#running_time').html(data.cycleTimes.duration);
        $('#remaining_time').html(data.cycleTimes.remainingTime);
        $('#completion').html(data.cycleTimes.completion + ' %');

        $('.progress-bar').attr('style', 'width:' + data.cycleTimes.completion + '%');

        $('#finished_requests').html(data.cycleData.finishedRequests);
        $('#error_requests').html(data.cycleData.errorRequests);
        $('#error_rate').html(data.cycleData.errorRate + ' %');

        if(action == ServerMessages.FINISH_REQ){
            var ID = data.actionData.id;
            var req = parseRequestTimes(data.actionData.req);
            APIData.lastRequests[ID] = req;
            $('#req_'+ID+' .badge').html(req.duration+' ms');
            $('#req_'+ID).removeClass('active').addClass('finished');
        }else if(action == ServerMessages.ADD_REQ){
            var ID = data.actionData.id;
            var req = parseRequestTimes(data.actionData.req);
            APIData.lastRequests[ID] = req;
            $('#request_list').prepend(getTemplate('request_template',{req: req, ID: ID}));
        }else if(action == ServerMessages.PAST_REQS){
            $('#request_list').html('');
            for(var i in data.lastRequests){
                var req = parseRequestTimes(data.lastRequests[i]);
                APIData.lastRequests[i] = req;
                $('#request_list').prepend(getTemplate('request_template',{req: req, ID: i}));
            }
        }else if(action == ServerMessages.CYCLE_START){
            $('#request_list').html('');
        }
    };
});

function parseRequestTimes(req) {
    req.start = new Date(req.start);
    if(APIData.sync.offset)req.start = adjustTime(req.start);
    if(req.end){
        req.end = new Date(req.end);
        if(APIData.sync.offset)req.end = adjustTime(req.end);
    }
    return req;
}

function adjustTime(time){
    time.setTime(time.getTime() - APIData.sync.offset);
    return time;
}

function getTemplate(template, data){
    return jade.templates[template](data);
}