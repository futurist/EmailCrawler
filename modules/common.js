
//<<<---------------comment functions--------------
function eve(el, type){
    el= ('jquery' in el)? el.get(0) : el ;	//(typeof el['jquery']!='undefined')
    if(typeof type=='undefined') type='click';
    var click = document.createEvent("MouseEvents");
    click.initMouseEvent(type, true, true, window,
                         0, 0, 0, 0, 0, false, false, false, false, 0, null);
    button = el;
    button.dispatchEvent(click);
    button.focus();
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
}

strPad = function(i,l,s) {
	var o = i.toString();
	if (!s) { s = '0'; }
	while (o.length < l) {
		o = s + o;
	}
	return o;
};

function getParameterValue(url, parameter)
{
    var fragment = url.split('#');
    var urlparts= fragment[0].split('?');
    
    if (urlparts.length>=2)
    {
        var urlBase=urlparts.shift(); //get first part, and remove from array
        var queryString=urlparts.join("?"); //join it back up
        
        var prefix = encodeURIComponent(parameter)+'=';
        var pars = queryString.split(/[&;]/g);
        for (var i= pars.length; i-->0;) {               //reverse iteration as may be destructive
            if (pars[i].lastIndexOf(prefix, 0)!==-1) {   //idiom for string.startsWith
                return encodeURIComponent(pars[i].split('=')[1].replace(/\+/ig,'_'));
            }
        }
    }
    return '';
}
function getParameterValue2(url, seg)
{
    var key, fragment = url.split('#');
    var urlparts= fragment[0].replace(/https?:\/\//,'').split('/');
    var keyword =  urlparts[seg].split('.')[0] ;
    return keyword;
}
//---------------comment functions----------->>>>>>


