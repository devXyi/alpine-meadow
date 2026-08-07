# Alpine Meadow

A walkable low-poly 3D meadow built with [Three.js](https://threejs.org/) — rolling hills, a lake with fish
and butterflies, a small village with glowing windows and chimney smoke, wildflowers, distant snow-capped
mountains, and a full day/night cycle with weather. You control a character that walks through it in
third person.

## Running locally

This project uses native ES modules, so opening `index.html` directly (`file://`) will be blocked by the
browser's module CORS rules. Serve it locally instead:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Deploying to GitHub Pages

Push this repo to GitHub, then go to **Settings → Pages** and set it to deploy from the `main` branch,
root folder. No build step — it's static files.

## Controls

- **Drag** anywhere to orbit the camera around your character
- **Joystick** (bottom-left) or **WASD / arrow keys** to walk
- **⚙** (top-right) — time of day, weather, and render quality

## Project structure

```
index.html
css/
  style.css        UI overlay styling
js/
  utils.js         math + texture helpers, no dependencies
  config.js        world layout and quality presets (static)
  state.js         shared mutable runtime state
  terrain.js       ground/lake meshes, height + collision functions
  environment.js   sky, sun/moon, day-night cycle, weather, clouds
  scenery.js       grass, flowers, trees, mountains
  village.js       houses, lanterns, chimney smoke
  wildlife.js      butterflies, birds, fish, rabbits, fireflies
  character.js     the walking character model + walk-cycle animation
  controls.js      input handling, movement, third-person camera follow
  main.js          entry point: init + render loop
```

Modules share state through `state.js` rather than passing objects through long parameter chains — most
`build*()` functions take no arguments and just read `state.scene` directly.

## Notes

Three.js (r128) loads from cdnjs; everything else is dependency-free vanilla JS. Grass/flowers use an
instanced mesh with a small custom wind shader; the day/night cycle is a hand-written keyframe blend, not a
physically based sky model.
