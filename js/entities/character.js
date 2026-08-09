import { lerp } from './utils.js';
import { state } from './state.js';

export function buildCharacter() {
  const group = new THREE.Group();
  const hipY = 0.9, legLength = 0.85, torsoHeight = 0.62, headRadius = 0.16;
  const skinColor = 0xe0b088, outfitColor = 0x3f6f52, pantsColor = 0x4a3b2e;
  const hips = new THREE.Group(); hips.position.y = hipY; group.add(hips);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, torsoHeight, 10), new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.8 }));
  torso.position.y = torsoHeight / 2 + 0.05; torso.castShadow = true; hips.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 12, 10), new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 }));
  head.position.y = torsoHeight + 0.05 + headRadius + 0.02; head.castShadow = true; hips.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }));
  cap.position.copy(head.position); hips.add(cap);

  function buildLimb(color, length, radiusTop, radiusBottom) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 7), new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 }));
    mesh.position.y = -length / 2; mesh.castShadow = true; pivot.add(mesh); return pivot;
  }
  const armLength = 0.5;
  const leftArm = buildLimb(outfitColor, armLength, 0.06, 0.05); leftArm.position.set(-0.27, torsoHeight + 0.02, 0); hips.add(leftArm);
  const rightArm = buildLimb(outfitColor, armLength, 0.06, 0.05); rightArm.position.set(0.27, torsoHeight + 0.02, 0); hips.add(rightArm);
  const leftLeg = buildLimb(pantsColor, legLength, 0.09, 0.07); leftLeg.position.set(-0.11, 0, 0); hips.add(leftLeg);
  const rightLeg = buildLimb(pantsColor, legLength, 0.09, 0.07); rightLeg.position.set(0.11, 0, 0); hips.add(rightLeg);
  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 }));
  satchel.position.set(0, torsoHeight * 0.55, -0.2); satchel.rotation.x = 0.15; hips.add(satchel);

  group.userData.hips = hips; group.userData.leftArm = leftArm; group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg; group.userData.rightLeg = rightLeg; group.userData.baseHipY = hipY;
  group.userData.walkPhase = 0; group.userData.idlePhase = 0;
  state.scene.add(group); return group;
}

export function updateCharacterAnim(dt, moving, running) {
  const character = state.character;
  if (!character) return;
  const u = character.userData;
  if (moving) {
    const stride = running ? 13.5 : 8.5;
    const legSwing = running ? 0.95 : 0.65;
    const armSwing = running ? 0.78 : 0.5;
    u.walkPhase += dt * stride;
    const swing = Math.sin(u.walkPhase);
    u.leftLeg.rotation.x = swing * legSwing;
    u.rightLeg.rotation.x = -swing * legSwing;
    u.leftArm.rotation.x = -swing * armSwing;
    u.rightArm.rotation.x = swing * armSwing;
    u.hips.position.y = u.baseHipY + Math.abs(Math.sin(u.walkPhase * 2)) * (running ? 0.055 : 0.035);
    u.hips.rotation.z = lerp(u.hips.rotation.z, running ? -swing * 0.035 : 0, 0.18);
  } else {
    u.leftLeg.rotation.x = lerp(u.leftLeg.rotation.x, 0, 0.15);
    u.rightLeg.rotation.x = lerp(u.rightLeg.rotation.x, 0, 0.15);
    u.leftArm.rotation.x = lerp(u.leftArm.rotation.x, 0, 0.15);
    u.rightArm.rotation.x = lerp(u.rightArm.rotation.x, 0, 0.15);
    u.hips.rotation.z = lerp(u.hips.rotation.z, 0, 0.15);
    u.idlePhase += dt;
    u.hips.position.y = lerp(u.hips.position.y, u.baseHipY + Math.sin(u.idlePhase * 1.4) * 0.012, 0.1);
  }
}
