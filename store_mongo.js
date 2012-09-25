var fs          = require('fs');
var _           = require('underscore')
var w           = require('winston')
var redpill     = require('./redpill');
var mongodb     = require('mongodb');


var conf = {
    store : 
    {
        comment : "datab store for info items, ie user data",
        db : "info",
        host : "localhost",
        port : 27017
    }
}

function wj(s,o)
{
    if (!o)
    {
        o=s;
        s='';
    }
    w.info(s+JSON.stringify(o,null,4))
}

function nrand(n)
{
    return Math.floor(n*Math.random());
}

///

var storenotify = redpill.pill('store_notify');

var dbinfo = null;

var redpills = {};


function rsend(sq, ob)
{
    // init on demand, then send

    var pill = redpills[sq];
    if (!pill)
        redpills[sq] = pill = redpill.pill(sq);

    pill.push(ob);
}

function on_put(data)
{
    //wj("store:on_put: put job to save data");

    // save data to collection based on type

    info = data;

    function onsaved(error, saved)
    {
        //wj("store:on_put:saved ", saved._id);

        info._id = saved._id

        nb = JSON.stringify(info).length;
        wj("saved : "+info._id+" "+info.title+" : [bytes="+nb+", userid="+info.userid+"]");

        storenotify.push(info);
    }

    dbinfo.save(data, {}, onsaved);     // todo save to collection based on type
}

function on_get(data)
{
    // wj("store:on_get: get job to fetch data");

    // for simplicity query is just {limit, offset}, with optional attr_name, attr_val for searching
    // when we have fetched items we put the resultset as json onto the resultq

    var tss = Date.now();

    var job = data;
    limit = 100;
    offset = 0;
    if (job.limit && job.limit>0)
        limit = job.limit;
    if (job.offset && job.offset>0)
        offset = job.offset;

    var qry = {
    };

    if (job.attr_name && job.attr_val)
        qry[job.attr_name] = job.attr_val; 

    function ondata(err, rs)
    {
        if (err)
        {
            wj("error", err);
            return;
        }

        var tse = Date.now();
        dt = tse-tss;

        wj("store:on_get: fetched "+rs.length+" records, took "+dt+"ms");

        var result = {"results":rs, "job":job};

        // put resultset on outbound q

        var soutq = "store_data";
        if (job.responseq)
            soutq = job.responseq;

        rsend(soutq, result);
    }

    // wj("qry : ", qry);
   
    dbinfo.find(qry, {}, {"limit":limit, "skip":offset}).toArray(ondata); 
}


function init_store(next)
{
    wj("store:init_store");

    server = new mongodb.Server(conf.store.host, conf.store.port, {})
    if (!server)
    {
        w.error("cant connect to server");
        return;
    }

    mdb = new mongodb.Db(conf.store.db, server, {})
    if (!mdb)
    {
        w.error("cant connect to database");
        return;
    }

    function dbstart(error, client) 
    {
        wj("store:dbstart:");

        if (error)
        {
            wj("ERROR", error);
            return;
        }

        dbinfo = new mongodb.Collection(mdb, 'info');

        mdb.ensureIndex('info', { userid:true });

        next();
    }

    mdb.open(dbstart);
}

// startup sequence

function listeners()
{
    var storeput = redpill.pill("store_put");
    var storeget = redpill.pill("store_get");

    storeput.pull(on_put);
    storeget.pull(on_get);
}

init_store(listeners);


