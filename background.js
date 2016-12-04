/************************************************************/
/* Title    : Kidsnote picture batch downloader
 /* purpose  : To do a batch download it does not support on Kidsnote website
 /* Author   : Jaewoong go (jaewoong.go@gmail.com)
 /* Date     : 2016.12.02
 /************************************************************/
chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
    var headers = details.requestHeaders;
    headers.push({name: "Allow-Control-Allow-Origin", value: "*"});
    return {requestHeaders: headers};
},
    {"urls": ["*://*.kidsnote.com/*"]},
    ["requestHeaders", "blocking"]);
