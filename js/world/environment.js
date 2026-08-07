import { clamp, lerp, smoothstep, makeGlowTexture } from './utils.js';
import { isMobile, quality } from './config.js';
import { state } from './state.js';

// ---------------------------------------------------------------
// Sky dome + stars
// ---------------------------------------------------------------
export function buildSky() {
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0xffd9a0) },
      bottomColor: { value: new THREE.Color(0xff9a56) },
      offset: { value: 40 },
      exponent: { value: 0.6 }
    },
    vertexShader:
      'varying vec3 vWorldPosition;' +
      'void main() {' +
      '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);' +
      '  vWorldPosition = worldPosition.xyz;' +
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);' +
      '}',
    fragmentShader:
      'uniform vec3 topColor;' +
      'uniform vec3 bottomColor;' +
      'uniform float offset;' +
      'uniform float exponent;' +
      'varying vec3 vWorldPosition;' +
      'void main() {' +
      '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;' +
      '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);' +
      '}',
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  state.skyMat = skyMat;
  state.scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat));

  const starPositions = new Float32Array(quality.stars * 3);
  for (let i = 0; i < quality.stars; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.55;
    const r = 380;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starTex = makeGlowTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]);
  const starMat = new THREE.PointsMaterial({ map: starTex, color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, opacity: 0 });
  state.starMat = starMat;
  state.scene.add(new THREE.Points(starGeo, starMat));
}

// ---------------------------------------------------------------
// Lights + sun/moon glow sprites
// ---------------------------------------------------------------
export function buildLights() {
  const hemiLight = new THREE.HemisphereLight(0xffe3b8, 0x4a3423, 0.7);
  state.scene.add(hemiLight);
  state.hemiLight = hemiLight;

  // The shadow frustum is deliberately small and re-centered on the
  // character every frame (see applyDayNight) rather than sized to cover
  // the whole map - that keeps shadow resolution good no matter how big
  // fieldExtent gets.
  const sunLight = new THREE.DirectionalLight(0xffb066, 1.9);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(quality.shadowRes, quality.shadowRes);
  sunLight.shadow.camera.left = -45;
  sunLight.shadow.camera.right = 45;
  sunLight.shadow.camera.top = 45;
  sunLight.shadow.camera.bottom = -45;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 220;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.02;
  state.scene.add(sunLight);
  state.scene.add(sunLight.target);
  state.sunLight = sunLight;

  const moonLight = new THREE.DirectionalLight(0x9fb4ff, 0);
  moonLight.castShadow = false;
  state.scene.add(moonLight);
  state.scene.add(moonLight.target);
  state.moonLight = moonLight;

  const sunGlowTex = makeGlowTexture([[0, 'rgba(255,244,214,1)'], [0.25, 'rgba(255,214,140,0.9)'], [0.6, 'rgba(255,170,90,0.35)'], [1, 'rgba(255,170,90,0)']]);
  const moonGlowTex = makeGlowTexture([[0, 'rgba(235,242,255,1)'], [0.3, 'rgba(205,218,255,0.75)'], [0.65, 'rgba(160,180,230,0.25)'], [1, 'rgba(160,180,230,0)']]);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunSprite.scale.set(70, 70, 1);
  state.scene.add(sunSprite);
  state.sunSprite = sunSprite;

  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  moonSprite.scale.set(46, 46, 1);
  state.scene.add(moonSprite);
  state.moonSprite = moonSprite;
}

// ---------------------------------------------------------------
// Clouds
// ---------------------------------------------------------------
export function buildClouds() {
  const cloudTex = makeGlowTexture([[0, 'rgba(255,250,240,0.9)'], [0.5, 'rgba(255,235,215,0.5)'], [1, 'rgba(255,225,200,0)']]);
  const cloudCount = isMobile ? 3 : 5;
  for (let i = 0; i < cloudCount; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.5, fog: false });
    const cloud = new THREE.Sprite(mat);
    const w = 40 + Math.random() * 40;
    cloud.scale.set(w, w * 0.45, 1);
    cloud.position.set(-140 + Math.random() * 280, 42 + Math.random() * 26, -120 + Math.random() * 60);
    cloud.userData.speed = 0.5 + Math.random() * 0.7;
    state.scene.add(cloud);
    state.clouds.push(cloud);
  }
}

export function updateClouds(dt) {
  for (let i = 0; i < state.clouds.length; i++) {
    state.clouds[i].position.x += dt * state.clouds[i].userData.speed;
    if (state.clouds[i].position.x > 140) state.clouds[i].position.x = -140;
  }
}

// ---------------------------------------------------------------
// Day / night keyframes
// ---------------------------------------------------------------
const dayKeyframes = [
  { t: 0.00, top: 0x0b1330, bottom: 0x141d3d, fog: 0x141d3d, sun: 0x6a7fc0, sunI: 0.0,  hemiSky: 0x28345c, hemiGround: 0x0c0f1e, hemiI: 0.18, stars: 1.0 },
  { t: 0.20, top: 0x5a5f92, bottom: 0xff9d6e, fog: 0xff9d6e, sun: 0xffb27a, sunI: 0.9,  hemiSky: 0x8894c4, hemiGround: 0x3a2f2a, hemiI: 0.35, stars: 0.25 },
  { t: 0.32, top: 0x9dc6ee, bottom: 0xffd9a8, fog: 0xffd9a8, sun: 0xffd7a8, sunI: 1.6,  hemiSky: 0xcfe4ff, hemiGround: 0x4a3a28, hemiI: 0.55, stars: 0.0 },
  { t: 0.50, top: 0x7fb8f2, bottom: 0xdcecff, fog: 0xdcecff, sun: 0xfff3d6, sunI: 2.1,  hemiSky: 0xdcecff, hemiGround: 0x4a4030, hemiI: 0.75, stars: 0.0 },
  { t: 0.68, top: 0xa9d3f3, bottom: 0xffe0b0, fog: 0xffe0b0, sun: 0xffc98a, sunI: 1.9,  hemiSky: 0xdcecff, hemiGround: 0x483826, hemiI: 0.7,  stars: 0.0 },
  { t: 0.74, top: 0xffd9a0, bottom: 0xff9a56, fog: 0xffab6e, sun: 0xffb066, sunI: 1.9,  hemiSky: 0xffe3b8, hemiGround: 0x4a3423, hemiI: 0.7,  stars: 0.0 },
  { t: 0.85, top: 0x3a2f66, bottom: 0xcc6a55, fog: 0xa8543f, sun: 0xff8f5e, sunI: 0.55, hemiSky: 0x584a7c, hemiGround: 0x2a2030, hemiI: 0.35, stars: 0.5 },
  { t: 1.00, top: 0x0b1330, bottom: 0x141d3d, fog: 0x141d3d, sun: 0x6a7fc0, sunI: 0.0,  hemiSky: 0x28345c, hemiGround: 0x0c0f1e, hemiI: 0.18, stars: 1.0 }
];
const _cA = new THREE.Color();
const _cB = new THREE.Color();
function sampleDay(t) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < dayKeyframes.length - 1 && dayKeyframes[i + 1].t < t) i++;
  const a = dayKeyframes[i];
  const b = dayKeyframes[Math.min(i + 1, dayKeyframes.length - 1)];
  const span = Math.max(0.0001, b.t - a.t);
  const lt = clamp((t - a.t) / span, 0, 1);
  function mixColor(key) { _cA.set(a[key]); _cB.set(b[key]); return _cA.clone().lerp(_cB, lt); }
  return {
    top: mixColor('top'), bottom: mixColor('bottom'), fog: mixColor('fog'), sun: mixColor('sun'),
    sunI: lerp(a.sunI, b.sunI, lt),
    hemiSky: mixColor('hemiSky'), hemiGround: mixColor('hemiGround'),
    hemiI: lerp(a.hemiI, b.hemiI, lt), stars: lerp(a.stars, b.stars, lt)
  };
}

const sunArcRadius = 150;
const _sunOffset = new THREE.Vector3();
const _moonOffset = new THREE.Vector3();

// Call once per frame. Positions the sun/moon relative to wherever the
// character currently is, so shadows and the celestial sprites stay
// correctly anchored no matter how far the character has wandered.
export function applyDayNight() {
  const s = sampleDay(state.dayTime);
  state.skyMat.uniforms.topColor.value.copy(s.top);
  state.skyMat.uniforms.bottomColor.value.copy(s.bottom);
  state.scene.fog.color.copy(s.fog);
  state.sunLight.color.copy(s.sun);
  state.sunLight.intensity = s.sunI;
  state.sunLight.castShadow = s.sunI > 0.05;
  state.hemiLight.color.copy(s.hemiSky);
  state.hemiLight.groundColor.copy(s.hemiGround);
  state.hemiLight.intensity = s.hemiI;
  state.starMat.opacity = s.stars * 0.9;

  const cx = state.character ? state.character.position.x : 0;
  const cy = state.character ? state.character.position.y : 0;
  const cz = state.character ? state.character.position.z : 0;

  const sunAngle = (state.dayTime - 0.25) * Math.PI * 2;
  _sunOffset.set(Math.cos(sunAngle) * sunArcRadius, Math.sin(sunAngle) * sunArcRadius * 0.6, 40);
  state.sunLight.position.set(cx + _sunOffset.x, cy + _sunOffset.y, cz + _sunOffset.z);
  state.sunLight.target.position.set(cx, cy, cz);

  const moonAngle = sunAngle + Math.PI;
  _moonOffset.set(Math.cos(moonAngle) * sunArcRadius, Math.sin(moonAngle) * sunArcRadius * 0.6, -40);
  state.moonLight.position.set(cx + _moonOffset.x, cy + _moonOffset.y, cz + _moonOffset.z);
  state.moonLight.target.position.set(cx, cy, cz);

  const sunElev = Math.sin(sunAngle);
  const dayFactor = smoothstep(-0.15, 0.15, sunElev);
  state.nightFactor = 1 - dayFactor;
  const moonElevFactor = smoothstep(-0.1, 0.15, Math.sin(moonAngle));
  state.moonLight.intensity = moonElevFactor * 0.4;

  state.sunSprite.position.set(cx, cy, cz).addScaledVector(_sunOffset.clone().normalize(), 260);
  state.sunSprite.material.opacity = smoothstep(-0.05, 0.1, sunElev);
  state.moonSprite.position.set(cx, cy, cz).addScaledVector(_moonOffset.clone().normalize(), 260);
  state.moonSprite.material.opacity = moonElevFactor * 0.85;
}

// ---------------------------------------------------------------
// Weather (rain / snow particles, shared system)
// ---------------------------------------------------------------
export function buildWeather() {
  const weatherPositions = new Float32Array(quality.weather * 3);
  const weatherSeeds = new Float32Array(quality.weather);
  for (let i = 0; i < quality.weather; i++) {
    weatherPositions[i * 3] = (Math.random() * 2 - 1) * 40;
    weatherPositions[i * 3 + 1] = Math.random() * 40;
    weatherPositions[i * 3 + 2] = (Math.random() * 2 - 1) * 40;
    weatherSeeds[i] = 0.6 + Math.random() * 0.6;
  }
  const weatherGeo = new THREE.BufferGeometry();
  weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
  const weatherMat = new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.1, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
  weatherPoints.visible = false;
  state.scene.add(weatherPoints);
  state.weatherGeo = weatherGeo;
  state.weatherMat = weatherMat;
  state.weatherPoints = weatherPoints;
  state.weatherSeeds = weatherSeeds;
}

const baseFogDensity = 0.012;
export function updateWeather(dt, camPos, t) {
  const weatherPoints = state.weatherPoints;
  const weatherMat = state.weatherMat;
  const weatherGeo = state.weatherGeo;
  const weatherSeeds = state.weatherSeeds;

  if (state.weatherMode === 'clear') {
    weatherPoints.visible = false;
    state.scene.fog.density = baseFogDensity;
    return;
  }
  weatherPoints.visible = true;
  const isSnow = state.weatherMode === 'snow';
  weatherMat.size = isSnow ? 0.16 : 0.09;
  weatherMat.color.set(isSnow ? 0xffffff : 0xcfe0ff);
  const fallSpeed = isSnow ? 2.0 : 15;
  const arr = weatherGeo.attributes.position.array;
  const count = weatherSeeds.length;
  for (let i = 0; i < count; i++) {
    arr[i * 3 + 1] -= fallSpeed * weatherSeeds[i] * dt;
    if (isSnow) arr[i * 3] += Math.sin(t * 0.6 + i) * dt * 0.25;
    if (arr[i * 3 + 1] < camPos.y - 6) {
      arr[i * 3] = camPos.x + (Math.random() * 2 - 1) * 40;
      arr[i * 3 + 1] = camPos.y + 22 + Math.random() * 10;
      arr[i * 3 + 2] = camPos.z + (Math.random() * 2 - 1) * 40;
    }
  }
  weatherGeo.attributes.position.needsUpdate = true;

  if (state.weatherMode === 'rain') {
    state.hemiLight.intensity *= 0.6;
    state.sunLight.intensity *= 0.55;
    state.scene.fog.density = 0.022;
    state.scene.fog.color.lerp(new THREE.Color(0x60708a), 0.5);
  } else {
    state.scene.fog.density = 0.02;
    state.scene.fog.color.lerp(new THREE.Color(0xdfe8f2), 0.35);
    state.hemiLight.intensity *= 1.05;
  }
}

