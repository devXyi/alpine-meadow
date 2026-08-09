import { houseConfigs } from './config.js';
import { terrainHeight } from './terrain.js';
import { state } from './state.js';
import { makeGlowTexture } from './utils.js';

const smokeTex = makeGlowTexture([[0, 'rgba(235,230,225,0.55)'], [0.5, 'rgba(220,215,210,0.3)'], [1, 'rgba(220,215,210,0)']]);

function addChimneySmoke(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 });
    const puff = new THREE.Sprite(mat);
    puff.userData.origin = { x: x, y: y, z: z };
    puff.userData.phase = i / 6;
    state.scene.add(puff); state.smokePuffs.push(puff);
  }
}

function buildLantern() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x3a2f22, roughness: 0.9 }));
  post.position.y = 0.55; post.castShadow = true; group.add(post);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffdf9e, emissive: 0xffb84d, emissiveIntensity: 0.15, roughness: 0.5 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat); glow.position.y = 1.12; group.add(glow);
  group.userData.glowMat = glowMat;
  return group;
}

function addWindow(group, x, y, z, rotationY, material, scale) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78 * scale, 0.92 * scale, 0.08), new THREE.MeshStandardMaterial({ color: 0x382a21, roughness: 0.8 }));
  frame.position.set(x, y, z); frame.rotation.y = rotationY; group.add(frame);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.58 * scale, 0.68 * scale), material);
  pane.position.set(x, y, z + (rotationY === 0 ? 0.045 : 0)); pane.rotation.y = rotationY; group.add(pane);
  if (rotationY !== 0) pane.position.x += Math.sin(rotationY) * 0.045;
}

function addBalcony(group, y, width, depth, z, glowMat) {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), new THREE.MeshStandardMaterial({ color: 0x624733, roughness: 0.9 }));
  deck.position.set(0, y, z); deck.castShadow = true; group.add(deck);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x44372e, roughness: 0.85 });
  for (let i = -2; i <= 2; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 5), railMat);
    post.position.set(i * width * 0.19, y + 0.35, z - depth / 2); group.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, 0.05), railMat);
  rail.position.set(0, y + 0.66, z - depth / 2); group.add(rail);
  // Tiny balcony lamp adds another warm point of interest at night.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe7aa, emissive: 0xffb84d, emissiveIntensity: 0.2 }));
  lamp.position.set(width * 0.35, y + 0.76, z - depth / 2 - 0.02); group.add(lamp); state.lanternGlows.push(lamp.material);
}

function buildHouse(wallColor, roofColor, stories, scale) {
  const group = new THREE.Group();
  const w = 5.0 * scale, d = 4.2 * scale, floorH = 2.05 * scale;
  const totalH = stories * floorH;
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88, flatShading: true });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d, 2, stories, 2), wallMat);
  walls.position.y = totalH / 2; walls.castShadow = true; walls.receiveShadow = true; group.add(walls);

  const floorSlabMat = new THREE.MeshStandardMaterial({ color: 0x8b715c, roughness: 0.9 });
  for (let floor = 1; floor < stories; floor++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.10, d + 0.12), floorSlabMat);
    slab.position.y = floor * floorH; slab.castShadow = true; group.add(slab);
  }

  const windowMats = [];
  const windowGeoMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffb84d, emissiveIntensity: 0.12, roughness: 0.55 });
  windowMats.push(windowGeoMat);
  for (let floor = 0; floor < stories; floor++) {
    const y = floor * floorH + floorH * 0.58;
    const frontZ = d / 2 + 0.025;
    addWindow(group, -w * 0.25, y, frontZ, 0, windowGeoMat, scale);
    addWindow(group,  w * 0.25, y, frontZ, 0, windowGeoMat, scale);
    addWindow(group, -w * 0.25, y, -frontZ, Math.PI, windowGeoMat, scale);
    addWindow(group,  w * 0.25, y, -frontZ, Math.PI, windowGeoMat, scale);
    addWindow(group, -w / 2 - 0.025, y, 0, Math.PI / 2, windowGeoMat, scale);
    addWindow(group,  w / 2 + 0.025, y, 0, -Math.PI / 2, windowGeoMat, scale);
    if (floor > 0 && floor % 2 === 1) addBalcony(group, floor * floorH, w * 0.54, 0.55 * scale, frontZ + 0.18, windowGeoMat);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 1.5 * scale, 0.12), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.9 }));
  door.position.set(0, 0.75 * scale, frontZ(d) + 0.06); group.add(door);

  const roofHeight = 1.35 * scale;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.sqrt(w * w + d * d) * 0.42, roofHeight, 6), new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.78, flatShading: true }));
  roof.rotation.y = Math.PI / 4; roof.position.y = totalH + roofHeight / 2 - 0.03; roof.castShadow = true; roof.receiveShadow = true; group.add(roof);

  const chimneyLocalY = totalH + roofHeight * 0.5;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 1.0 * scale, 0.38 * scale), new THREE.MeshStandardMaterial({ color: 0x6b5847, roughness: 0.9, flatShading: true }));
  chimney.position.set(w * 0.28, chimneyLocalY, -d * 0.2); chimney.castShadow = true; group.add(chimney);

  return { group: group, windowMat: windowGeoMat, chimneyLocalPos: new THREE.Vector3(w * 0.28, chimneyLocalY + 0.55 * scale, -d * 0.2) };
}

function frontZ(d) { return d / 2; }

export function buildHouses() {
  const upAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < houseConfigs.length; i++) {
    const cfg = houseConfigs[i];
    const built = buildHouse(cfg.wall, cfg.roof, cfg.stories || 3, cfg.scale || 1);
    const y = terrainHeight(cfg.x, cfg.z);
    const houseYaw = (i % 2 === 0 ? -0.12 : 0.18) + Math.random() * 0.35;
    built.group.position.set(cfg.x, y, cfg.z); built.group.rotation.y = houseYaw;
    state.scene.add(built.group); state.windowGlowMats.push(built.windowMat);

    const chimneyWorld = built.chimneyLocalPos.clone().applyAxisAngle(upAxis, houseYaw);
    addChimneySmoke(cfg.x + chimneyWorld.x, y + chimneyWorld.y, cfg.z + chimneyWorld.z);

    const lanternOffset = new THREE.Vector3(0, 0, 3.5).applyAxisAngle(upAxis, houseYaw);
    const lantern = buildLantern(); lantern.position.set(cfg.x + lanternOffset.x, y, cfg.z + lanternOffset.z); state.scene.add(lantern); state.lanternGlows.push(lantern.userData.glowMat);
  }
}

export function updateHouses(t) {
  const winI = 0.10 + state.nightFactor * 0.92;
  for (let i = 0; i < state.windowGlowMats.length; i++) state.windowGlowMats[i].emissiveIntensity = winI;
  for (let i = 0; i < state.lanternGlows.length; i++) {
    const flicker = 0.84 + 0.16 * Math.sin(t * 7 + i * 13.7);
    state.lanternGlows[i].emissiveIntensity = 0.12 + state.nightFactor * 0.9 * flicker;
  }
  for (let i = 0; i < state.smokePuffs.length; i++) {
    const p = state.smokePuffs[i], o = p.userData.origin;
    const localT = ((t / 4.5) + p.userData.phase) % 1;
    p.position.set(o.x + Math.sin(t * 0.5 + p.userData.phase * 12) * 0.18, o.y + localT * 2.8, o.z + Math.cos(t * 0.4 + p.userData.phase * 12) * 0.18);
    const scale = 0.35 + localT * 1.2; p.scale.set(scale, scale, 1);
    p.material.opacity = Math.sin(localT * Math.PI) * (0.16 + state.nightFactor * 0.22);
  }
}
