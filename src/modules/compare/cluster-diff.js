/**
 * i-Reporter クラスター種別の日本語表記マッピング
 * 
 * クラスター種別一覧（全19種類）:
 * 1. Action - アクション
 * 2. Calculate - 計算式
 * 3. CalendarDate - カレンダー年月日
 * 4. Check - チェック
 * 5. Date - 年月日
 * 6. FreeDraw - フリードロー
 * 7. Image - 画像
 * 8. Numeric - 数値
 * 9. InputNumeric - 数値入力
 * 10. MCNCalculate - トグル集計
 * 11. MultipleChoiceNumber - トグル選択
 * 12. MultiSelect - 複数選択
 * 13. NumberHours - 時間数
 * 14. QRCode - バーコード
 * 15. Select - 単一選択
 * 16. SelectMaster - マスター選択
 * 17. Time - 時刻
 * 18. TimeCalculate - 時刻計算
 * 19. KeyboardText - キーボードテキスト
 */
export function getClusterTypeJapanese(type) {
    if (!type) return '未設定';

    const typeMap = {
        'Action': 'アクション',
        'Calculate': '計算式',
        'CalendarDate': 'カレンダー年月日',
        'Check': 'チェック',
        'Date': '年月日',
        'FreeDraw': 'フリードロー',
        'Image': '画像',
        'Numeric': '数値',
        'InputNumeric': '数値入力',
        'MCNCalculate': 'トグル集計',
        'MultipleChoiceNumber': 'トグル選択',
        'MultiSelect': '複数選択',
        'NumberHours': '時間数',
        'QRCode': 'バーコード',
        'Select': '単一選択',
        'SelectMaster': 'マスター選択',
        'Time': '時刻',
        'TimeCalculate': '時刻計算',
        'KeyboardText': 'キーボードテキスト'
    };

    return typeMap[type] || type;
}

export function extractParameter(inputParams, paramName) {
    const regex = new RegExp(`${paramName}=([^;]+)`);
    const match = inputParams.match(regex);
    return match ? match[1] : '';
}

export function compareClusterSettings(cluster1, cluster2) {
    const name1 = cluster1.querySelector('name')?.textContent || '';
    const name2 = cluster2.querySelector('name')?.textContent || '';
    const type1 = cluster1.querySelector('type')?.textContent || '';
    const type2 = cluster2.querySelector('type')?.textContent || '';

    if (name1 !== name2 || type1 !== type2) {
        return true;
    }

    const top1 = parseFloat(cluster1.querySelector('top')?.textContent || '0');
    const top2 = parseFloat(cluster2.querySelector('top')?.textContent || '0');
    const left1 = parseFloat(cluster1.querySelector('left')?.textContent || '0');
    const left2 = parseFloat(cluster2.querySelector('left')?.textContent || '0');
    const right1 = parseFloat(cluster1.querySelector('right')?.textContent || '0');
    const right2 = parseFloat(cluster2.querySelector('right')?.textContent || '0');
    const bottom1 = parseFloat(cluster1.querySelector('bottom')?.textContent || '0');
    const bottom2 = parseFloat(cluster2.querySelector('bottom')?.textContent || '0');

    if (Math.abs(top1 - top2) > 0.001 || Math.abs(left1 - left2) > 0.001 ||
        Math.abs(right1 - right2) > 0.001 || Math.abs(bottom1 - bottom2) > 0.001) {
        return true;
    }

    return false;
}

/** inputParameters の Items= / Labels= から取り出す対象（i-Reporter 帳票定義XMLで choices 要素が無い場合がある） */
const CLUSTER_TYPES_WITH_ITEMS_PARAM = new Set([
    'Select',
    'MultiSelect',
    'MultipleChoiceNumber',
    'SelectMaster'
]);

function splitCommaSeparatedItems(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw)
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
}

/**
 * inputParameters 内の Items / Labels（カンマ区切り）から選択肢配列を作る
 */
function extractChoicesFromItemsLabelsParam(cluster) {
    const type = cluster.querySelector('type')?.textContent || '';
    if (!CLUSTER_TYPES_WITH_ITEMS_PARAM.has(type)) return [];
    const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
    const itemsRaw = extractParameter(inputParams, 'Items');
    const labelsRaw = extractParameter(inputParams, 'Labels');
    if (!itemsRaw && !labelsRaw) return [];
    const items = splitCommaSeparatedItems(itemsRaw);
    const labels = splitCommaSeparatedItems(labelsRaw);
    const n = Math.max(items.length, labels.length);
    const out = [];
    for (let i = 0; i < n; i++) {
        const value = items[i] ?? '';
        const label = labels[i] ?? value;
        out.push({
            value,
            label,
            selected: 'false'
        });
    }
    return out;
}

/**
 * クラスター要素から選択肢を抽出する。
 * ・choices/choice がある場合はそれを優先
 * ・無い場合は Select/MultiSelect 等の inputParameters（Items/Labels）から取得（Definition_check.xml 形式）
 */
export function extractChoicesFromCluster(cluster) {
    if (!cluster) return [];
    const choiceEls = cluster.querySelectorAll('choices choice');
    if (choiceEls.length > 0) {
        return Array.from(choiceEls).map((choice) => ({
            value: choice.querySelector('value')?.textContent ?? '',
            label: choice.querySelector('label')?.textContent ?? '',
            selected: choice.querySelector('selected')?.textContent || 'false'
        }));
    }
    return extractChoicesFromItemsLabelsParam(cluster);
}

/**
 * 選択肢ごとに compareChoiceLists と同じキーを割り当て、インデックス→キーも返す
 */
function buildChoiceKeyMapWithIndexKeys(list) {
    const keyFor = (c, i) => {
        const v = String(c.value ?? '');
        return v !== '' ? v : `__empty_${i}`;
    };
    const map = new Map();
    const keyAtIndex = [];
    list.forEach((c, i) => {
        let k = keyFor(c, i);
        let n = 0;
        while (map.has(k)) {
            n += 1;
            k = `${keyFor(c, i)}__dup${n}`;
        }
        map.set(k, c);
        keyAtIndex[i] = k;
    });
    return { map, keyAtIndex };
}

/**
 * モーダル表示用：基準列・比較列それぞれ「定義順」で並べ、相手側に同一キーが無い行だけ isOrphan。
 */
export function getChoiceDisplayColumns(listRef, listComp) {
    const { map: mapRef, keyAtIndex: kRef } = buildChoiceKeyMapWithIndexKeys(listRef);
    const { map: mapComp, keyAtIndex: kComp } = buildChoiceKeyMapWithIndexKeys(listComp);
    const keysComp = new Set(mapComp.keys());
    const keysRef = new Set(mapRef.keys());
    return {
        refColumn: listRef.map((c, i) => ({
            choice: c,
            isOrphan: !keysComp.has(kRef[i])
        })),
        compColumn: listComp.map((c, i) => ({
            choice: c,
            isOrphan: !keysRef.has(kComp[i])
        }))
    };
}

/**
 * 選択肢配列を値（value）をキーに比較する。並び順の違いのみでは差分にしない。
 * @returns {{ hasDifferences: boolean, differences: string[], choicePairRows: Array }}
 */
export function compareChoiceLists(choiceList1, choiceList2) {
    const map1 = buildChoiceKeyMapWithIndexKeys(choiceList1).map;
    const map2 = buildChoiceKeyMapWithIndexKeys(choiceList2).map;

    const allKeys = Array.from(new Set([...map1.keys(), ...map2.keys()])).sort((a, b) =>
        a.localeCompare(b, 'ja')
    );

    const differences = [];
    const pairRows = [];

    for (const key of allKeys) {
        const c1 = map1.get(key) || null;
        const c2 = map2.get(key) || null;
        let isDiff = false;

        if (!c1 && c2) {
            differences.push(
                `選択肢（値: ${c2.value || '（空）'}）: 基準XMLにのみ存在しない → 比較XMLで追加`
            );
            isDiff = true;
        } else if (c1 && !c2) {
            differences.push(
                `選択肢（値: ${c1.value || '（空）'}）: 比較XMLにのみ存在しない → 基準XMLのみ`
            );
            isDiff = true;
        } else if (c1 && c2) {
            if (c1.label !== c2.label) {
                differences.push(
                    `値「${c1.value || key}」のラベル: ${c1.label} → ${c2.label}`
                );
                isDiff = true;
            }
        }

        pairRows.push({
            key,
            ref: c1,
            comp: c2,
            isDiff
        });
    }

    return {
        hasDifferences: differences.length > 0,
        differences,
        choicePairRows: pairRows
    };
}

export function getChoiceDifference(cluster, index, context = {}) {
    const { xmlData1, xmlData2, currentSheetIndex = 0 } = context;

    if (!xmlData1 || !xmlData2) {
        return {
            hasDifferences: false,
            differences: [],
            choices: [],
            ref_choices: [],
            choicePairRows: [],
            choiceDisplayColumns: { refColumn: [], compColumn: [] }
        };
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const sheets1 = doc1.querySelectorAll('sheets sheet');
    const sheets2 = doc2.querySelectorAll('sheets sheet');

    if (currentSheetIndex >= sheets1.length || currentSheetIndex >= sheets2.length) {
        return {
            hasDifferences: false,
            differences: [],
            choices: [],
            ref_choices: [],
            choicePairRows: [],
            choiceDisplayColumns: { refColumn: [], compColumn: [] }
        };
    }

    const sheet1 = sheets1[currentSheetIndex];
    const sheet2 = sheets2[currentSheetIndex];

    const clusters1 = sheet1.querySelectorAll('clusters cluster');
    const clusters2 = sheet2.querySelectorAll('clusters cluster');

    if (index >= clusters1.length || index >= clusters2.length) {
        return {
            hasDifferences: false,
            differences: [],
            choices: [],
            ref_choices: [],
            choicePairRows: [],
            choiceDisplayColumns: { refColumn: [], compColumn: [] }
        };
    }

    const cluster1 = clusters1[index];
    const cluster2 = clusters2[index];

    const choiceList1 = extractChoicesFromCluster(cluster1);
    const choiceList2 = extractChoicesFromCluster(cluster2);

    const { differences, choicePairRows: pairRows } = compareChoiceLists(choiceList1, choiceList2);
    const choiceDisplayColumns = getChoiceDisplayColumns(choiceList1, choiceList2);

    return {
        hasDifferences: differences.length > 0,
        differences: differences,
        choices: choiceList2,
        ref_choices: choiceList1,
        choicePairRows: pairRows,
        choiceDisplayColumns
    };
}

export function checkClusterDifference(cluster, index, context = {}) {
    const { xmlData1, xmlData2, currentSheetIndex = 0 } = context;

    if (!xmlData1 || !xmlData2) {
        return { hasDifference: false, isBasicMatch: false, differences: [] };
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const sheets1 = doc1.querySelectorAll('sheets sheet');
    const sheets2 = doc2.querySelectorAll('sheets sheet');

    if (currentSheetIndex >= sheets1.length || currentSheetIndex >= sheets2.length) {
        return { hasDifference: false, isBasicMatch: false, differences: [] };
    }

    const sheet1 = sheets1[currentSheetIndex];
    const sheet2 = sheets2[currentSheetIndex];

    const clusters1 = sheet1.querySelectorAll('clusters cluster');
    const clusters2 = sheet2.querySelectorAll('clusters cluster');

    const cluster1 = index < clusters1.length ? clusters1[index] : null;
    const cluster2 = index < clusters2.length ? clusters2[index] : null;

    if (!cluster1 || !cluster2) {
        return { hasDifference: true, isBasicMatch: false, differences: ['クラスターが存在しません'] };
    }

    const name1 = cluster1.querySelector('name')?.textContent || '';
    const name2 = cluster2.querySelector('name')?.textContent || '';
    const type1 = cluster1.querySelector('type')?.textContent || '';
    const type2 = cluster2.querySelector('type')?.textContent || '';

    const isBasicMatch = (name1 === name2 && type1 === type2);

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
        const actionType = extractParameter(inputParams, 'ActionType') ||
            extractParameter(inputParams, 'Action') ||
            extractParameter(inputParams, 'Type') || '';
        return actionType || '未設定';
    };

    const getFormula = (cluster) => {
        if (!cluster) return '';
        return cluster.querySelector('function')?.textContent || '';
    };

    const getGroupId = (cluster) => {
        if (!cluster) return '';
        const inputParams = cluster.querySelector('inputParameters')?.textContent || '';
        const groupId = extractParameter(inputParams, 'Group');
        if (groupId !== '') {
            return groupId;
        }
        return cluster.querySelector('groupId')?.textContent ||
            cluster.querySelector('group')?.textContent ||
            cluster.getAttribute('groupId') ||
            cluster.getAttribute('group') || '';
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
        if (targetIndexDisplay === currentIndex) {
            return null;
        }
        return targetIndexDisplay;
    };

    const required1 = getRequired(cluster1);
    const required2 = getRequired(cluster2);
    const actionType1 = getActionType(cluster1);
    const actionType2 = getActionType(cluster2);
    const formula1 = getFormula(cluster1);
    const formula2 = getFormula(cluster2);
    const groupId1 = getGroupId(cluster1);
    const groupId2 = getGroupId(cluster2);

    const currentClusterIndex = index + 1;
    const carbonCopyTarget1 = getCarbonCopyInfo(cluster1, currentClusterIndex);
    const carbonCopyTarget2 = getCarbonCopyInfo(cluster2, currentClusterIndex);

    const choiceDiff = getChoiceDifference(cluster2, index, { xmlData1, xmlData2, currentSheetIndex });

    const differences = [];

    if (required1 !== required2) {
        differences.push('必須の有無');
    }
    if (actionType1 !== actionType2) {
        const isSignType = ['Create', 'Inspect', 'Approval'].includes(type1) || ['Create', 'Inspect', 'Approval'].includes(type2);
        differences.push(isSignType ? 'サイン種別' : 'アクション種別');
    }
    if (formula1 !== formula2) {
        differences.push('計算式内容');
    }
    if (groupId1 !== groupId2) {
        differences.push('グループID');
    }
    if (choiceDiff.hasDifferences) {
        differences.push('選択肢');
    }
    if (carbonCopyTarget1 !== carbonCopyTarget2) {
        differences.push('カーボンコピー');
    }

    const hasOtherDifferences = differences.length > 0;

    return {
        hasDifference: !isBasicMatch || hasOtherDifferences,
        isBasicMatch: isBasicMatch,
        hasOtherDifferences: hasOtherDifferences,
        differences: differences,
        isNameDifferent: name1 !== name2,
        isTypeDifferent: type1 !== type2
    };
}
