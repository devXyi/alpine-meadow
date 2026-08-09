import { state } from '../core/state.js';

// A large animated curtain surrounding the playable world. It is procedural
// so the aurora stays lightweight while still feeling alive at night.
export function buildAurora() {
  const geometry = new THREE.CylinderGeometry(270, 270, 125, 96, 18, true);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uColorA: { value: new THREE.Color(0x20ff9b) },
      uColorB: { value: new THREE.Color(0x00bfa5) },
      uColorC: { value: new THREE.Color(0x55ffd2) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float curtainWave = sin(uv.x * 15.0 + uTime * 0.22) * 5.5;
        curtainWave += sin(uv.x * 31.0 - uTime * 0.15) * 2.4;
        p.y += curtainWave * (0.25 + uv.y * 0.95);
        p.x += sin(uv.x * 12.0 + uTime * 0.16) * 1.8 * uv.y;
        p.z += cos(uv.x * 10.0 - uTime * 0.13) * 1.8 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      varying vec2 vUv;
      void main() {
        float broad = 0.5 + 0.5 * sin(vUv.x * 8.0 + uTime * 0.10 + sin(vUv.x * 4.0) * 2.5);
        float fine = 0.5 + 0.5 * sin(vUv.x * 27.0 - uTime * 0.20 + sin(vUv.x * 9.0) * 3.0);
        float curtains = pow(max(0.0, broad * 0.72 + fine * 0.45 - 0.45), 2.2);
        float vertical = smoothstep(0.02, 0.18, vUv.y) * (1.0 - smoothstep(0.58, 1.0, vUv.y) * 0.9);
        float folds = 0.55 + 0.45 * sin(vUv.x * 17.0 + vUv.y * 5.0 + uTime * 0.17);
        vec3 color = mix(uColorB, uColorA, broad);
        color = mix(color, uColorC, fine * 0.42);
        float alpha = curtains * vertical * folds * uIntensity * 0.72;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 8;
  mesh.frustumCulled = false;
  state.scene.add(mesh);
  state.aurora = mesh;
  state.auroraMaterial = material;
}

export function updateAurora(t) {
  if (!state.aurora || !state.auroraMaterial) return;
  const night = Math.max(0, Math.min(1, (state.nightFactor - 0.28) / 0.48));
  state.aurora.position.x = state.character ? state.character.position.x : 0;
  state.aurora.position.z = state.character ? state.character.position.z : 0;
  state.auroraMaterial.uniforms.uTime.value = t;
  state.auroraMaterial.uniforms.uIntensity.value = state.auroraEnabled ? night : 0;
}
