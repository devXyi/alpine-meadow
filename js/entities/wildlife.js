import { fieldExtent, quality, lake } from './config.js';
import { terrainHeight, isBlocked } from './terrain.js';
import { state } from './state.js';
import { makeGlowTexture } from './utils.js';

// ---------------------------------------------------------------
// Flyers - butterflies and birds share one wing-flap system, just
// spawned with different scale, height, and flight parameters.
// ---------------------------------------------------------------
function buildFlyer(color) {
  const group = new THREE.Group();
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.4, 0.22, 0.32, 0.5);
  wingShape.quadraticCurveTo(0.14, 0.42, 0, 0.12);
  wingShape.quadraticCurveTo(-0.02, 0.02, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  wingGeo.rotateZ(Math.PI / 2);
  const wingMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide, roughness: 0.5, emissive: color, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 });
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.scale.x = -1;
  group.add(wingL, wingR);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 5), new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.6 }));
  body.rotation.x = Math.PI / 2;
  group.add(body);
  group.userData.wingL = wingL;
  group.userData.wingR = wingR;
  return group;
}

function spawnFlyer(opts) {
  const b = buildFlyer(opts.color);
  b.scale.setScalar(opts.scale);
  b.userData.seed = Math.random() * 1000;
  b.userData.radius = opts.radius;
  b.userData.speed = opts.speed;
  b.userData.heightBase = opts.heightBase;
  b.userData.heightVar = opts.heightVar;
  b.userData.centerX = opts.centerX;
  b.userData.centerZ = opts.centerZ;
  b.userData.flapSpeed = opts.flapSpeed;
  b.userData.flapAmount = opts.flapAmount;
  b.userData.prevPos = new THREE.Vector3(opts.centerX + opts.radius, opts.heightBase, opts.centerZ);
  state.scene.add(b);
  state.flyers.push(b);
}

export function buildFlyers() {
  const butterflyPalette = [0xff9f45, 0xffe066, 0xe6a8d7, 0xfff6e8, 0x8fd0ff];
  const butterflyCount = Math.round(quality.fireflies / 7) + 3;
  for (let i = 0; i < butterflyCount; i++) {
    spawnFlyer({
      color: butterflyPalette[i % butterflyPalette.length], scale: 1,
      radius: 3 + Math.random() * 5, speed: 0.25 + Math.random() * 0.25,
      heightBase: lake.y + 1.2 + Math.random() * 1.6, heightVar: 0.35,
      centerX: lake.x, centerZ: lake.z, flapSpeed: 22, flapAmount: 0.85
    });
  }
  const birdPalette = [0x3a3530, 0x55493c, 0x2c2925];
  for (let i = 0; i < quality.birds; i++) {
    spawnFlyer({
      color: birdPalette[i % birdPalette.length], scale: 2.4,
      radius: 18 + Math.random() * 26, speed: 0.1 + Math.random() * 0.08,
      heightBase: 14 + Math.random() * 6, heightVar: 1.4,
      centerX: (Math.random() * 2 - 1) * 35, centerZ: (Math.random() * 2 - 1) * 35,
      flapSpeed: 6, flapAmount: 0.55
    });
  }
}

export function updateFlyers(t) {
  for (let i = 0; i < state.flyers.length; i++) {
    const b = state.flyers[i];
    const u = b.userData;
    const angle = t * u.speed + u.seed;
    const x = u.centerX + Math.cos(angle) * u.radius + Math.sin(t * 0.6 + u.seed) * u.radius * 0.18;
    const z = u.centerZ + Math.sin(angle * 1.15) * u.radius + Math.cos(t * 0.5 + u.seed) * u.radius * 0.18;
    const y = u.heightBase + Math.sin(t * 1.8 + u.seed) * u.heightVar;
    const newPos = new THREE.Vector3(x, y, z);
    b.position.copy(newPos);
    const dir = newPos.clone().sub(u.prevPos);
    if (dir.lengthSq() > 0.00001) b.lookAt(newPos.clone().add(dir));
    u.prevPos = newPos;
    const flap = Math.sin(t * u.flapSpeed + u.seed * 5) * u.flapAmount;
    u.wingL.rotation.z = flap;
    u.wingR.rotation.z = -flap;
  }
}

// ---------------------------------------------------------------
// Fish
// ---------------------------------------------------------------
function buildFish(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), bodyMat);
  body.scale.set(1.6, 0.55, 0.7);
  group.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 4), bodyMat);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.26, 0, 0);
  tail.scale.set(1, 1, 0.25);
  group.add(tail);
  group.userData.tail = tail;
  return group;
}

export function buildFishSchool() {
  const fishColors = [0xe8823f, 0xd6532f, 0xc9c2a0];
  for (let i = 0; i < quality.fish; i++) {
    const f = buildFish(fishColors[i % fishColors.length]);
    f.userData.seed = Math.random() * 1000;
    f.userData.radius = 1.5 + Math.random() * (lake.radius - 2.5);
    f.userData.speed = 0.3 + Math.random() * 0.3;
    f.userData.depth = lake.y - 0.3 - Math.random() * 0.5;
    f.userData.prevPos = new THREE.Vector3(lake.x, f.userData.depth, lake.z);
    state.scene.add(f);
    state.fish.push(f);
  }
}

export function updateFish(t) {
  for (let i = 0; i < state.fish.length; i++) {
    const f = state.fish[i];
    const u = f.userData;
    const angle = t * u.speed + u.seed;
    const x = lake.x + Math.cos(angle) * u.radius;
    const z = lake.z + Math.sin(angle * 1.3) * u.radius;
    const newPos = new THREE.Vector3(x, u.depth, z);
    f.position.copy(newPos);
    const dir = newPos.clone().sub(u.prevPos);
    if (dir.lengthSq() > 0.00001) f.lookAt(newPos.clone().add(dir));
    u.prevPos = newPos;
    u.tail.rotation.y = Math.sin(t * 6 + u.seed) * 0.4;
  }
}

// ---------------------------------------------------------------
// Rabbits
// ---------------------------------------------------------------
function buildRabbit(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), bodyMat);
  body.scale.set(1.3, 1, 1);
  body.position.y = 0.16;
  body.castShadow = true;
  group.add(body);
  for (let side = -1; side <= 1; side += 2) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), bodyMat);
    ear.position.set(0.05, 0.34, side * 0.06);
    ear.rotation.set(-0.2, 0, 0.22 * side);
    group.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  tail.position.set(-0.17, 0.16, 0);
  group.add(tail);
  return group;
}

export function buildRabbits() {
  for (let i = 0; i < quality.rabbits; i++) {
    const r = buildRabbit(Math.random() < 0.5 ? 0xc9a578 : 0xf5f0e6);
    let x = 0, z = 0, tries = 0;
    do {
      x = (Math.random() * 2 - 1) * fieldExtent * 0.75;
      z = (Math.random() * 2 - 1) * fieldExtent * 0.75;
      tries++;
    } while (isBlocked(x, z, 3) && tries < 20);
    r.userData.home = { x: x, z: z };
    r.userData.seed = Math.random() * 1000;
    r.userData.prevPos = { x: x, z: z };
    r.position.set(x, terrainHeight(x, z), z);
    state.scene.add(r);
    state.rabbits.push(r);
  }
}

export function updateRabbits(t) {
  for (let i = 0; i < state.rabbits.length; i++) {
    const r = state.rabbits[i];
    const u = r.userData;
    const x = u.home.x + Math.sin(t * 0.15 + u.seed) * 3.5 + Math.sin(t * 0.4 + u.seed * 2) * 1.2;
    const z = u.home.z + Math.cos(t * 0.13 + u.seed * 1.4) * 3.5 + Math.cos(t * 0.37 + u.seed * 1.8) * 1.2;
    const groundY = terrainHeight(x, z);
    const hop = Math.abs(Math.sin(t * 3.2 + u.seed * 3)) * 0.09;
    const prevGroundY = terrainHeight(u.prevPos.x, u.prevPos.z);
    const newPos = new THREE.Vector3(x, groundY + hop, z);
    const dir = new THREE.Vector3(x, groundY, z).sub(new THREE.Vector3(u.prevPos.x, prevGroundY, u.prevPos.z));
    r.position.copy(newPos);
    if (dir.lengthSq() > 0.0002) r.lookAt(newPos.clone().add(dir));
    u.prevPos = { x: x, z: z };
  }
}

// ---------------------------------------------------------------
// Fireflies (night only, single Points system with per-vertex blink)
// ---------------------------------------------------------------
export function buildFireflies() {
  const fireflyHomes = state.fireflyHomes;
  for (let i = 0; i < quality.fireflies; i++) {
    let hx = 0, hz = 0, tries = 0;
    do {
      hx = (Math.random() * 2 - 1) * fieldExtent * 0.9;
      hz = (Math.random() * 2 - 1) * fieldExtent * 0.9;
      tries++;
    } while (isBlocked(hx, hz, 1) && tries < 20);
    fireflyHomes.push({ x: hx, z: hz, seed: Math.random() * 1000 });
  }
  const fireflyPositions = new Float32Array(quality.fireflies * 3);
  const fireflyColors = new Float32Array(quality.fireflies * 3);
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  fireflyGeo.setAttribute('color', new THREE.BufferAttribute(fireflyColors, 3));
  const fireflyTex = makeGlowTexture([[0, 'rgba(230,255,180,1)'], [0.4, 'rgba(210,255,140,0.85)'], [1, 'rgba(210,255,140,0)']]);
  const fireflyMat = new THREE.PointsMaterial({ map: fireflyTex, vertexColors: true, size: 0.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  state.scene.add(fireflyPoints);
  state.fireflyGeo = fireflyGeo;
  state.fireflyMat = fireflyMat;
}

export function updateFireflies(t) {
  const fireflyGeo = state.fireflyGeo;
  const fireflyHomes = state.fireflyHomes;
  const posArr = fireflyGeo.attributes.position.array;
  const colArr = fireflyGeo.attributes.color.array;
  for (let i = 0; i < fireflyHomes.length; i++) {
    const home = fireflyHomes[i];
    const seed = home.seed;
    const x = home.x + Math.sin(t * 0.4 + seed) * 2.2 + Math.sin(t * 0.9 + seed * 2) * 0.6;
    const z = home.z + Math.cos(t * 0.35 + seed * 1.3) * 2.2 + Math.cos(t * 0.8 + seed * 1.7) * 0.6;
    const y = terrainHeight(x, z) + 0.6 + Math.sin(t * 1.1 + seed * 3) * 0.4;
    posArr[i * 3] = x; posArr[i * 3 + 1] = y; posArr[i * 3 + 2] = z;
    const blink = Math.max(0, Math.sin(t * 2.0 + seed * 6.28));
    const b = state.nightFactor * (0.2 + 0.8 * blink);
    colArr[i * 3] = 0.85 * b; colArr[i * 3 + 1] = 1.0 * b; colArr[i * 3 + 2] = 0.55 * b;
  }
  fireflyGeo.attributes.position.needsUpdate = true;
  fireflyGeo.attributes.color.needsUpdate = true;
}

