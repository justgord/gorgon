var http            = require('http');
var url             = require('url');
var w               = require('winston');
var _               = require('underscore');
var redpill         = require('./redpill');
var u               = require('./util');

function wj(s,o)
{
    if (!o)
    {
        o=s;
        s='';
    }
    w.info(s+JSON.stringify(o,null,4))
}

var pillfetch = redpill.pill("store_get");

var jobs = {};                      // active jobs, web requests waiting on response

function on_data(data)
{
    //wj("web_face:on_data: got data response from web_data q", data);

    job = jobs[data.job.jobid];
    if (!job)
    {
        w.warn("web_face: IGNORING UNKNOWN jobid="+data.job.jobid);
        return;
    }

    var resp = {"info":null, "data":null};
    resp.data   = data.results;

    var info    = job.qry;
    info.tsdone = Date.now();
    info.millis = info.tsdone - info.tsstart;
    info.ncount = data.results.length;
    resp.info  = info;

    w.info("web_face:on_data: response took "+ info.millis+" ms");

    res = job.res;
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(resp,null,4));
    res.write('\n');
    res.end();

    delete jobs[data.job.jobid];
}        

var rpdata = redpill.pill("web_data");
rpdata.pull(on_data);


http.createServer(function (req, res) {

    //w.info('got request '+req.url);

    var parsed = url.parse(req.url, true);

    if (parsed.pathname=='/info')
    {
        var params = parsed.query;

        var uid = params.uid ? params.uid : 0;        // default to userid 0
        var lim = params.lim ? params.lim : 100;
        var off = params.off ? params.off : 0;
       
        s="web_face: request : uid="+uid+" lim="+lim+" off="+off;
        // w.info(s);

        var qry = {};
        qry.offset=off;
        qry.limit=lim;
        qry.attr_name='userid';
        qry.attr_val=parseInt(uid);

        qry.responseq = 'web_data';

        qry.jobid = jid = u.suniq();
        qry.tsstart = Date.now();

        pillfetch.push(qry);

        jobs[jid] = {"qry":qry, "res":res};

        return;
    }

    res.writeHead(404);
    res.end();

}).listen(8500);

console.log('web_face running at http://127.0.0.1:8500/');
