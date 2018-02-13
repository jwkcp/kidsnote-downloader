/************************************************************/
/* Title    : Kidsnote picture batch downloader
/* purpose  : To do a batch download it does not support on Kidsnote website
/* Author   : Jaewoong go (jaewoong.go@gmail.com)
/* Date     : 2016.12.02
/************************************************************/
$("document").ready(() => {
    // 접속에 사용될 기본 주소
    const baseUrl = "https://www.kidsnote.com";
    // 페이지 추출에 사용될 앨범리스트 주소
    const albumListUrl = baseUrl + "/albums/";
    // 앨범 탐색에 사용될 주소
    const albumUrl = albumListUrl + "?page=";
    // 앨범 압축 파일 생성 이름
    const albumZipFileName = "album_kidsnote_pictures.zip";
    // 페이지 추출에 사용될 알림장리스트 주소
    const reportListUrl = baseUrl + "/reports/";
    // 알림장 탐색에 사용될 주소
    const reportUrl = reportListUrl + "?page=";
    // 알림장 압축파일 생성 이름
    const reportZipFileName = "report_kidsnote_pictures.zip";

    /************************************************************/
    /* Progress text
    /************************************************************/
    $("header.header-top.header-primary").after(`
<p id="progressText" style="text-align: center;">로그인 후, 호칭을 설정한뒤 내려받기 버튼을 눌려주세요.</p>`);

    /************************************************************/
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after(`
<div class="btn-group" style="width:100%;">
    <button id="btnReportDownload" type="button" class="btn btn-primary" style="width:50%;">알림장 모두 내려받기</button>
    <button id="btnAlbumDownload" type="button" class="btn btn-success" style="width:50%;">앨범 모두 내려받기</button>
</div>`);


    // 앨범 다운로드
    function runAlbum() {
        // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
        let zip = new JSZip();

        $("#progressText").text("페이지 추출 중...");
        createPageIndexPromise(albumListUrl) // 페이지 index 추출
            .then(indexes => { // 페이지별 앨범 그룹 추출
                $("#progressText").text("페이지별 앨범 그룹 추출 중...");
                return Promise.all(indexes.map(index => createAlbumPromise(index)));
            })
            .then(albumGroups => {// 앨범별 다운로드 링크 추출
                $("#progressText").text("다운로드 링크 생성 중...");
                return Promise.all(albumGroups
                    .reduce((a, b) => a.concat(b))
                    .map(album => createAlbumDownloadLinkPromise(album)));
            })
            .then(albums => {// 다운로드
                $("#progressText").text("다운로드 중...");
                return Promise.all(createDownloadPromise(albums, zip));
            })
            .then(() => { // 압축
                $("#progressText").text("압축파일 생성 중...");
                return zip.generateAsync({type: "blob"});
            })
            .then(blob => { // 저장
                saveAs(blob, albumZipFileName);
                $("#progressText").text("완료 !!!");
            })
            .catch(err => {
                $("#progressText").text("오류 : "  + JSON.stringify(err));
            });
    }

    // 알림장 다운로드
    function runReport() {
        // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
        let zip = new JSZip();

        $("#progressText").text("페이지 추출 중...");
        createPageIndexPromise(reportListUrl)
            .then(indexes => { // 페이지별 앨범 그룹 추출
                $("#progressText").text("페이지별 앨범 그룹 추출 중...");
                return Promise.all(indexes.map(index => createReportPromise(index)));
            })
            .then(albumGroups => { // 앨범별 다운로드 링크 추출
                $("#progressText").text("다운로드 링크 생성 중...");
                return Promise.all(albumGroups
                    .reduce((a, b) => a.concat(b))
                    .map(album => createReportDownloadLinkPromise(album)))
            })
            .then(albums => { // 다운로드
                $("#progressText").text("다운로드 중...");
                return Promise.all(createDownloadPromise(albums, zip))
            })
            .then(() => { // 압축
                $("#progressText").text("압축파일 생성 중...");
                return zip.generateAsync({type: "blob"})
            })
            .then(blob => { // 저장
                saveAs(blob, reportZipFileName);
                $("#progressText").text("완료 !!!");
            })
            .catch(err => {
                $("#progressText").text("오류 : "  + JSON.stringify(err));
            });
    }

    // 페이지 index 추출
    function createPageIndexPromise(listUrl) {
        return ajaxGet(listUrl).then(pageData => {
            // 앨범이 페이징되어 있을 경우 총 페이지 수 추출
            let pageButtons = $(pageData).find('ul.pagination.pagination-sm li a');
            if (pageButtons.length < 2) {
                return [1];
            } else {
                let lastPage = Number(pageButtons[pageButtons.length - 2].text);
                if (isNaN(lastPage)) {
                    return [1];
                } else {
                    let pageIndexes = [];
                    // 추출된 페이지 수만큼 작업을 반복
                    for (let i = 1; i <= lastPage; i++) pageIndexes.push(i);

                    return pageIndexes;
                }
            }
        });
    }

    // 앨범 정보 생성 Promise
    function createAlbumPromise(pageIndex) {
        return ajaxGet(albumUrl + pageIndex).then(albumData => {
            return $(albumData).find("div.album-list-wrapper a").map((index, element) => {
                // 앨범정보 추출
                let dateNumbers = $(element).find('.pull-left.card-footer-text').text().trim().split('.');
                return album = {
                    url: baseUrl + $(element).attr("href"),
                    date: new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]),
                    title: $(element).find('.card-sub-title').text().trim(),
                    pictures: [],
                    videos: []
                };

            }).toArray();
        });
    }

    // 알림장 정보 생성 Promise
    function createReportPromise(pageIndex) {
        // 페이지별
        return ajaxGet(reportUrl + pageIndex).then(albumData => {
            let albums = $(albumData).find("div.report-list-wrapper a").map((index, element) => {
                // 앨범정보 추출
                return album = {
                    url: baseUrl + $(element).attr("href"),
                    pictures: [],
                    videos: []
                };
            }).toArray();
            return albums;
        });
    }

    // 개별 다운로드 파일 링크 추출 Promise 생성
    function createAlbumDownloadLinkPromise(album) {
        return ajaxGet(album.url).then(picData => {
            let picHtml = $(picData);

            // 사진 파일 주소 추출
            picHtml.find("div.grid a").each((index, element) => {
                album.pictures.push($(element).attr("data-download"));
            });

            // 동영상 파일 주소 추출
            picHtml.find("div.download-button-wrapper a").each((index, element) => {
                album.videos.push($(element).attr("href"));
            });

            return album;
        });
    }

    // 개별 다운로드 파일 링크 추출 Promise 생성
    function createReportDownloadLinkPromise(album) {
        return ajaxGet(album.url).then(picData => {
            let picHtml = $(picData);

            // 날짜 추출
            let dateNumbers = picHtml.find('.sub-header-title').text().trim().split(/년|월|일/).map(word => Number(word.trim()));
            album.date = new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]);

            // 사진 파일 주소 추출
            picHtml.find("div.grid a").each((index, element) => {
                album.pictures.push($(element).attr("data-download"));
            });

            // 동영상 파일 주소 추출
            picHtml.find("div.download-button-wrapper a").each((index, element) => {
                //console.log($(this).attr('href'));
                album.videos.push($(telementhis).attr("href"));
            });

            return album;
        });
    }

    // 개별 다운로드 Promise 배열 생성
    function createDownloadPromise(albums, zip) {
        // 다운로드 진행상황
        let cntDownloads = 0;
        let totalCount = 0;

        return albums.map(album => {
            let dateString = formatDate(album.date);
            totalCount += album.pictures.length;
            totalCount += album.videos.length;

            let createDownloadInfo = (url, index) => {
                return {
                    url: url,
                    fileName: dateString + '_' + index + '.jpg'
                };
            };
            // 다운로드
            return [
                    album.pictures.map(createDownloadInfo),
                    album.videos.map(createDownloadInfo)
                ]
                .reduce((a, b) => a.concat(b)) // 다운로드 정보를 하나의 배열로 만듬.
                .map(item => {
                    return new Promise((resolve, reject) => {
                        // 수집된 각 개별 파일을 다운로드하여 압축하기 위해 JSZip 수행
                        JSZipUtils.getBinaryContent(item.url, (err, data) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            zip.file(item.fileName, data);
                            cntDownloads++; // 실제 다운로드 된 수 (콜백이기 때문에)
                            $("#progressText").text("진행률: " + Math.round((cntDownloads * 100) / totalCount) + "%" + "(" + cntDownloads + "/" + totalCount + ")");
                            resolve();
                        });
                    });
                });
        }).reduce((a, b) => a.concat(b));
    }

    /************************************************************/
    /* 파일 다운로드 버튼 클릭
    /************************************************************/
    $("#btnAlbumDownload").click(() => runAlbum());
    $("#btnReportDownload").click(() => runReport());

    // JQuery ajax Promise wrapper
    function ajaxGet(url) {
        return new Promise((resolve, reject) => $.get(url).done(resolve).fail((a,b,c) => reject(c||a||b)));
    }

    // 날짜 yyy-mm-dd 반환
    function formatDate(date) {
        let month = '' + (date.getMonth() + 1);
        let day = '' + date.getDate();
        let year = date.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }
});
