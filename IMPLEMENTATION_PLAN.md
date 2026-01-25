# プロジェクト保存・読込機能 実装計画

## 概要
現在のデータ状態（読み込んだCSVデータ）と、ツール上での設定（選択中の指標、配色、凡例設定など）をJSONファイルとして保存し、後で読み込んで復元できる機能を追加します。

## 1. UIの変更 (`index.html`)

### 変更箇所
`<section class="card hero-card">` 内のレイアウトを変更し、右端に「読込」「保存」ボタンを配置します。

### 変更内容
Bootstrap 5のUtilityクラス（`d-flex`, `justify-content-between`, `align-items-center`）を使用してレイアウトを調整します。

```html
<section class="card hero-card d-flex flex-row justify-content-between align-items-center">
  <!-- タイトル・説明部分 -->
  <div>
    <h1>日本地図カルトグラム</h1>
    <p class="mb-0">
      都道府県別データを CSV でアップロードして、面積をデータ値に比例させたカルトグラムをブラウザだけで生成できます。
    </p>
  </div>
  
  <!-- アクションボタン部分 -->
  <div class="d-flex gap-2">
    <input type="file" id="project-file-input" accept=".json" style="display: none;" />
    <button class="btn btn-secondary text-nowrap" id="btn-load-project">プロジェクト・ファイル読込</button>
    <button class="btn btn-primary text-nowrap" id="btn-save-project">プロジェクト・ファイル保存</button>
  </div>
</section>
```

※ `mb-0` は `<p>` の下マージンを消すため（中央揃えをきれいにするため）。
※ `text-nowrap` はボタン文字の折り返し防止。

## 2. ロジックの実装 (`assets/main.js`)

### 保存機能 (`saveProjectFile`)
現在の状態をオブジェクトにまとめ、JSON文字列としてダウンロードさせます。

**保存するデータ構造 (JSON):**
```json
{
  "version": "1.0",
  "timestamp": 1700000000000,
  "meta": {
    "datasetName": "サンプルデータ"
  },
  "data": [ ... ], // rawData (CSVの中身の配列)
  "config": {
    "fieldKey": "支出金額", // 現在選択中の指標カラム名
    "colorSchemeId": "blues", // 配色ID
    "legendCells": 5, // 凡例の階級数
    "legendUnit": "円", // 単位
    "displayMode": "value", // "value" or "ranking"
    "showPlaceLabels": true // 地名表示の有無
  }
}
```

**処理フロー:**
1. `rawData` が存在するか確認する。
2. 上記の構造でオブジェクトを作成する。
3. `JSON.stringify` で文字列化し、Blobを作成する。
4. ファイル名（例: `japan-cartogram-project-[日時].json`）を生成し、ダウンロードをトリガーする。

### 読込機能 (`loadProjectFile`)
JSONファイルを読み込み、アプリケーションの状態を復元します。

**処理フロー:**
1. ファイル選択ダイアログ (`input type="file"`) からファイルを受け取る。
2. `FileReader` でテキストとして読み込む。
3. `JSON.parse` でパースする。エラー時はアラートを表示。
4. **データの復元**: 
   - `loadDataset(json.data, { label: json.meta.datasetName })` を呼び出し、データをセットして初期化する。
5. **設定の復元**:
   - `field` (指標): `json.config.fieldKey` に一致するものを `fields` から探し、`field` 変数にセット＆プルダウン選択。
   - `colorScheme` (配色): `json.config.colorSchemeId` で `setColorScheme` を実行。
   - `legendCells` (階級数): `legendCellsSelect` の値を更新し `updateLegendCellsOptions` 実行。
   - `legendUnit` (単位): `legendUnitInput` の値を更新し、`legendUnit` 変数にセット。
   - `displayMode` (モード): `setDisplayMode` を実行。
   - `placeLabels` (地名): チェックボックスの状態を更新し、`renderPlaceLabels` を実行。
6. 全ての復元後、`deferredUpdate()` を呼び出して地図を再描画する。

## 3. イベントリスナーの登録 (`assets/main.js`)

初期化処理（または適当な場所）に以下を追加します。

```javascript
// プロジェクト読込ボタン
d3.select("#btn-load-project").on("click", function() {
  document.getElementById("project-file-input").click();
});

// ファイル選択時
d3.select("#project-file-input").on("change", function() {
  var file = this.files && this.files[0];
  if (file) {
    loadProjectFile(file);
  }
  this.value = ""; // 同じファイルを再度選べるようにリセット
});

// プロジェクト保存ボタン
d3.select("#btn-save-project").on("click", saveProjectFile);
```

## 作業手順
1. `index.html` の `<section class="card hero-card">` を修正。
2. `assets/main.js` に `saveProjectFile`, `loadProjectFile` 関数を追加。
3. `assets/main.js` にイベントリスナーを追加。
4. 動作確認（保存して、ブラウザリロード後、読み込んで元通りになるか）。
