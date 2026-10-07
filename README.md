# Flight School · The Flying Bat

An interactive, animated 3D paper-folding tutorial.

**Visit: https://plane.simin.you**

## Features

- Guided folding steps with original reference photographs.
- Animated diagrams with play/pause, replay, and drag-to-scrub controls.
- A real 3D paper viewer: drag to orbit, scroll or pinch to zoom, and use front/side/back camera presets.
- Moving flaps rotate around crease axes in 3D. Pause midway and inspect from any angle.
- Layer-separation control for inspection and a 2D fallback view.
- Separate actions for multi-part folds, highlighted moving flaps, and crease guides.
- Enlarged photos with left/right detail views.
- Read-aloud instructions using browser speech synthesis.
- Progress saved locally in your browser.
- Responsive phone and desktop layouts; keyboard navigation.

Animations are simplified motion studies, not a full physical origami simulation. Individual folds use rigid 3D hinge rotation; the authored step models simplify proportions and layer topology. Use the reference photographs for precise proportions and layer placement. Layer separation is an inspection aid, not a physical gap in the paper.

## Run locally

No build or package installation is needed. Three.js 0.180.0 and OrbitControls are vendored locally under `vendor/` (MIT license in `vendor/THREE-LICENSE.txt`):

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The static site is deployed from the `main` branch root using GitHub Pages. `CNAME` sets the custom domain.

## Credits

Adapted from [Folded Flying Bat by Allison Waken, All for the Boys](https://allfortheboys.com/folded-flying-bat/).

Reference photographs in `assets/bat-*.jpg` are by the original source and remain the property of their respective copyright holders. Their inclusion here does not grant redistribution rights. The interface, animated diagrams, extra folding checks, and flight-tuning suggestions were created for this guide. This project is not affiliated with or endorsed by All for the Boys.
