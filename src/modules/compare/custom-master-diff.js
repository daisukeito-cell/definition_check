/**
 * カスタムマスター（SelectMaster / userCustomMaster）の抽出・比較
 */

import { extractParameter } from './cluster-diff.js';

/** 差分ありでも修正任意とみなす inputParameters キー */
const OPTIONAL_PARAM_KEYS = [
    'DirectInput',
    'DisplayNotFoundRecord',
    'SearchMatchType',
    'GatewayMode',
    'ChildEditable',
    'SingleItemMode',
    'UseKeyboard',
];

/** 必須級のマスター紐付けキー */
const CORE_PARAM_KEYS = [
    'MasterTableId',
    'MasterTableName',
    'MasterFieldNo',
    'MasterFieldName',
];

function text(el, selector) {
    if (!el) return '';
    if (!selector) return (el.textContent || '').trim();
    return (el.querySelector(selector)?.textContent || '').trim();
}

function getClusterName(cluster) {
    return text(cluster, 'name') || '未設定';
}

function getClusterType(cluster) {
    return text(cluster, 'type');
}

function parseTargets(userCustomMaster) {
    if (!userCustomMaster) return [];
    return Array.from(userCustomMaster.querySelectorAll('targetCluster')).map((tc) => ({
        sheetNo: text(tc, 'sheetNo'),
        clusterId: text(tc, 'clusterId'),
        targetField: text(tc, 'targetField'),
        targetFieldName: text(tc, 'targetFieldName'),
    }));
}

/** 環境依存の内部IDを除き、親子関係の同等性を見るキー */
function relationKey(targets) {
    return (targets || [])
        .map((t) => `${t.sheetNo}|${t.clusterId}|${t.targetFieldName || ''}`)
        .sort()
        .join(';');
}

function formatSheetClusterCode(sheetNo, clusterId) {
    const sheet = sheetNo !== '' ? sheetNo : '?';
    const cluster = clusterId !== '' ? clusterId : '?';
    return `S${sheet}C${cluster}`;
}

function formatTargets(targets) {
    if (!targets.length) return '未設定';
    return targets
        .map((t) => {
            const code = formatSheetClusterCode(t.sheetNo, t.clusterId);
            const name = t.targetFieldName || '（未設定）';
            return `${name}【${code}】`;
        })
        .join(' / ');
}

/**
 * 親子関係をクラスター単位で突き合わせ、一致/不一致を付与
 * @returns {{ code: string, refName: string|null, upName: string|null, status: 'same'|'diff'|'missing-up'|'missing-ref' }[]}
 */
export function buildRelationCompareRows(refTargets, upTargets) {
    const refMap = new Map();
    const upMap = new Map();
    (refTargets || []).forEach((t) => {
        const code = formatSheetClusterCode(t.sheetNo, t.clusterId);
        refMap.set(code, t.targetFieldName || '（名称なし）');
    });
    (upTargets || []).forEach((t) => {
        const code = formatSheetClusterCode(t.sheetNo, t.clusterId);
        upMap.set(code, t.targetFieldName || '（名称なし）');
    });

    const codes = Array.from(new Set([...refMap.keys(), ...upMap.keys()])).sort((a, b) => {
        const ma = a.match(/^S(\d+)C(\d+)$/);
        const mb = b.match(/^S(\d+)C(\d+)$/);
        if (ma && mb) {
            const ds = Number(ma[1]) - Number(mb[1]);
            if (ds !== 0) return ds;
            return Number(ma[2]) - Number(mb[2]);
        }
        return a.localeCompare(b);
    });

    return codes.map((code) => {
        const refName = refMap.has(code) ? refMap.get(code) : null;
        const upName = upMap.has(code) ? upMap.get(code) : null;
        let status = 'same';
        if (refName == null) status = 'missing-ref';
        else if (upName == null) status = 'missing-up';
        else if (refName !== upName) status = 'diff';
        return { code, refName, upName, status };
    });
}

function getLockedLabel(clusters, clusterIdStr) {
    const id = parseInt(clusterIdStr, 10);
    if (Number.isNaN(id) || !clusters?.[id]) return '';
    const params = text(clusters[id], 'inputParameters');
    const locked = extractParameter(params, 'Locked');
    if (locked === '1') return 'ロックあり';
    if (locked === '0') return 'ロックなし';
    return '未設定';
}

function formatTargetLocks(targets, clusters) {
    if (!targets.length) return '未設定';
    return targets
        .map((t) => {
            const label = t.targetFieldName || formatSheetClusterCode(t.sheetNo, t.clusterId);
            return `${label}: ${getLockedLabel(clusters, t.clusterId) || '未設定'}`;
        })
        .join(' / ');
}

function targetLocksKey(targets, clusters) {
    return targets
        .map((t) => `${t.clusterId}:${extractParameter(text(clusters?.[parseInt(t.clusterId, 10)], 'inputParameters') || '', 'Locked')}`)
        .sort()
        .join('|');
}

function pickParams(inputParams, keys) {
    const out = {};
    keys.forEach((k) => {
        out[k] = extractParameter(inputParams, k) || '';
    });
    return out;
}

function formatParamSummary(params, keys) {
    const parts = keys
        .map((k) => {
            const v = params[k];
            if (v === '') return null;
            return `${k}=${v}`;
        })
        .filter(Boolean);
    return parts.length ? parts.join(', ') : '未設定';
}

/**
 * 1クラスター分のカスタムマスター情報を抽出
 */
export function extractCustomMasterInfo(cluster, allClusters = null) {
    const empty = {
        hasSetting: false,
        isSelectMaster: false,
        name: '',
        type: '',
        masterTableId: '',
        masterKey: '',
        masterTableName: '',
        masterFieldNo: '',
        masterFieldName: '',
        targets: [],
        targetsLabel: '未設定',
        targetLocksLabel: '未設定',
        targetLocksKey: '',
        coreParams: {},
        optionalParams: {},
        coreParamsLabel: '未設定',
        optionalParamsLabel: '未設定',
    };

    if (!cluster) return empty;

    const type = getClusterType(cluster);
    const isSelectMaster = type === 'SelectMaster';
    const ucm = cluster.querySelector('userCustomMaster');
    const inputParams = text(cluster, 'inputParameters');
    const masterTableIdXml = text(ucm, 'masterTableId');
    const masterKey = text(ucm, 'masterKey');
    const coreParams = pickParams(inputParams, CORE_PARAM_KEYS);
    const optionalParams = pickParams(inputParams, OPTIONAL_PARAM_KEYS);
    const targets = parseTargets(ucm);
    const clusters = allClusters || [];

    const masterTableId = masterTableIdXml || coreParams.MasterTableId || '';
    const masterTableName = coreParams.MasterTableName || '';
    const masterFieldNo = coreParams.MasterFieldNo || '';
    const masterFieldName = coreParams.MasterFieldName || '';

    const hasSetting = !!(
        isSelectMaster ||
        masterTableId ||
        masterKey ||
        masterTableName ||
        masterFieldNo ||
        masterFieldName ||
        targets.length
    );

    // SelectMaster でも完全未設定なら「設定候補」として残す
    const meaningful =
        !!(masterTableId || masterKey || masterTableName || masterFieldNo || masterFieldName || targets.length);

    return {
        hasSetting: hasSetting && (isSelectMaster || meaningful),
        isSelectMaster,
        meaningful,
        name: getClusterName(cluster),
        type,
        masterTableId,
        masterKey,
        masterTableName,
        masterFieldNo,
        masterFieldName,
        targets,
        targetsLabel: formatTargets(targets),
        targetLocksLabel: formatTargetLocks(targets, clusters),
        targetLocksKey: targetLocksKey(targets, clusters),
        coreParams,
        optionalParams,
        coreParamsLabel: formatParamSummary(coreParams, CORE_PARAM_KEYS),
        optionalParamsLabel: formatParamSummary(optionalParams, OPTIONAL_PARAM_KEYS),
    };
}

function compareField(a, b) {
    return (a || '') === (b || '');
}

/**
 * 2つのカスタムマスター情報を比較
 */
export function compareCustomMasterInfo(info1, info2) {
    const neither = !info1?.meaningful && !info2?.meaningful && !info1?.isSelectMaster && !info2?.isSelectMaster;
    if (neither) {
        return { match: true, hasRed: false, hasBlue: false, status: 'none' };
    }

    // どちらかが SelectMaster / 設定ありで、設定有無が違う
    const exist1 = !!(info1?.meaningful || info1?.isSelectMaster);
    const exist2 = !!(info2?.meaningful || info2?.isSelectMaster);

    let hasRed = false;
    let hasBlue = false;

    if (exist1 !== exist2) hasRed = true;
    if (relationKey(info1?.targets) !== relationKey(info2?.targets)) hasRed = true;

    const match = !hasRed && !hasBlue;
    return {
        match,
        hasRed,
        hasBlue,
        status: match ? 'match' : hasRed ? 'diff' : 'optional',
    };
}

function collectRelevantIndexes(sheets1, sheets2) {
    const indexes = new Set();
    const maxSheets = Math.max(sheets1.length, sheets2.length);
    for (let s = 0; s < maxSheets; s++) {
        const clusters1 = sheets1[s]?.querySelectorAll('clusters cluster') || [];
        const clusters2 = sheets2[s]?.querySelectorAll('clusters cluster') || [];
        const max = Math.max(clusters1.length, clusters2.length);
        for (let i = 0; i < max; i++) {
            const info1 = extractCustomMasterInfo(clusters1[i], clusters1);
            const info2 = extractCustomMasterInfo(clusters2[i], clusters2);
            if (info1.isSelectMaster || info2.isSelectMaster || info1.meaningful || info2.meaningful) {
                indexes.add(`${s}:${i}`);
            }
        }
    }
    return Array.from(indexes).sort((a, b) => {
        const [s1, i1] = a.split(':').map(Number);
        const [s2, i2] = b.split(':').map(Number);
        return s1 - s2 || i1 - i2;
    });
}

function buildClusterRow(sheetNo0, index, clusters1, clusters2, compareMode) {
    const cluster1 = clusters1?.[index] || null;
    const cluster2 = clusters2?.[index] || null;
    const info1 = extractCustomMasterInfo(cluster1, clusters1);
    const info2 = extractCustomMasterInfo(cluster2, clusters2);
    const compare = compareMode
        ? compareCustomMasterInfo(info1, info2)
        : { match: true, hasRed: false, hasBlue: false, status: 'preview' };

    const displayName = info1.name || info2.name || '未設定';
    const displayType = info1.type || info2.type || '';

    const fields = [
        {
            key: 'masterTableId',
            label: 'マスターID',
            ref: info1.masterTableId || '未設定',
            up: info2.masterTableId || '未設定',
            match: compareField(info1.masterTableId, info2.masterTableId),
            severity: 'env',
        },
        {
            key: 'masterKey',
            label: 'マスターキー',
            ref: info1.masterKey || '未設定',
            up: info2.masterKey || '未設定',
            match: compareField(info1.masterKey, info2.masterKey),
            severity: 'env',
        },
        {
            key: 'masterTableName',
            label: 'マスター名称',
            ref: info1.masterTableName || '未設定',
            up: info2.masterTableName || '未設定',
            match: compareField(info1.masterTableName, info2.masterTableName),
            severity: 'env',
        },
        {
            key: 'masterField',
            label: '入力フィールド',
            ref: info1.masterFieldName || '未設定',
            up: info2.masterFieldName || '未設定',
            match: compareField(info1.masterFieldName, info2.masterFieldName),
            severity: 'red',
        },
        {
            key: 'targets',
            label: '割当先 子クラスター',
            ref: info1.targetsLabel,
            up: info2.targetsLabel,
            refTargets: info1.targets,
            upTargets: info2.targets,
            relationRows: compareMode
                ? buildRelationCompareRows(info1.targets, info2.targets)
                : buildRelationCompareRows(info1.targets, info1.targets),
            match: relationKey(info1.targets) === relationKey(info2.targets),
            severity: 'red',
        },
    ];

    return {
        sheetNo: sheetNo0 + 1,
        index,
        name: displayName,
        type: displayType,
        info1,
        info2,
        compare,
        fields,
    };
}

/**
 * 帳票全体のカスタムマスター比較データを構築
 */
export function buildCustomMasterData(doc1, doc2 = null) {
    const sheets1 = doc1 ? Array.from(doc1.querySelectorAll('sheets sheet')) : [];
    const sheets2 = doc2 ? Array.from(doc2.querySelectorAll('sheets sheet')) : [];
    const compareMode = !!doc2;

    const keys = collectRelevantIndexes(sheets1, compareMode ? sheets2 : sheets1);
    const clusters = [];

    keys.forEach((key) => {
        const [sheetNo0, index] = key.split(':').map(Number);
        const clusters1 = sheets1[sheetNo0]?.querySelectorAll('clusters cluster') || [];
        const clusters2 = compareMode
            ? sheets2[sheetNo0]?.querySelectorAll('clusters cluster') || []
            : [];
        clusters.push(buildClusterRow(sheetNo0, index, clusters1, clusters2, compareMode));
    });

    const hasRed = clusters.some((c) => c.compare.hasRed);
    const hasBlue = clusters.some((c) => c.compare.hasBlue);

    return {
        compareMode,
        clusters,
        hasRed,
        hasBlue,
        match: !hasRed && !hasBlue,
        empty: clusters.length === 0,
    };
}

/**
 * xml-compare 用: differences に詳細を追加し result.customMaster をセット
 */
export function compareCustomMaster(doc1, doc2, result) {
    const data = buildCustomMasterData(doc1, doc2);
    result.customMaster = data;

    data.clusters.forEach((row) => {
        if (row.compare.match) return;
        row.fields.forEach((field) => {
            if (field.match || field.severity === 'env') return;
            result.differences.push({
                type: 'userCustomMaster',
                category: field.key,
                severity: field.severity,
                description: `${formatSheetClusterCode(row.sheetNo, row.index)}（${row.name}）: ${field.label}が異なります`,
                details: {
                    ref: field.ref,
                    up: field.up,
                },
            });
        });
    });

    return data;
}

export function collectCustomMasterTargetIndexes(clusters) {
    const set = new Set();
    Array.from(clusters || []).forEach((cluster) => {
        const info = extractCustomMasterInfo(cluster, clusters);
        info.targets.forEach((t) => {
            const id = parseInt(t.clusterId, 10);
            if (!Number.isNaN(id)) set.add(id);
        });
    });
    return set;
}

function getClusterLocked(cluster) {
    if (!cluster) return '';
    return extractParameter(text(cluster, 'inputParameters'), 'Locked') || '';
}

export function findCustomMasterSources(clusters, targetIndex) {
    const sources = [];
    Array.from(clusters || []).forEach((cluster, index) => {
        const info = extractCustomMasterInfo(cluster, clusters);
        const mapped = info.targets.find((t) => parseInt(t.clusterId, 10) === targetIndex);
        if (mapped) {
            sources.push({
                index,
                name: info.name,
                fieldName: mapped.targetFieldName || mapped.targetField || '',
            });
        }
    });
    return sources;
}

/** 親クラスターごとの色（1つ目=青、以降は別色） */
export const CUSTOM_MASTER_FAMILY_COLORS = [
    '#007bff',
    '#28a745',
    '#fd7e14',
    '#6f42c1',
    '#20c997',
    '#e83e8c',
];

/**
 * 親クラスターの出現順に色を割り当て、子にも同じ色インデックスを付ける
 * @returns {Map<number, number>} clusterIndex → colorIndex
 */
export function buildCustomMasterFamilyColorMap(clusters) {
    const list = Array.from(clusters || []);
    const map = new Map();
    let colorSeq = 0;

    list.forEach((cluster, index) => {
        const info = extractCustomMasterInfo(cluster, list);
        if (!(info.isSelectMaster || info.meaningful)) return;
        const colorIndex = colorSeq % CUSTOM_MASTER_FAMILY_COLORS.length;
        colorSeq += 1;
        map.set(index, colorIndex);
        info.targets.forEach((t) => {
            const childId = parseInt(t.clusterId, 10);
            if (Number.isNaN(childId) || map.has(childId)) return;
            map.set(childId, colorIndex);
        });
    });

    return map;
}

export function getCustomMasterFamilyColor(colorIndex) {
    if (colorIndex == null || colorIndex < 0) return null;
    return CUSTOM_MASTER_FAMILY_COLORS[colorIndex % CUSTOM_MASTER_FAMILY_COLORS.length];
}

/**
 * シート上の1クラスターの表示状態（マスター/転記先/差分）
 */
export function getCustomMasterClusterVisual(index, clusters1, clusters2, compareMode) {
    const info1 = extractCustomMasterInfo(clusters1?.[index], clusters1);
    const info2 = extractCustomMasterInfo(clusters2?.[index], clusters2);
    const compare = compareMode
        ? compareCustomMasterInfo(info1, info2)
        : { match: true, hasRed: false, hasBlue: false, status: 'preview' };

    const targets1 = collectCustomMasterTargetIndexes(clusters1);
    const targets2 = collectCustomMasterTargetIndexes(compareMode ? clusters2 : clusters1);
    const isSource1 = !!(info1.isSelectMaster || info1.meaningful);
    const isSource2 = !!(info2.isSelectMaster || info2.meaningful);
    const isTarget1 = targets1.has(index);
    const isTarget2 = targets2.has(index);
    const isSource = compareMode ? isSource1 || isSource2 : isSource1;
    const isTarget = compareMode ? isTarget1 || isTarget2 : isTarget1;

    const sources1 = findCustomMasterSources(clusters1, index);
    const sources2 = findCustomMasterSources(compareMode ? clusters2 : [], index);
    const sourcesKey = (sources) =>
        (sources || [])
            .map((s) => `${s.index}|${s.fieldName || ''}`)
            .sort()
            .join(';');
    // 子クラスター側: 紐付け有無や入力フィールド名が違えば赤
    const childRelationDiff =
        compareMode &&
        (isTarget1 || isTarget2) &&
        (isTarget1 !== isTarget2 || sourcesKey(sources1) !== sourcesKey(sources2));

    // 親/子の役割そのものが基準と比較で食い違う（よくあるミス）
    const roleMismatch =
        compareMode &&
        (isSource1 !== isSource2 || isTarget1 !== isTarget2);

    const hasRed = !!(compare.hasRed || childRelationDiff || roleMismatch);
    const hasBlue = !!compare.hasBlue && !hasRed;

    let visual = 'none';
    if (compareMode && hasRed) visual = 'diff';
    else if (compareMode && hasBlue) visual = 'optional';
    else if (isSource) visual = 'source';
    else if (isTarget) visual = 'target';

    return {
        visual,
        isSource,
        isTarget,
        isSource1,
        isSource2,
        isTarget1,
        isTarget2,
        roleMismatch,
        info1,
        info2,
        compare: { ...compare, hasRed, hasBlue, match: !hasRed && !hasBlue },
        lockLabel1: getLockedLabel(clusters1, String(index)) || '未設定',
        lockLabel2: getLockedLabel(clusters2, String(index)) || '未設定',
        sources1,
        sources2,
    };
}

export function buildCustomMasterClusterRow(sheetNo0, index, clusters1, clusters2, compareMode) {
    return buildClusterRow(sheetNo0, index, clusters1, clusters2, compareMode);
}
