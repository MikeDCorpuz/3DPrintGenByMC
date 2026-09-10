# Keychain Maker
by Mike Corpuz

Design a multi-color name keychain or a switch clicker, preview it as a 3D print, then download a `.3mf` for your slicer.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Workflow

1. Pick **Keychain** or **Clicker** at the top of the panel.
2. Type one name or letter, or several separated by commas (`MICHAEL, ALEX, SAM` or `M, A, S`). They pack onto a **256 × 256 mm** bed.
3. **Keychain:** choose **Plate** (rounded / pill / tag / hex / circle) or **Text cloud**. Toggle outer plate, inner outline, and name.
   **Clicker:** print a switch housing, a custom keycap with an MX `+` stem socket, or both. Toggle housing, keycap, cap outline, and letter.
4. Set colors, font, and the fit/size sliders. Orbit the preview. Use **Explode layers** to check stacking.
5. Download `.3mf` and **open** it in Bambu Studio (File → Open, not “geometry only”). Each layer is its own 3MF color group. Confirm the color-mapping dialog if it appears.

## Clicker notes

- **MX** fits Cherry / Gateron / Kailh MX (15.6 mm body, 14 mm plate hole, `+` stem).
- **1u keyboard** uses a 19.05 mm cap and a housing at least that wide.
- **Name bar** (default): key ring on the left, one switch well per letter, bottoms joined so they read as one name. Keycaps print under their wells.
- **Separate**: each letter is its own housing + cap, packed on the bed.
- Print the **keycap letter-up**. The stem socket is open on the bed. After printing, flip it onto the switch.
- Print the **housing** as exported (plate hole on top). Use the eject hole to push the switch out from below.
- Start **stem clearance at 0.16 mm**. If the cap is tight, add about 0.04 mm and reprint. If it is sloppy, drop toward 0.12 mm.

## Suggested print settings

- Filament: PLA
- Layer height: 0.16 mm or 0.20 mm
- Walls: 3
- Infill: 15–20% (clicker housing 20–30% feels sturdier)
- Print the part flat on the bed (as exported)
- Split-ring hole is 5 mm by default; 4–6 mm covers most rings
- Keep name / letter raise ≥ 0.6 mm so glyphs stay readable after the first top layers

## Parameters that matter

| Parameter | Why it matters |
| --- | --- |
| Length | Keychain overall size; height follows the name |
| Total thickness | Keychain finished height |
| Name / outline raise | How far decorations sit above the plate or cap |
| Stem clearance | Fit on the MX `+` (the slider that usually needs a test print) |
| Switch pocket / plate hole | How freely the switch drops in and clips |
| Housing wall / well / floor | Strength vs. how much of the switch sits proud |
| Join bar / letter gap | How the name wells meet at the bottom |
| Keycap size / height / corner | Feel in the hand; 1u locks size to 19.05 mm |
| Ring hole + margin | Must clear a split ring without a weak wall |
| Outline width | Too thin and the frame can fail on small nozzles |
| Padding | Keeps letters off the outline and the hole |
| Corner radius | Comfort in the hand; also print reliability |
| Curve quality | Smoother letters, heavier mesh |
| Edge bevel | Slightly softer edges, nicer first-layer contact |
| Bed spacing | Gap between parts on the 256 mm plate |
