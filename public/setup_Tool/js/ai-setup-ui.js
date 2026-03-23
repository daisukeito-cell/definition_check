/**
 * AI導入手順ナビゲーションガイド - UI制御
 * ステップ生成、モーダル表示、通知などのUI機能
 */

function generateAllSteps() {
    const container = document.getElementById('allStepsContainer');
    
    // 現在開いているステップを記録
    const activeStepCard = container.querySelector('.step-card.active');
    const activeStepId = activeStepCard ? parseInt(activeStepCard.querySelector('.step-card-header').getAttribute('data-step')) : null;
    console.log('Active step before regeneration:', activeStepId);
    
    container.innerHTML = '';

    guideSteps.forEach(step => {
        const stepCard = document.createElement('div');
        stepCard.className = 'step-card';
        
        const checkableItems = step.checklist.filter(item => !item.isDownloadSection);
        
        // ステップ1の場合はWindows版とiOS版を1つとしてカウント
        let stepCompleted = false;
        let completedCount = 0;
        let totalCount = 0;
        
        if (step.id === 1) {
            // ステップ1: 3項目（ConMas Excel、i-Reporter、ConMasDesigner）
            totalCount = 3;
            
            // ConMas Excel
            if (completedChecklistItems.has('installer-prep-1')) {
                completedCount++;
            }
            
            // i-Reporter（Windows版またはiOS版のいずれか）
            if (completedChecklistItems.has('installer-prep-2') || completedChecklistItems.has('installer-prep-2-ios')) {
                completedCount++;
            }
            
            // ConMasDesigner
            if (completedChecklistItems.has('installer-prep-3')) {
                completedCount++;
            }
            
            stepCompleted = completedCount === totalCount;
        } else {
            // 他のステップは通常の計算
            stepCompleted = checkableItems.every(item => completedChecklistItems.has(item.id));
            completedCount = checkableItems.filter(item => completedChecklistItems.has(item.id)).length;
            totalCount = checkableItems.length;
        }
        
        if (stepCompleted) {
            stepCard.classList.add('completed');
        }

        stepCard.innerHTML = `
            <div class="step-card-header" data-step="${step.id}">
                <div class="step-card-header-info">
                    <div class="step-card-number">${step.id}</div>
                    <h3 class="step-card-title">${step.title}</h3>
                </div>
                ${step.id === 1 ? '' : `<div class="step-card-status ${stepCompleted ? 'completed' : 'pending'}">${stepCompleted ? '完了' : '未開始'}</div>`}
                <div class="step-card-arrow">▼</div>
            </div>
            
            <div class="step-card-content">
                <div class="step-card-description">${step.description}</div>
            
                ${step.aiGuidance ? `
                <div class="step-card-ai-guidance">
                    <h5>AIガイダンス</h5>
                    <p>${step.aiGuidance}</p>
                </div>
            ` : ''}
            
                <div class="step-card-checklist">
                    <div class="step-card-checklist-header">
                        <h4 class="step-card-checklist-title">チェック項目</h4>
                        ${step.id === 1 ? '' : `<div class="step-card-checklist-progress">${completedCount} / ${totalCount} 完了</div>`}
                    </div>
                    <div class="step-card-checklist-items">
                    ${step.checklist.map(item => `
                            ${item.isDownloadSection ? `
                                <div class="download-section">
                                    <div class="download-section-header">
                                        <h4 class="download-section-title">${item.title}</h4>
                                        <p class="download-section-description">${item.description}</p>
                                    </div>
                                    <div class="download-section-content">
                                        ${item.directDownloads ? `
                                            <div class="direct-download-buttons">
                                                ${item.directDownloads.map(download => `
                                                    ${download.url ? `
                                                    <a href="${download.url}" target="_blank" rel="noopener noreferrer" class="direct-download-button ${download.type}">
                                                        <div class="button-icon">${download.icon}</div>
                                                        <div class="button-content">
                                                            <div class="button-title">${download.title}</div>
                                                            <div class="button-description">${download.description}</div>
                                                        </div>
                                                    </a>
                                                    ` : `
                                                    <button class="direct-download-button ${download.type}" 
                                                            onclick="downloadFile('${download.filename}')">
                                                        <div class="button-icon">${download.icon}</div>
                                                        <div class="button-content">
                                                            <div class="button-title">${download.title}</div>
                                                            <div class="button-description">${download.description}</div>
                                                        </div>
                                                    </button>
                                                    `}
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                        <div class="download-note">
                                            ${item.downloadNote}
                                            <br><br>
                                            <a href="${item.downloadUrl}" target="_blank" class="download-link">
                                                🌐 公式ダウンロードページを開く
                                            </a>
                                        </div>
                                        ${item.downloadList ? `
                                            <ul class="download-list">
                                                ${item.downloadList.map(listItem => `
                                                    <li>
                                                        <div class="download-list-item-title">${listItem.title}</div>
                                                        <div class="download-list-item-description">${listItem.description}</div>
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        ` : ''}
                                        ${item.iosNote ? `<div class="ios-note">📱 ${item.iosNote}</div>` : ''}
                                    </div>
                                </div>
                            ` : `
                                <div class="step-card-checklist-item ${completedChecklistItems.has(item.id) ? 'completed' : ''} ${isItemDisabled(item.id) ? 'disabled' : ''}">
                                    <div class="step-card-checklist-item-main">
                                        <input type="checkbox" 
                                               class="step-card-checklist-checkbox" 
                                               id="checkbox-${item.id}"
                                               ${completedChecklistItems.has(item.id) ? 'checked' : ''}
                                               ${isItemDisabled(item.id) ? 'disabled' : ''}>
                                        <label for="checkbox-${item.id}" class="step-card-checklist-label">
                            <div class="step-card-checklist-item-title">
                                ${item.title}
                            </div>
                            <div class="step-card-checklist-item-description">${item.description}</div>
                                        </label>
                    </div>
                                        <div class="step-card-checklist-item-actions">
                                            ${item.isSimpleCheck ? `
                                                ${item.iosNote ? `<div class="ios-note">📱 ${item.iosNote}</div>` : ''}
                                            ` : `
                                        ${item.downloadUrl ? `
                                            <a href="${item.downloadUrl}" target="_blank" class="download-link">
                                                📥 ダウンロードページを開く
                                            </a>
                                            <div class="download-note">${item.downloadNote}</div>
                                                    ${item.downloadList ? `
                                                        <ul class="download-list">
                                                            ${item.downloadList.map(listItem => `
                                                                <li>
                                                                    <div class="download-list-item-title">${listItem.title}</div>
                                                                    <div class="download-list-item-description">${listItem.description}</div>
                                                                </li>
                                                            `).join('')}
                                                        </ul>
                                                    ` : ''}
                                                ${item.iosNote ? `<div class="ios-note">📱 ${item.iosNote}</div>` : ''}
                                            ` : ''}
                                                `}
                                            ${item.pdfFile ? `
                                                <button class="pdf-button" onclick="showPdfWithStopPropagation('${item.pdfFile}', '${item.pdfTitle}', event);">
                                                    📄 操作手順PDFを表示
                                                </button>
                                            ` : ''}
                                            ${item.setupGuides ? `
                                                <div class="setup-guide-buttons">
                                                    ${item.setupGuides.map(guide => `
                                                        <button class="setup-guide-button ${guide.platform === 'iOS版' ? 'ios' : 'windows'}" 
                                                                onclick="showSetupGuide('${guide.platform}', '${guide.title}', ${JSON.stringify(guide.steps).replace(/"/g, '&quot;')}, event);">
                                                            📱 ${guide.platform}設定手順
                                                        </button>
                                                    `).join('')}
                                                </div>
                                            ` : ''}
                                            ${item.pdfFiles ? `
                                                <div class="pdf-button-group">
                                                    ${item.pdfFiles.map(pdf => `
                                                        <button class="pdf-button ${pdf.label === 'iOS版' ? 'ios' : ''}" 
                                                                onclick="showPdfWithStopPropagation('${pdf.file}', '${pdf.title}', event);">
                                                            📄 ${pdf.label}手順PDF
                                                        </button>
                            `).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `}
                            `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(stepCard);
    });
    
    // 元々開いていたステップを再度開く
    if (activeStepId) {
        const stepCard = container.querySelector(`[data-step="${activeStepId}"]`).closest('.step-card');
        if (stepCard) {
            stepCard.classList.add('active');
            console.log('Restored active step:', activeStepId);
        }
    }
    
    // イベントデリゲーションを再設定
    setupEventDelegation();
}


function toggleChecklistItem(itemId) {
    console.log('toggleChecklistItem called for item:', itemId);
    
    // ダウンロードセクションの場合は何もしない
    const isDownloadSection = guideSteps.some(step => 
        step.checklist.some(item => 
            item.id === itemId && item.isDownloadSection
        )
    );
    if (isDownloadSection) {
        console.log('Item is download section, skipping toggle');
        return;
    }
    
    // イベント伝播を確実に停止
    if (typeof event !== 'undefined' && event) {
        console.log('Stopping event propagation');
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
    }
    
    // 現在開いているステップを記録
    const activeStepCard = document.querySelector('.step-card.active');
    const activeStepId = activeStepCard ? parseInt(activeStepCard.querySelector('.step-card-header').getAttribute('data-step')) : null;
    console.log('Currently active step:', activeStepId);
    
    // Windows版とiOS版の排他制御
    if (itemId === 'installer-prep-2' || itemId === 'installer-prep-2-ios') {
        const otherId = itemId === 'installer-prep-2' ? 'installer-prep-2-ios' : 'installer-prep-2';
        
    if (completedChecklistItems.has(itemId)) {
            // チェックを外す場合
        completedChecklistItems.delete(itemId);
            console.log('Unchecked item:', itemId);
    } else {
            // チェックを入れる場合、もう片方を外す
        completedChecklistItems.add(itemId);
            completedChecklistItems.delete(otherId);
            console.log('Checked item:', itemId, 'and unchecked:', otherId);
        }
    } else {
        // 通常の項目
        if (completedChecklistItems.has(itemId)) {
            completedChecklistItems.delete(itemId);
            console.log('Unchecked item:', itemId);
        } else {
            completedChecklistItems.add(itemId);
            console.log('Checked item:', itemId);
        }
    }

    // HTMLの再生成を遅延させてイベントの競合を防ぐ
    setTimeout(() => {
    generateAllSteps();
    updateOverallProgress();
    saveProgress();
    checkAllCompleted();
        
        // 元々開いていたステップを再度開く
        if (activeStepId) {
            setTimeout(() => {
                const stepCard = document.querySelector(`[data-step="${activeStepId}"]`).closest('.step-card');
                if (stepCard) {
                    stepCard.classList.add('active');
                    console.log('Reopened step:', activeStepId);
                }
            }, 50);
        }
    }, 0);
}



function showPdfWithStopPropagation(pdfFile, pdfTitle, event) {
    event.stopPropagation();
    event.preventDefault();
    showPdf(pdfFile, pdfTitle);
}

function showSetupGuide(platform, title, steps, event) {
    event.stopPropagation();
    event.preventDefault();
    
    // ステップを配列に変換
    const stepsArray = typeof steps === 'string' ? JSON.parse(steps) : steps;
    
    // 画像パスを取得
    const imagePath = platform === 'iOS版' ? 'assets/pdfs/iOS_setup.pdf' : 'assets/pdfs/Win_setup.pdf';
    
    // 接続先URL
    const connectionUrl = 'https://sales.conmas-i-reporter.com/ConMasWebSEMINAROLINE/Rests/ConMasIReporter.aspx';
    
    // 接続先設定画面セクション
    const qrSection = `
        <div class="setup-guide-qr-section">
            <h4>接続先設定画面</h4>
            <div class="setup-guide-qr-layout ${platform === 'Windows版' ? 'windows-only' : ''}">
                <div class="setup-guide-settings-panel">
                    <img src="${platform === 'iOS版' ? 'assets/images/ios_QR.png' : 'assets/images/Win_URL.png'}" alt="${platform}設定画面" class="setup-guide-settings-image" onclick="showImageModal('${platform === 'iOS版' ? 'assets/images/ios_QR.png' : 'assets/images/Win_URL.png'}', '${platform}設定画面', event)">
                </div>
                ${platform === 'iOS版' ? `
                    <div class="setup-guide-qr-panel">
                        <img src="assets/images/ios_QR.png" alt="接続先URL QRコード" class="setup-guide-main-qr-image">
                    </div>
                ` : ''}
            </div>
            ${platform === 'iOS版' ? `
                <div class="setup-guide-ios-note">
                    <span class="setup-guide-note-icon">■</span>
                    iOS版アプリでこのQRコードを読み取って設定を自動入力できます
                </div>
            ` : ''}
        </div>
    `;
    
    // モーダルを作成
    const modal = document.createElement('div');
    modal.className = 'setup-guide-modal';
    modal.innerHTML = `
        <div class="setup-guide-modal-content">
            <div class="setup-guide-header">
                <h3>${title}</h3>
                <button class="setup-guide-close" onclick="closeSetupGuide()">&times;</button>
            </div>
            <div class="setup-guide-body">
                <div class="setup-guide-platform">${platform}</div>
                
                ${qrSection}
                
                <div class="setup-guide-steps-section">
                    <h4>設定手順</h4>
                    <ol class="setup-guide-steps">
                        ${stepsArray.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="setup-guide-image-section">
                    <h4>マニュアル</h4>
                    <div class="setup-guide-image-container" onclick="openPdfInNewWindow('${imagePath}')">
                        <iframe src="${imagePath}" class="setup-guide-pdf-viewer"></iframe>
                        <div class="setup-guide-image-overlay">
                            <div class="setup-guide-image-overlay-text">
                                📄 PDFを別ウィンドウで開く
                            </div>
                        </div>
                    </div>
                    <div class="setup-guide-image-note">
                        <small>※ 画像をクリックするとPDFを別ウィンドウで開きます</small>
                    </div>
                </div>
                
                <div class="setup-guide-note">
                    <strong>注意:</strong> ユーザーIDとパスワードは講習会事務局から提供されます。
                </div>
                
                <div class="setup-guide-footer">
                    <button class="setup-guide-close-button" onclick="closeSetupGuide()">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    
    // モーダルを表示
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeSetupGuide() {
    const modal = document.querySelector('.setup-guide-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function showImageModal(imageSrc, title, event) {
    event.stopPropagation();
    event.preventDefault();
    
    // 画像拡大表示モーダルを作成
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <div class="image-modal-header">
                <h3>${title}</h3>
                <button class="image-modal-close" onclick="closeImageModal()">&times;</button>
            </div>
            <div class="image-modal-body">
                <img src="${imageSrc}" alt="${title}" class="image-modal-image">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // モーダルを表示
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function showAppStoreModal() {
    // 既存のモーダルがあれば削除
    const existingModal = document.querySelector('.appstore-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダル要素を作成
    const modal = document.createElement('div');
    modal.className = 'appstore-modal';
    modal.innerHTML = `
        <div class="appstore-modal-content">
            <div class="appstore-modal-header">
                <h3>📱 i-Reporter iOS版 - App Store</h3>
                <button class="appstore-modal-close" onclick="closeAppStoreModal()">&times;</button>
            </div>
            <div class="appstore-modal-body">
                <div class="appstore-info">
                    <div class="appstore-app-info">
                        <div class="appstore-app-icon">📱</div>
                        <div class="appstore-app-details">
                            <h4>ConMas i-Reporter</h4>
                            <p class="appstore-developer">CIMTOPS CORPORATION</p>
                            <div class="appstore-rating">
                                <span class="stars">★★★★☆</span>
                                <span class="rating-text">2.9 (110件の評価)</span>
                            </div>
                            <p class="appstore-price">無料</p>
                        </div>
                    </div>
                    <div class="appstore-description">
                        <p><strong>あらゆる現場の記録・報告・閲覧をiPadで変えます！</strong></p>
                        <p>ConMas i-Reporterは、あらゆる現場で行われている紙帳票を使用した記録・報告・閲覧をiPadを使用した現場完結型の全く新しいスタイルへ変えます。</p>
                        <p>もう事務所に戻って報告書の作成やシステムへのインプットを行う必要はありません。全てを現場でiPadのみで完結できます。</p>
                    </div>
                    <div class="appstore-actions">
                        <button class="appstore-download-btn" onclick="openAppStore()">
                            📥 App Storeでダウンロード
                        </button>
                        <button class="appstore-cancel-btn" onclick="closeAppStoreModal()">
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // スタイルを設定
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // モーダルコンテンツのスタイル
    const style = document.createElement('style');
    style.textContent = `
        .appstore-modal-content {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .appstore-modal.show .appstore-modal-content {
            transform: scale(1);
        }
        
        .appstore-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px 16px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .appstore-modal-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
            font-weight: 600;
        }
        
        .appstore-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        
        .appstore-modal-close:hover {
            background: #f8f9fa;
            color: #333;
        }
        
        .appstore-modal-body {
            padding: 20px 24px 24px;
        }
        
        .appstore-app-info {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 12px;
        }
        
        .appstore-app-icon {
            font-size: 48px;
            margin-right: 16px;
        }
        
        .appstore-app-details h4 {
            margin: 0 0 4px 0;
            color: #333;
            font-size: 20px;
            font-weight: 600;
        }
        
        .appstore-developer {
            margin: 0 0 8px 0;
            color: #666;
            font-size: 14px;
        }
        
        .appstore-rating {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .stars {
            color: #ffc107;
            margin-right: 8px;
            font-size: 14px;
        }
        
        .rating-text {
            color: #666;
            font-size: 12px;
        }
        
        .appstore-price {
            margin: 0;
            color: #28a745;
            font-size: 16px;
            font-weight: 600;
        }
        
        .appstore-description {
            margin-bottom: 24px;
        }
        
        .appstore-description p {
            margin: 0 0 12px 0;
            color: #555;
            line-height: 1.5;
            font-size: 14px;
        }
        
        .appstore-description p:last-child {
            margin-bottom: 0;
        }
        
        .appstore-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        
        .appstore-download-btn {
            background: linear-gradient(135deg, #007AFF, #0051D5);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
        }
        
        .appstore-download-btn:hover {
            background: linear-gradient(135deg, #0051D5, #003A9B);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
        }
        
        .appstore-cancel-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .appstore-cancel-btn:hover {
            background: #5a6268;
            transform: translateY(-2px);
        }
    `;
    
    if (!document.querySelector('#appstore-modal-styles')) {
        style.id = 'appstore-modal-styles';
        document.head.appendChild(style);
    }

    // ボディに追加
    document.body.appendChild(modal);

    // アニメーション
    setTimeout(() => {
        modal.classList.add('show');
        modal.style.opacity = '1';
    }, 10);
}

function closeAppStoreModal() {
    const modal = document.querySelector('.appstore-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function openAppStore() {
    // App Storeのリンクを開く
    window.open('https://apps.apple.com/jp/app/conmas-i-reporter/id467898034', '_blank');
    closeAppStoreModal();
    showNotification('📱 App Storeで「ConMas i-Reporter」を開いています', 'success');
}

function downloadFile(filename) {
    // iOS版の場合はApp Storeポップアップを表示
    if (filename.startsWith('appstore://')) {
        showAppStoreModal();
        return;
    }
    
    // ローカルファイルのパスを構築
    const localPath = `assets/installers/${filename}`;
    
    // file://プロトコルの場合はfetchが制限されるため、直接ダウンロードリンクを作成
    // ローカルファイルを優先的に試行
    try {
        const link = document.createElement('a');
        link.href = localPath;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // ダウンロード開始の通知
        showNotification(`📥 ${filename} のダウンロードを開始しました`, 'success');
        
        // ダウンロードが失敗した場合のフォールバック（少し遅延させて確認）
        setTimeout(() => {
            // もしローカルファイルが存在しない場合は、公式ページにフォールバック
            // ただし、file://プロトコルでは確認が難しいため、直接ダウンロードを試行
        }, 100);
    } catch (error) {
        console.error('ローカルファイルダウンロードエラー:', error);
        // エラーの場合、公式ページにフォールバック
        const baseUrl = 'https://cimtops-support.com/i-Reporter/ja/software-jp/';
        const downloadUrl = baseUrl + filename;
        window.open(downloadUrl, '_blank');
        showNotification(`⚠️ ローカルファイルにアクセスできません。公式ページを開きました`, 'info');
    }
}

function showNotification(message, type = 'info') {
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✅' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // スタイルを設定
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : '#bee5eb'};
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    // アニメーション用のCSSを追加
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .notification-icon {
                font-size: 16px;
            }
            .notification-message {
                font-size: 14px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ボディに追加
    document.body.appendChild(notification);
    
    // 3秒後に自動削除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function openPdfInNewWindow(pdfPath) {
    window.open(pdfPath, '_blank');
}

function handleDownloadLink(event) {
    event.stopPropagation();
}

function checkAllCompleted() {
    const progress = calculateOverallProgress();
    if (progress.completed === progress.total) {
        showCompletionMessage();
    }
}

function showCompletionMessage() {
    const completionModal = document.createElement('div');
    completionModal.className = 'completion-modal';
    completionModal.innerHTML = `
        <div class="completion-modal-content">
            <div class="completion-icon">🎉</div>
            <h2>お疲れさまでした！</h2>
            <p>i-Reporterの導入手順が完了しました。</p>
            <p>これで帳票定義チェックツールを使用できるようになりました。</p>
            <div class="completion-buttons">
                <button class="action-btn danger" onclick="resetProgress(); closeCompletionModal();">進捗をリセット</button>
                <button class="action-btn" onclick="closeCompletionModal()">閉じる</button>
                <a href="/" class="action-btn info">帳票定義チェックを開始</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(completionModal);
}

function closeCompletionModal() {
    const modal = document.querySelector('.completion-modal');
    if (modal) {
        modal.remove();
    }
}

function goToDefinitionCheck() {
    // 本アプリはサイトルートの index.html（帳票定義トレーニングルーム）
    window.location.href = new URL('/index.html', window.location.origin).href;
}

function openTroubleshooting() {
    window.open('https://help.i-reporter.jp/knowledge', '_blank');
}

function resetProgress() {
    if (confirm('進捗をリセットしますか？\n\nすべてのチェック項目が未完了状態に戻ります。')) {
        completedChecklistItems.clear();
        localStorage.removeItem('iReporterGuideProgress');
        generateAllSteps();
        updateOverallProgress();
        
        showResetMessage();
    }
}

function showResetMessage() {
    const resetModal = document.createElement('div');
    resetModal.className = 'completion-modal';
    resetModal.innerHTML = `
        <div class="completion-modal-content">
            <div class="completion-icon">🔄</div>
            <h2>進捗をリセットしました</h2>
            <p>すべてのチェック項目が未完了状態に戻りました。</p>
            <p>再度導入手順を進めることができます。</p>
            <div class="completion-buttons">
                <button class="action-btn primary" onclick="closeResetMessage()">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(resetModal);
}

function closeResetMessage() {
    const modal = document.querySelector('.completion-modal');
    if (modal) {
        modal.remove();
    }
}

function showPdf(pdfFile, pdfTitle) {
    const modal = document.getElementById('pdfModal');
    const titleElement = document.getElementById('pdfModalTitle');
    const viewer = document.getElementById('pdfViewer');
    
    titleElement.textContent = pdfTitle;
    viewer.src = pdfFile;
    modal.style.display = 'block';
}

function closePdfModal() {
    const modal = document.getElementById('pdfModal');
    const viewer = document.getElementById('pdfViewer');
    
    modal.style.display = 'none';
    viewer.src = '';
}

