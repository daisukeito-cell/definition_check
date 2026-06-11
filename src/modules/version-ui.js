import { APP_VERSION, CHANGELOG } from '../version.js';

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderChangelogHtml() {
    return CHANGELOG.map((entry) => {
        const items = entry.items
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('');
        const isCurrent = entry.version === APP_VERSION;
        const summaryHtml = entry.summary
            ? `<p class="changelog-entry-summary">${escapeHtml(entry.summary)}</p>`
            : '';
        return `
            <section class="changelog-entry${isCurrent ? ' changelog-entry--current' : ''}">
                <h4 class="changelog-entry-title">
                    Ver ${escapeHtml(entry.version)}
                    <span class="changelog-entry-date">${escapeHtml(entry.date)}</span>
                    ${isCurrent ? '<span class="changelog-entry-current">現在</span>' : ''}
                </h4>
                ${summaryHtml}
                <ul class="changelog-entry-list">${items}</ul>
            </section>`;
    }).join('');
}

function ensureChangelogModal() {
    if (document.getElementById('changelogModal')) return;

    document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div class="tool-guide-modal changelog-modal" id="changelogModal" style="display: none;">
            <div class="tool-guide-modal-content changelog-modal-content">
                <div class="tool-guide-modal-header">
                    <h3>📋 変更履歴</h3>
                    <button type="button" class="tool-guide-modal-close" id="changelogModalClose" aria-label="閉じる">×</button>
                </div>
                <div class="tool-guide-modal-body changelog-modal-body">
                    <p class="changelog-lead">現在のバージョン: <strong>Ver ${escapeHtml(APP_VERSION)}</strong></p>
                    <div class="changelog-entries">${renderChangelogHtml()}</div>
                </div>
            </div>
        </div>`,
    );

    const modal = document.getElementById('changelogModal');
    const closeBtn = document.getElementById('changelogModalClose');
    const content = modal?.querySelector('.changelog-modal-content');

    const close = () => {
        if (modal) modal.style.display = 'none';
    };

    closeBtn?.addEventListener('click', close);
    modal?.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
    content?.addEventListener('click', (event) => event.stopPropagation());

    if (!window.__changelogEscapeBound) {
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const el = document.getElementById('changelogModal');
            if (el && el.style.display === 'flex') close();
        });
        window.__changelogEscapeBound = true;
    }
}

function openChangelogModal() {
    ensureChangelogModal();
    const modal = document.getElementById('changelogModal');
    if (modal) modal.style.display = 'flex';
}

export function initAppVersionUI() {
    const badge = document.getElementById('appVersionBadge');
    if (!badge) return;

    badge.textContent = `Ver ${APP_VERSION}`;
    badge.setAttribute('aria-label', `バージョン ${APP_VERSION}。変更履歴を見る`);
    badge.addEventListener('click', openChangelogModal);
}
