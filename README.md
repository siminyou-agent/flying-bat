# Flight School · The Flying Bat

An interactive, animated paper-folding tutorial.

**Visit: https://plane.simin.you**

## Features

- Guided folding steps with original reference photographs.
- Animated diagrams with play/pause, replay, and drag-to-scrub controls.
- Separate actions for multi-part folds, highlighted moving flaps, and crease guides.
- Enlarged photos with left/right detail views.
- Read-aloud instructions using browser speech synthesis.
- Progress saved locally in your browser.
- Responsive phone and desktop layouts; keyboard navigation.

Animations are simplified motion studies, not a physical origami simulation. Use the reference photographs for precise proportions and layer placement.

## Run locally

No build tools or dependencies are needed:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The static site is deployed from the `main` branch root using GitHub Pages. `CNAME` sets the custom domain.

## Credits

Adapted from [Folded Flying Bat by Allison Waken, All for the Boys](https://allfortheboys.com/folded-flying-bat/).

Reference photographs in `assets/bat-*.jpg` are by the original source and remain the property of their respective copyright holders. Their inclusion here does not grant redistribution rights. The interface, animated diagrams, extra folding checks, and flight-tuning suggestions were created for this guide. This project is not affiliated with or endorsed by All for the Boys.
