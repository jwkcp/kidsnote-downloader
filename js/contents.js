/************************************************************/
/* Title    : Kidsnote picture batch downloader
/* purpose  : To do a batch download it does not support on Kidsnote website
/* Author   : Jaewoong go (jaewoong.go@gmail.com)
/* Date     : 2016.12.02
/************************************************************/
$("document").ready(function() {
    // 접속에 사용될 기본 주소
    const baseUrl = "https://www.kidsnote.com";
    // 페이지 추출에 사용될 주소
    const pageUrl = baseUrl + "/albums/";
    // 앨범 탐색에 사용될 주소
    const albumUrl = pageUrl + "?page=";
    // 압축 파일 생성 이름
    const zipFileName = "kidsnote_pictures.zip";
    // 각 파일에 붙일 접두사(Prefix)
    const eachFileNamePrefix = "kids_picture_";

    // 수집된 사진을 저장할 배열
    var arrayDownloadUrl = Array();
    // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
    var zip = new JSZip();
    // 다운로드 대상 수
    var cntTargets = 0;
    // 다운로드 완료 수
    var cntDownloads = 0;

    /************************************************************/
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after($("<button/>", {
        id: "btnDownload",
        class: "btn btn-success",
        text: "여기를 누르시면 모든 앨범의 사진과 동영상을 일괄 다운로드합니다."
    }));

    /************************************************************/
    /* [사전작업] Kidsnote 사이트에서 페이지/앨범/사진 정보 추출
    /************************************************************/
    $.get(pageUrl, function(pageData) {
        // 앨범이 페이징되어 있을 경우 총 페이지 수 추출
        var pageHtml = $("<pageData>").append($.parseHTML(pageData));
        var pageResult = $("ul.pagination.pagination-sm", pageHtml);
        var pageLimit = pageResult.find("li").length - 1;  // 꺽쇠 1개를 삭제
        var eachAlbumUrl = "";

        // 추출된 페이지 수만큼 작업을 반복
        for (var i=1; i<=pageLimit; i++) {
            // 앨범 링크 추출
            $.get(albumUrl + i, function(albumData) {
                var albumHtml = $("<albumData>").append($.parseHTML(albumData));
                var albumResult = $("div.album-list-wrapper", albumHtml);

                albumResult.find("a").each(function () {
                    // 각 앨범 주소 추출
                    eachAlbumUrl = baseUrl + $(this).attr("href");

                    // 개별 다운로드 파일 링크 추출
                    $.get(eachAlbumUrl, function(picData) {
                        var picHtml = $("<picData>").append($.parseHTML(picData));

                        // 사진 파일 주소 추출
                        var picResult = $("div.grid", picHtml);
                        picResult.find("a").each(function () {
                            arrayDownloadUrl.push($(this).attr("href"));
                        });

                        // 동영상 파일 주소 추출
                        var movResult = $("div.download-button-wrapper", picHtml);
                        movResult.find("a").each(function () {
                            //console.log($(this).attr('href'));
                            arrayDownloadUrl.push($(this).attr("href"));
                        });
                    });
                });
            }).fail(function() {
                console.log("Function failed.");
            });
        }
    });

    /************************************************************/
    /* 파일 다운로드 버튼 클릭
    /************************************************************/
    $("#btnDownload").click(function() {
        $("#btnDownload").text("분석 중...");

        arrayDownloadUrl.forEach(function(url) {
            // 사진과 동영상의 파일 구분에 따른 확장자 부여
            var eachFileName = "kids_picture_default_name";
            if (url.indexOf(".mp4") > -1) {
                eachFileName = eachFileNamePrefix + cntTargets + ".mp4";
            }
            else {
                eachFileName = eachFileNamePrefix + cntTargets + ".jpg";
            }

            // 수집된 각 개별 파일을 다운로드하여 압축하기 위해 JSZip 수행
            JSZipUtils.getBinaryContent(url, function (err, data) {
                if(err) {
                    throw err;
                }
                zip.file(eachFileName, data);
                cntDownloads++; // 실제 다운로드 된 수 (콜백이기 때문에)
            });
            cntTargets++; // 개별 파일 네이밍을 위해 카운팅된 수량
        });

        // 2초 마다 1번씩 콜백에 따른 다운로드 진행률을 체크하여 모두 완료 시 파일을 Zip으로 사용자 컴퓨터에 저장
        var monitor = setInterval(function() {
            $("#btnDownload").text("진행률: " + Math.round((cntDownloads * 100) / arrayDownloadUrl.length) + "%" + "(" + cntDownloads + "/" + arrayDownloadUrl.length + ")");

            if (cntDownloads >= arrayDownloadUrl.length) {
                clearInterval(monitor);

                zip.generateAsync({type:"blob"})
                    .then(function(blob)
                    {
                        saveAs(blob, zipFileName);
                        $("#btnDownload").text("완료!");
                    });
            }
        }, 2000);
    });
});
