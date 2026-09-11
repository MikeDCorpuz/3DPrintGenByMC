# Parametric
**3D Print Studio by Mike Corpuz**

Design multi-color printables in the browser (or the Windows app), preview them on a **256 × 256 mm** bed, then download a `.3mf` for Bambu Studio / AMS.

Live: [print3dbymc.azurewebsites.net](https://print3dbymc.azurewebsites.net) · Windows portable: [/downloads/](https://print3dbymc.azurewebsites.net/downloads/)

## Products

| Product | What you get |
| --- | --- |
| **Keychain** | Name plate or text-cloud keychain with optional split-ring hole |
| **Pet tag** | Collar tag (tag / pill / circle / rounded) with a top ring hole and raised name |
| **Name plate** | Long desk plate — no ring — thicker base for sitting flat |
| **Clicker / Clicker v2** | MX (or 1u) switch housing + custom keycap; name-bar or separate letters |
| **Letter stand** | Big monogram letter with desk foot and tilted script name |

Inline SVG: upload a flat vector file and type `{svg}` in the name (e.g. `Michael {svg} Corpuz` or `BUDDY {svg}`) to raise the artwork with the letters. Clickers can also put `{svg}` as its own keycap in a name bar.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### Desktop (Windows portable, no tip panel)

```bash
npm run desktop:win
```

Output: `release/KeychainMaker-1.0.0-Windows.exe`. Web builds keep the Maya / GCash support banner; the desktop build sets `VITE_DESKTOP=1` and hides it.

## Workflow

1. Pick a **product** at the top of the panel.
2. Type one name (or several comma-separated). They pack onto the bed.
3. Toggle layers, colors, font, and size sliders. Orbit the preview; use **Explode layers** to check stacking.
4. Download `.3mf` and **open** it in Bambu Studio (**File → Open**, not “geometry only”). Each layer is its own 3MF color group. Confirm the color-mapping dialog if it appears. If edges still look open, right-click → **Fix Model**.

## Clicker notes

- **MX** fits Cherry / Gateron / Kailh MX (15.6 mm body, 14 mm plate hole, `+` stem).
- **1u keyboard** uses a 19.05 mm cap and a housing at least that wide.
- **Name bar** (default / v2): key ring on the left, one switch well per letter (and per `{svg}`), bottoms joined. Keycaps print under their wells.
- **Separate**: each letter is its own housing + cap, packed on the bed.
- Cap design: **Letters + {svg}** for mixed name bars, or **SVG on every cap** for icon sets.
- Print the **keycap letter-up**. The stem socket is open on the bed. After printing, flip it onto the switch.
- Print the **housing** as exported (plate hole on top). Use the eject hole to push the switch out from below.
- Start **stem clearance at 0.16 mm**. If the cap is tight, add about 0.04 mm and reprint. If it is sloppy, drop toward 0.12 mm.

## Pet tag notes

- Default shape is the classic **tag** silhouette with the ring on **top** for a collar.
- Keep thickness around 3.5–4 mm so the tag stays sturdy on the leash/collar.
- Phone numbers and short notes work in the name field; commas still mean “another tag on the bed.”

## Suggested print settings

- Filament: PLA
- Layer height: 0.16 mm or 0.20 mm
- Walls: 3
- Infill: 15–20% (clicker housing 20–30% feels sturdier)
- Print the part flat on the bed (as exported)
- Split-ring hole is ~4.5–5 mm by default; 4–6 mm covers most rings
- Keep name / letter raise ≥ 0.6 mm so glyphs stay readable after the first top layers

## Parameters that matter

| Parameter | Why it matters |
| --- | --- |
| Length / tag length / plate length | Overall size; height follows the name |
| Total thickness | Finished height of plate / tag / keychain |
| Name / outline raise | How far decorations sit above the plate or cap |
| Stem clearance | Fit on the MX `+` (usually needs a test print) |
| Switch pocket / plate hole | How freely the switch drops in and clips |
| Housing wall / well / floor | Strength vs. how much of the switch sits proud |
| Join bar / letter gap | How name-bar wells meet |
| Keycap size / height / corner | Feel in the hand; 1u locks size to 19.05 mm |
| Ring hole + margin | Must clear a split ring without a weak wall |
| Outline width | Too thin and the frame can fail on small nozzles |
| Padding | Keeps letters off the outline and the hole |
| Corner radius | Comfort and print reliability |
| Curve quality | Smoother letters, heavier mesh |
| Bed spacing | Gap between parts on the 256 mm plate |

## Stack

Vite · React · TypeScript · Three.js / R3F · Tailwind · opentype.js · Clipper · Manifold (export repair) · Electron (Windows portable)
