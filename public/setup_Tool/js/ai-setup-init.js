/**
 * AI導入手順ナビゲーションガイド - 初期化処理
 * ページ読み込み時の初期化処理
 */

document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    updateOverallProgress();
    checkAllCompleted();
    setupEventDelegation();
});
