import { clamp, lerp, lerpAngle } from './utils.js';
import { fieldExtent, qualityLevel } from './config.js';
import { terrainHeight, isBlocked } from './terrain.js';
import { state } from './state.js';
import { updateCharacterAnim } from './character.js';

const keys = { forward: false, back: false, left: false, right: false };
const joyVector = { x: 0, y: 0 };

function hideHint() {
  const hint = document.getElementById('hint');
  if (hint && hint.style.opacity !== '0') hint.style.opacity = '0';
}

function setRun(enabled) {
  state.running = enabled;
  const button = document.getElementById('runButton');
  if (button) {
    button.textContent = enabled ? '🏃 Running' : '🚶 Walk';
    button.classList.toggle('active', enabled);
  }
}

export function initControls() {
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = true;
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.back = true;
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setRun(true);
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.back = false;
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setRun(false);
  });
  setTimeout(hideHint, 6500);

  const canvas = state.canvas;
  let lookPointerId = null, lastLookX = 0, lastLookY = 0;
  canvas.addEventListener('pointerdown', function (e) {
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId; lastLookX = e.clientX; lastLookY = e.clientY;
    canvas.setPointerCapture(e.pointerId); hideHint();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lastLookX, dy = e.clientY - lastLookY;
    lastLookX = e.clientX; lastLookY = e.clientY;
    state.cameraYaw -= dx * 0.0032;
    state.cameraPitch = clamp(state.cameraPitch - dy * 0.0032, -1.2, 0.75);
  });
  function releaseLook(e) { if (e.pointerId === lookPointerId) lookPointerId = null; }
  canvas.addEventListener('pointerup', releaseLook); canvas.addEventListener('pointercancel', releaseLook);

  const joyZone = document.getElementById('joystickZone');
  const joyNub = document.getElementById('joystickNub');
  let joyPointerId = null; const JOY_MAX = 46;
  function updateJoystick(e) {
    const rect = joyZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.min(JOY_MAX, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * dist; dy = Math.sin(angle) * dist;
    joyNub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    joyVector.x = dx / JOY_MAX; joyVector.y = dy / JOY_MAX;
  }
  joyZone.addEventListener('pointerdown', function (e) { if (joyPointerId !== null) return; joyPointerId = e.pointerId; joyZone.setPointerCapture(e.pointerId); updateJoystick(e); hideHint(); });
  joyZone.addEventListener('pointermove', function (e) { if (e.pointerId === joyPointerId) updateJoystick(e); });
  function endJoystick(e) { if (e.pointerId !== joyPointerId) return; joyPointerId = null; joyVector.x = 0; joyVector.y = 0; joyNub.style.transform = 'translate(0px,0px)'; }
  joyZone.addEventListener('pointerup', endJoystick); joyZone.addEventListener('pointercancel', endJoystick);

  const runButton = document.getElementById('runButton');
  if (runButton) runButton.addEventListener('click', function () { setRun(!state.running); hideHint(); });
  const pauseButton = document.getElementById('pauseTimeButton');
  if (pauseButton) pauseButton.addEventListener('click', function () {
    state.timePaused = !state.timePaused;
    pauseButton.textContent = state.timePaused ? '▶ Resume time' : '⏸ Pause time';
    pauseButton.classList.toggle('active', state.timePaused);
  });
  const windButtons = document.querySelectorAll('.windBtn');
  for (let i = 0; i < windButtons.length; i++) windButtons[i].addEventListener('click', function () {
    state.windStrength = parseFloat(this.getAttribute('data-wind'));
    for (let j = 0; j < windButtons.length; j++) windButtons[j].classList.remove('active');
    this.classList.add('active');
  });

  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  settingsToggle.addEventListener('click', function () { settingsPanel.classList.toggle('open'); });

  const timeSlider = document.getElementById('timeSlider');
  timeSlider.value = String(Math.round(state.dayTime * 1000));
  timeSlider.addEventListener('input', function () { state.dayTime = parseFloat(timeSlider.value) / 1000; });

  const weatherButtons = document.querySelectorAll('.wBtn');
  for (let i = 0; i < weatherButtons.length; i++) weatherButtons[i].addEventListener('click', function () {
    state.weatherMode = this.getAttribute('data-w');
    for (let j = 0; j < weatherButtons.length; j++) weatherButtons[j].classList.remove('active');
    this.classList.add('active');
  });
  const qualityButtons = document.querySelectorAll('.qBtn');
  for (let i = 0; i < qualityButtons.length; i++) {
    if (qualityButtons[i].getAttribute('data-q') === qualityLevel) qualityButtons[i].classList.add('active');
    qualityButtons[i].addEventListener('click', function () { location.hash = 'quality=' + this.getAttribute('data-q'); location.reload(); });
  }
}

const moveState = { forward: 0, strafe: 0 };
function updateMoveState() {
  let f = 0, s = 0;
  if (keys.forward) f += 1; if (keys.back) f -= 1; if (keys.right) s += 1; if (keys.left) s -= 1;
  f += -joyVector.y; s += joyVector.x;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  moveState.forward = f; moveState.strafe = s;
}

const flatHelper = new THREE.Object3D();
flatHelper.rotation.order = 'YXZ';
const _forwardTmp = new THREE.Vector3(), _rightTmp = new THREE.Vector3();
function getFlatForwardRight(yaw) {
  flatHelper.rotation.set(0, yaw, 0);
  _forwardTmp.set(0, 0, -1).applyQuaternion(flatHelper.quaternion);
  _rightTmp.set(1, 0, 0).applyQuaternion(flatHelper.quaternion);
  return { forward: _forwardTmp, right: _rightTmp };
}

const moveDelta = new THREE.Vector3();
const bound = fieldExtent - 1.5;
const walkSpeed = 6.2;
const runSpeed = 11.8;

export function updatePlayer(dt) {
  updateMoveState();
  const character = state.character;
  const dirs = getFlatForwardRight(state.cameraYaw);
  moveDelta.set(0, 0, 0).addScaledVector(dirs.forward, moveState.forward).addScaledVector(dirs.right, moveState.strafe);
  const moving = moveDelta.lengthSq() > 0.0001;
  const speed = state.running ? runSpeed : walkSpeed;
  if (moving) moveDelta.normalize().multiplyScalar(speed * dt);

  let nx = clamp(character.position.x + moveDelta.x, -bound, bound);
  let nz = clamp(character.position.z + moveDelta.z, -bound, bound);
  if (isBlocked(nx, nz, 0.9)) {
    if (!isBlocked(nx, character.position.z, 0.9)) nz = character.position.z;
    else if (!isBlocked(character.position.x, nz, 0.9)) nx = character.position.x;
    else { nx = character.position.x; nz = character.position.z; }
  }
  for (let i = 0; i < state.trees.length; i++) {
    const t = state.trees[i];
    if (Math.hypot(nx - t.x, nz - t.z) < t.radius + 0.5) { nx = character.position.x; nz = character.position.z; break; }
  }

  const dx = nx - character.position.x, dz = nz - character.position.z;
  character.position.x = nx; character.position.z = nz;
  character.position.y = lerp(character.position.y, terrainHeight(nx, nz), moving ? 0.35 : 0.2);
  if (moving && (dx * dx + dz * dz) > 0.000001) character.rotation.y = lerpAngle(character.rotation.y, Math.atan2(-dx, -dz), 0.22);
  updateCharacterAnim(dt, moving, state.running);
}

const followDistance = 5.5, pivotHeight = 1.25;
const orientHelper = new THREE.Object3D(); orientHelper.rotation.order = 'YXZ';
const _lookDir = new THREE.Vector3(), _pivot = new THREE.Vector3(), _camPos = new THREE.Vector3();
export function updateCamera() {
  const character = state.character, camera = state.camera;
  orientHelper.rotation.set(state.cameraPitch, state.cameraYaw, 0);
  _lookDir.set(0, 0, -1).applyQuaternion(orientHelper.quaternion);
  _pivot.set(character.position.x, character.position.y + pivotHeight, character.position.z);
  _camPos.copy(_pivot).addScaledVector(_lookDir, -followDistance);
  const minY = terrainHeight(_camPos.x, _camPos.z) + 0.4;
  if (_camPos.y < minY) _camPos.y = minY;
  camera.position.copy(_camPos); camera.lookAt(_pivot);
}
