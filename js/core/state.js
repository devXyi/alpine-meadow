// A single shared, mutable object. Every module that needs to read or write
// cross-cutting runtime state (the scene graph, the day/night clock, shader
// uniform references, animal collections, etc.) imports this same object,
// so a change made in one module is visible everywhere else.
//
// Static config lives in config.js instead - this file is only for things
// that change while the app is running.

export const state = {
  // Core three.js handles, set once in main.js during init.
  scene: null,
  camera: null,
  renderer: null,
  canvas: null,

  // The player's avatar (a THREE.Group built in character.js).
  character: null,

  // Day/night + weather clock.
  dayTime: 0.74,
  nightFactor: 0,
  weatherMode: 'clear',

  // Third-person camera orbit angles, driven by drag input.
  cameraYaw: 0,
  cameraPitch: -0.28,

  // Shader uniform references that need a fresh uTime each frame.
  grassShaderRef: null,
  waterShaderRef: null,
  flowerShaderRefs: [],

  // Static-but-tracked collections (built once, read every frame for
  // collision or animation).
  trees: [],
  clouds: [],
  flyers: [],
  fish: [],
  rabbits: [],
  windowGlowMats: [],
  lanternGlows: [],
  smokePuffs: [],

  // Fireflies (single Points system).
  fireflyHomes: [],
  fireflyGeo: null,
  fireflyMat: null,

  // Weather particles (single Points system, reused for rain/snow).
  weatherGeo: null,
  weatherMat: null,
  weatherPoints: null,
  weatherSeeds: null,

  // Sky / lighting handles updated every frame by environment.js.
  starMat: null,
  skyMat: null,
  sunLight: null,
  moonLight: null,
  hemiLight: null,
  sunSprite: null,
  moonSprite: null
};

