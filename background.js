// /************************************************************/
// /* Title    : Kidsnote picture batch downloader
//  /* purpose  : To do a batch download it does not support on Kidsnote website
//  /* Author   : Jaewoong go (jaewoong.go@gmail.com)
//  /* Date     : 2016.12.02
//  /************************************************************/
// console.log('kidsnote extension loaded.');
// chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
//     console.log('kidsnote onBeforeSendHeaders.addListener');
//     var headers = details.requestHeaders;
//     headers.push({name: "Allow-Control-Allow-Origin", value: "*"});
//     return {requestHeaders: headers};
// },
//     {"urls": ["*://*.kidsnote.com/*"]},
//     ["requestHeaders", "blocking"]);

var accessControlRequestHeaders;
var exposedHeaders;

var requestListener = function(details){
	var flag = false,
		rule = {
			name: "Origin",
			value: "http://evil.com/"
		};
	var i;

	for (i = 0; i < details.requestHeaders.length; ++i) {
		if (details.requestHeaders[i].name.toLowerCase() === rule.name.toLowerCase()) {
			flag = true;
			details.requestHeaders[i].value = rule.value;
			break;
		}
	}
	if(!flag) details.requestHeaders.push(rule);

	for (i = 0; i < details.requestHeaders.length; ++i) {
		if (details.requestHeaders[i].name.toLowerCase() === "access-control-request-headers") {
			accessControlRequestHeaders = details.requestHeaders[i].value
		}
	}

	return {requestHeaders: details.requestHeaders};
};

var responseListener = function(details){
	var flag = false,
	rule = {
			"name": "Access-Control-Allow-Origin",
			"value": "*"
		};

	for (var i = 0; i < details.responseHeaders.length; ++i) {
		if (details.responseHeaders[i].name.toLowerCase() === rule.name.toLowerCase()) {
			flag = true;
			details.responseHeaders[i].value = rule.value;
			break;
		}
	}
	if(!flag) details.responseHeaders.push(rule);

	if (accessControlRequestHeaders) {

		details.responseHeaders.push({"name": "Access-Control-Allow-Headers", "value": accessControlRequestHeaders});

	}

	if(exposedHeaders) {
		details.responseHeaders.push({"name": "Access-Control-Expose-Headers", "value": exposedHeaders});
	}

	details.responseHeaders.push({"name": "Access-Control-Allow-Methods", "value": "GET, PUT, POST, DELETE, HEAD, OPTIONS"});

	return {responseHeaders: details.responseHeaders};

};

/*On install*/
chrome.runtime.onInstalled.addListener(function(){
	chrome.storage.local.set({'active': false});
	chrome.storage.local.set({'urls': ["<all_urls>"]});
	chrome.storage.local.set({'exposedHeaders': ''});
	reload();
});

/*Reload settings*/
function reload() {
	chrome.storage.local.get({'active': false, 'urls': ["<all_urls>"], 'exposedHeaders': ''}, function(result) {

		exposedHeaders = result.exposedHeaders;

		/*Remove Listeners*/
		chrome.webRequest.onHeadersReceived.removeListener(responseListener);
		chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);

		if(result.active) {
			chrome.browserAction.setIcon({path: "on.png"});

			if(result.urls.length) {

				/*Add Listeners*/
				chrome.webRequest.onHeadersReceived.addListener(responseListener, {
					urls: result.urls
				},["blocking", "responseHeaders"]);

				chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, {
					urls: result.urls
				},["blocking", "requestHeaders"]);
			}
		} else {
			chrome.browserAction.setIcon({path: "off.png"});
		}
	});
}
