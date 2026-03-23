/**
 * AI導入手順ナビゲーションガイド - データ定義
 * guideSteps配列とcompletedChecklistItemsの定義
 */

const guideSteps = [
    {
        id: 1,
        title: "必要なインストーラーの準備",
        description: "i-Reporterシステムに必要な各アプリケーションのインストーラーをダウンロードします。",
        aiGuidance: null,
        image: null,
        imageCaption: null,
        content: "必要なインストーラーをダウンロードして、i-Reporterシステムのセットアップ準備を整えます。",
        checklist: [
            {
                id: "installer-prep-0",
                title: "必要なインストーラーのダウンロード",
                description: "i-Reporterシステムに必要な3つのアプリケーションを直接ダウンロードできます<br><br><strong>💡 ご注意：</strong>こちらのインストーラーでも操作は可能ですが、最新版ではない可能性があります。",
                downloadUrl: "https://cimtops-support.com/i-Reporter/ja/software-jp",
                downloadNote: "i-ReporterアプリはWindows版、iOS版いずれかを選択してください<br><br>📱 i-ReporterアプリのiOS版はApp Storeから「i-Reporter」を検索してダウンロードしてください<br><br><strong>📌 最新版について：</strong>最新版が必要な場合は、公式ダウンロードページから取得してください。",
                isDownloadSection: true,
                directDownloads: [
                    {
                        id: "conmas-addin",
                        title: "ConMas EXCEL COM Add-in",
                        description: "Excelからi-Reporterの機能を利用するためのアドイン",
                        url: "https://cimtops-support.com/i-Reporter/software_dl/iReporterExcelAddInSetup.8.2.25110.zip",
                        icon: "📊",
                        type: "conmas"
                    },
                    {
                        id: "conmas-designer",
                        title: "ConMas Designer",
                        description: "i-Reporterの帳票定義を作成・編集するための専用ツール",
                        url: "https://cimtops-support.com/i-Reporter/software_dl/ConMasDesignerSetup.8.2.26010.zip",
                        icon: "🎨",
                        type: "designer"
                    },
                    {
                        id: "ireporter-windows",
                        title: "i-Reporter for Windows",
                        description: "Windows端末からi-Reporterにアクセスするためのアプリ",
                        url: "https://cimtops-support.com/i-Reporter/software_dl/ConMasIReporterSetup.6.2.25100.zip",
                        icon: "💻",
                        type: "ireporter"
                    },
                    {
                        id: "ireporter-ios",
                        title: "i-Reporter iOS版",
                        description: "iOS端末からi-Reporterにアクセスするためのアプリ",
                        filename: "appstore://search?term=i-Reporter",
                        icon: "📱",
                        type: "ios"
                    }
                ]
            }
        ]
    },
    {
        id: 2,
        title: "ConMas Excel COM add-in インストール",
        description: "ConMas Excel COM add-inをインストールします。",
        aiGuidance: "ConMas Excel COM add-inは、Excelからi-Reporterの機能を利用するためのアドインです。正しくインストールすることで、Excelでの帳票操作が可能になります。",
        image: null,
        imageCaption: null,
        content: "ConMas Excel COM add-inをインストールして、Excelからi-Reporterの機能を利用できるようにします。",
        checklist: [
            {
                id: "conmas-excel-1",
                title: "インストールの実行",
                description: "ダウンロードしたインストーラーを実行してConMas Excel COM add-inをインストールする",
                pdfFile: "assets/pdfs/add-in.pdf",
                pdfTitle: "ConMas Excel COM add-in インストール手順"
            },
        ]
    },
    {
        id: 3,
        title: "ConMasDesigner インストール・設定",
        description: "ConMasDesignerをインストールし、接続先を設定します。",
        aiGuidance: "ConMasDesignerは、i-Reporterの帳票定義を作成・編集するための専用ツールです。デザイナーツールとして、帳票のレイアウト設計に使用されます。",
        image: null,
        imageCaption: null,
        content: "ConMasDesignerをインストールし、i-Reporterサーバーへの接続設定を行います。",
        checklist: [
            {
                id: "conmas-designer-1",
                title: "接続先設定",
                description: "ConMasDesigner内でi-Reporterサーバーの接続先情報を設定する",
                pdfFile: "assets/pdfs/Designer_setup.pdf",
                pdfTitle: "ConMasDesigner 接続先設定手順"
            }
        ]
    },
    {
        id: 4,
        title: "i-Reporterアプリ インストール・設定",
        description: "i-Reporterアプリ（iOS版またはWindows版）をインストールし、接続先を設定します。",
        aiGuidance: "i-Reporterアプリは、モバイルデバイスやWindows端末からi-Reporterにアクセスするためのアプリケーションです。使用環境に応じて適切なバージョンを選択してください。",
        image: null,
        imageCaption: null,
        content: "i-Reporterアプリをインストールし、サーバーへの接続設定を行います。",
        checklist: [
            {
                id: "ireporter-app-1",
                title: "接続先設定",
                description: "アプリ内でサーバーの接続先情報（URL、ユーザーID、パスワード等）を設定する",
                setupGuides: [
                    {
                        platform: "Windows版",
                        title: "Windows版 接続先設定手順",
                        image: "assets/pdfs/Win_setup.pdf",
                        steps: [
                            "アプリ起動後、右上の「歯車」アイコン → 「設定」をクリック",
                            "「新しい接続先を追加」をクリック",
                            "接続先名: サーバー名称を入力します。名称は任意に設定してください。",
                            "接続先URL: https://sales.conmas-i-reporter.com/ConMasWebSEMINAROLINE/Rests/ConMasIReporter.aspx",
                            "ユーザーID: 「am」または「op」で始まる4文字",
                            "パスワード: 「pass」で始まる6文字",
                            "「保存」をクリックして設定完了",
                            "設定した接続先を選択して「ログイン」をクリック",
                            "端末にログイン後、申請画面で必要な情報を入力",
                            "申請内容を確認して「申請」ボタンをクリックして完了"
                        ]
                    },
                    {
                        platform: "iOS版",
                        title: "iOS版 接続先設定手順",
                        image: "assets/pdfs/iOS_setup.pdf",
                        steps: [
                            "アプリ起動後、左上の「歯車アイコン」をタップ",
                            "「接続先名」をタップ → 「新しい接続先を追加」",
                            "接続先名: サーバー名称を入力します。名称は任意に設定してください。",
                            "接続先URL: https://sales.conmas-i-reporter.com/ConMasWebSEMINAROLINE/Rests/ConMasIReporter.aspx",
                            "ユーザーID: 「am」または「op」で始まる4文字",
                            "パスワード: 「pass」で始まる6文字",
                            "「保存する」をタップして設定完了",
                            "設定した接続先を選択して「ログイン」をタップ",
                            "端末にログイン後、申請画面で必要な情報を入力",
                            "申請内容を確認して「申請」ボタンをタップして完了"
                        ]
                    }
                ]
            }
        ]
    }
];

let completedChecklistItems = new Set();
