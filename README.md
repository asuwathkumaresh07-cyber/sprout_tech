# Sprout Tech — The digital campus

An original, first-person 3D company tour. Scrolling walks the camera from the
welcome pavilion through a research lab, development studio, project gallery,
and meeting garden. The same scene is rendered into an original walkthrough film.

## Run locally

```powershell
python serve.py
```

Open http://localhost:8095. No frontend installation or build step is required.
The static website lives in `dist/`; Three.js is vendored locally. Google Fonts
is optional; the site falls back to system fonts without a connection.

The research lab uses a textured Poly Haven microscope and Kenney furniture,
stored locally with their source links and licenses in `dist/assets/CREDITS.md`.
Its fitted benches, sample trays, specimen shelves, tile floor, and suspended
lighting surround a clear visitor aisle. `labProps` in `dist/campus.js` defines
the shared model placements for the interactive scene and offline renderer.

With the render tools installed and the local server running, validate all
model and texture loads and the camera path with `node scripts/check-campus.mjs`.
Use the renderer's `lab-preview` mode to render three lab walkthrough views and
an overview into `outputs/`.

## Source

- `dist/campus.js`: original architecture, landscape, procedural textures,
  lighting, and independent camera-position and focus tracks.
- `dist/cinema.js`: scroll timeline, pointer look, guided tour, room map,
  reduced-motion support, and visibility-aware rendering.
- `dist/script.js`: navigation, service/project dialogs, film playback, and
  browser-local enquiry briefs. The form does not transmit submissions.
- `dist/cinema.css`: responsive interface and cinematic framing.
- `dist/assets/sprout-campus.mp4`: original rendered film with original sound.
- `serve.py`: static preview with byte-range responses for video seeking.

The gallery contains two clearly labeled concepts, not claimed client projects.
Replace their descriptions and procedural screen textures with supplied project
material when real completed work is available.

## Regenerate the film

Rendering is optional; the website does not require these tools.

1. Install `@napi-rs/canvas` with `npm install --prefix outputs/render-tools @napi-rs/canvas`.
2. Run `node scripts/export-campus.mjs` to export the exact interactive scene and
   361 first-person camera poses into `outputs/campus-scene.json`.
3. Run Blender 4.5 in background mode with `--python scripts/render-campus.py -- animate`.
4. With Python packages `Pillow`, `numpy`, and `imageio-ffmpeg`, run
   `python scripts/finish-film.py` to compose and encode the film.

Temporary renders, dependencies, and the portable renderer stay in ignored
`outputs/`. The film is a 3D animation, not photorealistic AI video or stock footage.
