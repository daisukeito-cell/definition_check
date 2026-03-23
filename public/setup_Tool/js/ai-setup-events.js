/**
 * AI導入手順ナビゲーションガイド - イベント処理
 * イベントデリゲーション、ステップ切り替え、進捗インジケーターなどのイベント処理
 */

// イベントデリゲーションが設定済みかどうかのフラグ
let eventDelegationSetup = false;

// イベントデリゲーションを設定する関数
function setupEventDelegation() {
    if (eventDelegationSetup) {
        return; // 既に設定済みの場合は何もしない
    }
    
    eventDelegationSetup = true;
    
    // ステップカードヘッダーのクリックイベント
    document.addEventListener('click', function(event) {
        if (event.target.closest('.step-card-header')) {
            const stepCard = event.target.closest('.step-card');
            const stepId = parseInt(stepCard.querySelector('.step-card-header').getAttribute('data-step'));
            if (stepId) {
                toggleStep(stepId);
            }
        }
    });

    // チェックボックスの変更イベント
    document.addEventListener('change', function(event) {
        if (event.target.classList.contains('step-card-checklist-checkbox')) {
            const itemId = event.target.id.replace('checkbox-', '');
            event.stopPropagation();
            toggleChecklistItem(itemId);
        }
    });

    // イベント伝播を停止する要素のクリックイベント（統合）
    const stopPropagationSelectors = [
        '.step-card-checklist-checkbox',
        '.step-card-checklist-label',
        '.step-card-checklist-item-actions',
        '.step-card-checklist-item',
        '.step-card-checklist-items',
        '.step-card-checklist',
        '.step-card-content'
    ];
    
    document.addEventListener('click', function(event) {
        for (const selector of stopPropagationSelectors) {
            if (event.target.matches(selector) || event.target.closest(selector)) {
                event.stopPropagation();
                break;
            }
        }
    });
}

function updateProgressIndicator() {
    const steps = document.querySelectorAll('.progress-indicator-step');
    const stepCards = document.querySelectorAll('.step-card');
    
    steps.forEach((step, index) => {
        // ステップ1を除外して、ステップ2から始まる（index + 2）
        const stepId = index + 2;
        const stepCard = stepCards[stepId - 1]; // ステップカードは0ベースなので-1
        const isActive = stepCard && stepCard.classList.contains('active');
        const isCompleted = stepCard && stepCard.classList.contains('completed');
        
        step.className = 'progress-indicator-step';
        
        if (isActive) {
            step.classList.add('active');
        } else if (isCompleted) {
            step.classList.add('completed');
        } else {
            step.classList.add('pending');
        }
    });
}

function toggleStep(stepId) {
    const stepCard = document.querySelector(`[data-step="${stepId}"]`).closest('.step-card');
    
    if (!stepCard) {
        console.error('Step card not found for step:', stepId);
        return;
    }
    
    const isActive = stepCard.classList.contains('active');
    
    // 他のカードを閉じる
    document.querySelectorAll('.step-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // 現在のカードを切り替え（閉じている場合は開く、開いている場合は閉じる）
    if (!isActive) {
        stepCard.classList.add('active');
        // スムーズスクロールでアクティブなカードに移動
        setTimeout(() => {
            stepCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }, 100);
    }
    
    // 進捗インジケーターを更新
    updateProgressIndicator();
}

function toggleProgressIndicator() {
    const indicator = document.getElementById('progressIndicator');
    const toggle = document.getElementById('progressIndicatorToggle');
    
    if (indicator && toggle) {
        if (indicator.classList.contains('hidden')) {
            indicator.classList.remove('hidden');
            toggle.classList.add('hidden');
        } else {
            indicator.classList.add('hidden');
            toggle.classList.remove('hidden');
        }
    }
}

window.onclick = function(event) {
    const pdfModal = document.getElementById('pdfModal');
    const indicator = document.getElementById('progressIndicator');
    const toggle = document.getElementById('progressIndicatorToggle');
    
    if (event.target === pdfModal) {
        pdfModal.style.display = 'none';
    }
    
    if (indicator && !indicator.classList.contains('hidden') && 
        !indicator.contains(event.target) && 
        event.target !== toggle) {
        indicator.classList.add('hidden');
        if (toggle) {
            toggle.classList.remove('hidden');
        }
    }
}

