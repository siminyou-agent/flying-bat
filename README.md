# Flight School · The Flying Bat

A Blender-rendered, interactive paper-folding tutorial.

**Visit: https://plane.simin.you**

## Features

- Guided folding steps with original reference photographs.
- A 63-second Blender studio film, divided into 21 actions.
- Matte white-paper material against a muted sage backdrop, actual paper thickness, folded layers, softbox lighting, and contact shadows.
- Per-action play/pause, replay, adjustable speed, and a scrubbable timeline.
- A rotatable version of the **same Blender model**, exported as animated glTF with thickness baked into its morph targets.
- Switch from the rendered film to the interactive model without losing your place. Drag to orbit, pinch/scroll to zoom, or choose a camera preset.
- Downloadable `.blend` source scene, plus procedural modeling and rendering scripts.
- Enlarged photos with left/right detail views.
- Read-aloud instructions using browser speech synthesis.
- Progress saved locally in your browser.
- Responsive phone and desktop layouts; keyboard navigation.

The model begins with one rectangular sheet. Crease operations subdivide its faces and rotate the selected paper layers, retaining original-sheet coordinates. The generator verifies that every fold preserves the sheet's surface area. Small folds are reconstructed from reference photographs, so this is a teaching reconstruction rather than an exact measured pattern or a collision/elasticity simulation. Refer to the photographs for precise fold placement.

## Run locally

No frontend build is needed. Three.js 0.180.0, OrbitControls, and GLTFLoader are vendored locally under `vendor/` (MIT license in `vendor/THREE-LICENSE.txt`). Use a static server with HTTP Range support so video scrubbing works; for example, with Node.js installed:

```sh
npx --yes serve . --listen 8000
```

Open http://localhost:8000. The static site is deployed from the `main` branch root using GitHub Pages. `CNAME` sets the custom domain.

To regenerate the Blender scene, animated model, and video assets, see [the Blender build instructions](blender/README.md).

## Credits

Adapted from [Folded Flying Bat by Allison Waken, All for the Boys](https://allfortheboys.com/folded-flying-bat/).

Reference photographs in `assets/bat-*.jpg` are by the original source and remain the property of their respective copyright holders. Their inclusion here does not grant redistribution rights. The interface, animated diagrams, extra folding checks, and flight-tuning suggestions were created for this guide. This project is not affiliated with or endorsed by All for the Boys.
