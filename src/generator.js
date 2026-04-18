const TEMPLATE_FIELDS = [
  { labels: ["manufacturer"], description: "manufacturer name" },
  { labels: ["material"], description: "material name" },
  { labels: ["color", "color_badge"], description: "color swatch fill" },
  { labels: ["color_name"], description: "color name" },
  { labels: ["color_code___id"], description: "code and ID" },
];

function validateTemplate(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  return TEMPLATE_FIELDS.filter(
    (field) => !field.labels.some((l) => doc.querySelector(`[data-label="${l}"]`))
  );
}

function applyTemplateDimensions(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  const w = svg.getAttribute("width") || "auto";
  const h = svg.getAttribute("height") || "auto";
  document.getElementById("label-print-size").textContent =
    `@media print { #labels-grid { grid-template-columns: repeat(auto-fill, ${w}); } #labels-grid svg { width: ${w}; height: ${h}; } }`;
}

function createLabel(svgTemplate, filament) {
  const doc = new DOMParser().parseFromString(svgTemplate, "image/svg+xml");
  const q = (label) => doc.querySelector(`[data-label="${label}"]`);

  const manufacturerEl = q("manufacturer");
  if (manufacturerEl) manufacturerEl.textContent = filament.manufacturer;

  const material = q("material");
  if (material) material.textContent = filament.material.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();

  const badge = q("color_badge") || q("color");
  if (badge) {
    badge.style.fill = `#${filament.color_hex}`;
    badge.style.fillOpacity = "1";
  }

  const colorName = q("color_name");
  if (colorName) colorName.textContent = filament.color_name;

  const codeEl = q("color_code___id");
  if (codeEl) {
    const tspan = codeEl.querySelector("tspan");
    (tspan || codeEl).textContent = `${filament.code} - ${filament.id}`;
  }

  return document.importNode(doc.documentElement, true);
}
