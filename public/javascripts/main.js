var ClientMessages = {
    SYNC: 0
};
var ServerMessages = {
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

        var host = location.origin.replace(/^http/, 'ws');
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

            if(data.speeds){
                $('#'+key+'_current_speed').html(data.speeds.currentSpeed + ' clans/s');
                $('#'+key+'_average_speed').html(data.speeds.averageSpeed + ' clans/s');
                $('#'+key+'_current_duration').html(data.speeds.duration + ' ms');
            }

            if(data.cycleTimes){
                $('#'+key+'_running_time').html(data.cycleTimes.duration);
                $('#'+key+'_remaining_time').html(data.cycleTimes.remainingTime);
                $('#'+key+'_completion').html(data.cycleTimes.completion + ' %');
                $('#'+key+'_progress .progress-bar').attr('style', 'width:' + data.cycleTimes.completion + '%');
            }

            if(data.cycleData){
                $('#'+key+'_finished_requests').html(data.cycleData.finishedRequests);
                $('#'+key+'_error_requests').html(data.cycleData.errorRequests);
                $('#'+key+'_error_rate').html(data.cycleData.errorRate + ' %');
            }

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
            }else if(action == ServerMessages.MEMBER_JOINED || action == ServerMessages.MEMBER_LEFT){
                if($('#'+key+'_event_list').length > 0){
                    $('#'+key+'_event_list').prepend(getTemplate('event_template',{key: key, event: data.actionData, ch: action == ServerMessages.MEMBER_JOINED?1:-1}));
                }
            }else if(action == ServerMessages.WORKER_STOPPED){
                $('#'+key+'_start_stop').html('Start');
                $('#'+key+'_start_stop').addClass('paused');
            }else if(action == ServerMessages.WORKER_STARTED){
                $('#'+key+'_start_stop').html('Stop');
                $('#'+key+'_start_stop').removeClass('paused');
            }
        };
    }else{
        console.log('Did not start connection with server.');
    }

    $('[id$="_config_submit"]').click(function() {
        var key = $(this).attr('id').split('_')[0];
        var parent = $(this).parents('.list-group');
        var config = {
            key: key,
            config: {
                maxActiveRequests: parent.find('[id$="_max_active_requests"]').val(),
                clansInRequest: parent.find('[id$="_clans_in_request"]').val(),
                waitMultiplier: parent.find('[id$="_wait_multiplier"]').val()
            }
        };
        ws.send(JSON.stringify([APIData.secret, config]));
    });

    $('[id$="_start_stop"]').click(function() {
        var key = $(this).attr('id').split('_')[0];
        var pause = !$(this).hasClass('paused');
        var data = {
            key: key,
            pause: pause
        };
        ws.send(JSON.stringify([APIData.secret, data]));
    });
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