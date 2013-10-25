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
    if(window.APIData){
        APIData.lastRequests = {'EU1':{},'EU2':{},'NA':{},'RU-SEA-KR':{}};

        setInterval(function(){
            for(var key in APIData.lastRequests){
                for(var i in APIData.lastRequests[key]){
                    if(!APIData.lastRequests[key][i].duration){
                        var duration = (new Date()).getTime() - (new Date(APIData.lastRequests[key][i].start)).getTime() + ' ms';
                        $('#'+key+'_req_'+i+' .badge').html(duration);
                    }
                }
            }
        },100);

        var host = location.origin.replace(/^http/, 'ws')
        var ws = new WebSocket(host);

        ws.onopen = function(){
            ws.send(JSON.stringify([ClientMessages.SYNC, APIData.key]));
            APIData.sync = {start: new Date()};
        }

        ws.onmessage = function (event) {
            var decompressedData = LZString.decompressFromUTF16(event.data);
            var msg = JSON.parse(decompressedData);
            var data = msg[1] || {};
            var action = msg[0];
            var key = data.key;

            if(data.error){
                console.log(data.error);
                return;
            }

            if(action == ServerMessages.SYNC){
                APIData.sync.end = new Date();
                APIData.sync.duration = APIData.sync.end.getTime() - APIData.sync.start.getTime();
                APIData.sync.midpoint = new Date((APIData.sync.end.getTime() + APIData.sync.start.getTime())/2);
                APIData.sync.server = new Date(data);
                APIData.sync.offset = APIData.sync.server.getTime() - APIData.sync.midpoint.getTime();
                console.log(APIData.sync);

                return;
            }

            $('#'+key+'_current_speed').html(data.speeds.currentSpeed + ' clans/s');
            $('#'+key+'_average_speed').html(data.speeds.averageSpeed + ' clans/s');
            $('#'+key+'_current_duration').html(data.speeds.duration + ' ms');

            $('#'+key+'_running_time').html(data.cycleTimes.duration);
            $('#'+key+'_remaining_time').html(data.cycleTimes.remainingTime);
            $('#'+key+'_completion').html(data.cycleTimes.completion + ' %');

            $('#'+key+'_progress .progress-bar').attr('style', 'width:' + data.cycleTimes.completion + '%');

            $('#'+key+'_finished_requests').html(data.cycleData.finishedRequests);
            $('#'+key+'_error_requests').html(data.cycleData.errorRequests);
            $('#'+key+'_error_rate').html(data.cycleData.errorRate + ' %');

            if(action == ServerMessages.FINISH_REQ){
                var ID = data.actionData.id;
                var req = parseRequestTimes(data.actionData.req);
                APIData.lastRequests[key][ID] = req;
                $('#'+key+'_req_'+ID+' .badge').html(req.duration+' ms');
                $('#'+key+'_req_'+ID).removeClass('active').addClass('finished');
                if(data.actionData.error){
                    $('#'+key+'_req_'+ID).addClass('list-group-item-danger');
                    $('#'+key+'_req_'+ID+' i').html(' - '+req.error);
                }
            }else if(action == ServerMessages.ADD_REQ){
                var ID = data.actionData.id;
                var req = parseRequestTimes(data.actionData.req);
                APIData.lastRequests[key][ID] = req;
                $('#'+key+'_request_list').prepend(getTemplate('request_template',{key: key, req: req, ID: ID}));
            }else if(action == ServerMessages.PAST_REQS){
                $('#'+key+'_request_list').html('');;
                for(var i in data.lastRequests){
                    var req = parseRequestTimes(data.lastRequests[i]);
                    APIData.lastRequests[key][i] = req;
                    $('#'+key+'_request_list').prepend(getTemplate('request_template',{key: key, req: req, ID: i}));
                }
            }else if(action == ServerMessages.CYCLE_START){
                $('#'+key+'_request_list').html('');
            }
        };
    }else{
        console.log('Did not start connection with server.');
    }
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