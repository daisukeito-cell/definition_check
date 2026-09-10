const STORAGE_DISMISS = 'trainingRoomOnboardingDismissed';

let overlayBound = false;

/**
 * 初回訪問向け：このページでできること → 端末準備の確認 →（設定済みで本文を「目的」に切替）→ トレーニング開始
 * 「次回から表示しない」後も、openOnboardingWelcome() で再表示できる
 */
export function initOnboardingWelcome() {
    const overlay = document.getElementById('onboardingWelcomeOverlay');
    if (!overlay) return;

    bindOnboardingWelcome();

    if (localStorage.getItem(STORAGE_DISMISS) === '1') {
        return;
    }
    openOnboardingWelcome({ showPurpose: false });
}

/**
 * 初めての案内を開く。showPurpose が true のときは工程図（このページの目的）から表示する
 */
export function openOnboardingWelcome(options = {}) {
    const overlay = document.getElementById('onboardingWelcomeOverlay');
    if (!overlay) return;

    bindOnboardingWelcome();

    const showPurpose = options.showPurpose === true;
    const blockFeatures = document.getElementById('onboardingBlockFeatures');
    const blockPurpose = document.getElementById('onboardingBlockPurpose');
    const stepTerminal = document.getElementById('onboardingStepTerminal');
    const stepReady = document.getElementById('onboardingStepReady');
    const chkDontShow = document.getElementById('onboardingDontShowAgain');

    if (blockFeatures) blockFeatures.hidden = showPurpose;
    if (blockPurpose) blockPurpose.hidden = !showPurpose;
    if (stepTerminal) stepTerminal.hidden = showPurpose;
    if (stepReady) stepReady.hidden = !showPurpose;
    if (chkDontShow) chkDontShow.checked = false;

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function bindOnboardingWelcome() {
    if (overlayBound) return;

    const overlay = document.getElementById('onboardingWelcomeOverlay');
    if (!overlay) return;
    overlayBound = true;

    const blockFeatures = document.getElementById('onboardingBlockFeatures');
    const blockPurpose = document.getElementById('onboardingBlockPurpose');
    const stepTerminal = document.getElementById('onboardingStepTerminal');
    const stepReady = document.getElementById('onboardingStepReady');
    const btnUnset = document.getElementById('onboardingBtnUnset');
    const btnSet = document.getElementById('onboardingBtnSet');
    const btnStart = document.getElementById('onboardingBtnStart');
    const btnLater = document.getElementById('onboardingBtnLater');
    const chkDontShow = document.getElementById('onboardingDontShowAgain');
    const linkBack = document.getElementById('onboardingLinkBackToTerminal');

    function closeOverlay(saveDismiss) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (saveDismiss) {
            localStorage.setItem(STORAGE_DISMISS, '1');
        }
        window.dispatchEvent(
            new CustomEvent('onboarding-welcome-closed', {
                detail: { saveDismiss: !!saveDismiss },
            })
        );
    }

    btnUnset?.addEventListener('click', () => {
        window.location.href = new URL('/setup_Tool/AI_setup.html', window.location.origin).href;
    });

    btnSet?.addEventListener('click', () => {
        if (blockFeatures) blockFeatures.hidden = true;
        if (blockPurpose) blockPurpose.hidden = false;
        if (stepTerminal) stepTerminal.hidden = true;
        if (stepReady) stepReady.hidden = false;
        if (chkDontShow) chkDontShow.checked = false;
    });

    btnStart?.addEventListener('click', () => {
        const dismiss = chkDontShow?.checked === true;
        closeOverlay(dismiss);
    });

    btnLater?.addEventListener('click', () => {
        closeOverlay(false);
    });

    linkBack?.addEventListener('click', () => {
        if (blockFeatures) blockFeatures.hidden = false;
        if (blockPurpose) blockPurpose.hidden = true;
        if (stepTerminal) stepTerminal.hidden = false;
        if (stepReady) stepReady.hidden = true;
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay(false);
        }
    });

    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && overlay.style.display === 'flex') {
            closeOverlay(false);
        }
    });
}
