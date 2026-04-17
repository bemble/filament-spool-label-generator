# Bambu Filament Label Generator

Bambu Lab offers a huge range of filaments, and many colors are very close to each other — there are countless shades of gray, blue, and other colors that are nearly impossible to tell apart by eye. The default spool label only shows the material, which isn't helpful when you're staring at a wall of spools trying to find the right one.

This tool generates printable labels (44mm × 18mm) that show both the **material**, the **color name**, and a **color swatch** for each filament, so you can identify your spools at a glance.

![Preview](example.jpeg)

## Usage

Open the app, select a material (or "All materials"), and click **Generate Labels**. Then hit **Print**.

## Local development

```sh
python3 -m http.server -d src/ 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Credits

Filament database by [piitaya](https://github.com/piitaya/bambu-spoolman-db) — thanks!
