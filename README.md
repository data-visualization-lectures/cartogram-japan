## これは何？

連続的カルトグラムをJavaScript/D3.jsで実装するためのライブラリを利用した実装例です。
テーマ・データには、SSDSE-C（https://www.nstac.go.jp/use/literacy/ssdse/#SSDSE-C）を元に、米と食パンのみに加工したデータを利用しています。

## データの種類

- /data/japan.topojson...地図データ（編集しないでください）
- /data/theme.csv...テーマデータ（編集可能）

## カスタマイズ方法

テーマデータは「都道府県」列は必ず残した上で、現状の列を削除して、希望データの列を追加してください。画面上のドロップダウンは自動的に列名に入れ替わります。

## ビルド方法

このプロジェクトは、JavaScriptとCSSファイルをminifyしてデプロイするためのビルドシステムを備えています。

### ローカルビルド

開発環境でJavaScriptとCSSをminifyして、`dist/`ディレクトリに出力します。

**前提条件:**
- Node.js 12以上がインストールされていること

**手順:**

1. 依存パッケージをインストール
```bash
npm install
```

2. ビルド実行
```bash
npm run build
```

3. 以下のminifyされたファイルが`dist/`に生成されます：
   - `dist/topogram.min.js` (topogram.js をminify)
   - `dist/main.min.js` (main.js をminify)
   - `dist/style.min.css` (style.css をminify)

**ファイルサイズの削減:**
- topogram.js: 74KB → 22KB (約70%削減)
- main.js: 28KB → 19KB (約32%削減)
- style.css: 7.0KB → 5.6KB (約20%削減)

### リモートビルド・デプロイ

Webサーバにデプロイする際は、以下のファイルをアップロードしてください：

**必須ファイル:**
- `index.html` - メインHTMLファイル
- `dist/topogram.min.js` - Cartogramライブラリ（minify版）
- `dist/main.min.js` - メインアプリケーション（minify版）
- `dist/style.min.css` - スタイルシート（minify版）
- `assets/d3-legend.min.js` - D3凡例プラグイン
- `data/japan.topojson` - 日本地図データ
- `data/theme.csv` - サンプルデータ

**アップロード不要（CDN経由で読み込み）:**
- Bootstrap CSS/JS
- D3.js
- d3-scale-chromatic
- TopoJSON

**ディレクトリ構成:**
```
public_html/
├── index.html
├── dist/
│   ├── topogram.min.js
│   ├── main.min.js
│   └── style.min.css
├── assets/
│   └── d3-legend.min.js
└── data/
    ├── japan.topojson
    └── theme.csv
```

**GitHub Pagesの場合:**

リポジトリのルートまたは`gh-pages`ブランチに上記のファイル構成でpushすれば、自動的に公開されます。

### 開発フロー

1. `assets/main.js`, `assets/topogram.js`, `assets/style.css`を編集
2. `npm run build`を実行してminify版を生成
3. 生成された`dist/`ファイルをコミット＆プッシュ
4. リモートサーバにアップロード
