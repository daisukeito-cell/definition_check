/**
 * AI導入手順ナビゲーションガイド - 進捗管理
 * ローカルストレージへの保存/読み込み、進捗計算機能
 */

function loadProgress() {
    const savedProgress = localStorage.getItem('iReporterGuideProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        completedChecklistItems = new Set(progress.completedChecklistItems || []);
    }
}

function saveProgress() {
    const progress = {
        completedChecklistItems: Array.from(completedChecklistItems)
    };
    localStorage.setItem('iReporterGuideProgress', JSON.stringify(progress));
}

function isItemDisabled(itemId) {
    // Windows版とiOS版の排他制御
    if (itemId === 'installer-prep-2' || itemId === 'installer-prep-2-ios') {
        const otherId = itemId === 'installer-prep-2' ? 'installer-prep-2-ios' : 'installer-prep-2';
        return completedChecklistItems.has(otherId);
    }
    return false;
}

function calculateOverallProgress() {
    // ステップ1（ダウンロードセクション）を除外して進捗を計算
    const totalItems = guideSteps.reduce((total, step) => {
        if (step.id === 1) {
            // ステップ1はダウンロードセクションのみなので進捗に含めない
            return total;
        }
        const stepItems = step.checklist.filter(item => !item.isDownloadSection);
        return total + stepItems.length;
    }, 0);
    
    // 完了項目数を計算（ステップ1を除外）
    let completedItems = 0;
    
    guideSteps.forEach(step => {
        if (step.id === 1) {
            // ステップ1は進捗に含めない
            return;
        }
        const stepItems = step.checklist.filter(item => !item.isDownloadSection);
        stepItems.forEach(item => {
            if (completedChecklistItems.has(item.id)) {
                completedItems++;
            }
        });
    });
    
    return {
        completed: completedItems,
        total: totalItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
}

function updateOverallProgress() {
    const progress = calculateOverallProgress();
    document.getElementById('overallProgressStats').textContent = `${progress.completed} / ${progress.total} 項目完了`;
    document.getElementById('overallProgressBar').style.width = progress.percentage + '%';
    document.getElementById('overallProgressText').textContent = progress.percentage + '%';
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

function checkAllCompleted() {
    const progress = calculateOverallProgress();
    if (progress.completed === progress.total) {
        showCompletionMessage();
    }
}
