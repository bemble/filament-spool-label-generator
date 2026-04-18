let MANUFACTURERS = [];
let SPOOLMAN_DB_CONFIG = null;
let filaments = [];
let svgTemplate = "";
let currentManufacturer = null;
let selectionMode = false;

function currentTemplateUrl() {
  const templateId = document.getElementById("template-select").value;
  return currentManufacturer.templates.find((t) => t.id === templateId).url;
}

function isCustomTemplate() {
  return document.getElementById("template-select").value === "__custom__";
}

function updateGenerateBtn() {
  const anyMaterial = document.querySelectorAll("#material-select .material-cb:checked").length > 0;
  const templateReady = !isCustomTemplate() || svgTemplate !== "";
  document.getElementById("generate-btn").disabled = !anyMaterial || !templateReady;
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
  } else {
    document.getElementById("template-info-btn").style.display = "none";
    document.getElementById("custom-template").style.display = "none";
    document.getElementById("label-preview").src = currentTemplateUrl();
    document.getElementById("label-preview").style.display = "";
  }
  updateGenerateBtn();
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
    updateGenerateBtn();
  };
  reader.readAsText(file);
}

function onCustomTemplate(event) {
  processTemplateFile(event.target.files[0]);
}

async function onManufacturerChange() {
  const manufacturerId = document.getElementById("manufacturer-select").value;
  const show = (id) => (document.getElementById(id).style.display = "");
  const hide = (id) => (document.getElementById(id).style.display = "none");

  hide("manufacturer-data-error");

  if (manufacturerId === "__spoolman_custom__") {
    svgTemplate = "";
    currentManufacturer = null;
    ["section-template", "section-materials", "credits"].forEach(hide);
    show("custom-spoolman");
    return;
  }

  hide("custom-spoolman");
  const spoolmanInput = document.getElementById("custom-spoolman-id");
  const spoolmanBtn = document.getElementById("custom-spoolman-btn");
  spoolmanInput.disabled = false;
  spoolmanInput.value = "";
  spoolmanBtn.textContent = "Load";
  spoolmanBtn.dataset.mode = "";
  currentManufacturer = MANUFACTURERS.find((b) => b.id === manufacturerId);
  svgTemplate = "";

  if (!currentManufacturer) {
    ["section-template", "section-materials", "credits"].forEach(hide);
    return;
  }

  await loadManufacturerData();
}

async function loadSpoolmanCustom() {
  const input = document.getElementById("custom-spoolman-id");
  const btn = document.getElementById("custom-spoolman-btn");

  if (btn.dataset.mode === "unload") {
    input.disabled = false;
    input.value = "";
    btn.textContent = "Load";
    btn.dataset.mode = "";
    currentManufacturer = null;
    svgTemplate = "";
    const hide = (id) => (document.getElementById(id).style.display = "none");
    ["section-template", "section-materials", "credits", "manufacturer-data-error"].forEach(hide);
    return;
  }

  const id = input.value.trim();
  if (!id) return;

  currentManufacturer = {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    parser: "spoolman-db",
    dataUrl: SPOOLMAN_DB_CONFIG.dataUrl.replace("{id}", id),
    credits: SPOOLMAN_DB_CONFIG.credits,
    templates: SPOOLMAN_DB_CONFIG.templates || [],
  };
  svgTemplate = "";

  const hide = (id) => (document.getElementById(id).style.display = "none");
  ["section-template", "section-materials", "manufacturer-data-error"].forEach(hide);

  const ok = await loadManufacturerData();
  if (ok) {
    input.disabled = true;
    btn.textContent = "Unload";
    btn.dataset.mode = "unload";
  }
}

async function loadManufacturerData() {
  const show = (id) => (document.getElementById(id).style.display = "");
  const hide = (id) => (document.getElementById(id).style.display = "none");

  ["section-template", "section-materials"].forEach(hide);

  const templateSelect = document.getElementById("template-select");
  templateSelect.innerHTML = "";
  const builtInGroup = document.createElement("optgroup");
  builtInGroup.label = "Built-in";
  for (const t of currentManufacturer.templates) {
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
  customOpt.textContent = "Use your template...";
  customGroup.appendChild(customOpt);
  templateSelect.appendChild(customGroup);

  const res = await fetch(currentManufacturer.dataUrl);
  if (!res.ok) {
    const err = document.getElementById("manufacturer-data-error");
    err.innerHTML = `<button class="delete" onclick="this.parentElement.style.display='none'"></button>Failed to load data for "<strong>${currentManufacturer.id}</strong>". URL: <a href="${currentManufacturer.dataUrl}" target="_blank" rel="noopener">${currentManufacturer.dataUrl}</a>`;
    show("manufacturer-data-error");
    return false;
  }

  hide("template-info-btn");
  hide("custom-template");
  hide("template-instructions");
  show("label-preview");
  document.getElementById("label-preview").src = currentManufacturer.templates[0].url;
  show("section-template");

  const credits = document.getElementById("credits");
  credits.innerHTML = `Filament database by <a href="${currentManufacturer.credits.url}" target="_blank" rel="noopener">${currentManufacturer.credits.label}</a> — thanks!`;
  show("credits");
  filaments = parseDatabase(currentManufacturer.parser, await res.json()).map((f) => ({
    ...f,
    manufacturer: currentManufacturer.name,
  }));

  const materials = [...new Set(filaments.map((f) => f.material))].sort();
  const groups = {};
  for (const m of materials) {
    const key = m.split(" ")[0].split(/[-+]/)[0];
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
  const counts = {};
  for (const f of filaments) counts[f.material] = (counts[f.material] || 0) + 1;
  buildMaterialChecklist(document.getElementById("material-select"), groups, sortedGroups, counts);
  updateGenerateBtn();
  show("section-materials");
  return true;
}

async function init() {
  const list = await fetch("./list.json").then((r) => r.json());

  const spoolmanDb = list["spoolman-db"];
  SPOOLMAN_DB_CONFIG = spoolmanDb;
  const spoolmanManufacturers = (spoolmanDb?.manufacturers_enabled || []).map((entry) => {
    const id = typeof entry === "string" ? entry : entry.id;
    const name = typeof entry === "string" ? entry.charAt(0).toUpperCase() + entry.slice(1) : entry.name;
    return {
      id,
      name,
      parser: "spoolman-db",
      dataUrl: spoolmanDb.dataUrl.replace("{id}", id),
      credits: spoolmanDb.credits,
      templates: spoolmanDb.templates || [],
    };
  });

  const customManufacturers = (list.custom || []).map((m) => ({
    ...m,
    parser: `custom-${m.id}`,
  }));

  MANUFACTURERS = [...customManufacturers, ...spoolmanManufacturers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const manufacturerSelect = document.getElementById("manufacturer-select");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a manufacturer…";
  placeholder.disabled = true;
  placeholder.selected = true;
  manufacturerSelect.appendChild(placeholder);
  for (const manufacturer of MANUFACTURERS) {
    const opt = document.createElement("option");
    opt.value = manufacturer.id;
    opt.textContent = manufacturer.name;
    manufacturerSelect.appendChild(opt);
  }
  if (spoolmanDb) {
    const otherGroup = document.createElement("optgroup");
    otherGroup.label = "More";
    const otherOpt = document.createElement("option");
    otherOpt.value = "__spoolman_custom__";
    otherOpt.textContent = "Other from Spoolman DB…";
    otherGroup.appendChild(otherOpt);
    manufacturerSelect.appendChild(otherGroup);
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
    `${currentManufacturer.name} - ${label} - ${filtered.length} label${filtered.length !== 1 ? "s" : ""}`;

  document.getElementById("screen-select").style.display = "none";
  document.getElementById("screen-labels").style.display = "block";
  history.pushState({ screen: "labels" }, "", "generation.html");
}

function buildMaterialChecklist(container, groups, sortedGroups, counts = {}) {
  container.innerHTML = "";

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

    const countSpan = document.createElement("span");
    countSpan.className = "checklist-group-count";
    countSpan.textContent = `0/${groups[groupName].length}`;

    const totalColors = groups[groupName].reduce((s, m) => s + (counts[m] ?? 0), 0);
    const colorCountSpan = document.createElement("span");
    colorCountSpan.className = "checklist-item-count checklist-group-color-count";
    colorCountSpan.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2C17.5,2 22,6 22,11A6,6 0 0,1 16,17H14.2C13.9,17 13.7,17.2 13.7,17.5C13.7,17.6 13.8,17.7 13.8,17.8C14.2,18.3 14.5,18.9 14.5,19.5C14.5,20.9 13.4,22 12,22M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C12.3,20 12.5,19.8 12.5,19.5C12.5,19.3 12.4,19.2 12.4,19.1C12,18.6 11.8,18.1 11.8,17.5C11.8,16.1 12.9,15 14.3,15H16A4,4 0 0,0 20,11C20,7.1 16.4,4 12,4M6.5,10C7.3,10 8,10.7 8,11.5C8,12.3 7.3,13 6.5,13C5.7,13 5,12.3 5,11.5C5,10.7 5.7,10 6.5,10M9.5,6C10.3,6 11,6.7 11,7.5C11,8.3 10.3,9 9.5,9C8.7,9 8,8.3 8,7.5C8,6.7 8.7,6 9.5,6M14.5,6C15.3,6 16,6.7 16,7.5C16,8.3 15.3,9 14.5,9C13.7,9 13,8.3 13,7.5C13,6.7 13.7,6 14.5,6M17.5,10C18.3,10 19,10.7 19,11.5C19,12.3 18.3,13 17.5,13C16.7,13 16,12.3 16,11.5C16,10.7 16.7,10 17.5,10Z"/></svg>0/${totalColors}`;

    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("width", "16");
    arrow.setAttribute("height", "16");
    arrow.setAttribute("fill", "currentColor");
    arrow.classList.add("fold-arrow");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute("d", "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z");
    arrow.appendChild(arrowPath);

    groupHeader.append(groupCbWrap, nameSpan, countSpan, colorCountSpan, arrow);
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

      const nameSpan = document.createElement("span");
      nameSpan.textContent = m;
      nameSpan.style.flex = "1";

      const itemCount = document.createElement("span");
      itemCount.className = "checklist-item-count";
      const c = counts[m] ?? 0;
      cb.dataset.count = c;
      itemCount.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2C17.5,2 22,6 22,11A6,6 0 0,1 16,17H14.2C13.9,17 13.7,17.2 13.7,17.5C13.7,17.6 13.8,17.7 13.8,17.8C14.2,18.3 14.5,18.9 14.5,19.5C14.5,20.9 13.4,22 12,22M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C12.3,20 12.5,19.8 12.5,19.5C12.5,19.3 12.4,19.2 12.4,19.1C12,18.6 11.8,18.1 11.8,17.5C11.8,16.1 12.9,15 14.3,15H16A4,4 0 0,0 20,11C20,7.1 16.4,4 12,4M6.5,10C7.3,10 8,10.7 8,11.5C8,12.3 7.3,13 6.5,13C5.7,13 5,12.3 5,11.5C5,10.7 5.7,10 6.5,10M9.5,6C10.3,6 11,6.7 11,7.5C11,8.3 10.3,9 9.5,9C8.7,9 8,8.3 8,7.5C8,6.7 8.7,6 9.5,6M14.5,6C15.3,6 16,6.7 16,7.5C16,8.3 15.3,9 14.5,9C13.7,9 13,8.3 13,7.5C13,6.7 13.7,6 14.5,6M17.5,10C18.3,10 19,10.7 19,11.5C19,12.3 18.3,13 17.5,13C16.7,13 16,12.3 16,11.5C16,10.7 16.7,10 17.5,10Z"/></svg>${c}`;
      label.append(cb, nameSpan, itemCount);
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
    groupDiv.querySelector(".checklist-group-count").textContent = `${n}/${items.length}`;
    const totalColors = items.reduce((s, c) => s + Number(c.dataset.count || 0), 0);
    const selectedColors = items.filter(c => c.checked).reduce((s, c) => s + Number(c.dataset.count || 0), 0);
    const colorBadge = groupDiv.querySelector(".checklist-group-color-count");
    colorBadge.lastChild.textContent = `${selectedColors}/${totalColors}`;
  });
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
  const cb = e.target;
  if (cb.closest(".checklist-group-cb")) {
    cb.closest(".checklist-group").querySelectorAll(".material-cb").forEach(c => c.checked = cb.checked);
    syncChecklistState(container);
  } else {
    syncChecklistState(container);
  }
  updateGenerateBtn();
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
