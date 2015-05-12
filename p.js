
setTimeout( function(){ console.log(111); }, 3000);

b= new WebSocket('ws://localhost:8080');
b.onopen = function (e) {
	b.onmessage = function (msg) {
		console.log(msg.data);
	}
	b.onclose = function (code, reason, bClean) {
		console.log("ws error: ", code, reason);
	}
}
//setTimeout( function(){ console.log(222); b.send("fiojwjefojwejf")}, 3000);


var system = require('system');

system.stdout.write('Hello, system.stdout.write!');
system.stdout.writeLine('\nHello, system.stdout.writeLine!');

system.stderr.write('Hello, system.stderr.write!');
system.stderr.writeLine('\nHello, system.stderr.writeLine!');

/*
system.stdout.writeLine('system.stdin.readLine(): ');
var line = system.stdin.readLine();
system.stdout.writeLine(JSON.stringify(line));

// This is essentially a `readAll`
system.stdout.writeLine('system.stdin.read(5): (ctrl+D to end)');
var input = system.stdin.read(5);
system.stdout.writeLine(JSON.stringify(input));

phantom.exit(0);
*/

