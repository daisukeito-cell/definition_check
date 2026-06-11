/**
 * アプリのリリースバージョンと変更履歴
 * リリース時は APP_VERSION と CHANGELOG を更新してください。
 */
export const APP_VERSION = '1.0.0';

/** @type {{ version: string; date: string; summary?: string; items: string[] }[]} */
export const CHANGELOG = [
    {
        version: '1.0.0',
        date: '2026-06-12',
        summary:
            '帳票定義の演習と、自分が作成した定義の見直しを支援するトレーニング用ツールです。動画で手順を学び、端末を整えたうえで、基準XMLとの比較によって差分を確認できます。',
        items: [
            '演習ルーム：帳票定義の作成・更新手順を動画やPDFで確認しながら、ハンズオン演習を進められます',
            '定義チェック：基準XMLと比較XMLを並べ、クラスター・ネットワーク・カーボンコピーなどの設定差分を可視化して確認できます',
            '端末準備：i-Reporter や ConMas Designer の設定手順を案内し、演習や比較を始める前の環境づくりを支援します',
        ],
    },
];
