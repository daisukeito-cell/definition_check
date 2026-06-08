/**
 * カーボンコピー設定の抽出・比較
 */

export function formatCarbonCopyEdit(edit) {
    if (edit === '0') return '編集不可';
    if (edit === '1') return '編集可';
    return edit || '未設定';
}

export function extractCarbonCopyInfo(cluster, sourceIndex0, sheetNo1Based) {
    const empty = {
        hasSetting: false,
        sheetNo: '',
        clusterId: '',
        targetIndex0: null,
        edit: '',
        editLabel: '未設定',
        routeLabel: '設定なし',
    };
    if (!cluster) return empty;

    const carbonCopy = cluster.querySelector('carbonCopy');
    if (!carbonCopy) return empty;

    const target = carbonCopy.querySelector('targetCluster');
    if (!target) return empty;

    const clusterId = (target.querySelector('clusterId')?.textContent || '').trim();
    if (!clusterId) return empty;

    const targetIndex0 = parseInt(clusterId, 10);
    if (Number.isNaN(targetIndex0)) return empty;

    const sourceIndex1 = sourceIndex0 + 1;
    const targetIndex1 = targetIndex0 + 1;
    if (targetIndex1 === sourceIndex1) return empty;

    const sheetNo = (target.querySelector('sheetNo')?.textContent || '').trim() || String(sheetNo1Based);
    const edit = (target.querySelector('edit')?.textContent || '').trim();

    return {
        hasSetting: true,
        sheetNo,
        clusterId,
        targetIndex0,
        edit,
        editLabel: formatCarbonCopyEdit(edit),
        routeLabel: `${sourceIndex0}→${targetIndex0}`,
        targetLabel: `シート${sheetNo}・INDEX ${targetIndex0}`,
    };
}

export function compareCarbonCopyInfo(info1, info2) {
    if (!info1.hasSetting && !info2.hasSetting) {
        return { match: true, status: 'none' };
    }
    if (!info1.hasSetting || !info2.hasSetting) {
        return { match: false, status: 'missing' };
    }
    if (info1.sheetNo !== info2.sheetNo || info1.clusterId !== info2.clusterId) {
        return { match: false, status: 'target' };
    }
    if (info1.edit !== info2.edit) {
        return { match: false, status: 'edit' };
    }
    return { match: true, status: 'match' };
}

export function buildTargetIndexSet(clusters, sheetNo1Based) {
    const targets = new Set();
    clusters.forEach((cluster, sourceIndex0) => {
        const info = extractCarbonCopyInfo(cluster, sourceIndex0, sheetNo1Based);
        if (info.hasSetting && info.sheetNo === String(sheetNo1Based)) {
            targets.add(info.targetIndex0);
        }
    });
    return targets;
}

export function findSourcesForTarget(clusters, targetIndex0, sheetNo1Based) {
    const sources = [];
    clusters.forEach((cluster, sourceIndex0) => {
        const info = extractCarbonCopyInfo(cluster, sourceIndex0, sheetNo1Based);
        if (info.hasSetting && info.sheetNo === String(sheetNo1Based) && info.targetIndex0 === targetIndex0) {
            sources.push({ sourceIndex0, info });
        }
    });
    return sources;
}

export function getCarbonCopyVisualState(compareResult, isSource, isTarget) {
    if (!compareResult.match) return 'diff';
    if (isSource) return 'source';
    if (isTarget) return 'target';
    return 'none';
}

export function getCarbonCopyRoleLabel(isSource, isTarget) {
    if (isSource && isTarget) return '元・先';
    if (isSource) return '元';
    if (isTarget) return '先';
    return '設定なし';
}

export function buildCarbonCopyDetailData(clusterIndex, clusters1, clusters2, sheetNo1Based, compareMode) {
    const cluster1 = clusters1?.[clusterIndex] || null;
    const cluster2 = clusters2?.[clusterIndex] || null;
    const info1 = extractCarbonCopyInfo(cluster1, clusterIndex, sheetNo1Based);
    const info2 = extractCarbonCopyInfo(cluster2, clusterIndex, sheetNo1Based);
    const compare = compareCarbonCopyInfo(info1, info2);

    const sources1 = findSourcesForTarget(clusters1 || [], clusterIndex, sheetNo1Based);
    const sources2 = findSourcesForTarget(clusters2 || [], clusterIndex, sheetNo1Based);

    const isSource1 = info1.hasSetting;
    const isSource2 = info2.hasSetting;
    const isTarget1 = sources1.length > 0;
    const isTarget2 = sources2.length > 0;

    const incomingRef = sources1.map((s) => `INDEX ${s.sourceIndex0}`).join(', ') || 'なし';
    const incomingComp = sources2.map((s) => `INDEX ${s.sourceIndex0}`).join(', ') || 'なし';
    const incomingMatch = incomingRef === incomingComp;

    const rows = [
        {
            label: '役割',
            ref: getCarbonCopyRoleLabel(isSource1, isTarget1),
            comp: compareMode ? getCarbonCopyRoleLabel(isSource2, isTarget2) : null,
            match: compareMode ? getCarbonCopyRoleLabel(isSource1, isTarget1) === getCarbonCopyRoleLabel(isSource2, isTarget2) : true,
        },
        {
            label: 'カーボンコピー設定',
            ref: info1.hasSetting ? 'あり' : 'なし',
            comp: compareMode ? (info2.hasSetting ? 'あり' : 'なし') : null,
            match: compareMode ? info1.hasSetting === info2.hasSetting : true,
        },
        {
            label: 'コピー元 INDEX',
            ref: isSource1 ? String(clusterIndex) : (isTarget1 ? incomingRef : '—'),
            comp: compareMode ? (isSource2 ? String(clusterIndex) : (isTarget2 ? incomingComp : '—')) : null,
            match: compareMode
                ? (isSource1 === isSource2 &&
                  (isSource1 ? true : incomingRef === incomingComp))
                : true,
        },
        {
            label: 'コピー先',
            ref: info1.hasSetting ? info1.targetLabel : '—',
            comp: compareMode ? (info2.hasSetting ? info2.targetLabel : '—') : null,
            match: compareMode
                ? (!info1.hasSetting && !info2.hasSetting) ||
                  (info1.hasSetting &&
                      info2.hasSetting &&
                      info1.sheetNo === info2.sheetNo &&
                      info1.clusterId === info2.clusterId)
                : true,
        },
        {
            label: 'ルート表示',
            ref: info1.hasSetting ? info1.routeLabel : '設定なし',
            comp: compareMode ? (info2.hasSetting ? info2.routeLabel : '設定なし') : null,
            match: compareMode ? info1.routeLabel === info2.routeLabel || (!info1.hasSetting && !info2.hasSetting) : true,
        },
        {
            label: '編集可否',
            ref: info1.hasSetting ? info1.editLabel : '—',
            comp: compareMode ? (info2.hasSetting ? info2.editLabel : '—') : null,
            match: compareMode
                ? (!info1.hasSetting && !info2.hasSetting) || (info1.hasSetting && info2.hasSetting && info1.edit === info2.edit)
                : true,
        },
        {
            label: 'コピー先としての参照元',
            ref: incomingRef,
            comp: compareMode ? incomingComp : null,
            match: compareMode ? incomingMatch : true,
        },
    ];

    return {
        compareMode,
        compare,
        info1,
        info2,
        rows,
        roleRef: getCarbonCopyRoleLabel(isSource1, isTarget1),
        roleComp: getCarbonCopyRoleLabel(isSource2, isTarget2),
    };
}

export function renderCarbonCopyDetailHtml(data, escapeHtml) {
    const { rows, compareMode, compare } = data;

    const statusBadge = (match) =>
        match
            ? '<span class="cluster-compare-same">一致</span>'
            : '<span class="cluster-compare-diff">不一致</span>';

    const rowClass = (match) => (match ? 'cluster-compare-row-match' : 'cluster-compare-row-diff');

    let tableHtml;
    if (compareMode) {
        const body = rows
            .map(
                (row) => `<tr class="${rowClass(row.match)}">
                    <td><strong>${escapeHtml(row.label)}</strong></td>
                    <td>${escapeHtml(row.ref)}</td>
                    <td>${escapeHtml(row.comp ?? '—')}</td>
                    <td>${statusBadge(row.match)}</td>
                </tr>`,
            )
            .join('');
        tableHtml = `
            <table class="cluster-comparison-table carbon-copy-detail-table">
                <thead>
                    <tr>
                        <th>設定項目</th>
                        <th>基準XML</th>
                        <th>比較XML</th>
                        <th>状態</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
    } else {
        const body = rows
            .map(
                (row) => `<tr>
                    <td><strong>${escapeHtml(row.label)}</strong></td>
                    <td>${escapeHtml(row.ref)}</td>
                </tr>`,
            )
            .join('');
        tableHtml = `
            <table class="cluster-comparison-table carbon-copy-detail-table carbon-copy-detail-table-preview">
                <thead>
                    <tr><th>設定項目</th><th>基準XML</th></tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
    }

    let summary = '';
    if (compareMode) {
        if (!compare.match) {
            summary = '<p class="carbon-copy-detail-summary carbon-copy-detail-summary--diff">⚠️ 基準XMLとカーボンコピー設定が異なります。</p>';
        } else if (data.info2.hasSetting || data.info1.hasSetting) {
            summary = '<p class="carbon-copy-detail-summary carbon-copy-detail-summary--match">✅ カーボンコピー設定は基準XMLと一致しています。</p>';
        } else {
            summary = '<p class="carbon-copy-detail-summary">カーボンコピーは設定されていません（基準・比較ともになし）。</p>';
        }
    }

    return `<div class="carbon-copy-detail-content">${tableHtml}${summary}</div>`;
}
