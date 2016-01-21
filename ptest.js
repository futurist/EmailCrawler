//phantomjs module
var proc = require("child_process");
var sys = require("system");
var fs = require('fs');
var page = require("webpage").create();

var WHICH_MOUSE_BUTTON = {"0":"", "1":"left", "2":"middle", "3":"right"}


ws= new WebSocket('ws://localhost:8080');
ws.onopen = function (e) {
	ws.onmessage = function (message) {

	    var msg; try{ msg=JSON.parse(message.data) }catch(e){ msg=message.data }

	    switch(msg.type){

	      case 'broadcast':
	        if(msg.meta=='clientList'&&msg.data.indexOf('client')>-1 ) init();


	        break

	      // command from client.html
	      case 'command':
	      	  msg.result = eval( msg.data )
	          delete msg.data
	          msg.type = 'command_result'
	          ws._send( msg )

	      	break

	      // get callback from ws._call
		  case 'command_result':
			if(msg.__id){
				var cb = WS_CALLBACK[msg.__id]
				delete WS_CALLBACK[msg.__id]
				cb && cb(msg)
			}

          	break
	      case 'event_mouse':
	      	var e = msg.data
	      	e.type = e.type.replace('dbl', 'double')
	      	console.log(e.type, e.pageX, e.pageY, WHICH_MOUSE_BUTTON[e.which])
	      	page.sendEvent(e.type, e.pageX, e.pageY, WHICH_MOUSE_BUTTON[e.which] )

	      	break
	      default:
	        
	        break
	    }
	}
	ws.onclose = function (code, reason, bClean) {
		console.log("ws error: ", code, reason);
	}
	ws._send({type:'connection', meta:'server', name:'phantom'})
}
var WS_CALLBACK = {}
ws._send = function(msg){
  ws.send( typeof msg=='string' ? msg : JSON.stringify(msg) )
}
ws._call = function(msg, cb) {
  msg.__id = '_'+Date.now()+Math.random()
  WS_CALLBACK[msg.__id] = cb
  ws._send(msg)
}


page.zoomFactor = 1;
//page.clipRect = { top: 10, left: 0, width: 640, height: 490 };
page.viewportSize = { width: 1000, height: 610 };
page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
page.settings.resourceTimeout = 50000; // 5 seconds

page.onConsoleMessage=function(msg){
	ws._send( {type:'console_message', data:msg} )
}

var renderInter
function renderLoop(){
	renderInter=setTimeout(function(){
		ws._send( {type:'render', data: page.renderBase64('JPEG'), meta:{ size:page.viewportSize } } )
		renderLoop()
	}, 300)
}

function init(){
	var url = 'http://1111hui.com/github/m_drag/'
	// url = 'http://bing.com'
	page.open(url, function(status){	// success
		renderLoop()
	})
}
