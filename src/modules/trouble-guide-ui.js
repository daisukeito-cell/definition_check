const FAQ_EXCEL_IMPORT_URL =
    'https://help.i-reporter.jp/knowledge/conmas-designer%E3%82%A8%E3%83%A9%E3%83%BC%E3%83%A1%E3%83%83%E3%82%BB%E3%83%BC%E3%82%B8excel-%E5%B8%B3%E7%A5%A8%E5%AE%9A%E7%BE%A9%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E6%AD%A3%E5%B8%B8%E3%81%AB%E9%96%8B%E3%81%91%E3%81%BE%E3%81%9B%E3%82%93%E3%81%A7%E3%81%97%E3%81%9F-%E5%9E%8B-microsoft.office.interop.excel.applicationclass-%E3%81%AEcom-%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%82%92';

const FAQ_CLUSTER_POSITION_URL =
    'https://help.i-reporter.jp/knowledge/conmas-designer%E5%B8%B3%E7%A5%A8%E5%AE%9A%E7%BE%A9excel%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E5%8F%96%E8%BE%BC%E3%82%80%E3%81%A8-%E3%82%AF%E3%83%A9%E3%82%B9%E3%82%BF-%E3%81%AE%E4%BD%8D%E7%BD%AE%E3%81%8C%E5%85%A8%E4%BD%93%E7%9A%84%E3%81%AB%E3%81%9A%E3%82%8C%E3%81%A6%E3%81%97%E3%81%BE%E3%81%84%E3%81%BE%E3%81%99';

const SUPPORT_FORM_URL = 'https://application.i-reporter.jp/support_form';

function renderTroubleGuideBody() {
    return `
        <p class="tool-guide-lead">
            Excelファイルを ConMas Designer に取り込む際に、エラーが出たりクラスターの位置がずれたりすることがあります。
            定義チェックの前段階でつまずいた場合は、まず下記をご確認ください。
        </p>

        <section class="trouble-guide-block">
            <h4 class="tool-guide-section-title">
                <span class="tool-guide-icon" aria-hidden="true">1</span>
                Excel取り込みでエラーが出た場合
            </h4>
            <p>
                COMオブジェクト関連のメッセージなど、Designer への Excel 取り込みでよくある事象は
                次のよくある質問にまとまっています。
            </p>
            <a
                href="${FAQ_EXCEL_IMPORT_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="trouble-guide-link"
            >よくある質問：Excel帳票定義ファイルを正常に開けませんでした…</a>
        </section>

        <section class="trouble-guide-block">
            <h4 class="tool-guide-section-title">
                <span class="tool-guide-icon" aria-hidden="true">2</span>
                クラスターの位置がずれる場合
            </h4>
            <p>
                Excel 帳票定義ファイルを取り込んだあと、Designer 上でクラスターの位置が
                全体的にずれて見える場合の対処法は、次のよくある質問をご確認ください。
            </p>
            <a
                href="${FAQ_CLUSTER_POSITION_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="trouble-guide-link"
            >よくある質問：帳票定義Excelファイルを取り込むとクラスターの位置が全体的にずれてしまいます</a>
        </section>

        <section class="trouble-guide-block">
            <h4 class="tool-guide-section-title">
                <span class="tool-guide-icon" aria-hidden="true">3</span>
                それでも解決しない場合
            </h4>
            <p>
                よくある質問に該当しないエラー、または検索しても情報が見つからない場合は、
                テクニカルサポート受付フォームから直接お問い合わせください。
            </p>
            <a
                href="${SUPPORT_FORM_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="trouble-guide-link trouble-guide-link--support"
            >テクニカルサポート受付フォーム</a>
        </section>
    `;
}

export function initTroubleGuideUI() {
    const btn = document.getElementById('practiceTroubleBtn');
    const modal = document.getElementById('practiceTroubleModal');
    const body = document.getElementById('practiceTroubleModalBody');
    const closeBtn = document.getElementById('practiceTroubleModalClose');
    if (!btn || !modal || !body) return;

    const openModal = () => {
        body.innerHTML = renderTroubleGuideBody();
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    btn.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    const inner = modal.querySelector('.trouble-guide-modal-content');
    inner?.addEventListener('click', (event) => event.stopPropagation());

    if (!window.__troubleGuideEscapeBound) {
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const el = document.getElementById('practiceTroubleModal');
            if (el && el.style.display === 'flex') closeModal();
        });
        window.__troubleGuideEscapeBound = true;
    }
}
