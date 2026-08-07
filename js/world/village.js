import { houseConfigs } from './config.js';
import { terrainHeight } from './terrain.js';
import { state } from './state.js';
import { makeGlowTexture } from './utils.js';

const smokeTex = makeGlowTexture([[0, 'rgba(235,230,225,0.55)'], [0.5, 'rgba(220,215,210,0.3)'], [1, 'rgba(220,215,210,0)']]);

function addChimneySmoke(x, y, z) {
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 });
    const puff = new THREE.Sprite(mat);
    puff.userData.origin = { x: x, y: y, z: z };
    puff.userData.phase = i / 5;
    state.scene.add(puff);
    state.smokePuffs.push(puff);
  }
}

function buildLantern() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x3a2f22, roughness: 0.9 }));
  post.position.y = 0.55;
  post.castShadow = true;
  group.add(post);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffdf9e, emissive: 0xffb84d, emissiveIntensity: 0.15, roughness: 0.5 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glowMat);
  glow.position.y = 1.12;
  group.add(glow);
  group.userData.glowMat = glowMat;
  return group;
}

function buildHouse(wallColor, roofColor) {
  const group = new THREE.Group();
  const w = 3.6, d = 3.2, h = 2.2;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9, flatShading: true }));
  walls.position.y = h / 2;
  walls.castShadow = true; walls.receiveShadow = true;
  group.add(walls);

  const roofHeight = 1.4;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.sqrt(w * w + d * d) * 0.62, roofHeight, 4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8, flatShading: true })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = h + roofHeight / 2 - 0.05;
  roof.castShadow = true; roof.receiveShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.9 }));
  door.position.set(0, 0.65, d / 2 + 0.01);
  group.add(door);

  const windowGeo = new THREE.PlaneGeometry(0.55, 0.55);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffb84d, emissiveIntensity: 0.1, roughness: 0.6 });
  const win1 = new THREE.Mesh(windowGeo, windowMat);
  win1.position.set(-1.1, 1.25, d / 2 + 0.01);
  group.add(win1);
  const win2 = new THREE.Mesh(windowGeo, windowMat);
  win2.position.set(1.1, 1.25, d / 2 + 0.01);
  group.add(win2);

  const chimneyLocalY = h + 0.75;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), new THREE.MeshStandardMaterial({ color: 0x6b5847, roughness: 0.9, flatShading: true }));
  chimney.position.set(w / 2 - 0.6, chimneyLocalY, -d / 2 + 0.5);
  chimney.castShadow = true;
  group.add(chimney);

  return { group: group, windowMat: windowMat, chimneyLocalPos: new THREE.Vector3(w / 2 - 0.6, chimneyLocalY + 0.5, -d / 2 + 0.5) };
}

export function buildHouses() {
  const upAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < houseConfigs.length; i++) {
    const cfg = houseConfigs[i];
    const built = buildHouse(cfg.wall, cfg.roof);
    const y = terrainHeight(cfg.x, cfg.z);
    const houseYaw = Math.random() * Math.PI * 2;
    built.group.position.set(cfg.x, y, cfg.z);
    built.group.rotation.y = houseYaw;
    state.scene.add(built.group);
    state.windowGlowMats.push(built.windowMat);

    const chimneyWorld = built.chimneyLocalPos.clone().applyAxisAngle(upAxis, houseYaw);
    addChimneySmoke(cfg.x + chimneyWorld.x, y + chimneyWorld.y, cfg.z + chimneyWorld.z);

    const lanternOffset = new THREE.Vector3(1.6, 0, 2.2).applyAxisAngle(upAxis, houseYaw);
    const lantern = buildLantern();
    lantern.position.set(cfg.x + lanternOffset.x, y, cfg.z + lanternOffset.z);
    state.scene.add(lantern);
    state.lanternGlows.push(lantern.userData.glowMat);
  }
}

export function updateHouses(t) {
  const winI = 0.12 + state.nightFactor * 0.65;
  for (let i = 0; i < state.windowGlowMats.length; i++) state.windowGlowMats[i].emissiveIntensity = winI;

  for (let i = 0; i < state.lanternGlows.length; i++) {
    const flicker = 0.85 + 0.15 * Math.sin(t * 7 + i * 13.7);
    state.lanternGlows[i].emissiveIntensity = 0.15 + state.nightFactor * 0.85 * flicker;
  }

  for (let i = 0; i < state.smokePuffs.length; i++) {
    const p = state.smokePuffs[i];
    const o = p.userData.origin;
    const localT = ((t / 4.5) + p.userData.phase) % 1;
    p.position.set(
      o.x + Math.sin(t * 0.5 + p.userData.phase * 12) * 0.18,
      o.y + localT * 2.4,
      o.z + Math.cos(t * 0.4 + p.userData.phase * 12) * 0.18
    );
    const scale = 0.35 + localT * 1.1;
    p.scale.set(scale, scale, 1);
    p.material.opacity = Math.sin(localT * Math.PI) * (0.18 + state.nightFactor * 0.22);
  }
}

