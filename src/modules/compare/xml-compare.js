import { getClusterTypeJapanese, extractParameter } from './cluster-diff.js';

export function performXmlComparison(xml1, xml2, context = {}) {
    const { file1, file2 } = context;

    try {
        // 同じファイルの場合は完全一致として扱う
        if (xml1 === xml2) {
            console.log('同じファイルが比較されました。完全一致として処理します。');
            return {
                differences: [],
                matches: ['同じファイルのため完全一致'],
                summary: {
                    totalDifferences: 0,
                    totalMatches: 1,
                    totalComparisons: 1
                },
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
        }

        // ファイル名が同じ場合も完全一致として扱う
        if (file1 && file2 && file1.name === file2.name) {
            console.log('同じファイル名が比較されました。完全一致として処理します。');
            return {
                differences: [],
                matches: ['同じファイル名のため完全一致'],
                summary: {
                    totalDifferences: 0,
                    totalMatches: 1,
                    totalComparisons: 1
                },
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
        }

        const parser = new DOMParser();
        const doc1 = parser.parseFromString(xml1, 'text/xml');
        const doc2 = parser.parseFromString(xml2, 'text/xml');

        // XML解析エラーの確認
        const parserError1 = doc1.querySelector('parsererror');
        const parserError2 = doc2.querySelector('parsererror');
        
        if (parserError1) {
            throw new Error(`基準XMLの解析エラー: ${parserError1.textContent}`);
        }
        if (parserError2) {
            throw new Error(`比較XMLの解析エラー: ${parserError2.textContent}`);
        }

        const result = {
            differences: [],
            matches: [],
            summary: {
                totalDifferences: 0,
                totalMatches: 0,
                totalComparisons: 0
            },
            structure: {
                sheets: { ref: 0, up: 0, match: false },
                clusters: { ref: 0, up: 0, match: false },
                actions: { ref: 0, up: 0, match: false },
                dates: { ref: 0, up: 0, match: false },
                numerics: { ref: 0, up: 0, match: false },
                calculates: { ref: 0, up: 0, match: false },
                networks: { ref: 0, up: 0, match: false },
                valueLinks: { ref: 0, up: 0, match: false },
                customMasters: { ref: 0, up: 0, match: false },
                multipleChoices: { ref: 0, up: 0, match: false },
                selectMasters: { ref: 0, up: 0, match: false }
            }
        };

        // 基本構造の比較
        compareBasicStructure(doc1, doc2, result);
        
        // クラスター種別の詳細比較
        if (document.getElementById('cluster_type_detail')?.checked) {
            compareClusterTypes(doc1, doc2, result);
        }

        // ネットワーク・バリューリンク・カスタムマスターの比較
        if (document.getElementById('network_value_compare')?.checked) {
            compareNetworksAndValueLinks(doc1, doc2, result);
        }

        // 選択肢設定の比較
        if (document.getElementById('choice_settings_compare')?.checked) {
            compareChoiceSettings(doc1, doc2, result);
        }

        // カーボンコピーの比較
        if (document.getElementById('carbon_existence')?.checked || 
            document.getElementById('carbon_target')?.checked || 
            document.getElementById('carbon_edit')?.checked) {
            compareCarbonCopy(doc1, doc2, result);
        }

        // 帳票コピーの比較
        if (document.getElementById('report_display')?.checked || 
            document.getElementById('report_clear')?.checked) {
            compareReportCopy(doc1, doc2, result);
        }

        // 分割コピーの比較
        compareDividedCopy(doc1, doc2, result);

        // ユーザーカスタムマスターの比較
        compareUserCustomMaster(doc1, doc2, result);

        // 入力パラメータの詳細比較
        if (document.getElementById('show_parameters')?.checked) {
            compareInputParameters(doc1, doc2, result);
        }

        return result;
    } catch (error) {
        console.error('performXmlComparison エラー:', error);
        console.error('XML1の長さ:', xml1?.length);
        console.error('XML2の長さ:', xml2?.length);
        throw error; // エラーを上位に伝播
    }
}

function compareBasicStructure(doc1, doc2, result) {
    try {
        // シート数の比較
        const sheets1 = doc1.querySelectorAll('sheets sheet');
        const sheets2 = doc2.querySelectorAll('sheets sheet');
        result.structure.sheets.ref = sheets1.length;
        result.structure.sheets.up = sheets2.length;
        result.structure.sheets.match = sheets1.length === sheets2.length;

        // クラスター数の比較
        const clusters1 = doc1.querySelectorAll('clusters cluster');
        const clusters2 = doc2.querySelectorAll('clusters cluster');
        result.structure.clusters.ref = clusters1.length;
        result.structure.clusters.up = clusters2.length;
        result.structure.clusters.match = clusters1.length === clusters2.length;

        // アクションクラスター数の比較
        const actions1 = doc1.querySelectorAll('clusters cluster inputParameters');
        const actions2 = doc2.querySelectorAll('clusters cluster inputParameters');
        result.structure.actions.ref = actions1.length;
        result.structure.actions.up = actions2.length;
        result.structure.actions.match = actions1.length === actions2.length;
        
        console.log('基本構造比較完了:', {
            sheets: { ref: sheets1.length, up: sheets2.length },
            clusters: { ref: clusters1.length, up: clusters2.length },
            actions: { ref: actions1.length, up: actions2.length }
        });
    } catch (error) {
        console.error('compareBasicStructure エラー:', error);
        throw new Error(`基本構造比較でエラーが発生: ${error.message}`);
    }
}

function compareClusterTypes(doc1, doc2, result) {
    // 日付クラスターの比較
    const dateClusters1 = Array.from(doc1.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'Date' || 
        cl.querySelector('type')?.textContent === 'CalendarDate'
    );
    const dateClusters2 = Array.from(doc2.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'Date' || 
        cl.querySelector('type')?.textContent === 'CalendarDate'
    );
    
    result.structure.dates.ref = dateClusters1.length;
    result.structure.dates.up = dateClusters2.length;
    result.structure.dates.match = dateClusters1.length === dateClusters2.length;

    // 数値入力クラスターの比較
    const numericClusters1 = Array.from(doc1.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'InputNumeric'
    );
    const numericClusters2 = Array.from(doc2.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'InputNumeric'
    );
    
    result.structure.numerics.ref = numericClusters1.length;
    result.structure.numerics.up = numericClusters2.length;
    result.structure.numerics.match = numericClusters1.length === numericClusters2.length;

    // 計算クラスターの比較
    const calculateClusters1 = Array.from(doc1.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'Calculate'
    );
    const calculateClusters2 = Array.from(doc2.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'Calculate'
    );
    
    result.structure.calculates.ref = calculateClusters1.length;
    result.structure.calculates.up = calculateClusters2.length;
    result.structure.calculates.match = calculateClusters1.length === calculateClusters2.length;

    // 詳細比較
    if (document.getElementById('date_calendar_compare').checked) {
        compareDateClusters(dateClusters1, dateClusters2, result);
    }
    
    if (document.getElementById('numeric_calculate_compare').checked) {
        compareNumericClusters(numericClusters1, numericClusters2, result);
        compareCalculateClusters(calculateClusters1, calculateClusters2, result);
    }
}

function compareDateClusters(clusters1, clusters2, result) {
    const maxLength = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) {
            result.differences.push(`日付クラスター${i + 1}: 存在しないクラスターがあります`);
            continue;
        }

        const type1 = cluster1.querySelector('type')?.textContent || '';
        const type2 = cluster2.querySelector('type')?.textContent || '';
        
        if (type1 !== type2) {
            result.differences.push(`日付クラスター${i + 1}: 種別が異なります (${getClusterTypeJapanese(type1)} vs ${getClusterTypeJapanese(type2)})`);
        }

        // 日付固有の設定を比較
        const name1 = cluster1.querySelector('name')?.textContent || '';
        const name2 = cluster2.querySelector('name')?.textContent || '';
        
        if (name1 !== name2) {
            result.differences.push(`日付クラスター${i + 1}: 名前が異なります (${name1} vs ${name2})`);
        }
    }
}

function compareNumericClusters(clusters1, clusters2, result) {
    const maxLength = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) {
            result.differences.push(`数値入力クラスター${i + 1}: 存在しないクラスターがあります`);
            continue;
        }

        const name1 = cluster1.querySelector('name')?.textContent || '';
        const name2 = cluster2.querySelector('name')?.textContent || '';
        
        if (name1 !== name2) {
            result.differences.push(`数値入力クラスター${i + 1}: 名前が異なります (${name1} vs ${name2})`);
        }
    }
}

function compareCalculateClusters(clusters1, clusters2, result) {
    const maxLength = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) {
            result.differences.push(`計算クラスター${i + 1}: 存在しないクラスターがあります`);
            continue;
        }

        const name1 = cluster1.querySelector('name')?.textContent || '';
        const name2 = cluster2.querySelector('name')?.textContent || '';
        
        if (name1 !== name2) {
            result.differences.push(`計算クラスター${i + 1}: 名前が異なります (${name1} vs ${name2})`);
        }

        // 計算関数の比較
        const function1 = cluster1.querySelector('function')?.textContent || '';
        const function2 = cluster2.querySelector('function')?.textContent || '';
        
        if (function1 !== function2) {
            result.differences.push(`計算クラスター${i + 1}: 計算関数が異なります (${function1} vs ${function2})`);
        }
    }
}

function compareNetworksAndValueLinks(doc1, doc2, result) {
    // ネットワーク設定の比較
    const networks1 = doc1.querySelectorAll('networks network');
    const networks2 = doc2.querySelectorAll('networks network');
    
    result.structure.networks.ref = networks1.length;
    result.structure.networks.up = networks2.length;
    result.structure.networks.match = networks1.length === networks2.length;
    
    // ネットワーク設定の詳細比較
    const maxNetworks = Math.max(networks1.length, networks2.length);
    for (let i = 0; i < maxNetworks; i++) {
        const network1 = networks1[i];
        const network2 = networks2[i];
        
        if (!network1 || !network2) {
            // ネットワークの存在自体が異なる
            const networkId = network1 ? network1.querySelector('id')?.textContent : network2.querySelector('id')?.textContent;
            result.differences.push({
                type: 'network',
                category: 'network_existence',
                description: `ネットワーク${networkId || i + 1}: 存在が異なります`,
                details: {
                    ref: network1 ? '存在' : '不存在',
                    up: network2 ? '存在' : '不存在'
                }
            });
            continue;
        }
        
        // ネットワーク設定の詳細比較
        const prevSheetNo1 = network1.querySelector('prevSheetNo')?.textContent;
        const prevSheetNo2 = network2.querySelector('prevSheetNo')?.textContent;
        const prevClusterId1 = network1.querySelector('prevClusterId')?.textContent;
        const prevClusterId2 = network2.querySelector('prevClusterId')?.textContent;
        const nextSheetNo1 = network1.querySelector('nextSheetNo')?.textContent;
        const nextSheetNo2 = network2.querySelector('nextSheetNo')?.textContent;
        const nextClusterId1 = network1.querySelector('nextClusterId')?.textContent;
        const nextClusterId2 = network2.querySelector('nextClusterId')?.textContent;
        const skip1 = network1.querySelector('skip')?.textContent;
        const skip2 = network2.querySelector('skip')?.textContent;
        const condition1 = network1.querySelector('condition')?.textContent;
        const condition2 = network2.querySelector('condition')?.textContent;
        const nextAutoInputStart1 = network1.querySelector('nextAutoInputStart')?.textContent;
        const nextAutoInputStart2 = network2.querySelector('nextAutoInputStart')?.textContent;
        const nextAutoInput1 = network1.querySelector('nextAutoInput')?.textContent;
        const nextAutoInput2 = network2.querySelector('nextAutoInput')?.textContent;
        const nextAutoInputEdit1 = network1.querySelector('nextAutoInputEdit')?.textContent;
        const nextAutoInputEdit2 = network2.querySelector('nextAutoInputEdit')?.textContent;
        const noNeedToFillOut1 = network1.querySelector('noNeedToFillOut')?.textContent;
        const noNeedToFillOut2 = network2.querySelector('noNeedToFillOut')?.textContent;
        
        // 設定パネルのチェックボックスに基づいて比較
        if (document.getElementById('network_sheets')?.checked) {
            if (prevSheetNo1 !== prevSheetNo2) {
                result.differences.push({
                    type: 'network',
                    category: 'prevSheetNo',
                    description: `ネットワーク${i + 1}: 遷移元シートが異なります`,
                    details: {
                        ref: prevSheetNo1 || '未設定',
                        up: prevSheetNo2 || '未設定'
                    }
                });
            }
            
            if (nextSheetNo1 !== nextSheetNo2) {
                result.differences.push({
                    type: 'network',
                    category: 'nextSheetNo',
                    description: `ネットワーク${i + 1}: 遷移先シートが異なります`,
                    details: {
                        ref: nextSheetNo1 || '未設定',
                        up: nextSheetNo2 || '未設定'
                    }
                });
            }
        }
        
        if (document.getElementById('network_clusters')?.checked) {
            if (prevClusterId1 !== prevClusterId2) {
                result.differences.push({
                    type: 'network',
                    category: 'prevClusterId',
                    description: `ネットワーク${i + 1}: 遷移元クラスターIDが異なります`,
                    details: {
                        ref: prevClusterId1 || '未設定',
                        up: prevClusterId2 || '未設定'
                    }
                });
            }
            
            if (nextClusterId1 !== nextClusterId2) {
                result.differences.push({
                    type: 'network',
                    category: 'nextClusterId',
                    description: `ネットワーク${i + 1}: 遷移先クラスターIDが異なります`,
                    details: {
                        ref: nextClusterId1 || '未設定',
                        up: nextClusterId2 || '未設定'
                    }
                });
            }
        }
        
        if (document.getElementById('network_skip')?.checked) {
            if (skip1 !== skip2) {
                result.differences.push({
                    type: 'network',
                    category: 'skip',
                    description: `ネットワーク${i + 1}: スキップ設定が異なります`,
                    details: {
                        ref: skip1 || '未設定',
                        up: skip2 || '未設定'
                    }
                });
            }
        }
        
        if (document.getElementById('network_condition')?.checked) {
            if (condition1 !== condition2) {
                result.differences.push({
                    type: 'network',
                    category: 'condition',
                    description: `ネットワーク${i + 1}: 条件設定が異なります`,
                    details: {
                        ref: condition1 || '未設定',
                        up: condition2 || '未設定'
                    }
                });
            }
        }
        
        // その他のネットワーク設定の比較
        if (nextAutoInputStart1 !== nextAutoInputStart2) {
            result.differences.push({
                type: 'network',
                category: 'nextAutoInputStart',
                description: `ネットワーク${i + 1}: 次自動入力開始が異なります`,
                details: {
                    ref: nextAutoInputStart1 || '未設定',
                    up: nextAutoInputStart2 || '未設定'
                }
            });
        }
        
        if (nextAutoInput1 !== nextAutoInput2) {
            result.differences.push({
                type: 'network',
                category: 'nextAutoInput',
                description: `ネットワーク${i + 1}: 次自動入力が異なります`,
                details: {
                    ref: nextAutoInput1 || '未設定',
                    up: nextAutoInput2 || '未設定'
                }
            });
        }
        
        if (nextAutoInputEdit1 !== nextAutoInputEdit2) {
            result.differences.push({
                type: 'network',
                category: 'nextAutoInputEdit',
                description: `ネットワーク${i + 1}: 次自動入力編集が異なります`,
                details: {
                    ref: nextAutoInputEdit1 || '未設定',
                    up: nextAutoInputEdit2 || '未設定'
                }
            });
        }
        
        if (noNeedToFillOut1 !== noNeedToFillOut2) {
            result.differences.push({
                type: 'network',
                category: 'noNeedToFillOut',
                description: `ネットワーク${i + 1}: 記入不要設定が異なります`,
                details: {
                    ref: noNeedToFillOut1 || '未設定',
                    up: noNeedToFillOut2 || '未設定'
                }
            });
        }
        
        if (skip1 !== skip2) {
            result.differences.push({
                type: 'network',
                category: 'skip',
                description: `ネットワーク${i + 1}: スキップ設定が異なります`,
                details: {
                    ref: skip1 || '未設定',
                    up: skip2 || '未設定'
                }
            });
        }
        
        if (condition1 !== condition2) {
            result.differences.push({
                type: 'network',
                category: 'condition',
                description: `ネットワーク${i + 1}: 条件設定が異なります`,
                details: {
                    ref: condition1 || '未設定',
                    up: condition2 || '未設定'
                }
            });
        }
        
        // バリューリンクの比較
        const valueLinks1 = network1.querySelectorAll('valueLinks valueLink');
        const valueLinks2 = network2.querySelectorAll('valueLinks valueLink');
        
        if (valueLinks1.length !== valueLinks2.length) {
            result.differences.push({
                type: 'network',
                category: 'valueLinks_count',
                description: `ネットワーク${i + 1}: バリューリンク数が異なります`,
                details: {
                    ref: valueLinks1.length,
                    up: valueLinks2.length
                }
            });
        } else {
            // バリューリンクの詳細比較
            valueLinks1.forEach((valueLink1, j) => {
                const valueLink2 = valueLinks2[j];
                if (valueLink2) {
                    const parentValue1 = valueLink1.querySelector('parentValue')?.textContent;
                    const parentValue2 = valueLink2.querySelector('parentValue')?.textContent;
                    const childValue1 = valueLink1.querySelector('childValue')?.textContent;
                    const childValue2 = valueLink2.querySelector('childValue')?.textContent;
                    
                    if (parentValue1 !== parentValue2) {
                        result.differences.push({
                            type: 'valueLink',
                            category: 'parentValue',
                            description: `ネットワーク${i + 1}のバリューリンク${j + 1}: 親値が異なります`,
                            details: {
                                ref: parentValue1 || '未設定',
                                up: parentValue2 || '未設定'
                            }
                        });
                    }
                    
                    if (childValue1 !== childValue2) {
                        result.differences.push({
                            type: 'valueLink',
                            category: 'childValue',
                            description: `ネットワーク${i + 1}のバリューリンク${j + 1}: 子値が異なります`,
                            details: {
                                ref: childValue1 || '未設定',
                                up: childValue2 || '未設定'
                            }
                        });
                    }
                }
            });
        }
    }
    
    // バリューリンクの総数比較
    const valueLinks1 = doc1.querySelectorAll('networks network valueLinks valueLink');
    const valueLinks2 = doc2.querySelectorAll('networks network valueLinks valueLink');
    
    result.structure.valueLinks.ref = valueLinks1.length;
    result.structure.valueLinks.up = valueLinks2.length;
    result.structure.valueLinks.match = valueLinks1.length === valueLinks2.length;
    
    // カスタムマスターの比較
    const customMasters1 = doc1.querySelectorAll('customMasters customMaster');
    const customMasters2 = doc2.querySelectorAll('customMasters customMaster');
    
    result.structure.customMasters.ref = customMasters1.length;
    result.structure.customMasters.up = customMasters2.length;
    result.structure.customMasters.match = customMasters1.length === customMasters2.length;
    
    // カスタムマスターの詳細比較
    const maxCustomMasters = Math.max(customMasters1.length, customMasters2.length);
    for (let i = 0; i < maxCustomMasters; i++) {
        const customMaster1 = customMasters1[i];
        const customMaster2 = customMasters2[i];
        
        if (!customMaster1 || !customMaster2) {
            const masterId = customMaster1 ? customMaster1.querySelector('id')?.textContent : customMaster2.querySelector('id')?.textContent;
            result.differences.push({
                type: 'customMaster',
                category: 'existence',
                description: `カスタムマスター${masterId || i + 1}: 存在が異なります`,
                details: {
                    ref: customMaster1 ? '存在' : '不存在',
                    up: customMaster2 ? '存在' : '不存在'
                }
            });
            continue;
        }
        
        // カスタムマスターの設定比較
        const name1 = customMaster1.querySelector('name')?.textContent;
        const name2 = customMaster2.querySelector('name')?.textContent;
        const type1 = customMaster1.querySelector('type')?.textContent;
        const type2 = customMaster2.querySelector('type')?.textContent;
        
        if (name1 !== name2) {
            result.differences.push({
                type: 'customMaster',
                category: 'name',
                description: `カスタムマスター${i + 1}: 名称が異なります`,
                details: {
                    ref: name1 || '未設定',
                    up: name2 || '未設定'
                }
            });
        }
        
        if (type1 !== type2) {
            result.differences.push({
                type: 'customMaster',
                category: 'type',
                description: `カスタムマスター${i + 1}: 種別が異なります`,
                details: {
                    ref: type1 || '未設定',
                    up: type2 || '未設定'
                }
            });
        }
    }
}

function compareChoiceSettings(doc1, doc2, result) {
    // MultipleChoiceNumberクラスターの比較
    const multipleChoices1 = Array.from(doc1.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'MultipleChoiceNumber'
    );
    const multipleChoices2 = Array.from(doc2.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'MultipleChoiceNumber'
    );
    
    result.structure.multipleChoices.ref = multipleChoices1.length;
    result.structure.multipleChoices.up = multipleChoices2.length;
    result.structure.multipleChoices.match = multipleChoices1.length === multipleChoices2.length;
    
    // SelectMasterクラスターの比較
    const selectMasters1 = Array.from(doc1.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'SelectMaster'
    );
    const selectMasters2 = Array.from(doc2.querySelectorAll('clusters cluster')).filter(cl => 
        cl.querySelector('type')?.textContent === 'SelectMaster'
    );
    
    result.structure.selectMasters.ref = selectMasters1.length;
    result.structure.selectMasters.up = selectMasters2.length;
    result.structure.selectMasters.match = selectMasters1.length === selectMasters2.length;
}

/**
 * カーボンコピーの比較
 * @param {Document} doc1 - 基準XMLドキュメント
 * @param {Document} doc2 - 比較XMLドキュメント
 * @param {Object} result - 比較結果オブジェクト
 */
function compareCarbonCopy(doc1, doc2, result) {
    const clusters1 = doc1.querySelectorAll('clusters cluster');
    const clusters2 = doc2.querySelectorAll('clusters cluster');
    const maxClusters = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxClusters; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) continue;
        
        const carbonCopy1 = cluster1.querySelector('carbonCopy');
        const carbonCopy2 = cluster2.querySelector('carbonCopy');
        
        // カーボンコピーの有無の比較
        if (document.getElementById('carbon_existence')?.checked) {
            const hasCarbon1 = carbonCopy1 && carbonCopy1.querySelector('targetCluster');
            const hasCarbon2 = carbonCopy2 && carbonCopy2.querySelector('targetCluster');
            
            if (hasCarbon1 !== hasCarbon2) {
                result.differences.push({
                    type: 'carbonCopy',
                    category: 'existence',
                    description: `クラスター${i + 1}: カーボンコピーの設定有無が異なります`,
                    details: {
                        ref: hasCarbon1 ? '設定あり' : '設定なし',
                        up: hasCarbon2 ? '設定あり' : '設定なし'
                    }
                });
            }
        }
        
        // 両方にカーボンコピーがある場合、詳細を比較
        if (carbonCopy1 && carbonCopy2) {
            const target1 = carbonCopy1.querySelector('targetCluster');
            const target2 = carbonCopy2.querySelector('targetCluster');
            
            if (target1 && target2) {
                // コピー先シート・クラスターの比較
                if (document.getElementById('carbon_target')?.checked) {
                    const sheetNo1 = target1.querySelector('sheetNo')?.textContent || '';
                    const sheetNo2 = target2.querySelector('sheetNo')?.textContent || '';
                    const clusterId1 = target1.querySelector('clusterId')?.textContent || '';
                    const clusterId2 = target2.querySelector('clusterId')?.textContent || '';
                    
                    if (sheetNo1 !== sheetNo2 || clusterId1 !== clusterId2) {
                        result.differences.push({
                            type: 'carbonCopy',
                            category: 'target',
                            description: `クラスター${i + 1}: カーボンコピー先が異なります`,
                            details: {
                                ref: `シート${sheetNo1} クラスター${clusterId1}`,
                                up: `シート${sheetNo2} クラスター${clusterId2}`
                            }
                        });
                    }
                }
                
                // 編集可否設定の比較
                if (document.getElementById('carbon_edit')?.checked) {
                    const edit1 = target1.querySelector('edit')?.textContent || '';
                    const edit2 = target2.querySelector('edit')?.textContent || '';
                    
                    if (edit1 !== edit2) {
                        result.differences.push({
                            type: 'carbonCopy',
                            category: 'edit',
                            description: `クラスター${i + 1}: カーボンコピーの編集可否設定が異なります`,
                            details: {
                                ref: edit1 === '0' ? '編集不可' : '編集可',
                                up: edit2 === '0' ? '編集不可' : '編集可'
                            }
                        });
                    }
                }
            } else if (target1 || target2) {
                // 片方だけにtargetClusterがある場合
                if (document.getElementById('carbon_target')?.checked) {
                    result.differences.push({
                        type: 'carbonCopy',
                        category: 'target',
                        description: `クラスター${i + 1}: カーボンコピー先の設定が異なります`,
                        details: {
                            ref: target1 ? '設定あり' : '設定なし',
                            up: target2 ? '設定あり' : '設定なし'
                        }
                    });
                }
            }
        }
    }
}

/**
 * 帳票コピーの比較
 * @param {Document} doc1 - 基準XMLドキュメント
 * @param {Document} doc2 - 比較XMLドキュメント
 * @param {Object} result - 比較結果オブジェクト
 */
function compareReportCopy(doc1, doc2, result) {
    const clusters1 = doc1.querySelectorAll('clusters cluster');
    const clusters2 = doc2.querySelectorAll('clusters cluster');
    const maxClusters = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxClusters; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) continue;
        
        const reportCopy1 = cluster1.querySelector('reportCopy');
        const reportCopy2 = cluster2.querySelector('reportCopy');
        
        // 両方に帳票コピーがある場合、詳細を比較
        if (reportCopy1 && reportCopy2) {
            // 表示設定の比較
            if (document.getElementById('report_display')?.checked) {
                const display1 = reportCopy1.querySelector('displayDefaultValue')?.textContent || '';
                const display2 = reportCopy2.querySelector('displayDefaultValue')?.textContent || '';
                
                if (display1 !== display2) {
                    result.differences.push({
                        type: 'reportCopy',
                        category: 'display',
                        description: `クラスター${i + 1}: 帳票コピーの表示設定が異なります`,
                        details: {
                            ref: display1 === '1' ? 'デフォルト値表示' : 'デフォルト値非表示',
                            up: display2 === '1' ? 'デフォルト値表示' : 'デフォルト値非表示'
                        }
                    });
                }
            }
            
            // クリア設定の比較
            if (document.getElementById('report_clear')?.checked) {
                const clear1 = reportCopy1.querySelector('clear')?.textContent || '';
                const clear2 = reportCopy2.querySelector('clear')?.textContent || '';
                
                if (clear1 !== clear2) {
                    result.differences.push({
                        type: 'reportCopy',
                        category: 'clear',
                        description: `クラスター${i + 1}: 帳票コピーのクリア設定が異なります`,
                        details: {
                            ref: clear1 === '1' ? 'クリアあり' : 'クリアなし',
                            up: clear2 === '1' ? 'クリアあり' : 'クリアなし'
                        }
                    });
                }
            }
        } else if (reportCopy1 || reportCopy2) {
            // 片方だけに帳票コピーがある場合
            const hasReport1 = reportCopy1 && (reportCopy1.querySelector('clear') || reportCopy1.querySelector('displayDefaultValue'));
            const hasReport2 = reportCopy2 && (reportCopy2.querySelector('clear') || reportCopy2.querySelector('displayDefaultValue'));
            
            if (hasReport1 !== hasReport2) {
                result.differences.push({
                    type: 'reportCopy',
                    category: 'existence',
                    description: `クラスター${i + 1}: 帳票コピーの設定有無が異なります`,
                    details: {
                        ref: hasReport1 ? '設定あり' : '設定なし',
                        up: hasReport2 ? '設定あり' : '設定なし'
                    }
                });
            }
        }
    }
}

/**
 * 分割コピーの比較
 * @param {Document} doc1 - 基準XMLドキュメント
 * @param {Document} doc2 - 比較XMLドキュメント
 * @param {Object} result - 比較結果オブジェクト
 */
function compareDividedCopy(doc1, doc2, result) {
    const clusters1 = doc1.querySelectorAll('clusters cluster');
    const clusters2 = doc2.querySelectorAll('clusters cluster');
    const maxClusters = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxClusters; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) continue;
        
        const dividedCopy1 = cluster1.querySelector('dividedCopy');
        const dividedCopy2 = cluster2.querySelector('dividedCopy');
        
        if (dividedCopy1 && dividedCopy2) {
            // 区切り文字タイプの比較
            const delimiterType1 = dividedCopy1.querySelector('delimiterType')?.textContent || '';
            const delimiterType2 = dividedCopy2.querySelector('delimiterType')?.textContent || '';
            
            if (delimiterType1 !== delimiterType2) {
                result.differences.push({
                    type: 'dividedCopy',
                    category: 'delimiterType',
                    description: `クラスター${i + 1}: 分割コピーの区切り文字タイプが異なります`,
                    details: {
                        ref: delimiterType1 || '未設定',
                        up: delimiterType2 || '未設定'
                    }
                });
            }
            
            // エンコードタイプの比較
            const encodeType1 = dividedCopy1.querySelector('encodeType')?.textContent || '';
            const encodeType2 = dividedCopy2.querySelector('encodeType')?.textContent || '';
            
            if (encodeType1 !== encodeType2) {
                result.differences.push({
                    type: 'dividedCopy',
                    category: 'encodeType',
                    description: `クラスター${i + 1}: 分割コピーのエンコードタイプが異なります`,
                    details: {
                        ref: encodeType1 || '未設定',
                        up: encodeType2 || '未設定'
                    }
                });
            }
        } else if (dividedCopy1 || dividedCopy2) {
            // 片方だけに分割コピーがある場合
            const hasDivided1 = dividedCopy1 && (dividedCopy1.querySelector('delimiterType') || dividedCopy1.querySelector('encodeType'));
            const hasDivided2 = dividedCopy2 && (dividedCopy2.querySelector('delimiterType') || dividedCopy2.querySelector('encodeType'));
            
            if (hasDivided1 !== hasDivided2) {
                result.differences.push({
                    type: 'dividedCopy',
                    category: 'existence',
                    description: `クラスター${i + 1}: 分割コピーの設定有無が異なります`,
                    details: {
                        ref: hasDivided1 ? '設定あり' : '設定なし',
                        up: hasDivided2 ? '設定あり' : '設定なし'
                    }
                });
            }
        }
    }
}

/**
 * ユーザーカスタムマスターの比較
 * @param {Document} doc1 - 基準XMLドキュメント
 * @param {Document} doc2 - 比較XMLドキュメント
 * @param {Object} result - 比較結果オブジェクト
 */
function compareUserCustomMaster(doc1, doc2, result) {
    const clusters1 = doc1.querySelectorAll('clusters cluster');
    const clusters2 = doc2.querySelectorAll('clusters cluster');
    const maxClusters = Math.max(clusters1.length, clusters2.length);
    
    for (let i = 0; i < maxClusters; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) continue;
        
        const userCustomMaster1 = cluster1.querySelector('userCustomMaster');
        const userCustomMaster2 = cluster2.querySelector('userCustomMaster');
        
        if (userCustomMaster1 && userCustomMaster2) {
            // マスターテーブルIDの比較
            const masterTableId1 = userCustomMaster1.querySelector('masterTableId')?.textContent || '';
            const masterTableId2 = userCustomMaster2.querySelector('masterTableId')?.textContent || '';
            
            if (masterTableId1 !== masterTableId2) {
                result.differences.push({
                    type: 'userCustomMaster',
                    category: 'masterTableId',
                    description: `クラスター${i + 1}: ユーザーカスタムマスターのテーブルIDが異なります`,
                    details: {
                        ref: masterTableId1 || '未設定',
                        up: masterTableId2 || '未設定'
                    }
                });
            }
            
            // マスターキーの比較
            const masterKey1 = userCustomMaster1.querySelector('masterKey')?.textContent || '';
            const masterKey2 = userCustomMaster2.querySelector('masterKey')?.textContent || '';
            
            if (masterKey1 !== masterKey2) {
                result.differences.push({
                    type: 'userCustomMaster',
                    category: 'masterKey',
                    description: `クラスター${i + 1}: ユーザーカスタムマスターのキーが異なります`,
                    details: {
                        ref: masterKey1 || '未設定',
                        up: masterKey2 || '未設定'
                    }
                });
            }
        } else if (userCustomMaster1 || userCustomMaster2) {
            // 片方だけにユーザーカスタムマスターがある場合
            const hasMaster1 = userCustomMaster1 && (userCustomMaster1.querySelector('masterTableId')?.textContent || userCustomMaster1.querySelector('masterKey')?.textContent);
            const hasMaster2 = userCustomMaster2 && (userCustomMaster2.querySelector('masterTableId')?.textContent || userCustomMaster2.querySelector('masterKey')?.textContent);
            
            if (hasMaster1 !== hasMaster2) {
                result.differences.push({
                    type: 'userCustomMaster',
                    category: 'existence',
                    description: `クラスター${i + 1}: ユーザーカスタムマスターの設定有無が異なります`,
                    details: {
                        ref: hasMaster1 ? '設定あり' : '設定なし',
                        up: hasMaster2 ? '設定あり' : '設定なし'
                    }
                });
            }
        }
    }
}

/**
 * 入力パラメータの詳細比較
 * @param {Document} doc1 - 基準XMLドキュメント
 * @param {Document} doc2 - 比較XMLドキュメント
 * @param {Object} result - 比較結果オブジェクト
 */
function compareInputParameters(doc1, doc2, result) {
    const clusters1 = doc1.querySelectorAll('clusters cluster');
    const clusters2 = doc2.querySelectorAll('clusters cluster');
    const maxClusters = Math.max(clusters1.length, clusters2.length);
    
    // 比較するパラメータのリスト
    const paramNames = [
        'Required', 'Lines', 'InputRestriction', 'MaxLength', 'Align', 
        'Font', 'FontSize', 'Weight', 'Color', 'DefaultFontSize',
        'AutoInput', 'FirstOnly', 'ConfirmDialog', 'Day', 'Editable',
        'DateFormat', 'VerticalAlignment', 'EnableAutoFontSize',
        'Default', 'IsNumeric', 'ColorManageCluster', 'ToggleInput',
        'FontPriority', 'Display', 'UseSelectGateway', 'Items', 'Labels',
        'MaxFontSize', 'UseKeyboard'
    ];
    
    for (let i = 0; i < maxClusters; i++) {
        const cluster1 = clusters1[i];
        const cluster2 = clusters2[i];
        
        if (!cluster1 || !cluster2) continue;
        
        const inputParams1 = cluster1.querySelector('inputParameters')?.textContent || '';
        const inputParams2 = cluster2.querySelector('inputParameters')?.textContent || '';
        
        // パラメータ文字列全体の比較
        if (inputParams1 !== inputParams2) {
            // 各パラメータを個別に比較
            for (const paramName of paramNames) {
                const value1 = extractParameter(inputParams1, paramName);
                const value2 = extractParameter(inputParams2, paramName);
                
                if (value1 !== value2) {
                    result.differences.push({
                        type: 'inputParameters',
                        category: paramName,
                        description: `クラスター${i + 1}: 入力パラメータ「${paramName}」が異なります`,
                        details: {
                            ref: value1 || '未設定',
                            up: value2 || '未設定'
                        }
                    });
                }
            }
        }
    }
}

