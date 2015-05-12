
var fs = require('fs');
var Stream = require("stream");
var stream = new Stream();


var s=new Stream.Readable();
s.setEncoding("utf8");
s.push("sdijfo搏说jsdof\n");
s.push("fwefwefwef\n");
s.push(null);

s.on('data', function(d){console.log(d); })


var s2 = Stream.PassThrough();
//s2.setEncoding("utf8");
s2.write("s说说dfijsoidjf\n");
s2.write("sdfijsoidjf\n");
s2.end();


var spawn = require('child_process').spawn;
var ls = spawn('phantomjs',['p.js'], { stdio:['pipe', 'pipe'] } );
ls.stdout.setEncoding("utf8");
ls.stdout.on('data', function(d){
	console.log(d);
});

//ls.stdin.write("jfowiejiofjoi");
//ls.stdin.end();

//s.pipe( ls.stdin );

var Readable = require('stream').Readable;
var rs = Readable();
rs.setEncoding("utf8");
var strA=["skadjflkajs\n", "23942394"];
rs._read = function () {
    rs.push( strA.shift() );
    if ( strA.length==0 ) rs.push(null);
};
console.log( rs.isPaused() );
rs.on('data', function(d){console.log(d); })

rs.pause();

rs.pipe(ls.stdin);


