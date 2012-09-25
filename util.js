var mersenne    = require('mersenne');
var crypto      = require('crypto');

mersenne.seed( (new Date()).getTime()*23.311467292 + Math.random() );

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function suniq()
{   
    var alpha="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var l = alpha.length;
    
    var u="";
    for (var i=0;i<8;i++)
    {   
        var c = mersenne.rand(l);
        u += alpha[c];
    }   
        
    return u;
} 

function formatDate(date, fmt) 
{
    function pad(value) {
        return (value.toString().length < 2) ? '0' + value : value;
    }
    return fmt.replace(/%([a-zA-Z])/g, function (_, fmtCode) {
        switch (fmtCode) {
        case 'Y':
            return date.getUTCFullYear();
        case 'M':
            return pad(date.getUTCMonth() + 1);
        case 'd':
            return pad(date.getUTCDate());
        case 'H':
            return pad(date.getUTCHours());
        case 'm':
            return pad(date.getUTCMinutes());
        case 's':
            return pad(date.getUTCSeconds());
        default:
            throw new Error('Unsupported format code: ' + fmtCode);
        }
    });
}

function timestamp()
{
    var dt = new Date();
    return formatDate(dt, '%Y%M%d.%H%m%s');
}

///

exports.suniq = suniq;
exports.timestamp = timestamp;
