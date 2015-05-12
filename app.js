
var spawn = require('child_process').spawn;
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');


/******** DB part ***********/
// Connection URL
var url = 'mongodb://1111hui.com:27017/test';
var db = null;
MongoClient.connect(url, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  db = _db;
  return true;
});


var insertDocuments = function(callback) {
  assert.notEqual(null, db, "Mongodb not connected. ");
  // Get the documents collection
  var collection = db.collection('test23');
  // Insert some documents
  collection.insert([
    {a : 1}, {a : 2}, {a : 3}
  ], function(err, result) {
    assert.equal(err, null);
    assert.equal(3, result.result.n);
    assert.equal(3, result.ops.length);
    console.log("Inserted 3 documents into the document collection");
    callback(result);
  });
}

/********* WebSocket Part ************/
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('close', function incoming(code, message) {
    console.log("WS close: ", code, message);
    console.log("now close");
    process.exit(1);
  });
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});




var _MSGSIGN = "_PHANTOMDATA";  

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

    insertDocuments();

    if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){
      var d = JSON.parse(data.split(_MSGSIGN)[1]);

      if(d.cmd=="contactData"){
        _log(d.url, d.title, d.contact);
        insertDocuments(d);
      }
      if(d.cmd=="EXIT"){
        return;
      }

    }else{
      _log(data);
    }

  });

  proc.stderr.on('data', function (data) {
    _logErr(data);
  });

  proc.on('close', function (code) {
    console.log('app exited with code ' + code);
  });

  proc.on("error", function (e) {
    console.log(e);
    process.exit(1);
  });

}

runCmd("phantomjs main.js");


