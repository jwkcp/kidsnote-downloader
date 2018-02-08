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

    /************************************************************/
    /* 페이지가 로딩되면 사용자들이 가장 잘 보이는 위치인 최상단에 버튼 생성
    /************************************************************/
    $("header.header-top.header-primary").after($("<button/>", {
        id: "btnDownload",
        class: "btn btn-success",
        text: "여기를 누르시면 모든 앨범의 사진과 동영상을 일괄 다운로드합니다."
    }));

    // 앨범 다운로드
    function run() {
      // Javascript로 일괄 다운로드를 구현하기 위한 JSZip 객체 생성 (https://stuk.github.io/jszip/)
      var zip = new JSZip();

      $("#btnDownload").text("분석 중...");
      createAlbumPageIndexPromise() // 페이지 index 추출
      .then(indexes => // 페이지별 앨범 그룹 추출
        Promise.all(indexes.map(index => createAlbumPromise(index)))
      )
      .then(albumGroups => // 앨범별 다운로드 링크 추출
        Promise.all(albumGroups
          .reduce((a,b) => a.concat(b))
          .map(album => createDownloadLinkPromise(album)))
      )
      .then(albums => // 다운로드
        Promise.all(createDownloadPromise(albums, zip))
      )
      .then(() => // 압축
        zip.generateAsync({type:"blob"})
      )
      .then(blob => { // 저장
          saveAs(blob, zipFileName);
          $("#btnDownload").text("완료!");
      });
    }

    // 앨범 페이지 index 추출
    function createAlbumPageIndexPromise() {
      return new Promise((resolve, reject) => {
        $.get(pageUrl, pageData => {
            // 앨범이 페이징되어 있을 경우 총 페이지 수 추출
            var pageLimit = $(pageData).find("ul.pagination.pagination-sm li").length - 1; // 꺽쇠 1개를 삭제

            var pageIndexes = [];
            // 추출된 페이지 수만큼 작업을 반복
            for (var i=1; i<=pageLimit; i++) pageIndexes.push(i);

            resolve(pageIndexes);
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

    // 개별 다운로드 파일 링크 추출 Promise 생성
    function createDownloadLinkPromise(album) {
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
          album.pictures.map((url, index) => {return {url: url, fileName: 'album_' + dateString + '_' + index + '.jpg'};}),
          album.videos.map((url, index) => {return {url: url, fileName: 'album_' + dateString + '_' + index + '.mp4'};})
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
                $("#btnDownload").text("진행률: " + Math.round((cntDownloads * 100) / totalCount) + "%" + "(" + cntDownloads + "/" + totalCount + ")");
                resolve();
            });
          });
        });
      }).reduce((a,b) => a.concat(b));
    }

    /************************************************************/
    /* 파일 다운로드 버튼 클릭
    /************************************************************/
    $("#btnDownload").click(() => run());

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
