import { quality, fieldExtent, lake, pathPoints } from '../core/config.js';
import { terrainHeight, isBlocked, distToPath } from './terrain.js';
import { state } from '../core/state.js';
import { makeGlowTexture } from '../core/utils.js';

function randomPoint(range) {
  return {
    x: (Math.random() * 2 - 1) * range,
    z: (Math.random() * 2 - 1) * range
  };
}

export function buildWorldDetails() {
  buildRocks();
  buildShrubs();
  buildReeds();
  buildSteppingStones();
  buildFences();
  buildBenches();
  buildCampfire();
}

function buildRocks() {
  const geo = new THREE.IcosahedronGeometry(0.72, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x62645e, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, quality.rocks);
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;
  while (placed < quality.rocks && attempts < quality.rocks * 5) {
    attempts++;
    const p = randomPoint(fieldExtent * 0.94);
    if (isBlocked(p.x, p.z, 1.2) || distToPath(p.x, p.z) < 1.7) continue;
    dummy.position.set(p.x, terrainHeight(p.x, p.z) + 0.22, p.z);
    dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.35);
    const s = 0.35 + Math.random() * 1.2;
    dummy.scale.set(s * (0.8 + Math.random() * 0.5), s * (0.6 + Math.random() * 0.5), s * (0.75 + Math.random() * 0.4));
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.count = placed;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  state.scene.add(mesh);
}

function buildShrubs() {
  const geo = new THREE.IcosahedronGeometry(0.55, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x355c32, roughness: 0.92, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, quality.shrubs);
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;
  while (placed < quality.shrubs && attempts < quality.shrubs * 5) {
    attempts++;
    const p = randomPoint(fieldExtent * 0.92);
    if (isBlocked(p.x, p.z, 1.0) || distToPath(p.x, p.z) < 1.25) continue;
    dummy.position.set(p.x, terrainHeight(p.x, p.z) + 0.32, p.z);
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.45 + Math.random() * 0.8;
    dummy.scale.set(s * 1.25, s * (0.75 + Math.random() * 0.4), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.count = placed;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  state.scene.add(mesh);
}

function buildReeds() {
  const geo = new THREE.CylinderGeometry(0.018, 0.028, 0.8, 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x718d4a, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, quality.reeds);
  const dummy = new THREE.Object3D();
  let placed = 0;
  while (placed < quality.reeds) {
    const angle = Math.random() * Math.PI * 2;
    const r = lake.radius + 0.3 + Math.random() * 2.1;
    const x = lake.x + Math.cos(angle) * r;
    const z = lake.z + Math.sin(angle) * r;
    dummy.position.set(x, terrainHeight(x, z) + 0.35, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.18, Math.random() * Math.PI, (Math.random() - 0.5) * 0.18);
    const s = 0.65 + Math.random() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  state.scene.add(mesh);
}

function buildSteppingStones() {
  const geo = new THREE.CylinderGeometry(0.42, 0.5, 0.18, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x77756d, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, quality.stones);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < pathPoints.length - 1 && placed < quality.stones; i++) {
    const a = pathPoints[i], b = pathPoints[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.floor(len / 2.3));
    for (let j = 0; j <= steps && placed < quality.stones; j++) {
      const t = j / steps;
      const x = a[0] + dx * t + (Math.random() - 0.5) * 0.45;
      const z = a[1] + dz * t + (Math.random() - 0.5) * 0.45;
      dummy.position.set(x, terrainHeight(x, z) + 0.09, z);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
      const s = 0.75 + Math.random() * 0.45;
      dummy.scale.set(s, 0.8 + Math.random() * 0.25, s * (0.8 + Math.random() * 0.3));
      dummy.updateMatrix();
      mesh.setMatrixAt(placed++, dummy.matrix);
    }
  }
  mesh.count = placed;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  state.scene.add(mesh);
}

function buildFences() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4a30, roughness: 0.95, flatShading: true });
  const group = new THREE.Group();
  const segments = [
    [-18, 5, 0, 12], [-28, -8, 0, 10], [18, 7, 1, 10], [27, -10, 1, 11]
  ];
  for (let i = 0; i < segments.length; i++) {
    const [x, z, axis, length] = segments[i];
    const posts = Math.floor(length / 2) + 1;
    for (let j = 0; j < posts; j++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.15, 6), wood);
      const offset = -length / 2 + (j / Math.max(1, posts - 1)) * length;
      p.position.set(x + (axis ? offset : 0), terrainHeight(x + (axis ? offset : 0), z + (axis ? 0 : offset)) + 0.58, z + (axis ? 0 : offset));
      p.castShadow = true;
      group.add(p);
    }
    for (let railY of [0.48, 0.82]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(axis ? length : 0.12, 0.1, axis ? 0.12 : length), wood);
      rail.position.set(x, terrainHeight(x, z) + railY, z);
      rail.castShadow = true;
      group.add(rail);
    }
  }
  state.scene.add(group);
}

function buildBenches() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x74482d, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x3d3f3b, roughness: 0.85 });
  const positions = [[7, -16, 0.2], [11, -4, -0.8], [-2, 12, 1.4], [34, 7, -0.5]];
  for (let i = 0; i < positions.length; i++) {
    const [x, z, yaw] = positions[i];
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.42), wood);
    seat.position.y = 0.72;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.1), wood);
    back.position.set(0, 1.03, -0.16);
    g.add(back);
    for (const sx of [-0.58, 0.58]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), metal);
      leg.position.set(sx, 0.35, 0);
      g.add(leg);
    }
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = yaw;
    state.scene.add(g);
  }
}

function buildCampfire() {
  const x = 4, z = -2;
  const y = terrainHeight(x, z);
  const group = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5a3926, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 6), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * Math.PI / 3;
    log.position.y = 0.1;
    group.add(log);
  }
  const flameTex = makeGlowTexture([[0, 'rgba(255,245,180,1)'], [0.3, 'rgba(255,180,40,0.9)'], [0.7, 'rgba(255,80,20,0.35)'], [1, 'rgba(255,60,10,0)']]);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.scale.set(1.9, 2.3, 1);
  flame.position.y = 1.05;
  group.add(flame);
  const light = new THREE.PointLight(0xff8b3d, 1.3, 13, 2);
  light.position.y = 1.1;
  group.add(light);
  group.position.set(x, y, z);
  group.userData.flame = flame;
  group.userData.light = light;
  state.scene.add(group);
  state.campfire = group;
}

export function updateWorldDetails(t) {
  if (!state.campfire) return;
  const flame = state.campfire.userData.flame;
  const light = state.campfire.userData.light;
  const nightBoost = 0.35 + state.nightFactor * 0.9;
  const flicker = 0.9 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.1) * 0.05;
  flame.scale.x = 1.7 + flicker * 0.25;
  flame.scale.y = 2.0 + flicker * 0.35;
  flame.material.opacity = Math.min(1, 0.65 + state.nightFactor * 0.35);
  light.intensity = 1.0 * nightBoost * flicker;
}
