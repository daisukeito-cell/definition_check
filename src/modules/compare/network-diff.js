export function compareNetworkSettings(network1, network2) {
    const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent || '';
    const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent || '';
    const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent || '';
    const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent || '';

    if (prevClusterId1 !== prevClusterId2 || nextClusterId1 !== nextClusterId2) {
        return true;
    }

    return false;
}

export function checkNetworkDifference(network, index, context = {}) {
    const { xmlData1, xmlData2, currentSheetIndex = 0 } = context;

    if (!xmlData1 || !xmlData2) {
        console.log(`checkNetworkDifference: XMLデータが不足 - index: ${index}`);
        return false;
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const networks1 = doc1.querySelectorAll('networks network');
    const networks2 = doc2.querySelectorAll('networks network');

    console.log(`checkNetworkDifference: ネットワーク数 - networks1: ${networks1.length}, networks2: ${networks2.length}, index: ${index}`);

    const currentNetworkId = network.querySelector('id')?.textContent;
    console.log(`checkNetworkDifference: 現在のネットワークID: ${currentNetworkId}`);

    let network1 = null;

    const currentPrevClusterId = network.querySelector('prevClusterId')?.textContent || '';
    const currentNextClusterId = network.querySelector('nextClusterId')?.textContent || '';
    const currentPrevSheetNo = network.querySelector('prevSheetNo')?.textContent || '';
    const currentNextSheetNo = network.querySelector('nextSheetNo')?.textContent || '';

    if (currentNetworkId) {
        for (let i = 0; i < networks1.length; i++) {
            const net1 = networks1[i];
            const net1Id = net1.querySelector('id')?.textContent;
            if (net1Id === currentNetworkId) {
                network1 = net1;
                break;
            }
        }

        if (!network1) {
            console.log(`checkNetworkDifference: 基準XMLにネットワークID ${currentNetworkId} が存在しない - 差分あり`);
            return true;
        }
    } else {
        const currentSheetNumber = currentSheetIndex + 1;

        for (let i = 0; i < networks1.length; i++) {
            const net1 = networks1[i];
            const net1PrevClusterId = net1.querySelector('prevClusterId')?.textContent || '';
            const net1NextClusterId = net1.querySelector('nextClusterId')?.textContent || '';
            const net1PrevSheetNo = net1.querySelector('prevSheetNo')?.textContent || '';
            const net1NextSheetNo = net1.querySelector('nextSheetNo')?.textContent || '';

            const clusterMatch = (net1PrevClusterId === currentPrevClusterId && net1NextClusterId === currentNextClusterId);
            const sheetMatch = (!net1PrevSheetNo && !net1NextSheetNo && !currentPrevSheetNo && !currentNextSheetNo) ||
                (net1PrevSheetNo && parseInt(net1PrevSheetNo) === currentSheetNumber) ||
                (net1NextSheetNo && parseInt(net1NextSheetNo) === currentSheetNumber) ||
                (currentPrevSheetNo && parseInt(currentPrevSheetNo) === currentSheetNumber) ||
                (currentNextSheetNo && parseInt(currentNextSheetNo) === currentSheetNumber);

            if (clusterMatch && sheetMatch) {
                network1 = net1;
                break;
            }
        }

        if (!network1) {
            console.log('checkNetworkDifference: 基準XMLにマッチするネットワークが見つからない - 差分あり');
            return true;
        }

        console.log('checkNetworkDifference: prevClusterId/nextClusterIdベースで比較');
    }

    const network2 = network;

    const prevSheetNo1 = network1.querySelector('prevSheetNo')?.textContent || '';
    const prevSheetNo2 = network2.querySelector('prevSheetNo')?.textContent || '';
    const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent || '';
    const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent || '';
    const nextSheetNo1 = network1.querySelector('nextSheetNo')?.textContent || '';
    const nextSheetNo2 = network2.querySelector('nextSheetNo')?.textContent || '';
    const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent || '';
    const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent || '';
    const skip1 = network1.querySelector('skip')?.textContent || '';
    const skip2 = network2.querySelector('skip')?.textContent || '';
    const condition1 = network1.querySelector('condition')?.textContent || '';
    const condition2 = network2.querySelector('condition')?.textContent || '';
    const nextAutoInputStart1 = network1.querySelector('nextAutoInputStart')?.textContent || '';
    const nextAutoInputStart2 = network2.querySelector('nextAutoInputStart')?.textContent || '';
    const nextAutoInput1 = network1.querySelector('nextAutoInput')?.textContent || '';
    const nextAutoInput2 = network2.querySelector('nextAutoInput')?.textContent || '';
    const nextAutoInputEdit1 = network1.querySelector('nextAutoInputEdit')?.textContent || '';
    const nextAutoInputEdit2 = network2.querySelector('nextAutoInputEdit')?.textContent || '';
    const noNeedToFillOut1 = network1.querySelector('noNeedToFillOut')?.textContent || '';
    const noNeedToFillOut2 = network2.querySelector('noNeedToFillOut')?.textContent || '';

    const valueLinks1 = network1.querySelectorAll('valueLinks valueLink');
    const valueLinks2 = network2.querySelectorAll('valueLinks valueLink');

    const prevSheetDiff = prevSheetNo1 !== prevSheetNo2;
    const prevClusterDiff = prevClusterId1 !== prevClusterId2;
    const nextSheetDiff = nextSheetNo1 !== nextSheetNo2;
    const nextClusterDiff = nextClusterId1 !== nextClusterId2;
    const skipDiff = skip1 !== skip2;
    const conditionDiff = condition1 !== condition2;
    const nextAutoInputStartDiff = nextAutoInputStart1 !== nextAutoInputStart2;
    const nextAutoInputDiff = nextAutoInput1 !== nextAutoInput2;
    const nextAutoInputEditDiff = nextAutoInputEdit1 !== nextAutoInputEdit2;
    const noNeedToFillOutDiff = noNeedToFillOut1 !== noNeedToFillOut2;
    const valueLinksDiff = valueLinks1.length !== valueLinks2.length;

    const hasDifference = prevSheetDiff || prevClusterDiff || nextSheetDiff || nextClusterDiff ||
        skipDiff || conditionDiff || nextAutoInputStartDiff || nextAutoInputDiff ||
        nextAutoInputEditDiff || noNeedToFillOutDiff || valueLinksDiff;

    console.log(`checkNetworkDifference: ネットワーク${currentNetworkId ? 'ID ' + currentNetworkId : 'index ' + index} - 差分判定結果:`, {
        networkId: currentNetworkId || `index_${index}`,
        prevClusterId: { ref: prevClusterId1, up: prevClusterId2, diff: prevClusterDiff },
        nextClusterId: { ref: nextClusterId1, up: nextClusterId2, diff: nextClusterDiff },
        skip: { ref: skip1, up: skip2, diff: skipDiff },
        condition: { ref: condition1, up: condition2, diff: conditionDiff },
        valueLinks: { ref: valueLinks1.length, up: valueLinks2.length, diff: valueLinksDiff },
        hasDifference: hasDifference
    });

    if (valueLinks1.length === valueLinks2.length && valueLinks1.length > 0) {
        for (let i = 0; i < valueLinks1.length; i++) {
            const valueLink1 = valueLinks1[i];
            const valueLink2 = valueLinks2[i];
            if (valueLink2) {
                const parentValue1 = valueLink1.querySelector('parentValue')?.textContent || '';
                const parentValue2 = valueLink2.querySelector('parentValue')?.textContent || '';
                const selectValues1 = valueLink1.querySelector('selectValues')?.textContent || '';
                const selectValues2 = valueLink2.querySelector('selectValues')?.textContent || '';
                const childValue1 = valueLink1.querySelector('childValue')?.textContent || '';
                const childValue2 = valueLink2.querySelector('childValue')?.textContent || '';

                if (parentValue1 !== parentValue2 || selectValues1 !== selectValues2 || childValue1 !== childValue2) {
                    console.log(`checkNetworkDifference: バリューリンク${i}の差分 - parentValue: ${parentValue1} vs ${parentValue2}, selectValues: ${selectValues1} vs ${selectValues2}, childValue: ${childValue1} vs ${childValue2}`);
                    return true;
                }
            }
        }
    }

    return hasDifference;
}

export function formatSkip(skip) {
    if (!skip || skip === '' || skip === '0' || skip === 'false') return 'しない';
    if (skip === '1' || skip === 'true') return 'する';
    const skipNum = parseInt(skip);
    if (!isNaN(skipNum) && skipNum > 0) return 'する';
    return skip || 'しない';
}

/** 後続クラスターの自動入力開始位置を「する／しない」で表示 */
export function formatNextAutoInputStart(val) {
    if (val === undefined || val === null || val === '' || val === '0' || String(val).toLowerCase() === 'false') return 'しない';
    if (val === '1' || String(val).toLowerCase() === 'true') return 'する';
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) return 'する';
    return 'しない';
}

export function formatCondition(condition) {
    if (!condition || condition === '') return '制限なし';
    if (condition.toLowerCase().includes('warning') || condition.toLowerCase().includes('警告')) return '警告表示';
    if (condition.toLowerCase().includes('disable') || condition.toLowerCase().includes('不可')) return '入力不可';
    return condition;
}

export function getNetworkDifferenceDetails(network, index, context = {}) {
    const { xmlData1, xmlData2, currentSheetIndex = 0 } = context;

    if (!xmlData1 || !xmlData2) {
        const prevClusterId = network.querySelector('prevClusterId')?.textContent || '';
        const nextClusterId = network.querySelector('nextClusterId')?.textContent || '';
        const skip = network.querySelector('skip')?.textContent || '';
        const condition = network.querySelector('condition')?.textContent || '';

        let prevClusterName = '';
        let nextClusterName = '';
        if (xmlData2) {
            const parser = new DOMParser();
            const doc2 = parser.parseFromString(xmlData2, 'text/xml');
            const getClusterName = (doc, clusterId) => {
                if (!clusterId) return '';
                const clusterIndex = parseInt(clusterId);
                if (isNaN(clusterIndex)) return '';
                const sheets = doc.querySelectorAll('sheets sheet');
                if (sheets.length === 0) return '';
                const sheet = sheets[currentSheetIndex];
                const clusters = sheet.querySelectorAll('clusters cluster');
                if (clusterIndex >= 0 && clusterIndex < clusters.length) {
                    const cluster = clusters[clusterIndex];
                    return cluster.querySelector('displayName')?.textContent ||
                        cluster.querySelector('label')?.textContent ||
                        cluster.querySelector('clusterName')?.textContent ||
                        cluster.querySelector('name')?.textContent || '';
                }
                return '';
            };
            prevClusterName = getClusterName(doc2, prevClusterId);
            nextClusterName = getClusterName(doc2, nextClusterId);
        }

        return {
            index: index,
            prevClusterId: prevClusterId,
            prevClusterName: prevClusterName,
            nextClusterId: nextClusterId,
            nextClusterName: nextClusterName,
            skip: skip,
            skipFormatted: formatSkip(skip),
            condition: condition,
            conditionFormatted: formatCondition(condition),
            valueLinksCount: network.querySelectorAll('valueLinks valueLink').length
        };
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const networks1 = doc1.querySelectorAll('networks network');
    const networks2 = doc2.querySelectorAll('networks network');

    const currentNetworkId = network.querySelector('id')?.textContent;

    let network1 = null;

    if (currentNetworkId) {
        for (let i = 0; i < networks1.length; i++) {
            const net1 = networks1[i];
            const net1Id = net1.querySelector('id')?.textContent;
            if (net1Id === currentNetworkId) {
                network1 = net1;
                break;
            }
        }

        if (!network1) {
            const prevClusterId2 = network.querySelector('prevClusterId')?.textContent || '';
            const nextClusterId2 = network.querySelector('nextClusterId')?.textContent || '';
            const skip2 = network.querySelector('skip')?.textContent || '';
            const condition2 = network.querySelector('condition')?.textContent || '';

            const getClusterName = (doc, clusterId) => {
                if (!clusterId) return '';
                const clusterIndex = parseInt(clusterId);
                if (isNaN(clusterIndex)) return '';
                const sheets = doc.querySelectorAll('sheets sheet');
                if (sheets.length === 0) return '';
                const sheet = sheets[currentSheetIndex];
                const clusters = sheet.querySelectorAll('clusters cluster');
                if (clusterIndex >= 0 && clusterIndex < clusters.length) {
                    const cluster = clusters[clusterIndex];
                    return cluster.querySelector('displayName')?.textContent ||
                        cluster.querySelector('label')?.textContent ||
                        cluster.querySelector('clusterName')?.textContent ||
                        cluster.querySelector('name')?.textContent || '';
                }
                return '';
            };

            const prevClusterName2 = getClusterName(doc2, prevClusterId2);
            const nextClusterName2 = getClusterName(doc2, nextClusterId2);

            return {
                index: index,
                networkId: currentNetworkId,
                prevClusterId: prevClusterId2,
                prevClusterName: prevClusterName2,
                nextClusterId: nextClusterId2,
                nextClusterName: nextClusterName2,
                skip: skip2,
                skipFormatted: formatSkip(skip2),
                condition: condition2,
                conditionFormatted: formatCondition(condition2),
                valueLinksCount: network.querySelectorAll('valueLinks valueLink').length,
                differences: [`ネットワークID ${currentNetworkId}: 基準XMLに存在しない`],
                hasDifferences: true,
                ref_prevClusterId: '存在しない',
                ref_prevClusterName: '',
                ref_nextClusterId: '存在しない',
                ref_nextClusterName: '',
                ref_skip: '存在しない',
                ref_skipFormatted: '存在しない',
                ref_condition: '存在しない',
                ref_conditionFormatted: '存在しない',
                ref_valueLinksCount: 0
            };
        }
    } else {
        if (index >= networks1.length) {
            const prevClusterId2 = network.querySelector('prevClusterId')?.textContent || '';
            const nextClusterId2 = network.querySelector('nextClusterId')?.textContent || '';
            const skip2 = network.querySelector('skip')?.textContent || '';
            const condition2 = network.querySelector('condition')?.textContent || '';

            const getClusterName = (doc, clusterId) => {
                if (!clusterId) return '';
                const clusterIndex = parseInt(clusterId);
                if (isNaN(clusterIndex)) return '';
                const sheets = doc.querySelectorAll('sheets sheet');
                if (sheets.length === 0) return '';
                const sheet = sheets[currentSheetIndex];
                const clusters = sheet.querySelectorAll('clusters cluster');
                if (clusterIndex >= 0 && clusterIndex < clusters.length) {
                    const cluster = clusters[clusterIndex];
                    return cluster.querySelector('displayName')?.textContent ||
                        cluster.querySelector('label')?.textContent ||
                        cluster.querySelector('clusterName')?.textContent ||
                        cluster.querySelector('name')?.textContent || '';
                }
                return '';
            };

            const prevClusterName2 = getClusterName(doc2, prevClusterId2);
            const nextClusterName2 = getClusterName(doc2, nextClusterId2);

            return {
                index: index,
                networkId: `index_${index}`,
                prevClusterId: prevClusterId2,
                prevClusterName: prevClusterName2,
                nextClusterId: nextClusterId2,
                nextClusterName: nextClusterName2,
                skip: skip2,
                skipFormatted: formatSkip(skip2),
                condition: condition2,
                conditionFormatted: formatCondition(condition2),
                valueLinksCount: network.querySelectorAll('valueLinks valueLink').length,
                differences: [`ネットワークindex ${index}: 基準XMLに存在しない`],
                hasDifferences: true,
                ref_prevClusterId: '存在しない',
                ref_prevClusterName: '',
                ref_nextClusterId: '存在しない',
                ref_nextClusterName: '',
                ref_skip: '存在しない',
                ref_skipFormatted: '存在しない',
                ref_condition: '存在しない',
                ref_conditionFormatted: '存在しない',
                ref_valueLinksCount: 0
            };
        }
        network1 = networks1[index];
    }

    const network2 = network;

    const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent || '';
    const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent || '';
    const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent || '';
    const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent || '';
    const skip1 = network1.querySelector('skip')?.textContent || '';
    const skip2 = network2.querySelector('skip')?.textContent || '';
    const condition1 = network1.querySelector('condition')?.textContent || '';
    const condition2 = network2.querySelector('condition')?.textContent || '';
    const nextAutoInputStart1 = network1.querySelector('nextAutoInputStart')?.textContent || '';
    const nextAutoInputStart2 = network2.querySelector('nextAutoInputStart')?.textContent || '';
    const nextAutoInput1 = network1.querySelector('nextAutoInput')?.textContent || '';
    const nextAutoInput2 = network2.querySelector('nextAutoInput')?.textContent || '';
    const nextAutoInputEdit1 = network1.querySelector('nextAutoInputEdit')?.textContent || '';
    const nextAutoInputEdit2 = network2.querySelector('nextAutoInputEdit')?.textContent || '';
    const noNeedToFillOut1 = network1.querySelector('noNeedToFillOut')?.textContent || '';
    const noNeedToFillOut2 = network2.querySelector('noNeedToFillOut')?.textContent || '';

    const getClusterName = (doc, clusterId) => {
        if (!clusterId) return '';
        const clusterIndex = parseInt(clusterId);
        if (isNaN(clusterIndex)) return '';

        const sheets = doc.querySelectorAll('sheets sheet');
        if (sheets.length === 0) return '';
        const sheet = sheets[currentSheetIndex];
        const clusters = sheet.querySelectorAll('clusters cluster');

        if (clusterIndex >= 0 && clusterIndex < clusters.length) {
            const cluster = clusters[clusterIndex];
            return cluster.querySelector('displayName')?.textContent ||
                cluster.querySelector('label')?.textContent ||
                cluster.querySelector('clusterName')?.textContent ||
                cluster.querySelector('name')?.textContent || '';
        }
        return '';
    };

    const prevClusterName1 = getClusterName(doc1, prevClusterId1);
    const prevClusterName2 = getClusterName(doc2, prevClusterId2);
    const nextClusterName1 = getClusterName(doc1, nextClusterId1);
    const nextClusterName2 = getClusterName(doc2, nextClusterId2);

    const valueLinks1 = network1.querySelectorAll('valueLinks valueLink');
    const valueLinks2 = network2.querySelectorAll('valueLinks valueLink');

    const differences = [];

    if (prevClusterId1 !== prevClusterId2) {
        differences.push(`先行クラスターID: ${prevClusterId1 || '未設定'} → ${prevClusterId2 || '未設定'}`);
    }

    if (nextClusterId1 !== nextClusterId2) {
        differences.push(`後続クラスターID: ${nextClusterId1 || '未設定'} → ${nextClusterId2 || '未設定'}`);
    }

    if (skip1 !== skip2) {
        differences.push(`後続クラスターへの自動表示追加: ${formatSkip(skip1)} → ${formatSkip(skip2)}`);
    }

    if (condition1 !== condition2) {
        differences.push(`入力制限: ${formatCondition(condition1)} → ${formatCondition(condition2)}`);
    }

    if (valueLinks1.length !== valueLinks2.length) {
        differences.push(`バリューリンク数: ${valueLinks1.length} → ${valueLinks2.length}`);
    }

    if (valueLinks1.length === valueLinks2.length && valueLinks1.length > 0) {
        for (let i = 0; i < valueLinks1.length; i++) {
            const valueLink1 = valueLinks1[i];
            const valueLink2 = valueLinks2[i];
            if (valueLink2) {
                const parentValue1 = valueLink1.querySelector('parentValue')?.textContent || '';
                const parentValue2 = valueLink2.querySelector('parentValue')?.textContent || '';
                const selectValues1 = valueLink1.querySelector('selectValues')?.textContent || '';
                const selectValues2 = valueLink2.querySelector('selectValues')?.textContent || '';
                const childValue1 = valueLink1.querySelector('childValue')?.textContent || '';
                const childValue2 = valueLink2.querySelector('childValue')?.textContent || '';

                if (parentValue1 !== parentValue2 || selectValues1 !== selectValues2 || childValue1 !== childValue2) {
                    differences.push(`バリューリンク${i + 1}: 内容が異なります`);
                }
            }
        }
    }

    if (nextAutoInputStart1 !== nextAutoInputStart2) {
        differences.push(`後続クラスターの自動入力開始位置: ${formatNextAutoInputStart(nextAutoInputStart1)} → ${formatNextAutoInputStart(nextAutoInputStart2)}`);
    }

    if (nextAutoInput1 !== nextAutoInput2) {
        differences.push(`後続クラスターの自動入力: ${nextAutoInput1 || '未設定'} → ${nextAutoInput2 || '未設定'}`);
    }

    if (nextAutoInputEdit1 !== nextAutoInputEdit2) {
        differences.push(`後続クラスターの自動入力編集: ${nextAutoInputEdit1 || '未設定'} → ${nextAutoInputEdit2 || '未設定'}`);
    }

    if (noNeedToFillOut1 !== noNeedToFillOut2) {
        const noNeed1 = noNeedToFillOut1 === '1' ? '必須入力なし' : '必須入力あり';
        const noNeed2 = noNeedToFillOut2 === '1' ? '必須入力なし' : '必須入力あり';
        differences.push(`必須入力設定: ${noNeed1} → ${noNeed2}`);
    }

    return {
        index: index,
        networkId: currentNetworkId || `index_${index}`,
        prevClusterId: prevClusterId2,
        prevClusterName: prevClusterName2,
        nextClusterId: nextClusterId2,
        nextClusterName: nextClusterName2,
        skip: skip2,
        skipFormatted: formatSkip(skip2),
        condition: condition2,
        conditionFormatted: formatCondition(condition2),
        valueLinksCount: valueLinks2.length,
        differences: differences,
        hasDifferences: differences.length > 0,
        ref_prevClusterId: prevClusterId1,
        ref_prevClusterName: prevClusterName1,
        ref_nextClusterId: nextClusterId1,
        ref_nextClusterName: nextClusterName1,
        ref_skip: skip1,
        ref_skipFormatted: formatSkip(skip1),
        ref_condition: condition1,
        ref_conditionFormatted: formatCondition(condition1),
        ref_valueLinksCount: valueLinks1.length,
        ref_nextAutoInputStart: nextAutoInputStart1,
        ref_nextAutoInput: nextAutoInput1,
        ref_nextAutoInputEdit: nextAutoInputEdit1,
        ref_noNeedToFillOut: noNeedToFillOut1,
        nextAutoInputStart: nextAutoInputStart2,
        nextAutoInput: nextAutoInput2,
        nextAutoInputEdit: nextAutoInputEdit2,
        noNeedToFillOut: noNeedToFillOut2
    };
}

export function getNetworkPositionDifference(network, index, context = {}) {
    const { xmlData1, xmlData2 } = context;

    if (!xmlData1 || !xmlData2) {
        return {
            hasDifferences: false,
            differences: [],
            position: { x: 0, y: 0 },
            ref_position: { x: 0, y: 0 }
        };
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const networks1 = doc1.querySelectorAll('networks network');
    const networks2 = doc2.querySelectorAll('networks network');

    const currentNetworkId = network.querySelector('id')?.textContent;
    let network1 = null;

    if (currentNetworkId) {
        for (let i = 0; i < networks1.length; i++) {
            const net1 = networks1[i];
            const net1Id = net1.querySelector('id')?.textContent;
            if (net1Id === currentNetworkId) {
                network1 = net1;
                break;
            }
        }
    } else {
        if (index < networks1.length) {
            network1 = networks1[index];
        }
    }

    if (!network1) {
        return {
            hasDifferences: true,
            differences: ['基準XMLにネットワークが存在しない'],
            position: { x: 0, y: 0 },
            ref_position: { x: 0, y: 0 }
        };
    }

    const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent;
    const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent;
    const prevClusterId2 = network.querySelector('prevClusterId')?.textContent;
    const nextClusterId2 = network.querySelector('nextClusterId')?.textContent;

    const sheets1 = doc1.querySelectorAll('sheets sheet');
    const sheets2 = doc2.querySelectorAll('sheets sheet');

    let pos1 = { x: 0, y: 0 };
    let pos2 = { x: 0, y: 0 };

    if (prevClusterId1 && nextClusterId1) {
        const prevCluster1 = findClusterById(sheets1, prevClusterId1);
        const nextCluster1 = findClusterById(sheets1, nextClusterId1);
        if (prevCluster1 && nextCluster1) {
            pos1 = calculateNetworkPosition(prevCluster1, nextCluster1);
        }
    }

    if (prevClusterId2 && nextClusterId2) {
        const prevCluster2 = findClusterById(sheets2, prevClusterId2);
        const nextCluster2 = findClusterById(sheets2, nextClusterId2);
        if (prevCluster2 && nextCluster2) {
            pos2 = calculateNetworkPosition(prevCluster2, nextCluster2);
        }
    }

    const differences = [];
    if (Math.abs(pos1.x - pos2.x) > 5) {
        differences.push(`X座標: ${pos1.x.toFixed(1)} → ${pos2.x.toFixed(1)}`);
    }
    if (Math.abs(pos1.y - pos2.y) > 5) {
        differences.push(`Y座標: ${pos1.y.toFixed(1)} → ${pos2.y.toFixed(1)}`);
    }

    return {
        hasDifferences: differences.length > 0,
        differences: differences,
        position: pos2,
        ref_position: pos1
    };
}

export function getNetworkRestrictionDifference(network, index, context = {}) {
    const { xmlData1, xmlData2 } = context;

    if (!xmlData1 || !xmlData2) {
        return {
            hasDifferences: false,
            differences: [],
            restrictions: {},
            ref_restrictions: {}
        };
    }

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(xmlData1, 'text/xml');
    const doc2 = parser.parseFromString(xmlData2, 'text/xml');

    const networks1 = doc1.querySelectorAll('networks network');
    const networks2 = doc2.querySelectorAll('networks network');

    const currentNetworkId = network.querySelector('id')?.textContent;
    let network1 = null;

    if (currentNetworkId) {
        for (let i = 0; i < networks1.length; i++) {
            const net1 = networks1[i];
            const net1Id = net1.querySelector('id')?.textContent;
            if (net1Id === currentNetworkId) {
                network1 = net1;
                break;
            }
        }
    } else {
        if (index < networks1.length) {
            network1 = networks1[index];
        }
    }

    if (!network1) {
        return {
            hasDifferences: true,
            differences: ['基準XMLにネットワークが存在しない'],
            restrictions: {},
            ref_restrictions: {}
        };
    }

    const restrictions1 = {
        skip: network1.querySelector('skip')?.textContent || '',
        condition: network1.querySelector('condition')?.textContent || '',
        maxCount: network1.querySelector('maxCount')?.textContent || '',
        minCount: network1.querySelector('minCount')?.textContent || '',
        timeout: network1.querySelector('timeout')?.textContent || '',
        retryCount: network1.querySelector('retryCount')?.textContent || ''
    };

    const restrictions2 = {
        skip: network.querySelector('skip')?.textContent || '',
        condition: network.querySelector('condition')?.textContent || '',
        maxCount: network.querySelector('maxCount')?.textContent || '',
        minCount: network.querySelector('minCount')?.textContent || '',
        timeout: network.querySelector('timeout')?.textContent || '',
        retryCount: network.querySelector('timeout')?.textContent || ''
    };

    const differences = [];
    Object.keys(restrictions1).forEach(key => {
        if (restrictions1[key] !== restrictions2[key]) {
            let refValue = restrictions1[key] || '未設定';
            let compValue = restrictions2[key] || '未設定';

            if (key === 'skip') {
                refValue = formatSkip(restrictions1[key]);
                compValue = formatSkip(restrictions2[key]);
                differences.push(`skip: ${refValue} → ${compValue}`);
            } else {
                differences.push(`${key}: ${refValue} → ${compValue}`);
            }
        }
    });

    return {
        hasDifferences: differences.length > 0,
        differences: differences,
        restrictions: restrictions2,
        ref_restrictions: restrictions1
    };
}

function findClusterById(sheets, clusterId) {
    for (const sheet of sheets) {
        const clusters = sheet.querySelectorAll('clusters cluster');
        for (const cluster of clusters) {
            const id = cluster.querySelector('id')?.textContent;
            if (id === clusterId) {
                return cluster;
            }
        }
    }
    return null;
}

function calculateNetworkPosition(prevCluster, nextCluster) {
    const prevTop = parseFloat(prevCluster.querySelector('top')?.textContent || '0');
    const prevLeft = parseFloat(prevCluster.querySelector('left')?.textContent || '0');
    const prevRight = parseFloat(prevCluster.querySelector('right')?.textContent || '0');
    const prevBottom = parseFloat(prevCluster.querySelector('bottom')?.textContent || '0');

    const nextTop = parseFloat(nextCluster.querySelector('top')?.textContent || '0');
    const nextLeft = parseFloat(nextCluster.querySelector('left')?.textContent || '0');
    const nextRight = parseFloat(nextCluster.querySelector('right')?.textContent || '0');
    const nextBottom = parseFloat(nextCluster.querySelector('bottom')?.textContent || '0');

    const prevCenterX = (prevLeft + prevRight) / 2;
    const prevCenterY = (prevTop + prevBottom) / 2;
    const nextCenterX = (nextLeft + nextRight) / 2;
    const nextCenterY = (nextTop + nextBottom) / 2;

    return {
        x: (prevCenterX + nextCenterX) / 2,
        y: (prevCenterY + nextCenterY) / 2
    };
}
