/**
 * AI導入手順ナビゲーションガイド - 初期化処理
 * ページ読み込み時の初期化処理
 */

document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    generateAllSteps();
    updateOverallProgress();
    
    checkAllCompleted();
    
    // イベントデリゲーションを設定
    setupEventDelegation();
    
    setTimeout(() => {
        const indicator = document.getElementById('progressIndicator');
        const toggle = document.getElementById('progressIndicatorToggle');
        
        if (indicator) {
            indicator.classList.remove('hidden');
        }
        if (toggle) {
            toggle.classList.add('hidden');
        }
    }, 100);
});

