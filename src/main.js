import pdfjsLib from './modules/pdf-worker.js';
import { initSetupCheckBanner, goToSetupGuide, closeSetupCheckBanner } from './modules/setup-banner.js';
import { playVideo, closeVideoModal, handleVideoModalClick, selectVideo, downloadFile, setReferenceFileHandler } from './modules/video.js';
import { performXmlComparison as performXmlComparisonCore } from './modules/compare/xml-compare.js';
import { getClusterTypeJapanese, extractParameter, compareClusterSettings as compareClusterSettingsCore, getChoiceDifference as getChoiceDifferenceCore, checkClusterDifference as checkClusterDifferenceCore } from './modules/compare/cluster-diff.js';
import { compareNetworkSettings as compareNetworkSettingsCore, checkNetworkDifference as checkNetworkDifferenceCore, getNetworkDifferenceDetails as getNetworkDifferenceDetailsCore, getNetworkPositionDifference as getNetworkPositionDifferenceCore, getNetworkRestrictionDifference as getNetworkRestrictionDifferenceCore } from './modules/compare/network-diff.js';

/**
 * ========================================
 * 帳票定義内容チェック - JavaScript設定ファイル
 * ========================================
 * 
 * 【概要】
 * このファイルは「帳票定義内容チェック」アプリケーションのメインJavaScriptファイルです。
 * XMLファイルの比較、可視化、差分検出機能を提供します。
 * 
 * 【主要機能】
 * 1. XMLファイル比較機能
 *    - 2つのXMLファイルをドラッグ&ドロップまたは選択で比較
 *    - 構造、クラスター設定、ネットワーク設定の差分検出
 * 
 * 2. クラスター設定可視化
 *    - PDFレイアウト形式でのクラスター配置表示
 *    - 基準XML vs 比較XMLの差分ハイライト表示
 *    - クラスター詳細情報の表示
 * 
 * 3. ネットワーク設定可視化
 *    - ネットワーク接続の矢印表示
 *    - 先行・後続ネットワークの可視化
 *    - ネットワーク設定の差分ハイライト表示
 * 
 * 4. 比較結果表示
 *    - タブ形式での結果表示（比較結果、構造比較、クラスター設定、ネットワーク設定、設定）
 *    - フィルタリング機能（全て表示、設定が異なる、設定が同じ）
 * 
 * 【主要な関数】
 * - compareXmlFile(): XMLファイル比較のメイン処理
 * - generatePdfLayout(): PDFレイアウト生成
 * - generateNetworkLayout(): ネットワークレイアウト生成
 * - generateComparePdfLayoutSingleView(): 比較用PDFレイアウト生成（比較XMLのみ表示）
 * - generateCompareNetworkLayoutSingleView(): 比較用ネットワークレイアウト生成（比較XMLのみ表示）
 * - checkClusterDifference(): クラスター差分判定
 * - checkNetworkDifference(): ネットワーク差分判定
 * 
 * 【使用方法】
 * 1. HTMLファイルから script.js を読み込み
 * 2. 基準XMLと比較XMLを選択
 * 3. 「比較を開始」ボタンで比較実行
 * 4. 各タブで結果を確認
 * 
 * 【表示モード】
 * - 比較表示（基準 vs 比較）: 比較XMLのみ表示、差分を赤色でハイライト
 * - 比較XMLのみ: 比較XMLのみ表示
 * - 基準XMLのみ: 基準XMLのみ表示
 * 
 * 【差分表示の色分け】
 * - 赤色: 基準XMLと設定が異なる箇所
 * - 青色: 基準XMLと設定が同じ箇所
 * - オレンジ色: 基準XMLの単一表示時
 * 
 * 【対応ファイル】
 * - difinition_check_Ver5.html: メインHTMLファイル
 * - styles.css: スタイルシートファイル
 * 
 * 【更新履歴】
 * - 2024年: 初期版作成
 * - 比較表示機能の追加
 * - 差分ハイライト機能の実装
 * - ネットワーク可視化機能の追加
 * 
 * ========================================
 */

// PDFファイルを読み込んでBase64に変換する関数
async function loadPdfAsBase64(pdfPath) {
    try {
        const response = await fetch(pdfPath);
        if (!response.ok) {
            throw new Error(`PDFファイルの読み込みに失敗: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        console.log('PDFファイルをBase64に変換しました:', { 
            path: pdfPath, 
            size: arrayBuffer.byteLength, 
            base64Length: base64.length 
        });
        return base64;
    } catch (error) {
        console.error('PDFファイル読み込みエラー:', error);
        return null;
    }
}

let file1 = null;  // 基準は選択式のためダミー { name, size } を設定
let file2 = null;

/**
 * 基準XMLに対応するフォールバックPDF（XMLに埋め込み背景がない場合に public/Material から読込）
 * STEP.1 → Def_Check_1.pdf、STEP.2 → Def_Check_2.pdf
 * @returns {string} ファイル名のみ
 */
function getFallbackPdfFileName() {
    const name = file1?.name || '';
    if (name === 'Definition_Complet.xml') return 'Def_Check_2.pdf';
    if (name === 'Definition_check.xml') return 'Def_Check_1.pdf';
    return 'Def_Check_1.pdf';
}

/** @returns {string} fetch 用パス（ビルド後は dist/Material/ 配下） */
function getFallbackPdfPath() {
    return `./Material/${getFallbackPdfFileName()}`;
}

// 基準XMLの配置先（public/xml）
const REFERENCE_XML_BASE_URL = '/xml/';
const REFERENCE_XML_MANIFEST_URL = '/xml/manifest.json';

/** XMLアップロードの最大サイズ（5MB） */
const MAX_XML_SIZE = 5 * 1024 * 1024;

/**
 * XSS対策: HTMLに挿入する文字列をエスケープする
 * @param {string|number|null|undefined} str - 表示する文字列
 * @returns {string}
 */
function escapeHtml(str) {
    if (str == null || str === undefined) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * XXE対策: DOCTYPE/ENTITY を含むXMLは解析せず拒否する
 * @param {string} xmlString - 解析前のXML文字列
 * @returns {{ ok: true, data: string }|{ ok: false, error: string }}
 */
function sanitizeXmlForParse(xmlString) {
    if (typeof xmlString !== 'string') {
        return { ok: false, error: '無効なデータです。' };
    }
    if (xmlString.includes('<!DOCTYPE') || xmlString.includes('<!ENTITY')) {
        return { ok: false, error: 'セキュリティのため、DOCTYPE/ENTITYを含むXMLは利用できません。' };
    }
    return { ok: true, data: xmlString };
}

/** クラスター詳細モーダル用：表示内容に関するユーザー向け説明（エスケープ表示の注意） */
function getClusterModalDisplayNote() {
    return `
        <div class="cluster-modal-display-note" style="margin-top: 1rem; padding: 0.75rem 1rem; background: #e8f4fc; border: 1px solid #b8daff; border-radius: 6px; font-size: 0.85rem; color: #004085;">
            💡 <strong>表示について</strong><br>
            XMLの値に <code>&lt;</code> <code>&gt;</code> <code>&amp;</code> などの記号が含まれる場合、セキュリティのため<strong>そのまま文字として</strong>表示しています。数式（例: x&lt;y）や「A&amp;B」のような表記がそのように見えても正常です。不具合ではありません。
        </div>
    `;
}

// PDFレイアウト表示用のグローバル変数
let xmlData1 = null;
let xmlData2 = null;
let currentSheetIndex = 0; // 現在表示中のシートインデックス
let totalSheets = 1; // 総シート数

function setReferenceXmlUi(filename, text) {
    xmlData1 = text;
    file1 = { name: filename, size: text.length };
    const info1 = document.getElementById('fileInfo1');
    if (info1) {
        info1.style.display = 'none';
        info1.innerHTML = '';
    }
    const refInfo = document.getElementById('referenceFileInfo');
    if (refInfo) {
        refInfo.style.display = 'block';
        const header = document.getElementById('referenceFileHeader');
        if (header) header.innerHTML = '';
        const details = document.getElementById('referenceFileDetails');
        if (details) details.innerHTML = `比較XMLをアップロードすると「比較を開始」が表示されます。`;
    }
    console.log('基準XML読み込み完了:', { filename, length: text.length });
    // 基準選択時点でプレビュー画面を表示
    showReferencePreview();
}

// 基準XML選択時のプレビュー画面表示（クラスター設定タブを表示）
function showReferencePreview() {
    const resultsEl = document.getElementById('results');
    if (!resultsEl) return;
    resultsEl.style.display = 'block';
    const networkLayoutTab = document.getElementById('network-layoutTab');
    const isNetworkTabActive = networkLayoutTab && networkLayoutTab.classList.contains('active');
    // ネットワーク設定タブ表示中に再読み込みされてもタブを切り替えず、両方のレイアウトだけ更新
    if (isNetworkTabActive) {
        updatePdfLayout();
        updateNetworkLayout();
        return;
    }
    // クラスター設定タブをアクティブに
    const pdfLayoutTab = document.getElementById('pdf-layoutTab');
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => { t.classList.remove('active'); t.style.display = 'none'; });
    if (pdfLayoutTab) {
        pdfLayoutTab.classList.add('active');
        pdfLayoutTab.style.display = 'block';
    }
    const tabBtns = document.querySelectorAll('.tabs .tab');
    tabBtns.forEach(b => b.classList.remove('active'));
    const pdfTabBtn = document.querySelector('.tabs .tab[onclick*="pdf-layout"]');
    if (pdfTabBtn) pdfTabBtn.classList.add('active');
    // シート選択を表示（複数シート時）
    const sheetContainer = document.getElementById('sheetSelectionContainer');
    if (sheetContainer) sheetContainer.style.display = 'block';
    updatePdfLayout();
    updateNetworkLayout(); // ネットワークタブ用も事前に生成しておく
}

function validateXmlStructure(doc, label) {
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        return `${label}のXML解析に失敗しました。`;
    }
    const root = doc.documentElement;
    if (!root || root.nodeName !== 'conmas') {
        return `${label}のルート要素が想定外です。`;
    }
    const sheets = doc.querySelectorAll('sheets sheet');
    if (sheets.length === 0) {
        return `${label}にシート情報が見つかりません。`;
    }
    return null;
}

// 選択された基準XMLを読み込み（fetch）
function loadReferenceXmlFromSelect() {
    const select = document.getElementById('referenceXmlSelect');
    if (!select || !select.value) {
        xmlData1 = null;
        file1 = null;
        const refInfo = document.getElementById('referenceFileInfo');
        if (refInfo) refInfo.style.display = 'none';
        const info1 = document.getElementById('fileInfo1');
        if (info1) { info1.style.display = 'none'; info1.innerHTML = ''; }
        // 基準未選択時はプレビュー領域を非表示
        const resultsEl = document.getElementById('results');
        if (resultsEl) resultsEl.style.display = 'none';
        checkReady();
        return;
    }
    const filename = select.value;
    const info1 = document.getElementById('fileInfo1');
    if (info1) {
        info1.style.display = 'block';
        info1.innerHTML = `<span class="file-status">基準XMLを読み込み中: ${escapeHtml(filename)}</span>`;
    }

    fetch(REFERENCE_XML_BASE_URL + filename)
        .then(r => {
            if (!r.ok) throw new Error(r.status === 404 ? 'ファイルが見つかりません' : 'HTTP ' + r.status);
            return r.text();
        })
        .then(text => {
            if (text.length > MAX_XML_SIZE) {
                xmlData1 = null;
                file1 = null;
                if (info1) info1.innerHTML = '<span class="file-status" style="color:#c00;">❌ 5MBを超えるXMLは読み込めません。</span>';
                checkReady();
                return;
            }
            const sanitized = sanitizeXmlForParse(text);
            if (!sanitized.ok) {
                xmlData1 = null;
                file1 = null;
                if (info1) info1.innerHTML = `<span class="file-status" style="color:#c00;">❌ ${escapeHtml(sanitized.error)}</span>`;
                checkReady();
                return;
            }
            setReferenceXmlUi(filename, sanitized.data);
            checkReady();
        })
        .catch(err => {
            xmlData1 = null;
            file1 = null;
            if (info1) info1.innerHTML = `<span class="file-status" style="color:#c00;">❌ 読み込み失敗: ${escapeHtml(err.message)}</span>`;
            const refInfo = document.getElementById('referenceFileInfo');
            if (refInfo) refInfo.style.display = 'none';
            console.warn('基準XML読み込み失敗:', filename, err);
            checkReady();
        });
}

async function loadReferenceXmlList() {
    const select = document.getElementById('referenceXmlSelect');
    if (!select) return;
    select.innerHTML = '<option value="">読み込み中...</option>';

    // 基準XMLはSTEP.1・STEP.2の2つから選択
    const referenceOptions = [
        { file: 'Definition_check.xml', label: 'STEP.1' },
        { file: 'Definition_Complet.xml', label: 'STEP.2' }
    ];

    select.innerHTML = '';
    referenceOptions.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.file;
        option.textContent = item.label;
        select.appendChild(option);
    });
    // デフォルトで1つ目を選択
    select.value = referenceOptions[0].file;
    loadReferenceXmlFromSelect();
}

document.addEventListener('DOMContentLoaded', () => {
    const refSelect = document.getElementById('referenceXmlSelect');
    if (refSelect) {
        refSelect.addEventListener('change', loadReferenceXmlFromSelect);
        loadReferenceXmlList();
    }
});

document.getElementById('fileInput2').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        file2 = e.target.files[0];
        const info = document.getElementById('fileInfo2');
        if (file2.size > 5 * 1024 * 1024) {
            if (info) {
                info.style.display = 'block';
                info.innerHTML = '<span class="file-status" style="color:#c00;">❌ 5MBを超えるXMLは読み込めません。</span>';
            }
            e.target.value = '';
            file2 = null;
            checkReady();
            return;
        }
        if (info) {
            info.style.display = 'block';
            info.innerHTML = `<strong>比較XML:</strong> ${escapeHtml(file2.name)} (${(file2.size / 1024).toFixed(2)} KB)`;
        }
    }
    checkReady();
});

function checkReady() {
    const refSelect = document.getElementById('referenceXmlSelect');
    const hasReference = refSelect && refSelect.value && xmlData1;
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.style.display = hasReference && file2 ? 'inline-block' : 'none';
    }
    const compareActionHint = document.getElementById('compareActionHint');
    if (compareActionHint) {
        compareActionHint.style.display = (hasReference && !file2) ? 'block' : 'none';
    }
}

function compareXmlFile() {
    const refSelect = document.getElementById('referenceXmlSelect');
    if (!refSelect || !refSelect.value || !xmlData1) {
        alert('基準XMLを一覧から選択してください。');
        return;
    }
    if (!file2) {
        alert('比較用XMLファイルをアップロードしてください。');
        return;
    }

    // PDFビューアーのみリセット
    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.innerHTML = '<div class="pdf-placeholder">ファイルを読み込み中...</div>';
    }
    currentSheetIndex = 0;
    totalSheets = 0;
    xmlData2 = null;

    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';

    const reader2 = new FileReader();
    reader2.onload = function(e2) {
        let xml2 = null;
        try {
            const xml1 = xmlData1;
            xml2 = e2.target.result;
            if (xml2.length > MAX_XML_SIZE) {
                alert('比較XMLが5MBを超えているため処理できません。');
                document.getElementById('loading').style.display = 'none';
                return;
            }
            const sanitized2 = sanitizeXmlForParse(xml2);
            if (!sanitized2.ok) {
                alert(sanitized2.error);
                document.getElementById('loading').style.display = 'none';
                return;
            }
            xml2 = sanitized2.data;
            xmlData2 = xml2;
            const parser = new DOMParser();
            const xmlDoc1 = parser.parseFromString(xml1, 'text/xml');
            const xmlDoc2 = parser.parseFromString(xml2, 'text/xml');
            const structureError1 = validateXmlStructure(xmlDoc1, '基準XML');
            const structureError2 = validateXmlStructure(xmlDoc2, '比較XML');
            if (structureError1 || structureError2) {
                const messages = [structureError1, structureError2].filter(Boolean).join('\n');
                alert(messages);
                document.getElementById('loading').style.display = 'none';
                return;
            }
            const sheets1 = xmlDoc1.querySelectorAll('sheets sheet');
            const sheets2 = xmlDoc2.querySelectorAll('sheets sheet');
            const baseFile = file1 || { name: '基準XML', size: xml1.length };
            console.log('XMLデータ保存完了:', { file1Length: xml1.length, file2Length: xml2.length, file1Name: baseFile.name, file2Name: file2.name, totalSheets1: sheets1.length, totalSheets2: sheets2.length });

            if (baseFile.name === file2.name) {
                const sameFileResult = {
                    differences: [],
                    matches: ['同じファイル名のため完全一致'],
                    summary: { totalDifferences: 0, totalMatches: 1, totalComparisons: 1 },
                    structure: {
                        sheets: { ref: 0, up: 0, match: true },
                        clusters: { ref: 0, up: 0, match: true },
                        actions: { ref: 0, up: 0, match: true },
                        dates: { ref: 0, up: 0, match: true },
                        numerics: { ref: 0, up: 0, match: true },
                        calculates: { ref: 0, up: 0, match: true },
                        networks: { ref: 0, up: 0, match: true },
                        valueLinks: { ref: 0, up: 0, match: true },
                        customMasters: { ref: 0, up: 0, match: true },
                        multipleChoices: { ref: 0, up: 0, match: true },
                        selectMasters: { ref: 0, up: 0, match: true }
                    }
                };
                displayResults(sameFileResult);
            } else {
                const comparisonResult = performXmlComparison(xml1, xml2);
                displayResults(comparisonResult);
            }
            document.getElementById('pdfFileSelect').value = 'compare';
            autoDisplayPdfBackground();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('results').style.display = 'block';
            setTimeout(() => {
                const pdfLayoutTab = document.getElementById('pdf-layoutTab');
                const networkLayoutTab = document.getElementById('network-layoutTab');
                if (pdfLayoutTab) pdfLayoutTab.classList.add('active');
                if (networkLayoutTab) networkLayoutTab.classList.remove('active');
                updatePdfLayout();
                updateNetworkLayout();
            }, 100);
        } catch (error) {
            console.error('比較エラー:', error);
            let errorMessage = 'ファイルの比較中にエラーが発生しました。\n\n' + `エラー詳細: ${error.message}\n`;
            if (xmlData1 && xml2) {
                errorMessage += `\nXMLデータ1の長さ: ${xmlData1.length} 文字\nXMLデータ2の長さ: ${xml2.length} 文字\n`;
            }
            showDebugInfo(error, xmlData1, xml2);
            alert(errorMessage);
            document.getElementById('loading').style.display = 'none';
        }
    };
    reader2.readAsText(file2);
}

function performXmlComparison(xml1, xml2) {
    return performXmlComparisonCore(xml1, xml2, { file1, file2 });
}

function displayResults(result) {
    // 結果オブジェクトのnullチェック
    if (!result) {
        console.error('displayResults: resultがnullまたはundefinedです');
        return;
    }
    
    // ファイル名の安全な取得
    const baseFileName = file1?.name || '基準XML（選択済み）';
    const compareFileName = file2?.name || '比較XML';
    
    // 比較完了メッセージは表示しない（クラスター設定・ネットワーク設定タブの凡例で十分）
    const resultBox = document.getElementById('resultBox');
    if (resultBox) {
        resultBox.innerHTML = '';
    }
        
        // 比較結果タブの内容を更新
        const resultsSummary = document.getElementById('resultsSummary');
        if (resultsSummary) {
            const differences = result.differences || [];
            const matches = result.matches || [];
            
            resultsSummary.innerHTML = `
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-number">${differences.length}</div>
                        <div class="summary-label">総差分数</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${matches.length}</div>
                        <div class="summary-label">一致項目数</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">11</div>
                        <div class="summary-label">比較項目数</div>
                    </div>
                </div>
                <div class="difference-list">
                    <h4>🔍 検出された差分</h4>
                    ${differences.length > 0 ? 
                        differences.map(diff => `<div class="difference-item">${escapeHtml(diff.description || diff)}</div>`).join('') :
                        '<div class="difference-item" style="color: #2e7d32;">差分は検出されませんでした</div>'
                    }
                    <p class="difference-list-note" style="margin-top: 0.75rem; font-size: 0.8rem; color: #6c757d;">※ 値に &lt; &gt; &amp; などの記号がそのまま表示される場合があります。セキュリティのため文字として表示しているもので、不具合ではありません。</p>
                </div>
            `;
        }
        
        // 構造比較タブの内容を更新
        const structureDetails = document.getElementById('structureDetails');
        if (structureDetails && result.structure) {
            const structure = result.structure;
            
            structureDetails.innerHTML = `
                <div class="structure-analysis">
                    <h4>📋 構造分析結果</h4>
                    <div class="structure-item">
                        <strong>シート構成:</strong> 基準ファイル: ${structure.sheets?.ref || 0}シート、比較ファイル: ${structure.sheets?.up || 0}シート（${structure.sheets?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>クラスター構成:</strong> 基準ファイル: ${structure.clusters?.ref || 0}クラスター、比較ファイル: ${structure.clusters?.up || 0}クラスター（${structure.clusters?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>アクションクラスター:</strong> 基準ファイル: ${structure.actions?.ref || 0}個、比較ファイル: ${structure.actions?.up || 0}個（${structure.actions?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>日付クラスター:</strong> 基準ファイル: ${structure.dates?.ref || 0}個、比較ファイル: ${structure.dates?.up || 0}個（${structure.dates?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>数値入力クラスター:</strong> 基準ファイル: ${structure.numerics?.ref || 0}個、比較ファイル: ${structure.numerics?.up || 0}個（${structure.numerics?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>計算クラスター:</strong> 基準ファイル: ${structure.calculates?.ref || 0}個、比較ファイル: ${structure.calculates?.up || 0}個（${structure.calculates?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>ネットワーク設定:</strong> 基準ファイル: ${structure.networks?.ref || 0}個、比較ファイル: ${structure.networks?.up || 0}個（${structure.networks?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>バリューリンク:</strong> 基準ファイル: ${structure.valueLinks?.ref || 0}個、比較ファイル: ${structure.valueLinks?.up || 0}個（${structure.valueLinks?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>カスタムマスター:</strong> 基準ファイル: ${structure.customMasters?.ref || 0}個、比較ファイル: ${structure.customMasters?.up || 0}個（${structure.customMasters?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>複数選択数値クラスター:</strong> 基準ファイル: ${structure.multipleChoices?.ref || 0}個、比較ファイル: ${structure.multipleChoices?.up || 0}個（${structure.multipleChoices?.match ? '一致' : '不一致'}）
                    </div>
                    <div class="structure-item">
                        <strong>マスター選択クラスター:</strong> 基準ファイル: ${structure.selectMasters?.ref || 0}個、比較ファイル: ${structure.selectMasters?.up || 0}個（${structure.selectMasters?.match ? '一致' : '不一致'}）
                    </div>
                </div>
            `;
        }
}

function showTab(tabName) {
    console.log('タブ切り替え:', tabName);
    
    // すべてのタブコンテンツを非表示（クラスとインライン display の両方をリセット）
    // showReferencePreview が style.display を設定しているため、ここでも明示して正しいタブだけ表示する
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // すべてのタブボタンからactiveクラスを削除
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 選択されたタブをアクティブに表示
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
        console.log('タブコンテンツをアクティブにしました:', tabName + 'Tab');
    } else {
        console.error('タブコンテンツが見つかりません:', tabName + 'Tab');
    }
    
    // クリックされたボタンをアクティブに
    const clickedButton = event.target;
    if (clickedButton) {
        clickedButton.classList.add('active');
        console.log('ボタンをアクティブにしました:', clickedButton.textContent);
    }
    
    // PDFレイアウトタブが選択された場合、レイアウトを更新
    if (tabName === 'pdf-layout') {
        console.log('PDFレイアウト更新を開始');
        console.log('XMLデータ状態:', {
            hasXmlData1: !!xmlData1,
            hasXmlData2: !!xmlData2,
            xmlData1Length: xmlData1 ? xmlData1.length : 0,
            xmlData2Length: xmlData2 ? xmlData2.length : 0
        });
        setTimeout(() => {
            updatePdfLayout();
        }, 100);
    }
    
    // ネットワーク設定タブが選択された場合、既に内容があってもタブ表示後に1回だけ更新（二重実行しない）
    if (tabName === 'network-layout') {
        console.log('ネットワーク設定更新を開始');
        console.log('XMLデータ状態:', {
            hasXmlData1: !!xmlData1,
            hasXmlData2: !!xmlData2,
            xmlData1Length: xmlData1 ? xmlData1.length : 0,
            xmlData2Length: xmlData2 ? xmlData2.length : 0
        });
        setTimeout(() => updateNetworkLayout(), 100);
    }
}

// 動画ファイルのパスマッピング（ローカルファイル）
/**
 * PDF.jsを使用してPDFを画像としてCanvasに描画する関数
 * @param {string} pdfBase64 - Base64エンコードされたPDFデータ
 * @param {string} canvasId - Canvas要素のID
 * @param {number} targetWidth - 目標の幅（ピクセル）
 * @param {number} targetHeight - 目標の高さ（ピクセル）
 */
function renderPdfAsImage(pdfBase64, canvasId, targetWidth, targetHeight, pageNumber = null) {
    if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.jsライブラリが読み込まれていません。');
        return;
    }
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas要素が見つかりません: ${canvasId}`);
        return;
    }
    
    // ページ番号が指定されていない場合は、currentSheetIndex + 1を使用（1ベース）
    // シートごとに異なるPDFが設定されている場合は、常に1ページ目を表示
    const targetPage = pageNumber !== null ? pageNumber : (currentSheetIndex + 1);
    
    // Base64データをUint8Arrayに変換
    const pdfData = atob(pdfBase64);
    const pdfBytes = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
        pdfBytes[i] = pdfData.charCodeAt(i);
    }
    
    // PDFを読み込む
    pdfjsLib.getDocument({ data: pdfBytes }).promise.then(function(pdf) {
        console.log(`PDF読み込み完了 (${canvasId}):`, pdf.numPages, 'ページ');
        
        // 指定されたページ番号を取得（1ベース、範囲チェック）
        const pageNum = Math.min(Math.max(1, targetPage), pdf.numPages);
        console.log(`PDFページ取得 (${canvasId}): ページ${pageNum}を表示（シート${currentSheetIndex + 1}、総ページ数: ${pdf.numPages}）`);
        
        // 指定されたページを取得
        return pdf.getPage(pageNum);
    }).then(function(page) {
        console.log(`PDFページ取得完了 (${canvasId})`);
        
        // 元のビューポートを取得
        const viewport = page.getViewport({ scale: 1.0 });
        
        // 目標サイズに合わせてスケールを計算
        const scale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
        const scaledViewport = page.getViewport({ scale: scale });
        
        // Canvasのサイズを設定
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        // Canvasのスタイルサイズも設定（表示サイズ）
        canvas.style.width = targetWidth + 'px';
        canvas.style.height = targetHeight + 'px';
        
        const context = canvas.getContext('2d');
        
        // PDFページをcanvasに描画
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        
        return page.render(renderContext).promise.then(function() {
            console.log(`PDFページの描画完了 (${canvasId})`);
        });
    }).catch(function(error) {
        console.error(`PDFの描画に失敗しました (${canvasId}):`, error);
    });
}

function setReferenceFile() {
    file2 = null;
    xmlData2 = null;
    const info2 = document.getElementById('fileInfo2');
    if (info2) { info2.style.display = 'none'; info2.innerHTML = ''; }
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) compareBtn.style.display = 'none';
    
    const refSelect = document.getElementById('referenceXmlSelect');
    if (refSelect) {
        refSelect.value = 'exercise_definition_complete.xml';
        loadReferenceXmlFromSelect();
    }
    loadReferencePdfLayout();
}

setReferenceFileHandler(setReferenceFile);

function loadReferencePdfLayout() {
    // 基準ファイルのPDFレイアウトを設定
    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.innerHTML = `
            <div class="pdf-placeholder">
                <div style="text-align: center; padding: 2rem;">
                    <h3 style="color: #28a745; margin-bottom: 1rem;">📄 基準ファイルPDFレイアウト</h3>
                    <p style="color: #155724; margin-bottom: 1rem;">
                        基準XMLで <strong>STEP.1</strong> のとき <strong>Def_Check_1.pdf</strong>、<strong>STEP.2</strong> のとき <strong>Def_Check_2.pdf</strong>（<code>Material</code> フォルダ）を背景として使用します。
                    </p>
                    <div style="background: #e8f5e8; border: 2px solid #28a745; border-radius: 10px; padding: 1rem; margin: 1rem 0;">
                        <strong>📋 基準ファイル情報:</strong>
                        <ul style="text-align: left; margin: 1rem 0; padding-left: 1.5rem; color: #155724;">
                            <li>STEP.1: Definition_check.xml → Def_Check_1.pdf</li>
                            <li>STEP.2: Definition_Complet.xml → Def_Check_2.pdf</li>
                            <li>XMLに背景が埋め込まれている場合はそちらを優先します</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 0.9rem;">
                        比較用XMLを選択して「比較を開始」すると、上記PDFレイアウト上にクラスターが配置されます
                    </p>
                </div>
            </div>
        `;
    }
    
    // PDF情報を更新（プレースホルダー：実際の表示は比較開始後に更新）
    if (document.getElementById('pdfSheetName')) {
        document.getElementById('pdfSheetName').textContent = 'STEP.1 / STEP.2 を選択';
    }
    if (document.getElementById('pdfBackground')) {
        document.getElementById('pdfBackground').textContent = 'Def_Check_1 / Def_Check_2.pdf';
    }
}



function autoDisplayPdfBackground() {
    // 基準XMLのXMLデータからPDF背景情報を自動取得
    if (!xmlData1) return;
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData1, 'text/xml');
        const sheets = xmlDoc.querySelectorAll('sheets sheet');
        
        if (sheets.length === 0) return;
        
        const sheetIndex = currentSheetIndex || 0;
        const sheet = sheets[sheetIndex];
        const width = parseFloat(sheet.querySelector('width')?.textContent || '595.32');
        const height = parseFloat(sheet.querySelector('height')?.textContent || '841.92');
        
        // シートから背景画像を取得（シートにない場合はルートレベルから取得）
        const backgroundImage = sheet.querySelector('backgroundImage')?.textContent || 
                                xmlDoc.querySelector('backgroundImage')?.textContent;
        
        // PDF背景を表示
        displayPdfBackgroundFromXml(backgroundImage, width, height);
        
    } catch (error) {
        console.error('PDF背景自動表示エラー:', error);
        // エラーの場合はデフォルトの背景を表示
        displayDefaultPdfBackground();
    }
}

// PDF表示用のグローバル変数
let pdfScale = 1.0;
let pdfOriginalWidth = 0;
let pdfOriginalHeight = 0;

function displayPdfBackgroundFromXml(backgroundImage, width, height) {
    const pdfViewer = document.getElementById('pdfViewer');
    if (!pdfViewer) return;
    
    // PDFの元のサイズを保存
    pdfOriginalWidth = width || 595; // A4幅のデフォルト値（pt）
    pdfOriginalHeight = height || 842; // A4高さのデフォルト値（pt）
    
    if (backgroundImage) {
        // 初期スケールを計算（画面に収まるサイズ）
        const initialScale = Math.min(1.0, 600 / pdfOriginalHeight, 800 / pdfOriginalWidth);
        pdfScale = initialScale;
        const scaledWidth = pdfOriginalWidth * pdfScale;
        const scaledHeight = pdfOriginalHeight * pdfScale;
        
        // XMLに背景画像情報がある場合
        pdfViewer.innerHTML = `
            <div id="pdfContainer" style="
                position: relative;
                width: 100%;
                height: 600px;
                border: 3px solid #ddd;
                border-radius: 15px;
                background: white;
                overflow: auto;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            ">
                <div id="pdfContent" style="
                    position: relative;
                    width: ${scaledWidth}px;
                    height: ${scaledHeight}px;
                    margin: 20px auto;
                ">
                    <!-- PDF背景 -->
                    <div id="pdfBackground" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth}px;
                        height: ${scaledHeight}px;
                        background-image: url('data:image/png;base64,${backgroundImage}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: top left;
                        z-index: 1;
                    "></div>
                    
                    <!-- クラスター表示エリア -->
                    <div id="clusterOverlay" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth}px;
                        height: ${scaledHeight}px;
                        z-index: 2;
                    "></div>
                </div>
                
                <!-- PDF情報表示 -->
                <div style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    z-index: 3;
                    pointer-events: none;
                ">
                    📄 XML内埋め込み背景
                </div>
            </div>
        `;
        
        // マウスホイールで拡大縮小（CtrlキーまたはCmdキーを押しながら）
        const pdfContainer = document.getElementById('pdfContainer');
        if (pdfContainer) {
            pdfContainer.addEventListener('wheel', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    pdfScale = Math.max(0.5, Math.min(3.0, pdfScale + delta));
                    updatePdfScale();
                }
            }, { passive: false });
        }
    } else {
        // 背景画像情報がない場合はデフォルト表示
        displayDefaultPdfBackground();
    }
    
    // クラスター情報がある場合は表示
    if (xmlData2) {
        displayClustersOnPdf();
    }
}

function updatePdfScale() {
    const pdfContent = document.getElementById('pdfContent');
    const pdfBackground = document.getElementById('pdfBackground');
    const clusterOverlay = document.getElementById('clusterOverlay');
    
    if (!pdfContent || !pdfOriginalWidth || !pdfOriginalHeight) return;
    
    // transform: scale()を使わず、実際のサイズを変更
    const newWidth = pdfOriginalWidth * pdfScale;
    const newHeight = pdfOriginalHeight * pdfScale;
    
    pdfContent.style.width = newWidth + 'px';
    pdfContent.style.height = newHeight + 'px';
    
    // 背景画像/PDFのサイズも更新
    if (pdfBackground) {
        pdfBackground.style.width = newWidth + 'px';
        pdfBackground.style.height = newHeight + 'px';
    }
    
    // クラスターオーバーレイのサイズも更新
    if (clusterOverlay) {
        clusterOverlay.style.width = newWidth + 'px';
        clusterOverlay.style.height = newHeight + 'px';
    }
    
    // クラスター位置も更新
    const clusterOverlays = document.querySelectorAll('.cluster-overlay');
    clusterOverlays.forEach((cluster) => {
        const originalTop = parseFloat(cluster.dataset.originalTop || '0');
        const originalLeft = parseFloat(cluster.dataset.originalLeft || '0');
        const originalWidth = parseFloat(cluster.dataset.originalWidth || '0');
        const originalHeight = parseFloat(cluster.dataset.originalHeight || '0');
        
        if (originalTop > 0 || originalLeft > 0 || originalWidth > 0 || originalHeight > 0) {
            cluster.style.top = (originalTop * pdfScale) + 'px';
            cluster.style.left = (originalLeft * pdfScale) + 'px';
            cluster.style.width = (originalWidth * pdfScale) + 'px';
            cluster.style.height = (originalHeight * pdfScale) + 'px';
        }
    });
}

function displayDefaultPdfBackground() {
    const pdfViewer = document.getElementById('pdfViewer');
    if (!pdfViewer) return;
    
    // PDFの元のサイズを保存（デフォルト値）
    pdfOriginalWidth = 595; // A4幅のデフォルト値（pt）
    pdfOriginalHeight = 842; // A4高さのデフォルト値（pt）
    
    // 初期スケールを計算
    const initialScale = Math.min(1.0, 600 / pdfOriginalHeight, 800 / pdfOriginalWidth);
    pdfScale = initialScale;
    const scaledWidth = pdfOriginalWidth * pdfScale;
    const scaledHeight = pdfOriginalHeight * pdfScale;
    
    pdfViewer.innerHTML = `
        <div id="pdfContainer" style="
            position: relative;
            width: 100%;
            height: 600px;
            border: 3px solid #ddd;
            border-radius: 15px;
            background: white;
            overflow: auto;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        ">
            <div id="pdfContent" style="
                position: relative;
                width: ${scaledWidth}px;
                height: ${scaledHeight}px;
                margin: 20px auto;
            ">
                <!-- デフォルト背景（チェッカーパターン） -->
                <div id="pdfBackground" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scaledWidth}px;
                    height: ${scaledHeight}px;
                    background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                                linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                                linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                    z-index: 1;
                "></div>
                
                <!-- クラスター表示エリア -->
                <div id="clusterOverlay" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scaledWidth}px;
                    height: ${scaledHeight}px;
                    z-index: 2;
                "></div>
            </div>
            
            <!-- PDF情報表示 -->
            <div style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.9rem;
                z-index: 3;
                pointer-events: none;
            ">
                📄 ${escapeHtml(getFallbackPdfFileName())}（デフォルト背景・未埋め込み時はこのPDFを読込）
            </div>
        </div>
    `;
    
    // マウスホイールで拡大縮小（CtrlキーまたはCmdキーを押しながら）
    const pdfContainer = document.getElementById('pdfContainer');
    if (pdfContainer) {
        pdfContainer.addEventListener('wheel', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                pdfScale = Math.max(0.5, Math.min(3.0, pdfScale + delta));
                updatePdfScale();
            }
        }, { passive: false });
    }
    
    // クラスター情報がある場合は表示
    if (xmlData2) {
        displayClustersOnPdf();
    }
}

function displayClustersOnPdf() {
    if (!xmlData2) return;
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData2, 'text/xml');
        const sheets = xmlDoc.querySelectorAll('sheets sheet');
        
        if (sheets.length === 0) return;
        
        const sheet = sheets[currentSheetIndex || 0];
        const clusters = sheet.querySelectorAll('clusters cluster');
        
        const clusterOverlay = document.getElementById('clusterOverlay');
        if (!clusterOverlay) return;
        
        // PDFの実際のサイズを取得
        const pdfContent = document.getElementById('pdfContent');
        if (!pdfContent) return;
        
        // 現在のスケールを取得
        const currentScale = pdfScale || 1.0;
        
        // PDFの元のサイズを使用（pt単位）
        const pdfWidth = pdfOriginalWidth || 595;
        const pdfHeight = pdfOriginalHeight || 842;
        
        let clustersHtml = '';
        clusters.forEach((cluster, index) => {
            // XMLから座標を取得（0.0-1.0の範囲）
            const top = parseFloat(cluster.querySelector('top')?.textContent || '0');
            const left = parseFloat(cluster.querySelector('left')?.textContent || '0');
            const right = parseFloat(cluster.querySelector('right')?.textContent || '0');
            const bottom = parseFloat(cluster.querySelector('bottom')?.textContent || '0');
            
            // PDFのサイズに基づいてピクセル単位で計算（元のサイズ）
            const clusterTopOriginal = top * pdfHeight;
            const clusterLeftOriginal = left * pdfWidth;
            const clusterWidthOriginal = (right - left) * pdfWidth;
            const clusterHeightOriginal = (bottom - top) * pdfHeight;
            
            // スケールを適用
            const clusterTop = clusterTopOriginal * currentScale;
            const clusterLeft = clusterLeftOriginal * currentScale;
            const clusterWidth = clusterWidthOriginal * currentScale;
            const clusterHeight = clusterHeightOriginal * currentScale;
            
            // クラスターの色を決定（基準XMLと比較して差分を判定）
            let borderColor = '#007bff';
            let backgroundColor = 'rgba(0, 123, 255, 0.15)';
            let isDifferent = false;
            
            if (xmlData1) {
                const diffResult = checkClusterDifference(cluster, index);
                isDifferent = diffResult.hasDifference;
                if (isDifferent) {
                    borderColor = '#dc3545';
                    backgroundColor = 'rgba(220, 53, 69, 0.15)';
                }
            }
            
            clustersHtml += `
                <div class="cluster-overlay" 
                     style="
                         position: absolute;
                         top: ${clusterTop}px;
                         left: ${clusterLeft}px;
                         width: ${clusterWidth}px;
                         height: ${clusterHeight}px;
                         border: none;
                         background: transparent;
                         border-radius: 8px;
                         cursor: pointer;
                         z-index: 3;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                     "
                     data-cluster-index="${index}"
                     data-diff="${isDifferent ? 'different' : 'same'}"
                     data-original-top="${clusterTopOriginal}"
                     data-original-left="${clusterLeftOriginal}"
                     data-original-width="${clusterWidthOriginal}"
                     data-original-height="${clusterHeightOriginal}">
                    <div class="cluster-label" style="
                        background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor === '#007bff' ? '#0056b3' : '#c82333'} 100%);
                        color: white;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        white-space: nowrap;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">${index}</div>
                    ${isDifferent ? '<div class="cluster-difference-indicator">!</div>' : ''}
                </div>
            `;
        });
        
        clusterOverlay.innerHTML = clustersHtml;
        
    } catch (error) {
        console.error('クラスター表示エラー:', error);
    }
}

function applySettings() {
    alert('設定を適用しました。');
}

function resetSettings() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    alert('設定をデフォルトに戻しました。');
}

function selectAllSettings() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllSettings() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// 設定タブ用の関数
function selectAllDisplaySettings() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    // 設定変更後にレイアウトを更新
    updatePdfLayout();
}

function clearAllDisplaySettings() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    // 設定変更後にレイアウトを更新
    updatePdfLayout();
}

function resetDisplaySettings() {
    // デフォルト設定に戻す
    const defaultSettings = {
        'show_cluster_id': true,
        'show_cluster_name': true,
        'show_cluster_type': true,
        'show_network_info': true,
        'show_value_links': true,
        'show_network_position': false,
        'show_network_restrictions': false,
        'show_choices': true,
        'show_parameters': true,
        'show_choice_details': false,
        'show_differences': true,
        'show_tooltips': true
    };
    
    Object.keys(defaultSettings).forEach(settingId => {
        const checkbox = document.getElementById(settingId);
        if (checkbox) {
            checkbox.checked = defaultSettings[settingId];
        }
    });
    
    // 設定変更後にレイアウトを更新
    updatePdfLayout();
}

async function updatePdfLayout() {
    if (window.__isUpdatingPdfLayout) return;
    window.__isUpdatingPdfLayout = true;
    
    // 非表示になった要素から値を取得（存在しない場合はデフォルト値を使用）
    const pdfFileSelect = document.getElementById('pdfFileSelect');
    const pdfDisplayMode = document.getElementById('pdfDisplayMode');
    const fileSelect = pdfFileSelect ? pdfFileSelect.value : 'compare';
    const displayMode = pdfDisplayMode ? pdfDisplayMode.value : 'compare';
    const scale = 1.2; // 120%デフォルト
    
    // スケール表示を更新（デフォルト表示）
    const scaleValue = document.getElementById('scaleValue');
    if (scaleValue) {
        scaleValue.textContent = '120% (デフォルト)';
    }
    
    console.log('PDFレイアウト更新:', { 
        fileSelect, 
        displayMode, 
        scale, 
        currentSheetIndex,
        totalSheets,
        hasXmlData1: !!xmlData1, 
        hasXmlData2: !!xmlData2 
    });
    
    // 比較用ファイルのみを表示（裏側で基準ファイルと比較）
    if (fileSelect === 'compare' && xmlData1 && xmlData2) {
        console.log('比較モードでPDFレイアウト生成開始');
        console.log('XMLデータ1の長さ:', xmlData1.length);
        console.log('XMLデータ2の長さ:', xmlData2.length);
        await generateComparePdfLayoutSingleView(xmlData1, xmlData2, displayMode, scale);
        window.__isUpdatingPdfLayout = false;
        return;
    }
    
    // 基準XMLのみ選択時（プレビュー表示）: 基準のクラスター設定を表示
    if (xmlData1 && !xmlData2) {
        console.log('基準XMLプレビューモードでPDFレイアウト生成');
        await generatePdfLayout(xmlData1, 'compare', scale, 'file1');
        window.__isUpdatingPdfLayout = false;
        return;
    }
    
    // 比較XMLのみを表示
    const xmlData = xmlData2;
    
    console.log('単一ファイルモード:', { xmlData: !!xmlData, xmlDataLength: xmlData?.length });
    
    if (!xmlData) {
        document.getElementById('pdfViewer').innerHTML = `
            <div class="pdf-placeholder">
                <div style="text-align: center; padding: 2rem;">
                    <h3 style="color: #ff9500; margin-bottom: 1rem;">📄 PDFレイアウト表示</h3>
                    <p style="color: #666; margin-bottom: 1rem;">
                        XMLファイルを選択して比較を実行してください。
                    </p>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 1rem; margin: 1rem 0;">
                        <strong>手順:</strong>
                        <ol style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
                            <li>基準XMLファイルを選択</li>
                            <li>比較XMLファイルを選択</li>
                            <li>「比較を開始」ボタンをクリック</li>
                            <li>PDFレイアウトタブで結果を確認</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        // PDF情報も更新
        document.getElementById('pdfSize').textContent = '-';
        document.getElementById('pdfClusterCount').textContent = '-';
        document.getElementById('pdfBackground').textContent = '-';
        return;
    }
    
    // 単一ファイルのPDFレイアウトを生成
    await generatePdfLayout(xmlData, displayMode, scale, fileSelect);
    window.__isUpdatingPdfLayout = false;
}

async function generatePdfLayout(xmlData, displayMode, scale, fileSelect) {
    const viewer = document.getElementById('pdfViewer');
    
    // プレビュー画面上でちょうど収まるスケールを計算
    const viewerRect = viewer.getBoundingClientRect();
    const viewerWidth = viewerRect.width - 40; // パディング分を引く
    const viewerHeight = viewerRect.height - 40; // パディング分を引く
    
    // 基準XMLのPDF背景を取得
    let referenceBackgroundImage = null;
    let referenceWidth = 595.32;
    let referenceHeight = 841.92;
    let cleanedReferenceBackgroundImage = null;
    
    if (xmlData1) {
        try {
            const parser = new DOMParser();
            const referenceDoc = parser.parseFromString(xmlData1, 'text/xml');
            const referenceSheets = referenceDoc.querySelectorAll('sheets sheet');
            
            // 現在のシートに対応する基準XMLのシートから背景画像を取得
            if (referenceSheets.length > 0 && currentSheetIndex < referenceSheets.length) {
                const referenceSheet = referenceSheets[currentSheetIndex];
                // シートから背景画像を取得（シートにない場合はルートレベルから取得）
                referenceBackgroundImage = referenceSheet.querySelector('backgroundImage')?.textContent || 
                                          referenceDoc.querySelector('backgroundImage')?.textContent;
                referenceWidth = parseFloat(referenceSheet.querySelector('width')?.textContent || '595.32');
                referenceHeight = parseFloat(referenceSheet.querySelector('height')?.textContent || '841.92');
            } else {
                // シートが存在しない場合はルートレベルから取得
            referenceBackgroundImage = referenceDoc.querySelector('backgroundImage')?.textContent;
            }
            
            console.log('基準XML背景画像:', { 
                hasBackground: !!referenceBackgroundImage, 
                backgroundLength: referenceBackgroundImage?.length,
                backgroundStart: referenceBackgroundImage?.substring(0, 50) + '...',
                currentSheetIndex,
                totalSheets: referenceSheets.length
            });
            
            // 背景画像データの品質チェック
            if (referenceBackgroundImage) {
                console.log('単一ファイル背景画像データの品質チェック:', {
                    dataLength: referenceBackgroundImage.length,
                    dataType: typeof referenceBackgroundImage,
                    containsNewlines: referenceBackgroundImage.includes('\n'),
                    containsSpaces: referenceBackgroundImage.includes(' '),
                    containsTabs: referenceBackgroundImage.includes('\t'),
                    containsInvalidChars: /[^A-Za-z0-9+/=]/.test(referenceBackgroundImage),
                    paddingCheck: referenceBackgroundImage.length % 4 === 0,
                    firstChar: referenceBackgroundImage.charAt(0),
                    lastChar: referenceBackgroundImage.charAt(referenceBackgroundImage.length - 1),
                    isBase64Valid: /^[A-Za-z0-9+/]*={0,2}$/.test(referenceBackgroundImage)
                });
                
                // データのクリーニングを試行
                cleanedReferenceBackgroundImage = referenceBackgroundImage;
                if (referenceBackgroundImage.includes('\n') || referenceBackgroundImage.includes(' ') || referenceBackgroundImage.includes('\t')) {
                    cleanedReferenceBackgroundImage = referenceBackgroundImage.replace(/[\r\n\s\t]/g, '');
                    console.log('単一ファイル背景画像データをクリーニングしました:', {
                        originalLength: referenceBackgroundImage.length,
                        cleanedLength: cleanedReferenceBackgroundImage.length,
                        cleanedStart: cleanedReferenceBackgroundImage.substring(0, 50) + '...'
                    });
                }
            }
        } catch (error) {
            console.error('基準XMLの背景取得エラー:', error);
        }
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
    
    // XML解析エラーの確認
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('XML解析エラー:', parserError.textContent);
        viewer.innerHTML = '<div class="pdf-placeholder">XML解析エラーが発生しました</div>';
        return;
    }
    
    // シート情報を取得
    const sheets = xmlDoc.querySelectorAll('sheets sheet');
    if (sheets.length === 0) {
        viewer.innerHTML = '<div class="pdf-placeholder">シート情報が見つかりません</div>';
        return;
    }
    
    // シート情報をグローバル変数に保存
    totalSheets = sheets.length;
    if (currentSheetIndex >= totalSheets) {
        currentSheetIndex = 0;
    }
    
    console.log('generatePdfLayout - シート情報:', {
        currentSheetIndex,
        totalSheets,
        sheetName: sheets[currentSheetIndex]?.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`
    });
    
    // シートナビゲーションを更新
    updateSheetNavigation();
    
    const sheet = sheets[currentSheetIndex];
    const width = parseFloat(sheet.querySelector('width')?.textContent || '595.32');
    const height = parseFloat(sheet.querySelector('height')?.textContent || '841.92');
    
    // プレビュー画面上でちょうど収まるスケールを計算
    const scaleX = viewerWidth / width;
    const scaleY = viewerHeight / height;
    const optimalScale = Math.min(scaleX, scaleY, 1.2); // 1.2（120%）を超えないようにする
    
    console.log('スケール計算:', {
        originalSize: { width, height },
        viewerSize: { width: viewerWidth, height: viewerHeight },
        scaleFactors: { scaleX, scaleY },
        optimalScale
    });
    
    // クラスター情報を取得
    const clusters = sheet.querySelectorAll('clusters cluster');
    
    // PDF情報を更新
    const sheetName = sheet.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`;
    document.getElementById('pdfSize').textContent = `${width.toFixed(1)} × ${height.toFixed(1)} pt (A4)`;
    document.getElementById('pdfClusterCount').textContent = clusters.length + '個';
    document.getElementById('pdfBackground').textContent = referenceBackgroundImage ? '基準PDFあり' : getFallbackPdfFileName();
    
    // シート名も表示
    const sheetNameElement = document.getElementById('pdfSheetName');
    if (sheetNameElement) {
        sheetNameElement.textContent = sheetName;
    }
    
    // レイアウトを生成
    let layoutHtml = '';
    const scaledWidth = width * optimalScale;
    const scaledHeight = height * optimalScale;
    // DOMに描画した後にrenderPdfAsImageを呼ぶため、パラメータを保持（読み込み時背景PDF画像化用）
    let pendingPdfRenderSingle = null;
    
    // 背景表示: 比較時と同じくPDFを画像化（canvas + PDF.js）して表示
    if (displayMode !== 'background') {
        const backgroundImageToUse = cleanedReferenceBackgroundImage || referenceBackgroundImage;
        if (backgroundImageToUse && backgroundImageToUse.length > 100) {
            const isPdfData = backgroundImageToUse.startsWith('JVBERi0') || backgroundImageToUse.substring(0, 20).includes('PDF');
            if (isPdfData) {
                // 必ず改行・空白を除いたbase64を渡す（atob失敗防止）
                const cleanedPdfBase64 = (backgroundImageToUse.includes('\n') || backgroundImageToUse.includes(' ') || backgroundImageToUse.includes('\t'))
                    ? backgroundImageToUse.replace(/[\r\n\s\t]/g, '') : backgroundImageToUse;
                // PDF.jsでPDFを画像として表示（比較時と同じ処理）
                layoutHtml += `
                    <div id="pdfBackgroundSingle" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth}px;
                        height: ${scaledHeight}px;
                        background: white;
                        z-index: 1;
                        overflow: hidden;
                    ">
                        <canvas id="pdfCanvasSingle" style="
                            width: 100%;
                            height: 100%;
                            display: block;
                        "></canvas>
                    </div>
                `;
                const useSheetSpecificPage = !sheet.querySelector('backgroundImage')?.textContent && xmlDoc.querySelector('backgroundImage')?.textContent;
                const pageNumber = useSheetSpecificPage ? (currentSheetIndex + 1) : 1;
                pendingPdfRenderSingle = { base64: cleanedPdfBase64, scaledWidth, scaledHeight, pageNumber };
                console.log('単一ファイル: PDFを画像化して表示', { pageNumber, scaledWidth, scaledHeight });
            } else {
                layoutHtml += `
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth}px;
                        height: ${scaledHeight}px;
                        background-image: url('data:image/png;base64,${backgroundImageToUse}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: top left;
                        z-index: 1;
                    "></div>
                `;
            }
        } else {
            // XMLに背景がない場合は Material 内の Def_Check PDF を試行
            try {
                const pdfBase64 = await loadPdfAsBase64(getFallbackPdfPath());
                if (pdfBase64) {
                    layoutHtml += `
                        <div id="pdfBackgroundSingle" style="position:absolute;top:0;left:0;width:${scaledWidth}px;height:${scaledHeight}px;background:white;z-index:1;overflow:hidden;">
                            <canvas id="pdfCanvasSingle" style="width:100%;height:100%;display:block;"></canvas>
                        </div>
                    `;
                    pendingPdfRenderSingle = { base64: pdfBase64, scaledWidth, scaledHeight, pageNumber: currentSheetIndex + 1 };
                }
            } catch (e) {
                console.warn('外部PDF読み込みスキップ:', e);
            }
        }
    }
    
    // 緑の「基準 N」マークは表示しない（青い番号アイコンのみ表示）
    
    // 比較XMLのクラスターを表示（青い番号アイコン）
    clusters.forEach((cluster, index) => {
        const top = parseFloat(cluster.querySelector('top')?.textContent || '0') * height;
        const left = parseFloat(cluster.querySelector('left')?.textContent || '0') * width;
        const right = parseFloat(cluster.querySelector('right')?.textContent || '0') * width;
        const bottom = parseFloat(cluster.querySelector('bottom')?.textContent || '0') * height;
        
        const clusterWidth = right - left;
        const clusterHeight = bottom - top;
        
        // クラスターの色を決定（基準のみのときはオレンジ、比較時は青/赤）
        let borderColor = xmlData2 ? '#007bff' : '#ff9500';
        let isDifferent = false;
        
        // 基準XMLと比較して差分を判定
        if (xmlData1 && xmlData2) {
            const diffResult = checkClusterDifference(cluster, index);
            isDifferent = diffResult.hasDifference;
            if (isDifferent) {
                borderColor = '#dc3545';
            }
        }
        
        const gradientEnd = borderColor === '#ff9500' ? '#e68500' : borderColor === '#007bff' ? '#0056b3' : '#c82333';
        layoutHtml += `
            <div class="cluster-overlay" 
                 style="
                     position: absolute;
                     top: ${top * optimalScale}px;
                     left: ${left * optimalScale}px;
                     width: ${clusterWidth * optimalScale}px;
                     height: ${clusterHeight * optimalScale}px;
                     border: none;
                     background: transparent;
                     border-radius: 8px;
                     cursor: pointer;
                     z-index: 3;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                 "
                data-cluster-index="${index}"
                data-diff="${isDifferent ? 'different' : 'same'}">
                <div class="cluster-label" style="
                    background: linear-gradient(135deg, ${borderColor} 0%, ${gradientEnd} 100%);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${index}</div>
                ${isDifferent ? '<div class="cluster-difference-indicator">!</div>' : ''}
            </div>
        `;
    });
    
    const finalHtml = `
        <div style="
            position: relative;
            width: ${width * optimalScale}px;
            height: ${height * optimalScale}px;
            border: 3px solid #ddd;
            border-radius: 15px;
            background: white;
            overflow: visible;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        ">
            ${layoutHtml}
        </div>
    `;
    console.log('最終HTML:', finalHtml.substring(0, 500) + '...');
    console.log('HTMLの長さ:', finalHtml.length);
    
    // HTMLを設定する前に、背景画像要素が含まれているか確認
    const hasBackgroundElement = finalHtml.includes('pdf-background');
    console.log('単一ファイル背景要素の確認:', { 
        hasBackgroundElement, 
        backgroundElementIndex: finalHtml.indexOf('pdf-background'),
        backgroundElementFound: hasBackgroundElement ? '見つかりました' : '見つかりません'
    });
    
    viewer.innerHTML = finalHtml;
    
    // 読み込んだ背景PDFを画像化（DOM反映後に実行＝キャンバスが確実に存在するタイミング）
    if (pendingPdfRenderSingle) {
        const { base64, scaledWidth, scaledHeight, pageNumber } = pendingPdfRenderSingle;
        setTimeout(() => {
            const canvas = document.getElementById('pdfCanvasSingle');
            if (canvas) {
                renderPdfAsImage(base64, 'pdfCanvasSingle', scaledWidth, scaledHeight, pageNumber);
            } else {
                console.warn('pdfCanvasSingle がDOMに見つかりません（背景PDF描画スキップ）');
            }
        }, 150);
    }
    
    // HTML設定後に、実際のDOM要素を確認
    setTimeout(() => {
        const backgroundElement = viewer.querySelector('.pdf-background');
        if (backgroundElement) {
            console.log('単一ファイルPDF背景要素がDOMに存在します:', {
                element: backgroundElement,
                computedStyle: window.getComputedStyle(backgroundElement),
                backgroundImage: backgroundElement.style.backgroundImage,
                zIndex: backgroundElement.style.zIndex,
                width: backgroundElement.style.width,
                height: backgroundElement.style.height
            });
            
            // PDFの実際の表示サイズを詳細に確認
            const pdfElement = backgroundElement;
            const pdfRect = pdfElement.getBoundingClientRect();
            const pdfComputedStyle = window.getComputedStyle(pdfElement);
            
            console.log('PDF要素の詳細サイズ情報:', {
                element: pdfElement,
                tagName: pdfElement.tagName,
                src: pdfElement.src,
                getBoundingClientRect: {
                    width: pdfRect.width,
                    height: pdfRect.height,
                    top: pdfRect.top,
                    left: pdfRect.left,
                    right: pdfRect.right,
                    bottom: pdfRect.bottom
                },
                computedStyle: {
                    width: pdfComputedStyle.width,
                    height: pdfComputedStyle.height,
                    position: pdfComputedStyle.position,
                    top: pdfComputedStyle.top,
                    left: pdfComputedStyle.left
                },
                inlineStyle: {
                    width: pdfElement.style.width,
                    height: pdfElement.style.height,
                    position: pdfElement.style.position,
                    top: pdfElement.style.top,
                    left: pdfElement.style.left
                }
            });
            
            // PDFの実際の表示サイズに基づいて座標を再計算
            const actualPdfWidth = pdfRect.width;
            const actualPdfHeight = pdfRect.height;
            const expectedPdfWidth = width * scale;
            const expectedPdfHeight = height * scale;
            
            console.log('PDFサイズ比較:', {
                expected: { width: expectedPdfWidth, height: expectedPdfHeight },
                actual: { width: actualPdfWidth, height: actualPdfHeight },
                difference: {
                    width: actualPdfWidth - expectedPdfWidth,
                    height: actualPdfHeight - expectedPdfHeight
                },
                scaleFactors: {
                    width: actualPdfWidth / expectedPdfWidth,
                    height: actualPdfHeight / expectedPdfHeight
                }
            });
            
            // サイズの違いが大きい場合は、クラスターの位置を調整
            if (Math.abs(actualPdfWidth - expectedPdfWidth) > 1 || Math.abs(actualPdfHeight - expectedPdfHeight) > 1) {
                console.log('PDFサイズの違いを検出したため、クラスターの位置を調整します');
                
                // クラスターの位置を実際のPDFサイズに合わせて調整
                const clusterElements = viewer.querySelectorAll('.cluster-overlay');
                clusterElements.forEach((clusterElement, index) => {
                    const originalTop = parseFloat(clusterElement.style.top);
                    const originalLeft = parseFloat(clusterElement.style.left);
                    const originalWidth = parseFloat(clusterElement.style.width);
                    const originalHeight = parseFloat(clusterElement.style.height);
                    
                    // スケール係数を計算
                    const scaleX = actualPdfWidth / expectedPdfWidth;
                    const scaleY = actualPdfHeight / expectedPdfHeight;
                    
                    // 新しい位置とサイズを計算
                    const newTop = originalTop * scaleY;
                    const newLeft = originalLeft * scaleX;
                    const newWidth = originalWidth * scaleX;
                    const newHeight = originalHeight * scaleY;
                    
                    // クラスターの位置とサイズを更新
                    clusterElement.style.top = newTop + 'px';
                    clusterElement.style.left = newLeft + 'px';
                    clusterElement.style.width = newWidth + 'px';
                    clusterElement.style.height = newHeight + 'px';
                    
                    console.log(`クラスター${index + 1}の位置調整:`, {
                        original: { top: originalTop, left: originalLeft, width: originalWidth, height: originalHeight },
                        adjusted: { top: newTop, left: newLeft, width: newWidth, height: newHeight },
                        scaleFactors: { scaleX, scaleY }
                    });
                });
            } else {
                console.log('PDFサイズの違いは1px以下です。位置調整は不要です。');
            }
        } else {
            console.warn('PDF背景要素がDOMに見つかりません');
        }
        
        // 親要素のスタイルも確認
        const parentElement = viewer.querySelector('div[style*="position: relative"]');
        if (parentElement) {
            console.log('親要素のスタイル:', {
                element: parentElement,
                computedStyle: window.getComputedStyle(parentElement),
                width: parentElement.style.width,
                height: parentElement.style.height,
                overflow: parentElement.style.overflow
            });
        }
    }, 100);
}

// 背景画像表示テスト関数
function testBackgroundImageDisplay(element, backgroundImageData) {
    console.log('背景画像表示テスト開始');
    
    // 要素の基本情報
    console.log('要素の基本情報:', {
        tagName: element.tagName,
        className: element.className,
        id: element.id
    });
    
    // 計算されたスタイル
    const computedStyle = window.getComputedStyle(element);
    console.log('計算されたスタイル:', {
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        backgroundImage: computedStyle.backgroundImage,
        backgroundSize: computedStyle.backgroundSize,
        backgroundRepeat: computedStyle.backgroundRepeat,
        backgroundPosition: computedStyle.backgroundPosition,
        zIndex: computedStyle.zIndex,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
    });
    
    // インラインスタイル
    console.log('インラインスタイル:', {
        position: element.style.position,
        top: element.style.top,
        left: element.style.left,
        width: element.style.width,
        height: element.style.height,
        backgroundImage: element.style.backgroundImage,
        backgroundSize: element.style.backgroundSize,
        backgroundRepeat: element.style.backgroundRepeat,
        backgroundPosition: element.style.backgroundPosition,
        zIndex: element.style.zIndex,
        display: element.style.display,
        visibility: element.style.visibility,
        opacity: element.style.opacity
    });
    
    // 背景画像データの検証
    if (backgroundImageData) {
        console.log('背景画像データ検証:', {
            dataLength: backgroundImageData.length,
            dataType: typeof backgroundImageData,
            dataStart: backgroundImageData.substring(0, 50) + '...',
            dataEnd: backgroundImageData.substring(backgroundImageData.length - 50) + '...',
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(backgroundImageData)
        });
        
        // 背景画像のURLをテスト
        const testUrl = `data:image/png;base64,${backgroundImageData}`;
        console.log('テストURL:', testUrl.substring(0, 100) + '...');
        
        // 画像の読み込みテスト
        const testImg = new Image();
        testImg.onload = () => {
            console.log('背景画像の読み込み成功:', {
                width: testImg.width,
                height: testImg.height,
                naturalWidth: testImg.naturalWidth,
                naturalHeight: testImg.naturalHeight
            });
        };
        testImg.onerror = (error) => {
            console.error('背景画像の読み込み失敗:', error);
            console.error('エラーの詳細:', {
                errorType: error.type,
                errorTarget: error.target,
                errorMessage: error.message || 'エラーメッセージなし'
            });
            
            // base64データの詳細検証
            console.error('base64データの詳細検証:', {
                dataLength: backgroundImageData.length,
                dataStart: backgroundImageData.substring(0, 100),
                dataEnd: backgroundImageData.substring(backgroundImageData.length - 100),
                containsInvalidChars: /[^A-Za-z0-9+/=]/.test(backgroundImageData),
                paddingCheck: backgroundImageData.length % 4 === 0,
                firstChar: backgroundImageData.charAt(0),
                lastChar: backgroundImageData.charAt(backgroundImageData.length - 1)
            });
            
            // 代替の表示方法を試す
            console.log('代替表示方法を試行中...');
            tryAlternativeDisplay(element, backgroundImageData);
        };
        testImg.src = testUrl;
    }
    
    // 親要素の確認
    const parent = element.parentElement;
    if (parent) {
        console.log('親要素の情報:', {
            tagName: parent.tagName,
            className: parent.className,
            computedStyle: {
                position: window.getComputedStyle(parent).position,
                overflow: window.getComputedStyle(parent).overflow,
                width: window.getComputedStyle(parent).width,
                height: window.getComputedStyle(parent).height
            }
        });
    }
}

// 代替表示方法を試行する関数
function tryAlternativeDisplay(element, backgroundImageData) {
    console.log('代替表示方法を試行中...');
    
    // 方法1: base64データのクリーニング
    let cleanedData = backgroundImageData;
    
    // 改行文字や空白文字を削除
    cleanedData = cleanedData.replace(/[\r\n\s]/g, '');
    
    // 無効な文字を除去
    cleanedData = cleanedData.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // パディングを調整
    while (cleanedData.length % 4 !== 0) {
        cleanedData += '=';
    }
    
    console.log('クリーニング後のデータ:', {
        originalLength: backgroundImageData.length,
        cleanedLength: cleanedData.length,
        cleanedStart: cleanedData.substring(0, 100),
        cleanedEnd: cleanedData.substring(cleanedData.length - 100)
    });
    
    // 方法2: 異なるMIMEタイプを試す
    const mimeTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/bmp'
    ];
    
    // 方法3: 直接img要素を使用
    const imgElement = document.createElement('img');
    imgElement.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        z-index: 1 !important;
        border: 2px solid orange;
    `;
    
    // クリーニングされたデータでテスト
    imgElement.onload = () => {
        console.log('代替表示成功（img要素）:', {
            width: imgElement.width,
            height: imgElement.height
        });
        
        // 元の要素を置き換え
        element.style.display = 'none';
        element.parentElement.appendChild(imgElement);
    };
    
    imgElement.onerror = (error) => {
        console.error('代替表示も失敗:', error);
        
        // エラーが発生した場合は、元の要素を非表示にして終了
        console.log('代替表示が失敗したため、元の要素を非表示にします');
        element.style.display = 'none';
        
        // デバッグ用の情報を表示
        const debugInfo = document.createElement('div');
        debugInfo.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
        `;
        debugInfo.textContent = '背景画像の読み込みに失敗しました';
        element.parentElement.appendChild(debugInfo);
    };
    
    // クリーニングされたデータでテスト開始
    imgElement.src = `data:image/png;base64,${cleanedData}`;
}

// クラスター設定比較ヘルパー関数
function compareClusterSettings(cluster1, cluster2) {
    return compareClusterSettingsCore(cluster1, cluster2);
}

function compareNetworkSettings(network1, network2) {
    return compareNetworkSettingsCore(network1, network2);
}

// ネットワーク設定関連の関数
function updateNetworkLayout() {
    if (window.__isUpdatingNetworkLayout) return;
    window.__isUpdatingNetworkLayout = true;
    
    console.log('ネットワーク設定更新:', { hasXmlData1: !!xmlData1, hasXmlData2: !!xmlData2 });
    
    // 比較用ファイルのみを表示（裏側で基準ファイルと比較）
    if (xmlData1 && xmlData2) {
        console.log('比較モードでネットワーク設定生成開始');
        console.log('XMLデータ1の長さ:', xmlData1.length);
        console.log('XMLデータ2の長さ:', xmlData2.length);
        generateCompareNetworkLayoutSingleView(xmlData1, xmlData2);
        window.__isUpdatingNetworkLayout = false;
        return;
    }
    
    // 基準XMLのみのプレビュー時（比較なし）→ 基準のネットワーク設定を表示
    if (xmlData1 && !xmlData2) {
        console.log('基準XMLのみでネットワーク設定生成');
        generateNetworkLayout(xmlData1);
        window.__isUpdatingNetworkLayout = false;
        return;
    }
    
    // 比較XMLのみを表示
    const xmlData = xmlData2;
    
    if (!xmlData) {
        document.getElementById('networkViewer').innerHTML = `
            <div class="network-placeholder">
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #666; margin-bottom: 1rem;">
                        XMLファイルを選択して比較を実行してください。
                    </p>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 1rem; margin: 1rem 0;">
                        <strong>手順:</strong>
                        <ol style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
                            <li>基準XMLファイルを選択</li>
                            <li>比較XMLファイルを選択</li>
                            <li>「比較を開始」ボタンをクリック</li>
                            <li>ネットワーク設定タブで結果を確認</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;
        window.__isUpdatingNetworkLayout = false;
        return;
    }
    
    // 単一ファイルのネットワーク設定を生成
    generateNetworkLayout(xmlData);
    window.__isUpdatingNetworkLayout = false;
}

function generateNetworkLayout(xmlData) {
    const viewer = document.getElementById('networkViewer');
    if (!viewer) {
        console.warn('networkViewer要素が見つかりません');
        return;
    }
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
    
    // XML解析エラーの確認
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('XML解析エラー:', parserError.textContent);
        viewer.innerHTML = '<div class="network-placeholder">XML解析エラーが発生しました</div>';
        return;
    }
    
    // シート情報を取得
    const sheets = xmlDoc.querySelectorAll('sheets sheet');
    if (sheets.length === 0) {
        viewer.innerHTML = '<div class="network-placeholder">シート情報が見つかりません</div>';
        return;
    }
    
    const sheet = sheets[currentSheetIndex];
    const width = parseFloat(sheet.querySelector('width')?.textContent || '595.32');
    const height = parseFloat(sheet.querySelector('height')?.textContent || '841.92');
    
    // プレビュー画面上でちょうど収まるスケールを計算
    const networkViewer = document.getElementById('networkViewer');
    const viewerRect = networkViewer.getBoundingClientRect();
    const rawWidth = Math.max(0, viewerRect.width - 40);
    const rawHeight = Math.max(0, viewerRect.height - 40);
    const viewerWidth = rawWidth > 0 ? rawWidth : 500;
    const viewerHeight = rawHeight > 0 ? rawHeight : 600;
    
    const scaleX = viewerWidth / width;
    const scaleY = viewerHeight / height;
    let optimalScale = Math.min(scaleX, scaleY, 1.2); // 1.2（120%）を超えないようにする
    if (optimalScale <= 0 || !Number.isFinite(optimalScale)) {
        optimalScale = Math.min(0.7, (viewerWidth || 500) / width, (viewerHeight || 600) / height) || 0.5;
    }
    
    console.log('単一ファイルネットワークレイアウトスケール計算:', {
        originalSize: { width, height },
        viewerSize: { width: viewerWidth, height: viewerHeight },
        scaleFactors: { scaleX, scaleY },
        optimalScale
    });
    
    // クラスター情報を取得
    const clusters = sheet.querySelectorAll('clusters cluster');
    
    // ネットワーク情報を取得
    const networks = xmlDoc.querySelectorAll('networks network');
    const valueLinks = xmlDoc.querySelectorAll('networks network valueLinks valueLink');
    
    // 簡単なネットワーク情報を更新
    const networkCountElement = document.getElementById('networkCount');
    if (networkCountElement) {
        networkCountElement.textContent = `${networks.length}個`;
    }
    
    // 簡単なネットワーク情報表示を表示
    const simpleNetworkInfo = document.getElementById('simpleNetworkInfo');
    if (simpleNetworkInfo) {
        simpleNetworkInfo.style.display = 'block';
    }
    
    // 背景画像（PDF）をXMLから取得（シート単位→ルートの順）
    const backgroundImage = sheet.querySelector('backgroundImage')?.textContent || xmlDoc.querySelector('backgroundImage')?.textContent;
    let cleanedBackgroundImage = backgroundImage;
    if (backgroundImage && (backgroundImage.includes('\n') || backgroundImage.includes(' ') || backgroundImage.includes('\t'))) {
        cleanedBackgroundImage = backgroundImage.replace(/[\r\n\s\t]/g, '');
    }
    
    const layoutWidth = width * optimalScale;
    const layoutHeight = height * optimalScale;
    // 背景PDFを画像化して表示する用（DOM反映後にrenderPdfAsImageを呼ぶ）
    let pendingNetworkPdfRender = null;
    const isPdfData = cleanedBackgroundImage && cleanedBackgroundImage.length > 100 &&
        (cleanedBackgroundImage.startsWith('JVBERi0') || cleanedBackgroundImage.substring(0, 20).includes('PDF'));
    
    // ネットワークレイアウトを生成（背景レイヤー＋クラスター・線）
    let layoutHtml = `
        <div style="position: relative; width: ${layoutWidth}px; height: ${layoutHeight}px; border: 1px solid #ccc; background: white; margin: 0 auto; overflow: hidden;">
    `;
    
    // PDF背景を最下層に表示（canvas + PDF.jsで画像化）
    if (isPdfData) {
        layoutHtml += `
            <div id="networkPdfBackgroundWrap" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; overflow: hidden; pointer-events: none;">
                <canvas id="networkPdfCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
        `;
        const pageNumber = !sheet.querySelector('backgroundImage')?.textContent && xmlDoc.querySelector('backgroundImage')?.textContent
            ? (currentSheetIndex + 1) : 1;
        const pdfBase64ForRender = (cleanedBackgroundImage.includes('\n') || cleanedBackgroundImage.includes(' ') || cleanedBackgroundImage.includes('\t'))
            ? cleanedBackgroundImage.replace(/[\r\n\s\t]/g, '') : cleanedBackgroundImage;
        pendingNetworkPdfRender = { base64: pdfBase64ForRender, layoutWidth, layoutHeight, pageNumber };
    }
    
    // クラスターを枠とノードとして表示（z-index: 2 で背景の上に）
    clusters.forEach((cluster, index) => {
        const name = cluster.querySelector('name')?.textContent || `クラスター${index}`;
        const top = parseFloat(cluster.querySelector('top')?.textContent || '0') * height;
        const bottom = parseFloat(cluster.querySelector('bottom')?.textContent || '0') * height;
        const left = parseFloat(cluster.querySelector('left')?.textContent || '0') * width;
        const right = parseFloat(cluster.querySelector('right')?.textContent || '0') * width;
        
        const clusterWidth = right - left;
        const clusterHeight = bottom - top;
        
        // クラスターの枠を表示（背景の上に z-index: 2）
        layoutHtml += `
            <div style="position: absolute; left: ${left * optimalScale}px; top: ${top * optimalScale}px; width: ${clusterWidth * optimalScale}px; height: ${clusterHeight * optimalScale}px; border: 2px solid #6c757d; background: transparent; border-radius: 5px; z-index: 2;"
                 title="${escapeHtml(name)}">
            </div>
        `;
        
        // クラスターの中心にノードを表示（z-index: 2）
        const centerX = left + clusterWidth / 2;
        const centerY = top + clusterHeight / 2;
        
        layoutHtml += `
            <div class="network-node single" 
                 style="left: ${(centerX - 15) * optimalScale}px; top: ${(centerY - 15) * optimalScale}px; width: ${30 * optimalScale}px; height: ${30 * optimalScale}px; z-index: 2;"
                 title="${name}">
                ${index}
            </div>
        `;
    });
    
    // ネットワーク線を表示（z-index: 2 で背景の上に）
    networks.forEach((network, index) => {
        const fromCluster = network.querySelector('prevClusterId')?.textContent;
        const toCluster = network.querySelector('nextClusterId')?.textContent;
        
        if (fromCluster && toCluster) {
            const fromIndex = parseInt(fromCluster);
            const toIndex = parseInt(toCluster);
            
            if (fromIndex >= 0 && fromIndex < clusters.length && toIndex >= 0 && toIndex < clusters.length) {
                const fromCluster = clusters[fromIndex];
                const toCluster = clusters[toIndex];
                
                const fromTop = parseFloat(fromCluster.querySelector('top')?.textContent || '0') * height;
                const fromLeft = parseFloat(fromCluster.querySelector('left')?.textContent || '0') * width;
                const fromBottom = parseFloat(fromCluster.querySelector('bottom')?.textContent || '0') * height;
                const fromRight = parseFloat(fromCluster.querySelector('right')?.textContent || '0') * width;
                const toTop = parseFloat(toCluster.querySelector('top')?.textContent || '0') * height;
                const toLeft = parseFloat(toCluster.querySelector('left')?.textContent || '0') * width;
                const toBottom = parseFloat(toCluster.querySelector('bottom')?.textContent || '0') * height;
                const toRight = parseFloat(toCluster.querySelector('right')?.textContent || '0') * width;
                
                const fromClusterWidth = fromRight - fromLeft;
                const fromClusterHeight = fromBottom - fromTop;
                const toClusterWidth = toRight - toLeft;
                const toClusterHeight = toBottom - toTop;
                
                // ネットワークの違いを判定
                const isDifferent = checkNetworkDifference(network, index);
                const lineClass = isDifferent ? 'different' : 'same';
                console.log(`ネットワーク${index}: isDifferent=${isDifferent}, lineClass=${lineClass}`);
                
                const svgHtml = `
                    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
                        <defs>
                            <marker id="arrowhead-${lineClass}" markerWidth="10" markerHeight="7" 
                                    refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="${lineClass === 'different' ? '#dc3545' : lineClass === 'same' ? '#007bff' : '#ff9500'}" />
                            </marker>
                        </defs>
                        <line class="network-line ${lineClass}" 
                              x1="${(fromLeft + fromClusterWidth / 2) * optimalScale}" y1="${(fromTop + fromClusterHeight / 2) * optimalScale}" 
                              x2="${(toLeft + toClusterWidth / 2) * optimalScale}" y2="${(toTop + toClusterHeight / 2) * optimalScale}" 
                              stroke="${lineClass === 'different' ? '#dc3545' : '#007bff'}" stroke-width="4" marker-end="url(#arrowhead-${lineClass})" />
                    </svg>
                `;
                
                // クリック可能な透明な線を必ず追加（各ネットワークごとに個別のdivとして配置）
                const networkDetails = encodeURIComponent(JSON.stringify(getNetworkDifferenceDetails(network, index)));
                const fromX = (fromLeft + fromClusterWidth / 2) * optimalScale;
                const fromY = (fromTop + fromClusterHeight / 2) * optimalScale;
                const toX = (toLeft + toClusterWidth / 2) * optimalScale;
                const toY = (toTop + toClusterHeight / 2) * optimalScale;
                
                let clickableLineHtml = `
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto; z-index: 2;">
                        <svg style="width: 100%; height: 100%;">
                            <line class="network-click-target" style="stroke: transparent; stroke-width: 30; cursor: pointer; transition: stroke 0.2s ease;" 
                                  x1="${fromX}" y1="${fromY}" 
                                  x2="${toX}" y2="${toY}" 
                                  data-network-index="${index}"
                                  data-network-details="${networkDetails}" />
                        </svg>
                    </div>
                `;
                layoutHtml += svgHtml + clickableLineHtml;
            }
        }
    });
    
    layoutHtml += '</div>';
    viewer.innerHTML = layoutHtml;
    
    // 背景PDFを画像化して表示（DOM反映後に実行）
    if (pendingNetworkPdfRender) {
        const { base64, layoutWidth, layoutHeight, pageNumber } = pendingNetworkPdfRender;
        setTimeout(() => {
            const canvas = document.getElementById('networkPdfCanvas');
            if (canvas) {
                renderPdfAsImage(base64, 'networkPdfCanvas', layoutWidth, layoutHeight, pageNumber);
            }
        }, 150);
    }
}

// ネットワーク設定比較ヘルパー関数
function checkNetworkDifference(network, index) {
    return checkNetworkDifferenceCore(network, index, { xmlData1, xmlData2, currentSheetIndex });
}

function getNetworkDifferenceDetails(network, index) {
    return getNetworkDifferenceDetailsCore(network, index, { xmlData1, xmlData2, currentSheetIndex });
}

// 選択されたネットワークのリストを保持するグローバル変数（クリックした1件のみ表示するため1要素のみ）
let selectedNetworks = [];

function showNetworkDifferenceDetails(index, detailsJson) {
    console.log('showNetworkDifferenceDetails 呼び出し:', { index, detailsJsonLength: detailsJson?.length });
    try {
        const details = JSON.parse(decodeURIComponent(detailsJson));
        console.log('showNetworkDifferenceDetails パース成功:', details);
        
        // クリックしたネットワーク1件だけを表示（複数選択・タブは使わない）
        selectedNetworks = [{ index, details, detailsJson }];
        
        // モーダルを更新
        updateNetworkModal();
    } catch (error) {
        console.error('showNetworkDifferenceDetails エラー:', error);
        alert(`ネットワーク ${index} の詳細を表示できません: ${error.message}`);
    }
}

function updateNetworkModal() {
    const modal = document.getElementById('networkModal');
    const modalBody = document.getElementById('networkModalBody');
    const modalTitle = document.getElementById('networkModalTitle');
    
    if (!modal || !modalBody || !modalTitle) {
        console.error('updateNetworkModal エラー: モーダル要素が見つかりません');
        return;
    }
    
    // 選択されたネットワークがない場合はモーダルを閉じる
    if (selectedNetworks.length === 0) {
        modal.style.display = 'none';
        return;
    }
    
    // モーダルのタイトルを設定（クリックした1件のみ表示するため「N個選択中」は出さない）
    const single = selectedNetworks[0];
    modalTitle.textContent = `🔗 ネットワーク ${single.index} の詳細情報`;
    
    // モーダルボディの内容を生成（タブは出さず、選択した1件の詳細のみ表示）
    let html = '';
    
    // 選択したネットワークの詳細を表示（1件のみ）
    selectedNetworks.forEach((network, tabIndex) => {
        const details = network.details;
        const displayStyle = selectedNetworks.length > 1 && tabIndex > 0 ? 'display: none;' : '';
        
        html += `
            <div class="network-detail-panel" data-tab-index="${tabIndex}" style="${displayStyle}">
        `;
        
        // 基準XML vs 比較XML をクラスター設定と同様に先頭で表示
        const formatClusterVal = (id, name) => {
            if (!id || id === '存在しない') return id || 'なし';
            return `${id}${name ? ` (${name})` : ''}`;
        };
        const refPrev = formatClusterVal(details.ref_prevClusterId, details.ref_prevClusterName);
        const refNext = formatClusterVal(details.ref_nextClusterId, details.ref_nextClusterName);
        const compPrev = formatClusterVal(details.prevClusterId, details.prevClusterName);
        const compNext = formatClusterVal(details.nextClusterId, details.nextClusterName);
        const hasDiff = details.hasDifferences && details.differences && details.differences.length > 0;
        
        html += `
            <div class="network-info-section">
                <h4>📋 基準XML vs 比較XML</h4>
                <table class="network-comparison-table">
                    <thead>
                        <tr>
                            <th>設定項目</th>
                            <th>基準XML</th>
                            <th>比較XML</th>
                            <th>状態</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>先行クラスター</strong></td>
                            <td>${refPrev === '存在しない' ? `<span class="network-value-missing">${refPrev}</span>` : refPrev}</td>
                            <td>${compPrev === '存在しない' ? `<span class="network-value-missing">${compPrev}</span>` : compPrev}</td>
                            <td>${(details.ref_prevClusterId !== details.prevClusterId) ? `<span class="network-value-different">不一致</span>` : `<span class="network-value-same">一致</span>`}</td>
                        </tr>
                        <tr>
                            <td><strong>後続クラスター</strong></td>
                            <td>${refNext === '存在しない' ? `<span class="network-value-missing">${refNext}</span>` : refNext}</td>
                            <td>${compNext === '存在しない' ? `<span class="network-value-missing">${compNext}</span>` : compNext}</td>
                            <td>${(details.ref_nextClusterId !== details.nextClusterId) ? `<span class="network-value-different">不一致</span>` : `<span class="network-value-same">一致</span>`}</td>
                        </tr>
                        <tr>
                            <td><strong>後続への自動表示追加</strong></td>
                            <td>${details.ref_skipFormatted != null ? details.ref_skipFormatted : 'なし'}</td>
                            <td>${details.skipFormatted != null ? details.skipFormatted : 'なし'}</td>
                            <td>${(details.ref_skip !== details.skip) ? `<span class="network-value-different">不一致</span>` : `<span class="network-value-same">一致</span>`}</td>
                        </tr>
                        <tr>
                            <td><strong>入力制限</strong></td>
                            <td>${details.ref_conditionFormatted != null ? details.ref_conditionFormatted : '制限なし'}</td>
                            <td>${details.conditionFormatted != null ? details.conditionFormatted : '制限なし'}</td>
                            <td>${(details.ref_condition !== details.condition) ? `<span class="network-value-different">不一致</span>` : `<span class="network-value-same">一致</span>`}</td>
                        </tr>
                        <tr>
                            <td><strong>バリューリンク数</strong></td>
                            <td>${details.ref_valueLinksCount != null ? details.ref_valueLinksCount + '個' : '0個'}</td>
                            <td>${details.valueLinksCount != null ? details.valueLinksCount + '個' : '0個'}</td>
                            <td>${(details.ref_valueLinksCount !== details.valueLinksCount) ? `<span class="network-value-different">不一致</span>` : `<span class="network-value-same">一致</span>`}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // 差分がある場合は「何が違うか」をリストで強調表示
        if (hasDiff) {
            html += `
                <div class="network-difference-section">
                    <h4>⚠️ 差分の内容</h4>
            `;
            details.differences.forEach((diff, i) => {
                html += `
                    <div class="network-difference-item">
                        <strong>${i + 1}.</strong> ${diff}
                    </div>
                `;
            });
            html += `</div>`;
        } else if (details.ref_prevClusterId !== undefined && !hasDiff) {
            html += `
                <div class="network-no-difference">
                    ✅ 差分なし: 基準XMLと設定が同じです。
                </div>
            `;
        }
        
        // 従来の基本情報（参考用・簡略表示は上で済んでいるので省略可能だが互換のため残す）
        html += `
            <div class="network-info-section">
                <h4>📋 基本情報（比較XML）</h4>
                <div class="network-info-item">
                    <span class="network-info-label">先行クラスター:</span>
                    <span class="network-info-value">${escapeHtml(details.prevClusterId || 'なし')}${details.prevClusterName ? ` (${escapeHtml(details.prevClusterName)})` : ''}</span>
                </div>
                <div class="network-info-item">
                    <span class="network-info-label">後続クラスター:</span>
                    <span class="network-info-value">${escapeHtml(details.nextClusterId || 'なし')}${details.nextClusterName ? ` (${escapeHtml(details.nextClusterName)})` : ''}</span>
                </div>
                <div class="network-info-item">
                    <span class="network-info-label">後続クラスターへの自動表示追加:</span>
                    <span class="network-info-value">${escapeHtml(details.skipFormatted || 'しない')}</span>
                </div>
                <div class="network-info-item">
                    <span class="network-info-label">入力制限:</span>
                    <span class="network-info-value">${escapeHtml(details.conditionFormatted || '制限なし')}</span>
                </div>
                <div class="network-info-item">
                    <span class="network-info-label">バリューリンク数:</span>
                    <span class="network-info-value">${details.valueLinksCount != null ? details.valueLinksCount : '0'}個</span>
                </div>
            </div>
        `;
        
            // ネットワーク位置・制限の詳細差分（基準・比較両方ある場合のみ）
            if (xmlData1 && xmlData2) {
                const parser = new DOMParser();
                const doc2 = parser.parseFromString(xmlData2, 'text/xml');
                const networks2 = doc2.querySelectorAll('networks network');
                if (network.index < networks2.length) {
                    const networkElement = networks2[network.index];
                    const positionDiff = getNetworkPositionDifference(networkElement, network.index);
                    const restrictionDiff = getNetworkRestrictionDifference(networkElement, network.index);
                    if (positionDiff.hasDifferences) {
                        html += `
                            <div class="network-difference-section">
                                <h4>📍 ネットワーク位置の差分</h4>`;
                        positionDiff.differences.forEach((diff, i) => {
                            html += `<div class="network-difference-item"><strong>${i + 1}.</strong> ${escapeHtml(diff)}</div>`;
                        });
                        html += `</div>`;
                    }
                    if (restrictionDiff.hasDifferences) {
                        html += `
                            <div class="network-difference-section">
                                <h4>🔒 ネットワーク制限設定の差分</h4>`;
                        restrictionDiff.differences.forEach((diff, i) => {
                            html += `<div class="network-difference-item"><strong>${i + 1}.</strong> ${escapeHtml(diff)}</div>`;
                        });
                        html += `</div>`;
                    }
                }
            }
            
            html += `</div>`; // network-detail-panel の閉じタグ
        });
        
        modalBody.innerHTML = html;
        modal.style.display = 'block';
}

// ネットワークタブを切り替える関数
function switchNetworkTab(tabIndex) {
    // すべてのタブボタンのactiveクラスを削除
    const tabButtons = document.querySelectorAll('.network-tab-btn');
    tabButtons.forEach((btn, index) => {
        if (index === tabIndex) {
            btn.classList.add('active');
            btn.style.background = '#007bff';
            btn.style.color = 'white';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#007bff';
        }
    });
    
    // すべてのパネルを非表示
    const panels = document.querySelectorAll('.network-detail-panel');
    panels.forEach((panel, index) => {
        if (index === tabIndex) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });
}

// ネットワークモーダルを閉じる
function closeNetworkModal(event) {
    const modal = document.getElementById('networkModal');
    if (!modal) return;
    
    // モーダル背景をクリックした場合、または閉じるボタンをクリックした場合
    if (!event || event.target === modal || event.target.classList.contains('network-modal-close')) {
        modal.style.display = 'none';
    }
}

// 新比較機能のテスト関数
function testNewComparisonFeatures() {
    if (!xmlData1 || !xmlData2) {
        alert('テストを実行するには、基準XMLと比較XMLの両方を選択してください。');
        return;
    }
    
    let testResults = `🧪 新比較機能テスト結果\n`;
    testResults += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');
    
    // ネットワーク位置比較のテスト
    const networks2 = doc2.querySelectorAll('networks network');
    if (networks2.length > 0) {
        const network = networks2[0];
        const positionDiff = getNetworkPositionDifference(network, 0);
        testResults += `📍 ネットワーク位置比較テスト:\n`;
        testResults += `• 差分あり: ${positionDiff.hasDifferences ? 'はい' : 'いいえ'}\n`;
        if (positionDiff.hasDifferences) {
            testResults += `• 差分内容: ${positionDiff.differences.join(', ')}\n`;
        }
        testResults += `\n`;
    }
    
    // ネットワーク制限設定比較のテスト
    if (networks2.length > 0) {
        const network = networks2[0];
        const restrictionDiff = getNetworkRestrictionDifference(network, 0);
        testResults += `🔒 ネットワーク制限設定比較テスト:\n`;
        testResults += `• 差分あり: ${restrictionDiff.hasDifferences ? 'はい' : 'いいえ'}\n`;
        if (restrictionDiff.hasDifferences) {
            testResults += `• 差分内容: ${restrictionDiff.differences.join(', ')}\n`;
        }
        testResults += `\n`;
    }
    
    // 選択肢詳細比較のテスト
    const sheets2 = doc2.querySelectorAll('sheets sheet');
    if (sheets2.length > 0 && currentSheetIndex < sheets2.length) {
        const sheet2 = sheets2[currentSheetIndex];
        const clusters2 = sheet2.querySelectorAll('clusters cluster');
        if (clusters2.length > 0) {
            const cluster = clusters2[0];
            const choiceDiff = getChoiceDifference(cluster, 0);
            testResults += `📋 選択肢詳細比較テスト:\n`;
            testResults += `• 差分あり: ${choiceDiff.hasDifferences ? 'はい' : 'いいえ'}\n`;
            if (choiceDiff.hasDifferences) {
                testResults += `• 差分内容: ${choiceDiff.differences.join(', ')}\n`;
            }
            testResults += `\n`;
        }
    }
    
    testResults += `✅ テスト完了！\n`;
    testResults += `各機能の詳細は、クラスターやネットワークをクリックして確認してください。`;
    
    alert(testResults);
}

// デバッグ情報の表示/非表示を切り替える関数
function toggleDebugInfo() {
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo.style.display === 'none') {
        debugInfo.style.display = 'block';
    } else {
        debugInfo.style.display = 'none';
    }
}

// デバッグ情報を表示する関数
function showDebugInfo(error, xml1, xml2) {
    const debugContent = document.getElementById('debugContent');
    const debugInfo = document.getElementById('debugInfo');
    
    if (!debugContent || !debugInfo) return;
    
    let debugHtml = `
        <div style="font-family: monospace; font-size: 0.9rem;">
            <h5>🚨 エラー詳細</h5>
            <div style="background: #fff3cd; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                <strong>エラーメッセージ:</strong> ${escapeHtml(error.message || '不明')}<br>
                <strong>エラータイプ:</strong> ${escapeHtml(error.name || '不明')}<br>
                <strong>エラースタック:</strong> ${escapeHtml(error.stack ? error.stack.substring(0, 500) + '...' : '不明')}
            </div>
            
            <h5>📊 XMLデータ情報</h5>
            <div style="background: #d1ecf1; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                <strong>基準XML:</strong> ${xml1 ? xml1.length + ' 文字' : '未設定'}<br>
                <strong>比較XML:</strong> ${xml2 ? xml2.length + ' 文字' : '未設定'}
            </div>
    `;
    
    if (xml1 && xml2) {
        try {
            const parser = new DOMParser();
            const doc1 = parser.parseFromString(xml1, 'text/xml');
            const doc2 = parser.parseFromString(xml2, 'text/xml');
            
            const parserError1 = doc1.querySelector('parsererror');
            const parserError2 = doc2.querySelector('parsererror');
            
            debugHtml += `
                <h5>🔍 XML解析状況</h5>
                <div style="background: ${parserError1 || parserError2 ? '#f8d7da' : '#d4edda'}; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
            `;
            
            if (parserError1) {
                debugHtml += `<strong>基準XML解析エラー:</strong> ${escapeHtml(parserError1.textContent)}<br>`;
            }
            if (parserError2) {
                debugHtml += `<strong>比較XML解析エラー:</strong> ${escapeHtml(parserError2.textContent)}<br>`;
            }
            
            if (!parserError1 && !parserError2) {
                const sheets1 = doc1.querySelectorAll('sheets sheet');
                const sheets2 = doc2.querySelectorAll('sheets sheet');
                const clusters1 = doc1.querySelectorAll('clusters cluster');
                const clusters2 = doc2.querySelectorAll('clusters cluster');
                
                debugHtml += `
                    <strong>基準XML:</strong> シート${sheets1.length}個, クラスター${clusters1.length}個<br>
                    <strong>比較XML:</strong> シート${sheets2.length}個, クラスター${clusters2.length}個<br>
                    <strong>解析状況:</strong> ✅ 正常
                `;
            }
            
            debugHtml += `</div>`;
            
        } catch (parseError) {
            debugHtml += `
                <h5>🔍 XML解析状況</h5>
                <div style="background: #f8d7da; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                    <strong>解析エラー:</strong> ${escapeHtml(parseError.message)}
                </div>
            `;
        }
    }
    
    debugHtml += `
        <h5>💡 トラブルシューティング</h5>
        <div style="background: #fff3cd; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                <li>XMLの形式（ルート要素・シート構成）を確認してください</li>
                <li>ConMas DesignerでXMLを出力し直し、再度アップロードしてください</li>
                <li>XMLファイルが正しい形式か確認してください</li>
                <li>ファイルサイズが適切か（最大5MB程度）確認してください</li>
                <li>ブラウザのコンソールでエラーログを確認してください</li>
                <li>必要に応じてファイルを再選択してください</li>
            </ul>
        </div>
        </div>
    `;
    
    debugContent.innerHTML = debugHtml;
    debugInfo.style.display = 'block';
}

// ネットワーク位置の詳細比較関数
function getNetworkPositionDifference(network, index) {
    return getNetworkPositionDifferenceCore(network, index, { xmlData1, xmlData2 });
}

// ネットワーク制限設定の詳細比較関数
function getNetworkRestrictionDifference(network, index) {
    return getNetworkRestrictionDifferenceCore(network, index, { xmlData1, xmlData2 });
}

// 単一選択の選択肢詳細比較関数
function getChoiceDifference(cluster, index) {
    return getChoiceDifferenceCore(cluster, index, { xmlData1, xmlData2, currentSheetIndex });
}

// シートナビゲーション機能

function updateSheetNavigation() {
    console.log('updateSheetNavigation呼び出し:', { currentSheetIndex, totalSheets });
    
    // シート情報を更新（「シート 1 / 4」のような表示）
    // sheetInfo要素はsheetNavigationの中にあるので、innerHTMLを書き換える前に更新
    const sheetInfo = document.getElementById('sheetInfo');
    if (sheetInfo) {
        const sheetInfoText = `シート ${currentSheetIndex + 1} / ${totalSheets}`;
        sheetInfo.textContent = sheetInfoText;
        console.log('sheetInfo更新:', { sheetInfoText, element: sheetInfo });
    } else {
        console.warn('sheetInfo要素が見つかりません');
    }
    
    // 前のシート/次のシートボタンの有効/無効を更新
    const prevSheetBtn = document.getElementById('prevSheetBtn');
    const nextSheetBtn = document.getElementById('nextSheetBtn');
    if (prevSheetBtn) {
        prevSheetBtn.disabled = currentSheetIndex === 0;
        console.log('prevSheetBtn更新:', { disabled: prevSheetBtn.disabled, currentSheetIndex });
    } else {
        console.warn('prevSheetBtn要素が見つかりません');
    }
    if (nextSheetBtn) {
        nextSheetBtn.disabled = currentSheetIndex >= totalSheets - 1;
        console.log('nextSheetBtn更新:', { disabled: nextSheetBtn.disabled, currentSheetIndex, totalSheets });
    } else {
        console.warn('nextSheetBtn要素が見つかりません');
    }
    
    // 既存のシートナビゲーション（非表示）
    // 注意: sheetNavigationのinnerHTMLを書き換えると、その中にあるsheetInfo要素が消える
    // そのため、sheetInfo要素はinnerHTMLを書き換える前に更新する必要がある
    const navContainer = document.getElementById('sheetNavigation');
    if (navContainer) {
        // sheetInfo要素を含めてinnerHTMLを書き換える
        let navHtml = `
            <button class="sheet-nav-btn" id="prevSheetBtn" data-sheet-index="${currentSheetIndex - 1}" ${currentSheetIndex === 0 ? 'disabled' : ''}>◀ 前のシート</button>
            <span class="sheet-info" id="sheetInfo">シート ${currentSheetIndex + 1} / ${totalSheets}</span>
            <button class="sheet-nav-btn" id="nextSheetBtn" data-sheet-index="${currentSheetIndex + 1}" ${currentSheetIndex >= totalSheets - 1 ? 'disabled' : ''}>次のシート ▶</button>
        `;
        navContainer.innerHTML = navHtml;
    }
    
    // 新しいシート選択コンテナ（表示用）
    const sheetSelectionContainer = document.getElementById('sheetSelectionContainer');
    const navContainerVisible = document.getElementById('sheetNavigationVisible');
    
    if (sheetSelectionContainer && navContainerVisible) {
        // 複数シートの場合のみ表示
        if (totalSheets > 1) {
            sheetSelectionContainer.style.display = 'block';
            const sheetCountLabel = document.getElementById('sheetCountLabel');
            if (sheetCountLabel) sheetCountLabel.textContent = `（シートが${totalSheets}件あります）`;
    
    let navHtml = '';
    for (let i = 0; i < totalSheets; i++) {
        const isActive = i === currentSheetIndex;
        navHtml += `
            <button class="sheet-nav-btn ${isActive ? 'active' : ''}" 
                    data-sheet-index="${i}" 
                    style="
                        padding: 8px 16px;
                        margin: 0 4px;
                        border: 2px solid ${isActive ? '#ff9500' : '#ddd'};
                        background: ${isActive ? '#ff9500' : 'white'};
                        color: ${isActive ? 'white' : '#666'};
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: ${isActive ? 'bold' : 'normal'};
                        transition: all 0.3s ease;
                    ">
                シート${i + 1}
            </button>
        `;
    }
            navContainerVisible.innerHTML = navHtml;
        } else {
            sheetSelectionContainer.style.display = 'none';
            const sheetCountLabel = document.getElementById('sheetCountLabel');
            if (sheetCountLabel) sheetCountLabel.textContent = '';
        }
    }
}

function changeSheet(index) {
    console.log('changeSheet呼び出し:', { index, currentSheetIndex, totalSheets });
    if (typeof currentSheetIndex === 'number' && currentSheetIndex === index) {
        console.log('同じシートなので更新をスキップ');
        return;
    }
    currentSheetIndex = index;
    console.log('シートインデックス更新:', { currentSheetIndex, totalSheets });
    updateSheetNavigation();
    
    // 現在のタブに応じてレイアウトを更新
    const activeTab = document.querySelector('.tab-content.active');
    console.log('アクティブなタブ:', activeTab?.id);
    if (activeTab) {
        if (activeTab.id === 'pdf-layoutTab') {
            console.log('PDFレイアウトを更新します');
            updatePdfLayout();
        } else if (activeTab.id === 'network-layoutTab') {
            console.log('ネットワークレイアウトを更新します');
            updateNetworkLayout();
        }
    }
}

// クラスター選択機能
function selectCluster(index) {
    console.log('クラスター選択:', index);
    
    if (!xmlData1 && !xmlData2) {
        alert(`クラスター ${index + 1} が選択されました`);
        return;
    }
    
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    
    const sheets1 = doc1.querySelectorAll('sheets sheet');
    if (currentSheetIndex >= sheets1.length) {
        showClusterErrorModal('シートがありません', `基準XML: ${sheets1.length}シート`);
        return;
    }
    
    const sheet1 = sheets1[currentSheetIndex];
    const clusters1 = sheet1.querySelectorAll('clusters cluster');
    const cluster1 = index < clusters1.length ? clusters1[index] : null;
    
    // 基準XMLのみのプレビュー時（比較なし）→ クラスター詳細を比較時と同じ形式で表示
    if (xmlData1 && !xmlData2) {
        if (!cluster1) {
            showClusterErrorModal('クラスターが見つかりません', 
                `クラスター ${index + 1} は存在しません。（このシートのクラスター数: ${clusters1.length}）`);
            return;
        }
        
        const getClusterName = (cluster) => {
            if (!cluster) return '';
            return cluster.querySelector('displayName')?.textContent || 
                   cluster.querySelector('label')?.textContent || 
                   cluster.querySelector('clusterName')?.textContent || 
                   cluster.querySelector('name')?.textContent || '';
        };
        const getCarbonCopyInfo = (cluster, currentIndex) => {
            if (!cluster) return null;
            const carbonCopy = cluster.querySelector('carbonCopy');
            if (!carbonCopy) return null;
            const targetCluster = carbonCopy.querySelector('targetCluster');
            if (!targetCluster) return null;
            const clusterId = targetCluster.querySelector('clusterId')?.textContent || '';
            if (!clusterId) return null;
            const targetIndex = parseInt(clusterId);
            if (isNaN(targetIndex)) return null;
            const targetIndexDisplay = targetIndex + 1;
            if (targetIndexDisplay === currentIndex) return null;
            return targetIndexDisplay;
        };
        const getRequired = (cluster) => {
            if (!cluster) return 'なし';
            const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
            const required = extractParameter(inputParams, 'Required');
            if (required === 'true' || required === '1') return 'あり';
            if (required === 'false' || required === '0' || required === '') return 'なし';
            return required || 'なし';
        };
        const getActionType = (cluster) => {
            if (!cluster) return '未設定';
            const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
            return extractParameter(inputParams, 'ActionType') || extractParameter(inputParams, 'Action') || extractParameter(inputParams, 'Type') || '';
        };
        const getFormula = (cluster) => cluster ? (cluster.querySelector('function')?.textContent || '') : '';
        const getGroupId = (cluster) => {
            if (!cluster) return '';
            const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
            const groupId = extractParameter(inputParams, 'Group');
            if (groupId !== '') return groupId;
            return cluster.querySelector('groupId')?.textContent || cluster.querySelector('group')?.textContent || cluster.querySelector('groupid')?.textContent || cluster.getAttribute('groupId') || cluster.getAttribute('group') || '';
        };
        const getCustomMasterInfo = (cluster, xmlDoc) => {
            if (!cluster || !xmlDoc) return null;
            const clusterType = cluster.querySelector('type')?.textContent || '';
            if (clusterType !== 'SelectMaster') return null;
            const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
            const masterTableId = extractParameter(inputParams, 'MasterTableId') || '';
            const masterTableName = extractParameter(inputParams, 'MasterTableName') || '';
            const masterFieldNo = extractParameter(inputParams, 'MasterFieldNo') || '';
            const masterFieldName = extractParameter(inputParams, 'MasterFieldName') || '';
            const masterId = cluster.querySelector('selectMasterId')?.textContent || cluster.querySelector('selectMasterID')?.textContent || cluster.querySelector('customMasterId')?.textContent || cluster.querySelector('masterId')?.textContent || extractParameter(inputParams, 'SelectMasterId') || extractParameter(inputParams, 'MasterId') || masterTableId || '';
            let masterName = masterTableName || '';
            if (masterId && masterId.trim() !== '') {
                const allCustomMasters = xmlDoc.querySelectorAll('customMasters customMaster');
                for (const cm of allCustomMasters) {
                    const cmId = cm.querySelector('id')?.textContent || cm.querySelector('masterId')?.textContent || cm.getAttribute('id') || cm.getAttribute('masterId') || '';
                    if (cmId === masterId || cmId === masterId.trim()) {
                        const foundName = cm.querySelector('name')?.textContent || cm.querySelector('displayName')?.textContent || cm.querySelector('masterName')?.textContent || cm.getAttribute('name') || '';
                        if (foundName) masterName = foundName;
                        break;
                    }
                }
            }
            return { masterId: masterId || masterTableId || '', masterTableId, masterTableName, masterFieldNo, masterFieldName, masterName: masterName || masterTableName || '名称未設定' };
        };
        const getCurrentClusterChildInfo = (cluster) => {
            if (!cluster) return { masterKey: '', targetFieldName: '', hasInfo: false };
            const masterKey = cluster.querySelector('masterKey')?.textContent || extractParameter(cluster.querySelector('inputParameters')?.textContent || '', 'MasterKey') || cluster.getAttribute('masterKey') || '';
            const targetFieldName = cluster.querySelector('targetFieldName')?.textContent || extractParameter(cluster.querySelector('inputParameters')?.textContent || '', 'TargetFieldName') || cluster.getAttribute('targetFieldName') || '';
            return { masterKey, targetFieldName, hasInfo: !!(masterKey || targetFieldName) };
        };
        
        const currentClusterIndex = index + 1;
        const name1 = getClusterName(cluster1);
        const type1 = cluster1.querySelector('type')?.textContent || '';
        const carbonCopyTarget1 = getCarbonCopyInfo(cluster1, currentClusterIndex);
        const required1 = getRequired(cluster1);
        const actionType1 = getActionType(cluster1);
        const formula1 = getFormula(cluster1);
        const groupId1 = getGroupId(cluster1);
        const customMasterInfo1 = getCustomMasterInfo(cluster1, doc1);
        const childInfo1 = getCurrentClusterChildInfo(cluster1);
        const choices1 = Array.from(cluster1.querySelectorAll('choices choice')).map(choice => ({
            value: choice.querySelector('value')?.textContent || '',
            label: choice.querySelector('label')?.textContent || '',
            selected: choice.querySelector('selected')?.textContent || 'false'
        }));
        
        const modal = document.getElementById('clusterModal');
        const modalBody = document.getElementById('clusterModalBody');
        const modalTitle = document.getElementById('clusterModalTitle');
        if (!modal || !modalBody) return;
        
        modalTitle.textContent = '🔍 クラスター詳細情報（基準XML）';
        let html = `
            <div class="cluster-basic-info">
                <h4>📋 基本情報</h4>
                <div class="cluster-basic-item"><span class="cluster-basic-label">クラスターINDEX:</span><span class="cluster-basic-value">${index}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">クラスター名称:</span><span class="cluster-basic-value">${escapeHtml(name1 || '未設定')}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">クラスター種別:</span><span class="cluster-basic-value">${escapeHtml(getClusterTypeJapanese(type1) || '未設定')}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">カーボンコピー:</span><span class="cluster-basic-value">${carbonCopyTarget1 != null ? `${index}→${carbonCopyTarget1 - 1}` : '設定なし'}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">必須の有無:</span><span class="cluster-basic-value">${escapeHtml(required1)}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">${escapeHtml(isSignTypeCluster(type1) ? 'サイン種別:' : 'アクション種別:')}</span><span class="cluster-basic-value">${escapeHtml(isSignTypeCluster(type1) ? formatSignType(actionType1) : actionType1)}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">計算式内容:</span><span class="cluster-basic-value">${escapeHtml(formula1 || '未設定')}</span></div>
                <div class="cluster-basic-item"><span class="cluster-basic-label">グループID:</span><span class="cluster-basic-value">${escapeHtml(groupId1 || '未設定')}</span></div>
            </div>
        `;
        if (customMasterInfo1) {
            html += `
                <div class="cluster-basic-info" style="margin-top: 1rem;">
                    <h4>📌 カスタムマスター</h4>
                    <div class="cluster-basic-item"><span class="cluster-basic-label">マスター名称:</span><span class="cluster-basic-value">${escapeHtml(customMasterInfo1.masterName)}</span></div>
                    <div class="cluster-basic-item"><span class="cluster-basic-label">マスターフィールド:</span><span class="cluster-basic-value">${escapeHtml(customMasterInfo1.masterFieldName || '未設定')}</span></div>
                </div>
            `;
        }
        if (childInfo1.hasInfo) {
            html += `
                <div class="cluster-basic-info" style="margin-top: 1rem;">
                    <h4>🔗 子クラスター情報</h4>
                    <div class="cluster-basic-item"><span class="cluster-basic-label">マスターキー:</span><span class="cluster-basic-value">${escapeHtml(childInfo1.masterKey || '未設定')}</span></div>
                    <div class="cluster-basic-item"><span class="cluster-basic-label">ターゲットフィールド:</span><span class="cluster-basic-value">${escapeHtml(childInfo1.targetFieldName || '未設定')}</span></div>
                </div>
            `;
        }
        if (choices1.length > 0) {
            html += `
                <div class="cluster-basic-info" style="margin-top: 1rem;">
                    <h4>📝 選択肢</h4>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        ${choices1.map((c, i) => `<li>選択肢${i + 1}: ${escapeHtml(c.label)} (値: ${escapeHtml(c.value)}, 選択: ${c.selected === 'true' ? 'あり' : 'なし'})</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        html += getClusterModalDisplayNote();
        modalBody.innerHTML = html;
        modal.style.display = 'block';
        return;
    }
    
    // 比較モード: 比較XMLの情報を取得
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');
    const sheets2 = doc2.querySelectorAll('sheets sheet');
    
    if (currentSheetIndex >= sheets2.length) {
        showClusterErrorModal('シート情報が一致しません', 
            `基準XML: ${sheets1.length}シート、比較XML: ${sheets2.length}シート`);
        return;
    }
    
    const sheet2 = sheets2[currentSheetIndex];
    const clusters2 = sheet2.querySelectorAll('clusters cluster');
    const cluster2 = index < clusters2.length ? clusters2[index] : null;
    
    if (!cluster1 && !cluster2) {
        showClusterErrorModal('クラスターが見つかりません', 
            `クラスター ${index + 1} は基準XMLと比較XMLの両方に存在しません。<br>` +
            `基準XML: ${clusters1.length}個、比較XML: ${clusters2.length}個`);
        return;
    }
    
    // クラスター名称を取得
    const getClusterName = (cluster) => {
        if (!cluster) return '';
        return cluster.querySelector('displayName')?.textContent || 
               cluster.querySelector('label')?.textContent || 
               cluster.querySelector('clusterName')?.textContent || 
               cluster.querySelector('name')?.textContent || '';
    };
    
    // クラスターの名称と種別を取得（存在する方の情報を取得）
    const name1 = getClusterName(cluster1);
    const name2 = getClusterName(cluster2);
    const type1 = cluster1 ? (cluster1.querySelector('type')?.textContent || '') : '';
    const type2 = cluster2 ? (cluster2.querySelector('type')?.textContent || '') : '';
    
    // カーボンコピー情報を取得
    const getCarbonCopyInfo = (cluster, currentIndex) => {
        if (!cluster) return null;
        const carbonCopy = cluster.querySelector('carbonCopy');
        if (!carbonCopy) return null;
        const targetCluster = carbonCopy.querySelector('targetCluster');
        if (!targetCluster) return null;
        const clusterId = targetCluster.querySelector('clusterId')?.textContent || '';
        if (!clusterId) return null;
        // clusterIdは0始まりのインデックスなので、+1して表示用のINDEXに変換
        const targetIndex = parseInt(clusterId);
        if (isNaN(targetIndex)) return null;
        const targetIndexDisplay = targetIndex + 1; // 1始まりのINDEXに変換
        
        // カーボンコピー元と先が同じINDEXの場合は設定なしとみなす
        if (targetIndexDisplay === currentIndex) {
            return null;
        }
        
        return targetIndexDisplay;
    };
    
    const currentClusterIndex1Based = index + 1; // getCarbonCopyInfo内の比較用（1始まり）
    const carbonCopyTarget1 = getCarbonCopyInfo(cluster1, currentClusterIndex1Based);
    const carbonCopyTarget2 = getCarbonCopyInfo(cluster2, currentClusterIndex1Based);
    
    // 必須の有無を取得
    const getRequired = (cluster) => {
        if (!cluster) return 'なし';
        const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
        const required = extractParameter(inputParams, 'Required');
        if (required === 'true' || required === '1') return 'あり';
        if (required === 'false' || required === '0' || required === '') return 'なし';
        return required || 'なし';
    };
    
    // アクション種別を取得
    const getActionType = (cluster) => {
        if (!cluster) return '未設定';
        const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
        // アクション種別に関連するパラメータを確認
        const actionType = extractParameter(inputParams, 'ActionType') || 
                          extractParameter(inputParams, 'Action') || 
                          extractParameter(inputParams, 'Type') || '';
        return actionType || '未設定';
    };

    // 作成・査閲・承認クラスターかどうか（サイン種別を表示するクラスター）
    const isSignTypeCluster = (type) => ['Create', 'Inspect', 'Approval'].includes(type || '');

    // サイン種別の表示用：0→印影、1→サイン
    const formatSignType = (value) => {
        if (value === undefined || value === null) return '未設定';
        const v = String(value).trim();
        if (v === '0') return '印影';
        if (v === '1') return 'サイン';
        return v || '未設定';
    };
    
    // 計算式内容を取得
    const getFormula = (cluster) => {
        if (!cluster) return '';
        return cluster.querySelector('function')?.textContent || '';
    };
    
    // グループIDを取得（inputParametersから取得）
    const getGroupId = (cluster) => {
        if (!cluster) return '';
        // まずinputParametersからGroupパラメータを取得
        const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
        const groupId = extractParameter(inputParams, 'Group');
        if (groupId !== '') {
            return groupId;
        }
        // inputParametersにない場合は、他の要素から取得を試みる
        return cluster.querySelector('groupId')?.textContent || 
               cluster.querySelector('group')?.textContent || 
               cluster.querySelector('groupid')?.textContent || 
               cluster.getAttribute('groupId') || 
               cluster.getAttribute('group') || '';
    };
    
    // カスタムマスター情報を取得
    const getCustomMasterInfo = (cluster, xmlDoc) => {
        if (!cluster || !xmlDoc) return null;
        
        // クラスターの種別を確認（SelectMaster型の場合のみ処理）
        const clusterType = cluster.querySelector('type')?.textContent || '';
        if (clusterType !== 'SelectMaster') {
            return null; // SelectMaster型でない場合はnullを返す
        }
        
        // inputParametersを取得
        const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
        
        // inputParametersからカスタムマスター関連の情報を取得
        const masterTableId = extractParameter(inputParams, 'MasterTableId') || '';
        const masterTableName = extractParameter(inputParams, 'MasterTableName') || '';
        const masterFieldNo = extractParameter(inputParams, 'MasterFieldNo') || '';
        const masterFieldName = extractParameter(inputParams, 'MasterFieldName') || '';
        
        // カスタムマスターIDを取得（複数の方法を試す）
        const masterId = cluster.querySelector('selectMasterId')?.textContent ||
                        cluster.querySelector('selectMasterID')?.textContent ||
                        cluster.querySelector('customMasterId')?.textContent ||
                        cluster.querySelector('customMasterID')?.textContent ||
                        cluster.querySelector('masterId')?.textContent ||
                        cluster.querySelector('masterID')?.textContent ||
                        extractParameter(inputParams, 'SelectMasterId') ||
                        extractParameter(inputParams, 'CustomMasterId') ||
                        extractParameter(inputParams, 'MasterId') ||
                        masterTableId || // MasterTableIdをマスターIDとして使用
                        cluster.getAttribute('selectMasterId') ||
                        cluster.getAttribute('customMasterId') ||
                        cluster.getAttribute('masterId') || '';
        
        // カスタムマスター名称を取得（MasterTableNameを優先）
        let masterName = masterTableName || '';
        
        // カスタムマスター定義を取得（複数の方法を試す）
        if (masterId && masterId.trim() !== '') {
            // 方法1: customMastersセクションから検索
            const allCustomMasters = xmlDoc.querySelectorAll('customMasters customMaster');
            for (const cm of allCustomMasters) {
                const cmId = cm.querySelector('id')?.textContent || 
                            cm.querySelector('masterId')?.textContent ||
                            cm.getAttribute('id') || 
                            cm.getAttribute('masterId') || '';
                if (cmId === masterId || cmId === masterId.trim()) {
                    const foundName = cm.querySelector('name')?.textContent || 
                                    cm.querySelector('displayName')?.textContent || 
                                    cm.querySelector('masterName')?.textContent ||
                                    cm.getAttribute('name') || '';
                    if (foundName) {
                        masterName = foundName;
                    }
                    break;
                }
            }
            
            // 方法2: 別のセクションから検索（customMasterDefinitionsなど）
            if (!masterName || masterName === masterTableName) {
                const altCustomMasters = xmlDoc.querySelectorAll('customMasterDefinitions customMaster, masterDefinitions customMaster');
                for (const cm of altCustomMasters) {
                    const cmId = cm.querySelector('id')?.textContent || 
                                cm.querySelector('masterId')?.textContent ||
                                cm.getAttribute('id') || 
                                cm.getAttribute('masterId') || '';
                    if (cmId === masterId || cmId === masterId.trim()) {
                        const foundName = cm.querySelector('name')?.textContent || 
                                        cm.querySelector('displayName')?.textContent || 
                                        cm.querySelector('masterName')?.textContent ||
                                        cm.getAttribute('name') || '';
                        if (foundName) {
                            masterName = foundName;
                        }
                        break;
                    }
                }
            }
        }
        
        // 子クラスターに分解する設定を確認（複数の方法を試す）
        const decompose = cluster.querySelector('decompose')?.textContent ||
                         cluster.querySelector('expand')?.textContent ||
                         cluster.querySelector('expandToClusters')?.textContent ||
                         extractParameter(inputParams, 'Decompose') ||
                         extractParameter(inputParams, 'Expand') ||
                         extractParameter(inputParams, 'ExpandToClusters') ||
                         cluster.getAttribute('decompose') ||
                         cluster.getAttribute('expand') || '';
        const isDecomposed = decompose === 'true' || decompose === '1' || decompose === 'yes' || decompose === 'True';
        
        console.log('カスタムマスター情報取得:', {
            clusterType,
            masterId: masterId || masterTableId || 'ID未設定',
            masterTableId,
            masterTableName,
            masterFieldNo,
            masterFieldName,
            masterName: masterName || masterTableName || '名称未設定',
            isDecomposed,
            inputParams: inputParams.substring(0, 200) // デバッグ用に最初の200文字を表示
        });
        
        return {
            masterId: masterId || masterTableId || '',
            masterTableId: masterTableId,
            masterTableName: masterTableName,
            masterFieldNo: masterFieldNo,
            masterFieldName: masterFieldName,
            masterName: masterName || masterTableName || '名称未設定',
            isDecomposed: isDecomposed
        };
    };
    
    // クラスター情報を取得（存在する方の情報を取得）
    const required1 = getRequired(cluster1);
    const required2 = getRequired(cluster2);
    const actionType1 = getActionType(cluster1);
    const actionType2 = getActionType(cluster2);
    const formula1 = getFormula(cluster1);
    const formula2 = getFormula(cluster2);
    const groupId1 = getGroupId(cluster1);
    const groupId2 = getGroupId(cluster2);
    
    // カスタムマスター情報を取得
    // parserは既にselectCluster関数内で宣言されているので、再利用
    const xmlDoc1 = doc1; // 既に解析済みのdoc1を使用
    const xmlDoc2 = doc2; // 既に解析済みのdoc2を使用
    
    // SelectMaster型のクラスターの場合、クラスター内の全要素をログ出力（デバッグ用）
    // type1とtype2は既に宣言されているので、それを使用
    if (type1 === 'SelectMaster' || type2 === 'SelectMaster') {
        console.log('SelectMaster型クラスター検出:', { index, type1, type2 });
        if (cluster1 && type1 === 'SelectMaster') {
            const allElements1 = Array.from(cluster1.children).map(el => ({
                tagName: el.tagName,
                textContent: el.textContent?.substring(0, 100) || ''
            }));
            console.log('基準XML クラスター要素:', allElements1);
        }
        if (cluster2 && type2 === 'SelectMaster') {
            const allElements2 = Array.from(cluster2.children).map(el => ({
                tagName: el.tagName,
                textContent: el.textContent?.substring(0, 100) || ''
            }));
            console.log('比較XML クラスター要素:', allElements2);
        }
    }
    
    const customMasterInfo1 = getCustomMasterInfo(cluster1, xmlDoc1);
    const customMasterInfo2 = getCustomMasterInfo(cluster2, xmlDoc2);
    
    console.log('カスタムマスター情報取得結果:', {
        index,
        customMasterInfo1,
        customMasterInfo2
    });
    
    // 選択肢の詳細比較を実行（比較XMLのクラスターが存在する場合のみ）
    let choiceDiff = { hasDifferences: false, differences: [], choices: [], ref_choices: [] };
    if (cluster2) {
        choiceDiff = getChoiceDifference(cluster2, index);
    }
    
    // クラスター名称・種別の差分を確認
    const nameDiff = name1 !== name2;
    const typeDiff = type1 !== type2;
    
    // モーダルを表示
    const modal = document.getElementById('clusterModal');
    const modalBody = document.getElementById('clusterModalBody');
    const modalTitle = document.getElementById('clusterModalTitle');
    
    if (!modal || !modalBody) {
        console.error('クラスターモーダル要素が見つかりません');
        return;
    }
    
    // モーダルのタイトルを設定
    modalTitle.textContent = `🔍 クラスター詳細情報`;
    
    // モーダルボディの内容を生成
    let html = '';
    
    // 必ず表示する基本情報（INDEXはXMLの0始まりを表示）
    html += `
        <div class="cluster-basic-info">
            <h4>📋 基本情報</h4>
            <div class="cluster-basic-item">
                <span class="cluster-basic-label">クラスターINDEX:</span>
                <span class="cluster-basic-value">${index}</span>
            </div>
            <div class="cluster-basic-item">
                <span class="cluster-basic-label">クラスター名称:</span>
                <span class="cluster-basic-value">${escapeHtml(name2 || (cluster2 ? '未設定' : '存在しません'))}</span>
                ${nameDiff ? '<span style="color: #dc3545; margin-left: 0.5rem;">⚠️ 基準XML: ' + escapeHtml(name1 || '未設定') + '</span>' : ''}
            </div>
            <div class="cluster-basic-item">
                <span class="cluster-basic-label">クラスター種別:</span>
                <span class="cluster-basic-value">${escapeHtml(getClusterTypeJapanese(type2) || (cluster2 ? '未設定' : '存在しません'))}</span>
                ${typeDiff ? '<span style="color: #dc3545; margin-left: 0.5rem;">⚠️ 基準XML: ' + escapeHtml(getClusterTypeJapanese(type1)) + '</span>' : ''}
            </div>
            <div class="cluster-basic-item">
                <span class="cluster-basic-label">カーボンコピー:</span>
                <span class="cluster-basic-value">${carbonCopyTarget2 != null ? `${index}→${carbonCopyTarget2 - 1}` : '設定なし'}</span>
                ${carbonCopyTarget1 !== carbonCopyTarget2 ? '<span style="color: #dc3545; margin-left: 0.5rem;">⚠️ 基準XML: ' + (carbonCopyTarget1 != null ? `${index}→${carbonCopyTarget1 - 1}` : '設定なし') + '</span>' : ''}
            </div>
            ${!cluster1 ? '<div style="color: #ff9500; margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 4px;">⚠️ 基準XMLにこのクラスターは存在しません</div>' : ''}
            ${!cluster2 ? '<div style="color: #ff9500; margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 4px;">⚠️ 比較XMLにこのクラスターは存在しません</div>' : ''}
        </div>
    `;
    
    // 差分がある項目を収集
    const differenceItems = [];
    
    // クラスター名称の差分（基本情報に表示済みだが、差分項目としても追加）
    if (nameDiff && cluster1 && cluster2) {
        differenceItems.push({
            label: 'クラスター名称',
            ref: name1 || '未設定',
            comp: name2 || '未設定',
            refRaw: name1,
            compRaw: name2
        });
    }
    
    // クラスター種別の差分（基本情報に表示済みだが、差分項目としても追加）
    if (typeDiff && cluster1 && cluster2) {
        differenceItems.push({
            label: 'クラスター種別',
            ref: getClusterTypeJapanese(type1) || '未設定',
            comp: getClusterTypeJapanese(type2) || '未設定',
            refRaw: type1,
            compRaw: type2
        });
    }
    
    // 必須の有無
    if (required1 !== required2) {
        differenceItems.push({
            label: '必須の有無',
            ref: required1,
            comp: required2,
            refRaw: required1,
            compRaw: required2
        });
    }
    
    // アクション種別／サイン種別（SelectMaster型の場合は比較しない）
    if (type1 !== 'SelectMaster' && type2 !== 'SelectMaster' && actionType1 !== actionType2) {
        const signLabel = isSignTypeCluster(type1) || isSignTypeCluster(type2) ? 'サイン種別' : 'アクション種別';
        const refVal = (isSignTypeCluster(type1) || isSignTypeCluster(type2)) ? formatSignType(actionType1) : (actionType1 || '未設定');
        const compVal = (isSignTypeCluster(type1) || isSignTypeCluster(type2)) ? formatSignType(actionType2) : (actionType2 || '未設定');
        differenceItems.push({
            label: signLabel,
            ref: refVal,
            comp: compVal,
            refRaw: actionType1,
            compRaw: actionType2
        });
    }
    
    // 計算式内容
    if (formula1 !== formula2) {
        differenceItems.push({
            label: '計算式内容',
            ref: formula1 || '未設定',
            comp: formula2 || '未設定',
            refRaw: formula1,
            compRaw: formula2
        });
    }
    
    // グループID（チェッククラスターの場合、一致していてもグループIDが異なる場合は表示）
    // チェッククラスター（typeが'Check'）の場合、グループIDが異なる場合は必ず表示
    const isCheckCluster = (type1 === 'Check' || type2 === 'Check');
    if (groupId1 !== groupId2) {
        differenceItems.push({
            label: 'グループID' + (isCheckCluster ? ' (チェッククラスター)' : ''),
            ref: groupId1 || '未設定',
            comp: groupId2 || '未設定',
            refRaw: groupId1,
            compRaw: groupId2
        });
    }
    
    // カスタムマスター情報の比較
    if (customMasterInfo1 || customMasterInfo2) {
        const masterName1 = customMasterInfo1?.masterName || '';
        const masterName2 = customMasterInfo2?.masterName || '';
        const masterFieldName1 = customMasterInfo1?.masterFieldName || '';
        const masterFieldName2 = customMasterInfo2?.masterFieldName || '';
        
        // カスタムマスター名称の比較
        if (masterName1 !== masterName2) {
            differenceItems.push({
                label: 'カスタムマスター名称',
                ref: masterName1 || '未設定',
                comp: masterName2 || '未設定',
                refRaw: masterName1,
                compRaw: masterName2
            });
        }
        
        // マスターフィールド名称の比較
        if (masterFieldName1 !== masterFieldName2) {
            differenceItems.push({
                label: 'マスターフィールド名称',
                ref: masterFieldName1 || '未設定',
                comp: masterFieldName2 || '未設定',
                refRaw: masterFieldName1,
                compRaw: masterFieldName2
            });
        }
    }
    
    // 子クラスター情報の取得（現在のクラスター自体が子クラスターの場合）
    const getCurrentClusterChildInfo = (cluster) => {
        if (!cluster) {
            return {
                masterKey: '',
                targetFieldName: '',
                hasInfo: false
            };
        }
        
        // 現在のクラスターが子クラスターかどうかを判断
        // masterKeyまたはtargetFieldNameが存在する場合は子クラスターとみなす
        const masterKey = cluster.querySelector('masterKey')?.textContent ||
                         extractParameter(cluster.querySelector('inputParameters')?.textContent || '', 'MasterKey') ||
                         cluster.getAttribute('masterKey') || '';
        const targetFieldName = cluster.querySelector('targetFieldName')?.textContent ||
                               extractParameter(cluster.querySelector('inputParameters')?.textContent || '', 'TargetFieldName') ||
                               cluster.getAttribute('targetFieldName') || '';
        
        const hasInfo = !!(masterKey || targetFieldName);
        
        return {
            masterKey: masterKey || '',
            targetFieldName: targetFieldName || '',
            hasInfo: hasInfo
        };
    };
    
    // SelectMaster型のクラスターの場合は子クラスター情報を表示しない
    // 現在のクラスター自体が子クラスターの場合のみ情報を表示
    if (type1 !== 'SelectMaster' && type2 !== 'SelectMaster') {
        const childInfo1 = getCurrentClusterChildInfo(cluster1);
        const childInfo2 = getCurrentClusterChildInfo(cluster2);
        
        // 子クラスター情報の比較
        // 片方または両方に情報がある場合に比較を行う
        if (childInfo1.hasInfo || childInfo2.hasInfo) {
            const masterKey1 = childInfo1.masterKey;
            const masterKey2 = childInfo2.masterKey;
            const targetFieldName1 = childInfo1.targetFieldName;
            const targetFieldName2 = childInfo2.targetFieldName;
            
            // マスターキーの比較
            // 片方にしか情報がない場合、または両方に情報があるが値が異なる場合は差異として表示
            if (masterKey1 !== masterKey2) {
                differenceItems.push({
                    label: 'マスターキー',
                    ref: masterKey1 || '未設定',
                    comp: masterKey2 || '未設定',
                    refRaw: masterKey1,
                    compRaw: masterKey2
                });
            }
            
            // ターゲットフィールド名称の比較
            // 片方にしか情報がない場合、または両方に情報があるが値が異なる場合は差異として表示
            if (targetFieldName1 !== targetFieldName2) {
                differenceItems.push({
                    label: 'ターゲットフィールド名称',
                    ref: targetFieldName1 || '未設定',
                    comp: targetFieldName2 || '未設定',
                    refRaw: targetFieldName1,
                    compRaw: targetFieldName2
                });
            }
        }
    }
    
    // 選択肢
    if (choiceDiff.hasDifferences) {
        differenceItems.push({
            label: '選択肢',
            ref: choiceDiff.ref_choices.length > 0 ? `${choiceDiff.ref_choices.length}個` : 'なし',
            comp: choiceDiff.choices.length > 0 ? `${choiceDiff.choices.length}個` : 'なし',
            refRaw: choiceDiff.ref_choices,
            compRaw: choiceDiff.choices,
            isChoices: true
        });
    }
    
    // 差分がある場合のみ表示
    if (differenceItems.length > 0) {
        html += `
            <div class="cluster-difference-info">
                <h4>⚠️ 比較元と異なる項目</h4>
        `;
        
        differenceItems.forEach(item => {
            if (item.isChoices) {
                // 選択肢の詳細表示
                html += `
                    <div class="cluster-difference-item">
                        <div class="cluster-difference-item-label">${escapeHtml(item.label)}</div>
                        <div class="cluster-difference-item-value">
                            <strong>基準XML:</strong> ${escapeHtml(item.ref)}<br>
                            <strong>比較XML:</strong> ${escapeHtml(item.comp)}
                        </div>
                        <div style="margin-top: 0.75rem;">
                            <strong>基準XMLの選択肢:</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                                ${item.refRaw.length > 0 ? 
                                    item.refRaw.map((choice, i) => 
                                        `<li>選択肢${i + 1}: ${escapeHtml(choice.label)} (値: ${escapeHtml(choice.value)}, 選択: ${choice.selected === 'true' ? 'あり' : 'なし'})</li>`
                                    ).join('') : 
                                    '<li>選択肢なし</li>'
                                }
                            </ul>
                            <strong>比較XMLの選択肢:</strong>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                                ${item.compRaw.length > 0 ? 
                                    item.compRaw.map((choice, i) => 
                                        `<li>選択肢${i + 1}: ${escapeHtml(choice.label)} (値: ${escapeHtml(choice.value)}, 選択: ${choice.selected === 'true' ? 'あり' : 'なし'})</li>`
                                    ).join('') : 
                                    '<li>選択肢なし</li>'
                                }
                            </ul>
                        </div>
                    </div>
                `;
            } else if (item.isInfo) {
                // カスタムマスター情報の表示（情報表示用）
                html += `
                    <div class="cluster-difference-item" style="background: #e7f3ff; border-left: 4px solid #007bff;">
                        <div class="cluster-difference-item-label">${escapeHtml(item.label)}</div>
                        <div class="cluster-difference-item-value">
                            <strong>基準XML:</strong> ${escapeHtml(item.ref)}<br>
                            <strong>比較XML:</strong> ${escapeHtml(item.comp)}
                        </div>
                    </div>
                `;
    } else {
                html += `
                    <div class="cluster-difference-item">
                        <div class="cluster-difference-item-label">${escapeHtml(item.label)}</div>
                        <div class="cluster-difference-item-value">
                            <strong>基準XML:</strong> ${escapeHtml(item.ref)}<br>
                            <strong>比較XML:</strong> ${escapeHtml(item.comp)}
                        </div>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
    } else {
        // 差分なしの場合
        html += `
            <div class="cluster-no-difference">
                ✅ 差分なし: 基準XMLと設定が同じです。
            </div>
        `;
    }
    
    html += getClusterModalDisplayNote();
    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

// クラスターモーダルを閉じる
function closeClusterModal(event) {
    const modal = document.getElementById('clusterModal');
    if (!modal) return;
    
    // モーダル背景をクリックした場合、または閉じるボタンをクリックした場合
    if (!event || event.target === modal || event.target.classList.contains('cluster-modal-close')) {
        modal.style.display = 'none';
    }
}

// クラスターエラーモーダルを表示
function showClusterErrorModal(title, message) {
    const modal = document.getElementById('clusterModal');
    const modalBody = document.getElementById('clusterModalBody');
    const modalTitle = document.getElementById('clusterModalTitle');
    
    if (!modal || !modalBody) {
        console.error('クラスターモーダル要素が見つかりません');
        alert(`${title}\n\n${message}`);
        return;
    }
    
    // モーダルのタイトルを設定
    modalTitle.textContent = `⚠️ ${title}`;
    
    // エラーメッセージを表示
    const html = `
        <div style="padding: 2rem; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h4 style="color: #dc3545; margin-bottom: 1rem;">${title}</h4>
            <div style="background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 1rem; color: #721c24; line-height: 1.6;">
                ${message}
            </div>
            <div style="margin-top: 1.5rem; color: #6c757d; font-size: 0.9rem;">
                比較元と異なるXMLファイルのため、クラスターの比較ができません。
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

// 比較レイアウト生成関数
async function generateComparePdfLayoutSingleView(xmlData1, xmlData2, displayMode, scale) {
    const viewer = document.getElementById('pdfViewer');
    const parser = new DOMParser();
    
    // 基準XMLと比較XMLの両方を解析
    const xmlDoc1 = parser.parseFromString(xmlData1, 'text/xml');
    const xmlDoc2 = parser.parseFromString(xmlData2, 'text/xml');
    const sheets1 = xmlDoc1.querySelectorAll('sheets sheet');
    const sheets2 = xmlDoc2.querySelectorAll('sheets sheet');
    if (sheets1.length === 0 || sheets2.length === 0) {
        viewer.innerHTML = '<div class="pdf-placeholder">シート情報が見つかりません</div>';
        return;
    }
    
    // シート情報をグローバル変数に保存
    totalSheets = sheets2.length;
    if (currentSheetIndex >= totalSheets) {
        currentSheetIndex = 0;
    }
    
    console.log('generateComparePdfLayoutSingleView - シート情報:', {
        currentSheetIndex,
        totalSheets,
        sheetName: sheets2[currentSheetIndex]?.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`
    });
    
    // シートナビゲーションを更新
    updateSheetNavigation();
    
    // 基準XMLのシート情報を取得（2シート目以降も正しく取得できるか確認）
    if (!sheets1[currentSheetIndex]) {
        console.error(`基準XML: シートインデックス${currentSheetIndex}が見つかりません。総シート数: ${sheets1.length}`);
        viewer.innerHTML = `<div class="pdf-placeholder">エラー: シート${currentSheetIndex + 1}が見つかりません（総シート数: ${sheets1.length}）</div>`;
        return;
    }
    if (!sheets2[currentSheetIndex]) {
        console.error(`比較XML: シートインデックス${currentSheetIndex}が見つかりません。総シート数: ${sheets2.length}`);
        viewer.innerHTML = `<div class="pdf-placeholder">エラー: シート${currentSheetIndex + 1}が見つかりません（総シート数: ${sheets2.length}）</div>`;
        return;
    }
    
    const sheet1 = sheets1[currentSheetIndex];
    const width1 = parseFloat(sheet1.querySelector('width')?.textContent || '595.32');
    const height1 = parseFloat(sheet1.querySelector('height')?.textContent || '841.92');
    const clusters1 = sheet1.querySelectorAll('clusters cluster');
    const sheetName1 = sheet1.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`;
    // 基準XMLのシートから背景画像を取得（シートにない場合はルートレベルから取得）
    const sheetBackgroundImage1 = sheet1.querySelector('backgroundImage')?.textContent;
    const rootBackgroundImage1 = xmlDoc1.querySelector('backgroundImage')?.textContent;
    const backgroundImage1 = sheetBackgroundImage1 || rootBackgroundImage1;
    
    console.log(`基準XML シート${currentSheetIndex + 1}情報:`, {
        sheetName: sheetName1,
        width: width1,
        height: height1,
        clusterCount: clusters1.length,
        hasSheetBackground: !!sheetBackgroundImage1,
        hasRootBackground: !!rootBackgroundImage1,
        finalBackground: !!backgroundImage1
    });
    
    // 比較XMLのシート情報を取得（2シート目以降も正しく取得できるか確認）
    const sheet2 = sheets2[currentSheetIndex];
    const width2 = parseFloat(sheet2.querySelector('width')?.textContent || '595.32');
    const height2 = parseFloat(sheet2.querySelector('height')?.textContent || '841.92');
    const clusters2 = sheet2.querySelectorAll('clusters cluster');
    const sheetName2 = sheet2.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`;
    // 比較XMLのシートから背景画像を取得（シートにない場合はルートレベルから取得）
    const sheetBackgroundImage2 = sheet2.querySelector('backgroundImage')?.textContent;
    const rootBackgroundImage2 = xmlDoc2.querySelector('backgroundImage')?.textContent;
    const backgroundImage2 = sheetBackgroundImage2 || rootBackgroundImage2;
    
    console.log(`比較XML シート${currentSheetIndex + 1}情報:`, {
        sheetName: sheetName2,
        width: width2,
        height: height2,
        clusterCount: clusters2.length,
        hasSheetBackground: !!sheetBackgroundImage2,
        hasRootBackground: !!rootBackgroundImage2,
        finalBackground: !!backgroundImage2
    });
    
    console.log('背景画像取得詳細:', {
        currentSheetIndex,
        sheetName: sheetName2,
        hasSheetBackground: !!sheetBackgroundImage2,
        hasRootBackground: !!rootBackgroundImage2,
        sheetBackgroundLength: sheetBackgroundImage2?.length,
        rootBackgroundLength: rootBackgroundImage2?.length,
        finalBackgroundLength: backgroundImage2?.length
    });
    
    // 背景画像のクリーニング
    let cleanedBackgroundImage1 = null;
    let cleanedBackgroundImage2 = null;
    if (backgroundImage1) {
        cleanedBackgroundImage1 = backgroundImage1;
        if (backgroundImage1.includes('\n') || backgroundImage1.includes(' ') || backgroundImage1.includes('\t')) {
            cleanedBackgroundImage1 = backgroundImage1.replace(/[\r\n\s\t]/g, '');
        }
    }
    if (backgroundImage2) {
        cleanedBackgroundImage2 = backgroundImage2;
        if (backgroundImage2.includes('\n') || backgroundImage2.includes(' ') || backgroundImage2.includes('\t')) {
            cleanedBackgroundImage2 = backgroundImage2.replace(/[\r\n\s\t]/g, '');
        }
    }
    
    // XMLから取得したPDFサイズを基準に、ビューアーサイズに合わせて最適化
    const pdfViewer = document.getElementById('pdfViewer');
    const viewerRect = pdfViewer.getBoundingClientRect();
    
    // 余白を最小限に設定（視認性を保ちつつ余白を削減）
    const outerPadding = 10; // 外側の余白
    const gap = 15; // 左右パネル間の余白
    const contentPadding = 5; // PDFコンテンツの余白を最小限に（5px）
    const titleHeight = 0; // タイトルは表示しないので0
    
    // 各パネルに使用可能なサイズを計算
    const availableWidth = (viewerRect.width - outerPadding * 2 - gap) / 2;
    const availableHeight = viewerRect.height - outerPadding * 2 - titleHeight;
    
    // 両方のPDFサイズを考慮してスケールを計算
    const maxWidth = Math.max(width1, width2);
    const maxHeight = Math.max(height1, height2);
    
    // コンテナ内に収まるようにスケールを計算（余白を最小限に）
    const scaleX = (availableWidth - contentPadding * 2) / maxWidth;
    const scaleY = (availableHeight - contentPadding * 2) / maxHeight;
    const optimalScale = Math.min(scaleX, scaleY, 1.0); // 最大100%まで（拡大しない）
    
    // スケール適用後の実際のサイズを計算（XMLから取得したサイズを基準）
    const scaledWidth1 = width1 * optimalScale;
    const scaledHeight1 = height1 * optimalScale;
    const scaledWidth2 = width2 * optimalScale;
    const scaledHeight2 = height2 * optimalScale;
    
    // コンテナのサイズをPDFのスケール後のサイズに合わせて固定（余白を最小限に）
    // XMLから取得したサイズを基準に、余白を最小限にして固定表示
    const containerWidth1 = scaledWidth1 + contentPadding * 2;
    const containerWidth2 = scaledWidth2 + contentPadding * 2;
    const containerHeight1 = scaledHeight1 + contentPadding * 2;
    const containerHeight2 = scaledHeight2 + contentPadding * 2;
    
    // 両方のコンテナサイズの最大値を取得（統一表示のため）
    const containerWidthFinal = Math.max(containerWidth1, containerWidth2);
    const containerHeightFinal = Math.max(containerHeight1, containerHeight2);
    
    console.log('比較用PDFスケール計算（最適化後）:', {
        xmlSize: { width1, height1, width2, height2 },
        maxSize: { width: maxWidth, height: maxHeight },
        viewerSize: { width: availableWidth, height: availableHeight },
        scaleFactors: { scaleX, scaleY },
        optimalScale,
        scaledSize1: { width: scaledWidth1, height: scaledHeight1 },
        scaledSize2: { width: scaledWidth2, height: scaledHeight2 },
        containerSize: { width: containerWidthFinal, height: containerHeightFinal },
        contentPadding
    });
    
    // PDFサイズと座標計算の基準値を詳細にログ出力
    console.log('PDF座標計算の基準情報:', {
        sheetInfo: {
            name: sheetName2,
            currentSheetIndex: currentSheetIndex,
            totalSheets: sheets2.length
        },
        pdfDimensions: {
            width: width2,
            height: height2,
            widthType: typeof width2,
            heightType: typeof height2
        },
        scale: scale,
        scaledDimensions: {
            width: width2 * scale,
            height: height2 * scale
        },
        clusters: {
            count: clusters2.length,
            elements: Array.from(clusters2).map((cluster, index) => ({
                index: index,
                hasTop: !!cluster.querySelector('top'),
                hasLeft: !!cluster.querySelector('left'),
                hasRight: !!cluster.querySelector('right'),
                hasBottom: !!cluster.querySelector('bottom')
            }))
        }
    });
    
    // 背景画像データの詳細検証
    console.log('比較XML背景画像:', { 
        hasBackground: !!backgroundImage2, 
        backgroundLength: backgroundImage2?.length,
        backgroundStart: backgroundImage2?.substring(0, 50) + '...',
        displayMode: displayMode
    });
    
    // 背景画像データの品質チェックとクリーニング
    let cleanedBackgroundImage = null;
    if (backgroundImage2) {
        console.log('背景画像データの品質チェック:', {
            dataLength: backgroundImage2.length,
            dataType: typeof backgroundImage2,
            containsNewlines: backgroundImage2.includes('\n'),
            containsSpaces: backgroundImage2.includes(' '),
            containsTabs: backgroundImage2.includes('\t'),
            containsInvalidChars: /[^A-Za-z0-9+/=]/.test(backgroundImage2),
            paddingCheck: backgroundImage2.length % 4 === 0,
            firstChar: backgroundImage2.charAt(0),
            lastChar: backgroundImage2.charAt(backgroundImage2.length - 1),
            isBase64Valid: /^[A-Za-z0-9+/]*={0,2}$/.test(backgroundImage2)
        });
        
        // データのクリーニングを試行
        cleanedBackgroundImage = backgroundImage2;
        if (backgroundImage2.includes('\n') || backgroundImage2.includes(' ') || backgroundImage2.includes('\t')) {
            cleanedBackgroundImage = backgroundImage2.replace(/[\r\n\s\t]/g, '');
            console.log('背景画像データをクリーニングしました:', {
                originalLength: backgroundImage2.length,
                cleanedLength: cleanedBackgroundImage.length,
                cleanedStart: cleanedBackgroundImage.substring(0, 50) + '...'
            });
        }
    }
    
    // シート名を更新
    const sheetNameElement = document.getElementById('pdfSheetName');
    if (sheetNameElement) {
        sheetNameElement.textContent = sheetName2;
    }

    // PDFの元のサイズを保存（グローバル変数に）
    pdfOriginalWidth = maxWidth;
    pdfOriginalHeight = maxHeight;
    pdfScale = optimalScale; // 初期スケールを設定
    
    // 左右に並べて表示するレイアウトを生成
    let layoutHtml = `
        <div style="display: flex; gap: ${gap}px; justify-content: center; align-items: flex-start; padding: ${outerPadding}px;">
            <!-- 左側：基準XML -->
            <div style="flex: 1; text-align: center;">
                <h4 style="color: #ff9500; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">📄 基準XML</h4>
                <div id="pdfContainer1" style="
                position: relative;
                    width: ${containerWidthFinal}px;
                    height: ${containerHeightFinal}px;
                    border: 2px solid #ff9500;
                background: white;
                margin: 0 auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(255, 149, 0, 0.15);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div id="pdfContent1" style="
                    position: relative;
                        width: ${scaledWidth1}px;
                        height: ${scaledHeight1}px;
                        margin: ${contentPadding}px auto;
                    ">
    `;
    
    // 基準XMLの背景PDFを表示
    if (displayMode !== 'background') {
        const backgroundImageToUse1 = cleanedBackgroundImage1 || backgroundImage1;
        if (backgroundImageToUse1 && backgroundImageToUse1.length > 100) {
            const isPdfData1 = backgroundImageToUse1.startsWith('JVBERi0') || backgroundImageToUse1.substring(0, 20).includes('PDF');
            if (isPdfData1) {
                // PDF.jsを使用してPDFを画像として表示（余白をなくすため）
                layoutHtml += `
                    <div id="pdfBackground1" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth1}px;
                        height: ${scaledHeight1}px;
                        background: white;
                        z-index: 1;
                        overflow: hidden;
                    ">
                        <canvas id="pdfCanvas1" style="
                            width: 100%;
                            height: 100%;
                            display: block;
                        "></canvas>
                    </div>
                `;
                // PDF.jsでPDFを画像として描画（非同期処理）
                // シートごとに異なるPDFが設定されている場合は1ページ目、同じPDFの場合はcurrentSheetIndex + 1ページ目を表示
                // シートごとに異なるPDFが設定されているかどうかを判定（シートにbackgroundImageがある場合は専用PDFとみなす）
                const useSheetSpecificPage = !sheetBackgroundImage1 && rootBackgroundImage1;
                const pageNumber = useSheetSpecificPage ? (currentSheetIndex + 1) : 1;
                setTimeout(() => {
                    renderPdfAsImage(backgroundImageToUse1, 'pdfCanvas1', scaledWidth1, scaledHeight1, pageNumber);
                }, 100);
            } else {
                layoutHtml += `
                    <div id="pdfBackground1" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth1}px;
                        height: ${scaledHeight1}px;
                        background-image: url('data:image/png;base64,${backgroundImageToUse1}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: top left;
                        z-index: 1;
                    "></div>
                `;
            }
        }
    }
    
    // 基準XMLのクラスターを表示
    clusters1.forEach((cluster, index) => {
        // 基準XMLのクラスター座標を計算
        const rawTop1 = cluster.querySelector('top')?.textContent || '0';
        const rawLeft1 = cluster.querySelector('left')?.textContent || '0';
        const rawRight1 = cluster.querySelector('right')?.textContent || '0';
        const rawBottom1 = cluster.querySelector('bottom')?.textContent || '0';
        
        const effectiveWidth1 = width1;
        const effectiveHeight1 = height1;
        const topOriginal1 = parseFloat(rawTop1) * effectiveHeight1;
        const leftOriginal1 = parseFloat(rawLeft1) * effectiveWidth1;
        const rightOriginal1 = parseFloat(rawRight1) * effectiveWidth1;
        const bottomOriginal1 = parseFloat(rawBottom1) * effectiveHeight1;
        const clusterWidthOriginal1 = rightOriginal1 - leftOriginal1;
        const clusterHeightOriginal1 = bottomOriginal1 - topOriginal1;
        
        const top1 = topOriginal1 * optimalScale;
        const left1 = leftOriginal1 * optimalScale;
        const clusterWidth1 = clusterWidthOriginal1 * optimalScale;
        const clusterHeight1 = clusterHeightOriginal1 * optimalScale;
        
        // 基準XMLのクラスターは常にオレンジ色
        const borderColor1 = '#ff9500';
        
        layoutHtml += `
            <div class="cluster-overlay" 
                 style="
                     position: absolute;
                     top: ${top1}px;
                     left: ${left1}px;
                     width: ${clusterWidth1}px;
                     height: ${clusterHeight1}px;
                     border: none;
                     background: transparent;
                     border-radius: 8px;
                     cursor: pointer;
                     z-index: 2;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                 "
                 data-cluster-index="${index}"
                 data-diff="reference"
                 data-original-top="${topOriginal1}"
                 data-original-left="${leftOriginal1}"
                 data-original-width="${clusterWidthOriginal1}"
                 data-original-height="${clusterHeightOriginal1}">
                <div class="cluster-label" style="
                    background: linear-gradient(135deg, ${borderColor1} 0%, #e68900 100%);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${index}</div>
            </div>
        `;
    });
    layoutHtml += `
                    </div>
                </div>
            </div>
            
            <!-- 右側：比較XML -->
            <div style="flex: 1; text-align: center;">
                <h4 style="color: #007bff; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">📄 比較XML</h4>
                <div id="pdfContainer2" style="
                    position: relative;
                    width: ${containerWidthFinal}px;
                    height: ${containerHeightFinal}px;
                    border: 2px solid #007bff;
                    background: white;
                    margin: 0 auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div id="pdfContent2" style="
                        position: relative;
                        width: ${scaledWidth2}px;
                        height: ${scaledHeight2}px;
                        margin: ${contentPadding}px auto;
                    ">
    `;
    
    // 比較XMLの背景PDFを表示
    if (displayMode !== 'background') {
        const backgroundImageToUse2 = cleanedBackgroundImage2 || backgroundImage2;
        if (backgroundImageToUse2 && backgroundImageToUse2.length > 100) {
            const isPdfData2 = backgroundImageToUse2.startsWith('JVBERi0') || backgroundImageToUse2.substring(0, 20).includes('PDF');
            if (isPdfData2) {
                // PDF.jsを使用してPDFを画像として表示（余白をなくすため）
                layoutHtml += `
                    <div id="pdfBackground2" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth2}px;
                        height: ${scaledHeight2}px;
                        background: white;
                        z-index: 1;
                        overflow: hidden;
                    ">
                        <canvas id="pdfCanvas2" style="
                            width: 100%;
                            height: 100%;
                            display: block;
                        "></canvas>
                    </div>
                `;
                // PDF.jsでPDFを画像として描画（非同期処理）
                // シートごとに異なるPDFが設定されている場合は1ページ目、同じPDFの場合はcurrentSheetIndex + 1ページ目を表示
                // シートごとに異なるPDFが設定されているかどうかを判定（シートにbackgroundImageがある場合は専用PDFとみなす）
                const useSheetSpecificPage2 = !sheetBackgroundImage2 && rootBackgroundImage2;
                const pageNumber2 = useSheetSpecificPage2 ? (currentSheetIndex + 1) : 1;
                setTimeout(() => {
                    renderPdfAsImage(backgroundImageToUse2, 'pdfCanvas2', scaledWidth2, scaledHeight2, pageNumber2);
                }, 100);
        } else {
                layoutHtml += `
                    <div id="pdfBackground2" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${scaledWidth2}px;
                        height: ${scaledHeight2}px;
                        background-image: url('data:image/png;base64,${backgroundImageToUse2}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: top left;
                        z-index: 1;
                    "></div>
                `;
            }
        }
    }
    
    // 比較XMLのクラスターを表示
    clusters2.forEach((cluster, index) => {
        // 比較XMLのクラスター座標を計算
        const rawTop2 = cluster.querySelector('top')?.textContent || '0';
        const rawLeft2 = cluster.querySelector('left')?.textContent || '0';
        const rawRight2 = cluster.querySelector('right')?.textContent || '0';
        const rawBottom2 = cluster.querySelector('bottom')?.textContent || '0';
        
        const effectiveWidth2 = width2;
        const effectiveHeight2 = height2;
        const topOriginal2 = parseFloat(rawTop2) * effectiveHeight2;
        const leftOriginal2 = parseFloat(rawLeft2) * effectiveWidth2;
        const rightOriginal2 = parseFloat(rawRight2) * effectiveWidth2;
        const bottomOriginal2 = parseFloat(rawBottom2) * effectiveHeight2;
        const clusterWidthOriginal2 = rightOriginal2 - leftOriginal2;
        const clusterHeightOriginal2 = bottomOriginal2 - topOriginal2;
        
        const top2 = topOriginal2 * optimalScale;
        const left2 = leftOriginal2 * optimalScale;
        const clusterWidth2 = clusterWidthOriginal2 * optimalScale;
        const clusterHeight2 = clusterHeightOriginal2 * optimalScale;
        
        // クラスターの違いを判定（基準XMLとの比較）
        const diffResult = checkClusterDifference(cluster, index);
        const isDifferent = diffResult.hasDifference;
        const isBasicMatch = diffResult.isBasicMatch;
        const hasOtherDifferences = diffResult.hasOtherDifferences;
        const differences = diffResult.differences || [];
        
        // INDEXと種別が一致しているが、他の項目が異なる場合は青色で！マークを表示
        // INDEXと種別が異なる場合は赤色
        let borderColor2 = '#007bff'; // デフォルトは青色
        let showWarning = false;
        let warningColor = '#007bff'; // 警告マークの色（デフォルトは青色）
        
        if (isBasicMatch && hasOtherDifferences) {
            // INDEXと種別が一致しているが、他の項目が異なる場合
            borderColor2 = '#007bff'; // 青色
            showWarning = true; // ！マークを表示
            warningColor = '#007bff'; // 青色の！マーク
        } else if (!isBasicMatch) {
            // INDEXと種別が異なる場合
            borderColor2 = '#dc3545'; // 赤色
            showWarning = true; // ！マークを表示
            warningColor = '#dc3545'; // 赤色の！マーク
        }
        
        // 異なる項目のリストを生成（ツールチップ用）
        const differencesText = differences.length > 0 ? differences.join(', ') : '';
        const tooltipText = differencesText ? `異なる項目: ${differencesText}` : '';
        
        layoutHtml += `
            <div class="cluster-overlay" 
                 style="
                     position: absolute;
                     top: ${top2}px;
                     left: ${left2}px;
                     width: ${clusterWidth2}px;
                     height: ${clusterHeight2}px;
                     border: none;
                     background: transparent;
                     border-radius: 8px;
                     cursor: pointer;
                     z-index: 2;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                 "
                 data-cluster-index="${index}"
                 data-diff="${isDifferent ? 'different' : 'same'}"
                 data-original-top="${topOriginal2}"
                 data-original-left="${leftOriginal2}"
                 data-original-width="${clusterWidthOriginal2}"
                 data-original-height="${clusterHeightOriginal2}"
                 title="${tooltipText}">
                <div class="cluster-label" style="
                    background: linear-gradient(135deg, ${borderColor2} 0%, ${borderColor2 === '#007bff' ? '#0056b3' : '#c82333'} 100%);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${index}</div>
                ${showWarning ? `<div class="cluster-difference-indicator" style="position: absolute; top: -5px; right: -5px; width: 20px; height: 20px; background: ${warningColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">!</div>` : ''}
            </div>
        `;
    });
    layoutHtml += `
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('生成されたHTML:', layoutHtml.substring(0, 500) + '...');
    console.log('HTMLの長さ:', layoutHtml.length);
    
    // HTMLを設定する前に、背景画像要素が含まれているか確認
    const hasBackgroundElement = layoutHtml.includes('pdfBackground') || layoutHtml.includes('pdf-background');
    console.log('背景要素の確認:', { 
        hasBackgroundElement, 
        hasPdfBackgroundId: layoutHtml.includes('pdfBackground'),
        hasPdfBackgroundClass: layoutHtml.includes('pdf-background'),
        backgroundElementIndex: layoutHtml.indexOf('pdfBackground'),
        backgroundElementFound: hasBackgroundElement ? '見つかりました' : '見つかりません'
    });
    
    viewer.innerHTML = layoutHtml;
    
    // マウスホイールで拡大縮小（CtrlキーまたはCmdキーを押しながら）
    setTimeout(() => {
        const pdfContainer1 = document.getElementById('pdfContainer1');
        const pdfContainer2 = document.getElementById('pdfContainer2');
        [pdfContainer1, pdfContainer2].forEach(pdfContainer => {
        if (pdfContainer) {
            pdfContainer.addEventListener('wheel', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    pdfScale = Math.max(0.5, Math.min(3.0, pdfScale + delta));
                    updatePdfScale();
                }
            }, { passive: false });
            }
        });
    }, 100);
}

// クラスター比較ヘルパー関数
function checkClusterDifference(cluster, index) {
    return checkClusterDifferenceCore(cluster, index, { xmlData1, xmlData2, currentSheetIndex });
}

// 比較ネットワークレイアウト生成関数
function generateCompareNetworkLayoutSingleView(xmlData1, xmlData2) {
    const viewer = document.getElementById('networkViewer');
    if (!viewer) {
        console.warn('networkViewer要素が見つかりません');
        return;
    }
    const parser = new DOMParser();
    
    // 両方のXMLを解析（比較用）
    const xmlDoc1 = parser.parseFromString(xmlData1, 'text/xml');
    const xmlDoc2 = parser.parseFromString(xmlData2, 'text/xml');
    
    // シート情報を取得
    const sheets1 = xmlDoc1.querySelectorAll('sheets sheet');
    const sheets2 = xmlDoc2.querySelectorAll('sheets sheet');
    
    if (sheets1.length === 0 || sheets2.length === 0) {
        viewer.innerHTML = '<div class="network-placeholder">シート情報が見つかりません</div>';
        return;
    }
    
    // グローバル変数のtotalSheetsを更新（シートナビゲーション用）
    totalSheets = Math.max(sheets1.length, sheets2.length);
    
    console.log('generateCompareNetworkLayoutSingleView - シート情報:', {
        currentSheetIndex,
        totalSheets,
        sheetName: sheets2[currentSheetIndex]?.querySelector('defSheetName')?.textContent || `シート${currentSheetIndex + 1}`
    });
    
    // シートナビゲーションを更新
    updateNetworkSheetNavigation();
    
    // シートインデックスの範囲チェック（2シート目以降も正しく取得できるか確認）
    if (!sheets1[currentSheetIndex]) {
        console.error(`基準XML: シートインデックス${currentSheetIndex}が見つかりません。総シート数: ${sheets1.length}`);
        viewer.innerHTML = `<div class="network-placeholder">エラー: シート${currentSheetIndex + 1}が見つかりません（総シート数: ${sheets1.length}）</div>`;
        return;
    }
    if (!sheets2[currentSheetIndex]) {
        console.error(`比較XML: シートインデックス${currentSheetIndex}が見つかりません。総シート数: ${sheets2.length}`);
        viewer.innerHTML = `<div class="network-placeholder">エラー: シート${currentSheetIndex + 1}が見つかりません（総シート数: ${sheets2.length}）</div>`;
        return;
    }
    
    const sheet1 = sheets1[currentSheetIndex];
    const sheet2 = sheets2[currentSheetIndex];
    
    const width1 = parseFloat(sheet1.querySelector('width')?.textContent || '595.32');
    const height1 = parseFloat(sheet1.querySelector('height')?.textContent || '841.92');
    const width2 = parseFloat(sheet2.querySelector('width')?.textContent || '595.32');
    const height2 = parseFloat(sheet2.querySelector('height')?.textContent || '841.92');
    
    // 基準XMLと比較XMLのクラスター情報を取得
    const clusters1 = sheet1.querySelectorAll('clusters cluster');
    const clusters2 = sheet2.querySelectorAll('clusters cluster');
    
    // スケール計算は後で行う（横並び表示のため）
    
    // ネットワーク情報を取得（現在のシートに関連するネットワークのみをフィルタリング）
    // シート番号は1ベース（1, 2, 3...）、currentSheetIndexは0ベース（0, 1, 2...）なので、+1して比較
    const currentSheetNumber = currentSheetIndex + 1;
    const allNetworks1 = xmlDoc1.querySelectorAll('networks network');
    const allNetworks2 = xmlDoc2.querySelectorAll('networks network');
    
    // 現在のシートに関連するネットワークをフィルタリング
    // prevSheetNoまたはnextSheetNoが現在のシート番号と一致するネットワークを取得
    // または、prevSheetNo/nextSheetNoが設定されていない場合、現在のシートのクラスターを接続しているネットワークを取得
    const networks1 = Array.from(allNetworks1).filter(network => {
        const prevSheetNo = network.querySelector('prevSheetNo')?.textContent;
        const nextSheetNo = network.querySelector('nextSheetNo')?.textContent;
        const prevSheetNum = prevSheetNo ? parseInt(prevSheetNo) : null;
        const nextSheetNum = nextSheetNo ? parseInt(nextSheetNo) : null;
        
        // prevSheetNoまたはnextSheetNoが現在のシート番号と一致する場合
        if (prevSheetNum === currentSheetNumber || nextSheetNum === currentSheetNumber) {
            return true;
        }
        
        // prevSheetNo/nextSheetNoが設定されていない場合、現在のシートのクラスターを接続しているか確認
        if (prevSheetNum === null && nextSheetNum === null) {
            const prevClusterId = network.querySelector('prevClusterId')?.textContent;
            const nextClusterId = network.querySelector('nextClusterId')?.textContent;
            
            if (prevClusterId && nextClusterId) {
                const prevClusterIndex = parseInt(prevClusterId);
                const nextClusterIndex = parseInt(nextClusterId);
                
                // 現在のシートのクラスター範囲内にあるか確認
                if (prevClusterIndex >= 0 && prevClusterIndex < clusters1.length &&
                    nextClusterIndex >= 0 && nextClusterIndex < clusters1.length) {
                    return true;
                }
            }
        }
        
        return false;
    });
    
    const networks2 = Array.from(allNetworks2).filter(network => {
        const prevSheetNo = network.querySelector('prevSheetNo')?.textContent;
        const nextSheetNo = network.querySelector('nextSheetNo')?.textContent;
        const prevSheetNum = prevSheetNo ? parseInt(prevSheetNo) : null;
        const nextSheetNum = nextSheetNo ? parseInt(nextSheetNo) : null;
        
        // prevSheetNoまたはnextSheetNoが現在のシート番号と一致する場合
        if (prevSheetNum === currentSheetNumber || nextSheetNum === currentSheetNumber) {
            return true;
        }
        
        // prevSheetNo/nextSheetNoが設定されていない場合、現在のシートのクラスターを接続しているか確認
        if (prevSheetNum === null && nextSheetNum === null) {
            const prevClusterId = network.querySelector('prevClusterId')?.textContent;
            const nextClusterId = network.querySelector('nextClusterId')?.textContent;
            
            if (prevClusterId && nextClusterId) {
                const prevClusterIndex = parseInt(prevClusterId);
                const nextClusterIndex = parseInt(nextClusterId);
                
                // 現在のシートのクラスター範囲内にあるか確認
                if (prevClusterIndex >= 0 && prevClusterIndex < clusters2.length &&
                    nextClusterIndex >= 0 && nextClusterIndex < clusters2.length) {
                    return true;
                }
            }
        }
        
        return false;
    });
    
    // フィルタリングされたネットワークのvalueLinksを取得
    const valueLinks1 = [];
    const valueLinks2 = [];
    networks1.forEach(network => {
        const links = network.querySelectorAll('valueLinks valueLink');
        valueLinks1.push(...Array.from(links));
    });
    networks2.forEach(network => {
        const links = network.querySelectorAll('valueLinks valueLink');
        valueLinks2.push(...Array.from(links));
    });
    
    console.log(`シート${currentSheetNumber}のネットワーク情報:`, {
        currentSheetIndex,
        currentSheetNumber,
        allNetworks1Count: allNetworks1.length,
        allNetworks2Count: allNetworks2.length,
        filteredNetworks1Count: networks1.length,
        filteredNetworks2Count: networks2.length
    });
    
    // 簡単なネットワーク情報を更新
    const networkCountElement = document.getElementById('networkCount');
    if (networkCountElement) {
        networkCountElement.textContent = `${networks2.length}個`;
    }
    
    // 異なるネットワーク数を計算
    // 比較XMLのネットワークをチェック
    let differentNetworkCount = 0;
    networks2.forEach((network, index) => {
        if (checkNetworkDifference(network, index)) {
            differentNetworkCount++;
        }
    });
    
    // 基準XMLに存在するが比較XMLに存在しないネットワークもカウント
    networks1.forEach((network1, index1) => {
        const network1Id = network1.querySelector('id')?.textContent;
        let found = false;
        
        if (network1Id) {
            // IDベースで検索
            for (let i = 0; i < networks2.length; i++) {
                const network2 = networks2[i];
                const network2Id = network2.querySelector('id')?.textContent;
                if (network2Id === network1Id) {
                    found = true;
                    break;
                }
            }
        } else {
            // インデックスベースで検索（prevClusterIdとnextClusterIdでマッチング）
            const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent || '';
            const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent || '';
            
            for (let i = 0; i < networks2.length; i++) {
                const network2 = networks2[i];
                const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent || '';
                const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent || '';
                
                if (prevClusterId1 === prevClusterId2 && nextClusterId1 === nextClusterId2) {
                    found = true;
                    break;
                }
            }
        }
        
        // 基準XMLに存在するが比較XMLに存在しない場合は差分としてカウント
        if (!found) {
            differentNetworkCount++;
        }
    });
    
    const differentNetworkCountElement = document.getElementById('differentNetworkCount');
    if (differentNetworkCountElement) {
        differentNetworkCountElement.textContent = `${differentNetworkCount}個`;
    }
    
    // 簡単なネットワーク情報表示を表示
    const simpleNetworkInfo = document.getElementById('simpleNetworkInfo');
    if (simpleNetworkInfo) {
        simpleNetworkInfo.style.display = 'block';
    }
    
    // 基準XMLの背景画像を取得（クラスター設定タブと統一）
    let referenceBackgroundImage = xmlDoc1.querySelector('backgroundImage')?.textContent;
    
    // 背景画像データの詳細検証とクリーニング
    if (referenceBackgroundImage) {
        console.log('単一ファイル背景画像データの品質チェック:', {
            dataLength: referenceBackgroundImage.length,
            dataType: typeof referenceBackgroundImage,
            containsNewlines: referenceBackgroundImage.includes('\n'),
            containsSpaces: referenceBackgroundImage.includes(' '),
            containsTabs: referenceBackgroundImage.includes('\t'),
            containsInvalidChars: /[^A-Za-z0-9+/=]/.test(referenceBackgroundImage),
            paddingCheck: referenceBackgroundImage.length % 4 === 0,
            firstChar: referenceBackgroundImage.charAt(0),
            lastChar: referenceBackgroundImage.charAt(referenceBackgroundImage.length - 1),
            isBase64Valid: /^[A-Za-z0-9+/]*={0,2}$/.test(referenceBackgroundImage)
        });
        
        // データのクリーニングを試行
        if (referenceBackgroundImage.includes('\n') || referenceBackgroundImage.includes(' ') || referenceBackgroundImage.includes('\t')) {
            referenceBackgroundImage = referenceBackgroundImage.replace(/[\r\n\s\t]/g, '');
            console.log('単一ファイル背景画像データをクリーニングしました:', {
                cleanedLength: referenceBackgroundImage.length,
                cleanedStart: referenceBackgroundImage.substring(0, 50) + '...'
            });
        }
    }
    
    // 表示中のタブに応じてビューアーサイズを取得（ネットワークタブ表示中は networkViewer を優先）
    const pdfViewerEl = document.getElementById('pdfViewer');
    const networkViewerEl = document.getElementById('networkViewer');
    const networkTab = document.getElementById('network-layoutTab');
    const isNetworkTabActive = networkTab && networkTab.classList.contains('active');
    
    let viewerWidth = 800;
    let viewerHeight = 600;
    
    if (isNetworkTabActive && networkViewerEl) {
        const r = networkViewerEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
            viewerWidth = r.width;
            viewerHeight = r.height;
        }
    }
    if ((viewerWidth <= 0 || viewerHeight <= 0) && pdfViewerEl) {
        const r = pdfViewerEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
            viewerWidth = r.width;
            viewerHeight = r.height;
        }
    }
    if ((viewerWidth <= 0 || viewerHeight <= 0) && networkViewerEl) {
        const r = networkViewerEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
            viewerWidth = r.width;
            viewerHeight = r.height;
        } else if (networkViewerEl.parentElement) {
            const pr = networkViewerEl.parentElement.getBoundingClientRect();
            if (pr.width > 0 && pr.height > 0) {
                viewerWidth = pr.width;
                viewerHeight = pr.height;
            }
        }
    }
    
    // XMLから取得したPDFサイズを基準に、ビューアーサイズに合わせて最適化
    // クラスター設定タブと同じ計算方法を使用
    const outerPadding = 10;
    const gap = 15;
    const contentPadding = 5; // PDFコンテンツの余白を最小限に（5px）
    const titleHeight = 0; // タイトルを削除したので0に変更
    
    // 各パネルに使用可能なサイズを計算（左右に並べるため、幅を半分にする）
    const availableWidth = (viewerWidth - outerPadding * 2 - gap) / 2;
    const availableHeight = viewerHeight - outerPadding * 2 - titleHeight;
    
    // 両方のPDFサイズを考慮してスケールを計算
    const maxWidth = Math.max(width1, width2);
    const maxHeight = Math.max(height1, height2);
    
    // コンテナ内に収まるようにスケールを計算（余白を最小限に）
    const scaleX = (availableWidth - contentPadding * 2) / maxWidth;
    const scaleY = (availableHeight - contentPadding * 2) / maxHeight;
    let pdfScale = Math.min(scaleX, scaleY, 1.0); // 最大100%まで
    if (pdfScale <= 0 || !Number.isFinite(pdfScale)) {
        pdfScale = Math.min(0.7, 500 / maxWidth, 600 / maxHeight) || 0.5;
    }
    
    // スケール適用後の実際のサイズを計算（XMLから取得したサイズを基準）
    const scaledWidth1 = width1 * pdfScale;
    const scaledHeight1 = height1 * pdfScale;
    const scaledWidth2 = width2 * pdfScale;
    const scaledHeight2 = height2 * pdfScale;
    
    // コンテナのサイズをPDFのスケール後のサイズに合わせて固定（余白を最小限に）
    const containerWidth1 = scaledWidth1 + contentPadding * 2;
    const containerWidth2 = scaledWidth2 + contentPadding * 2;
    const containerHeight1 = scaledHeight1 + contentPadding * 2;
    const containerHeight2 = scaledHeight2 + contentPadding * 2;
    
    // 両方のコンテナサイズの最大値を取得（統一表示のため）
    const containerWidthFinal = Math.max(containerWidth1, containerWidth2);
    const containerHeightFinal = Math.max(containerHeight1, containerHeight2);
    
    // 基準XMLと比較XMLを横並びで表示（クラスター設定タブと同じ構造）
    let layoutHtml = `
        <div style="display: flex; gap: ${gap}px; padding: ${outerPadding}px; align-items: flex-start;">
            <!-- 左側：基準XML -->
            <div style="flex: 1; text-align: center;">
                <h4 style="color: #ff9500; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">📄 基準XML</h4>
                <div id="networkContainer1" style="
                    position: relative;
                    width: ${containerWidthFinal}px;
                    height: ${containerHeightFinal}px;
                    border: 3px solid #ff9500;
                    background: white;
                    margin: 0 auto;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(255, 149, 0, 0.2);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div id="networkContent1" style="
                        position: relative;
                        width: ${scaledWidth1}px;
                        height: ${scaledHeight1}px;
                        margin: ${contentPadding}px auto;
                    ">
    `;
    
    // 基準XMLの背景画像を取得
    const sheetBackgroundImage1 = sheet1.querySelector('backgroundImage')?.textContent;
    const rootBackgroundImage1 = xmlDoc1.querySelector('backgroundImage')?.textContent;
    const backgroundImage1 = sheetBackgroundImage1 || rootBackgroundImage1;
    
    // 基準XMLの背景画像を表示（左側パネル）
    if (backgroundImage1 && backgroundImage1.length > 100) {
        const cleanedBg1 = backgroundImage1.includes('\n') || backgroundImage1.includes(' ') || backgroundImage1.includes('\t') 
            ? backgroundImage1.replace(/[\r\n\s\t]/g, '') : backgroundImage1;
        const isPdfData1 = cleanedBg1.startsWith('JVBERi0') || cleanedBg1.substring(0, 20).includes('PDF');
        
        if (isPdfData1) {
            // PDF.jsを使用してPDFを画像として表示（余白をなくすため）
        layoutHtml += `
                <div id="networkBackground1" style="
                position: absolute;
                top: 0;
                left: 0;
                    width: ${scaledWidth1}px;
                    height: ${scaledHeight1}px;
                    background: white;
                    z-index: 1;
                    overflow: hidden;
                ">
                    <canvas id="networkCanvas1" style="
                width: 100%;
                height: 100%;
                        display: block;
                    "></canvas>
                </div>
            `;
            // PDF.jsでPDFを画像として描画（非同期処理）
            // シートごとに異なるPDFが設定されている場合は1ページ目、同じPDFの場合はcurrentSheetIndex + 1ページ目を表示
            const useSheetSpecificPage1 = !sheetBackgroundImage1 && rootBackgroundImage1;
            const pageNumber1 = useSheetSpecificPage1 ? (currentSheetIndex + 1) : 1;
            setTimeout(() => {
                renderPdfAsImage(cleanedBg1, 'networkCanvas1', scaledWidth1, scaledHeight1, pageNumber1);
            }, 100);
        } else {
            layoutHtml += `
                <div id="networkBackground1" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scaledWidth1}px;
                    height: ${scaledHeight1}px;
                    background-image: url('data:image/png;base64,${cleanedBg1}');
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    background-position: top left;
                z-index: 1;
                "></div>
        `;
        }
    }
    
    // 基準XMLのクラスターを表示（左側パネル）
    clusters1.forEach((cluster, index) => {
        const name = cluster.querySelector('name')?.textContent || `クラスター${index}`;
        // XMLから取得した生の座標値（0.0-1.0の範囲）
        const rawTop = cluster.querySelector('top')?.textContent || '0';
        const rawLeft = cluster.querySelector('left')?.textContent || '0';
        const rawRight = cluster.querySelector('right')?.textContent || '0';
        const rawBottom = cluster.querySelector('bottom')?.textContent || '0';
        
        // 座標計算（相対座標を絶対座標に変換）- クラスター設定タブと同じ方法
        const topOriginal = parseFloat(rawTop) * height1;
        const leftOriginal = parseFloat(rawLeft) * width1;
        const rightOriginal = parseFloat(rawRight) * width1;
        const bottomOriginal = parseFloat(rawBottom) * height1;
        const clusterWidthOriginal = rightOriginal - leftOriginal;
        const clusterHeightOriginal = bottomOriginal - topOriginal;
        
        // スケールを適用
        const top = topOriginal * pdfScale;
        const left = leftOriginal * pdfScale;
        const clusterWidth = clusterWidthOriginal * pdfScale;
        const clusterHeight = clusterHeightOriginal * pdfScale;
        
        // 基準XMLのクラスターの枠を破線で表示（緑色）
        layoutHtml += `
            <div style="position: absolute; left: ${left}px; top: ${top}px; width: ${clusterWidth}px; height: ${clusterHeight}px; border: 2px dashed #28a745; background: rgba(40, 167, 69, 0.05); border-radius: 5px; z-index: 2;"
                 title="基準XML: ${escapeHtml(name)}">
            </div>
        `;
        
        // クラスターの中心にノードを表示
        const centerX = leftOriginal + clusterWidthOriginal / 2;
        const centerY = topOriginal + clusterHeightOriginal / 2;
        const nodeSize = Math.max(20, 30 * pdfScale);
        const nodeOffset = nodeSize / 2;
        
        layoutHtml += `
            <div class="network-node" 
                 style="position: absolute; left: ${(centerX * pdfScale) - nodeOffset}px; top: ${(centerY * pdfScale) - nodeOffset}px; width: ${nodeSize}px; height: ${nodeSize}px; background: #ff9500; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${Math.max(10, nodeSize * 0.4)}px; font-weight: bold; z-index: 3; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                 title="${name}">
                ${index}
            </div>
        `;
    });
    
    // 基準XMLのネットワーク線を表示（左側パネル）
    networks1.forEach((network1, index1) => {
        const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent;
        const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent;
        
        if (prevClusterId1 && nextClusterId1) {
            const fromIndex1 = parseInt(prevClusterId1);
            const toIndex1 = parseInt(nextClusterId1);
            
            if (fromIndex1 >= 0 && fromIndex1 < clusters1.length && toIndex1 >= 0 && toIndex1 < clusters1.length) {
                const fromCluster1 = clusters1[fromIndex1];
                const toCluster1 = clusters1[toIndex1];
                
                const fromRawTop1 = fromCluster1.querySelector('top')?.textContent || '0';
                const fromRawLeft1 = fromCluster1.querySelector('left')?.textContent || '0';
                const fromRawRight1 = fromCluster1.querySelector('right')?.textContent || '0';
                const fromRawBottom1 = fromCluster1.querySelector('bottom')?.textContent || '0';
                const toRawTop1 = toCluster1.querySelector('top')?.textContent || '0';
                const toRawLeft1 = toCluster1.querySelector('left')?.textContent || '0';
                const toRawRight1 = toCluster1.querySelector('right')?.textContent || '0';
                const toRawBottom1 = toCluster1.querySelector('bottom')?.textContent || '0';
                
                const fromTop1 = parseFloat(fromRawTop1) * height1;
                const fromLeft1 = parseFloat(fromRawLeft1) * width1;
                const fromRight1 = parseFloat(fromRawRight1) * width1;
                const fromBottom1 = parseFloat(fromRawBottom1) * height1;
                const toTop1 = parseFloat(toRawTop1) * height1;
                const toLeft1 = parseFloat(toRawLeft1) * width1;
                const toRight1 = parseFloat(toRawRight1) * width1;
                const toBottom1 = parseFloat(toRawBottom1) * height1;
                
                const fromClusterWidth1 = Math.max(1, fromRight1 - fromLeft1);
                const fromClusterHeight1 = Math.max(1, fromBottom1 - fromTop1);
                const toClusterWidth1 = Math.max(1, toRight1 - toLeft1);
                const toClusterHeight1 = Math.max(1, toBottom1 - toTop1);
                
                const fromCenterX1 = (fromLeft1 + fromClusterWidth1 / 2) * pdfScale;
                const fromCenterY1 = (fromTop1 + fromClusterHeight1 / 2) * pdfScale;
                const toCenterX1 = (toLeft1 + toClusterWidth1 / 2) * pdfScale;
                const toCenterY1 = (toTop1 + toClusterHeight1 / 2) * pdfScale;
                
                const lineWidth = Math.max(2, 3 * pdfScale);
                
                // 基準XMLのネットワーク線をオレンジ色の実線で表示
                layoutHtml += `
                    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3;">
                        <defs>
                            <marker id="arrowhead-ref1-${index1}" markerWidth="${Math.max(8, 10 * pdfScale)}" markerHeight="${Math.max(6, 7 * pdfScale)}" 
                                    refX="${Math.max(7, 9 * pdfScale)}" refY="${Math.max(2.5, 3.5 * pdfScale)}" orient="auto">
                                <polygon points="0 0, ${Math.max(8, 10 * pdfScale)} ${Math.max(2.5, 3.5 * pdfScale)}, 0 ${Math.max(5, 7 * pdfScale)}" fill="#ff9500" />
                            </marker>
                        </defs>
                        <line 
                              x1="${fromCenterX1}" y1="${fromCenterY1}" 
                              x2="${toCenterX1}" y2="${toCenterY1}" 
                              stroke="#ff9500" 
                              stroke-width="${lineWidth}" 
                              marker-end="url(#arrowhead-ref1-${index1})" />
                    </svg>
                `;
            }
        }
    });
    
    layoutHtml += `
                    </div>
                </div>
            </div>
            
            <!-- 右側：比較XML -->
            <div style="flex: 1; text-align: center;">
                <h4 style="color: #007bff; margin-bottom: 0.5rem; font-size: 1.1rem; font-weight: 600;">📄 比較XML</h4>
                <div id="networkContainer2" style="
                    position: relative;
                    width: ${containerWidthFinal}px;
                    height: ${containerHeightFinal}px;
                    border: 3px solid #007bff;
                    background: white;
                    margin: 0 auto;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.2);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div id="networkContent2" style="
                        position: relative;
                        width: ${scaledWidth2}px;
                        height: ${scaledHeight2}px;
                        margin: ${contentPadding}px auto;
                    ">
    `;
    
    // 比較XMLの背景画像を取得
    const sheetBackgroundImage2 = sheet2.querySelector('backgroundImage')?.textContent;
    const rootBackgroundImage2 = xmlDoc2.querySelector('backgroundImage')?.textContent;
    const backgroundImage2 = sheetBackgroundImage2 || rootBackgroundImage2;
    
    // 比較XMLの背景画像を表示（右側パネル）
    if (backgroundImage2 && backgroundImage2.length > 100) {
        const cleanedBg2 = backgroundImage2.includes('\n') || backgroundImage2.includes(' ') || backgroundImage2.includes('\t') 
            ? backgroundImage2.replace(/[\r\n\s\t]/g, '') : backgroundImage2;
        const isPdfData2 = cleanedBg2.startsWith('JVBERi0') || cleanedBg2.substring(0, 20).includes('PDF');
        
        if (isPdfData2) {
            // PDF.jsを使用してPDFを画像として表示（余白をなくすため）
            layoutHtml += `
                <div id="networkBackground2" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scaledWidth2}px;
                    height: ${scaledHeight2}px;
                    background: white;
                    z-index: 1;
                    overflow: hidden;
                ">
                    <canvas id="networkCanvas2" style="
                        width: 100%;
                        height: 100%;
                        display: block;
                    "></canvas>
                </div>
            `;
            // PDF.jsでPDFを画像として描画（非同期処理）
            // シートごとに異なるPDFが設定されている場合は1ページ目、同じPDFの場合はcurrentSheetIndex + 1ページ目を表示
            const useSheetSpecificPage2 = !sheetBackgroundImage2 && rootBackgroundImage2;
            const pageNumber2 = useSheetSpecificPage2 ? (currentSheetIndex + 1) : 1;
            setTimeout(() => {
                renderPdfAsImage(cleanedBg2, 'networkCanvas2', scaledWidth2, scaledHeight2, pageNumber2);
            }, 100);
        } else {
            layoutHtml += `
                <div id="networkBackground2" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scaledWidth2}px;
                    height: ${scaledHeight2}px;
                    background-image: url('data:image/png;base64,${cleanedBg2}');
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    background-position: top left;
                    z-index: 1;
                "></div>
            `;
        }
    }
    
    // 比較XMLのクラスターを表示（右側パネル）
    clusters2.forEach((cluster, index) => {
        const name = cluster.querySelector('name')?.textContent || `クラスター${index}`;
        // XMLから取得した生の座標値（0.0-1.0の範囲）
        const rawTop = cluster.querySelector('top')?.textContent || '0';
        const rawLeft = cluster.querySelector('left')?.textContent || '0';
        const rawRight = cluster.querySelector('right')?.textContent || '0';
        const rawBottom = cluster.querySelector('bottom')?.textContent || '0';
        
        // 座標計算（相対座標を絶対座標に変換）- クラスター設定タブと同じ方法
        const topOriginal = parseFloat(rawTop) * height2;
        const leftOriginal = parseFloat(rawLeft) * width2;
        const rightOriginal = parseFloat(rawRight) * width2;
        const bottomOriginal = parseFloat(rawBottom) * height2;
        const clusterWidthOriginal = rightOriginal - leftOriginal;
        const clusterHeightOriginal = bottomOriginal - topOriginal;
        
        // スケールを適用
        const top = topOriginal * pdfScale;
        const left = leftOriginal * pdfScale;
        const clusterWidth = clusterWidthOriginal * pdfScale;
        const clusterHeight = clusterHeightOriginal * pdfScale;
        
        // クラスターの枠を表示
        layoutHtml += `
            <div style="position: absolute; left: ${left}px; top: ${top}px; width: ${clusterWidth}px; height: ${clusterHeight}px; border: 2px solid #6c757d; background: rgba(108, 117, 125, 0.1); border-radius: 5px; z-index: 2;"
                 title="比較XML: ${escapeHtml(name)}">
            </div>
        `;
        
        // クラスターの中心にノードを表示
        const centerX = leftOriginal + clusterWidthOriginal / 2;
        const centerY = topOriginal + clusterHeightOriginal / 2;
        const nodeSize = Math.max(20, 30 * pdfScale);
        const nodeOffset = nodeSize / 2;
        
        layoutHtml += `
            <div class="network-node" 
                 style="position: absolute; left: ${(centerX * pdfScale) - nodeOffset}px; top: ${(centerY * pdfScale) - nodeOffset}px; width: ${nodeSize}px; height: ${nodeSize}px; background: #007bff; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${Math.max(10, nodeSize * 0.4)}px; font-weight: bold; z-index: 3; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                 title="${name}">
                ${index}
            </div>
        `;
    });
    
    // 比較XMLのネットワーク線を表示（右側パネル）
    networks2.forEach((network, index) => {
        const fromCluster = network.querySelector('prevClusterId')?.textContent;
        const toCluster = network.querySelector('nextClusterId')?.textContent;
        
        if (fromCluster && toCluster) {
            const fromIndex = parseInt(fromCluster);
            const toIndex = parseInt(toCluster);
            
            if (fromIndex >= 0 && fromIndex < clusters2.length && toIndex >= 0 && toIndex < clusters2.length) {
                const fromCluster = clusters2[fromIndex];
                const toCluster = clusters2[toIndex];
                
                // クラスター設定タブと同じ方法で座標を計算
                const fromRawTop = fromCluster.querySelector('top')?.textContent || '0';
                const fromRawLeft = fromCluster.querySelector('left')?.textContent || '0';
                const fromRawRight = fromCluster.querySelector('right')?.textContent || '0';
                const fromRawBottom = fromCluster.querySelector('bottom')?.textContent || '0';
                const toRawTop = toCluster.querySelector('top')?.textContent || '0';
                const toRawLeft = toCluster.querySelector('left')?.textContent || '0';
                const toRawRight = toCluster.querySelector('right')?.textContent || '0';
                const toRawBottom = toCluster.querySelector('bottom')?.textContent || '0';
                
                // 座標計算（相対座標を絶対座標に変換）
                const fromTop = parseFloat(fromRawTop) * height2;
                const fromLeft = parseFloat(fromRawLeft) * width2;
                const fromRight = parseFloat(fromRawRight) * width2;
                const fromBottom = parseFloat(fromRawBottom) * height2;
                const toTop = parseFloat(toRawTop) * height2;
                const toLeft = parseFloat(toRawLeft) * width2;
                const toRight = parseFloat(toRawRight) * width2;
                const toBottom = parseFloat(toRawBottom) * height2;
                
                const fromClusterWidth = Math.max(1, fromRight - fromLeft);
                const fromClusterHeight = Math.max(1, fromBottom - fromTop);
                const toClusterWidth = Math.max(1, toRight - toLeft);
                const toClusterHeight = Math.max(1, toBottom - toTop);
                
                // ネットワークの違いを判定（基準XMLとの比較）
                const isDifferent = checkNetworkDifference(network, index);
                const lineClass = isDifferent ? 'different' : 'same';
                console.log(`比較XML ネットワーク${index}: isDifferent=${isDifferent}, lineClass=${lineClass}`);
                
                // 線の座標を計算（スケール適用）- クラスターの中心座標
                const fromCenterX = (fromLeft + fromClusterWidth / 2) * pdfScale;
                const fromCenterY = (fromTop + fromClusterHeight / 2) * pdfScale;
                const toCenterX = (toLeft + toClusterWidth / 2) * pdfScale;
                const toCenterY = (toTop + toClusterHeight / 2) * pdfScale;
                
                // 線の太さもスケールに応じて調整（最小2px）
                const lineWidth = Math.max(2, 4 * pdfScale);
                
                // 比較XMLのネットワーク線を実線で表示
                // 設定が異なる場合は赤、同じ場合は青
                const svgHtml = `
                    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;">
                        <defs>
                            <marker id="arrowhead-comp-${lineClass}-${index}" markerWidth="${Math.max(8, 10 * pdfScale)}" markerHeight="${Math.max(6, 7 * pdfScale)}" 
                                    refX="${Math.max(7, 9 * pdfScale)}" refY="${Math.max(2.5, 3.5 * pdfScale)}" orient="auto">
                                <polygon points="0 0, ${Math.max(8, 10 * pdfScale)} ${Math.max(2.5, 3.5 * pdfScale)}, 0 ${Math.max(5, 7 * pdfScale)}" fill="${lineClass === 'different' ? '#dc3545' : '#007bff'}" />
                            </marker>
                        </defs>
                        <line 
                              x1="${fromCenterX}" y1="${fromCenterY}" 
                              x2="${toCenterX}" y2="${toCenterY}" 
                              stroke="${lineClass === 'different' ? '#dc3545' : '#007bff'}" 
                              stroke-width="${lineWidth}" 
                              marker-end="url(#arrowhead-comp-${lineClass}-${index})" />
                    </svg>
                `;
                
                // クリック可能な透明な線を必ず追加（各ネットワークごとに個別のdivとして配置）
                let networkDetails2 = '{}';
                try {
                    const details = getNetworkDifferenceDetails(network, index);
                    networkDetails2 = encodeURIComponent(JSON.stringify(details));
                } catch (error) {
                    console.error('getNetworkDifferenceDetails エラー:', error);
                    networkDetails2 = encodeURIComponent(JSON.stringify({ index: index, error: error.message }));
                }
                
                // クリック可能な線の座標（スケール適用済み）- より太くしてクリックしやすくする
                // 各ネットワークごとに個別のdivとして配置し、z-indexを適切に設定（クラスターより上に配置）
                // デバッグログを追加
                console.log(`ネットワーク${index} (${fromIndex}→${toIndex}) クリック可能な線を生成:`, {
                    fromCenterX,
                    fromCenterY,
                    toCenterX,
                    toCenterY,
                    pdfScale
                });
                
                // クリック可能な線を生成（クラスターのノードより上に配置）
                // z-indexを500以上に設定して、すべての要素より確実に上に配置
                // デバッグ用：クリック可能な線の情報をログに出力
                console.log(`比較XML ネットワーク${index} クリック可能な線を生成:`, {
                    index,
                    fromIndex,
                    toIndex,
                    fromCenterX,
                    fromCenterY,
                    toCenterX,
                    toCenterY,
                    zIndex: 500 + index,
                    networkDetailsLength: networkDetails2.length
                });
                
                // クリック可能な線を生成（イベントリスナー方式に変更）
                // 各ネットワーク線を個別のSVG要素として配置し、重なりを避ける
                let clickableLineHtml = `
                    <svg class="network-clickable-overlay" 
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: ${500 + index};"
                         data-network-index="${index}"
                         data-from-index="${fromIndex}"
                         data-to-index="${toIndex}"
                         data-network-details='${networkDetails2.replace(/'/g, "&apos;")}'>
                        <line class="network-line-clickable" 
                              style="stroke: transparent; stroke-width: 20; cursor: pointer; transition: stroke 0.2s ease; pointer-events: stroke;" 
                              x1="${fromCenterX}" y1="${fromCenterY}" 
                              x2="${toCenterX}" y2="${toCenterY}" 
                              data-network-index="${index}"
                              data-from-index="${fromIndex}"
                              data-to-index="${toIndex}"
                              data-is-comparison="true" />
                    </svg>
                `;
                layoutHtml += svgHtml + clickableLineHtml;
            }
        }
    });
    
    // 基準XMLのネットワーク線を表示（比較XMLに存在しないネットワークも含む）
    // 基準XMLのネットワークをループして、比較XMLに存在しないものも表示
    networks1.forEach((network1, index1) => {
        const fromCluster1 = network1.querySelector('prevClusterId')?.textContent;
        const toCluster1 = network1.querySelector('nextClusterId')?.textContent;
        
        if (fromCluster1 && toCluster1) {
            const fromIndex1 = parseInt(fromCluster1);
            const toIndex1 = parseInt(toCluster1);
            
            // 比較XMLに同じネットワークが存在するかチェック
            let foundInNetworks2 = false;
            let matchingIndex2 = -1;
            
            // IDベースでマッチングを試みる
            const network1Id = network1.querySelector('id')?.textContent;
            if (network1Id) {
                for (let i = 0; i < networks2.length; i++) {
                    const net2 = networks2[i];
                    const net2Id = net2.querySelector('id')?.textContent;
                    if (net2Id === network1Id) {
                        foundInNetworks2 = true;
                        matchingIndex2 = i;
                        break;
                    }
                }
            }
            
            // IDマッチングが失敗した場合は、インデックスベースでマッチング
            if (!foundInNetworks2 && index1 < networks2.length) {
                const network2 = networks2[index1];
                const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent || '';
                const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent || '';
                const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent || '';
                const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent || '';
                
                if (prevClusterId1 === prevClusterId2 && nextClusterId1 === nextClusterId2) {
                    foundInNetworks2 = true;
                    matchingIndex2 = index1;
                }
            }
            
            // 比較XMLのクラスター範囲内にある場合のみ表示
            if (fromIndex1 >= 0 && fromIndex1 < clusters2.length && toIndex1 >= 0 && toIndex1 < clusters2.length) {
                // 基準XMLのネットワークはすべて表示（比較XMLに存在するかどうかに関わらず）
                // 比較XMLに存在しない場合、または設定が異なる場合は破線で表示
                // checkNetworkDifference関数は、ネットワーク要素とインデックスを受け取るが、
                // フィルタリングされたネットワークのインデックスを使用するため、正しく動作する
                const isDifferent = !foundInNetworks2 || (foundInNetworks2 && checkNetworkDifference(networks2[matchingIndex2], matchingIndex2));
                
                // デバッグログを追加
                console.log(`基準XML ネットワーク${index1} (${fromIndex1}→${toIndex1}): foundInNetworks2=${foundInNetworks2}, isDifferent=${isDifferent}`);
                
                // 基準XMLのネットワークは常に表示（比較XMLに存在するかどうかに関わらず）
                {
                    const fromCluster = clusters2[fromIndex1];
                    const toCluster = clusters2[toIndex1];
                    
                    // クラスター設定タブと同じ方法で座標を計算
                    const fromRawTop = fromCluster.querySelector('top')?.textContent || '0';
                    const fromRawLeft = fromCluster.querySelector('left')?.textContent || '0';
                    const fromRawRight = fromCluster.querySelector('right')?.textContent || '0';
                    const fromRawBottom = fromCluster.querySelector('bottom')?.textContent || '0';
                    const toRawTop = toCluster.querySelector('top')?.textContent || '0';
                    const toRawLeft = toCluster.querySelector('left')?.textContent || '0';
                    const toRawRight = toCluster.querySelector('right')?.textContent || '0';
                    const toRawBottom = toCluster.querySelector('bottom')?.textContent || '0';
                    
                    // 座標計算（相対座標を絶対座標に変換）
                    const fromTop = parseFloat(fromRawTop) * height2;
                    const fromLeft = parseFloat(fromRawLeft) * width2;
                    const fromRight = parseFloat(fromRawRight) * width2;
                    const fromBottom = parseFloat(fromRawBottom) * height2;
                    const toTop = parseFloat(toRawTop) * height2;
                    const toLeft = parseFloat(toRawLeft) * width2;
                    const toRight = parseFloat(toRawRight) * width2;
                    const toBottom = parseFloat(toRawBottom) * height2;
                    
                    const fromClusterWidth = Math.max(1, fromRight - fromLeft);
                    const fromClusterHeight = Math.max(1, fromBottom - fromTop);
                    const toClusterWidth = Math.max(1, toRight - toLeft);
                    const toClusterHeight = Math.max(1, toBottom - toTop);
                    
                    // 線の座標を計算（スケール適用）- クラスターの中心座標
                    const fromCenterX = (fromLeft + fromClusterWidth / 2) * pdfScale;
                    const fromCenterY = (fromTop + fromClusterHeight / 2) * pdfScale;
                    const toCenterX = (toLeft + toClusterWidth / 2) * pdfScale;
                    const toCenterY = (toTop + toClusterHeight / 2) * pdfScale;
                    
                    // 線の太さもスケールに応じて調整（最小2px）
                    const lineWidth = Math.max(2, 4 * pdfScale);
                    
                    // 基準XMLのネットワーク線を破線で表示（比較XMLに存在しない、または設定が異なる）
                    // isDifferentは既に計算済み
                    const lineColor = isDifferent ? '#dc3545' : '#007bff'; // 赤または青
                    const strokeDashArray = '5,5'; // 破線
                    
                    const svgHtml = `
                        <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4;">
                            <defs>
                                <marker id="arrowhead-ref-${index1}" markerWidth="${Math.max(8, 10 * pdfScale)}" markerHeight="${Math.max(6, 7 * pdfScale)}" 
                                        refX="${Math.max(7, 9 * pdfScale)}" refY="${Math.max(2.5, 3.5 * pdfScale)}" orient="auto">
                                    <polygon points="0 0, ${Math.max(8, 10 * pdfScale)} ${Math.max(2.5, 3.5 * pdfScale)}, 0 ${Math.max(5, 7 * pdfScale)}" fill="${lineColor}" />
                                </marker>
                            </defs>
                            <line 
                                  x1="${fromCenterX}" y1="${fromCenterY}" 
                                  x2="${toCenterX}" y2="${toCenterY}" 
                                  stroke="${lineColor}" 
                                  stroke-width="${lineWidth}" 
                                  stroke-dasharray="${strokeDashArray}"
                                  marker-end="url(#arrowhead-ref-${index1})" />
                        </svg>
                    `;
                    
                    // クリック可能な透明な線を追加
                    let networkDetails1 = '{}';
                    try {
                        // 基準XMLのネットワーク詳細を取得（比較XMLとの比較）
                        if (foundInNetworks2) {
                            const details = getNetworkDifferenceDetails(networks2[matchingIndex2], matchingIndex2);
                            networkDetails1 = encodeURIComponent(JSON.stringify(details));
                        } else {
                            // 比較XMLに存在しない場合は、基準XMLのみの情報を表示
                            const details = {
                                index: index1,
                                isReferenceOnly: true,
                                prevClusterId: fromCluster1,
                                nextClusterId: toCluster1,
                                skip: network1.querySelector('skip')?.textContent || '',
                                condition: network1.querySelector('condition')?.textContent || ''
                            };
                            networkDetails1 = encodeURIComponent(JSON.stringify(details));
                        }
                    } catch (error) {
                        console.error('getNetworkDifferenceDetails エラー:', error);
                        networkDetails1 = encodeURIComponent(JSON.stringify({ index: index1, error: error.message }));
                    }
                    
                    // 基準XMLのネットワーク線はクリック不可（比較XMLのネットワーク線を優先するため）
                    // クリック可能な線は生成しない（pointer-events: noneでクリックをブロックしない）
                    // layoutHtml += svgHtml; // 視覚的な表示のみ（クリック不可）
                    layoutHtml += svgHtml;
                }
            } else {
                // クラスター範囲外の場合はログに記録
                console.log(`基準XML ネットワーク${index1} (${fromIndex1}→${toIndex1}): 比較XMLのクラスター範囲外のため表示しない`);
            }
        }
    });
    
    layoutHtml += `
            </div>
            </div>
        </div>
    `;
    
    try {
        console.log('ネットワークレイアウトHTML生成完了、viewerに設定します');
        console.log('viewer要素:', viewer);
        console.log('layoutHtmlの長さ:', layoutHtml.length);
        viewer.innerHTML = layoutHtml;
        console.log('ネットワークレイアウトHTMLをviewerに設定完了');
        
        // クリック可能な線にイベントリスナーを追加
        const clickableLines = viewer.querySelectorAll('.network-click-target');
        console.log(`クリック可能な線の数: ${clickableLines.length}`);
        clickableLines.forEach((line, lineIndex) => {
            const networkIndex = line.getAttribute('data-network-index');
            const networkDetails = line.getAttribute('data-network-details');
            
            console.log(`ネットワーク線${lineIndex} イベントリスナー追加: index=${networkIndex}`);
            line.style.pointerEvents = 'stroke';
            
            // クリックイベント
            line.addEventListener('click', function(e) {
                console.log('ネットワーク線クリック検出（イベントリスナー）: index=' + networkIndex);
                e.stopPropagation();
                e.preventDefault();
                if (networkDetails) {
                    try {
                        showNetworkDifferenceDetails(parseInt(networkIndex), networkDetails);
                    } catch (error) {
                        console.error('showNetworkDifferenceDetails エラー:', error);
                        alert(`ネットワーク ${parseInt(networkIndex) + 1} の詳細を表示できません: ${error.message}`);
                    }
                } else {
                    console.error('networkDetailsが見つかりません');
                }
            });
            
            // ホバーイベント
            line.addEventListener('mouseover', function(e) {
                console.log('ネットワーク線ホバー（イベントリスナー）: index=' + networkIndex);
                e.stopPropagation();
                this.style.stroke = 'rgba(0, 123, 255, 0.5)';
                this.style.strokeWidth = '20';
            });
            
            line.addEventListener('mouseout', function(e) {
                e.stopPropagation();
                this.style.stroke = 'transparent';
                this.style.strokeWidth = '20';
            });
        });
        
        // 比較表示のネットワーク線（赤線・青線）にもクリックでモーダルを開く
        const comparisonLines = viewer.querySelectorAll('.network-line-clickable');
        comparisonLines.forEach((line) => {
            line.style.pointerEvents = 'stroke';
            line.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                const svg = this.closest('.network-clickable-overlay');
                if (svg) {
                    const networkIndex = svg.getAttribute('data-network-index');
                    const networkDetails = svg.getAttribute('data-network-details');
                    if (networkIndex != null && networkDetails) {
                        try {
                            showNetworkDifferenceDetails(parseInt(networkIndex), networkDetails);
                        } catch (err) {
                            console.error('showNetworkDifferenceDetails エラー:', err);
                            alert(`ネットワーク ${parseInt(networkIndex) + 1} の詳細を表示できません: ${err.message}`);
                        }
                    }
                }
            });
            line.addEventListener('mouseover', function(e) {
                e.stopPropagation();
                this.style.stroke = 'rgba(0, 123, 255, 0.4)';
                this.style.strokeWidth = '24';
            });
            line.addEventListener('mouseout', function(e) {
                e.stopPropagation();
                this.style.stroke = 'transparent';
                this.style.strokeWidth = '20';
            });
        });
    } catch (error) {
        console.error('ネットワークレイアウト表示エラー:', error);
        viewer.innerHTML = `
            <div class="network-placeholder">
                <div style="text-align: center; padding: 2rem;">
                    <h3 style="color: #dc3545; margin-bottom: 1rem;">⚠️ ネットワーク表示エラー</h3>
                    <p style="color: #666; margin-bottom: 1rem;">
                        エラー: ${error.message}
                    </p>
                </div>
            </div>
        `;
    }
    
    // 比較モードの場合はフィルターを表示
    const networkFilter = document.getElementById('networkFilter');
    if (networkFilter) {
        networkFilter.style.display = 'block';
    }
}

// 設定比較機能
// ネットワークシート変更機能
// ネットワークシート変更機能
function changeNetworkSheet(index) {
    console.log('changeNetworkSheet呼び出し:', { index, currentSheetIndex, totalSheets });
    
    // 相対インデックスの場合（-1, 1など）と絶対インデックスの場合を処理
    let newIndex;
    if (index < 0) {
        // 前のシート
        newIndex = Math.max(0, currentSheetIndex - 1);
    } else if (index > 0 && index < totalSheets) {
        // 次のシートまたは絶対インデックス
        newIndex = index;
    } else if (index === -1 || index === 1) {
        // 相対移動
        newIndex = Math.max(0, Math.min(totalSheets - 1, currentSheetIndex + index));
    } else {
        newIndex = Math.max(0, Math.min(totalSheets - 1, index));
    }
    
    console.log('changeNetworkSheet - 新しいインデックス:', { newIndex, currentSheetIndex });
    
    if (currentSheetIndex === newIndex) {
        console.log('changeNetworkSheet - 同じシートなので更新をスキップ');
        return; // 同じシートなので更新をスキップ
    }
    
    currentSheetIndex = newIndex;
    console.log('changeNetworkSheet - シートインデックス更新:', { currentSheetIndex, totalSheets });
    
    updateNetworkSheetNavigation();
    updateNetworkLayout();
}

// ネットワーク設定タブのシートナビゲーションを更新
function updateNetworkSheetNavigation() {
    const selectionContainer = document.getElementById('networkSheetSelectionContainer');
    const navContainer = document.getElementById('networkSheetNavigationVisible');
    
    if (!navContainer) {
        console.warn('networkSheetNavigationVisible要素が見つかりません');
        return;
    }
    
    if (totalSheets > 1) {
        // シート選択コンテナを表示
        if (selectionContainer) {
            selectionContainer.style.display = 'block';
        }
        
        // シートボタンを生成（クラスター設定タブと同じ形式）
        let navHtml = '';
        for (let i = 0; i < totalSheets; i++) {
            const isActive = i === currentSheetIndex;
            navHtml += `
                <button class="sheet-nav-btn ${isActive ? 'active' : ''}" 
                        data-network-sheet-index="${i}" 
                        style="
                            padding: 8px 16px;
                            margin: 0 4px;
                            border: 2px solid ${isActive ? '#007bff' : '#ddd'};
                            background: ${isActive ? '#007bff' : 'white'};
                            color: ${isActive ? 'white' : '#666'};
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: ${isActive ? 'bold' : 'normal'};
                            transition: all 0.3s ease;
                        ">
                    シート${i + 1}
                </button>
            `;
        }
        navContainer.innerHTML = navHtml;
    } else {
        // シートが1つしかない場合は非表示
        if (selectionContainer) {
            selectionContainer.style.display = 'none';
        }
    }
}

function bindUiEvents() {
    const setupGuideBtn = document.getElementById('setupCheckGuideBtn');
    if (setupGuideBtn) setupGuideBtn.addEventListener('click', goToSetupGuide);

    const setupCloseBtn = document.getElementById('setupCheckCloseBtn');
    if (setupCloseBtn) setupCloseBtn.addEventListener('click', closeSetupCheckBanner);

    const videoThumb = document.getElementById('videoThumbnailContainer');
    if (videoThumb) videoThumb.addEventListener('click', playVideo);

    // 演習用定義.xlsx は href でダウンロードするため、クリック時の特別処理は不要

    document.querySelectorAll('.video-item').forEach((item) => {
        item.addEventListener('click', () => {
            const videoId = item.dataset.videoId;
            const title = item.dataset.videoTitle;
            if (videoId && title) {
                selectVideo(videoId, title, false, item);
            }
        });
    });

    // 初期表示：クラスター設定のサムネイルと選択状態を表示
    const initialVideoItem = document.querySelector('.video-item[data-video-id="cluster-settings"]');
    if (initialVideoItem) {
        selectVideo('cluster-settings', 'クラスター設定', false, initialVideoItem);
    }

    // このツールの使い方モーダル（外部のお客様向け・システム解説なし）
    const toolGuideBtn = document.getElementById('toolGuideBtn');
    const toolGuideModal = document.getElementById('toolGuideModal');
    const toolGuideModalBody = document.getElementById('toolGuideModalBody');
    const toolGuideModalClose = document.getElementById('toolGuideModalClose');
    if (toolGuideBtn && toolGuideModal && toolGuideModalBody) {
        const toolGuideContent = `
            <p class="tool-guide-lead">帳票定義の内容を、基準と比較して確認するためのツールです。<br>クラスター設定・ネットワーク設定の差分を、画面上一目で確認できます。</p>

            <h4 class="tool-guide-section-title"><span class="tool-guide-icon" aria-hidden="true">✓</span> このツールでできること</h4>
            <ul class="tool-guide-feature-list">
                <li><span class="tool-guide-feature-icon">📋</span> <strong>基準の選択</strong><br>「STEP.1」「STEP.2」から、比較の基準となる定義を選べます。</li>
                <li><span class="tool-guide-feature-icon">📤</span> <strong>比較ファイルの登録</strong><br>ご自身で作成・編集したXMLファイルをアップロードし、基準と比較できます。</li>
                <li><span class="tool-guide-feature-icon">🔧</span> <strong>クラスター設定の確認</strong><br>シート上のクラスターを色で表示。クリックで詳細と基準との違いを確認できます。<br>
                    <span class="tool-guide-legend"><span class="tool-guide-dot tool-guide-dot-ref"></span>基準</span>
                    <span class="tool-guide-legend"><span class="tool-guide-dot tool-guide-dot-same"></span>一致</span>
                    <span class="tool-guide-legend"><span class="tool-guide-dot tool-guide-dot-diff"></span>差分あり</span>
                </li>
                <li><span class="tool-guide-feature-icon">🔗</span> <strong>ネットワーク設定の確認</strong><br>クラスター間のつながりを線で表示。赤い線は設定に差分がある箇所です。クリックで内容を確認できます。<br>
                    <span class="tool-guide-legend"><span class="tool-guide-dot tool-guide-dot-same"></span>一致</span>
                    <span class="tool-guide-legend"><span class="tool-guide-dot tool-guide-dot-diff"></span>差分あり</span>
                </li>
            </ul>

            <h4 class="tool-guide-section-title"><span class="tool-guide-icon tool-guide-icon-arrow" aria-hidden="true">→</span> 操作の流れ</h4>
            <ol class="tool-guide-steps">
                <li><span class="tool-guide-step-num">1</span> 基準XMLで「STEP.1」または「STEP.2」を選択</li>
                <li><span class="tool-guide-step-num">2</span> 「比較XMLをアップロード」から、比較したいXMLファイルを選択</li>
                <li><span class="tool-guide-step-num">3</span> 「比較を開始」をクリック</li>
                <li><span class="tool-guide-step-num">4</span> 「クラスター設定」「ネットワーク設定」タブで結果を確認。赤い表示をクリックすると差分の詳細が表示されます</li>
            </ol>
            <p class="tool-guide-glossary">
                <a href="https://manuals.i-reporter.jp/glossary" target="_blank" rel="noopener noreferrer">📖 ConMas i-Reporter 用語集</a>で、クラスター・ネットワークなどの用語を確認できます。
            </p>
        `;
        toolGuideBtn.addEventListener('click', () => {
            toolGuideModalBody.innerHTML = toolGuideContent;
            toolGuideModal.style.display = 'block';
        });
        function closeToolGuideModal(e) {
            if (!e || e.target === toolGuideModal || e.target === toolGuideModalClose) {
                toolGuideModal.style.display = 'none';
            }
        }
        if (toolGuideModalClose) toolGuideModalClose.addEventListener('click', closeToolGuideModal);
        toolGuideModal.addEventListener('click', closeToolGuideModal);
        const toolGuideContentEl = toolGuideModal.querySelector('.tool-guide-modal-content');
        if (toolGuideContentEl) toolGuideContentEl.addEventListener('click', (e) => e.stopPropagation());
    }

    // XMLの出力方法モーダル（ConMas DesignerでXMLを出力する手順）
    const xmlOutputGuideBtn = document.getElementById('xmlOutputGuideBtn');
    const xmlOutputGuideModal = document.getElementById('xmlOutputGuideModal');
    const xmlOutputGuideModalBody = document.getElementById('xmlOutputGuideModalBody');
    const xmlOutputGuideModalClose = document.getElementById('xmlOutputGuideModalClose');
    if (xmlOutputGuideBtn && xmlOutputGuideModal && xmlOutputGuideModalBody) {
        const xmlOutputGuideContent = `
            <p class="tool-guide-lead">このツールで比較するXMLファイルは、ConMas Designerから出力できます。</p>
            <ol class="tool-guide-steps tool-guide-steps-xml">
                <li class="tool-guide-step-block"><span class="tool-guide-step-num">1</span><span class="tool-guide-step-text">ConMas DesignerでExcelファイルを取り込み、帳票定義を作成・編集します。</span></li>
                <li class="tool-guide-step-block"><span class="tool-guide-step-num">2</span><span class="tool-guide-step-text">帳票定義が完成したら、メニューから<strong>「帳票定義をローカル保存」</strong>を実行します。</span></li>
                <li class="tool-guide-step-block"><span class="tool-guide-step-num">3</span><span class="tool-guide-step-text">XML形式でPCに保存されます。そのファイルをこのツールの「比較XMLをアップロード」で選択して比較できます。</span></li>
            </ol>
            <div class="tool-guide-image-wrap">
                <img src="Material/Difinition_output.jpg" alt="帳票定義をローカル保存の操作画面" class="tool-guide-image" />
            </div>
        `;
        xmlOutputGuideBtn.addEventListener('click', () => {
            xmlOutputGuideModalBody.innerHTML = xmlOutputGuideContent;
            xmlOutputGuideModal.style.display = 'block';
        });
        function closeXmlOutputGuideModal(e) {
            if (!e || e.target === xmlOutputGuideModal || e.target === xmlOutputGuideModalClose) {
                xmlOutputGuideModal.style.display = 'none';
            }
        }
        if (xmlOutputGuideModalClose) xmlOutputGuideModalClose.addEventListener('click', closeXmlOutputGuideModal);
        xmlOutputGuideModal.addEventListener('click', closeXmlOutputGuideModal);
        const xmlOutputGuideContentEl = xmlOutputGuideModal.querySelector('.tool-guide-modal-content');
        if (xmlOutputGuideContentEl) xmlOutputGuideContentEl.addEventListener('click', (e) => e.stopPropagation());
    }

    const uploadCompareBtn = document.getElementById('uploadCompareBtn');
    if (uploadCompareBtn) {
        uploadCompareBtn.addEventListener('click', () => {
            const input = document.getElementById('fileInput2');
            if (input) input.click();
        });
    }

    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) compareBtn.addEventListener('click', compareXmlFile);

    document.querySelectorAll('.tabs .tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName) showTab(tabName);
        });
    });

    const toggleDebugBtn = document.getElementById('toggleDebugBtn');
    if (toggleDebugBtn) toggleDebugBtn.addEventListener('click', toggleDebugInfo);

    const filterButtons = document.querySelectorAll('#filterButtons .filter-btn');
    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.filter;
            if (mode) filterClusters(mode);
        });
    });

    const resetBtn = document.getElementById('resetDisplaySettingsBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetDisplaySettings);

    const selectAllBtn = document.getElementById('selectAllDisplaySettingsBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllDisplaySettings);

    const clearAllBtn = document.getElementById('clearAllDisplaySettingsBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllDisplaySettings);

    const testBtn = document.getElementById('testNewComparisonFeaturesBtn');
    if (testBtn) testBtn.addEventListener('click', testNewComparisonFeatures);

    const updateTargets = [
        'pdfFileSelect',
        'pdfDisplayMode',
        'show_cluster_id',
        'show_cluster_name',
        'show_cluster_type',
        'show_network_info',
        'show_value_links',
        'show_network_position',
        'show_network_restrictions',
        'show_choices',
        'show_parameters',
        'show_choice_details',
        'show_differences',
        'show_tooltips'
    ];
    updateTargets.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updatePdfLayout);
    });

    const networkModal = document.getElementById('networkModal');
    if (networkModal) networkModal.addEventListener('click', closeNetworkModal);
    const networkModalContent = document.querySelector('.network-modal-content');
    if (networkModalContent) {
        networkModalContent.addEventListener('click', (event) => event.stopPropagation());
    }
    const networkCloseBtn = document.querySelector('.network-modal-close');
    if (networkCloseBtn) networkCloseBtn.addEventListener('click', closeNetworkModal);

    const clusterModal = document.getElementById('clusterModal');
    if (clusterModal) clusterModal.addEventListener('click', closeClusterModal);
    const clusterModalContent = document.querySelector('.cluster-modal-content');
    if (clusterModalContent) {
        clusterModalContent.addEventListener('click', (event) => event.stopPropagation());
    }
    const clusterCloseBtn = document.querySelector('.cluster-modal-close');
    if (clusterCloseBtn) clusterCloseBtn.addEventListener('click', closeClusterModal);

    const videoModal = document.getElementById('videoModal');
    if (videoModal) videoModal.addEventListener('click', handleVideoModalClick);
    const videoModalContent = document.querySelector('.video-modal-content');
    if (videoModalContent) {
        videoModalContent.addEventListener('click', (event) => event.stopPropagation());
    }

    const videoCloseBtn = document.querySelector('.video-modal-close');
    if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideoModal);
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('videoModal');
            if (modal && modal.style.display === 'flex') {
                closeVideoModal();
            }
        }
    });
}

function bindDelegatedEvents() {
    const sheetNavContainers = [
        document.getElementById('sheetNavigation'),
        document.getElementById('sheetNavigationVisible')
    ];
    sheetNavContainers.forEach((container) => {
        if (!container) return;
        container.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-sheet-index]');
            if (!button || button.disabled) return;
            const index = parseInt(button.dataset.sheetIndex, 10);
            if (!Number.isNaN(index)) changeSheet(index);
        });
    });

    const networkSheetNav = document.getElementById('networkSheetNavigationVisible');
    if (networkSheetNav) {
        networkSheetNav.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-network-sheet-index]');
            if (!button || button.disabled) return;
            const index = parseInt(button.dataset.networkSheetIndex, 10);
            if (!Number.isNaN(index)) changeNetworkSheet(index);
        });
    }

    document.addEventListener('click', (event) => {
        const cluster = event.target.closest('.cluster-overlay');
        if (!cluster) return;
        const index = parseInt(cluster.dataset.clusterIndex, 10);
        if (!Number.isNaN(index)) selectCluster(index);
    });
}

// ページ読み込み時にバナーの状態を初期化
document.addEventListener('DOMContentLoaded', function() {
    initSetupCheckBanner();
    bindUiEvents();
    bindDelegatedEvents();
});

function filterClusters(mode) {
    const overlays = document.querySelectorAll('.cluster-overlay');
    overlays.forEach((overlay) => {
        const diff = overlay.dataset.diff;
        let show = true;
        if (mode === 'different') {
            show = diff === 'different';
        } else if (mode === 'same') {
            show = diff === 'same' || diff === 'reference';
        }
        overlay.style.display = show ? 'flex' : 'none';
    });
}
