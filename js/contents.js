/************************************************************/
/* Title    : Kidsnote picture batch downloader
/* purpose  : To do a batch download it does not support on Kidsnote website
/* Author   : Jaewoong go (jaewoong.go@gmail.com)
/* Date     : 2016.12.02
/************************************************************/
$("document").ready(function() {
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
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after($("<button/>", {
        id: "btnAlbumDownload",
        class: "btn btn-success",
        text: "여기를 누르시면 모든 앨범의 사진과 동영상을 일괄 다운로드합니다."
    }));

    /************************************************************/
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after($("<button/>", {
        id: "btnReportDownload",
        class: "btn btn-success",
        text: "여기를 누르시면 모든 알림장의 사진과 동영상을 일괄 다운로드합니다."
    }));

    /************************************************************/
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after($("<P/>", {
        id: "progressText",
        text: "대기중."
    }));

    // 앨범 다운로드
    function runAlbum() {
      // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
      var zip = new JSZip();

      $("#progressText").text("분석 중...");
      createPageIndexPromise(albumListUrl) // 페이지 index 추출
      .then(indexes => // 페이지별 앨범 그룹 추출
        Promise.all(indexes.map(index => createAlbumPromise(index)))
      )
      .then(albumGroups => // 앨범별 다운로드 링크 추출
        Promise.all(albumGroups
          .reduce((a,b) => a.concat(b))
          .map(album => createAlbumDownloadLinkPromise(album)))
      )
      .then(albums => // 다운로드
        Promise.all(createDownloadPromise(albums, zip))
      )
      .then(() => // 압축
        zip.generateAsync({type:"blob"})
      )
      .then(blob => { // 저장
          saveAs(blob, albumZipFileName);
          $("#progressText").text("완료!");
      });
    }

    // 알림장 다운로드
    function runReport() {
      // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
      var zip = new JSZip();

      $("#progressText").text("분석 중...");
      createPageIndexPromise(reportListUrl)
      .then(indexes => { // 페이지별 앨범 그룹 추출
        return Promise.all(indexes.map(index => createReportPromise(index)));
      })
      .then(albumGroups => // 앨범별 다운로드 링크 추출
        Promise.all(albumGroups
          .reduce((a,b) => a.concat(b))
          .map(album => createReportDownloadLinkPromise(album)))
      )
      .then(albums => // 다운로드
        Promise.all(createDownloadPromise(albums, zip))
      )
      .then(() => // 압축
        zip.generateAsync({type:"blob"})
      )
      .then(blob => { // 저장
          saveAs(blob, reportZipFileName);
          $("#progressText").text("완료!");
      });
    }

    // 페이지 index 추출
    function createPageIndexPromise(listUrl) {
      return new Promise((resolve, reject) => {
        $.get(listUrl, pageData => {
            // 앨범이 페이징되어 있을 경우 총 페이지 수 추출
            var pageButtons = $(pageData).find('ul.pagination.pagination-sm li a');
            if (pageButtons.length < 2) {
              resolve([1]);
            }
            else {
              var lastPage = Number(pageButtons[pageButtons.length - 2].text);
              if (isNaN(lastPage)) {
                resolve([1]);
              }
              else {
                var pageIndexes = [];
                // 추출된 페이지 수만큼 작업을 반복
                for (var i=1; i<=lastPage; i++) pageIndexes.push(i);

                resolve(pageIndexes);
              }
            }
          });
      });
    }

    // 앨범 정보 생성 Promise
    function createAlbumPromise(pageIndex) {
      return new Promise(function(resolve, reject){
        // 페이별
        $.get(albumUrl + pageIndex, albumData => {
            var albums = $(albumData).find("div.album-list-wrapper a").map(function () {
                // 앨범정보 추출
                var dateNumbers = $(this).find('.pull-left.card-footer-text').text().trim().split('.');
                return album = {
                  url: baseUrl + $(this).attr("href"),
                  date: new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]),
                  title: $(this).find('.card-sub-title').text().trim(),
                  pictures:[],
                  videos:[]
                };

            }).toArray();
            resolve(albums);
        });
      });
    }

    // 알림장 정보 생성 Promise
    function createReportPromise(pageIndex) {
      return new Promise(function(resolve, reject){
        // 페이지별
        $.get(reportUrl + pageIndex, albumData => {
            var albums = $(albumData).find("div.report-list-wrapper a").map(function () {
                // 앨범정보 추출
                // var dateNumbers = $(this).find('.pull-left.card-footer-text').text().trim().split('.');
                return album = {
                  url: baseUrl + $(this).attr("href"),
                  // date: new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]),
                  // title: $(this).find('.card-sub-title').text().trim(),
                  pictures:[],
                  videos:[]
                };

            }).toArray();
            resolve(albums);
        });
      });
    }

    // 개별 다운로드 파일 링크 추출 Promise 생성
    function createAlbumDownloadLinkPromise(album) {
      return new Promise((resolve, reject) => {
        // 개별 다운로드 파일 링크 추출
        $.get(album.url, function(picData) {
            var picHtml = $(picData);

            // 사진 파일 주소 추출
            var picResult = picHtml.find("div.grid");
            picResult.find("a").each(function () {
                album.pictures.push($(this).attr("data-download"));
            });

            // 동영상 파일 주소 추출
            var movResult = picHtml.find("div.download-button-wrapper");
            movResult.find("a").each(function () {
                //console.log($(this).attr('href'));
                album.videos.push($(this).attr("href"));
            });

            resolve(album);
        });
      });
    }

    // 개별 다운로드 파일 링크 추출 Promise 생성
    function createReportDownloadLinkPromise(album) {
      return new Promise((resolve, reject) => {
        // 개별 다운로드 파일 링크 추출
        $.get(album.url, function(picData) {
            var picHtml = $(picData);

            // 날짜 추출
            var dateNumbers = picHtml.find('.sub-header-title').text().trim().split(/년|월|일/).map(word => Number(word.trim()));
            album.date = new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]);

            // 사진 파일 주소 추출
            var picResult = picHtml.find("div.grid");
            picResult.find("a").each(function () {
                album.pictures.push($(this).attr("data-download"));
            });

            // 동영상 파일 주소 추출
            var movResult = picHtml.find("div.download-button-wrapper");
            movResult.find("a").each(function () {
                //console.log($(this).attr('href'));
                album.videos.push($(this).attr("href"));
            });

            resolve(album);
        });
      });
    }

    // 개별 다운로드 Promise 배열 생성
    function createDownloadPromise(albums, zip) {
      // 다운로드 진행상황
      var cntDownloads = 0;
      var totalCount = 0;

      return albums.map(album => {
        var dateString = formatDate(album.date);
        totalCount += album.pictures.length;
        totalCount += album.videos.length;

        // 다운로드
        return [
          album.pictures.map((url, index) => {return {url: url, fileName: dateString + '_' + index + '.jpg'};}),
          album.videos.map((url, index) => {return {url: url, fileName: dateString + '_' + index + '.mp4'};})
        ]
        .reduce((a,b) => a.concat(b))
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
      }).reduce((a,b) => a.concat(b));
    }

    /************************************************************/
    /* 파일 다운로드 버튼 클릭
    /************************************************************/
    $("#btnAlbumDownload").click(() => runAlbum());

    $("#btnReportDownload").click(() => runReport());

    // 날짜 yyy-mm-dd 반환
    function formatDate(date) {
        var d = date,
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }
});
