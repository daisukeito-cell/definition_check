# definition_check_vercel

帳票定義チェックツール（Vercel デプロイ用）

## 前提

- [Bun](https://bun.sh/) をインストール（Windows はインストーラーで OK）

## 初回セットアップ

プロジェクトフォルダ（`package.json` がある場所）で:

```bash
cd definition_check_vercel
bun install
```

## ローカルで動かす（開発）

```bash
bun run dev
```

または Windows では `local.bat` をダブルクリック、PowerShell では:

```powershell
.\scripts\dev-start.ps1
```

起動後、ターミナルに表示される URL をブラウザで開きます（通常はポート **3000**。使用中の場合は 3001 などに自動でずらします）。

| 画面 | URL |
|------|-----|
| 演習ルーム | http://localhost:3000/ |
| 定義チェック | http://localhost:3000/check.html |
| 端末セットアップ | http://localhost:3000/setup_Tool/AI_setup.html |

`src/` や `public/` を編集して保存すると、自動で再ビルドされます。終了は **Ctrl+C**。

### ポートを変えたいとき

```bash
set PORT=3010
bun run dev
```

（PowerShell: `$env:PORT=3010; bun run dev`）

## 本番と同じビルドだけ確認する

```bash
bun run build
bun run preview
```

詳細なデプロイ手順は `GitとVercelデプロイ手順.md` を参照してください。
