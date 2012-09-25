var redis   = require('redis');
var w       = require('winston');

function redpill(sq)
{
    // redpill uses redis pubsub for events and list for message storage
    //
    //  uses redis pub/sub to send realtime notifications [ to avoid polling ]
    //  uses redis list ops to get the actual message data from redis persistent store
    //
    //  the combo should result in a persistent non-polling message queue with good performance

    w.info("new redpill : "+sq);

    var rp  = {};

    rp.sq   = sq;
    rp.mqr  = redis.createClient();         // msg reciever
    rp.mqs  = redis.createClient();         // msg sender
    rp.r    = redis.createClient();         // list push/pop

    rp.push = function(ob)
    {
        var sob = JSON.stringify(ob);
        rp.mqs.publish(rp.sq, rp.sq);       // any message will tell listeneres ther is data ready
        rp.r.rpush(rp.sq, sob); 

        // w.info("redpill.push : "+sob)
    }

    rp.pull = function(cb)
    {
        function check()
        {
            var k = rp.r.lpop(rp.sq, function(err, reply) {
                if (!reply)
                    return;
                // w.info("redpill.pull : "+reply);
                var ob = JSON.parse(reply);
                cb(ob);
            });
        }

        rp.mqr.on("message", function(channel, message) {
            check();                        // any notification means we check the list
        });

        // consume any previously queued items

        function checkbacklog()
        {
            function backlog(err, n)
            {
                if(err)
                {   
                    w.error("redpill:pull: backlog ERROR ");
                    return;
                }
                if (n==0)
                    return;

                w.info("redpill:pull: backlog : ["+rp.sq+"] has "+n+" items");

                if (n>20)
                    n=20;

                for (var j=0;j<n;j++)
                {
                    check(); 
                }

                setTimeout(checkbacklog, 3);
            }
            rp.r.llen(rp.sq, backlog);        // pop in chunks
        }
        checkbacklog();

        //  

        rp.mqr.subscribe(rp.sq);
    }

    rp.close = function()
    {
        rp.mqr.unsubscribe();

        rp.mqr.quit();
        rp.mqs.quit();
        rp.r.quit();
    }
   
    return rp;      
}

///

exports.pill = redpill;
