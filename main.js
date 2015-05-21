
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
var ws;

if( sys.args.indexOf('nows')>-1 ){

	setTimeout(init, 500);

}else{

	ws = new WebSocket('ws://localhost:81');
	ws.onopen = function (e) {
		ws.onmessage = function (msg) {
			console.log(msg.data);
		}
		ws.onclose = function (code, reason, bClean) {
			console.log("ws error: ", code, reason);
			phantom.exit();
		}
		init();
	}

}

function wsend(json, callback){
	if(ws){
		ws.send(JSON.stringify(json));
	}else{
		console.log(_DBSIGN, JSON.stringify(json) );
	}
}

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

var DATA_FOLDER = "DATA";	// the folder name to save txt and jpg
var _MSGSIGN = "_PHANTOMDATA";	
var _DBSIGN = "_MONGODATA";	
var MAX_LINK = 10;	// max number of pages to crawl, after this, no new page add.
var RES_TIMEOUT = 10*3000;	//10 sec
var PAGE_TIMEOUT = 1*60*1000;	//1 min
var TRY_COUNT = 3;
var PageObjs = {};
var PageArray = [];
var PagePointer = 0;

function ticker(){
	var g_inter1 =setInterval(function(){
		if(PageArray.length==0)return;

		var openPage = _.where(PageObjs, {status:"open"});

		openPage = _.filter(openPage, function (v) {
			var timeout = (new Date() - v.startTime);
			if(timeout < PAGE_TIMEOUT){
				return true;
			}else{
				v.page.evaluate(function () {
					__PAGECLOSED=true;
				});
				console.log("##### timeout ####",v.url );
				v.status='close';
				v.page.stop();
				v.page.close();
			}
		});
	
		if( PagePointer>=PageArray.length){
			if(PagePointer>0 && openPage.length==0 ){
				phantom.exit();	
			}
			return;
		}
		if( openPage.length<2 )
		{
			var p = PageArray[PagePointer++];
			crawlerPage( p.url, p.config );
			console.log( "pointer", PagePointer,  openPage.map(function(v,i){ return v.url }) );
		}

	}, 1000);
}
ticker();


function crawlerPage(url, config) {

	if( PageObjs[url] ) return;

	var urlObj= parseUrl(url);
	var host = urlObj.base;
	var domain = host.split("//")[1].split("/")[0];
	var filebase = DATA_FOLDER + "/" + domain;
	var DateSign;

	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
	page.settings.resourceTimeout = RES_TIMEOUT;

	page.viewportSize = { width:1000, height:800 };

	PageObjs[url] = { status:"open", url:url, tryCount:0, startTime: new Date(), page:page };

	function EXIT(){
		if(DateSign) wsend({ type:"page_close", date:DateSign, url: url });
		PageObjs[url].status = "close";
		page.stop();
		page.close();
		if( !_.findWhere(PageObjs, { status:'open' }) ){
			//phantom.exit();
		}
	}

	function renderPage (filepath) {
		page.evaluate(function() {
			var head = document.querySelector('head');
			  style = document.createElement('style');
			  text = document.createTextNode('body { background: #fff }');
			style.setAttribute('type', 'text/css');
			style.appendChild(text);
			head.insertBefore(style, head.firstChild);
		});
		page.render( DATA_FOLDER + "/" + filepath+".jpg", {format:'jpeg', quality:'80' });
	}

	page.onConsoleMessage=function(data){
		if( ( new RegExp ("^"+_DBSIGN) ).test(data) ){
			var d = JSON.parse(data.split(_DBSIGN)[1]);
			wsend(d);
		}

		if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){

			var d = JSON.parse(data.split(_MSGSIGN)[1]);

			if(d.cmd=="contactData"){
				// console.log(d.url);
				// console.log(d.title);
				// console.log(d.contact);
				fs.write( filebase + "_email.txt", JSON.stringify(d) +"\n\n", 'a');
			}
			if(d.cmd=="EXIT") {
				setTimeout(function(){ 
					EXIT();
				 }, 1000);
				return;
			}

		}else{
			console.log(data);		
		}
	}


	page.onResourceRequested = function(data, req) {
		return;
		var header = {};
		_.each(data.headers, function(v){ header[v.name] = v.value; } );
		console.log(data.id, data.method, _.keys(header));
		if( header["X-Requested-With"] == "XMLHttpRequest" ) return;
	  	if(data.id>1) req.abort();
	};


	page.onResourceTimeout = function(request) {
	    //console.log('Response (#' + request.id + '): ' + JSON.stringify(request));
	};

	page.onResourceError = function(resErr) {
		if( /Operation canceled/i.test(resErr.errorString) ) return;
		console.log('Unable to load resource (#' + resErr.id + 'URL:' + resErr.url + ')');
		console.log('Error code: ' + resErr.errorCode + '. Description: ' + resErr.errorString);
		//Error code: 99. Description: Connection timed out

		if(resErr.url==url){	//The main url, when timeout or error
			
		}
	};
	

	page.onLoadFinished = onLoadFinished;

	function onLoadFinished(status){

			if(status=="fail"){
				console.log(page.url, "----FAILED!!---------");
				
				page.stop();
				var t = PageObjs[url].tryCount++;
				if(t<TRY_COUNT){
					console.log(url, "Timeout, try: ", t);
					page.open(url);
				} else {
					EXIT();
				}	

				return;
			}

			page.injectJs(  phantom.libraryPath + '/modules/zz.js'  );
			page.injectJs(  phantom.libraryPath + '/modules/underscore.js'  );

			fs.write( filebase + "_email.txt", "", 'w');
			fs.write( filebase + "_html.txt", page.content, 'w');


			DateSign = +new Date();

			var snapName = domain + "_" + DateSign;
			renderPage( snapName );

			DateSign += Math.random();


			var c = page.evaluate( function(host, HTML, snapName, config, DateSign, _MSGSIGN, _DBSIGN) {

	__PAGECLOSED = false;

	(function (){
		function sendMSG(json){
			console.log(_MSGSIGN, JSON.stringify(json));
		}
		function DB_MSG(json){
			console.log(_DBSIGN, JSON.stringify(json));
		}
		

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
				if(!text)return "";
				var re =/\+?\(?[\+0-9. \n\(\)-]{3,8}\)?[0-9. \n\(\)-]{2,14}\d(?:\s*-\s*[0-9]+)?/gi;
				var searchStr = text.replace(/\n/ig, " ").replace(/\xa0/ig,' ').replace(/\s+/g,' ');
				//var searchStr = html.replace(/&nbsp;/ig," ").replace(/\n|<br\s*>|<br\s*\/>/ig,"");
		        var matchA = [];

				var lastPos = 0;				
				while ( match=re.exec(searchStr) ) {
				  var v= match[0];
				  v = ZZ.trim(v); var dot=v.match(/([\d]\.[\d])/ig); 
				  
				  var pos=match.index;

				  if( pos>0 && searchStr[pos-1].match(/[\d\w]/i) ) continue;
				  //if( ! searchStr.substring(lastPos, pos).match(/phone|contact|reach|number|mobile|link|talk|touch|电话|手机|联系|我们/i) ) continue;
				  lastPos = re.lastIndex;

  				  if( /^(19|20)\d{2}[^d]|[^\d](19|20)\d{2}$|[^\d](19|20)\d{2}[^\d]/.test(v) ) continue;

				  var m=v.match(/\d+/g);
				  if(  
				  	m.filter(function(v){ return v.length<4 }).length>2 || 
				  	m.filter(function(v,i){ return v.length<3 && i>1 && i<m.length } ).length>0 ||
				  	( dot && dot.length>1 && v.match(/-/) )
				  ) continue;

				  if(dot==null || dot.length>1)
				  	if( v.length>9 && /[\) \n-.]+/.test(v) && /^[+0\(\d]/.test(v) && !/[^\d]+\d{1,2}-\d{1,2}$/.test(v) ){
				  		matchA.push(v);
				  	}
				}

		        phone = matchA.length ? _.uniq( matchA ).join(";") : ""; //
				return phone;
			}
			function getFax(){
				if(!text)return "";
				var re =/\+?\(?[\+0-9. \n\(\)-]{3,8}\)?[0-9. \n\(\)-]{2,14}\d(?:\s*-\s*[0-9]+)?/gi;
				
				var searchStr = text.replace(/\n/ig, " ").replace(/\xa0/ig,' ').replace(/\s+/g,' ');
		        var matchA = [];
				
				var lastPos = 0;
				while ( match=re.exec(searchStr) ) {
				  var v= match[0];
				  v = ZZ.trim(v); var dot=v.match(/([\d]\.[\d])/ig); 

				  var pos=match.index;

				  if( pos>0 && searchStr[pos-1].match(/[\d\w]/i) ) continue;
				  if( ! searchStr.substring(lastPos, pos).match(/fax|传真/i) ) continue;
				  lastPos = re.lastIndex;
				  
  				  if( /^(19|20)\d{2}[^d]|[^\d](19|20)\d{2}$|[^\d](19|20)\d{2}[^\d]/.test(v) ) continue;

				  var m=v.match(/\d+/g);
				  if(  
				  	m.filter(function(v){ return v.length<4 }).length>2 || 
				  	m.filter(function(v,i){ return v.length<3 && i>1 && i<m.length } ).length>0 ||
				  	( dot && dot.length>1 && v.match(/-/) )
				  ) continue;

				  if(dot==null || dot.length>1)
				  	if( v.length>9 && /[\) \n-.]+/.test(v) && /^[+0\(\d]/.test(v) && !/\d{2,4}-\d{1,2}-\d{1,2}/.test(v) ){
				  		matchA.push(v.replace(/\xa0/g, '').replace(/\s+/g,'') );
				  	}
				}

		        fax = matchA.length ? _.uniq( matchA ).join(";") : ""; //
				return fax;
			}
			function getAddress(){
				if(!text)return "";
				//var re =/(?:address|addr|add|location|office)[:,\-\s\n]*([\w\d-,.#\s]{9,}(?:CHINA|DUBAI))/mi;
				var re =/(?:address|addr|add|location|office)s*[:,\-\s]*([\w\d-,.#\s]{9,},\s*\w+)/gi;
		        var match = matchAll( text.replace(/\n/ig, " "), re);
		        var addr = match && match.length>0 ? 
		        			_.pluck(match ,1).filter( function(v,i){  v=ZZ.trim(v); if( v.length>10 && /\d/.test(v) && /\w/.test(v) ) return true; }).join(";") 
		        			: ""; //
				return addr;
			}
			function getAddress2(){
				if(!text)return "";
				//var re =/(?:address|addr|add|location|office)[:,\-\s\n]*([\w\d-,.#\s]{9,}(?:CHINA|DUBAI))/mi;
				var re =/(?:address|addr|add|location|office)s*[:,\-\s]*([\w\d-,.#\s]{9,},\s*\w+)/gi;

				var searchStr = text.replace(/\n/ig, " ").replace(/\xa0/ig,' ').replace(/\s+/g,' ');
		        var matchA = [];
				
				var lastPos = 0;
				while ( match=re.exec(searchStr) ) {
				  var v= match[0];
				  var pos=match.index;

				  lastPos = re.lastIndex;
				  v=ZZ.trim(v); 
				  if( v.length>10 && /\d/.test(v) && /\w/.test(v) ) {
				  		matchA.push( v.replace(/\xa0/ig,' ').replace(/\s+/g,' ') );
				  }
				}

	  		    var addr = matchA.length ? _.uniq( matchA ).join(";") : ""; //
	  		     
				return addr;
			}
			//return "email: " + getEmail() + ", phone: " + getPhone()+ ", fax: " + getFax()+ ", addr: " + getAddress();
			return {email: getEmail(), phone:getPhone(), fax:getFax(), addr:getAddress2() }
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
		var MAX_LEVEL = 1;	// max level of page to crawl
		var SAME_COUNT = 20; // same structure URL
		var MAX_HREF = 99; // skip the max link of page, and continue

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
				sendMSG( {cmd:"EXIT"} );
			}
		}

		function getURL(theurl, parent){


			if( ! validURL(theurl) || __PAGECLOSED  ) {
				return false;
			}
			if( getDepth(parent) >= MAX_LEVEL) return false;

			//console.log( theurl, ParsedArray.length, parent, getDepth(parent) );

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
						
						var tdom = ZZ( '<div></div>' );
						tdom.html( data.replace(/<br\s*>|<br\s*\/>/ig, "&nbsp;") );
						ZZ('script,style,object,embed', tdom).remove();
						ZZ('body *', tdom).append('&nbsp;');
						var pageText = ZZ(tdom).text();

						DB_MSG(
						{
							type:"sub_page",
							data:
								{
									"url": theurl,
									"title": ZZ("title", dom).text(),
									"numLink": ZZ("a", dom).size(),
									//"html": data,
									//"text": pageText,
									"contact": parseHTML( ZZ(tdom).html(), ZZ("body", dom).text(), theurl ),
									"dateSign": DateSign,
									"date": +new Date()+Math.random()
								}
						});

						if( ZZ("a", dom).size() > MAX_HREF ){
							ZZ("a", dom).each(function(){
								LinkQueue[theurl].urls.push(this.href);
								getURL( this.href, theurl );
							});
						}

						checkComplete();

					},
					error: function(xhr, type, msg){
						ParsedArray.push(theurl);
						console.log("error", type,msg);
						checkComplete();
					},
					complete: function(xhr, status){
						console.log("complete", status);
					}
				});
			}, (LinkArray.length-2)*1000);
		}

		
		LinkArray.push(ROOT_URL);
		LinkQueue[ROOT_URL] = {urls: [], parent:null};

		var pageHtml = ZZ('body').html();

		var dom = ZZ( '<div></div>' );
		dom.html( pageHtml.replace(/<br\s*>|<br\s*\/>/ig, "&nbsp;") );
		ZZ('script,style,object,embed', dom).remove();
		ZZ('body *', dom).append('&nbsp;');
		var pageText = ZZ(dom).text();

		var contact = parseHTML( ZZ(dom).html(), pageText, window.location.href );

		DB_MSG(
		{
			type:"main_page",
			data:
			{
				"idx": config.idx,
				"url": ROOT_URL,
				"title": document.title,
				"numLink": ZZ('a').size(), 
				"snap": snapName+".jpg",
				//"html": pageHtml,
				//"text": pageText,
				"contact": contact,
				"dateSign": config.date,
				"date": DateSign
			}
		});


		if(!pageHtml || ZZ('a').size()==0 || ZZ('a').size()>MAX_HREF ){
			checkComplete();
			return;
		}


		ZZ('a').each(function(){ 

			LinkQueue[ROOT_URL].urls.push(this.href);

			getURL( this.href, ROOT_URL);
		});	
		
		checkComplete();

		
	})();
				
			}, host, page.content, snapName, config, DateSign, _MSGSIGN, _DBSIGN );
	}


	page.open(url);

}

function addPage(url, config){
	if( PageArray.length > MAX_LINK) return;
	if( _.findWhere( PageArray, {url:url} ) ) return;
	PageArray.push({ url: url, config: config||"" } );
}



function getSearchResult( CONFIG, keyword ){

	var url= keyword ? CONFIG.url.replace(/%s/g, encodeURIComponent(keyword)) : CONFIG.url ;
	CONFIG.url = url;

	var urlObj= parseUrl(url);
	var host = urlObj.base;
	var filebase = DATA_FOLDER + "/" + host.split("//")[1].split("/")[0]+'_'+urlObj.query;

	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
	page.settings.resourceTimeout = 150000;
	page.viewportSize = { width:1000, height:800 };

	CONFIG.date = +new Date()+Math.random();

	page.onResourceRequested = function(data, req) {
	    //console.log('Request (*' + data.id + '): ', data.method, data.url);
	};


	page.onResourceTimeout = function(request) {
	    console.log('Response (#' + request.id + '): ' + JSON.stringify(request));
	};

	page.onResourceError = function(resErr) {
		if( /Operation canceled/i.test(resErr.errorString) ) return;
		console.log('Unable to load resource (#' + resErr.id + 'URL:' + resErr.url + ')');
		console.log('Error code: ' + resErr.errorCode + '. Description: ' + resErr.errorString);
		//Error code: 99. Description: Connection timed out
	};
	


	page.onConsoleMessage=function(data){
		if( ( new RegExp ("^"+_DBSIGN) ).test(data) ){
			var d = JSON.parse(data.split(_DBSIGN)[1]);
			wsend(d);
			return;
		}

		if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){
			var d = JSON.parse(data.split(_MSGSIGN)[1]);

			if(d.cmd=='hrefData'){
				console.log(d.data);
				console.log(d.next);

				d.data.forEach(function(v,i){
					CONFIG.idx = i;
					addPage(v, CONFIG);
				});

				if( !d.next || PageArray.length > MAX_LINK) return;

				CONFIG.url = d.next;
				CONFIG.page++;
				
				setTimeout(function () {
					getSearchResult(CONFIG, keyword);
				}, 1000 );

				fs.write( filebase + "_result.txt", d.data +"\n\n", 'a');
			}
			if(d.cmd=='exit'){
				console.log("href got, page stop");
				page.stop();
				page.close();
			}
			

		}else{
			console.log(data);
		}
	}

	page.onLoadFinished =  function(status){

		if(status=='fail'){
			setTimeout( function(){
				page.open(url);
			},1000);
			return;
		}


		var c = page.evaluate( function(CONFIG, _MSGSIGN, _DBSIGN) {

			(function (){

			var inter1, failedCount=0;
			function trim(str){
				return str.replace(/^\s+|\s+$/g, "");
			}
			function wait(condition, passfunc, failfunc){
			    var _inter = setInterval(function(){
			        if( eval(condition) ){
			            clearInterval(_inter);
			            passfunc.call();
			        }else{
			            if(failfunc) failfunc.call();
			        }
			    },300);
			    return _inter;
			}

			function waitForContent(  ) {
			    clearInterval(inter1);

			    inter1 = wait( CONFIG.condition,  getResult, function(){
			        return;
			        failedCount++; 
			        if(failedCount>100 ){  // && $(".med.card-section").size()==0
			            clearInterval(inter1);
			            window.location.reload();
			        }
			    });
			}

			function sendMSG(json){
				console.log(_MSGSIGN, JSON.stringify(json));
			}
			function DB_MSG(json){
				console.log(_DBSIGN, JSON.stringify(json));
			}

			function getResult(){
				var items = document.querySelectorAll( CONFIG.item );
				var jsonA = [];

				for(var i=0; i<items.length; i++){
					var v=items[i];
					var href = v.querySelector(CONFIG.href).href;
					var title = v.querySelector(CONFIG.title).innerHTML;
					var desc = v.querySelector(CONFIG.desc).innerHTML;
					var date = v.querySelector('.b_attribution').lastChild;
					date = date.nodeType==3 ? trim(date.textContent) : "";
					jsonA.push( {
						"href": href,
						"title": encodeURIComponent(title),
						"desc": encodeURIComponent(desc),
						"date": date,
						domain:'',
						company: '',
						email:'',
						phone:'',
						fax:'',
						address:'',
						age:'',
						prestige:'',
						location:'',
					});
				};
				var hrefData = Array.prototype.map.call(jsonA, function(a, i) { return a.href  });
				var n = document.querySelector(CONFIG.next);
				
				DB_MSG( {type:"search_result", config: CONFIG, result: jsonA } );
				sendMSG({cmd:"hrefData", data:hrefData, next: n? n.href : ""  } );
				sendMSG({cmd:"exit"});
			}

			waitForContent();


			})();

	}, CONFIG, _MSGSIGN, _DBSIGN);

	};
	//end of onLoadFinished

	page.open(url);
}
//end of getSearchResult


var SearchConfig = [
	{
		name:"Bing Global", 
		url: 'http://global.bing.com/search?q=%s&setmkt=en-us&setlang=en-us',
		condition: 'document.querySelectorAll("#b_results li.b_algo").length>1 ',
		item: '#b_results li.b_algo',
		href: 'h2>a',
		title: 'h2>a',
		desc: '.b_caption p',
		page: 0,
		next: '#b_results .b_pag nav li:last-child a'
	},
	{
		name:"Bing CN", 
		url: 'http://cn.bing.com/search?q=%s',
		condition: 'document.querySelectorAll("#b_results li.b_algo").length>1 ',
		item: '#b_results li.b_algo',
		href: 'h2>a',
		title: 'h2>a',
		desc: '.b_caption p',
		page: 0,
		next: '#b_results .b_pag nav li:last-child a'
	},

	{
		name:"Google Global", 
		url: 'https://www.google.com/search?q=%s&qscrl=1&ncr&hl=en',
		condition: 'document.querySelectorAll("li.g h3.r") && document.querySelectorAll("li.g h3.r").length>1 && document.querySelectorAll("li.g h3.r a.passed").length==0 ',
		result: 'li.g h3.r a',
		page: 0,
		next: '#pnnext'
	}
]


function init () {
	getSearchResult( SearchConfig[1], "杉杉" );
}


/*
addPage("http://cn.bing.com");

addPage('http://www.topvaluefabrics.com/about-us.html');

addPage('http://www.topvaluefabrics.com/activewear-outerwear-fabrics.html');
addPage("http://www.topvaluefabrics.com/our-locations.html");
addPage("http://www.topvaluefabrics.com/");

addPage("http://www.unitedasia.com.cn/");
*/

