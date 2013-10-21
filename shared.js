module.exports = {
    measureDuration: function (block) {
        var startedAt = new Date();
        block(function(){
            return Date.now() - startedAt.getTime();
        });
    },

    Regions: {
        RU: 0,
        EU: 1,
        NA: 2,
        SEA: 3,
        VN: 4,
        KR: 5
    },

    TranslatedRegion: ['RU','EU','NA','SEA','VN','KR'],

    getRegion: function (id) {
        if(id > 3000000000){return this.Regions.KR;}
        if(id > 2500000000){return this.Regions.VN;}
        if(id > 2000000000){return this.Regions.SEA;}
        if(id > 1000000000){return this.Regions.NA;}
        if(id > 500000000){return this.Regions.EU;}
        return this.Regions.RU;
    },

    parseData: function (data) {
        try{
            return JSON.parse(data);
        }catch(e){
            return false;
        }
    },

    durationToString: function (duration) {
        if(!duration){
            return '-';
        }
        var mins = Math.floor(duration/(60*1000));
        var secs = Math.round(duration/1000) % 60;
        return mins+"m"+secs+"s";
    }
};