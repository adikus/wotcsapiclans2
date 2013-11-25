$(function(){

    if(window.APIData){
        APIData.requests = {};
        APIData.pause = false;
        APIData.configs = {local:{}, server:{}, client:{}};

        setInterval(function(){
            for(var i in APIData.requests){
                if(!APIData.requests[i].duration){
                    var req = APIData.requests[i];
                    var duration = (new Date()).getTime() - (new Date(req.start)).getTime() + ' ms';
                    $('#queue_task_'+i+' .badge').html(duration);
                }
            }
        },100);

        window.system = new WOTcsSystem(['workers.*', 'queue.*', 'router.stats']);

        system.on('closed',function(){
            APIData.requests = {};
            APIData.workers = {local:[], server:[], client:[]};
            renderWorkerCounts();
            renderAdminPanel();
            $('[id$="task_list"]').find('.list-group-item').remove();
        });
        system.on('router.stats', function(event, routes) {
            $('#router_stats').html(getTemplate('router_stats_template',{routes: routes}));
        });
        system.on('workers.*.start-request', function(event, data){
            if(!APIData.pause){
                var ID = data.task.ID;
                var req = parseRequestTimes(data);
                APIData.requests[ID] = req;
                var $requestList = $('#queue_task_list');
                $requestList.prepend(getTemplate('request_template',{req: req, ID: ID}));
                $requestList.find('.list-group-item').slice(100).remove();
            }
        });
        system.on('workers.*.finish-request', function(event, data){
            var ID = data.task.ID;
            var req = parseRequestTimes(data);
            APIData.requests[ID] = req;
            var $req = $('#queue_task_'+ID);
            $req.removeClass('active').addClass('finished')
                .find('.badge').html(req.duration+' ms');
            if(req.error){
                $req.addClass('list-group-item-danger')
                    .find('i').html(' - '+req.error);
            }
        });
        system.on('queue.update', function(event, data){
            $('#queue_total').html(data.totalCount);
            $('#queue_done').html(data.doneCount);
            $('#queue_pending').html(data.pending);

            $('#queue_finished_clans').html(data.finishedClans);
            $('#queue_finished_tasks').html(data.finishedTasks);
            $('#queue_error_tasks').html(data.errorTasks);
            $('#queue_speed').html(data.speed+' clans/s');

            var completion = data.doneCount / data.totalCount * 100;
            var pendingCompletion = data.pending / data.totalCount * 100;
            var $progress = $('#queue_progress');

            $progress.find('.progress-bar-success').attr('style', 'width:' + completion + '%');
            $progress.find('.progress-bar-warning').attr('style', 'width:' + pendingCompletion + '%');
        });
        system.on('workers.*.clans.*.add-player', function(event, data){
            var $eventList = $('#event_list');
            if($eventList.length > 0){
                $eventList.prepend(getTemplate('event_template',{event: data, ch: 1}));
                $eventList.find('.list-group-item').slice(100).remove();
            }
        });
        system.on('workers.*.clans.*.remove-player', function(event, data){
            var $eventList = $('#event_list');
            if($eventList.length > 0){
                $eventList.prepend(getTemplate('event_template',{event: data, ch: -1}));
                $eventList.find('.list-group-item').slice(100).remove();
            }
        });
        system.on('workers.*.pause', function(event){
            var worker = event.split('.')[1];
            $('#'+worker+'_start_stop').html('Start').addClass('paused');
        });
        system.on('workers.*.start', function(event){
            var worker = event.split('.')[1];
            $('#'+worker+'_start_stop').html('Stop').removeClass('paused');
        });
        system.on('workers.add-worker', function(event, data) {
            APIData.workers = data.workers;
            renderWorkerCounts();
        });
        system.on('workers.remove-worker', function(event, data) {
            APIData.workers = data.workers;
            renderWorkerCounts();
        });

        if(APIData.admin){
            APIData.configs = {local:{}, server:{}, client:{}};
            system.on('connected', function(){
                system.send(['execute-wm','getConfigs']);
            });
            $(document).on('click','[id$="_config_submit"]',function() {
                setConfig($(this),null);
            });
            $(document).on('click', '[id$="_start_stop"]', function() {
                setConfig($(this), !$(this).hasClass('paused'));
            });
            system.on('execute-wm.getConfigs', function(event, configs){
                APIData.configs = configs;
                renderAdminPanel();
            });
            system.on('execute-wm.setConfigByType', function(event, configs){
                APIData.configs = configs;
                renderAdminPanel();
            });
        }
    }
    $('#pause_tasks').click(function(){
        APIData.pause = !APIData.pause;
        $(this).html(APIData.pause?'Start':'Pause');
    });

});

function setConfig($elem, pause){
    var type = $elem.attr('id').split('_')[0];
    var $parent = $elem.parents('.list-group-item');
    var config = {};
    $parent.find('input').each(function(){
        config[$(this).attr('id').split('_')[1]] = $(this).val();
    });
    if(pause !== null){
        config.paused = pause;
    }
    system.send(['execute-wm','setConfigByType',type, config]);
}

function renderWorkerCounts(){
    _.each(APIData.workers, function(worker, type) {
        $('#'+type+'_worker').html(worker.length);
    });
}

function renderAdminPanel(){
    _.each(APIData.configs, function(config, type) {
        $('#'+type+'_worker_admin_panel').html(getTemplate('worker_admin_template',{config: config, type: type}));
    });
}

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