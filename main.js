
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

var DATA_FOLDER = "DATA";	// the folder name to save txt and jpg
var _MSGSIGN = "_PHANTOMDATA";	
var MAX_LINK = 10;	// max number of pages to crawl, after this, no new page add.
var RES_TIMEOUT = 10*1000;	//10 sec
var PAGE_TIMEOUT = 0.5*60*1000;	//180 sec
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

		console.log( "pointer", PagePointer,  openPage.map(function(v,i){ return v.url }) );
		
		if( PagePointer>=PageArray.length){
			if(PagePointer>0 && openPage.length==0 ){
				phantom.exit();	
			}
			return;
		}
		if( openPage.length<2 )
		{
			crawlerPage( PageArray[PagePointer++].url );
		}

	}, 1000);
}
ticker();


function crawlerPage(url) {

	if( PageObjs[url] ) return;

	var urlObj= parseUrl(url);
	var host = urlObj.base;
	var filebase = DATA_FOLDER + "/" + host.split("//")[1].split("/")[0];


	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
	page.settings.resourceTimeout = RES_TIMEOUT;

	page.viewportSize = { width:1000, height:800 };

	PageObjs[url] = { status:"open", url:url, tryCount:0, startTime: new Date(), page:page };


	function EXIT(){
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
		page.render( filepath+".jpg", {format:'jpeg', quality:'80' });
	}

	page.onConsoleMessage=function(data){
		if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){
			var d = JSON.parse(data.split(_MSGSIGN)[1]);

			if(d.cmd=="contactData"){
				console.log(d.url);
				console.log(d.title);
				console.log(d.contact);
				fs.write( filebase + "_email.txt", JSON.stringify(d) +"\n\n", 'a');
			}
			if(d.cmd=="EXIT"){
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

			renderPage( filebase );

			var c = page.evaluate( function(host, HTML, _MSGSIGN) {

	__PAGECLOSED = false;

	(function (){

		function sendMSG(json){
			console.log(_MSGSIGN, JSON.stringify(json));
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
		var MAX_LEVEL = 1;	// max level of page to crawl
		var SAME_COUNT = 20; // same structure URL
		var MAX_HREF = 3; // skip the max link of page, and continue

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
						
						sendMSG({
							"cmd": "contactData",
							"url": theurl,
							"title": ZZ("title", dom).text(),
							"contact": parseHTML( data, ZZ("body", dom).text(), theurl )
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

		var contact = parseHTML( pageHtml, pageText, window.location.href );

		if(!pageHtml || ZZ('a').size()==0 || ZZ('a').size()>MAX_HREF ){
			checkComplete();
			return;
		}

		var dom = ZZ( '<div></div>' );
		dom.html( pageHtml.replace(/<br>|<br\s*\/>/ig, "&nbsp;") );
		ZZ('script,style', dom).remove();
		var pageText = ZZ(dom).text();

		sendMSG({
			"cmd": "contactData",
			"url": ROOT_URL,
			"title": document.title,
			"contact": contact
		});

		

		ZZ('a').each(function(){ 

			LinkQueue[ROOT_URL].urls.push(this.href);

			getURL( this.href, ROOT_URL);
		});	
		
		checkComplete();

		
	})();
				
			}, host, page.content, _MSGSIGN );
	}


	page.open(url);

}

function addPage(url, source){
	if( PageArray.length > MAX_LINK) return;
	if( _.findWhere( PageArray, {url:url} ) ) return;
	PageArray.push({ url: url, source: source ? source : "" } );
}
function DB_MSG(json){
	console.log(_MSGSIGN, JSON.stringify(json));
}


function getSearchResult( CONFIG, keyword ){

	var url= keyword ? CONFIG.url.replace(/%s/g, encodeURIComponent(keyword)) : CONFIG.url ;
	
	var urlObj= parseUrl(url);
	var host = urlObj.base;
	var filebase = DATA_FOLDER + "/" + host.split("//")[1].split("/")[0]+'_'+urlObj.query;

	var page = require('webpage').create();
	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36';
	page.settings.resourceTimeout = 150000;
	page.viewportSize = { width:1000, height:800 };



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
		if( ( new RegExp ("^"+_MSGSIGN) ).test(data) ){
			var d = JSON.parse(data.split(_MSGSIGN)[1]);
			if(d.cmd=='hrefData'){
				console.log(d.data);
				console.log(d.next);

				d.data.forEach(function(v){
					addPage(v, CONFIG.name);
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
		console.log(status );
		if(status=='fail'){
			setTimeout( function(){
				page.open(url);
			},1000);
			return;
		}
		var c = page.evaluate( function(CONFIG, _MSGSIGN) {

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
			function getResult(){
				var items = document.querySelectorAll( CONFIG.item );
				var jsonA = [];
				items.forEach(function(v, i){
					var href = v.querySelector(CONFIG.href);
					var title = v.querySelector(CONFIG.title);
					var desc = v.querySelector(CONFIG.desc);
					var date = v.querySelector('.b_attribution').lastChild;
					date = date.nodeType==3 ? trim(date.textContent) : "";
					jsonA.push( {
						"href": href,
						"title": title,
						"desc": desc,
						"date": date
					});
				});
				var hrefData = Array.prototype.map.call(jsonA, function(a, i) { return a.href  });
				var n = document.querySelector(CONFIG.next);
				
				DB_MSG( {type:"search_result", config: CONFIG, result: jsonA } );

				sendMSG({cmd:"hrefData", data:hrefData, next: n? n.href : ""  } );
				sendMSG({cmd:"exit"});
			}

			waitForContent();


			})();

	}, CONFIG, _MSGSIGN);

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
		desc: '.b_caption>p',
		company: '',
		email:'',
		phone:'',
		fax:'',
		address:'',
		domain:'',
		age:'',
		prestige:'',
		location:'',
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

getSearchResult( SearchConfig[0], "polyester fabric" );


/*
addPage("http://cn.bing.com");

addPage('http://www.topvaluefabrics.com/about-us.html');

addPage('http://www.topvaluefabrics.com/activewear-outerwear-fabrics.html');
addPage("http://www.topvaluefabrics.com/our-locations.html");
addPage("http://www.topvaluefabrics.com/");

addPage("http://www.unitedasia.com.cn/");
*/

