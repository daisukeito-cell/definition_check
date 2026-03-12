# Gitに登録してVercelにデプロイする手順（Gitに詳しくない方向け）

ZIPで受け取ったプロジェクトを、Git（GitHub）に登録し、Vercelで公開するまでの流れを説明します。  
**前提**: ZIPを解凍したフォルダで作業します。Git と Node.js（または Bun）がインストールされていること。

---

## 更新して再デプロイしたいとき（すでに1回デプロイ済みの場合）

**Gitで管理しているプロジェクトのフォルダ**（最初に `git init` して `git push` したフォルダ、または GitHub から clone したフォルダ）を開き、次を実行します。

1. そのフォルダでコマンドを実行する:
   ```bash
   git add .
   git commit -m "説明メッセージ"
   git push
   ```
   - `"説明メッセージ"` の部分は、今回の変更内容が分かるように書き換えてください（例: `"用語集リンクとXML出力方法の説明を追加"`）
2. Vercelが自動で再ビルド・再デプロイします（1〜2分程度）
3. 状態は Vercel ダッシュボードの **Deployments** で確認できます  
   - 例: https://vercel.com/あなたのチーム名/definition-check

**注意**: 編集しているフォルダが「Gitの管理下」になっていない（`git status` で `fatal: not a git repository` と出る）場合は、最初にデプロイしたときのフォルダか、GitHub から clone したフォルダで上記を実行してください。

---

## 目次

0. [更新して再デプロイしたい（すでに1回デプロイ済み）](#更新して再デプロイしたいときすでに1回デプロイ済みの場合)
1. [ZIPを解凍して中身を確認する](#1-zipを解凍して中身を確認する)
2. [依存パッケージをインストールする](#2-依存パッケージをインストールする)
3. [ローカルでビルド・動作確認する](#3-ローカルでビルド動作確認する)
4. [GitHubにリポジトリを作る](#4-githubにリポジトリを作る)
5. [このプロジェクトをGitで管理し、GitHubに送る](#5-このプロジェクトをgitで管理しgithubに送る)
6. [Vercelでデプロイする](#6-vercelでデプロイする)
7. [よくあるつまずき](#7-よくあるつまずき)

---

## 1. ZIPを解凍して中身を確認する

1. 受け取った `definition_check_vercel.zip` を解凍する
2. 解凍したフォルダ（例: `definition_check_vercel`）を開く
3. 次のようなファイル・フォルダがあることを確認する  
   - `package.json`  
   - `src` フォルダ  
   - `public` フォルダ  
   - `vercel.json`  
   - `.git` は**ない**状態でOK（これから自分でGitを初期化する）

---

## 2. 依存パッケージをインストールする

このプロジェクトは **Bun** を使っています。Bun が入っていない場合は先にインストールしてください。

- Bun のインストール: https://bun.sh/  
  - Windows: 「Windows」の説明に従ってインストール

インストール後、**解凍したフォルダの中**でコマンドを実行します。

1. エクスプローラーで解凍したフォルダを開く
2. アドレス欄に `cmd` と入力して Enter（または PowerShell を開いて `cd` でそのフォルダに移動）
3. 次のコマンドを実行する:

```bash
bun install
```

「Done」や「packages installed」のような表示が出ればOKです。  
`node_modules` フォルダが新しくできていれば成功です。

---

## 3. ローカルでビルド・動作確認する

Vercelに出す前に、自分のPCでビルドが通るか確認します。

同じフォルダで:

```bash
bun run build
```

エラーが出ずに終わり、`dist` フォルダができることを確認してください。  
ここまでできていれば、Vercelでも同じビルドが動きます。

（任意）ローカルでプレビューしたい場合:

```bash
bun run index.ts
```

ブラウザで表示されるURL（例: http://localhost:3000）を開いて動作を確認できます。

---

## 4. GitHubにリポジトリを作る

1. **GitHub**（https://github.com）にログインする
2. 右上の **+** → **New repository** をクリック
3. 次のように入力する:
   - **Repository name**: 例 `definition_check_vercel`（任意の名前でOK）
   - **Public** を選択
   - **Add a README file** は**つけなくてOK**（ZIPにすでにREADMEがあるため）
   - **Create repository** をクリック
4. 作成後、画面に **Repository URL** が表示されます。  
   例: `https://github.com/あなたのユーザー名/definition_check_vercel.git`  
   このURLをメモまたはコピーしておきます。

---

## 5. このプロジェクトをGitで管理し、GitHubに送る

解凍したフォルダはまだ「Gitの管理下」になっていません。ここで「このフォルダをGitのリポジトリにする」→「GitHubに送る」まで行います。

### 5-1. Gitを初期化する

解凍したフォルダを開いた状態で、コマンドプロンプトまたはPowerShellでそのフォルダに移動してから、次を実行します。

```bash
git init
```

「Initialized empty Git repository in ...」と出ればOKです。  
フォルダ内に `.git` という隠しフォルダができます。

### 5-2. 全部のファイルを「コミット対象」にする

```bash
git add .
```

「.」は「このフォルダの中の変更すべて」という意味です。  
何もメッセージが出なくても、エラーがなければ成功です。

### 5-3. 最初のコミット（保存）を作る

```bash
git commit -m "Initial commit: definition_check_vercel from zip"
```

「X files changed」「create mode ...」のような表示が出ればOKです。

### 5-4. ブランチ名を main にする（GitHubの標準に合わせる）

```bash
git branch -M main
```

### 5-5. GitHubのリポジトリを「遠隔の置き場」として登録する

次の `あなたのユーザー名` と `リポジトリ名` を、4で作ったリポジトリのURLに合わせて書き換えてください。

```bash
git remote add origin https://github.com/あなたのユーザー名/definition_check_vercel.git
```

例: ユーザー名が `tanaka` でリポジトリ名が `definition_check_vercel` なら:

```bash
git remote add origin https://github.com/tanaka/definition_check_vercel.git
```

### 5-6. GitHubに送る（プッシュ）

```bash
git push -u origin main
```

初回は GitHub のログインを求められることがあります。  
ブラウザが開いたり、ユーザー名・パスワード（またはトークン）の入力が求められたら、案内に従ってください。  
「Everything up-to-date」や「branch 'main' set up to track ...」などと出れば成功です。

GitHubのリポジトリページを更新すると、ファイル一覧が表示されているはずです。

---

## 6. Vercelでデプロイする

1. **Vercel**（https://vercel.com）にアクセスし、**Sign Up** または **Log In** する  
   - 「Continue with GitHub」でGitHubアカウントと連携すると楽です
2. ログイン後、**Add New…** → **Project** をクリック
3. **Import Git Repository** で、さきほどプッシュしたリポジトリ（例: `definition_check_vercel`）を選ぶ  
   - 一覧に出てこない場合は **Configure GitHub App** でリポジトリへのアクセスを許可する
4. **Import** をクリック
5. 設定画面では、多くの場合そのままでOKです:
   - **Framework Preset**: 自動検出、または **Other** で問題なし
   - **Build Command**: `bun run build` が入っていることを確認（入っていなければ手で `bun run build` と入力）
   - **Output Directory**: `dist` が入っていることを確認
   - **Install Command**: `bun install` でOK
6. **Deploy** をクリック
7. ビルドが始まります。1〜2分ほど待つと **Congratulations** のような画面になり、**Visit** のリンクが表示されます
8. そのリンクを開くと、Vercel上で公開されたサイトが表示されます  
   - 今後、GitHubの `main` にプッシュするたびに、自動で再デプロイされます

---

## 7. よくあるつまずき

### 「git は認識されていません」と出る

- Git がインストールされていません。  
  https://git-scm.com/ からインストールし、インストール時に「コマンドプロンプトから使う」を有効にしたうえで、再度コマンドを実行してください。

### 「bun は認識されていません」と出る

- Bun が入っていないか、パスが通っていません。  
  https://bun.sh/ でインストールし、ターミナルを開き直してから `bun install` を試してください。

### `git push` で認証エラーになる

- GitHub ではパスワードの代わりに **Personal Access Token (PAT)** を使う必要があります。  
  GitHub → Settings → Developer settings → Personal access tokens でトークンを作成し、パスワードを聞かれたらそのトークンを入力してください。

### Vercelのビルドが失敗する

- **Build Command** が `bun run build`、**Output Directory** が `dist` になっているか確認する
- ローカルで `bun run build` が成功しているか再度確認する
- Vercelのビルドログ（Deployments → 失敗したデプロイ → **Building** のログ）を開き、エラー文を確認する

### 今後、ソースを直したあと再度デプロイしたい

1. 編集したフォルダで:
   ```bash
   git add .
   git commit -m "説明メッセージ"
   git push
   ```
2. Vercelが自動で再ビルド・再デプロイします。  
   ダッシュボードの **Deployments** で状態を確認できます。

---

以上で、ZIP受け取り → Git登録 → Vercelデプロイまでの流れは完了です。  
不明な点があれば、プロジェクトを渡した人に確認してください。
