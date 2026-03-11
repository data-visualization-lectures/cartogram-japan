(function () {
  var browserLang = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
  var LANG = browserLang.startsWith('ja') ? 'ja' : 'en';

  document.documentElement.setAttribute('lang', LANG);

  var T = {
    // Page
    'page.title': { ja: '日本地図カルトグラム', en: 'Japan Cartogram' },

    // Data panel
    'panel.dataManagement': { ja: 'データ管理', en: 'Data Management' },
    'panel.dataManagement.desc': {
      ja: 'CSV の「都道府県」列をキーとして利用し、他の列を指標として利用します。アップロード後に内容を確認してからマップに適用できます。',
      en: 'Uses the "都道府県" (Prefecture) column in the CSV as the key and other columns as indicators. You can review the data before applying it to the map.'
    },
    'label.currentData': { ja: '現在の適用データ', en: 'Current Data' },
    'btn.hideTable': { ja: '表データを隠す', en: 'Hide Table' },
    'btn.showTable': { ja: '表データを表示', en: 'Show Table' },
    'tab.sample': { ja: 'サンプル', en: 'Sample' },
    'tab.original': { ja: 'オリジナル', en: 'Custom' },
    'label.sampleData': { ja: 'サンプルデータ', en: 'Sample Data' },
    'label.sampleDataNote': {
      ja: '初期表示ではサンプルデータ（SSDSE-C の果物支出）を読み込んでいます。<br /><br />出典：<a href="https://www.nstac.go.jp/use/literacy/SSDSE/" target="_blank">独立行政法人 統計センター SSDSE-C-2025</a>を加工して作成。<br /><br />データは2025年4月25日公開。',
      en: 'Initially loaded with sample data (fruit expenditure from SSDSE-C).<br /><br />Source: Processed from <a href="https://www.nstac.go.jp/use/literacy/SSDSE/" target="_blank">Statistics Bureau SSDSE-C-2025</a>.<br /><br />Data published on April 25, 2025.'
    },
    'btn.download': { ja: 'ダウンロード', en: 'Download' },
    'btn.downloadCsv': { ja: 'CSVダウンロード', en: 'Download CSV' },
    'btn.resetSample': { ja: 'サンプルに戻す', en: 'Reset to Sample' },
    'label.dataUpload': { ja: 'データアップロード', en: 'Data Upload' },
    'dropzone.title': { ja: 'CSV をドラッグ＆ドロップ', en: 'Drag & Drop CSV' },
    'dropzone.or': { ja: 'または', en: 'or' },
    'btn.chooseFile': { ja: 'ファイルを選択', en: 'Choose File' },
    'label.uploadPreview': { ja: 'アップロードプレビュー', en: 'Upload Preview' },
    'btn.applyData': { ja: 'このデータを適用', en: 'Apply This Data' },

    // Map controls
    'aria.dataIndicator': { ja: 'データ指標', en: 'Data Indicator' },
    'label.unit': { ja: '単位', en: 'Unit' },
    'placeholder.unit': { ja: '例：円', en: 'e.g. JPY' },
    'aria.displayMode': { ja: '表示モード', en: 'Display Mode' },
    'mode.value': { ja: '実数モード', en: 'Value Mode' },
    'mode.ranking': { ja: 'ランキングモード', en: 'Ranking Mode' },
    'label.classMethod': { ja: '分類方法', en: 'Classification' },
    'aria.classMethod': { ja: '分類方法', en: 'Classification Method' },
    'class.quantile': { ja: '等量分類 (Quantile)', en: 'Quantile' },
    'class.equal': { ja: '等間隔分類 (Equal Interval)', en: 'Equal Interval' },
    'class.jenks': { ja: '自然分類 (Jenks)', en: 'Jenks Natural Breaks' },
    'class.msd': { ja: '標準偏差 (Mean-Std Dev)', en: 'Mean-Std Dev' },
    'class.geometric': { ja: '幾何学的分類 (Geometric)', en: 'Geometric' },
    'class.headtail': { ja: 'ヘッドテール分類 (Head/Tail)', en: 'Head/Tail Breaks' },
    'class.pretty': { ja: 'きりのよい分類 (Pretty)', en: 'Pretty Breaks' },
    'class.arithmetic': { ja: '等差分類 (Arithmetic)', en: 'Arithmetic' },
    'class.nestedmeans': { ja: '入れ子平均 (Nested Means)', en: 'Nested Means' },
    'class.q6': { ja: 'Q6分類 (Q6)', en: 'Q6' },
    'class.custom': { ja: '手動設定 (Custom)', en: 'Custom Breaks' },
    'custom.breaksLabel': { ja: '閾値', en: 'Thresholds' },
    'custom.less': { ja: '未満', en: 'Less' },
    'custom.more': { ja: '以上', en: 'More' },
    'custom.confirm': { ja: '確定', en: 'Confirm' },
    'custom.cancel': { ja: 'キャンセル', en: 'Cancel' },
    'label.colorCount': { ja: '色数', en: 'Colors' },
    'aria.colorCount': { ja: '凡例の色数', en: 'Number of legend colors' },
    'color.n': { ja: '{n}色', en: '{n}' },
    'label.colorScheme': { ja: 'カラースキーム', en: 'Color Scheme' },
    'aria.colorScheme': { ja: 'カラースキーム', en: 'Color Scheme' },
    'label.showPlaceNames': { ja: '地名を表示', en: 'Show Place Names' },
    'label.perArea': { ja: '面積で割る（/km²）', en: 'Divide by area (/km²)' },
    'btn.downloadSvg': { ja: 'SVGダウンロード', en: 'Download SVG' },
    'btn.downloadPng': { ja: 'PNGダウンロード', en: 'Download PNG' },

    // Modal
    'modal.openProject': { ja: 'プロジェクトを開く', en: 'Open Project' },
    'modal.loading': { ja: '読み込み中...', en: 'Loading...' },
    'btn.cancel': { ja: 'キャンセル', en: 'Cancel' },

    // Header
    'header.title': { ja: '日本地図カルトグラム', en: 'Japan Cartogram' },
    'header.loadProject': { ja: 'プロジェクトの読込', en: 'Load Project' },
    'header.saveProject': { ja: 'プロジェクトの保存', en: 'Save Project' },
    'header.aboutCartogram': { ja: 'カルトグラムとは', en: 'About Cartogram' },
    'header.aboutClassification': { ja: '階級分類とは', en: 'About Classification' },

    // JS dynamic strings
    'data.sampleData': { ja: 'サンプルデータ', en: 'Sample Data' },
    'data.customData': { ja: 'カスタムデータ', en: 'Custom Data' },
    'data.uploadedFile': { ja: 'アップロードしたファイル', en: 'Uploaded File' },
    'data.uploadedData': { ja: 'アップロードデータ', en: 'Uploaded Data' },
    'data.noData': { ja: 'データなし', en: 'No data' },
    'data.loadedData': { ja: 'ロードされたデータ', en: 'Loaded Data' },
    'field.noField': { ja: '(指標未適用)', en: '(No indicator)' },
    'field.value': { ja: '値', en: 'Value' },
    'btn.applied': { ja: '適用済み', en: 'Applied' },
    'btn.processing': { ja: '処理中...', en: 'Processing...' },
    'ranking.unit': { ja: '位', en: '' },
    'ranking.label': { ja: 'ランキング', en: 'Ranking' },
    'value.label': { ja: '実数', en: 'Value' },
    'status.noValidNumbers': { ja: '有効な数値が見つかりません。', en: 'No valid numbers found.' },

    // Upload messages
    'upload.initial': {
      ja: 'CSV ファイル（UTF-8）をアップロードしてカルトグラムをカスタマイズできます。',
      en: 'Upload a CSV file (UTF-8) to customize the cartogram.'
    },
    'upload.fileTooLarge': {
      ja: 'ファイルサイズが大きすぎます（2MB以下にしてください）。',
      en: 'File is too large (max 2MB).'
    },
    'upload.reading': {
      ja: '「{name}」を読み込み中...',
      en: 'Reading "{name}"...'
    },
    'upload.parseFailed': {
      ja: 'CSV の解析に失敗しました。ファイル内容を確認してください。',
      en: 'Failed to parse CSV. Please check the file contents.'
    },
    'upload.readFailed': {
      ja: 'ファイルの読み込みに失敗しました。',
      en: 'Failed to read the file.'
    },
    'upload.loaded': {
      ja: '「{name}」を読み込みました。プレビューを確認して適用してください。',
      en: '"{name}" loaded. Review the preview and apply.'
    },
    'upload.applied': {
      ja: '「{name}」を適用しました。',
      en: '"{name}" applied.'
    },
    'upload.appliedMessage': {
      ja: 'アップロードしたデータを適用しました。別のファイルを読み込むこともできます。',
      en: 'Uploaded data applied. You can load another file.'
    },
    'upload.noPreview': {
      ja: '適用できるプレビューがありません。新しい CSV をアップロードしてください。',
      en: 'No preview to apply. Please upload a new CSV.'
    },
    'upload.previewPlaceholder': {
      ja: 'CSV をアップロードするとここにプレビューが表示されます。',
      en: 'Upload a CSV to see a preview here.'
    },

    // Validation
    'validate.noRows': { ja: 'データ行が見つかりませんでした。', en: 'No data rows found.' },
    'validate.noKeyColumn': {
      ja: 'CSV に「{col}」列が含まれていません。',
      en: 'CSV does not contain a "{col}" column.'
    },
    'validate.noNumeric': { ja: '数値として扱える列がありません。', en: 'No numeric columns found.' },

    // Table
    'table.noData': { ja: '表示できるデータがありません。', en: 'No data to display.' },
    'table.previewEmpty': { ja: 'プレビューできる行がありません。', en: 'No rows to preview.' },
    'table.showingRows': {
      ja: '先頭 {shown} 行を表示しています（全 {total} 行）。',
      en: 'Showing first {shown} of {total} rows.'
    },
    'table.showingRowsDefault': {
      ja: '先頭 {n} 行を表示しています。',
      en: 'Showing first {n} rows.'
    },
    'table.currentDataEmpty': {
      ja: '現在のデータが読み込まれていません。',
      en: 'No data currently loaded.'
    },
    'table.currentPreview': {
      ja: '先頭 {shown} 行（{name} ／ 全 {total} 行）を表示しています。',
      en: 'Showing first {shown} rows ({name} / {total} total).'
    },
    'table.samplePreview': {
      ja: 'サンプルデータを表示しています。CSV をアップロードするとここにプレビューが表示されます。',
      en: 'Showing sample data. Upload a CSV to see a preview here.'
    },

    // Stats
    'stats.summary': {
      ja: '<strong>{col}</strong>：最小 {min} ／ 最大 {max} ／ 平均 {mean}',
      en: '<strong>{col}</strong>: min {min} / max {max} / mean {mean}'
    },

    // Project / cloud
    'project.noData': { ja: '保存するデータがありません。', en: 'No data to save.' },
    'project.promptName': { ja: 'プロジェクト名を入力してください', en: 'Enter project name' },
    'project.saved': {
      ja: 'プロジェクト「{name}」を保存しました。',
      en: 'Project "{name}" saved.'
    },
    'project.saveFailed': { ja: '保存に失敗しました: ', en: 'Save failed: ' },
    'project.loadFailed': { ja: '読み込みに失敗しました: ', en: 'Load failed: ' },
    'project.noProjects': { ja: '保存されたプロジェクトはありません。', en: 'No saved projects.' },
    'project.listFailed': {
      ja: 'プロジェクト一覧の取得に失敗しました。',
      en: 'Failed to fetch project list.'
    },
    'project.confirmLoad': {
      ja: '「{name}」を読み込みますか？現在の作業内容は上書きされます。',
      en: 'Load "{name}"? Current work will be overwritten.'
    },
    'project.invalidData': { ja: '有効なプロジェクトデータが見つかりません。', en: 'No valid project data found.' },
    'project.unnamed': { ja: '名称未設定', en: 'Untitled' },
    'project.autoLoadFailed': {
      ja: 'プロジェクトの読み込みに失敗しました: ',
      en: 'Failed to load project: '
    },
    'project.saveError': { ja: '保存中にエラーが発生しました。', en: 'Error during save.' },
    'project.loadFileError': {
      ja: 'プロジェクトファイルの読み込みに失敗しました。形式が正しいか確認してください。',
      en: 'Failed to load project file. Check the format.'
    },

    // Reset
    'reset.failed': {
      ja: 'サンプルデータを読み込めません。ページを再読み込みしてください。',
      en: 'Cannot load sample data. Please reload the page.'
    },
    'reset.done': { ja: 'サンプルデータに戻しました。', en: 'Reset to sample data.' },

    // Download
    'download.noData': { ja: 'ダウンロードできるデータがありません。', en: 'No data available for download.' },
    'download.csvDone': { ja: 'CSV をダウンロードしました。', en: 'CSV downloaded.' },
    'download.csvFailed': { ja: 'CSV の生成に失敗しました。', en: 'Failed to generate CSV.' },

    // Filename parts
    'filename.noField': { ja: 'データ未選択', en: 'no-data' },
    'filename.japan': { ja: '日本', en: 'japan' },

    // Legend
    'legend.range': { ja: '～', en: '–' },
    'legend.bracketOpen': { ja: '（', en: ' (' },
    'legend.bracketClose': { ja: '）', en: ')' },

    // Auth (cloud-api)
    'auth.notLoaded': {
      ja: '認証クライアントが読み込まれていません。ページをリロードしてください。',
      en: 'Auth client not loaded. Please reload the page.'
    },
    'auth.loginRequired': { ja: 'ログインしてください。', en: 'Please log in.' }
  };

  window.t = function (key, params) {
    var entry = T[key];
    if (!entry) {
      console.warn('[i18n] Missing key: ' + key);
      return key;
    }
    var text = entry[LANG] || entry['ja'] || key;
    if (params) {
      Object.keys(params).forEach(function (p) {
        text = text.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
      });
    }
    return text;
  };

  window.LANG = LANG;

  function translateHTML() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var paramsStr = el.getAttribute('data-i18n-params');
      var params = paramsStr ? JSON.parse(paramsStr) : undefined;
      var translated = t(key, params);
      if (translated !== key) {
        el.textContent = translated;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var translated = t(key);
      if (translated !== key) {
        el.innerHTML = translated;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var translated = t(key);
      if (translated !== key) {
        el.placeholder = translated;
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var translated = t(key);
      if (translated !== key) {
        el.setAttribute('aria-label', translated);
      }
    });
    document.title = t('page.title');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', translateHTML);
  } else {
    translateHTML();
  }
})();
