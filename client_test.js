var http            = require('http');
var w               = require('winston');

//
// make lots of client requests to : http://localhost:8500/info?uid=999
//


function nrand(n)
{
    return Math.floor(n*Math.random());
}


function fetch_random_user_info()
{
    var userid=nrand(1000);
    var surl = 'http://localhost:8500/info?uid='+userid;


    http.get(surl, function(res) {
        w.info("GET : "+surl+" status:"+res.statusCode);

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            // console.log('BODY: ' + chunk);
        });
    }).on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
}

function loop()
{
    fetch_random_user_info();
    setTimeout(loop, 1+nrand(5));
}
loop();
