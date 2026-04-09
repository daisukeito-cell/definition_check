const STORAGE_DISMISS = 'trainingRoomOnboardingDismissed';

/**
 * 初回訪問向け：このページでできること → 端末準備の確認 →（設定済みで本文を「目的」に切替）→ トレーニング開始
 */
export function initOnboardingWelcome() {
    if (localStorage.getItem(STORAGE_DISMISS) === '1') {
        return;
    }

    const overlay = document.getElementById('onboardingWelcomeOverlay');
    if (!overlay) return;

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

    function openOverlay() {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

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

    openOverlay();

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

    document.addEventListener('keydown', function escClose(ev) {
        if (ev.key === 'Escape' && overlay.style.display === 'flex') {
            closeOverlay(false);
            document.removeEventListener('keydown', escClose);
        }
    });
}
