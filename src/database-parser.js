const DATABASE_PARSERS = {
  // piitaya/bambu-spoolman-db — already in the expected shape
  "custom-bambulab": (data) => data,

  // Donkie/SpoolmanDB — each entry has a colors array; flatten to one row per color
  "spoolman-db": (data) =>
    (data.filaments || data).flatMap((entry) =>
      (entry.colors || []).map((color) => ({
        material: entry.name
          .replace(/^\{color_name\}/, entry.material) // Spoolman "{color_name}" specific case
          .replace(/\s*\{color_name\}/gi, "")
          .replace("\u2122", "") // PolyMaker specific
          .replace("\u00a0", " ") // PolyMaker specific
          .trim(),
        color_name: color.name,
        color_hex: color.hex,
        code: "",
        id: color.name,
      }))
    ),
};

function parseDatabase(parserId, data) {
  const parser = DATABASE_PARSERS[parserId];
  if (!parser) throw new Error(`Unknown database parser: "${parserId}"`);
  return parser(data);
}
