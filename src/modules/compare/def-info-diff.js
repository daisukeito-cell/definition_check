/**
 * 帳票定義情報（defTopName / nameParts）の比較
 */

function getDefTopName(doc) {
    const root = doc.documentElement;
    const el = root.querySelector(':scope > defTopName') || doc.querySelector('defTopName');
    return (el?.textContent || '').trim();
}

function parseNameParts(doc) {
    const root = doc.documentElement;
    const np = root.querySelector(':scope > nameParts') || doc.querySelector('nameParts');
    if (!np) return [];
    return Array.from(np.querySelectorAll('part'))
        .map((part) => ({
            partId: (part.querySelector('partId')?.textContent || '').trim(),
            type: (part.querySelector('type')?.textContent || '').trim(),
            value: (part.querySelector('value')?.textContent || '').trim(),
        }))
        .sort((a, b) => Number(a.partId) - Number(b.partId));
}

function resolveInputValueLabel(doc, value) {
    const [sheetStr, clusterStr] = (value || '').split(',');
    const sheetNo = parseInt(sheetStr, 10);
    const clusterIdx = parseInt(clusterStr, 10);
    if (Number.isNaN(sheetNo) || Number.isNaN(clusterIdx)) {
        return value || '未設定';
    }
    const sheet = doc.querySelectorAll('sheets sheet')[sheetNo - 1];
    const cluster = sheet?.querySelectorAll('clusters cluster')[clusterIdx];
    const name = (cluster?.querySelector('name')?.textContent || '').trim();
    if (name) {
        return `${name}（シート${sheetNo}・INDEX ${clusterIdx}）`;
    }
    return `シート${sheetNo}・INDEX ${clusterIdx}`;
}

export function describeNamePart(part, doc) {
    switch (part.type) {
        case 'date':
            return `日付（${part.value || '未設定'}）`;
        case 'value':
            return `固定文字（${part.value === '' ? '空' : part.value}）`;
        case 'report':
            if (part.value === 'defTopName') return '帳票定義名称';
            return `帳票情報（${part.value || '未設定'}）`;
        case 'inputValue':
            return `クラスター値（${resolveInputValueLabel(doc, part.value)}）`;
        default:
            return `${part.type || '不明'}（${part.value || '空'}）`;
    }
}

export function formatNamePartsSummary(parts, doc) {
    if (!parts.length) return '未設定';
    return parts.map((p) => describeNamePart(p, doc)).join(' ＋ ');
}

function namePartsEqual(parts1, parts2) {
    if (parts1.length !== parts2.length) return false;
    return parts1.every(
        (p, i) =>
            p.partId === parts2[i].partId &&
            p.type === parts2[i].type &&
            p.value === parts2[i].value,
    );
}

export function extractDefInfo(doc) {
    return {
        defTopName: getDefTopName(doc),
        nameParts: parseNameParts(doc),
    };
}

export function buildDefInfoData(doc1, doc2 = null) {
    const info1 = extractDefInfo(doc1);
    const refParts = info1.nameParts.map((p) => ({
        ...p,
        label: describeNamePart(p, doc1),
    }));

    if (!doc2) {
        return {
            compareMode: false,
            defTopName: {
                ref: info1.defTopName || '未設定',
                up: null,
                match: true,
            },
            nameParts: {
                refSummary: formatNamePartsSummary(info1.nameParts, doc1),
                upSummary: null,
                refParts,
                upParts: [],
                match: true,
            },
        };
    }

    const info2 = extractDefInfo(doc2);
    const upParts = info2.nameParts.map((p) => ({
        ...p,
        label: describeNamePart(p, doc2),
    }));
    const defTopNameMatch = info1.defTopName === info2.defTopName;
    const namePartsMatch = namePartsEqual(info1.nameParts, info2.nameParts);

    return {
        compareMode: true,
        defTopName: {
            ref: info1.defTopName || '未設定',
            up: info2.defTopName || '未設定',
            match: defTopNameMatch,
        },
        nameParts: {
            refSummary: formatNamePartsSummary(info1.nameParts, doc1),
            upSummary: formatNamePartsSummary(info2.nameParts, doc2),
            refParts,
            upParts,
            match: namePartsMatch,
        },
    };
}

export function compareDefInfo(doc1, doc2, result) {
    const data = buildDefInfoData(doc1, doc2);
    result.defInfo = data;

    if (!data.defTopName.match) {
        result.differences.push({
            type: 'defInfo',
            category: 'defTopName',
            description: `帳票定義名称が異なります（基準: ${data.defTopName.ref} / 比較: ${data.defTopName.up}）`,
            details: {
                ref: data.defTopName.ref,
                up: data.defTopName.up,
            },
        });
    }

    if (!data.nameParts.match) {
        result.differences.push({
            type: 'defInfo',
            category: 'nameParts',
            description: '帳票名称自動作成の設定が異なります',
            details: {
                ref: data.nameParts.refSummary,
                up: data.nameParts.upSummary,
            },
        });
    }
}
