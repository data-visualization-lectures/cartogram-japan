# 共通ヘッダー導入計画

## 概要
`_temp` フォルダにある共通認証クライアント (`dataviz-auth-client.js`) と Supabase クライアント (`supabase.js`) をプロジェクトに取り込み、全ページで共通ヘッダーが表示されるようにします。

## 1. ファイルの取り込み
`vendor` ディレクトリに以下のファイルを配置します。
- `supabase.js` (Supabase クライアント)
- `dataviz-auth-client.js` (共通ヘッダー・認証用クライアント)

## 2. ビルド設定の変更 (`build.js`)
`docs/app.min.js` に結合するのではなく、個別のファイルとして `docs/vendor/` にコピーされるように `build.js` を修正します。
これは、他のプロジェクトとの共通性を保つため、および将来的な更新を容易にするためです。

```javascript
// ...
// Copy additional vendor files
const vendorFiles = [
  'supabase.js',
  'dataviz-auth-client.js'
];

try {
  const vendorDest = path.join(distDir, 'vendor');
  if (!fs.existsSync(vendorDest)) {
    fs.mkdirSync(vendorDest);
  }
  
  vendorFiles.forEach(file => {
    const src = path.join(__dirname, 'vendor', file);
    const dest = path.join(vendorDest, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied: vendor/${file} → docs/vendor/${file}`);
    } else {
      console.warn(`⚠️  File not found: vendor/${file}`);
    }
  });
} catch (error) {
  console.warn('⚠️  Vendor file copy skipped:', error.message);
}
// ...
```

## 3. HTMLの変更 (`index.html`)
ヘッダー内のスクリプト読み込みと、初期化処理を追加します。

```html
<head>
  <!-- ...既存のタグ... -->
  
  <!-- Common Header & Auth -->
  <script src="docs/vendor/supabase.js"></script>
  <script src="docs/vendor/dataviz-auth-client.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.DatavizAuthClient) {
        DatavizAuthClient.init({
          supabaseUrl: 'https://cxMsrc...SupabaseURL...', // 実際のエンドポイント
          supabaseKey: '...SupabaseKey...', // 実際のキー
          currentApp: 'cartogram-japan' // アプリケーションID
        });
      }
    });
  </script>
</head>
```
※ SupabaseのURLとKeyは、`dataviz-auth-client.js` 内にハードコードされているか、あるいは外部から渡す必要があるかを確認します。通常 `_temp` の実装では `init` メソッドを持たせていることが多いです。

## 作業手順
1. `_temp` からファイルをコピーする。
2. `build.js` を修正する。
3. `index.html` を修正する。
4. ビルドして動作確認。
