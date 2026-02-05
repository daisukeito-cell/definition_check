import pdfjsLib from './pdf-worker.js';

// YouTube動画IDのマッピング（限定公開URLの videoId を設定）
const youtubeIdMap = {
  // 管理者用コンテンツ
  'manager-overview': '9eFVeeYbiJk',
  'user-creation': '3U19USEmDY0',
  'user-management': '3U19USEmDY0', // 旧IDとの互換性のため
  'group-creation': 'mQiCzLC68xY',
  'group-management': 'mQiCzLC68xY', // 旧IDとの互換性のため
  'terminal-management': 'eQ7I8JH9C_M',
  // 帳票定義作成編
  'cluster-settings': '8WLbBc7GMkA',
  'designer-basic': 'KBpXqYNXM7c',
  'excel-output': 'MZ1TAUnheQg',
  'excel-export': 'MZ1TAUnheQg', // 旧IDとの互換性のため
  'update-report': 'AIEXKa5x3R4',
  'revision-up': 'AIEXKa5x3R4' // 旧IDとの互換性のため
};

function getYoutubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}

function getYoutubeThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// サムネイルJPGファイルのパスマッピング（JPGがある場合は優先的に使用）
const thumbnailJpgMap = {
  // 管理者用コンテンツ
  'manager-overview': 'movie/ConMasManager概要.jpg',
  'user-creation': 'movie/ユーザー作成.jpg',
  'user-management': 'movie/ユーザー作成.jpg', // 旧IDとの互換性のため
  'group-creation': 'movie/グループ作成.jpg',
  'group-management': 'movie/グループ作成.jpg', // 旧IDとの互換性のため
  'terminal-management': 'movie/端末管理.jpg',
  // 帳票定義作成編
  'cluster-settings': 'movie/クラスタ―設定.jpg',
  'designer-basic': 'movie/Designer基本操作.jpg',
  'excel-output': 'movie/Excel定義出力.jpg',
  'excel-export': 'movie/Excel定義出力.jpg', // 旧IDとの互換性のため
  'update-report': 'movie/帳票定義の更新.jpg',
  'revision-up': 'movie/帳票定義の更新.jpg' // 旧IDとの互換性のため
};

// サムネイルPDFファイルのパスマッピング（JPGがない場合のフォールバック）
const thumbnailPdfMap = {
  // 管理者用コンテンツ
  'manager-overview': 'movie/Manager概要サムネ.pdf',
  'user-creation': 'movie/ユーザー作成_サムネ.pdf',
  'user-management': 'movie/ユーザー作成_サムネ.pdf', // 旧IDとの互換性のため
  'group-creation': 'movie/グループ作成_サムネ.pdf',
  'group-management': 'movie/グループ作成_サムネ.pdf', // 旧IDとの互換性のため
  'terminal-management': 'movie/端末管理_サムネ.pdf',
  // 帳票定義作成編
  'cluster-settings': 'movie/クラスター設定_サムネ.pdf',
  'designer-basic': 'movie/Designer基本操作_サムネ.pdf', // JPGがない場合のフォールバック
  'excel-output': 'movie/Excel定義出力_サムネ.pdf',
  'excel-export': 'movie/Excel定義出力_サムネ.pdf', // 旧IDとの互換性のため
  'update-report': 'movie/帳票定義の更新_サムネ.pdf', // JPGがない場合のフォールバック
  'revision-up': 'movie/帳票定義の更新_サムネ.pdf' // 旧IDとの互換性のため
};

let currentVideoId = null;
let referenceFileHandler = null;

export function setReferenceFileHandler(handler) {
  referenceFileHandler = handler;
}

export function playVideo() {
  console.log('playVideo関数が呼び出されました');

  const modal = document.getElementById('videoModal');
  if (!modal) {
    return;
  }

  if (!currentVideoId) {
    console.warn('currentVideoIdが設定されていません');
    alert('まず動画一覧から動画を選択してください。');
    return;
  }

  const youtubeId = youtubeIdMap[currentVideoId];
  if (!youtubeId) {
    console.error('youtubeIdMapに動画IDが見つかりません:', currentVideoId, youtubeIdMap);
    alert('YouTube動画IDが未設定です。video.js の youtubeIdMap にIDを設定してください。');
    return;
  }

  const videoPlayer = document.getElementById('videoPlayer');
  const modalTitle = document.getElementById('videoModalTitle');
  if (!videoPlayer) {
    console.error('videoPlayer要素が見つかりません');
    return;
  }

  const thumbnail = document.getElementById('videoThumbnail');
  if (modalTitle && thumbnail) {
    modalTitle.textContent = thumbnail.textContent || '動画を再生';
  }

  videoPlayer.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = getYoutubeEmbedUrl(youtubeId);
  iframe.title = 'YouTube video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'width: 100%; height: 100%; border: 0;';
  videoPlayer.appendChild(iframe);
  modal.style.display = 'flex';
}

export function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const videoPlayer = document.getElementById('videoPlayer');
  if (!modal || !videoPlayer) {
    return;
  }

  videoPlayer.innerHTML = '';
  modal.style.display = 'none';
}

export function handleVideoModalClick(event) {
  const modal = document.getElementById('videoModal');
  if (!modal) {
    return;
  }
  if (event.target.id === 'videoModal') {
    closeVideoModal();
  }
}

export function selectVideo(videoId, title, isReferenceVideo = false, clickedElement = null) {
  const videoItems = document.querySelectorAll('.video-item');
  if (videoItems.length === 0) {
    return;
  }

  videoItems.forEach(item => {
    item.classList.remove('active');
  });

  if (clickedElement) {
    clickedElement.classList.add('active');
  }

  currentVideoId = videoId;

  const thumbnailText = document.getElementById('videoThumbnailText');
  if (thumbnailText) {
    thumbnailText.textContent = title;
  }

  const youtubeId = youtubeIdMap[videoId];
  const thumbnailJpg = thumbnailJpgMap[videoId];
  const thumbnailPdf = thumbnailPdfMap[videoId];
  const thumbnailImage = document.getElementById('videoThumbnailImage');
  const thumbnailContainer = document.getElementById('videoThumbnail');

  if (youtubeId && thumbnailImage) {
    thumbnailImage.src = getYoutubeThumbnailUrl(youtubeId);
    thumbnailImage.style.display = 'block';
    thumbnailImage.style.objectFit = 'cover';

    if (thumbnailContainer) {
      const existingPdf = thumbnailContainer.querySelector('.thumbnail-pdf');
      if (existingPdf) {
        existingPdf.remove();
      }
    }
    return;
  }

  if (thumbnailJpg && thumbnailImage) {
    thumbnailImage.src = thumbnailJpg;
    thumbnailImage.style.display = 'block';
    thumbnailImage.style.objectFit = 'cover';

    if (thumbnailContainer) {
      const existingPdf = thumbnailContainer.querySelector('.thumbnail-pdf');
      if (existingPdf) {
        existingPdf.remove();
      }
    }
    return;
  }

  if (thumbnailPdf && thumbnailContainer && thumbnailImage) {
    const existingPdf = thumbnailContainer.querySelector('.thumbnail-pdf');
    if (existingPdf) {
      existingPdf.remove();
    }

    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.getDocument(thumbnailPdf).promise.then(function(pdf) {
        return pdf.getPage(1);
      }).then(function(page) {
        const thumbnailWidth = 400;
        const thumbnailHeight = 225;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = Math.min(thumbnailWidth / viewport.width, thumbnailHeight / viewport.height);
        const scaledViewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        return page.render(renderContext).promise.then(function() {
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          thumbnailImage.src = thumbnailDataUrl;
          thumbnailImage.style.display = 'block';
          thumbnailImage.style.objectFit = 'cover';
        });
      }).catch(function() {
        thumbnailImage.style.display = 'none';
      });
    } else {
      thumbnailImage.style.display = 'none';
    }
  } else if (thumbnailImage) {
    thumbnailImage.style.display = 'none';
  }

  if (isReferenceVideo && referenceFileHandler) {
    referenceFileHandler();
  } else {
    const refInfo = document.getElementById('referenceFileInfo');
    if (refInfo) {
      refInfo.style.display = 'none';
    }
  }
}

export function downloadFile() {
  alert('ファイルダウンロード機能は準備中です。');
}

function generateVideoThumbnail(videoPath, callback = null) {
  const video = document.getElementById('hiddenVideo');
  const thumbnailImage = document.getElementById('videoThumbnailImage');
  if (!video || !thumbnailImage) {
    if (callback) callback();
    return;
  }

  video.src = videoPath;

  const onLoadedMetadata = function() {
    const targetTime = Math.min(1.0, video.duration / 2);
    video.currentTime = targetTime;
  };

  const onSeeked = function() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      thumbnailImage.src = thumbnailDataUrl;
      thumbnailImage.style.display = 'block';
    } catch (error) {
      thumbnailImage.style.display = 'none';
    }

    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);

    if (callback) callback();
  };

  const onError = function() {
    thumbnailImage.style.display = 'none';
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);
    if (callback) callback();
  };

  video.addEventListener('loadedmetadata', onLoadedMetadata);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);
}
