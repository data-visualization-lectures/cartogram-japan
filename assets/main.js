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

var RANKING_SUFFIX = " ランキング";
var COLOR_SCHEME_GROUPS = [
  {
    label: "ColorBrewer",
    type: "sequential",
    schemes: [
      { id: "blues", name: "Blues", interpolator: d3.interpolateBlues },
      { id: "greens", name: "Greens", interpolator: d3.interpolateGreens },
      { id: "oranges", name: "Oranges", interpolator: d3.interpolateOranges },
      { id: "purples", name: "Purples", interpolator: d3.interpolatePurples },
      { id: "reds", name: "Reds", interpolator: d3.interpolateReds }
    ]
  },
  {
    label: "Matplotlib",
    type: "sequential",
    schemes: [
      { id: "viridis", name: "Viridis", interpolator: d3.interpolateViridis },
      { id: "inferno", name: "Inferno", interpolator: d3.interpolateInferno },
      { id: "magma", name: "Magma", interpolator: d3.interpolateMagma },
      { id: "plasma", name: "Plasma", interpolator: d3.interpolatePlasma },
      { id: "cividis", name: "Cividis", interpolator: d3.interpolateCividis },
      { id: "turbo", name: "Turbo", interpolator: d3.interpolateTurbo }
    ]
  },
  {
    label: "Diverging",
    type: "diverging",
    schemes: [
      { id: "rdbu", name: "Red-Blue", interpolator: d3.interpolateRdBu },
      { id: "prgn", name: "Purple-Green", interpolator: d3.interpolatePRGn },
      { id: "puor", name: "Purple-Orange", interpolator: d3.interpolatePuOr },
      { id: "piyg", name: "Pink-Yellow-Green", interpolator: d3.interpolatePiYG }
    ]
  }
];

var COLOR_SCHEMES = [];

var fields = [],
  fieldsById = d3.map(),
  field = null,
  rawData,
  pendingDataset = null,
  originalData = null,
  isInitialized = false,
  currentColorScheme = null,
  currentLegendCells = 5,
  legendUnit = "",
  legendUnitCache = "",
  currentMode = "value",
  currentClassificationMethod = "quantile",
  currentBreaks = null,
  currentCustomBreaks = null,
  lastAutoBreaks = null,
  customBreaksSnapshot = null,
  pendingCustomBreaks = null,
  areaByLabel = d3.map(),
  perAreaEnabled = false,
  colorReversed = false;

var body = d3.select("body"),
  stat = d3.select("#status");

var fileInput = d3.select("#file-input"),
  dropzone = d3.select("#dropzone"),
  uploadStatus = d3.select("#upload-status"),
  preview = d3.select("#preview"),
  previewTable = d3.select("#preview-table"),
  previewStats = d3.select("#preview-stats"),
  applyButton = d3.select("#apply-data"),
  resetButton = d3.select("#reset-data"),
  currentDataLabel = d3.select("#current-data-label"),
  currentDataPreview = d3.select("#current-data-preview"),
  toggleCurrentPreviewButton = d3.select("#toggle-current-preview"),
  downloadSvgButton = d3.select("#download-svg-btn"),
  downloadPngButton = d3.select("#download-png-btn"),
  colorSchemeSelect = d3.select("#color-scheme"),
  legendCellsSelect = d3.select("#legend-cells"),
  legendUnitInput = d3.select("#legend-unit"),
  displayModeSelect = d3.select("#display-mode"),
  classMethodSelect = d3.select("#classification-method"),
  placeNameToggle = d3.select("#toggle-place-names"),
  perAreaToggle = d3.select("#toggle-per-area"),
  colorReversedToggle = d3.select("#toggle-color-reversed"),
  downloadDataButton = d3.select("#download-data-csv"),
  loadProjectButton = d3.select("#btn-load-project"),
  saveProjectButton = d3.select("#btn-save-project"),
  projectFileInput = d3.select("#project-file-input");

var applyButtonDefaultText = applyButton.text(),
  applyButtonAppliedText = t('btn.applied');

var currentPreviewVisible = true,
  currentDatasetName = t('data.sampleData');

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

function getVisibleColorGroups() {
  return COLOR_SCHEME_GROUPS.filter(function (group) {
    return currentMode === "ranking" ? group.type === "diverging" : group.type === "sequential";
  });
}

function initializeColorSchemeOptions() {
  colorSchemeSelect.selectAll("optgroup").remove();
  COLOR_SCHEMES = [];

  var groups = getVisibleColorGroups();
  groups.forEach(function (group) {
    var optgroup = colorSchemeSelect.append("optgroup")
      .attr("label", group.label);

    optgroup.selectAll("option")
      .data(group.schemes, function (d) { return d.id; })
      .enter()
      .append("option")
      .attr("value", function (d) { return d.id; })
      .text(function (d) { return d.name; });

    COLOR_SCHEMES = COLOR_SCHEMES.concat(group.schemes);
  });

  colorSchemeSelect.on("change", function () {
    setColorScheme(this.value);
  });

  var preferredScheme = getColorSchemeById(currentColorScheme && currentColorScheme.id) || getColorSchemeById(DEFAULT_COLOR_SCHEME_ID) || COLOR_SCHEMES[0];
  if (preferredScheme) {
    setColorScheme(preferredScheme.id, { silent: true });
  } else {
    currentColorScheme = null;
  }
}

function initializeClassificationMethodOptions() {
  var methods = SettingClass.CLASSIFICATION_METHODS;
  classMethodSelect.selectAll("option").remove();
  Object.keys(methods).forEach(function (key) {
    if (key === "custom") return;
    classMethodSelect.append("option")
      .attr("value", key)
      .text(methods[key]);
  });
  classMethodSelect.append("option")
    .attr("value", "custom")
    .text(t('class.custom'));
  classMethodSelect.property("value", currentClassificationMethod);
  updateLegendCellsForMethod();
}

function updateLegendCellsForMethod() {
  var method = currentClassificationMethod;
  if (method === "custom") {
    legendCellsSelect.property("disabled", true);
    return;
  }
  legendCellsSelect.property("disabled", false);
  legendCellsSelect.selectAll("option").each(function () {
    var option = d3.select(this);
    var value = +option.attr("value");
    if (method === "q6") {
      option.attr("disabled", value !== 6 ? true : null);
    } else if (method === "nestedmeans") {
      option.attr("disabled", value !== 4 ? true : null);
    } else if (currentMode === "ranking") {
      option.attr("disabled", value % 2 === 0 ? true : null);
    } else {
      option.attr("disabled", null);
    }
  });
  if (method === "q6") {
    legendCellsSelect.property("value", 6);
    currentLegendCells = 6;
  } else if (method === "nestedmeans") {
    legendCellsSelect.property("value", 4);
    currentLegendCells = 4;
  } else if (currentMode === "ranking") {
    var currentValue = +legendCellsSelect.property("value");
    if (currentValue % 2 === 0) {
      legendCellsSelect.property("value", 5);
      currentLegendCells = 5;
    }
  }
}

function setColorScheme(id, options) {
  if (!COLOR_SCHEMES.length) {
    currentColorScheme = null;
    colorSchemeSelect.property("value", null);
    return;
  }
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

function setDisplayMode(mode) {
  var nextMode = mode === "ranking" ? "ranking" : "value";
  if (currentMode === nextMode) {
    return;
  }
  displayModeSelect.property("value", nextMode);
  currentMode = nextMode;
  if (currentMode === "ranking") {
    if (currentClassificationMethod === "custom") {
      currentClassificationMethod = "quantile";
      classMethodSelect.property("value", "quantile");
      currentCustomBreaks = null;
      hideCustomBreaksUI();
    }
    legendUnitCache = legendUnit;
    legendUnit = t('ranking.unit');
    legendUnitInput
      .property("value", legendUnit)
      .property("disabled", true);
    classMethodSelect.property("disabled", true);
    colorReversedToggle.property("disabled", true);
  } else {
    legendUnit = legendUnitCache || "";
    legendUnitInput
      .property("value", legendUnit)
      .property("disabled", false);
    classMethodSelect.property("disabled", false);
    colorReversedToggle.property("disabled", false);
  }
  initializeColorSchemeOptions();
  updateLegendCellsForMethod();
  if (field && field.id !== "none") {
    deferredUpdate();
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
  .on("change", function () {
    field = fields[this.selectedIndex];
    if (field && field.id !== "none") {
      legendCellsSelect.property("disabled", false);
      colorSchemeSelect.property("disabled", false);
      displayModeSelect.property("disabled", false);
      classMethodSelect.property("disabled", currentMode === "ranking");
      initializeColorSchemeOptions();
    }
    updateFieldSelection();
  });

displayModeSelect.on("change", function () {
  setDisplayMode(this.value);
});

classMethodSelect.on("change", function () {
  var newMethod = this.value;
  if (newMethod === "custom") {
    currentCustomBreaks = lastAutoBreaks ? lastAutoBreaks.slice() : (currentBreaks ? currentBreaks.slice() : null);
    showCustomBreaksUI();
  } else {
    currentCustomBreaks = null;
    hideCustomBreaksUI();
  }
  currentClassificationMethod = newMethod;
  updateLegendCellsForMethod();
  if (field && field.id !== "none") {
    deferredUpdate();
  }
});

initializeClassificationMethodOptions();
setDisplayMode(currentMode);

legendCellsSelect.on("change", function () {
  currentLegendCells = +this.value;
  if (field && field.id !== "none") {
    deferredUpdate();
  }
});

legendUnitInput.on("input", function () {
  legendUnit = (this.value || "").trim();
  if (currentMode === "value") {
    legendUnitCache = legendUnit;
  }
  if (field && field.id !== "none") {
    deferredUpdate();
  }
});

placeNameToggle.on("change", function () {
  renderPlaceLabels();
});

colorReversedToggle.on("change", function () {
  colorReversed = this.checked;
  if (field && field.id !== "none") {
    deferredUpdate();
  }
});

perAreaToggle.on("change", function () {
  perAreaEnabled = this.checked;
  if (perAreaEnabled) {
    var base = legendUnitCache || "";
    legendUnit = base ? base + "/km²" : "/km²";
  } else {
    legendUnit = legendUnitCache || "";
  }
  legendUnitInput.property("value", legendUnit);
  if (field && field.id !== "none") {
    deferredUpdate();
  }
});

function updateLegendCellsOptions() {
  updateLegendCellsForMethod();
}

// --- Custom Breaks Editor ---
var customBreaksEditor = d3.select(".map-select")
  .append("div")
  .attr("id", "custom-breaks-editor")
  .attr("class", "custom-breaks-editor is-hidden");

customBreaksEditor.append("div").attr("class", "custom-breaks-header")
  .append("span").attr("class", "custom-breaks-title").text("LEGEND");
customBreaksEditor.append("div").attr("class", "custom-breaks-rows");
customBreaksEditor.append("div").attr("class", "custom-breaks-footer");

function showCustomBreaksUI() {
  customBreaksSnapshot = currentCustomBreaks ? currentCustomBreaks.slice() : null;
  pendingCustomBreaks = currentCustomBreaks ? currentCustomBreaks.slice() : null;
  customBreaksEditor.classed("is-hidden", false);
  renderCustomBreakInputs();
}

function hideCustomBreaksUI() {
  customBreaksEditor.classed("is-hidden", true);
  customBreaksEditor.select(".custom-breaks-rows").selectAll("*").remove();
  customBreaksEditor.select(".custom-breaks-footer").selectAll("*").remove();
  pendingCustomBreaks = null;
}

function renderCustomBreakInputs() {
  var rowsContainer = customBreaksEditor.select(".custom-breaks-rows");
  var footerContainer = customBreaksEditor.select(".custom-breaks-footer");
  rowsContainer.selectAll("*").remove();
  footerContainer.selectAll("*").remove();
  if (!pendingCustomBreaks || pendingCustomBreaks.length < 2) return;

  var nClasses = pendingCustomBreaks.length - 1;
  var interpolator = (currentColorScheme && currentColorScheme.interpolator) || d3.interpolateBlues;
  var colors = buildColorSamples(interpolator, nClasses);

  for (var i = 0; i < nClasses; i++) {
    (function (classIdx) {
      var row = rowsContainer.append("div").attr("class", "custom-breaks-row");

      // color swatch
      row.append("span")
        .attr("class", "break-swatch")
        .style("background", colors[classIdx]);

      // lower bound
      if (classIdx === 0) {
        row.append("span").attr("class", "break-label").text(t('custom.less'));
      } else {
        row.append("input")
          .attr("type", "number")
          .attr("step", "any")
          .attr("class", "break-input")
          .property("value", formatBreakValue(pendingCustomBreaks[classIdx]))
          .on("change", function () {
            onCustomBreakChange(classIdx, this.value);
          });
      }

      // dash separator
      row.append("span").attr("class", "break-dash").text("—");

      // upper bound
      if (classIdx === nClasses - 1) {
        row.append("span").attr("class", "break-label").text(t('custom.more'));
      } else {
        row.append("input")
          .attr("type", "number")
          .attr("step", "any")
          .attr("class", "break-input")
          .property("value", formatBreakValue(pendingCustomBreaks[classIdx + 1]))
          .on("change", function () {
            onCustomBreakChange(classIdx + 1, this.value);
          });
      }
    })(i);
  }

  // footer: +/- buttons and cancel/confirm
  if (nClasses < 9) {
    footerContainer.append("button")
      .attr("class", "break-btn")
      .attr("type", "button")
      .text("+")
      .on("click", addCustomBreak);
  }
  if (nClasses > 2) {
    footerContainer.append("button")
      .attr("class", "break-btn")
      .attr("type", "button")
      .text("\u2212")
      .on("click", removeCustomBreak);
  }

  footerContainer.append("span").style("flex", "1");

  footerContainer.append("button")
    .attr("class", "break-btn-text break-btn-cancel")
    .attr("type", "button")
    .text(t('custom.cancel'))
    .on("click", cancelCustomBreaks);

  footerContainer.append("button")
    .attr("class", "break-btn-text break-btn-confirm")
    .attr("type", "button")
    .text(t('custom.confirm'))
    .on("click", confirmCustomBreaks);
}

function formatBreakValue(v) {
  if (Number.isInteger(v)) return String(v);
  return Number(v.toPrecision(6)).toString();
}

function onCustomBreakChange(index, rawValue) {
  var parsed = parseFloat(rawValue);
  if (isNaN(parsed) || !isFinite(parsed)) return;
  var min = pendingCustomBreaks[0];
  var max = pendingCustomBreaks[pendingCustomBreaks.length - 1];
  if (parsed <= min) parsed = min + 0.001;
  if (parsed >= max) parsed = max - 0.001;
  pendingCustomBreaks[index] = parsed;
  var inner = pendingCustomBreaks.slice(1, -1).sort(function (a, b) { return a - b; });
  var deduped = [inner[0]];
  for (var i = 1; i < inner.length; i++) {
    if (inner[i] !== inner[i - 1]) deduped.push(inner[i]);
  }
  pendingCustomBreaks = [min].concat(deduped).concat([max]);
  renderCustomBreakInputs();
}

function addCustomBreak() {
  if (!pendingCustomBreaks || pendingCustomBreaks.length - 1 >= 9) return;
  var maxGap = 0, maxIdx = 0;
  for (var i = 0; i < pendingCustomBreaks.length - 1; i++) {
    var gap = pendingCustomBreaks[i + 1] - pendingCustomBreaks[i];
    if (gap > maxGap) {
      maxGap = gap;
      maxIdx = i;
    }
  }
  var mid = (pendingCustomBreaks[maxIdx] + pendingCustomBreaks[maxIdx + 1]) / 2;
  pendingCustomBreaks.splice(maxIdx + 1, 0, mid);
  renderCustomBreakInputs();
}

function removeCustomBreak() {
  if (!pendingCustomBreaks || pendingCustomBreaks.length - 1 <= 2) return;
  var minGap = Infinity, minIdx = 1;
  for (var i = 1; i < pendingCustomBreaks.length - 1; i++) {
    var gap = pendingCustomBreaks[i + 1] - pendingCustomBreaks[i - 1];
    if (gap < minGap) {
      minGap = gap;
      minIdx = i;
    }
  }
  pendingCustomBreaks.splice(minIdx, 1);
  renderCustomBreakInputs();
}

function confirmCustomBreaks() {
  currentCustomBreaks = pendingCustomBreaks ? pendingCustomBreaks.slice() : null;
  pendingCustomBreaks = null;
  customBreaksSnapshot = null;
  hideCustomBreaksUI();
  if (field && field.id !== "none") {
    deferredUpdate();
  }
}

function cancelCustomBreaks() {
  currentCustomBreaks = customBreaksSnapshot;
  pendingCustomBreaks = null;
  customBreaksSnapshot = null;
  if (!currentCustomBreaks) {
    currentClassificationMethod = "quantile";
    classMethodSelect.property("value", "quantile");
    updateLegendCellsForMethod();
  }
  hideCustomBreaksUI();
  if (field && field.id !== "none") {
    deferredUpdate();
  }
}

applyButton.property("disabled", true);
applyButton.text(applyButtonDefaultText);
setCurrentDataPreviewDefault();
setUploadStatus(t('upload.initial'), "info");

fileInput.on("change", function () {
  var file = this.files && this.files[0];
  if (file) {
    handleFileUpload(file);
  }
  resetFileInputValue();
});

dropzone
  .on("dragover", function () {
    d3.event.preventDefault();
    dropzone.classed("dragover", true);
  })
  .on("dragleave", function () {
    dropzone.classed("dragover", false);
  })
  .on("drop", function () {
    d3.event.preventDefault();
    dropzone.classed("dragover", false);
    var event = d3.event;
    var file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      handleFileUpload(file);
    }
  })
  .on("click", function () {
    var event = d3.event;
    if (shouldBypassDropzoneClick(event)) {
      return;
    }
    fileInput.node().click();
  });

toggleCurrentPreviewButton.on("click", function () {
  currentPreviewVisible = !currentPreviewVisible;
  toggleCurrentPreviewButton.text(currentPreviewVisible ? t('btn.hideTable') : t('btn.showTable'));
  currentDataPreview.classed("is-hidden", !currentPreviewVisible);
  if (currentPreviewVisible) {
    renderCurrentDataPreview();
  }
});

downloadSvgButton.on("click", downloadCurrentSvg);
downloadPngButton.on("click", downloadCurrentPng);
downloadDataButton.on("click", downloadCurrentDatasetCsv);

// Cloud Load Button Logic
loadProjectButton.on("click", function () {
  var modalEl = document.getElementById('projectListModal');
  var modal = new bootstrap.Modal(modalEl);
  modal.show();

  var listGroup = d3.select("#project-list-group");
  listGroup.html('<p class="text-center text-muted p-4">' + t('modal.loading') + '</p>');

  CloudApi.getProjects()
    .then(function (projects) {
      if (!projects || projects.length === 0) {
        listGroup.html('<p class="text-center text-muted p-4">' + t('project.noProjects') + '</p>');
        return;
      }

      listGroup.html("");

      var items = listGroup.selectAll("button")
        .data(projects)
        .enter()
        .append("button")
        .attr("class", "list-group-item list-group-item-action d-flex justify-content-between align-items-center")
        .attr("type", "button")
        .on("click", function (d) {
          if (!confirm(t('project.confirmLoad', { name: d.name }))) {
            return;
          }
          var btn = d3.select(this);
          btn.text(t('modal.loading')).property("disabled", true);

          CloudApi.loadProject(d.id)
            .then(function (projectData) {
              restoreProjectState(projectData);
              modal.hide();
            })
            .catch(function (err) {
              console.error(err);
              alert(t('project.loadFailed') + err.message);
              btn.text(d.name).property("disabled", false);
            });
        });

      items.append("div")
        .html(function (d) {
          var dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : "";
          return '<div class="fw-bold">' + (d.name || t('project.unnamed')) + '</div>' +
            '<small class="text-muted">' + dateStr + '</small>';
        });
    })
    .catch(function (err) {
      console.error(err);
      listGroup.html('<p class="text-center text-danger p-4">' + t('project.listFailed') + '<br>' + err.message + '</p>');
    });
});

// Remove local file input listener as we moved to cloud
projectFileInput.on("change", null);

// Cloud Save Button Logic
saveProjectButton.on("click", saveProjectToCloud);

applyButton.on("click", applyPendingData);
resetButton.on("click", resetToSampleData);


var map = d3.select("#map"),
  layer = map.append("g")
    .attr("id", "layer"),
  states = layer.append("g")
    .attr("id", "states")
    .selectAll("path"),
  placeLabels = layer.append("g")
    .attr("id", "place-labels"),
  legendGroup = map.append("g")
    .attr("id", "legend")
    .attr("transform", "translate(520, 660)");


var proj = d3.geoMercator()
  .center([138, 36])
  .scale(1450)
  .translate([400, 400]),
  topology,
  geometries,
  dataById = {},
  carto = d3.cartogram()
    .projection(proj)
    .properties(function (d) {
      return dataById.get(d.properties.nam_ja);
    })
    .value(function (d) {
      return field && field.key ? +d.properties[field.key] : 1;
    });

d3.json("data/japan.topojson", function (topo) {
  topology = topo;
  geometries = topology.objects.japan.geometries;
  computeAreas(topology, "japan");
  d3.csv("data/theme.csv", function (data) {
    augmentWithRankings(data);
    originalData = cloneDataset(data);
    loadDataset(cloneDataset(data), {
      deferRender: true,
      label: t('data.sampleData'),
      isSample: true,
      defaultToNone: true,
      preserveField: false
    });
    init();

    // Check for project_id URL parameter
    var params = new URLSearchParams(window.location.search);
    var projectId = params.get("project_id");

    if (projectId && window.datavizSupabase) {
      console.log("Found project_id:", projectId);

      // Poll for auth session ready
      var checkAuthInterval = setInterval(function () {
        if (!window.datavizSupabase || !window.datavizSupabase.auth) return;

        window.datavizSupabase.auth.getSession().then(function (res) {
          if (res.data.session) {
            clearInterval(checkAuthInterval);
            console.log("Session found, loading project...");
            CloudApi.loadProject(projectId)
              .then(restoreProjectState)
              .catch(function (err) {
                console.error("Auto load failed", err);
                alert(t('project.autoLoadFailed') + err.message);
              });
          }
        });

        // Timeout after 10s? For now just keep trying till logged in or user gives up
      }, 500);
    }
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
    .attr("id", function (d) {
      return d.properties.nam_ja;
    })
    .attr("fill", "#fafafa")
    .attr("d", path);

  states.append("title");

  renderPlaceLabels();
  updateFieldSelection();
  isInitialized = true;
}

function reset() {
  stat.text("");
  stat.classed("empty", true);
  body.classed("updating", false);
  clearLegend();

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
    .text(function (d) {
      return d.properties.nam_ja;
    });

  renderPlaceLabels();
}

function getFeatureLabel(feature) {
  if (!feature || !feature.properties) {
    return "";
  }
  return feature.properties.nam_ja || feature.properties.nam || feature.properties[KEY_COLUMN] || "";
}

function renderPlaceLabels() {
  if (!placeLabels) {
    return;
  }
  var shouldShow = placeNameToggle.empty() ? true : placeNameToggle.property("checked");
  if (!shouldShow) {
    placeLabels.selectAll("g.place-label").remove();
    return;
  }
  if (!states || !states.size()) {
    return;
  }

  var pathGen = (carto && carto.path) ? carto.path : d3.geoPath().projection(proj);
  var bboxByLabel = d3.map();

  states.each(function (d) {
    var label = getFeatureLabel(d);
    if (!label) {
      return;
    }
    try {
      var box = this.getBBox();
      bboxByLabel.set(label, {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      });
    } catch (e) {
      // ignore
    }
  });

  var labels = placeLabels.selectAll("g.place-label")
    .data(states.data(), function (d) {
      return getFeatureLabel(d);
    });

  labels.exit().remove();

  var labelsEnter = labels.enter()
    .append("g")
    .attr("class", "place-label");

  labelsEnter.append("text")
    .attr("class", "state-label state-label-stroke")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em");

  labelsEnter.append("text")
    .attr("class", "state-label state-label-fill")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em");

  labels = labelsEnter.merge(labels);

  var setPosition = function (d, axis) {
    var label = getFeatureLabel(d);
    var fromBox = label ? bboxByLabel.get(label) : null;
    if (fromBox && isFinite(fromBox[axis])) {
      return fromBox[axis];
    }
    var c = pathGen.centroid(d) || [NaN, NaN];
    var idx = axis === "x" ? 0 : 1;
    if (!isFinite(c[idx])) {
      var b = pathGen.bounds(d);
      c[idx] = idx === 0
        ? (b[0][0] + b[1][0]) / 2
        : (b[0][1] + b[1][1]) / 2;
    }
    return c[idx];
  };

  labels.selectAll("text.state-label")
    .text(function (d) {
      return getFeatureLabel(d);
    })
    .attr("x", function (d) {
      return setPosition(d, "x");
    })
    .attr("y", function (d) {
      return setPosition(d, "y");
    });
}

function computeAreas(topo, objName) {
  areaByLabel = d3.map();
  var obj = topo.objects && topo.objects[objName];
  if (!obj) return;
  var fc = topojson.feature(topo, obj);
  var R = 6371.0088;
  (fc.features || []).forEach(function (f) {
    var label = getFeatureLabel(f);
    if (!label) return;
    var sr = d3.geoArea(f);
    areaByLabel.set(label, sr * R * R);
  });
}

function update() {
  var start = Date.now();
  body.classed("updating", true);

  var key = field.key,
    fmt = perAreaEnabled ? d3.format(",.2f") : d3.format(","),
    rawValue = function (d) {
      return +d.properties[key];
    },
    value = perAreaEnabled
      ? function (d) {
          var v = rawValue(d);
          if (isNaN(v)) return NaN;
          var label = getFeatureLabel(d);
          var area = areaByLabel.get(label);
          return (area && area > 0) ? v / area : NaN;
        }
      : rawValue;

  var values;
  if (perAreaEnabled) {
    values = states.data()
      .map(function (d) {
        var v = +d.properties[key];
        if (isNaN(v)) return NaN;
        var label = getFeatureLabel(d);
        var area = areaByLabel.get(label);
        return (area && area > 0) ? v / area : NaN;
      })
      .filter(function (n) { return !isNaN(n); })
      .sort(d3.ascending);
  } else {
    values = states.data()
      .map(rawValue)
      .filter(function (n) { return !isNaN(n); })
      .sort(d3.ascending);
  }

  if (!values.length) {
    stat.text(t('status.noValidNumbers'));
    body.classed("updating", false);
    return;
  }

  var lo = values[0],
    hi = values[values.length - 1];

  var colorInterpolator = (currentColorScheme && currentColorScheme.interpolator) || d3.interpolateBlues;
  var legendMin = lo;
  var legendMax = hi;
  var color;

  if (currentMode === "ranking") {
    var totalRanks = values.length;
    legendMin = 1;
    legendMax = Math.max(1, totalRanks);
    var steps = Math.max(3, currentLegendCells);
    var colorRange = buildColorSamples(colorInterpolator, steps);
    color = d3.scaleQuantize()
      .domain([legendMin, legendMax])
      .range(colorRange);
    currentBreaks = null;
  } else if (currentClassificationMethod === "custom" && currentCustomBreaks && currentCustomBreaks.length >= 2) {
    var updatedCustom = currentCustomBreaks.slice();
    updatedCustom[0] = lo;
    updatedCustom[updatedCustom.length - 1] = hi;
    currentCustomBreaks = updatedCustom;
    var innerBreaks = updatedCustom.slice(1, -1);
    var actualClasses = updatedCustom.length - 1;
    var colorRange = buildColorSamples(colorInterpolator, actualClasses);
    if (colorReversed) colorRange = colorRange.slice().reverse();
    color = d3.scaleThreshold()
      .domain(innerBreaks)
      .range(colorRange);
    currentBreaks = updatedCustom;
  } else {
    var colorSteps = Math.max(1, currentLegendCells);
    var classResult = SettingClass.classify(values, {
      method: currentClassificationMethod,
      nb: colorSteps
    });
    var actualClasses = classResult.nClasses || colorSteps;
    var colorRange = buildColorSamples(colorInterpolator, actualClasses);
    if (colorReversed) colorRange = colorRange.slice().reverse();

    if (classResult.breaks && classResult.breaks.length >= 2 && classResult.innerBreaks && classResult.innerBreaks.length > 0) {
      color = d3.scaleThreshold()
        .domain(classResult.innerBreaks)
        .range(colorRange);
      currentBreaks = classResult.breaks;
      lastAutoBreaks = classResult.breaks.slice();
    } else {
      color = d3.scaleQuantize()
        .domain([lo, hi])
        .range(colorRange);
      currentBreaks = null;
    }
  }

  // normalize the scale to positive numbers
  var scale = d3.scaleSqrt()
    .domain([lo, hi])
    .range([1, 1000]);

  // tell the cartogram to use the scaled values
  carto.value(function (d) {
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
    .text(function (d) {
      var originalValue = value(d);
      var displayValue = isNaN(originalValue) ? t('data.noData') : fmt(originalValue);
      return [d.properties.nam_ja, displayValue].join(": ");
    });

  renderPlaceLabels();

  states.transition()
    .duration(750)
    .ease(d3.easeLinear)
    .attr("fill", function (d) {
      var rawValue = value(d);
      var colorValue = currentMode === "ranking" ? getRankingValue(d) : rawValue;
      return isNaN(colorValue) ? "#f0f0f0" : color(colorValue);
    })
    .attr("d", carto.path);

  renderLegend(color, legendMin, legendMax, currentBreaks, colorRange);

  var delta = (Date.now() - start) / 1000;
  stat.text(["calculated in", delta.toFixed(1), "seconds"].join(" "));
  stat.classed("empty", false);
  body.classed("updating", false);
}

function buildColorSamples(interpolator, steps) {
  var normalizedSteps = Math.max(1, steps || 1);
  if (normalizedSteps === 1) {
    return [interpolator(0.5)];
  }
  var samples = [];
  for (var i = 0; i < normalizedSteps; i++) {
    samples.push(interpolator(i / (normalizedSteps - 1)));
  }
  return samples;
}

function buildRankingDomain(minRank, centerRank, maxRank, steps) {
  if (steps <= 0) {
    return [];
  }
  var domain = [];
  if (steps === 1) {
    domain.push(centerRank);
    return domain;
  }
  var centerIndex = Math.floor((steps - 1) / 2);
  var centerRatio = centerIndex / (steps - 1);

  for (var i = 0; i < steps; i++) {
    var t = i / (steps - 1);
    var value;
    if (t <= centerRatio) {
      var ratio = centerRatio === 0 ? 0 : t / centerRatio;
      value = minRank + (centerRank - minRank) * ratio;
    } else {
      var ratio = centerRatio === 1 ? 0 : (t - centerRatio) / (1 - centerRatio);
      value = centerRank + (maxRank - centerRank) * ratio;
    }
    domain.push(value);
  }
  return domain;
}

function getRankingColumnKey(column) {
  return column + RANKING_SUFFIX;
}

function getRankingValue(feature) {
  if (!feature || !feature.properties || !field || !field.key) {
    return NaN;
  }
  var value = feature.properties[getRankingColumnKey(field.key)];
  if (value === undefined || value === null || value === "") {
    return NaN;
  }
  return +value;
}

var deferredUpdate = (function () {
  var timeout;
  return function () {
    var args = arguments;
    clearTimeout(timeout);
    stat.text("calculating...");
    return timeout = setTimeout(function () {
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

  var isNoField = field.id === "none";
  colorSchemeSelect.property("disabled", isNoField);
  legendCellsSelect.property("disabled", isNoField);
  displayModeSelect.property("disabled", isNoField);
  classMethodSelect.property("disabled", isNoField || currentMode === "ranking");

  if (isNoField) {
    reset();
  } else {
    deferredUpdate();
  }

}

function loadDataset(data, options) {
  options = options || {};
  var dataset = data || [];
  augmentWithRankings(dataset);
  rawData = dataset;
  dataById = d3.nest()
    .key(function (d) { return d[KEY_COLUMN]; })
    .rollup(function (d) { return d[0]; })
    .map(rawData);

  var nextFields = buildFieldsFromData(rawData);
  fields = nextFields;
  fieldsById = buildFieldIndex(nextFields);

  var preferredKey = options.forceFieldKey || ((options.preserveField === false) ? null : (field && field.key));
  field = selectDefaultField(nextFields, preferredKey, options.defaultToNone);

  refreshFieldOptions();
  updateCurrentDatasetLabel(options.label || t('data.customData'), options.isSample);
  renderCurrentDataPreview();

  stat.text("");
  stat.classed("empty", true);

  if (field && isInitialized && !options.deferRender) {
    updateFieldSelection();
  }
}

function buildFieldsFromData(data) {
  var availableFields = [{
    name: t('field.noField'),
    id: "none"
  }];

  if (!data || !data.length) {
    return availableFields;
  }

  var numericColumns = getNumericColumns(data);

  numericColumns.forEach(function (header, index) {
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
  items.forEach(function (item) {
    map.set(item.id, item);
  });
  return map;
}

function refreshFieldOptions() {
  var options = fieldSelect.selectAll("option")
    .data(fields, function (d) { return d.id; });

  options.exit().remove();

  options.enter()
    .append("option")
    .merge(options)
    .attr("value", function (d) { return d.id; })
    .text(function (d) { return d.name; });

  if (fields.length) {
    fieldSelect.property("selectedIndex", Math.max(fields.indexOf(field), 0));
  }
}

function getNumericColumns(data) {
  if (!data || !data.length) {
    return [];
  }

  var headers = Object.keys(data[0]).filter(function (header) {
    return header !== KEY_COLUMN && !hasRankingSuffix(header);
  });

  return headers.filter(function (header) {
    return data.some(function (row) {
      var value = row[header];
      return value !== undefined && value !== null && value !== "" && !isNaN(+value);
    });
  });
}

function hasRankingSuffix(header) {
  if (!header) {
    return false;
  }
  return header.slice(-RANKING_SUFFIX.length) === RANKING_SUFFIX;
}

function handleFileUpload(file) {
  if (!file) {
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    setUploadStatus(t('upload.fileTooLarge'), "danger");
    return;
  }

  setUploadStatus(t('upload.reading', { name: file.name }), "info");

  var reader = new FileReader();
  reader.onload = function (evt) {
    try {
      var text = (evt.target.result || "").trim();
      var parsed = d3.csvParse(text);
      preparePreview(parsed, file.name);
    } catch (error) {
      console.error(error);
      setUploadStatus(t('upload.parseFailed'), "danger");
      clearPreview();
    }
  };

  reader.onerror = function () {
    setUploadStatus(t('upload.readFailed'), "danger");
    clearPreview();
  };

  reader.readAsText(file, "utf-8");
}


function preparePreview(data, filename) {
  var label = filename || t('data.uploadedFile');
  var validation = validateDataset(data);

  if (!validation.valid) {
    setUploadStatus(validation.message, "danger");
    clearPreview();
    return;
  }

  augmentWithRankings(data);

  pendingDataset = {
    data: data,
    filename: label,
    numericColumns: validation.numericColumns
  };

  preview.classed("is-hidden", false);
  renderPreviewTable(data);
  renderPreviewStats(data, validation.numericColumns);
  setUploadStatus(t('upload.loaded', { name: label }), "success");
  applyButton
    .property("disabled", false)
    .text(applyButtonDefaultText);
}

function validateDataset(data) {
  if (!data || !data.length) {
    return { valid: false, message: t('validate.noRows') };
  }

  var headers = Object.keys(data[0]);
  if (headers.indexOf(KEY_COLUMN) === -1) {
    return { valid: false, message: t('validate.noKeyColumn', { col: KEY_COLUMN }) };
  }

  var numericColumns = getNumericColumns(data);
  if (!numericColumns.length) {
    return { valid: false, message: t('validate.noNumeric') };
  }

  return {
    valid: true,
    numericColumns: numericColumns
  };
}

function clearPreview() {
  pendingDataset = null;
  preview.classed("is-hidden", true);
  previewTable.html("<p class='text-muted'>" + t('upload.previewPlaceholder') + "</p>");
  previewStats.html("");
  applyButton
    .property("disabled", true)
    .text(applyButtonDefaultText);
}

function renderPreviewTable(data) {
  renderTableInto(previewTable, data, {
    rowCount: PREVIEW_ROW_COUNT,
    emptyMessage: t('table.previewEmpty'),
    note: function (shownRows, totalRows) {
      return t('table.showingRows', { shown: shownRows, total: totalRows });
    }
  });
}

function renderPreviewStats(data, numericColumns) {
  if (!numericColumns || !numericColumns.length) {
    previewStats.html("");
    return;
  }

  var fmt = d3.format(",.2f");

  var statsHtml = numericColumns.map(function (column) {
    var values = data
      .map(function (row) { return +row[column]; })
      .filter(function (value) { return !isNaN(value); });

    var min = d3.min(values);
    var max = d3.max(values);
    var mean = d3.mean(values);

    return "<p>" + t('stats.summary', { col: column, min: fmt(min), max: fmt(max), mean: fmt(mean) }) + "</p>";
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
    container.html("<p class='text-muted'>" + (options.emptyMessage || t('table.noData')) + "</p>");
    return;
  }

  var headers = Object.keys(data[0]);
  var rowCount = Math.min(options.rowCount || data.length, data.length);
  var rows = data.slice(0, rowCount);

  var headerHtml = headers.map(function (header) {
    return "<th>" + header + "</th>";
  }).join("");

  var rowsHtml = rows.map(function (row) {
    var cells = headers.map(function (header) {
      var value = row[header];
      return "<td>" + (value !== undefined ? value : "") + "</td>";
    }).join("");
    return "<tr>" + cells + "</tr>";
  }).join("");

  var note;
  if (typeof options.note === "function") {
    note = options.note(rowCount, data.length);
  } else {
    note = options.note || t('table.showingRowsDefault', { n: rowCount });
  }

  var tableHtml = ""
    + "<table class='data-table'>"
    + "<thead><tr>" + headerHtml + "</tr></thead>"
    + "<tbody>" + rowsHtml + "</tbody>"
    + "</table>"
    + "<p class='text-muted small-text'>" + note + "</p>";

  container.html(tableHtml);
}

function renderCurrentDataPreview() {
  if (!rawData || !rawData.length) {
    currentDataPreview
      .classed("is-hidden", !currentPreviewVisible)
      .html("<p class='text-muted'>" + t('table.currentDataEmpty') + "</p>");
    return;
  }

  renderTableInto(currentDataPreview, rawData, {
    rowCount: CURRENT_PREVIEW_ROW_COUNT,
    emptyMessage: t('table.currentDataEmpty'),
    note: function (shownRows, totalRows) {
      return t('table.currentPreview', { shown: shownRows, name: currentDatasetName, total: totalRows });
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
  toggleCurrentPreviewButton.text(t('btn.hideTable'));
  currentDataPreview
    .classed("is-hidden", false);
  renderCurrentDataPreview();
}

function applyPendingData() {
  if (!pendingDataset) {
    setUploadStatus(t('upload.noPreview'), "danger");
    return;
  }

  var datasetLabel = pendingDataset.filename || t('data.uploadedData');

  loadDataset(cloneDataset(pendingDataset.data), {
    label: datasetLabel,
    isSample: false,
    preserveField: false,
    defaultToNone: true
  });
  resetMapVisualState();

  setUploadStatus(t('upload.applied', { name: datasetLabel }), "success");

  clearPreview();
  previewTable.html("<p class='text-success'>" + t('upload.appliedMessage') + "</p>");
  applyButton.text(applyButtonAppliedText);
  currentPreviewVisible = false;
  toggleCurrentPreviewButton.text(t('btn.showTable'));
  currentDataPreview.classed("is-hidden", true);
}

function resetToSampleData() {
  if (!originalData || !originalData.length) {
    setUploadStatus(t('reset.failed'), "danger");
    return;
  }

  loadDataset(cloneDataset(originalData), {
    label: t('data.sampleData'),
    isSample: true,
    defaultToNone: true,
    preserveField: false
  });
  resetMapVisualState();
  clearPreview();
  previewTable.html("<p class='text-muted'>" + t('table.samplePreview') + "</p>");
  setUploadStatus(t('reset.done'), "info");
}

function cloneDataset(data) {
  return (data || []).map(function (row) {
    var copy = {};
    Object.keys(row).forEach(function (key) {
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
  image.onload = function () {
    var canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(function (blob) {
      if (blob) {
        var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        var downloadBlob = isMobile ? blob : new Blob([blob], { type: "application/octet-stream" });
        triggerDownload(downloadBlob, getDownloadFilename("png"));
      }
      setButtonLoading(downloadPngButton, false);
    }, "image/png");
  };
  image.onerror = function (error) {
    console.error("PNG 生成中にエラーが発生しました。", error);
    URL.revokeObjectURL(url);
    setButtonLoading(downloadPngButton, false);
  };
  image.src = url;
}

function downloadCurrentDatasetCsv() {
  if (!rawData || !rawData.length) {
    setUploadStatus(t('download.noData'), "danger");
    return;
  }
  try {
    var csvContent = d3.csvFormat(rawData);
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, getDownloadFilename("csv"));
    setUploadStatus(t('download.csvDone'), "success");
  } catch (error) {
    console.error(error);
    setUploadStatus(t('download.csvFailed'), "danger");
  }
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
  style.textContent = ""
    + "path.state{stroke:#666;stroke-width:.5;}"
    + "#legend .legend-title{font-size:12px;font-weight:600;fill:#0f172a;}"
    + "#legend text{font-size:11px;fill:#5f6c80;}"
    + ".state-label-stroke{font-size:8px;text-anchor:middle;pointer-events:none;fill:none;stroke:#ffffff;stroke-width:2px;stroke-linejoin:round;}"
    + ".state-label-fill{font-size:8px;text-anchor:middle;pointer-events:none;fill:#0f172a;stroke:none;}";
  clone.insertBefore(style, clone.firstChild);

  // 念のためラベル要素にスタイルを直接付与してエクスポート時も色が残るようにする
  Array.prototype.forEach.call(clone.querySelectorAll(".state-label-stroke"), function (node) {
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("font-size", "8px");
    node.setAttribute("pointer-events", "none");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "#ffffff");
    node.setAttribute("stroke-width", "2");
    node.setAttribute("stroke-linejoin", "round");
  });
  Array.prototype.forEach.call(clone.querySelectorAll(".state-label-fill"), function (node) {
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("font-size", "8px");
    node.setAttribute("pointer-events", "none");
    node.setAttribute("fill", "#0f172a");
    node.removeAttribute("stroke");
  });

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

function resetMapVisualState() {
  if (!isInitialized) {
    return;
  }
  reset();
}


function renderLegend(colorScale, minValue, maxValue, breaks, colorRange) {
  if (!legendGroup || !colorScale) {
    return;
  }

  var legendFieldName = (field && field.name && field.id !== "none") ? field.name : t('field.value');
  var formatValue = d3.format(",.0f");

  legendGroup.selectAll("*").remove();

  var legendContent = legendGroup.append("g")
    .attr("class", "legend-content");

  var unitLabel = currentMode === "ranking" ? t('ranking.unit') : (legendUnit || "");
  var rangeText = formatValue(minValue) + " " + t('legend.range') + " " + formatValue(maxValue);
  var titleSuffix = unitLabel ? " " + unitLabel : "";
  legendContent.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", 0)
    .text(legendFieldName + t('legend.bracketOpen') + rangeText + titleSuffix + t('legend.bracketClose'));

  var entries;
  if (breaks && colorRange && breaks.length >= 2) {
    entries = SettingClass.breaksToLegend(breaks, colorRange);
  } else {
    var colors = colorScale.range() || [];
    entries = colors.map(function (c, i) {
      var extent = colorScale.invertExtent ? colorScale.invertExtent(c) : [minValue, maxValue];
      var lo = extent && extent[0] != null ? extent[0] : minValue;
      var hi = extent && extent[1] != null ? extent[1] : maxValue;
      return {
        color: c,
        label: formatValue(lo) + " " + t('legend.range') + " " + formatValue(hi),
        range: [lo, hi]
      };
    });
  }

  var rowHeight = 22;
  var swatchSize = 14;
  var textOffsetX = swatchSize + 8;
  var startY = 20;

  entries.forEach(function (entry, i) {
    var y = startY + i * rowHeight;
    legendContent.append("rect")
      .attr("x", 0)
      .attr("y", y)
      .attr("width", swatchSize)
      .attr("height", swatchSize)
      .attr("fill", entry.color)
      .attr("stroke", "#cccccc")
      .attr("stroke-width", 1)
      .attr("shape-rendering", "crispEdges");

    var label = entry.label;
    if (unitLabel) {
      label = label + " " + unitLabel;
    }
    legendContent.append("text")
      .attr("class", "legend-label")
      .attr("x", textOffsetX)
      .attr("y", y + swatchSize - 2)
      .text(label);
  });

  var bbox = legendContent.node() && legendContent.node().getBBox ? legendContent.node().getBBox() : null;
  if (!bbox) {
    return;
  }
  var padding = 10;
  legendGroup.insert("rect", ":first-child")
    .attr("class", "legend-background")
    .attr("x", bbox.x - padding)
    .attr("y", bbox.y - padding)
    .attr("width", bbox.width + padding * 2)
    .attr("height", bbox.height + padding * 2)
    .attr("rx", 12)
    .attr("ry", 12)
    .attr("fill", "#ffffff")
    .attr("stroke", "#dfe5ef");

  // 凡例全体を右下から一定距離に配置
  var viewBoxWidth = 800;
  var viewBoxHeight = 800;
  var rightBottomOffset = 20;
  var legendWidth = bbox.width + padding * 2;
  var legendHeight = bbox.height + padding * 2;
  var x = viewBoxWidth - rightBottomOffset - legendWidth;
  var y = viewBoxHeight - rightBottomOffset - legendHeight;
  legendGroup.attr("transform", "translate(" + x + "," + y + ")");
}

function clearLegend() {
  if (legendGroup) {
    legendGroup.selectAll("*").remove();
  }
}

function augmentWithRankings(data) {
  if (!data || !data.length) {
    return;
  }
  var numericColumns = getNumericColumns(data);
  if (!numericColumns.length) {
    return;
  }
  numericColumns.forEach(function (column) {
    var entries = data.map(function (row) {
      var value = +row[column];
      return {
        row: row,
        value: isNaN(value) ? null : value
      };
    });

    entries.sort(function (a, b) {
      var aNull = a.value === null;
      var bNull = b.value === null;
      if (aNull && bNull) {
        return 0;
      }
      if (aNull) {
        return 1;
      }
      if (bNull) {
        return -1;
      }
      return b.value - a.value;
    });

    var lastValue = null;
    var rank = 0;
    entries.forEach(function (entry, index) {
      if (entry.value === null) {
        entry.row[getRankingColumnKey(column)] = "";
        return;
      }
      if (index === 0 || entry.value !== lastValue) {
        rank = index + 1;
        lastValue = entry.value;
      }
      entry.row[getRankingColumnKey(column)] = rank;
    });
  });
}
function selectDefaultField(fields, preferredKey, defaultToNone) {
  if (!fields || !fields.length) {
    return null;
  }

  var match = null;
  if (preferredKey) {
    match = fields.find(function (f) {
      return f.key === preferredKey;
    });
  }

  if (match) {
    return match;
  }

  if (defaultToNone) {
    return fields[0];
  }

  var firstNumeric = fields.find(function (f) {
    return f.id !== "none";
  });

  return firstNumeric || fields[0];
}

/* Project Load/Save Functions */

function saveProjectFile() {
  if (!rawData || !rawData.length) {
    alert(t('project.noData'));
    return;
  }

  var saveData = {
    version: "1.0",
    timestamp: Date.now(),
    meta: {
      datasetName: currentDatasetName
    },
    data: rawData,
    config: {
      fieldKey: field ? field.key : null,
      colorSchemeId: currentColorScheme ? currentColorScheme.id : null,
      legendCells: currentLegendCells,
      legendUnit: legendUnit,
      displayMode: currentMode,
      showPlaceLabels: placeNameToggle.property("checked"),
      perAreaEnabled: perAreaEnabled,
      colorReversed: colorReversed,
      classificationMethod: currentClassificationMethod,
      customBreaks: currentClassificationMethod === "custom" ? currentCustomBreaks : null
    }
  };

  try {
    var jsonContent = JSON.stringify(saveData, null, 2);
    var blob = new Blob([jsonContent], { type: "application/json" });

    var fieldName = (field && field.name && field.id !== "none") ? field.name : t('filename.noField');
    var modeName = currentMode === "ranking" ? t('ranking.label') : t('value.label');
    var dateStr = d3.timeFormat("%y%m%d")(new Date());

    var filename = t('filename.japan') + "_" + fieldName + "_" + modeName + "_" + dateStr + ".json";

    triggerDownload(blob, filename);
  } catch (e) {
    console.error(e);
    alert(t('project.saveError'));
  }
}

function loadProjectFile(file) {
  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function (evt) {
    try {
      var jsonContent = evt.target.result;
      var projectData = JSON.parse(jsonContent);
      restoreProjectState(projectData);
    } catch (e) {
      console.error(e);
      alert(t('project.loadFileError'));
    }
  };
  reader.readAsText(file);
}

/* Cloud Project Functions */

function setButtonLoading(btn, isLoading) {
  // Check if button selection is empty
  if (!btn || btn.empty()) {
    return;
  }
  if (isLoading) {
    if (!btn.attr("data-original-text")) {
      btn.attr("data-original-text", btn.text());
    }
    btn.text(t('btn.processing')).property("disabled", true);
  } else {
    var originalText = btn.attr("data-original-text");
    if (originalText) btn.text(originalText);
    btn.property("disabled", false);
  }
}

function getThumbnailBlob() {
  return new Promise(function (resolve, reject) {
    var svgNode = document.getElementById("map");
    if (!svgNode) return resolve(null);
    var serialized = serializeSvg(svgNode);
    var dims = extractSvgDimensions(svgNode);
    var svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(svgBlob);
    var image = new Image();
    image.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height); // 白背景
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        resolve(blob);
      }, "image/png");
    };
    image.onerror = function (e) {
      console.warn("Thumbnail generation failed", e);
      resolve(null);
    };
    image.src = url;
  });
}

// Toast Notification

function saveProjectToCloud() {
  if (!rawData || !rawData.length) {
    alert(t('project.noData'));
    return;
  }

  var defaultName = currentDatasetName || t('project.unnamed');
  var fieldName = (field && field.name && field.id !== "none") ? field.name : t('filename.noField');
  var modeName = currentMode === "ranking" ? t('ranking.label') : t('value.label');
  var dateStr = d3.timeFormat("%y%m%d")(new Date());
  var suggestedName = t('filename.japan') + "_" + fieldName + "_" + modeName + "_" + dateStr;

  var projectName = prompt(t('project.promptName'), suggestedName);
  if (projectName === null) return;

  setButtonLoading(saveProjectButton, true);

  var saveData = {
    version: "1.0",
    timestamp: Date.now(),
    meta: {
      datasetName: currentDatasetName
    },
    data: rawData,
    config: {
      fieldKey: field ? field.key : null,
      colorSchemeId: currentColorScheme ? currentColorScheme.id : null,
      legendCells: currentLegendCells,
      legendUnit: legendUnit,
      displayMode: currentMode,
      showPlaceLabels: placeNameToggle.property("checked"),
      perAreaEnabled: perAreaEnabled,
      colorReversed: colorReversed,
      classificationMethod: currentClassificationMethod,
      customBreaks: currentClassificationMethod === "custom" ? currentCustomBreaks : null
    }
  };

  getThumbnailBlob().then(function (thumbnailBlob) {
    CloudApi.saveProject(saveData, projectName, thumbnailBlob)
      .then(function () {
        var toolHeader = document.querySelector('dataviz-tool-header');
        if (toolHeader) {
          toolHeader.showMessage(t('project.saved', { name: projectName }), "success");
        }
        setButtonLoading(saveProjectButton, false);
      })
      .catch(function (err) {
        console.error(err);
        var toolHeader = document.querySelector('dataviz-tool-header');
        if (toolHeader) {
          toolHeader.showMessage(t('project.saveFailed') + err.message, "error");
        }
        setButtonLoading(saveProjectButton, false);
      });
  });
}

function restoreProjectState(projectData) {
  if (!projectData || !projectData.data) {
    alert(t('project.invalidData'));
    return;
  }

  var datasetLabel = (projectData.meta && projectData.meta.datasetName) || t('data.loadedData');
  var config = projectData.config || {};

  loadDataset(cloneDataset(projectData.data), {
    label: datasetLabel,
    isSample: false,
    forceFieldKey: config.fieldKey,
    deferRender: true
  });

  // 1. 表示モード (Display Mode)
  // setDisplayMode内でinitializeColorSchemeOptionsなどが呼ばれるので先に設定
  if (config.displayMode) {
    if (config.displayMode !== currentMode) {
      setDisplayMode(config.displayMode);
    } else {
      // モードが同じでも、選択肢(DOM)の整合性を保つために初期化を行う
      initializeColorSchemeOptions();
    }
  } else {
    initializeColorSchemeOptions();
  }

  // 2. 配色 (Color Scheme)
  if (config.colorSchemeId) {
    setColorScheme(config.colorSchemeId, { silent: true });
  }

  // 3. 凡例階級数 (Legend Cells)
  if (config.legendCells) {
    currentLegendCells = +config.legendCells;
    legendCellsSelect.property("value", currentLegendCells);
  }

  // 4. 単位 (Unit)
  if (config.legendUnit !== undefined) {
    legendUnit = config.legendUnit;
    if (currentMode === "value") {
      legendUnitCache = legendUnit;
    }
    legendUnitInput.property("value", legendUnit);
  }

  // 5. 地名ラベル (Place Labels)
  if (config.showPlaceLabels !== undefined) {
    placeNameToggle.property("checked", config.showPlaceLabels);
  }

  // 5.25. 面積で割る (Per Area)
  if (config.perAreaEnabled !== undefined) {
    perAreaEnabled = !!config.perAreaEnabled;
    perAreaToggle.property("checked", perAreaEnabled);
  }

  // 5.3. 色を反転 (Color Reversed)
  if (config.colorReversed !== undefined) {
    colorReversed = !!config.colorReversed;
    colorReversedToggle.property("checked", colorReversed);
  }

  // 5.5. 分類方法 (Classification Method)
  if (config.classificationMethod) {
    currentClassificationMethod = config.classificationMethod;
    classMethodSelect.property("value", currentClassificationMethod);
    if (config.classificationMethod === "custom" && config.customBreaks) {
      currentCustomBreaks = config.customBreaks;
      showCustomBreaksUI();
    } else {
      currentCustomBreaks = null;
      hideCustomBreaksUI();
    }
    updateLegendCellsForMethod();
  }

  // 6. UI状態の更新 (プレビュー隠すなど)
  currentPreviewVisible = false;
  toggleCurrentPreviewButton.text(t('btn.showTable'));
  currentDataPreview.classed("is-hidden", true);

  // 7. UIと描画の更新
  // updateFieldSelectionを呼ぶことで、ドロップダウンのdisabled状態が解除され、
  // かつ deferredUpdate() がトリガーされて地図が再描画されます。
  updateFieldSelection();
}

// --- Dataviz Tool Header Integration ---
customElements.whenDefined('dataviz-tool-header').then(function () {
  var toolHeader = document.querySelector('dataviz-tool-header');
  if (toolHeader) {
    var handleSave = function () {
      saveProjectToCloud();
    };
    var handleLoad = function () {
      var modalEl = document.getElementById('projectListModal');
      var modal = new bootstrap.Modal(modalEl);
      modal.show();

      var listGroup = d3.select("#project-list-group");
      listGroup.html('<p class="text-center text-muted p-4">' + t('modal.loading') + '</p>');

      CloudApi.getProjects()
        .then(function (projects) {
          if (!projects || projects.length === 0) {
            listGroup.html('<p class="text-center text-muted p-4">' + t('project.noProjects') + '</p>');
            return;
          }

          listGroup.html("");

          var items = listGroup.selectAll("button")
            .data(projects)
            .enter()
            .append("button")
            .attr("class", "list-group-item list-group-item-action d-flex justify-content-between align-items-center")
            .attr("type", "button")
            .on("click", function (d) {
              if (!confirm(t('project.confirmLoad', { name: d.name }))) {
                return;
              }
              var btn = d3.select(this);
              btn.text(t('modal.loading')).property("disabled", true);

              CloudApi.loadProject(d.id)
                .then(function (projectData) {
                  restoreProjectState(projectData);
                  modal.hide();
                })
                .catch(function (err) {
                  console.error(err);
                  alert(t('project.loadFailed') + err.message);
                  btn.text(d.name).property("disabled", false);
                });
            });

          items.append("div")
            .html(function (d) {
              var dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : "";
              return '<div class="fw-bold">' + (d.name || t('project.unnamed')) + '</div>' +
                '<small class="text-muted">' + dateStr + '</small>';
            });
        })
        .catch(function (err) {
          console.error(err);
          listGroup.html('<p class="text-center text-danger p-4">' + t('project.listFailed') + '<br>' + err.message + '</p>');
        });
    };

    toolHeader.setConfig({
      logo: {
        type: 'text',
        text: t('header.title'),
        textClass: 'font-bold text-lg text-white'
      },
      buttons: [
        { label: t('header.loadProject'), action: handleLoad, align: 'right' },
        { label: t('header.saveProject'), action: handleSave, align: 'right' },
        { label: t('header.aboutCartogram'), action: function() { window.open('https://visualizing.jp/cartogram/', '_blank'); }, align: 'right' },
        { label: t('header.aboutClassification'), action: function() { window.open('https://classification.explorable-explanations.com/', '_blank'); }, align: 'right' }
      ]
    });
  }
});
