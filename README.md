Gorgon
======

Message/server architecture for scalable web apps - many node.js services talk via messaging

server proceses talk via messaging, so you can run 1..n instances
you can scale out by running more processes on more machines/cores
fits well with node.js

Want bring servers up and down at any time without disturbing operations


Stack
-----

redis           publish/subscribe messaging
mongodb         json doc data store
node.js         async javascript apps
redpill         persistent pub/sub messaging [ push/pull ] semantics using redis pubsub and lists


Architecture Roles [ server instances ]:
-----

DataProviders       : interface to external data providers, send data in / out

DataStores          : interface to database or datastore eg. mongoDB, mysql, 

WebServer           : handles web requests, web json url api, rest api etc [ external interface ]

NotificationServer  : interface to handle notifications [ pubnub, socket.io, emails ]

AuthServer          : authentication of user requests, user registration, user login, access rights..

AppServer           : does the core application processing

StatsMonitor        : web view shows system throughput, latency, uptime, health stats


Typical Data Schema
-----

    User
        id
        name
        passhash
        email
        authtokens
        [ other fields, extensible ]

    Item
        id
        title
        body
        url
        ts  
        location
        keywords
        userid
        [ other fields, extensible ]


DataFlow
-----

client url request comes in [ from ajax, rest, or website ]
request is put on auth

an auth server grabs it, adds an error or auth token/credentials if allowed

appserver needs to lookup some data, puts that job onto data_get 
DataStore fetches data, puts it on data_ready
appserver gets the data back on data_ready
appserver needs to write some data, puts that job onto data_put 
appserver sends some message out to 3rd party, puts job onto provider_put
appserver sends response back to client, puts job on web_put
webserver gets outbound response job, sends reponse to client


Queues
-----

web_get         web requests as json tasks
web_data        web responses

auth_get        authentication requests - login, register, change pass, add Oauth2, validate, logout
auth_data       authentication responses

store_get       data requests/read [ request has db, collection, id, filter/query ]
store_put       data update/store/write
store_data      data fetch responses / data ready
store_notify    data events - notify whenever theres an add, edit, del of items

provider_get    3rd party external data providers [ facebook, gmail, other system apis ]
provider_put    send to 3rd party external data systems 
provider_data   3rd party data responses [ or feed data coming in at any time ]


Simulator
-----

one node prog that just has a few timer jobs for each process, and use real mongo Q
then replace components one by one with seperate node processes.

10k users having 1M info notes, 
test client fetches info notes for a random user
provider app inserts new random info notes [ ~1000/sec ]

Performance
-----

on 2nd gen i5 with 2 cores [ 4 hw threads], 
running mongo, redis, 2 servers + 2 client testers + 1 data provider
2GB data collection in mongo
4 cores kept busy [ 60 to 80 % load ]
most web requests handled in 20 to 50 ms range, [ with mongo taking 10 to 30ms of that ]


Initial implementation
-----

generator - 
add random data for random users - push into store_put

store - 
get jobs from store_put, writes to db, emit notification to store_notify
get query from store_get, write result to named result q

web - 
http://localhost:3000/info/uid:/lim:/off:
put request on store_get, [ set responseq = 'app_data' ]
store fetches, puts on app_data
get data on store_data, send to response

client - 
randomly request a users recent data - 
uid in 0..999 fetch url : http://localhost:3000/info/{uid} 
simulate 1000 clients with curl, test latency, throughput

redpill message queue impl - 
uses redic pub/sub together with redis list primitives


Running
-----

store_mongo.js          mongo data store [ gets data requests on queue, responds on queue ]
web_face.js             web server [ gets http url requests, puts on q, gets response on q, sends it ]
provider_random.js      inserts random data items to store [ 100k items at roughly 1k/sec ]

client_test.js          makes many repeated http requests for random users info items


TODO
-----

make redpill, gorgon npm modules proper

diagram

stats + web stats page [ heatmap ]

web page to view stats .. refresh loop every sec, keep last 5sec
stats : latency count bytes
stats - listen to store_notify, auth_get, etc and summarize per second, per hour, per day

run multiple servers, bring one down, bring up .. check all good, no interruptions

Multi-server-instance - several stores, several web_face, several providers
can split store server into store-write and store-read ,
so they can overlap on threads ie. less contention as read/write are not pumped thru 1 thread


logging - listen to store_notify, log to system file

notifies - socket.io updates in realtime ?

users - rego, login, auth tokens

email provider - get photos from email, make into a nice cascade of thumbnails, with tags/search

redis queue downtime/recover - kill q, restart .. check we didnt lose jobs, also automate restart

Author
----

(c) gordon anderson 2012
gord@lokenote.com
released under BSD + MIT open source licence

