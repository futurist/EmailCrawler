
var spawn = require('child_process').spawn;
var MongoClient = require('mongodb').MongoClient;
var _ = require('underscore');
var assert = require('assert');


/******** DB part ***********/
// Connection URL
var url = 'mongodb://1111hui.com:27017/test';
var db = null;
MongoClient.connect(url, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  db = _db;
  runCmd("phantomjs19 main.js");
  return true;
});


var insertDoc = function(data, callback) {
  assert.notEqual(null, db, "Mongodb not connected. ");
  var col = db.collection('test30');
  switch(data.type){
    case 'search_result':
      col.insert(data, function(err, result) {
        //console.log( "inserted:", data , "\n");
        if(callback) callback({});
      });
      break;
    case 'main_page':
      col.insert(data.data, function(err, result) {
        console.log( "inserted:", data , "\n");
        if(callback) callback({});
      });
      break;
    case 'sub_page':
      var dateSign = data.data.dateSign;
      delete data.data.dateSign;
      col.update({ date:dateSign }, { $push:{ child: data.data } }, function(err, result) {
        console.log( "inserted:", data , "\n");
        if(callback) callback({});
      });
      break;
    case 'page_exist':

      col.findOne( {url:data.url, closed:true, date:{$gt: +new Date() - data.withinDay*24*60*60*1000 }}, {sort:[['_id', -1]] },  function(err, result) {
        delete result._id;
        result.idx = data.idx;
        result.dateSign = data.dateSign;
        col.insert( result, function(err){
          console.log("using recent item:", result.date, result.url);
        } )
        if(callback) callback(result);
      } );

      return;
      col.find({url:data.url}).toArray(function  (err, docs) {
        //console.log(err, docs);
        var docs = _.filter( docs, function(v){ return (+new Date()-v.date)/1000/60/60/24 < data.withinDay } );
        if(callback) callback({count: docs.length});
      });
      break;
    case 'page_close':
      col.update({ date:data.date }, { $set:{ closed:true } }, function(err, result) {
        console.log( "closed:", data.url , "\n");
        if(callback) callback({});
      });
      break;
    case 'check_keyword':
      col.insert( meta, function(err){} );
      var keywords = data.meta.keywords;
      keywords.forEach( function  (v) {
        
      } );
      break;
  }
}

/********* WebSocket Part ************/
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 81 });

wss.on('connection', function connection(ws) {
  ws.on('close', function incoming(code, message) {
    console.log("WS close: ", code, message);
    console.log("now close all process");
    if(db) db.close();
    process.exit(1);
  });
  ws.on('message', function incoming(data) {
    //console.log('received: %s', data);
    var msg = JSON.parse(data);
    var msgid = msg.msgid;
    delete msg.msgid;

    if(msg.type!='search_result') console.log(msgid, msg);

    var cb = msgid? function  (retJson) {
      ws.send(JSON.stringify( {msgid:msgid, result:retJson} ) );
    } : null;

    insertDoc( msg, cb );
  });

  ws.send('connected to ws');
});




var _DBSIGN = "_MONGODATA";  

function _log () {
  for(var i=0; i<arguments.length; i++)
    process.stdout.write(arguments[i].toString());
}
function _logErr () {
  for(var i=0; i<arguments.length; i++)
    process.stderr.write(arguments[i]);
}


function runCmd (cmd, dir, callback) {

  var args = cmd.split(" ");
  var command = args[0];

  args.shift();

  var proc = spawn(command,   ["--config", "config"].concat(args), {
    cwd: (dir?dir:__dirname),
    stdio: "pipe"
  });

  proc.stdout.on('data', function (data) {

      _log(data);
      return;
      
      if( data && ( new RegExp ("^"+_DBSIGN) ).test(data) ) {

      var d = JSON.parse(data.split(_DBSIGN)[1]);

      if(d.cmd=="contactData"){
        _log(d.url, d.title, d.contact);
      }
      if(d.cmd=="EXIT"){
        return;
      }

    }else{
      //_log(data);
    }

  });

  proc.stderr.on('data', function (data) { 
    //_logErr(data);
  });

  proc.on('close', function (code) {
    if(db) db.close();
    console.log('app exited with code ' + code);
  });

  proc.on("error", function (e) {
    console.log(e);
    process.exit(1);
  });

}



