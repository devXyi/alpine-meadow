import { clamp, smoothstep } from './utils.js';
import { fieldExtent, quality, spawn } from './config.js';
import { terrainHeight, isBlocked, distToPath } from './terrain.js';
import { state } from './state.js';

// Shared wind vertex-shader injection, used by both grass and flowers so
// they sway together and consistently.
function windInject(shader) {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n' +
    'float windPhase = uTime * 1.6 + instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.6;\n' +
    'float bendAmount = pow(clamp(position.y, 0.0, 1.0), 1.6);\n' +
    'transformed.x += sin(windPhase) * 0.28 * bendAmount;\n' +
    'transformed.z += cos(windPhase * 0.8) * 0.18 * bendAmount;'
  );
}

// ---------------------------------------------------------------
// Grass
// ---------------------------------------------------------------
function createBladeGeometry() {
  const height = 1, width = 0.09;
  const geo = new THREE.PlaneGeometry(width, height, 1, 4);
  geo.translate(0, height / 2, 0);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const baseColor = new THREE.Color(0x2f5d2a), tipColor = new THREE.Color(0x9db24d);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i);
    const t = clamp(y / height, 0, 1);
    posAttr.setX(i, x * (1 - t * 0.9));
    posAttr.setZ(i, posAttr.getZ(i) + t * t * 0.18);
    const c = baseColor.clone().lerp(tipColor, t);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  posAttr.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildGrass() {
  const bladeGeo = createBladeGeometry();
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = function (shader) { windInject(shader); state.grassShaderRef = shader; };

  const grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, quality.grass);
  grassMesh.receiveShadow = true;
  grassMesh.castShadow = false;
  const dummy = new THREE.Object3D();
  const placeRange = fieldExtent * 0.96;
  let placed = 0, attempts = 0;
  while (placed < quality.grass && attempts < quality.grass * 3) {
    attempts++;
    const x = (Math.random() * 2 - 1) * placeRange;
    const z = (Math.random() * 2 - 1) * placeRange;
    if (isBlocked(x, z, 1.2) || distToPath(x, z) < 1.6) continue;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const h = 0.65 + Math.random() * 0.75;
    dummy.scale.set(0.8 + Math.random() * 0.3, h, 0.8 + Math.random() * 0.3);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  grassMesh.count = placed;
  grassMesh.instanceMatrix.needsUpdate = true;
  state.scene.add(grassMesh);
}

// ---------------------------------------------------------------
// Flowers
// ---------------------------------------------------------------
function createFlowerGeometry(bloomHex) {
  const height = 0.42, width = 0.16;
  const geo = new THREE.PlaneGeometry(width, height, 1, 3);
  geo.translate(0, height / 2, 0);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const stemColor = new THREE.Color(0x3f6b2e), bloomColor = new THREE.Color(bloomHex);
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const t = clamp(y / height, 0, 1);
    const widen = t > 0.55 ? 1 + (t - 0.55) * 1.8 : 1 - (0.55 - t) * 0.3;
    posAttr.setX(i, posAttr.getX(i) * Math.max(widen, 0.15));
    const c = stemColor.clone().lerp(bloomColor, smoothstep(0.45, 0.85, t));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  posAttr.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildFlowers() {
  const flowerColors = [0xfff3a0, 0xffffff, 0xc9a0e0, 0xff9fc0];
  const dummy = new THREE.Object3D();
  const placeRange = fieldExtent * 0.9;
  for (let c = 0; c < flowerColors.length; c++) {
    const geo = createFlowerGeometry(flowerColors[c]);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
    mat.onBeforeCompile = function (shader) { windInject(shader); state.flowerShaderRefs.push(shader); };
    const count = Math.round(quality.flowersPer);
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.receiveShadow = true;
    let placedF = 0, tries = 0;
    while (placedF < count && tries < count * 4) {
      tries++;
      const x = (Math.random() * 2 - 1) * placeRange;
      const z = (Math.random() * 2 - 1) * placeRange;
      if (isBlocked(x, z, 1.4) || distToPath(x, z) < 1.8) continue;
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const s = 0.85 + Math.random() * 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placedF, dummy.matrix);
      placedF++;
    }
    mesh.count = placedF;
    mesh.instanceMatrix.needsUpdate = true;
    state.scene.add(mesh);
  }
}

// ---------------------------------------------------------------
// Trees
// ---------------------------------------------------------------
function buildTree() {
  const group = new THREE.Group();
  const trunkHeight = 1.6 + Math.random() * 0.8;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.14, trunkHeight, 6),
    new THREE.MeshStandardMaterial({ color: 0x5b3d28, roughness: 0.95, flatShading: true })
  );
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true; trunk.receiveShadow = true;
  group.add(trunk);

  const isPine = Math.random() < 0.4;
  const foliageColorBase = new THREE.Color().setHSL(0.27 + Math.random() * 0.05, 0.45 + Math.random() * 0.15, 0.32 + Math.random() * 0.08);
  if (isPine) {
    let y = trunkHeight * 0.55;
    for (let i = 0; i < 2; i++) {
      const r = 0.95 - i * 0.28, h = 1.2 - i * 0.18;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 7),
        new THREE.MeshStandardMaterial({ color: foliageColorBase.clone().offsetHSL(0, 0, -i * 0.03), roughness: 0.85, flatShading: true })
      );
      cone.position.y = y + h / 2;
      cone.castShadow = true; cone.receiveShadow = true;
      group.add(cone);
      y += h * 0.6;
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const r = 0.8 + Math.random() * 0.35;
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({ color: foliageColorBase.clone().offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.05), roughness: 0.85, flatShading: true })
      );
      blob.position.set((Math.random() - 0.5) * 0.6, trunkHeight + 0.5 + i * 0.4, (Math.random() - 0.5) * 0.6);
      blob.castShadow = true; blob.receiveShadow = true;
      group.add(blob);
    }
  }
  return group;
}

export function buildTrees() {
  const placeRange = fieldExtent * 0.9;
  const spawnClearance = 6;
  let treeAttempts = 0;
  while (state.trees.length < quality.trees && treeAttempts < 1200) {
    treeAttempts++;
    const x = (Math.random() * 2 - 1) * placeRange;
    const z = (Math.random() * 2 - 1) * placeRange;
    if (isBlocked(x, z, 3) || distToPath(x, z) < 2.4) continue;
    if (Math.hypot(x - spawn.x, z - spawn.z) < spawnClearance) continue;
    let tooClose = false;
    for (let i = 0; i < state.trees.length; i++) {
      if (Math.hypot(x - state.trees[i].x, z - state.trees[i].z) < 4.5) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const tree = buildTree();
    tree.position.set(x, terrainHeight(x, z), z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.85 + Math.random() * 0.5;
    tree.scale.set(s, s * (0.9 + Math.random() * 0.3), s);
    state.scene.add(tree);
    state.trees.push({ x: x, z: z, radius: 0.55 * s });
  }
}

// ---------------------------------------------------------------
// Distant mountains (unfogged backdrop, fixed world positions)
// ---------------------------------------------------------------
function buildMountain(radius, height, segments) {
  const geo = new THREE.ConeGeometry(radius, height, segments, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < height / 2 - 0.05) {
      const j = 1 + (Math.random() - 0.5) * 0.25;
      pos.setX(i, pos.getX(i) * j);
      pos.setZ(i, pos.getZ(i) * j);
    }
  }
  pos.needsUpdate = true;
  const colors = new Float32Array(pos.count * 3);
  const baseColor = new THREE.Color(0x4a5578), snowColor = new THREE.Color(0xf0ecec);
  for (let i = 0; i < pos.count; i++) {
    const t = clamp((pos.getY(i) + height / 2) / height, 0, 1);
    const c = baseColor.clone().lerp(snowColor, smoothstep(0.72, 0.95, t));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, flatShading: true }));
}

export function buildMountains() {
  const mountainCount = 9;
  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2 + Math.random() * 0.35;
    const dist = 270 + Math.random() * 90;
    const h = 60 + Math.random() * 55;
    const r = 50 + Math.random() * 40;
    const mx = Math.cos(angle) * dist, mz = Math.sin(angle) * dist;
    const m = buildMountain(r, h, 6);
    m.position.set(mx, terrainHeight(mx, mz) + h / 2 - 8, mz);
    m.rotation.y = Math.random() * Math.PI * 2;
    state.scene.add(m);
  }
}

