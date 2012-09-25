var fs      = require('fs');
var redpill = require('./redpill')
var w       = require('winston')
var u       = require('./util')
var _       = require('underscore')

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


fwords = fs.readFileSync("words.txt", 'utf8')
dictwords = fwords.split('\n')

w.info("loaded "+dictwords.length+" words")

function sample_words(n)
{
    if (!n || n<1)
        n=10
    words = []
    for (var i=0;i<n;i++)
    {
        r = nrand(dictwords.length);
        words.push(dictwords[r]);
    }
    return words;
}

function word_string(n)
{
    return sample_words(n).join(' ');
}

function random_info()
{
    spec = {
    //  key : nwords
        title : 2+nrand(4),
        body : 20+nrand(20)+nrand(10)*nrand(5),
        tags : 3+nrand(8)
    }

    var info = {};
    for (var k in spec)
    {
        n = spec[k];
        info[k] = word_string(n);
    }
    return info;
}

///////

var N       = 100000;
var nusers  =  10000;
var c=N;

var sqname = "store_put";

var pillstore = redpill.pill(sqname);

function run()
{
    var nbytes = 0;
    var i=0;

    var g=0;

    function another()
    {
        info = random_info();

        info.action = "create";
        info.type   = "info";
        info.src    = "provider_generator";
        info.userid = nrand(nusers); 
        info.ts     = u.timestamp();        

        info.tags   = _.union(info.tags.split(' '), info.title.split(' '));

        sinfo = JSON.stringify(info);
        nb = sinfo.length;
        nbytes += nb;

        // w.info("provider: pushing : "+info.title);
        pillstore.push(info);

        if (++i<N) 
        {
            if (++g>1000)
            {
                wj('wrote 1000 items : to queue ['+sqname+'] ...');
                g=0;
            }
            setTimeout(another, nrand(4));
        }    
        else
        {
            pillstore.close();
            wj('wrote '+N+' items : ['+nbytes+' bytes ] : to queue ['+sqname+'] : stopping');
        }
    }

    another();
}

run();



