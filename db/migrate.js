var DB = require('./../db');

var db = new DB();
db.onReady(function(){

    var query = 'CREATE TABLE clans '
        + '(id bigint NOT NULL, '
        + 'description text, '
        + 'motto text, '
        + 'name text, '
        + 'tag text, '
        + 'status integer, '
        + 'updated_at timestamp without time zone, '
        + 'CONSTRAINT "PRIMARY" PRIMARY KEY (id))';

    db.client.query(query, function(err, results) {
        if(err) {
            console.error('Error running query', err, query);
        }
        console.log(results);
    });
});