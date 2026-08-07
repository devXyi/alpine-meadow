import { clamp, lerp, smoothstep, distToSegment } from './utils.js';
import { lake, houseConfigs, HOUSE_HALF, pathPoints, groundMeshSize, groundSegments } from './config.js';
import { state } from './state.js';

export function isBlocked(x, z, margin) {
  const dLake = Math.hypot(x - lake.x, z - lake.z);
  if (dLake < lake.radius + margin) return true;
  for (let i = 0; i < houseConfigs.length; i++) {
    const h = houseConfigs[i];
    if (Math.abs(x - h.x) < HOUSE_HALF + margin && Math.abs(z - h.z) < HOUSE_HALF + margin) return true;
  }
  return false;
}

export function distToPath(x, z) {
  let best = 1e9;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const d = distToSegment(x, z, pathPoints[i][0], pathPoints[i][1], pathPoints[i + 1][0], pathPoints[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

function baseHillHeight(x, z) {
  return Math.sin(x * 0.045) * 1.1 + Math.cos(z * 0.06) * 0.9 + Math.sin((x + z) * 0.03) * 0.6;
}

export function terrainHeight(x, z) {
  let h = baseHillHeight(x, z);

  const dLake = Math.hypot(x - lake.x, z - lake.z);
  const lakePull = smoothstep(lake.radius + 7, lake.radius - 1, dLake);
  h = lerp(h, lake.y - 0.25, lakePull);

  for (let i = 0; i < houseConfigs.length; i++) {
    const hc = houseConfigs[i];
    const d = Math.hypot(x - hc.x, z - hc.z);
    const pull = smoothstep(7, 3, d);
    h = lerp(h, 0.05, pull);
  }

  const pd = distToPath(x, z);
  const pathPull = smoothstep(3.2, 0.8, pd);
  h = lerp(h, h * 0.3, pathPull);

  return h;
}

export function buildGround() {
  const groundGeo = new THREE.PlaneGeometry(groundMeshSize, groundMeshSize, groundSegments, groundSegments);
  groundGeo.rotateX(-Math.PI / 2);
  const gPos = groundGeo.attributes.position;
  const gColors = new Float32Array(gPos.count * 3);
  const grassA = new THREE.Color(0x4c7a3a);
  const grassB = new THREE.Color(0x6f8f45);
  const bank = new THREE.Color(0x5c4a35);
  const dirt = new THREE.Color(0x8f7248);

  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i);
    const z = gPos.getZ(i);
    gPos.setY(i, terrainHeight(x, z));

    const n = (Math.sin(x * 0.13) * Math.cos(z * 0.11) + 1) / 2;
    let col = grassA.clone().lerp(grassB, n);
    const dEdge = Math.hypot(x - lake.x, z - lake.z) - lake.radius;
    if (dEdge < 2.2) col = col.lerp(bank, smoothstep(2.2, -0.4, dEdge) * 0.85);
    const pd = distToPath(x, z);
    if (pd < 3.2) col = col.lerp(dirt, smoothstep(3.2, 1.0, pd) * 0.9);

    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b;
  }
  gPos.needsUpdate = true;
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3));
  groundGeo.computeVertexNormals();

  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = true;
  state.scene.add(ground);
}

export function buildLake() {
  const shape = new THREE.Shape();
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobble = 1 + Math.sin(angle * 3.2) * 0.12 + Math.cos(angle * 5.1) * 0.08;
    const r = lake.radius * wobble;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(lake.x, lake.y, lake.z);

  const mat = new THREE.MeshStandardMaterial({ color: 0x2f7a8c, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.88 });
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.y += sin(transformed.x * 0.5 + uTime * 1.2) * 0.025 + cos(transformed.z * 0.4 + uTime * 0.9) * 0.02;'
    );
    state.waterShaderRef = shader;
  };
  state.scene.add(new THREE.Mesh(geo, mat));
}

