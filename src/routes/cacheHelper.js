var express = require('express');
var levelup = require('level')

// 1) Create our database, supply location and options.
//    This will create or open the underlying LevelDB store.
var db = levelup('./cachedb', { valueEncoding: 'json' })


var putKeyAsync = function(key, value )
{
    var item = {
        timestamp : new Date(),
        value : value
    }
    db.put(key, item, function (err) {
        if (err) return console.log('Ooops!', err) // some kind of I/O error
    });
}

var getKeyAsync = function(key)
{
    var pending = Promise.defer();
    db.get(key, function (err, value) {
        if (err) {
           console.log('Ooops!', err) // likely the key was not found
           pending.resolve(null);
           return;
        }
        // ta da!
        var ONE_HOUR = 60 * 60 * 1000; /* ms */
        var valueTimeStamp = new Date(value.timestamp);
        var expirationTime = new Date(valueTimeStamp.getTime() + ONE_HOUR)
        var currentTime = new Date();
        if(currentTime < expirationTime)
        {
            pending.resolve(value.value);
            return;
        }
        
        pending.resolve(null);    
  });  
    
  return pending.promise;
}

module.exports.putKeyAsync = putKeyAsync;
module.exports.getKeyAsync = getKeyAsync;