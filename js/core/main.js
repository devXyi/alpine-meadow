import { isMobile, spawn } from './config.js';
import { state } from './state.js';
import { terrainHeight, buildGround, buildLake } from '../world/terrain.js';
import { buildSky, buildLights, buildClouds, buildWeather, applyDayNight, updateWeather, updateClouds } from '../world/environment.js';
import { buildGrass, buildFlowers, buildTrees, buildMountains } from '../world/scenery.js';
import { buildHouses, updateHouses } from '../world/village.js';
import { buildFlyers, updateFlyers, buildFishSchool, updateFish, buildRabbits, updateRabbits, buildFireflies, updateFireflies } from '../entities/wildlife.js';
import { buildCharacter } from '../entities/character.js';
import { initControls, updatePlayer, updateCamera } from '../input/controls.js';

if (!window.THREE) {
  document.getElementById('loading').textContent = 'Could not load the 3D library. Please check your connection and reload.';
} else {
  init();
}

function init() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  } catch (e) {
    document.getElementById('loading').textContent = 'Your browser does not support WebGL, which this scene needs.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xff9a56, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffab6e, 0.012);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 480);

  state.canvas = canvas;
  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;

  buildSky();
  buildLights();
  buildClouds();
  buildWeather();
  buildGround();
  buildLake();
  buildGrass();
  buildFlowers();
  buildTrees();
  buildMountains();
  buildHouses();
  buildFlyers();
  buildFishSchool();
  buildRabbits();
  buildFireflies();

  state.character = buildCharacter();
  state.character.position.set(spawn.x, terrainHeight(spawn.x, spawn.z), spawn.z);
  state.character.rotation.y = 0;

  initControls();
  applyDayNight();
  updateCamera();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let elapsed = 0;
  const cycleSeconds = 150;
  const timeSlider = document.getElementById('timeSlider');

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    state.dayTime += dt / cycleSeconds;
    timeSlider.value = String(Math.round((((state.dayTime % 1) + 1) % 1) * 1000));

    applyDayNight();
    updateWeather(dt, state.character.position, elapsed);

    if (state.grassShaderRef) state.grassShaderRef.uniforms.uTime.value = elapsed;
    if (state.waterShaderRef) state.waterShaderRef.uniforms.uTime.value = elapsed;
    for (let i = 0; i < state.flowerShaderRefs.length; i++) state.flowerShaderRefs[i].uniforms.uTime.value = elapsed;

    updateFlyers(elapsed);
    updateFish(elapsed);
    updateRabbits(elapsed);
    updateFireflies(elapsed);
    updateHouses(elapsed);
    updatePlayer(dt);
    updateCamera();
    updateClouds(dt);

    renderer.render(scene, camera);
  }

  const loadingEl = document.getElementById('loading');
  loadingEl.style.opacity = '0';
  setTimeout(function () { loadingEl.style.display = 'none'; }, 650);
  animate();
}
