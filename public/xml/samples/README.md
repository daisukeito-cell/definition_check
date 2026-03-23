# セキュリティ実装テスト用サンプルXML

このフォルダには、XMLアップロードのセキュリティ対策（ファイルサイズ・XXE・XSS・構造検証）が正しく動くか確認するためのサンプルファイルが入っています。

## ファイル一覧

| ファイル | 用途 | 期待される動作 |
|----------|------|----------------|
| **sample_valid.xml** | 正常系 | そのまま読み込み・比較できる |
| **sample_xss_test.xml** | XSSエスケープ確認 | 読み込み可。クラスター名などに `<script>` や `& < > " '` が含まれるが、画面ではエスケープされて表示され、スクリプトは実行されない |
| **sample_xxe_reject.xml** | XXE対策確認 | **読み込み拒否**。「セキュリティのため、DOCTYPE/ENTITYを含むXMLは利用できません。」と表示される |
| **sample_invalid_structure.xml** | 構造検証確認 | **比較時に拒否**。ルートが `conmas` でないため「比較XMLのルート要素が想定外です。」等と表示される |

---

## テスト手順

### 1. 正常系（sample_valid.xml）

1. アプリで基準XMLを「STEP.1」などに設定する。
2. **比較XML** に `sample_valid.xml` をアップロードする。
3. 「比較を開始」をクリックする。
4. **期待結果**: エラーにならず、比較結果・PDFレイアウト・ネットワーク設定が表示される。クラスターをクリックすると詳細が開く。

---

### 2. XSSエスケープ（sample_xss_test.xml）

1. **比較XML** に `sample_xss_test.xml` をアップロードする。
2. 「比較を開始」をクリックする。
3. 比較結果表示後、**クラスター設定**タブでクラスターをクリックし、詳細モーダルを開く。
4. **期待結果**:
   - クラスター名に `<img src=x onerror=alert(1)>` や `& " ' < >` が**そのまま文字として**表示される（タグとして解釈されず、アラートは出ない）。
   - 選択肢のラベルに `<b>` や `"test"` が文字として表示される。

---

### 3. XXE拒否（sample_xxe_reject.xml）

1. **比較XML** に `sample_xxe_reject.xml` をアップロードする。
2. 「比較を開始」をクリックする。
3. **期待結果**: アラートで「セキュリティのため、DOCTYPE/ENTITYを含むXMLは利用できません。」と表示され、比較は実行されない。

※ 基準XMLを「STEP.1」のまま、比較XMLだけ差し替えてテストすればよい。

---

### 4. 構造検証（sample_invalid_structure.xml）

1. **比較XML** に `sample_invalid_structure.xml` をアップロードする。
2. 「比較を開始」をクリックする。
3. **期待結果**: アラートで「比較XMLのルート要素が想定外です。」や「比較XMLにシート情報が見つかりません。」等が表示され、比較は実行されない。

---

### 5. ファイルサイズ制限（5MB超）

アプリでは **5MBを超えるXMLは読み込めません**。

- **比較XML**: 5MB超のファイルを選択すると、選択直後に「❌ 5MBを超えるXMLは読み込めません。」と表示され、選択が解除される。
- **基準XML**: サーバー配置のXMLが5MB超の場合は、読み込み後に同様のメッセージが表示される（通常は想定しない）。

テストする場合は、次のように **5MB超のダミーXML** を手元で作成できます。

**PowerShell（Windows）例:**

```powershell
# 5MBを少し超えるサイズになるまで <x> を繰り返す
$base = Get-Content ".\sample_valid.xml" -Raw
$chunk = "<dummy></dummy>"
$repeat = [Math]::Ceiling((5 * 1024 * 1024 - $base.Length) / $chunk.Length)
$big = $base -replace "</conmas>", ($chunk * $repeat + "</conmas>")
[System.IO.File]::WriteAllText("$PWD\sample_over_5mb.xml", $big)
```

生成した `sample_over_5mb.xml` を比較XMLとして選択し、「❌ 5MBを超えるXMLは読み込めません。」となることを確認する。

---

## 注意

- **sample_xxe_reject.xml** と **sample_invalid_structure.xml** は、意図的に「拒否される」ことを確認するためのファイルです。本番の基準XML一覧には含めないでください。
- **sample_xss_test.xml** は、表示がエスケープされていることの確認用です。クラスター名などに攻撃的な文字列が含まれていますが、実装どおりであれば実行されず文字として表示されます。
