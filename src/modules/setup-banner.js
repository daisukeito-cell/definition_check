/**
 * 端末準備ガイドのURL（public/setup_Tool を dist にコピー）
 * - 別URLにしたい場合はここを書き換え
 */
const SETUP_GUIDE_URL = '/setup_Tool/AI_setup.html';

export function initSetupCheckBanner() {
  const bannerHidden = localStorage.getItem('setupCheckBannerHidden');
  if (bannerHidden === 'true') {
    const banner = document.getElementById('setupCheckBanner');
    if (banner) {
      banner.style.display = 'none';
    }
    showReopenButton();
  }
}

export function goToSetupGuide() {
  try {
    const url = new URL(SETUP_GUIDE_URL, window.location.origin);
    window.location.assign(url.href);
  } catch {
    window.location.href = SETUP_GUIDE_URL;
  }
}

export function closeSetupCheckBanner() {
  const banner = document.getElementById('setupCheckBanner');
  if (banner) {
    banner.style.display = 'none';
  }
  localStorage.setItem('setupCheckBannerHidden', 'true');
  showReopenButton();
}

function showReopenButton() {
  if (document.getElementById('reopenBannerBtn')) {
    return;
  }

  const reopenBtn = document.createElement('button');
  reopenBtn.id = 'reopenBannerBtn';
  reopenBtn.className = 'reopen-banner-btn';
  reopenBtn.innerHTML = '📋 端末準備ガイドを表示';
  reopenBtn.addEventListener('click', reopenSetupCheckBanner);

  const header = document.querySelector('.header');
  if (header) {
    header.insertAdjacentElement('afterend', reopenBtn);
  }
}

function hideReopenButton() {
  const reopenBtn = document.getElementById('reopenBannerBtn');
  if (reopenBtn) {
    reopenBtn.remove();
  }
}

function reopenSetupCheckBanner() {
  const banner = document.getElementById('setupCheckBanner');
  if (banner) {
    banner.style.display = 'block';
  }
  localStorage.removeItem('setupCheckBannerHidden');
  hideReopenButton();
}
