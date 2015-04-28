
isWindows=true;

//phantomjs module
var proc = require("child_process");
var sys = require("system");
var fs = require('fs');
var server = require('webserver').create();
var page = require("webpage").create();

//nodejs module
var phprocess = require('phprocess');
process = phprocess;
var path = require('path');

//own module
var _purl = require('./modules/purl');
var _ = require('./modules/underscore');

var spawn = proc.spawn;
var execFile = proc.execFile;


function parseUrl( url ){
	var bare = url.split('#')[0].split('?')[0];
	var webpath = 'web/' ;
	var part = purl( url ) ;
	var port = part.attr("port")? ':'+part.attr("port") : "" ;
	var base = part.attr("protocol") + "://" + part.attr("host") + port ;
	var host = part.attr("host") + (part.attr("port")? '-'+part.attr("port") : "" ) ;
	var dir = part.attr('directory');
	var file = part.attr('file');
	if(file=='')file='index.html';
	var ext = file.match(/\.[^.]+$/);
	ext = ext? ext.pop() : "";
	var filename = ext ? file.replace(ext, "") : file;
	var path = part.attr('path');
	var query = part.attr('query');
	var param = paramToJson(part.attr('query'));
	var fragment = part.attr('fragment');

	var part2 = purl(page.url) ;
	var port2 = part2.attr("port")? ':'+part2.attr("port") : "" ;
	var base2 = part2.attr("protocol") + "://" + part2.attr("host") + port2 ;
	var host2 = part2.attr("host") + (part2.attr("port")? '-'+part2.attr("port") : "" ) ;
	var dir2 = part2.attr('directory');
	var file2 = part2.attr('file');
	var ext2 = file2.match(/\.[^.]+$/);
	ext2 = ext2? ext2.pop() : "";
	var path2 = part2.attr('path');
	var query2 = part2.attr('query');
	var fragment2 = part2.attr('fragment');
	var islocal = true;
	if( page.url!="about:blank" && url.indexOf( base2 )==-1 ) { 
		host = "_"+host;
		islocal = false;
	}
	host = webpath + host;
	host2 = webpath + host2;

	return {
			base:base,
			port:port,
			host:host,
			dir:dir,
				file:file,
				ext:ext,
				filename: filename,
				path:path,
				query:query,
				param:param,
				fragment:fragment,
				base2:base2,
				port2:port2,
				host2:host2,
				dir2:dir2,
				file2:file2,
				ext2:ext2,
				query2:query2,
				fragment2:fragment2,
				isLocal:islocal
	};

}


function paramToJson(str) {
    return str.split('&').reduce(function (params, param) {
        var paramSplit = param.split('=').map(function (value) {
            return decodeURIComponent(value.replace(/\+/g, ' '));
        });
        params[paramSplit[0]] = paramSplit[1];
        return params;
    }, {});
}

function crawlerPage(url){

	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';

	page.onConsoleMessage=function(data){
		console.log(data);
	}
	console.log( 234, parseUrl('http://www.baidu.com/s?q=234&t=23434').param.q ); return;


	page.onError = function(msg, trace) {

	  var msgStack = ['ERROR: ' + msg];

	  if (trace && trace.length) {
		msgStack.push('TRACE:');
		trace.forEach(function(t) {
		  msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
		});
	  }

	  console.error(msgStack.join('\n'));
	};


	page.onResourceError = function(resourceError) {
	  console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
	  console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
	};

	page.onResourceRequested = function(data, req) {
	  //req.abort();
	};
	
	var urlObj= parseUrl(url);
	var host = urlObj.base;


	var i=0;
	page.open(url, function(e){
		page.injectJs(  phantom.libraryPath + '/modules/zz.js'  );
		fs.write(i+".txt", page.plainText+"\n", 'w');

		var c = page.evaluate( function(host) {
			
			function __sameUrl(url1, url2){
				var a = url1.split('#')[0].split('?');
				var b = url2.split('#')[0].split('?');
				if(a.length>1 && b.length>1 && a.length==b.length){
					if(a[0]!=b[0]){
						return false;
					}

					var a1=a[1].split(/\=[^&]*&*/);
					var b1=b[1].split(/\=[^&]*&*/);
					for(var i=0; i<a1.length; i++){
						if(b1.indexOf(a1[i])==-1)return false; 
					}
					return true;
				}else{
					return false;
				}
			}
			function __validUrl(url){
				return url.indexOf(host)==0  ;
			}
			function __ZZgetUrl(theurl){
				console.log(theurl);
				ZZ.ajax({   type: 'GET',   url:theurl,  async:false, 
					success:function(data){
						ZZ(data).find('a').each(function(){
							if( ! __validUrl(this.href) ) return true;
							__ZZgetUrl( this.href );
						});
					},
					error: function(xhr, type, msg){
						console.log("error", type,msg);
					}
				});
			}


			ZZ('a').each(function(i,e) {
				if( ! __validUrl(this.href)  ) return true;
				__ZZgetUrl( this.href );
			});
			
		}, host );
	});

}

crawlerPage("http://cn.bing.com");