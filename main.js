
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


var _MSGSIGN = "PHANTOMDATA";
var RES_TIMEOUT = 3000;
var TRY_COUNT = 3;
var PageObjs = {};
var PageArray = [];
var PagePointer = 0;

var g_inter1 =setInterval(function(){
	console.log( _.where(PageObjs, {status:"open"}).length, PagePointer, "legth, pointer");
	if( PagePointer>=PageArray.length){
		if( _.where(PageObjs, {status:"open"} ).length==0 ){
			phantom.exit();	
		}
		return;
	}
	if( _.where(PageObjs, {status:"open"}).length<2 )
	{
		crawlerPage(PageArray[PagePointer++]);
	}

}, 100);





function crawlerPage(url){

	
	var urlObj= parseUrl(url);
	var host = urlObj.base;
	var filebase = host.split("//")[1].split("/")[0];

	PageObjs[url] = { status:"open", tryCount:0 };

	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
	page.settings.resourceTimeout = RES_TIMEOUT;

	page.viewportSize = { width:1000, height:800 };


	function EXIT(){
		PageObjs[url].status = "close";
		page.stop();
		page.close();
		if( !_.findWhere(PageObjs, { status:'open' }) ){
			//phantom.exit();
		}
	}

	page.onConsoleMessage=function(data){
		if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){
			var d = (data.split(_MSGSIGN)[1]);

			if(d=="EXIT()"){
				setTimeout(function(){ 
					EXIT();
				 }, 1000);
				return;
			}

			fs.write( filebase + "_email.txt", d+"\n\n", 'a');
		}else{
			console.log(data);
		}
	}


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

	page.onResourceRequested = function(data, req) {
		return;
		var header = {};
		_.each(data.headers, function(v){ header[v.name] = v.value; } );
		console.log(data.id, data.method, _.keys(header));
		if( header["X-Requested-With"] == "XMLHttpRequest" ) return;
	  	if(data.id>1) req.abort();
	};


	page.onResourceTimeout = function(request) {
	    console.log('Response (#' + request.id + '): ' + JSON.stringify(request));
	};

	page.onResourceError = function(resErr) {
		console.log('Unable to load resource (#' + resErr.id + 'URL:' + resErr.url + ')');
		console.log('Error code: ' + resErr.errorCode + '. Description: ' + resErr.errorString);
		//Error code: 99. Description: Connection timed out

		if(resErr.url==url){	//The main url, when timeout or error
			//page.stop();
			var t = PageObjs[url].tryCount++;
			if(t<TRY_COUNT){
				console.log(url, "Timeout, try: ", t);
				page.open(url);
			} else {
				EXIT();
			}	
		}
	};
	
	
	page.onLoadFinished = onLoadFinished;

	function onLoadFinished(status){

			if(status=="fail"){
				console.log(page.url, "----FAILED!!---------");
				return;
			}

			page.injectJs(  phantom.libraryPath + '/modules/zz.js'  );
			page.injectJs(  phantom.libraryPath + '/modules/underscore.js'  );

			fs.write( filebase + "_email.txt", "", 'w');
			fs.write( filebase + "_html.txt", page.content, 'w');
			page.render( filebase+".png");

			var c = page.evaluate( function(host, _MSGSIGN) {

	(function (){


		function matchAll(str, re) {
		  var m, matches = [];
		  while( m = str.match(re) ){
		  		matches.push(m);
		  		str=str.replace(re, "");
		  }
		  return matches.length ? matches : null;
		};

		function parseHTML(html, text, link){
			ParsedArray.push(link);
			function getEmail(){
				if(!html)return "";
				var emailRE = /\b(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))\b/igm;
		        var email = html.match(emailRE);
		        email = email ? _.uniq( email.map(function(v,i){ return ZZ.trim(v); }) ).join(";") : "";
				return email;
			}
			function getPhone(){
				if(!html)return "";
				var re =/\+?\(?[\+0-9. \n\(\)-]{3,8}\)?[0-9. \n\(\)-]{2,14}\d(?:\s*-\s*[0-9]+)?/ig;
		        var match = html.replace(/&nbsp;/ig," ").replace(/\n|<br>|<\/br>/ig,"").match(re);
		        phone = match ? _.uniq( match.filter( function(v,i){ v=ZZ.trim(v); var dot=v.match(/([\d]\.[\d])/ig); if(dot==null || dot.length>1) if( v.length>9 && /[\) \n-.]+/.test(v) && /^[+0\(\d]/.test(v) )  return true; }) ).join(";") : ""; //
				return phone;
			}
			function getFax(){
				if(!text)return "";
				var re =/fax[^\d+\(]*(\+?\(?[\+0-9. \n\(\)-]{3,8}\)?[0-9. \n\(\)-]{2,14}\d(?:\s*-\s*[0-9]+)?)/i;
		        var match = matchAll( text.replace(/\n/ig, " "), re);
		        var fax = match && match.length>0 ? _.pluck(match,1).join(";") : ""; //
				return fax;
			}
			function getAddress(){
				if(!text)return "";
				//var re =/(?:address|addr|add|location|office)[:,\-\s\n]*([\w\d-,.#\s]{9,}(?:CHINA|DUBAI))/mi;
				var re =/(?:address|addr|add|location|office)s*[:,\-\s]*([\w\d-,.#\s]{9,})/mi;
		        var match = matchAll( text.replace(/\n/ig, " "), re);
		        var addr = match && match.length>0 ? 
		        			_.pluck(match ,1).filter( function(v,i){  v=ZZ.trim(v); if( v.length>10 && /\d/.test(v) && /\w/.test(v) ) return true; }).join(";") 
		        			: ""; //
				return addr;
			}
			return getEmail() + ", phone: " + getPhone()+ ", fax: " + getFax()+ ", addr: " + getAddress();
		}




		function sameURL(url1, url2){
			if(url1==url2) return true;
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
			} else if( a.length!=b.length ){
				return false;
			} else if( a[0]==b[0] ){
				return true;
			}else{
				return false;
			}
		}

		function validURL(url){
			if( ! /^http/.test(url) ) return false;
			if( url.indexOf(host)==-1 ) return false  ;
			var valid = true;
			var i=0;
			//NOT VALID When it's same url    or    same structure url for 5 times
			LinkArray.some(function(v){
				if(v == url){
					valid = false;
					return true;
				}
				if( sameURL(v, url) ){
					i++;
					if(i>=SAME_COUNT) {
						valid = false;
						return true;
					}
				}
			});
			return valid;
		}

		var ROOT_URL = window.location.href;
		var MAX_LEVEL = 1;
		var SAME_COUNT = 20;
		var LinkQueue={};
		var LinkArray=[];
		var ParsedArray=[];

		function getDepth(parent){
			var p = parent , level=0;
			while( p = LinkQueue[p].parent ){
				level++;
			}
			return level;
		}

		function checkComplete(){
			console.log( host, "pending links: ", LinkArray.length - ParsedArray.length );
			if( LinkArray.length == ParsedArray.length ){
				console.log(host, "********************** done!!!!!! **************");
				console.log(_MSGSIGN+'EXIT()');
			}
		}

		function getURL(theurl, parent){


			if( ! validURL(theurl)  ) {
				return false;
			}
			if( getDepth(parent) >= MAX_LEVEL) return false;

			console.log( theurl, ParsedArray.length, parent, getDepth(parent) );

			LinkArray.push(theurl);
			LinkQueue[theurl] = {urls: [], parent:parent};

			setTimeout( function(){
				ZZ.ajax({
					type: 'GET',   
					url: theurl, 
					async: true, 
					success: function(data){
						var dom = ZZ( '<div></div>' );
						dom.html(data);
						
						console.log(_MSGSIGN + "url: "+ theurl + "\n, title: " + ZZ("title", dom).text() + "\n\n, email: " + parseHTML( data, ZZ("body", dom).text(), theurl ) );

						ZZ("a", dom).each(function(){
							LinkQueue[theurl].urls.push(this.href);
							getURL( this.href, theurl );
						});

					},
					error: function(xhr, type, msg){
						ParsedArray.push(theurl);
						console.log("error", type,msg);
					},
					complete: function(xhr, status){
						checkComplete();
						console.log("complete", status);
					}
				});
			}, (LinkArray.length-2)*1000);
		}

		
		LinkArray.push(ROOT_URL);
		LinkQueue[ROOT_URL] = {urls: [], parent:null};

		var pageHtml = ZZ('body').html();
		var dom = ZZ( '<div></div>' );
		dom.html( pageHtml.replace(/<br>|<br\s*\/>/ig, "&nbsp;") );
		ZZ('script,style', dom).remove();
		var pageText = ZZ(dom).text();

		console.log(_MSGSIGN, "email: ", parseHTML( pageHtml, pageText, window.location.href ) );

		if(ZZ('a').size()==0){
			checkComplete();
			return;
		}

		ZZ('a').each(function(){ 

			LinkQueue[ROOT_URL].urls.push(this.href);

			getURL( this.href, ROOT_URL);
		});	
		
		checkComplete();

		
	})();
				
			}, host, _MSGSIGN );
	}


	page.open(url);

}

function addPage(url){
	//if( PageArray.indexOf(url)>-1 )return;
	PageArray.push(url);
}


addPage("http://cn.bing.com");

addPage('http://www.topvaluefabrics.com/about-us.html');

addPage('http://www.topvaluefabrics.com/activewear-outerwear-fabrics.html');
addPage("http://www.topvaluefabrics.com/our-locations.html");
addPage("http://www.topvaluefabrics.com/");

addPage("http://www.unitedasia.com.cn/");

