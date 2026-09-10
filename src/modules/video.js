import pdfjsLib from './pdf-worker.js';

// YouTube動画IDのマッピング（限定公開URLの videoId を設定）
// 文字列、または { id, start }（開始秒）
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
  'add-in-usage': 'YgZux2IY57g',
  'designer-basic': 'KBpXqYNXM7c',
  'excel-output': 'MZ1TAUnheQg',
  'excel-export': 'MZ1TAUnheQg', // 旧IDとの互換性のため
  'update-report': 'AIEXKa5x3R4',
  'revision-up': 'AIEXKa5x3R4', // 旧IDとの互換性のため
  // カスタムマスター
  'custom-master-about': { id: 'oU63ylprym4', start: 122 },
  'custom-master-create': 'kfS6f1H7fO8',
  'custom-master-register': 'pXH1WOqTKSY',
  'custom-master-settings': 'Nz0ib0b_5Lo',
  'custom-master-input': 'YsjHoh1JWKY',
  'custom-master-update': '9dgN-ixPJbo',
  'custom-master-default-search': 'UI80bw2l4WI',
};

function resolveYoutubeEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { id: entry, start: 0 };
  if (entry.id) return { id: entry.id, start: Number(entry.start) || 0 };
  return null;
}

function getYoutubeEmbedUrl(videoId, start = 0) {
  let url = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  if (start > 0) url += `&start=${start}`;
  return url;
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
let referenceXmlSyncHandler = null;

/** 動画一覧：STEPごとの動画・PDF・基準XML */
const VIDEO_STEPS = {
  step1: {
    referenceFile: 'Definition_check.xml',
    pdfHref: 'Material/Def_Check_1.pdf',
    pdfLabel: '📄 STEP.1 の作業の流れ（PDF）',
    downloads: [
      { href: 'Material/演習用定義.xlsx', label: '演習用定義.xlsx' },
    ],
    videos: [
      { id: 'cluster-settings', title: 'クラスター設定' },
      { id: 'add-in-usage', title: 'add-inの使い方' },
      { id: 'designer-basic', title: 'ConMas Designer 基本操作' },
    ],
  },
  step2: {
    referenceFile: 'Definition_Complet.xml',
    pdfHref: 'Material/Def_Check_2.pdf',
    pdfLabel: '📄 STEP.2 の作業の流れ（PDF）',
    downloads: [
      { href: 'Material/演習用定義.xlsx', label: '演習用定義.xlsx' },
    ],
    videos: [
      { id: 'excel-output', title: 'Excel定義出力' },
      { id: 'update-report', title: '帳票定義の更新' },
    ],
  },
  step3: {
    referenceFile: 'カスタムマスター演習.xml',
    pdfHref: 'Material/Def_Check_3.pdf',
    pdfLabel: '📄 STEP.3 の作業の流れ（PDF）',
    downloads: [
      { href: 'Material/カスタムマスター演習.xlsx', label: 'カスタムマスター演習.xlsx' },
      { href: 'Material/CustomMasterInputSheet.xlsb', label: 'CustomMasterInputSheet.xlsb' },
    ],
    videos: [
      { id: 'custom-master-about', title: 'カスタムマスターについて' },
      { id: 'custom-master-create', title: 'カスタムマスターの作成' },
      { id: 'custom-master-register', title: 'カスタムマスターの登録' },
      { id: 'custom-master-settings', title: 'カスタムマスターの設定' },
      { id: 'custom-master-input', title: 'カスタムマスターを使った入力' },
    ],
    // 必須手順ではないので本編一覧には出さず、必要なときだけ開ける
    optionalVideos: [
      {
        id: 'custom-master-update',
        title: 'カスタムマスターの更新',
        summary: 'マスターを更新する場合（任意）',
        note: 'すでに登録したマスターを直すときだけ見てください。',
      },
    ],
  },
  step4: {
    referenceFile: 'カスタムマスター設定_応用版練習.xml',
    pdfHref: 'Material/Def_Check_4.pdf',
    pdfLabel: '📄 STEP.4 の作業の流れ（PDF）',
    downloads: [
      { href: 'Material/カスタムマスター設定_応用版練習.xlsx', label: 'カスタムマスター設定_応用版練習.xlsx' },
    ],
    videos: [
      { id: 'custom-master-default-search', title: 'マスター選択デフォルト検索値設定' },
    ],
  },
};

export function setReferenceFileHandler(handler) {
  referenceFileHandler = handler;
}

export function setReferenceXmlSyncHandler(handler) {
  referenceXmlSyncHandler = handler;
}

/** STEPごとに「ここで使用するファイル」ボタンを並べる（1ファイル1ボタン） */
function getStepDownloads(step) {
  if (Array.isArray(step.downloads) && step.downloads.length) return step.downloads;
  if (step.downloadHref) {
    return [{ href: step.downloadHref, label: step.downloadLabel || 'ダウンロード' }];
  }
  return [];
}

function applyStepDownloads(step) {
  const wrap = document.getElementById('downloadLinks');
  const section = wrap?.closest('.download-section');
  if (!wrap) return;
  const items = getStepDownloads(step);
  if (!items.length) {
    wrap.innerHTML = '';
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  wrap.innerHTML = items
    .map(
      (item) =>
        `<a href="${item.href}" download="${item.label}" class="download-link"><span class="download-icon">⬇️</span>${item.label}</a>`
    )
    .join('');
}

function bindVideoItemClicks(container) {
  if (!container) return;
  container.querySelectorAll('.video-item').forEach((item) => {
    item.addEventListener('click', () => {
      const videoId = item.dataset.videoId;
      const title = item.dataset.videoTitle;
      if (videoId && title) {
        selectVideo(videoId, title, false, item);
      }
    });
  });
}

function applyVideoStep(stepKey) {
  const step = VIDEO_STEPS[stepKey];
  const panel = document.getElementById('videoStepVideos');
  const pdfLink = document.getElementById('videoStepPdfBtn');
  if (!step || !panel) return;

  if (pdfLink) {
    if (step.pdfHref) {
      pdfLink.href = step.pdfHref;
      pdfLink.textContent = step.pdfLabel;
      pdfLink.style.display = '';
    } else {
      pdfLink.removeAttribute('href');
      pdfLink.textContent = '';
      pdfLink.style.display = 'none';
    }
  }

  applyStepDownloads(step);

  const mainList = (step.videos || [])
    .map(
      (video) =>
        `<div class="video-item" role="listitem" data-video-id="${video.id}" data-video-title="${video.title}">${video.title}</div>`
    )
    .join('');

  const optionalList = (step.optionalVideos || [])
    .map((video) => {
      const summary = video.summary || '必要な場合のみ（任意）';
      const note = video.note
        ? `<p class="video-optional-note">${video.note}</p>`
        : '';
      return `<details class="video-optional">
        <summary>${summary}</summary>
        ${note}
        <div class="video-item video-item--optional" role="listitem" data-video-id="${video.id}" data-video-title="${video.title}">${video.title}</div>
      </details>`;
    })
    .join('');

  panel.innerHTML = mainList + optionalList;

  bindVideoItemClicks(panel);

  const firstItem = panel.querySelector('.video-item');
  if (firstItem) {
    selectVideo(firstItem.dataset.videoId, firstItem.dataset.videoTitle, false, firstItem);
  } else {
    currentVideoId = null;
    const thumbnailText = document.getElementById('videoThumbnailText');
    if (thumbnailText) thumbnailText.textContent = '動画を選択してください';
    const thumbnailImage = document.getElementById('videoThumbnailImage');
    if (thumbnailImage) thumbnailImage.style.display = 'none';
  }

  if (syncReferenceXmlOnStepChange) {
    const refSelect = document.getElementById('referenceXmlSelect');
    if (refSelect && step.referenceFile && refSelect.value !== step.referenceFile) {
      refSelect.value = step.referenceFile;
      if (referenceXmlSyncHandler) {
        referenceXmlSyncHandler();
      }
    }
  }
}

let syncReferenceXmlOnStepChange = false;

export function initVideoStepSelector(options = {}) {
  syncReferenceXmlOnStepChange = options.syncReferenceXml === true;
  const select = document.getElementById('videoStepSelect');
  if (!select) return;

  select.addEventListener('change', () => {
    applyVideoStep(select.value);
  });

  applyVideoStep(select.value);
}

export function playVideo() {
  console.log('playVideo関数が呼び出されました');

  const modal = document.getElementById('videoModal');
  if (!modal) {
    return;
  }

  if (!currentVideoId) {
    console.warn('currentVideoIdが設定されていません');
    alert('演習の STEP を選び、動画一覧から視聴する動画を選択してください。');
    return;
  }

  const youtubeEntry = resolveYoutubeEntry(youtubeIdMap[currentVideoId]);
  if (!youtubeEntry) {
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
  iframe.src = getYoutubeEmbedUrl(youtubeEntry.id, youtubeEntry.start);
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

  const youtubeEntry = resolveYoutubeEntry(youtubeIdMap[videoId]);
  const youtubeId = youtubeEntry?.id;
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
