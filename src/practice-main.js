import './modules/analytics.js';
import { initSetupCheckBanner, goToSetupGuide, closeSetupCheckBanner } from './modules/setup-banner.js';
import { initAppVersionUI } from './modules/version-ui.js';
import { initOnboardingWelcome } from './modules/onboarding-welcome.js';
import { initTroubleGuideUI } from './modules/trouble-guide-ui.js';
import {
    playVideo,
    closeVideoModal,
    handleVideoModalClick,
    initVideoStepSelector,
} from './modules/video.js';

const STEP_TO_CHECK_QUERY = {
    step1: 'step1',
    step2: 'step2',
};

function updateCheckPageLinks() {
    const stepSelect = document.getElementById('videoStepSelect');
    const step = stepSelect?.value || 'step1';
    const query = STEP_TO_CHECK_QUERY[step] || 'step1';
    const href = `/check.html?step=${encodeURIComponent(query)}`;

    const goToCheckBtn = document.getElementById('goToCheckBtn');
    if (goToCheckBtn) goToCheckBtn.href = href;
}

function bindPracticeGuideModal() {
    const btn = document.getElementById('practiceGuideBannerBtn');
    const modal = document.getElementById('practiceGuideModal');
    const body = document.getElementById('practiceGuideModalBody');
    const closeBtn = document.getElementById('practiceGuideModalClose');
    if (!btn || !modal || !body) return;

    const content = `
            <p class="tool-guide-lead">このページでは、帳票定義作成のハンズオン演習を進めます。作業ステップごとに PDF・動画・演習ファイルを用意しています。</p>

            <h4 class="tool-guide-section-title"><span class="tool-guide-icon" aria-hidden="true">→</span> おすすめの進め方</h4>
            <ol class="tool-guide-steps">
                <li><span class="tool-guide-step-num">1</span> 作業するステップ（STEP.1 / STEP.2）を選ぶ</li>
                <li><span class="tool-guide-step-num">2</span> 作業の流れ（PDF）で全体像を確認する</li>
                <li><span class="tool-guide-step-num">3</span> 動画を見ながら、演習用 Excel をダウンロードして操作する</li>
                <li><span class="tool-guide-step-num">4</span> ConMas Designer に取り込み、定義を編集して公開する</li>
                <li><span class="tool-guide-step-num">5</span> 必要に応じて i-Reporter アプリで入力・動作確認する</li>
            </ol>
            <p class="tool-guide-lead">ここまで問題なければ一区切りです。エラー・公開不可・差分の特定が必要なときだけ、<a href="/check.html">定義チェック</a>をご利用ください。</p>
        `;

    function openModal() {
        body.innerHTML = content;
        modal.style.display = 'block';
        btn.classList.remove('setup-check-btn--highlight');
    }

    function closeModal(e) {
        if (!e || e.target === modal || e.target === closeBtn) {
            modal.style.display = 'none';
        }
    }

    btn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', closeModal);
    const inner = modal.querySelector('.tool-guide-modal-content');
    if (inner) inner.addEventListener('click', (e) => e.stopPropagation());

    window.addEventListener('onboarding-welcome-closed', () => {
        const banner = document.getElementById('setupCheckBanner');
        if (banner && banner.style.display === 'none') return;
        btn.classList.add('setup-check-btn--highlight');
        requestAnimationFrame(() => {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

function bindPracticeUi() {
    const setupGuideBtn = document.getElementById('setupCheckGuideBtn');
    if (setupGuideBtn) setupGuideBtn.addEventListener('click', goToSetupGuide);

    const setupCloseBtn = document.getElementById('setupCheckCloseBtn');
    if (setupCloseBtn) setupCloseBtn.addEventListener('click', closeSetupCheckBanner);

    const videoThumb = document.getElementById('videoThumbnailContainer');
    if (videoThumb) videoThumb.addEventListener('click', playVideo);

    const stepSelect = document.getElementById('videoStepSelect');
    if (stepSelect) {
        stepSelect.addEventListener('change', updateCheckPageLinks);
    }

    initVideoStepSelector({ syncReferenceXml: false });
    updateCheckPageLinks();
    bindPracticeGuideModal();
    initTroubleGuideUI();

    const videoModal = document.getElementById('videoModal');
    if (videoModal) videoModal.addEventListener('click', handleVideoModalClick);
    const videoModalContent = document.querySelector('.video-modal-content');
    if (videoModalContent) {
        videoModalContent.addEventListener('click', (event) => event.stopPropagation());
    }
    const videoCloseBtn = document.querySelector('.video-modal-close');
    if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideoModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('videoModal');
            if (modal && modal.style.display === 'flex') {
                closeVideoModal();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAppVersionUI();
    initOnboardingWelcome();
    initSetupCheckBanner();
    bindPracticeUi();
});
