$(function(){

    if(window.APIData){
        APIData.requests = {};

        setInterval(function(){
            for(var i in APIData.requests){
                if(!APIData.requests[i].duration){
                    var req = APIData.requests[i];
                    var duration = (new Date()).getTime() - (new Date(req.start)).getTime() + ' ms';
                    $('#'+req.w+'_req_'+i+' .badge').html(duration);
                }
            }
        },100);

        var workerSub = APIData.worker == 'all' ? '*' : APIData.worker+'.*';
        window.system = new WOTcsSystem(['workers.'+workerSub, 'queue.*']);

        system.onClose(function(){
            APIData.requests = {};
            APIData.workers = {};
            $('[id$="request_list"]').find('.list-group-item').remove();

            $('#worker-buttons').html('<a class="btn btn-default active" href="/">All</a>');
            $('#admin_panels').html("");
        });
        system.onMessage(/workers\.(\d+?)\.start-request/, function(match, data){
            var selector = APIData.worker == 'all' ? 'all' : match[1];
            var ID = data.task.ID;
            var req = parseRequestTimes(data);
            req.w = selector;
            APIData.requests[ID] = req;
            var $requestList = $('#'+selector+'_request_list');
            $requestList.prepend(getTemplate('request_template',{worker: selector, req: req, ID: ID}));
            $requestList.find('.list-group-item').slice(100).remove();
        });
        system.onMessage(/workers\.(\d+?)\.finish-request/, function(match, data){
            var selector = APIData.worker == 'all' ? 'all' : match[1];
            var ID = data.task.ID;
            var req = parseRequestTimes(data);
            req.w = selector;
            APIData.requests[ID] = req;
            var $req = $('#'+selector+'_req_'+ID);
            $req.removeClass('active').addClass('finished')
                .find('.badge').html(req.duration+' ms');
            if(req.error){
                $req.addClass('list-group-item-danger')
                    .find('i').html(' - '+req.error);
            }
        });
        system.onMessage(/queue\.update/, function(match, data){
            $('#queue_total').html(data.totalCount);
            $('#queue_done').html(data.doneCount);
            $('#queue_pending').html(data.pending);

            var completion = data.doneCount / data.totalCount * 100;
            var pendingCompletion = data.pending / data.totalCount * 100;
            var $progress = $('#queue_progress');

            $progress.find('.progress-bar-success').attr('style', 'width:' + completion + '%');
            $progress.find('.progress-bar-warning').attr('style', 'width:' + pendingCompletion + '%');

            var duration = (new Date()).getTime() - (new Date(data.start)).getTime();
            var speed = data.doneCount/duration*1000;
            var remaining = data.totalCount - data.doneCount;
            var remainingSeconds = Math.round(remaining/speed);
            var remainingMinutes = Math.floor(remainingSeconds/60);
            var time = remainingMinutes > 0 ? remainingMinutes+' m ' : '';
            $('#queue_remaining_time').html(time+remainingSeconds%60+' s');
        });
        system.onMessage(/workers\.(\d+?)\.update/, function(match, data){
            var worker = match[1];
            var selector = APIData.worker == 'all' ? 'all' : worker;
            if(!APIData.workers[worker]){
                APIData.workers[worker] = {};
            }
            if(!APIData.workers.all){
                APIData.workers.all = {
                    stats:{
                        finishedRequests: 0,
                        finishedClans: 0,
                        errorRequests: 0
                    }
                };
            }
            if($('#worker_'+worker+'_link').length == 0){
                var humanIndex = (1+parseInt(worker,10));
                $('#worker-buttons').append('<a class="btn btn-default" id="worker_'+worker+'_link" href="?w='+humanIndex+'">Worker '+humanIndex+'</a>');
            }

            APIData.workers[worker].stats = {
                finishedRequests: data.stats.finishedRequests,
                finishedClans: data.stats.finishedClans,
                errorRequests: data.stats.errorRequests
            };

            APIData.workers.all.stats.finishedRequests = 0;
            APIData.workers.all.stats.finishedClans = 0;
            APIData.workers.all.stats.errorRequests = 0;

            for(var i in APIData.workers) {
                if(i != 'all'){
                    APIData.workers.all.stats.finishedRequests += APIData.workers[i].stats.finishedRequests;
                    APIData.workers.all.stats.finishedClans += APIData.workers[i].stats.finishedClans;
                    APIData.workers.all.stats.errorRequests += APIData.workers[i].stats.errorRequests;
                }
            }

            $('#'+selector+'_finished_clans').html(APIData.workers.all.stats.finishedClans);
            $('#'+selector+'_finished_requests').html(APIData.workers.all.stats.finishedRequests);
            $('#'+selector+'_error_requests').html(APIData.workers.all.stats.errorRequests);

            var finishedClans = APIData.workers.all.stats.finishedClans;
            setTimeout(function(){
                if(APIData.workers.all){
                    var speed = (APIData.workers.all.stats.finishedClans - finishedClans)/10;
                    $('#'+selector+'_speed').html(Math.round(speed*100)/100+' clans/s');
                }
            },10000);
        });
        system.onMessage(/workers\.(\d+?)\.clans\.(\d+?)\.add-player/, function(match, data){
            var selector = APIData.worker == 'all' ? 'all' : match[1];
            var $eventList = $('#'+selector+'_event_list');
            if($eventList.length > 0){
                $eventList.prepend(getTemplate('event_template',{worker: selector, event: data, ch: 1}));
                $eventList.find('.list-group-item').slice(100).remove();
            }
        });
        system.onMessage(/workers\.(\d+?)\.clans\.(\d+?)\.remove-player/, function(match, data){
            var selector = APIData.worker == 'all' ? 'all' : match[1];
            var $eventList = $('#'+selector+'_event_list');
            if($eventList.length > 0){
                $eventList.prepend(getTemplate('event_template',{worker: selector, event: data, ch: -1}));
                $eventList.find('.list-group-item').slice(100).remove();
            }
        });
        system.onMessage(/workers\.(\d+?)\.pause/, function(match){
            var worker = match[1];
            $('#'+worker+'_start_stop').html('Start').addClass('paused');
        });
        system.onMessage(/workers\.(\d+?)\.start/, function(match){
            var worker = match[1];
            $('#'+worker+'_start_stop').html('Stop').removeClass('paused');
        });
        system.onMessage("execute", function(worker, method, data){
            if(method == 'setConfig'){
                $('#'+worker+'_config_submit').html('Saved');
            }else if(method == 'getConfig'){
                $('#admin_panels').append(getTemplate('admin_panel_template',{key: worker, config: data}));
            }else{
                console.log(arguments);
            }
        });
        system.onMessage('workers.add-worker', function(data) {
            var worker = data.ID;
            APIData.workers[worker] = {
                stats: {
                    finishedRequests: 0,
                    finishedClans: 0,
                    errorRequests: 0
                }
            };
            var humanIndex = (1+parseInt(worker,10));
            $('#worker-buttons').append('<a class="btn btn-default" id="worker_'+worker+'_link" href="?w='+humanIndex+'">Worker '+humanIndex+'</a>');
            if($('#admin_panels').length > 0){
                system.send(['execute',worker,'getConfig']);
            }
        });
        system.onMessage('workers.remove-worker', function(data) {
            var worker = data.ID;
            delete APIData.workers[worker];
            $('#worker_'+worker+'_link').remove();
            $('#'+worker+'_admin_panel').remove();
        });
        system.onUnrecognized(function(){
            console.log(arguments);
        });

    }

    if($('#admin_panels').length > 0){
        $(document).on('click','[id$="_config_submit"]',function() {
            var worker = $(this).attr('id').split('_')[0];
            var $parent = $(this).parents('.list-group');
            var config = {};
            $parent.find('.config input').each(function(){
                config[$(this).attr('id').split('_')[1]] = $(this).val();
            });
            system.send(['execute',worker,'setConfig',config]);
        });
        $('#admin_panels').on('change', 'input', function() {
            $(this).parents('.list-group').find('[id$="_config_submit"]').html('Save');
        });

        $(document).on('click', '[id$="_start_stop"]', function() {
            var worker = $(this).attr('id').split('_')[0];
            var pause = !$(this).hasClass('paused');
            system.send(['execute',worker,'pause',pause]);
        });
    }
});

function parseRequestTimes(req) {
    req.start = new Date(req.start);
    if(system.sync.offset)req.start = adjustTime(req.start);
    if(req.end){
        req.end = new Date(req.end);
        if(system.sync.offset)req.end = adjustTime(req.end);
    }
    return req;
}

function adjustTime(time){
    time.setTime(time.getTime() - system.sync.offset);
    return time;
}

function getTemplate(template, data){
    return jade.templates[template](data);
}