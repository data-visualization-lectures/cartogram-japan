// hide the form if the browser doesn't do SVG,
// (then just let everything else fail)
if (!document.createElementNS) {
  var fallbackForm = document.querySelector("form");
  if (fallbackForm) {
    fallbackForm.style.display = "none";
  }
}

var KEY_COLUMN = "都道府県",
    MAX_FILE_SIZE = 2 * 1024 * 1024,
    PREVIEW_ROW_COUNT = 6,
    CURRENT_PREVIEW_ROW_COUNT = 12,
    DEFAULT_COLOR_SCHEME_ID = "blues";

var COLOR_SCHEMES = [
  { id: "blues", name: "Blues", interpolator: d3.interpolateBlues },
  { id: "greens", name: "Greens", interpolator: d3.interpolateGreens },
  { id: "oranges", name: "Oranges", interpolator: d3.interpolateOranges },
  { id: "purples", name: "Purples", interpolator: d3.interpolatePurples },
  { id: "reds", name: "Reds", interpolator: d3.interpolateReds },
  { id: "viridis", name: "Viridis", interpolator: d3.interpolateViridis },
  { id: "inferno", name: "Inferno", interpolator: d3.interpolateInferno },
  { id: "magma", name: "Magma", interpolator: d3.interpolateMagma },
  { id: "plasma", name: "Plasma", interpolator: d3.interpolatePlasma },
  { id: "cividis", name: "Cividis", interpolator: d3.interpolateCividis },
  { id: "turbo", name: "Turbo", interpolator: d3.interpolateTurbo }
];

var fields = [],
    fieldsById = d3.map(),
    field = null,
    rawData,
    pendingDataset = null,
    originalData = null,
    isInitialized = false,
    currentColorScheme = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);

var body = d3.select("body"),
    stat = d3.select("#status");

var fileInput = d3.select("#file-input"),
    dropzone = d3.select("#dropzone"),
    uploadStatus = d3.select("#upload-status"),
    previewTable = d3.select("#preview-table"),
    previewStats = d3.select("#preview-stats"),
    applyButton = d3.select("#apply-data"),
    resetButton = d3.select("#reset-data"),
    currentDataLabel = d3.select("#current-data-label"),
    currentDataPreview = d3.select("#current-data-preview"),
    toggleCurrentPreviewButton = d3.select("#toggle-current-preview"),
    downloadSvgButton = d3.select("#download-svg-btn"),
    downloadPngButton = d3.select("#download-png-btn"),
    colorSchemeSelect = d3.select("#color-scheme");

var applyButtonDefaultText = applyButton.text(),
    applyButtonAppliedText = "適用済み";

var currentPreviewVisible = true,
    currentDatasetName = "サンプルデータ";

function resetFileInputValue() {
  var node = fileInput.node();
  if (!node) {
    return;
  }
  node.value = "";
  if (node.value) {
    node.type = "text";
    node.type = "file";
  }
}

function shouldBypassDropzoneClick(event) {
  if (!event || !event.target) {
    return false;
  }
  var target = event.target;
  if (target === fileInput.node()) {
    return true;
  }
  if (target.closest && target.closest(".file-input-label")) {
    return true;
  }
  return false;
}

function initializeColorSchemeOptions() {
  var options = colorSchemeSelect.selectAll("option")
    .data(COLOR_SCHEMES, function(d) { return d.id; });

  options.enter()
    .append("option")
    .merge(options)
      .attr("value", function(d) { return d.id; })
      .text(function(d) { return d.name; });

  colorSchemeSelect.on("change", function() {
    setColorScheme(this.value);
  });

  setColorScheme(currentColorScheme && currentColorScheme.id, { silent: true });
}

function setColorScheme(id, options) {
  var nextScheme = getColorSchemeById(id) || COLOR_SCHEMES[0];
  var hasChanged = !currentColorScheme || currentColorScheme.id !== nextScheme.id;
  currentColorScheme = nextScheme;
  colorSchemeSelect.property("value", currentColorScheme.id);
  if (hasChanged && (!options || !options.silent)) {
    if (field && field.id !== "none") {
      deferredUpdate();
    }
  }
}

function getColorSchemeById(id) {
  if (!id) {
    return null;
  }
  for (var i = 0; i < COLOR_SCHEMES.length; i++) {
    if (COLOR_SCHEMES[i].id === id) {
      return COLOR_SCHEMES[i];
    }
  }
  return null;
}

var fieldSelect = d3.select("#field")
  .on("change", function() {
    field = fields[this.selectedIndex];
    updateFieldSelection();
  });

if (!currentColorScheme) {
  currentColorScheme = COLOR_SCHEMES[0];
}

initializeColorSchemeOptions();

applyButton.property("disabled", true);
applyButton.text(applyButtonDefaultText);
setCurrentDataPreviewDefault();
setUploadStatus("CSV ファイル（UTF-8）をアップロードしてカルトグラムをカスタマイズできます。", "info");

fileInput.on("change", function() {
  var file = this.files && this.files[0];
  if (file) {
    handleFileUpload(file);
  }
  resetFileInputValue();
});

dropzone
  .on("dragover", function() {
    d3.event.preventDefault();
    dropzone.classed("dragover", true);
  })
  .on("dragleave", function() {
    dropzone.classed("dragover", false);
  })
  .on("drop", function() {
    d3.event.preventDefault();
    dropzone.classed("dragover", false);
    var event = d3.event;
    var file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      handleFileUpload(file);
    }
  })
  .on("click", function() {
    var event = d3.event;
    if (shouldBypassDropzoneClick(event)) {
      return;
    }
    fileInput.node().click();
  });

toggleCurrentPreviewButton.on("click", function() {
  currentPreviewVisible = !currentPreviewVisible;
  toggleCurrentPreviewButton.text(currentPreviewVisible ? "表データを隠す" : "表データを表示");
  currentDataPreview.classed("is-hidden", !currentPreviewVisible);
  if (currentPreviewVisible) {
    renderCurrentDataPreview();
  }
});

downloadSvgButton.on("click", downloadCurrentSvg);
downloadPngButton.on("click", downloadCurrentPng);

applyButton.on("click", applyPendingData);
resetButton.on("click", resetToSampleData);


var map = d3.select("#map"),
    layer = map.append("g")
          .attr("id", "layer"),
    states = layer.append("g")
      .attr("id", "states")
      .selectAll("path");


var proj = d3.geoMercator()
    .center([138, 36])
    .scale(1450)
    .translate([400, 400]),
    topology,
    geometries,
    dataById = {},
    carto = d3.cartogram()
      .projection(proj)
      .properties(function(d) {
        return dataById.get(d.properties.nam_ja);
      })
      .value(function(d) {
        return field && field.key ? +d.properties[field.key] : 1;
      });

window.onhashchange = function() {
  parseHash();
};

d3.json("data/japan.topojson", function(topo) {
  topology = topo;
  geometries = topology.objects.japan.geometries;
  d3.csv("data/theme.csv", function(data) {
    originalData = cloneDataset(data);
    loadDataset(cloneDataset(data), {
      deferRender: true,
      label: "サンプルデータ",
      isSample: true,
      defaultToNone: true,
      preserveField: false
    });
    init();
  });
});

function init() {
  var features = carto.features(topology, geometries),
      path = d3.geoPath()
        .projection(proj);

  states = states.data(features)
    .enter()
    .append("path")
      .attr("class", "state")
      .attr("id", function(d) {
        return d.properties.nam_ja;
      })
      .attr("fill", "#fafafa")
      .attr("d", path);

  states.append("title");

  parseHash();
  isInitialized = true;
}

function reset() {
  stat.text("");
  stat.classed("empty", true);
  body.classed("updating", false);

  var features = carto.features(topology, geometries),
      path = d3.geoPath()
        .projection(proj);

  states.data(features)
    .transition()
      .duration(750)
      .ease(d3.easeLinear)
      .attr("fill", "#fafafa")
      .attr("d", path);

  states.select("title")
    .text(function(d) {
      return d.properties.nam_ja;
    });
}

function update() {
  var start = Date.now();
  body.classed("updating", true);

  var key = field.key,
      fmt = d3.format(","),
      value = function(d) {
        return +d.properties[key];
      },
      values = states.data()
        .map(value)
        .filter(function(n) {
          return !isNaN(n);
        })
        .sort(d3.ascending);

  if (!values.length) {
    stat.text("有効な数値が見つかりません。");
    body.classed("updating", false);
    return;
  }

  var lo = values[0],
      hi = values[values.length - 1];

  var colorInterpolator = (currentColorScheme && currentColorScheme.interpolator) || d3.interpolateBlues;

  var color = d3.scaleSequential()
    .interpolator(colorInterpolator)
    .domain([lo, hi]);

  // normalize the scale to positive numbers
  var scale = d3.scaleLinear()
    .domain([lo, hi])
    .range([1, 1000]);

  // tell the cartogram to use the scaled values
  carto.value(function(d) {
    var currentValue = value(d);
    if (isNaN(currentValue)) {
      return 1;
    }
    return scale(currentValue);
  });

  // generate the new features, pre-projected
  var features = carto(topology, geometries).features;

  // update the data
  states.data(features)
    .select("title")
      .text(function(d) {
        var originalValue = value(d);
        var displayValue = isNaN(originalValue) ? "データなし" : fmt(originalValue);
        return [d.properties.nam_ja, displayValue].join(": ");
      });

  states.transition()
    .duration(750)
    .ease(d3.easeLinear)
    .attr("fill", function(d) {
      var colorValue = value(d);
      return isNaN(colorValue) ? "#f0f0f0" : color(colorValue);
    })
    .attr("d", carto.path);

  var delta = (Date.now() - start) / 1000;
  stat.text(["calculated in", delta.toFixed(1), "seconds"].join(" "));
  stat.classed("empty", false);
  body.classed("updating", false);
}

var deferredUpdate = (function() {
  var timeout;
  return function() {
    var args = arguments;
    clearTimeout(timeout);
    stat.text("calculating...");
    return timeout = setTimeout(function() {
      update.apply(null, arguments);
    }, 10);
  };
})();

function updateFieldSelection() {
  if (!field) {
    return;
  }

  if (fields.length) {
    fieldSelect.property("selectedIndex", Math.max(fields.indexOf(field), 0));
  }

  if (field.id === "none") {
    reset();
  } else {
    deferredUpdate();
  }
}

function loadDataset(data, options) {
  options = options || {};
  rawData = data || [];
  dataById = d3.nest()
    .key(function(d) { return d[KEY_COLUMN]; })
    .rollup(function(d) { return d[0]; })
    .map(rawData);

  var nextFields = buildFieldsFromData(rawData);
  fields = nextFields;
  fieldsById = buildFieldIndex(nextFields);

  var preferredKey = options.forceFieldKey || ((options.preserveField === false) ? null : (field && field.key));
  field = selectDefaultField(nextFields, preferredKey, options.defaultToNone);

  refreshFieldOptions();
  updateCurrentDatasetLabel(options.label || "カスタムデータ", options.isSample);
  renderCurrentDataPreview();

  stat.text("");
  stat.classed("empty", true);

  if (field && isInitialized && !options.deferRender) {
    updateFieldSelection();
  }
}

function buildFieldsFromData(data) {
  var availableFields = [{
    name: "(指標未適用)",
    id: "none"
  }];

  if (!data || !data.length) {
    return availableFields;
  }

  var numericColumns = getNumericColumns(data);

  numericColumns.forEach(function(header, index) {
    var baseId = header.toLowerCase().replace(/[^a-z0-9]/g, "_") || ("field_" + index);
    var uniqueId = baseId + "_" + index;
    availableFields.push({
      name: header,
      id: uniqueId,
      key: header
    });
  });

  return availableFields;
}

function buildFieldIndex(items) {
  var map = d3.map();
  items.forEach(function(item) {
    map.set(item.id, item);
  });
  return map;
}

function refreshFieldOptions() {
  var options = fieldSelect.selectAll("option")
    .data(fields, function(d) { return d.id; });

  options.exit().remove();

  options.enter()
    .append("option")
    .merge(options)
      .attr("value", function(d) { return d.id; })
      .text(function(d) { return d.name; });

  if (fields.length) {
    fieldSelect.property("selectedIndex", Math.max(fields.indexOf(field), 0));
  }
}

function getNumericColumns(data) {
  if (!data || !data.length) {
    return [];
  }

  var headers = Object.keys(data[0]).filter(function(header) {
    return header !== KEY_COLUMN;
  });

  return headers.filter(function(header) {
    return data.some(function(row) {
      var value = row[header];
      return value !== undefined && value !== null && value !== "" && !isNaN(+value);
    });
  });
}

function handleFileUpload(file) {
  if (!file) {
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    setUploadStatus("ファイルサイズが大きすぎます（2MB以下にしてください）。", "danger");
    return;
  }

  setUploadStatus("「" + file.name + "」を読み込み中...", "info");

  var reader = new FileReader();
  reader.onload = function(evt) {
    try {
      var text = (evt.target.result || "").trim();
      var parsed = d3.csvParse(text);
      preparePreview(parsed, file.name);
    } catch (error) {
      console.error(error);
      setUploadStatus("CSV の解析に失敗しました。ファイル内容を確認してください。", "danger");
      clearPreview();
    }
  };

  reader.onerror = function() {
    setUploadStatus("ファイルの読み込みに失敗しました。", "danger");
    clearPreview();
  };

  reader.readAsText(file, "utf-8");
}


function preparePreview(data, filename) {
  var label = filename || "アップロードしたファイル";
  var validation = validateDataset(data);

  if (!validation.valid) {
    setUploadStatus(validation.message, "danger");
    clearPreview();
    return;
  }

  pendingDataset = {
    data: data,
    filename: label,
    numericColumns: validation.numericColumns
  };

  renderPreviewTable(data);
  renderPreviewStats(data, validation.numericColumns);
  setUploadStatus("「" + label + "」を読み込みました。プレビューを確認して適用してください。", "success");
  applyButton
    .property("disabled", false)
    .text(applyButtonDefaultText);
}

function validateDataset(data) {
  if (!data || !data.length) {
    return { valid: false, message: "データ行が見つかりませんでした。" };
  }

  var headers = Object.keys(data[0]);
  if (headers.indexOf(KEY_COLUMN) === -1) {
    return { valid: false, message: "CSV に「" + KEY_COLUMN + "」列が含まれていません。" };
  }

  var numericColumns = getNumericColumns(data);
  if (!numericColumns.length) {
    return { valid: false, message: "数値として扱える列がありません。" };
  }

  return {
    valid: true,
    numericColumns: numericColumns
  };
}

function clearPreview() {
  pendingDataset = null;
  previewTable.html("<p class='text-muted'>CSV をアップロードするとここにプレビューが表示されます。</p>");
  previewStats.html("");
  applyButton
    .property("disabled", true)
    .text(applyButtonDefaultText);
}

function renderPreviewTable(data) {
  renderTableInto(previewTable, data, {
    rowCount: PREVIEW_ROW_COUNT,
    emptyMessage: "プレビューできる行がありません。",
    note: function(shownRows, totalRows) {
      return "先頭 " + shownRows + " 行を表示しています（全 " + totalRows + " 行）。";
    }
  });
}

function renderPreviewStats(data, numericColumns) {
  if (!numericColumns || !numericColumns.length) {
    previewStats.html("");
    return;
  }

  var fmt = d3.format(",.2f");

  var statsHtml = numericColumns.map(function(column) {
    var values = data
      .map(function(row) { return +row[column]; })
      .filter(function(value) { return !isNaN(value); });

    var min = d3.min(values);
    var max = d3.max(values);
    var mean = d3.mean(values);

    return "<p><strong>" + column + "</strong>：最小 " + fmt(min) + " ／ 最大 " + fmt(max) + " ／ 平均 " + fmt(mean) + "</p>";
  }).join("");

  previewStats.html(statsHtml);
}

function setUploadStatus(message, tone) {
  var classes = ["help-text"];
  if (tone) {
    classes.push("tone-" + tone);
  }
  uploadStatus
    .attr("class", classes.join(" "))
    .text(message || "");
}

function renderTableInto(container, data, options) {
  options = options || {};
  if (!data || !data.length) {
    container.html("<p class='text-muted'>" + (options.emptyMessage || "表示できるデータがありません。") + "</p>");
    return;
  }

  var headers = Object.keys(data[0]);
  var rowCount = Math.min(options.rowCount || data.length, data.length);
  var rows = data.slice(0, rowCount);

  var headerHtml = headers.map(function(header) {
    return "<th>" + header + "</th>";
  }).join("");

  var rowsHtml = rows.map(function(row) {
    var cells = headers.map(function(header) {
      var value = row[header];
      return "<td>" + (value !== undefined ? value : "") + "</td>";
    }).join("");
    return "<tr>" + cells + "</tr>";
  }).join("");

  var note;
  if (typeof options.note === "function") {
    note = options.note(rowCount, data.length);
  } else {
    note = options.note || "先頭 " + rowCount + " 行を表示しています。";
  }

  var tableHtml = ""
    + "<table class='data-table'>"
    +   "<thead><tr>" + headerHtml + "</tr></thead>"
    +   "<tbody>" + rowsHtml + "</tbody>"
    + "</table>"
    + "<p class='text-muted small-text'>" + note + "</p>";

  container.html(tableHtml);
}

function renderCurrentDataPreview() {
  if (!rawData || !rawData.length) {
    currentDataPreview
      .classed("is-hidden", !currentPreviewVisible)
      .html("<p class='text-muted'>現在のデータが読み込まれていません。</p>");
    return;
  }

  renderTableInto(currentDataPreview, rawData, {
    rowCount: CURRENT_PREVIEW_ROW_COUNT,
    emptyMessage: "現在のデータが読み込まれていません。",
    note: function(shownRows, totalRows) {
      return "先頭 " + shownRows + " 行（" + currentDatasetName + " ／ 全 " + totalRows + " 行）を表示しています。";
    }
  });
}

function updateCurrentDatasetLabel(label, isSample) {
  currentDatasetName = label;
  var tagClass = "status-value " + (isSample ? "is-sample" : "is-custom");
  currentDataLabel
    .attr("class", tagClass)
    .text(label);
}

function setCurrentDataPreviewDefault() {
  currentPreviewVisible = true;
  toggleCurrentPreviewButton.text("表データを隠す");
  currentDataPreview
    .classed("is-hidden", false);
  renderCurrentDataPreview();
}

function applyPendingData() {
  if (!pendingDataset) {
    setUploadStatus("適用できるプレビューがありません。新しい CSV をアップロードしてください。", "danger");
    return;
  }

  var datasetLabel = pendingDataset.filename || "アップロードデータ";

  loadDataset(cloneDataset(pendingDataset.data), {
    label: datasetLabel,
    isSample: false,
    preserveField: false,
    defaultToNone: true
  });

  setUploadStatus("「" + datasetLabel + "」を適用しました。", "success");

  clearPreview();
  previewTable.html("<p class='text-success'>アップロードしたデータを適用しました。別のファイルを読み込むこともできます。</p>");
  applyButton.text(applyButtonAppliedText);
  currentPreviewVisible = false;
  toggleCurrentPreviewButton.text("表データを表示");
  currentDataPreview.classed("is-hidden", true);
}

function resetToSampleData() {
  if (!originalData || !originalData.length) {
    setUploadStatus("サンプルデータを読み込めません。ページを再読み込みしてください。", "danger");
    return;
  }

  loadDataset(cloneDataset(originalData), {
    label: "サンプルデータ",
    isSample: true,
    defaultToNone: true,
    preserveField: false
  });
  clearPreview();
  previewTable.html("<p class='text-muted'>サンプルデータを表示しています。CSV をアップロードするとここにプレビューが表示されます。</p>");
  setUploadStatus("サンプルデータに戻しました。", "info");
}

function cloneDataset(data) {
  return (data || []).map(function(row) {
    var copy = {};
    Object.keys(row).forEach(function(key) {
      copy[key] = row[key];
    });
    return copy;
  });
}

function downloadCurrentSvg() {
  var svgNode = document.getElementById("map");
  if (!svgNode) {
    console.warn("SVG が見つかりません。");
    return;
  }

  var serialized = serializeSvg(svgNode);
  var blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, getDownloadFilename("svg"));
}

function downloadCurrentPng() {
  var svgNode = document.getElementById("map");
  if (!svgNode) {
    console.warn("SVG が見つかりません。");
    return;
  }

  setButtonLoading(downloadPngButton, true);

  var serialized = serializeSvg(svgNode);
  var dims = extractSvgDimensions(svgNode);
  var svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(svgBlob);
  var image = new Image();
  image.onload = function() {
    var canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(function(blob) {
      if (blob) {
        triggerDownload(blob, getDownloadFilename("png"));
      }
      setButtonLoading(downloadPngButton, false);
    }, "image/png");
  };
  image.onerror = function(error) {
    console.error("PNG 生成中にエラーが発生しました。", error);
    URL.revokeObjectURL(url);
    setButtonLoading(downloadPngButton, false);
  };
  image.src = url;
}

function serializeSvg(svgNode) {
  var clone = svgNode.cloneNode(true);
  var dims = extractSvgDimensions(svgNode);
  var viewBox = svgNode.getAttribute("viewBox");
  clone.setAttribute("width", dims.width);
  clone.setAttribute("height", dims.height);
  if (!viewBox) {
    clone.setAttribute("viewBox", "0 0 " + dims.width + " " + dims.height);
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  var style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.textContent = "path.state{stroke:#666;stroke-width:.5;}";
  clone.insertBefore(style, clone.firstChild);

  var background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#ffffff");
  clone.insertBefore(background, style.nextSibling);

  var serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>' + serializer.serializeToString(clone);
}

function extractSvgDimensions(svgNode) {
  var bbox = svgNode.getBoundingClientRect();
  var width = bbox && bbox.width ? bbox.width : null;
  var height = bbox && bbox.height ? bbox.height : null;

  if (!(width && height)) {
    width = parseFloat(svgNode.getAttribute("width"));
    height = parseFloat(svgNode.getAttribute("height"));
  }

  if (!(width && height)) {
    var viewBox = svgNode.getAttribute("viewBox");
    if (viewBox) {
      var parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    }
  }

  if (!(width && height)) {
    var bbox = svgNode.getBoundingClientRect();
    width = bbox.width;
    height = bbox.height;
  }

  return {
    width: Math.max(1, Math.round(width || 800)),
    height: Math.max(1, Math.round(height || 600))
  };
}

function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getDownloadFilename(ext) {
  var parts = ["japan-cartogram"];
  if (currentDatasetName) {
    parts.push(slugify(currentDatasetName));
  }
  if (field && field.name && field.id !== "none") {
    parts.push(slugify(field.name));
  }
  var base = parts.filter(Boolean).join("-");
  return base + "." + ext;
}

function slugify(value) {
  if (!value) {
    return "";
  }
  return value.toString()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^0-9A-Za-z\u3000-\u30FF\u4E00-\u9FFF_-]/g, "")
    .replace(/-+/g, "-");
}

function setButtonLoading(buttonSelection, isLoading) {
  buttonSelection
    .classed("is-loading", isLoading)
    .property("disabled", isLoading);
}
function selectDefaultField(fields, preferredKey, defaultToNone) {
  if (!fields || !fields.length) {
    return null;
  }

  var match = null;
  if (preferredKey) {
    match = fields.find(function(f) {
      return f.key === preferredKey;
    });
  }

  if (match) {
    return match;
  }

  if (defaultToNone) {
    return fields[0];
  }

  var firstNumeric = fields.find(function(f) {
    return f.id !== "none";
  });

  return firstNumeric || fields[0];
}
