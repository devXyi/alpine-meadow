import { clamp, smoothstep } from './utils.js';
import { fieldExtent, quality, spawn } from './config.js';
import { terrainHeight, isBlocked, distToPath } from './terrain.js';
import { state } from './state.js';

function windInject(shader) {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n' +
    'float windPhase = uTime * (1.6 + 0.7 * ' + '1.0' + ') + instanceMatrix[3].x * 0.42 + instanceMatrix[3].z * 0.42;\n' +
    'float bendAmount = pow(clamp(position.y, 0.0, 1.0), 1.35);\n' +
    'float gust = 0.72 + 0.28 * sin(uTime * 0.55 + instanceMatrix[3].x * 0.05);\n' +
    'transformed.x += sin(windPhase) * 0.34 * bendAmount * gust;\n' +
    'transformed.z += cos(windPhase * 0.82) * 0.24 * bendAmount * gust;'
  );
}

// Two crossed, vertically segmented planes make each blade readable from
// every angle. Six height segments give the blade a visibly flexible bend.
function createBladeGeometry() {
  const height = 1;
  const width = 0.10;
  const segments = 6;
  const vertsPerPlane = (segments + 1) * 2;
  const planeCount = 2;
  const vertexCount = vertsPerPlane * planeCount;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = [];
  const baseColor = new THREE.Color(0x285522);
  const midColor = new THREE.Color(0x4e7c32);
  const tipColor = new THREE.Color(0xb0c95a);

  let v = 0;
  for (let p = 0; p < planeCount; p++) {
    const angle = p * Math.PI * 0.5;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let s = 0; s <= segments; s++) {
      const y = s / segments;
      const half = width * 0.5 * (1 - y * 0.86);
      const bendZ = y * y * 0.16;
      for (let side = -1; side <= 1; side += 2) {
        const lx = side * half;
        const lz = bendZ;
        const idx = v * 3;
        positions[idx] = lx * ca - lz * sa;
        positions[idx + 1] = y * height;
        positions[idx + 2] = lx * sa + lz * ca;
        const c = y < 0.5 ? baseColor.clone().lerp(midColor, y * 2) : midColor.clone().lerp(tipColor, (y - 0.5) * 2);
        colors[idx] = c.r; colors[idx + 1] = c.g; colors[idx + 2] = c.b;
        v++;
      }
    }
    const base = p * vertsPerPlane;
    for (let s = 0; s < segments; s++) {
      const a = base + s * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildGrass() {
  const bladeGeo = createBladeGeometry();
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = function (shader) { windInject(shader); state.grassShaderRef = shader; };
  const grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, quality.grass);
  grassMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const placeRange = fieldExtent * 0.96;
  let placed = 0, attempts = 0;
  while (placed < quality.grass && attempts < quality.grass * 3) {
    attempts++;
    const x = (Math.random() * 2 - 1) * placeRange;
    const z = (Math.random() * 2 - 1) * placeRange;
    if (isBlocked(x, z, 0.85) || distToPath(x, z) < 1.35) continue;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const h = 0.55 + Math.random() * 0.95;
    const w = 0.72 + Math.random() * 0.5;
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  grassMesh.count = placed;
  grassMesh.instanceMatrix.needsUpdate = true;
  state.scene.add(grassMesh);
}

function createFlowerGeometry(bloomHex) {
  const height = 0.42, width = 0.16;
  const geo = new THREE.PlaneGeometry(width, height, 1, 4);
  geo.translate(0, height / 2, 0);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const stemColor = new THREE.Color(0x3f6b2e), bloomColor = new THREE.Color(bloomHex);
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i), t = clamp(y / height, 0, 1);
    const widen = t > 0.55 ? 1 + (t - 0.55) * 1.8 : 1 - (0.55 - t) * 0.3;
    posAttr.setX(i, posAttr.getX(i) * Math.max(widen, 0.15));
    const c = stemColor.clone().lerp(bloomColor, smoothstep(0.45, 0.85, t));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
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
      const x = (Math.random() * 2 - 1) * placeRange, z = (Math.random() * 2 - 1) * placeRange;
      if (isBlocked(x, z, 1.2) || distToPath(x, z) < 1.5) continue;
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
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

function buildTree() {
  const group = new THREE.Group();
  const trunkHeight = 1.6 + Math.random() * 0.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, trunkHeight, 7), new THREE.MeshStandardMaterial({ color: 0x5b3d28, roughness: 0.95, flatShading: true }));
  trunk.position.y = trunkHeight / 2; trunk.castShadow = true; trunk.receiveShadow = true; group.add(trunk);
  const isPine = Math.random() < 0.4;
  const foliageColorBase = new THREE.Color().setHSL(0.27 + Math.random() * 0.05, 0.45 + Math.random() * 0.15, 0.32 + Math.random() * 0.08);
  if (isPine) {
    let y = trunkHeight * 0.55;
    for (let i = 0; i < 3; i++) {
      const r = 0.95 - i * 0.24, h = 1.2 - i * 0.15;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), new THREE.MeshStandardMaterial({ color: foliageColorBase.clone().offsetHSL(0, 0, -i * 0.03), roughness: 0.85, flatShading: true }));
      cone.position.y = y + h / 2; cone.castShadow = true; cone.receiveShadow = true; group.add(cone); y += h * 0.58;
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const r = 0.78 + Math.random() * 0.35;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: foliageColorBase.clone().offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.05), roughness: 0.85, flatShading: true }));
      blob.position.set((Math.random() - 0.5) * 0.7, trunkHeight + 0.45 + i * 0.36, (Math.random() - 0.5) * 0.7);
      blob.castShadow = true; blob.receiveShadow = true; group.add(blob);
    }
  }
  return group;
}

export function buildTrees() {
  const placeRange = fieldExtent * 0.9, spawnClearance = 6;
  let treeAttempts = 0;
  while (state.trees.length < quality.trees && treeAttempts < 1600) {
    treeAttempts++;
    const x = (Math.random() * 2 - 1) * placeRange, z = (Math.random() * 2 - 1) * placeRange;
    if (isBlocked(x, z, 3) || distToPath(x, z) < 2.2 || Math.hypot(x - spawn.x, z - spawn.z) < spawnClearance) continue;
    let tooClose = false;
    for (let i = 0; i < state.trees.length; i++) if (Math.hypot(x - state.trees[i].x, z - state.trees[i].z) < 4.5) { tooClose = true; break; }
    if (tooClose) continue;
    const tree = buildTree();
    tree.position.set(x, terrainHeight(x, z), z); tree.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.85 + Math.random() * 0.5; tree.scale.set(s, s * (0.9 + Math.random() * 0.3), s);
    state.scene.add(tree); state.trees.push({ x: x, z: z, radius: 0.55 * s });
  }
}

function buildMountain(radius, height, segments) {
  const geo = new THREE.ConeGeometry(radius, height, segments, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < height / 2 - 0.05) { const j = 1 + (Math.random() - 0.5) * 0.25; pos.setX(i, pos.getX(i) * j); pos.setZ(i, pos.getZ(i) * j); }
  const colors = new Float32Array(pos.count * 3);
  const baseColor = new THREE.Color(0x4a5578), snowColor = new THREE.Color(0xf0ecec);
  for (let i = 0; i < pos.count; i++) { const t = clamp((pos.getY(i) + height / 2) / height, 0, 1), c = baseColor.clone().lerp(snowColor, smoothstep(0.72, 0.95, t)); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, flatShading: true }));
}

export function buildMountains() {
  const mountainCount = 11;
  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2 + Math.random() * 0.35, dist = 270 + Math.random() * 90;
    const h = 60 + Math.random() * 55, r = 50 + Math.random() * 40, mx = Math.cos(angle) * dist, mz = Math.sin(angle) * dist;
    const m = buildMountain(r, h, 7); m.position.set(mx, terrainHeight(mx, mz) + h / 2 - 8, mz); m.rotation.y = Math.random() * Math.PI * 2; state.scene.add(m);
  }
}
