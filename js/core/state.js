// A single shared, mutable object for runtime state.
export const state = {
  scene: null,
  camera: null,
  renderer: null,
  canvas: null,
  character: null,

  dayTime: 0.74,
  nightFactor: 0,
  weatherMode: 'clear',
  running: false,
  windStrength: 1,

  cameraYaw: 0,
  cameraPitch: -0.28,

  grassShaderRef: null,
  waterShaderRef: null,
  flowerShaderRefs: [],

  trees: [],
  clouds: [],
  flyers: [],
  fish: [],
  rabbits: [],
  windowGlowMats: [],
  lanternGlows: [],
  smokePuffs: [],

  fireflyHomes: [],
  fireflyGeo: null,
  fireflyMat: null,

  weatherGeo: null,
  weatherMat: null,
  weatherPoints: null,
  weatherSeeds: null,

  starMat: null,
  skyMat: null,
  sunLight: null,
  moonLight: null,
  hemiLight: null,
  sunSprite: null,
  moonSprite: null
};
