let FILAMENT_MAKERS = [];
let filaments = [];
let svgTemplate = "";
let currentFilamentMaker = null;
let selectionMode = false;

function currentTemplateUrl() {
  const templateId = document.getElementById("template-select").value;
  return currentFilamentMaker.templates.find((t) => t.id === templateId).url;
}

function isCustomTemplate() {
  return document.getElementById("template-select").value === "__custom__";
}

function toggleTemplateInfo() {
  const panel = document.getElementById("template-instructions");
  panel.style.display = panel.style.display === "none" ? "" : "none";
}

function onTemplateChange() {
  svgTemplate = "";
  document.getElementById("custom-template-input").value = "";
  document.getElementById("template-warning").style.display = "none";
  document.getElementById("template-instructions").style.display = "none";
  if (isCustomTemplate()) {
    document.getElementById("template-info-btn").style.display = "";
    document.getElementById("custom-template").style.display = "";
    document.getElementById("label-preview").style.display = "none";
    document.getElementById("generate-btn").disabled = true;
  } else {
    document.getElementById("template-info-btn").style.display = "none";
    document.getElementById("custom-template").style.display = "none";
    document.getElementById("label-preview").src = currentTemplateUrl();
    document.getElementById("label-preview").style.display = "";
    document.getElementById("generate-btn").disabled = false;
  }
}

function processTemplateFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    svgTemplate = e.target.result;
    applyTemplateDimensions(svgTemplate);

    const missing = validateTemplate(svgTemplate);
    const warning = document.getElementById("template-warning");
    if (missing.length > 0) {
      warning.innerHTML = `<button class="delete" onclick="this.parentElement.style.display='none'"></button>Missing fields:<ul>${missing.map((f) => `<li>${f.labels[0]}</li>`).join("")}</ul>`;
      warning.style.display = "";
    } else {
      warning.style.display = "none";
    }

    const blob = new Blob([svgTemplate], { type: "image/svg+xml" });
    document.getElementById("label-preview").src = URL.createObjectURL(blob);
    document.getElementById("label-preview").style.display = "";
    document.getElementById("generate-btn").disabled = false;
  };
  reader.readAsText(file);
}

function onCustomTemplate(event) {
  processTemplateFile(event.target.files[0]);
}

async function onFilamentMakerChange() {
  const filamentMakerId = document.getElementById("filament-maker-select").value;
  currentFilamentMaker = FILAMENT_MAKERS.find((b) => b.id === filamentMakerId);
  svgTemplate = "";

  const show = (id) => (document.getElementById(id).style.display = "");
  const hide = (id) => (document.getElementById(id).style.display = "none");

  if (!currentFilamentMaker) {
    ["section-template", "section-materials", "credits"].forEach(hide);
    return;
  }

  const templateSelect = document.getElementById("template-select");
  templateSelect.innerHTML = "";
  const builtInGroup = document.createElement("optgroup");
  builtInGroup.label = "Built-in";
  for (const t of currentFilamentMaker.templates) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    builtInGroup.appendChild(opt);
  }
  templateSelect.appendChild(builtInGroup);
  const customGroup = document.createElement("optgroup");
  customGroup.label = "Custom";
  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "Upload your template...";
  customGroup.appendChild(customOpt);
  templateSelect.appendChild(customGroup);

  hide("template-info-btn");
  hide("custom-template");
  hide("template-instructions");
  show("label-preview");
  document.getElementById("label-preview").src = currentFilamentMaker.templates[0].url;
  show("section-template");

  const credits = document.getElementById("credits");
  credits.innerHTML = `Filament database by <a href="${currentFilamentMaker.credits.url}" target="_blank" rel="noopener">${currentFilamentMaker.credits.label}</a> — thanks!`;
  show("credits");

  const res = await fetch(currentFilamentMaker.dataUrl);
  filaments = await res.json();

  const materials = [...new Set(filaments.map((f) => f.material))].sort();
  const groups = {};
  for (const m of materials) {
    const key = m.split(" ")[0].split("-")[0];
    (groups[key] = groups[key] || []).push(m);
  }
  const ORDER = ["PLA", "PETG"];
  const sortedGroups = Object.keys(groups).sort((a, b) => {
    const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  buildMaterialChecklist(document.getElementById("material-select"), groups, sortedGroups);
  document.getElementById("generate-btn").disabled = true;
  show("section-materials");
}

async function init() {
  FILAMENT_MAKERS = await fetch("./list.json").then((r) => r.json());

  const filamentMakerSelect = document.getElementById("filament-maker-select");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a filament maker…";
  placeholder.disabled = true;
  placeholder.selected = true;
  filamentMakerSelect.appendChild(placeholder);
  for (const filamentMaker of FILAMENT_MAKERS) {
    const opt = document.createElement("option");
    opt.value = filamentMaker.id;
    opt.textContent = filamentMaker.name;
    filamentMakerSelect.appendChild(opt);
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("screen-select").style.display = "flex";
  history.replaceState({ screen: "select" }, "", ".");
}

async function generate() {
  if (!svgTemplate) {
    if (isCustomTemplate()) return;
    svgTemplate = await fetch(currentTemplateUrl()).then((r) => r.text());
    applyTemplateDimensions(svgTemplate);
  }
  const checkedBoxes = [...document.querySelectorAll("#material-select .material-cb:checked")];
  const selected = new Set(checkedBoxes.map(cb => cb.value));
  const filtered = filaments.filter(f => selected.has(f.material));

  selectionMode = false;
  document.getElementById("labels-grid").classList.remove("selection-mode");
  document.getElementById("selection-btn").textContent = "Selection";
  document.getElementById("selection-count").style.display = "none";

  const grid = document.getElementById("labels-grid");
  grid.innerHTML = "";
  for (const f of filtered) {
    const wrapper = document.createElement("div");
    wrapper.className = "label-wrapper";
    wrapper.appendChild(createLabel(svgTemplate, f));
    grid.appendChild(wrapper);
  }

  const total = document.querySelectorAll("#material-select .material-cb").length;
  const label = selected.size === total ? "All materials"
    : selected.size === 1 ? [...selected][0]
      : `${selected.size} materials`;
  document.getElementById("toolbar-title").textContent =
    `${currentFilamentMaker.name} - ${label} - ${filtered.length} label${filtered.length !== 1 ? "s" : ""}`;

  document.getElementById("screen-select").style.display = "none";
  document.getElementById("screen-labels").style.display = "block";
  history.pushState({ screen: "labels" }, "", "generation.html");
}

function buildMaterialChecklist(container, groups, sortedGroups) {
  container.innerHTML = "";

  const allLabel = document.createElement("label");
  allLabel.className = "checklist-all";
  const allCb = document.createElement("input");
  allCb.type = "checkbox";
  allCb.id = "material-cb-all";
  allCb.checked = false;
  allLabel.append(allCb, "All materials");
  container.appendChild(allLabel);

  for (const groupName of sortedGroups) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "checklist-group collapsed";

    const groupHeader = document.createElement("div");
    groupHeader.className = "checklist-group-header";

    const groupCbWrap = document.createElement("label");
    groupCbWrap.className = "checklist-group-cb";
    groupCbWrap.addEventListener("click", e => e.stopPropagation());
    const groupCb = document.createElement("input");
    groupCb.type = "checkbox";
    groupCb.checked = false;
    groupCbWrap.appendChild(groupCb);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = groupName;

    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("width", "16");
    arrow.setAttribute("height", "16");
    arrow.setAttribute("fill", "currentColor");
    arrow.classList.add("fold-arrow");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute("d", "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z");
    arrow.appendChild(arrowPath);

    groupHeader.append(groupCbWrap, nameSpan, arrow);
    groupHeader.addEventListener("click", () => groupDiv.classList.toggle("collapsed"));

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "checklist-items";
    for (const m of groups[groupName]) {
      const label = document.createElement("label");
      label.className = "checklist-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "material-cb";
      cb.value = m;
      cb.checked = false;
      label.append(cb, m);
      itemsDiv.appendChild(label);
    }

    groupDiv.append(groupHeader, itemsDiv);
    container.appendChild(groupDiv);
  }
}

function syncChecklistState(container) {
  const allCb = container.querySelector("#material-cb-all");
  container.querySelectorAll(".checklist-group").forEach(groupDiv => {
    const groupCb = groupDiv.querySelector(".checklist-group-cb input");
    const items = [...groupDiv.querySelectorAll(".material-cb")];
    const n = items.filter(c => c.checked).length;
    groupCb.checked = n > 0;
    groupCb.indeterminate = n > 0 && n < items.length;
  });
  const all = [...container.querySelectorAll(".material-cb")];
  const n = all.filter(c => c.checked).length;
  allCb.checked = n > 0;
  allCb.indeterminate = n > 0 && n < all.length;
}

function toggleSelectionMode() {
  selectionMode = !selectionMode;
  const grid = document.getElementById("labels-grid");
  const btn = document.getElementById("selection-btn");
  const countEl = document.getElementById("selection-count");
  grid.classList.toggle("selection-mode", selectionMode);
  btn.textContent = selectionMode ? "Done" : "Selection";
  countEl.style.display = selectionMode ? "" : "none";
  if (selectionMode) updateSelectionCount();
}

function updateSelectionCount() {
  const total = document.querySelectorAll(".label-wrapper").length;
  const excluded = document.querySelectorAll(".label-wrapper.excluded").length;
  document.getElementById("selection-count").textContent = `${total - excluded} / ${total}`;
}

function back() {
  showSelect();
  history.back();
}

function goHome() {
  if (window.location.pathname.endsWith("/generation.html")) back();
}

function showSelect() {
  document.getElementById("screen-labels").style.display = "none";
  document.getElementById("screen-select").style.display = "flex";
}

function showLabels() {
  document.getElementById("screen-select").style.display = "none";
  document.getElementById("screen-labels").style.display = "block";
}

window.addEventListener("popstate", () => {
  if (window.location.pathname.endsWith("/generation.html")) showLabels();
  else showSelect();
});

const dropZone = document.getElementById("custom-template");
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", (e) => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("drag-over");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith(".svg")) {
    document.getElementById("custom-template-input").value = "";
    processTemplateFile(file);
  }
});

document.getElementById("material-select").addEventListener("change", (e) => {
  const container = document.getElementById("material-select");
  const allCb = container.querySelector("#material-cb-all");
  const cb = e.target;
  if (cb === allCb) {
    container.querySelectorAll("input[type=checkbox]").forEach(c => {
      c.checked = allCb.checked;
      c.indeterminate = false;
    });
  } else if (cb.closest(".checklist-group-cb")) {
    cb.closest(".checklist-group").querySelectorAll(".material-cb").forEach(c => c.checked = cb.checked);
    syncChecklistState(container);
  } else {
    syncChecklistState(container);
  }
  const anyChecked = container.querySelectorAll(".material-cb:checked").length > 0;
  document.getElementById("generate-btn").disabled = !anyChecked;
});

document.getElementById("labels-grid").addEventListener("click", (e) => {
  if (!selectionMode) return;
  const wrapper = e.target.closest(".label-wrapper");
  if (wrapper) {
    wrapper.classList.toggle("excluded");
    updateSelectionCount();
  }
});

init();
