import { lerp } from './utils.js';
import { state } from './state.js';

// Builds the low-poly wanderer the player controls. Limbs are separate
// pivoted groups (not a skinned mesh) so the walk cycle is just a few
// sine-driven rotations - no animation system or rig needed.
export function buildCharacter() {
  const group = new THREE.Group();
  const hipY = 0.9;
  const legLength = 0.85;
  const torsoHeight = 0.62;
  const headRadius = 0.16;

  const skinColor = 0xe0b088;
  const outfitColor = 0x3f6f52;
  const pantsColor = 0x4a3b2e;

  const hips = new THREE.Group();
  hips.position.y = hipY;
  group.add(hips);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, torsoHeight, 8),
    new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.8 })
  );
  torso.position.y = torsoHeight / 2 + 0.05;
  torso.castShadow = true;
  hips.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 10, 8),
    new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 })
  );
  head.position.y = torsoHeight + 0.05 + headRadius + 0.02;
  head.castShadow = true;
  hips.add(head);

  // A simple cap - just the top slice of a slightly larger sphere.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius * 1.05, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 })
  );
  cap.position.copy(head.position);
  hips.add(cap);

  function buildLimb(color, length, radiusTop, radiusBottom) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 6),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 })
    );
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  const armLength = 0.5;
  const leftArm = buildLimb(outfitColor, armLength, 0.06, 0.05);
  leftArm.position.set(-0.27, torsoHeight + 0.02, 0);
  hips.add(leftArm);
  const rightArm = buildLimb(outfitColor, armLength, 0.06, 0.05);
  rightArm.position.set(0.27, torsoHeight + 0.02, 0);
  hips.add(rightArm);

  const leftLeg = buildLimb(pantsColor, legLength, 0.09, 0.07);
  leftLeg.position.set(-0.11, 0, 0);
  hips.add(leftLeg);
  const rightLeg = buildLimb(pantsColor, legLength, 0.09, 0.07);
  rightLeg.position.set(0.11, 0, 0);
  hips.add(rightLeg);

  const satchel = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 })
  );
  satchel.position.set(0, torsoHeight * 0.55, -0.2);
  satchel.rotation.x = 0.15;
  hips.add(satchel);

  group.userData.hips = hips;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.baseHipY = hipY;
  group.userData.walkPhase = 0;
  group.userData.idlePhase = 0;

  state.scene.add(group);
  return group;
}

export function updateCharacterAnim(dt, moving) {
  const character = state.character;
  if (!character) return;
  const u = character.userData;
  if (moving) {
    u.walkPhase += dt * 8.5;
    const swing = Math.sin(u.walkPhase);
    u.leftLeg.rotation.x = swing * 0.65;
    u.rightLeg.rotation.x = -swing * 0.65;
    u.leftArm.rotation.x = -swing * 0.5;
    u.rightArm.rotation.x = swing * 0.5;
    u.hips.position.y = u.baseHipY + Math.abs(Math.sin(u.walkPhase * 2)) * 0.035;
  } else {
    u.leftLeg.rotation.x = lerp(u.leftLeg.rotation.x, 0, 0.15);
    u.rightLeg.rotation.x = lerp(u.rightLeg.rotation.x, 0, 0.15);
    u.leftArm.rotation.x = lerp(u.leftArm.rotation.x, 0, 0.15);
    u.rightArm.rotation.x = lerp(u.rightArm.rotation.x, 0, 0.15);
    u.idlePhase += dt;
    u.hips.position.y = lerp(u.hips.position.y, u.baseHipY + Math.sin(u.idlePhase * 1.4) * 0.012, 0.1);
  }
}

