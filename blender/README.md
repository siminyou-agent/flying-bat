# Blender studio source

Built and rendered with Blender 5.2.2 LTS, using EEVEE. The browser receives ordinary H.264 MP4 videos and a separately exported glTF model; it does not need Blender installed.

## Rebuild

Run from the repository root with `blender`, `python3`, and `ffmpeg` available:

```sh
blender -b --python blender/build_flying_bat.py -- --output build/flying_bat --width 960 --preview --export
blender -b build/flying_bat/flying_bat.blend --python blender/render_frames.py -- --work build/flying_bat
python3 blender/encode.py --work build/flying_bat --dest media
```

The first command produces seven preview images for visual review before committing to the full render. The second command resumes an interrupted render and reuses identical hold frames without reducing the frame rate. The final film is 960 × 720, 24 fps, 63 seconds.

Use a fresh output directory after changing the model, materials, lighting, or camera. Frame resumption assumes the saved scene has not changed.

## Modeling approach

- Start with a single 11:8.5 rectangle.
- Track both the current 3D coordinates and the original rectangular-sheet UV coordinates.
- Split the affected polygonal faces at each crease; rotate the appropriate layer packet about the crease axis.
- Preserve paper provenance so a flap can move independently of the material underneath it.
- Assert surface-area preservation after every operation.
- Add a Solidify modifier for construction-paper thickness and a small bevel on exposed edges.
- Use a matte white-paper shader with fine procedural bump, three large softboxes, and a muted sage studio surface. The key light casts contact shadows; softer fill lights keep the white paper readable without flattening the folds.
- Bake the thickness into every glTF morph target so it remains visible in the browser, rather than exporting single-sided planes.

The source is a kinematic reconstruction from photographs. It does not solve sheet collisions, elastic bending, paper spring-back, or self-contact. Small fold positions and the finished wing opening are visually reconstructed. The photographs remain the exact source reference.

## Files

- `build_flying_bat.py`: geometric model, animation keyframes, studio scene, preview renderer, and thick-mesh glTF export.
- `render_frames.py`: resumable frame renderer.
- `encode.py`: H.264 clips, full film, captions, and downloadable model packaging.
- `../media/flying_bat.blend`: editable Blender scene.
- `../media/flying_bat.glb`: the animated model used by the interactive viewer.
- `../media/chapters.json`: synchronized timeline for the film and model.

The model uses 12 intermediate morph samples along each hinge's arc, interpolated at 24 fps. A complete animation clip is exported so the viewer can seek directly to any fold without reconstructing earlier states in JavaScript.
