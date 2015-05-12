var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://1111hui.com:27017/test';
// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  //assert.equal(null, err);
  console.log("Connected correctly to server");

  if(!err) db.close();
});






var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('close', function incoming(code, message) {
    console.log("WS close: ", code, message);
    process.exit(1);
  });
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});




console.log(__dirname);
var spawn=require("child_process").spawn;
var stream = require("stream");
var ls = spawn("phantomjs", ["p.js"], {pwd:__dirname, stdio: "pipe" });

ls.stdout.setEncoding("utf8");
ls.stderr.setEncoding("utf8");

// ls.stdin.write("sodifjosdjfoosdj\n");
// ls.stdin.cork();
// ls.stdin.write("sodifjosdjfoosdj");
// ls.stdin.write("sodifjosdjfoosdj");
// ls.stdin.end("jsdiofo");

var s=new stream.Readable();
s.setEncoding("utf8");
s._read=function(){}
//s.pipe(ls.stdin);
s.push("sdijfo搏说jsdof\n");
s.push("fwefwefwef\n");
s.push(null);



ls.stdout.on("data",function (data) {
	console.log(data);
})

ls.stderr.on("data",function (data) {
	console.log(data);
})

ls.on("close", function (code) {
	console.log(code)
})
ls.on("error", function (code) {
	console.log(code);
	process.exit(1);
})


/*
ls.send({a:"sdoifjosjof"});
ls.send({a:"sdoifjosjof"});
ls.send({a:"sdoifjosjof"});
ls.send({a:"sdoifjosjof"});
ls.send({a:"sdoifjosjof"});
ls.send("sdoifjosjof");
ls.send("sdoifjosjof");
ls.send("sdoifjosjof");
ls.send("sdoifjosjof");

setInterval(function(){  ls.send({a:"sdoifjosjof"}); }, 300);
setTimeout(function(){ ls.send({a:"sdoifjosjof"}); }, 8000);
*/
