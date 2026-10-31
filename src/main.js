import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBlobCreature, MOOD_PRESETS, BODY_SHAPE_PRESETS } from './blobCreature.js';
import { createGPUFurPhysics, BRUSH_MODES } from './gpuPhysics.js';
import { createGPUFurSystem, kelvinToHex, MARSCHNER_STYLE_PRESETS } from './furSystem.js';
import { createMinimalUI, FUR_PRESETS } from './ui.js';
import { createEnvironmentManager } from './environments.js';
import { createSingingSystem } from './singingSystem.js';
import { createShaderGUIPanel } from './guiPanel.js';
import { createBloomPostProcessor, ENVIRONMENT_BLOOM_PRESETS } from './bloomPostProcessing.js';
import { createAirDustSystem, LIGHTING_SHOWCASE_PRESETS } from './airParticles.js';
import { createMicAudioAnalyzer, MIC_REACTIVITY_MODES } from './micAudioAnalyzer.js';
import { createFurShadowPass } from './furShadowPass.js';

const container = document.getElementById('canvas-container');
const uiContainer = document.getElementById('ui-root');
const hudHint = document.getElementById('hud-hint');

if (hudHint) {
  hudHint.textContent = 'Drag across Mochi-Puff to comb & style fur · Try 🎤 Mic Audio, Fur Shadow Map, Moods & Slow Rainbow!';
}

const urlSearchParams = new URLSearchParams(window.location.search);
const forceWebGL = urlSearchParams.get('gpuFur') === '0' || urlSearchParams.get('mode') === 'webgl';
const initialGpuFur = !forceWebGL;

// Initial state from our Sakura Mochi preset + Combing Brush + Mic Audio + Fur Shadow Map + Marschner BSDF + Mood + Shape
const initialKelvin = 3600;
const simState = {
  ...FUR_PRESETS[0],
  // Interactive Combing Brush Tool state
  brushMode: 'comb',
  brushRadius: 0.42,
  brushStrength: 1.15,
  combPersistence: 0.92,
  showBrushGizmo: true,
  // Web Audio API Microphone Reactivity state
  micEnabled: false,
  micReactivityMode: 'vibrateColor',
  micSensitivity: 1.35,
  // High-Quality 2048x2048 Fur Shadow Map Pass state
  shadowPassEnabled: true,
  selfShadowStrength: 0.75,
  groundShadowStrength: 0.78,
  shadowSoftness: 1.15,
  // Marschner BSDF Style & Lobe Parameters
  marschnerStyle: 'fluffy',
  cuticleShiftR: -0.16,
  cuticleShiftTRT: 0.24,
  glintStrength: 1.0,
  transmissionTT: 1.0,
  // Creature Mood, Body Shape & Eye Size
  mood: 'happy',
  bodyShape: 'mochi',
  eyeSize: 1.0,
  // Studio, Moving Light & Slow Rainbow Presets
  lightPreset: 'static',
  lightAnimSpeed: 1.0,
  keyColor: '#fff7ed',
  rimColor: '#c4b5fd',
  lightAngle: -74,
  lightIntensity: 1.35,
  rimIntensity: 1.35,
  // Interactive Point Light & Color Temperature state
  pointLightEnabled: true,
  pointLightIntensity: 1.5,
  pointLightKelvin: initialKelvin,
  pointLightColor: kelvinToHex(initialKelvin),
  pointLightX: 1.55,
  pointLightY: 1.1,
  pointLightZ: 1.75,
  pointLightDistance: 7.5,
  pointLightDecay: 1.6,
  pointLightShowHelper: true,
  pointLightOrbit: false,
  // Atmospheric Dust & Specular Air Effects state
  airDustEnabled: true,
  airDustStyle: 'specular',
  airDustDensity: 0.72,
  airDustSparkle: 1.25,
  airDustSize: 1.0,
  // Procedural Wind Force Field state
  windPreset: 'breeze',
  windStrength: 0.95,
  windAngle: 28,
  windElevation: 0.12,
  windTurbulence: 0.85,
  windGustFrequency: 1.1,
  // Gaussian Bloom Post-Processing state
  bloomEnabled: true,
  bloomStrength: 0.46,
  bloomRadius: 1.05,
  bloomThreshold: 0.72,
  bloomSoftKnee: 0.32,
  natureHighlightBoost: 1.0,
  // Lyra & Gemini TTS Singing state
  songPreset: 'sakura',
  vocalMode: 'hybrid',
  voiceName: 'Puck',
  harpVolume: 0.78,
  pitchShift: 1.0,
  environment: 'studio',
  gpuFurEnabled: initialGpuFur
};

// 1. Initialize WebGL2 Renderer with alpha: true so the soft CSS radial studio or AR camera backdrop shines through
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 2. Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  80
);
camera.position.set(0.0, 0.45, 6.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.6;
controls.maxDistance = 15.0;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 0.05, 0);

// 2b. Initialize Multi-Scale Separable Gaussian Bloom Post-Processing Pipeline
const bloomProcessor = createBloomPostProcessor(renderer, scene, camera, simState);

// 3. Synchronized 3-Point Studio Lighting Rig + Interactive 3D Point Light with Kelvin Color Temperature
const keyLight = new THREE.DirectionalLight('#fff7ed', simState.lightIntensity * 1.4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.0005;
keyLight.shadow.radius = 2.5;
keyLight.shadow.camera.left = -2.2;
keyLight.shadow.camera.right = 2.2;
keyLight.shadow.camera.top = 2.2;
keyLight.shadow.camera.bottom = -2.2;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 10.0;
keyLight.shadow.camera.updateProjectionMatrix();
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight('#c4b5fd', simState.rimIntensity * 1.2);
rimLight.position.set(-2.4, 1.8, -3.2);
scene.add(rimLight);

const hemiLight = new THREE.HemisphereLight('#f5d0fe', '#1e1b4b', 0.85);
scene.add(hemiLight);

// Interactive 3D Point Light + Glowing 3D Orb Indicator
const pointLight = new THREE.PointLight(
  simState.pointLightColor,
  simState.pointLightIntensity * 1.35,
  simState.pointLightDistance,
  simState.pointLightDecay
);
pointLight.position.set(simState.pointLightX, simState.pointLightY, simState.pointLightZ);
scene.add(pointLight);

const pointLightOrbGroup = new THREE.Group();
pointLightOrbGroup.name = 'PointLightGizmoOrb';
const orbCoreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(simState.pointLightColor) });
const orbCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 16), orbCoreMat);
pointLightOrbGroup.add(orbCoreMesh);

const orbHaloMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(simState.pointLightColor),
  transparent: true,
  opacity: 0.32,
  depthWrite: false
});
const orbHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 16), orbHaloMat);
pointLightOrbGroup.add(orbHaloMesh);
pointLightOrbGroup.position.copy(pointLight.position);
scene.add(pointLightOrbGroup);

// 4. Create Stylized Blob Creature ("Mochi-Puff") + Hybrid GPU Fur + GPGPU Physics + Atmospheric Dust
const creature = createBlobCreature();
scene.add(creature.root);

const gpuPhysics = createGPUFurPhysics(renderer);
if (simState.gpuFurEnabled && !gpuPhysics.isGPGPUActive) {
  simState.gpuFurEnabled = false;
}
const furSystem = createGPUFurSystem(creature.bodyGeometry, simState);

// Attach both the 64-layer GPU shells and 60,000 instanced hair strands to creature root
creature.root.add(furSystem.shellMesh);
creature.root.add(furSystem.strandMesh);

// Initialize 2048x2048 Light-Space Fur Shadow Map Pass + 3D Ground Plane Shadow Receiver + 3D Combing Brush Gizmo
const furShadowPass = createFurShadowPass(renderer, creature, furSystem, simState);
scene.add(furShadowPass.groundShadowMesh);
scene.add(furShadowPass.brushGizmoGroup);

// Initialize Atmospheric Dust Motes & Specular Bokeh Sparkles in the air
const airDust = createAirDustSystem(simState);
scene.add(airDust.pointsMesh);

// Initialize multi-environment manager (Studio, Sunny Meadow, Cozy Highrise, AR Camera)
const envManager = createEnvironmentManager({
  scene,
  renderer,
  container,
  keyLight,
  rimLight,
  hemiLight,
  furSystem,
  camera
});

const windDirectionVec = new THREE.Vector3(1.0, 0.12, 0.35).normalize();

function updateWindFieldFromState() {
  const rad = (simState.windAngle * Math.PI) / 180.0;
  const wx = Math.cos(rad);
  const wy = simState.windElevation;
  const wz = Math.sin(rad);
  windDirectionVec.set(wx, wy, wz).normalize();

  const u = furSystem.sharedUniforms;
  u.uWindStrength.value = simState.windStrength;
  u.uWindDirection.value.copy(windDirectionVec);
  u.uWindTurbulence.value = simState.windTurbulence;
  u.uWindGustFrequency.value = simState.windGustFrequency;
}

function updateMarschnerUniformsFromState() {
  const u = furSystem.sharedUniforms;
  u.uFurLength.value = simState.furLength;
  furSystem.updateDensity(simState.furDensity);
  u.uClumping.value = simState.clumping;
  u.uCurliness.value = simState.curliness;
  u.uRoughness.value = simState.roughness;
  u.uSpecular.value = simState.specular;
  u.uCuticleShiftR.value = simState.cuticleShiftR;
  u.uCuticleShiftTRT.value = simState.cuticleShiftTRT;
  u.uGlintStrength.value = simState.glintStrength;
  u.uTransmissionTT.value = simState.transmissionTT;
}

function applyMarschnerStylePreset(styleId) {
  const preset = MARSCHNER_STYLE_PRESETS[styleId] || MARSCHNER_STYLE_PRESETS.fluffy;
  simState.marschnerStyle = preset.id;
  simState.furLength = preset.furLength;
  simState.furDensity = preset.furDensity;
  simState.clumping = preset.clumping;
  simState.curliness = preset.curliness;
  simState.roughness = preset.roughness;
  simState.specular = preset.specular;
  simState.cuticleShiftR = preset.cuticleShiftR;
  simState.cuticleShiftTRT = preset.cuticleShiftTRT;
  simState.glintStrength = preset.glintStrength;
  simState.transmissionTT = preset.transmissionTT;
  updateMarschnerUniformsFromState();
  if (hudHint) {
    hudHint.textContent = `Fur Style: ${preset.name} · ${preset.description}`;
  }
}

function applyMoodPreset(moodId) {
  const mood = creature.setMood(moodId);
  simState.mood = mood.id;
  simState.baseColor = mood.baseColor;
  simState.tipColor = mood.tipColor;
  simState.keyColor = mood.keyColor;
  simState.pointLightKelvin = mood.pointLightKelvin;
  simState.pointLightColor = kelvinToHex(mood.pointLightKelvin);

  furSystem.sharedUniforms.uBaseColor.value.set(simState.baseColor);
  furSystem.sharedUniforms.uTipColor.value.set(simState.tipColor);
  creature.skinMaterial.color.set(simState.baseColor).multiplyScalar(0.55);

  if (mood.id === 'excited' || mood.id === 'happy' || mood.id === 'love') {
    creature.triggerBoop();
    boopShockwave = 0.55;
  }

  updateLightingFromState();
  if (hudHint) {
    hudHint.textContent = `Mood: ${mood.badge} (${mood.name}) · Coat colors & expression updated!`;
  }
}

function applyBodyShapeStyle(shapeId) {
  const updatedGeom = creature.setBodyShape(shapeId);
  simState.bodyShape = shapeId;
  furSystem.updateSurfaceGeometry(updatedGeom, simState.eyeSize);
  creature.triggerBoop();
  boopShockwave = 0.45;
  const shapeInfo = BODY_SHAPE_PRESETS[shapeId] || BODY_SHAPE_PRESETS.mochi;
  if (hudHint) {
    hudHint.textContent = `Body Shape: ${shapeInfo.name} · 60,000 fur strands & 64 shells re-projected!`;
  }
}

function applyEyeSizeAdjustment(eyeSize) {
  const clamped = Math.max(0.5, Math.min(1.75, Number(eyeSize) || 1.0));
  simState.eyeSize = clamped;
  const updatedGeom = creature.setEyeSize(clamped);
  furSystem.updateSurfaceGeometry(updatedGeom, clamped);
}

// Helper to synchronize Key Light, Point Light (position, intensity, Kelvin color temp) & GLSL uniforms
function updateLightingFromState() {
  const rad = (simState.lightAngle * Math.PI) / 180.0;
  const lx = Math.sin(rad) * 2.8;
  const ly = 2.1;
  const lz = Math.cos(rad) * 2.8;

  keyLight.position.set(lx, ly, lz);
  keyLight.intensity = simState.lightIntensity * 1.35;
  rimLight.intensity = simState.rimIntensity * 1.15;
  if (simState.keyColor) {
    keyLight.color.set(simState.keyColor);
    furSystem.sharedUniforms.uKeyLightColor.value.set(simState.keyColor);
  }
  if (simState.rimColor) {
    rimLight.color.set(simState.rimColor);
    furSystem.sharedUniforms.uRimLightColor.value.set(simState.rimColor);
  }

  const u = furSystem.sharedUniforms;
  u.uKeyLightDir.value.set(lx, ly, lz).normalize();
  u.uKeyLightIntensity.value = simState.lightIntensity;
  u.uRimIntensity.value = simState.rimIntensity;

  // Point Light synchronization (scene + fur shader)
  const envScale = (simState.environment === 'highrise' || simState.environment === 'ar') ? 0.35 : 1.0;
  const px = simState.pointLightX * envScale;
  const py = simState.pointLightY * envScale;
  const pz = simState.pointLightZ * envScale;

  pointLight.position.set(px, py, pz);
  pointLight.color.set(simState.pointLightColor);
  const effPtIntensity = simState.pointLightEnabled ? simState.pointLightIntensity : 0.0;
  pointLight.intensity = effPtIntensity * 1.35;
  pointLight.distance = simState.pointLightDistance;
  pointLight.decay = simState.pointLightDecay;

  pointLightOrbGroup.position.set(px, py, pz);
  pointLightOrbGroup.scale.setScalar(envScale);
  pointLightOrbGroup.visible = Boolean(simState.pointLightEnabled && simState.pointLightShowHelper);
  orbCoreMat.color.set(simState.pointLightColor);
  orbHaloMat.color.set(simState.pointLightColor);
  orbHaloMat.opacity = Math.min(0.65, 0.16 + effPtIntensity * 0.14);

  u.uPointLightPos.value.set(px, py, pz);
  u.uPointLightColor.value.set(simState.pointLightColor);
  u.uPointLightIntensity.value = effPtIntensity;
  u.uPointLightDistance.value = simState.pointLightDistance;
  u.uPointLightDecay.value = simState.pointLightDecay;

  // Match under-skin color to darkened base root color so skin blends seamlessly
  creature.skinMaterial.color.set(simState.baseColor).multiplyScalar(0.55);
}

// Helper to center the camera & OrbitControls point-of-focus on Mochi-Puff with appropriate framing across environments
function applyCameraFramingForEnvironment(envId) {
  const isDesk = envId === 'highrise';
  const isAR = envId === 'ar';
  const s = (isDesk || isAR) ? 0.25 : 1.0;
  const deskX = isDesk ? -0.14 : 0.0;
  const deskZ = isDesk ? 0.42 : 0.0;
  creature.setEnvironmentScale(s, deskX, deskZ);

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const mobileZoomOut = isMobile
    ? Math.max(1.45, Math.min(1.95, 0.82 / Math.max(0.42, aspect)))
    : 1.0;

  if (isAR) {
    const targetY = -0.94 * (1.0 - s) + 0.05 * s;
    controls.target.set(0.0, targetY, 0.0);
    camera.position.set(0.0, 0.35, 6.2 * mobileZoomOut);
    controls.minDistance = 1.4;
    controls.maxDistance = 14.0 * mobileZoomOut;
    controls.update();
  } else {
    const targetY = -0.94 * (1.0 - s) + 0.05 * s;
    controls.target.set(deskX, targetY, deskZ);
    camera.position.set(deskX, targetY + 0.40 * s, deskZ + 6.4 * s * mobileZoomOut);
    controls.minDistance = 2.6 * s;
    controls.maxDistance = 15.0 * s * mobileZoomOut;
    controls.update();
  }
}

function applyEnvironmentPreset(envId) {
  const normalizedEnvId = envId === 'nature' ? 'meadow' : envId;
  const prevEnv = simState.environment;
  simState.environment = normalizedEnvId;

  if (typeof creature !== 'undefined' && creature.resetPlacement) {
    if ((prevEnv === 'ar' && normalizedEnvId !== 'ar') || (normalizedEnvId !== 'ar' && creature.isPlaced && creature.isPlaced())) {
      creature.resetPlacement(false);
    }
  }

  const envPreset = envManager.setEnvironment(normalizedEnvId);
  if (envPreset) {
    if (envPreset.keyColor !== undefined) {
      simState.keyColor = envPreset.keyColor;
    }
    simState.lightAngle = envPreset.lightAngle;
    simState.lightIntensity = envPreset.lightIntensity;
    simState.rimIntensity = envPreset.rimIntensity;
    simState.windStrength = envPreset.windStrength;
  }

  // Apply scene-specific Gaussian Bloom preset (enhances soft sunlit fur highlights in 'meadow' / 'nature' mode)
  const bloomPreset = ENVIRONMENT_BLOOM_PRESETS[normalizedEnvId] || ENVIRONMENT_BLOOM_PRESETS.studio;
  simState.bloomStrength = bloomPreset.bloomStrength;
  simState.bloomRadius = bloomPreset.bloomRadius;
  simState.bloomThreshold = bloomPreset.bloomThreshold;
  simState.bloomSoftKnee = bloomPreset.bloomSoftKnee;
  simState.natureHighlightBoost = bloomPreset.natureHighlightBoost;
  bloomProcessor.updateFromState(simState);

  applyCameraFramingForEnvironment(normalizedEnvId);
  updateWindFieldFromState();
  updateLightingFromState();
  furShadowPass.updateFromState(simState);
  if (hudHint) {
    if (normalizedEnvId === 'ar') {
      hudHint.textContent = 'AR Active: Tap screen to place Mochi on detected surface · Pet or comb him · Click ♪ Sing';
    } else if (normalizedEnvId === 'meadow') {
      hudHint.textContent = 'Nature Mode · Enhanced Gaussian Bloom & Fur Shadow Map active · Drag to comb fur or click 🎤 Mic!';
    } else {
      hudHint.textContent = 'Drag across Mochi-Puff to comb & style fur · Try 🎤 Mic Audio, Fur Shadow Map, Moods & Slow Rainbow!';
    }
  }
}

const ALLOWED_ENV_IDS = new Set(['studio', 'meadow', 'nature', 'highrise', 'ar']);
const urlEnvParam = new URLSearchParams(window.location.search).get('env');
const initialEnvId = urlEnvParam && ALLOWED_ENV_IDS.has(urlEnvParam) ? urlEnvParam : simState.environment;
applyEnvironmentPreset(initialEnvId);

// 5. Initialize Lyra & Gemini TTS Singing System + Web Audio API Microphone Analyzer
let ui = null;
let guiPanel = null;

const micAnalyzer = createMicAudioAnalyzer({
  onStatusChange(info) {
    simState.micEnabled = Boolean(info.isActive);
    if (ui) {
      ui.setMicStatus(info);
    }
    if (guiPanel && guiPanel.setMicButtonState) {
      guiPanel.setMicButtonState(info.isActive);
    }
    if (hudHint && info.statusText) {
      hudHint.textContent = `🎤 ${info.statusText}`;
    }
  }
});

const singingSystem = createSingingSystem({
  onStatusChange(info) {
    if (ui) {
      ui.setSingingStatus(info);
    }
    if (guiPanel) {
      guiPanel.setSingingButtonState(info.isSinging);
    }
    if (hudHint) {
      if (info.isSinging && info.lyric) {
        hudHint.textContent = `♪ ${info.songTitle}: "${info.lyric}"`;
      } else if (info.isSinging) {
        hudHint.textContent = `♪ ${info.statusText}`;
      } else {
        hudHint.textContent = 'Drag across Mochi-Puff to comb & style fur · Try 🎤 Mic Audio, Fur Shadow Map, Moods & Slow Rainbow!';
      }
    }
  }
});

function handleToggleSing() {
  if (singingSystem.isSinging()) {
    singingSystem.stopSinging();
  } else {
    creature.triggerBoop();
    boopShockwave = 0.65;
    singingSystem.startSinging({
      songPreset: simState.songPreset,
      vocalMode: simState.vocalMode,
      voiceName: simState.voiceName,
      harpVolume: simState.harpVolume,
      pitchShift: simState.pitchShift
    });
  }
}

function handleToggleMic() {
  micAnalyzer.setSensitivity(simState.micSensitivity);
  micAnalyzer.setReactivityMode(simState.micReactivityMode);
  micAnalyzer.toggleMicrophone();
}

// Shared state change dispatcher for both Glassmorphic UI and lil-gui Inspector
function handleStateChange(key, value, source = 'ui') {
  const u = furSystem.sharedUniforms;
  switch (key) {
    case 'environment': {
      applyEnvironmentPreset(value);
      break;
    }
    case 'marschnerStyle': {
      applyMarschnerStylePreset(value);
      break;
    }
    case 'mood': {
      applyMoodPreset(value);
      break;
    }
    case 'bodyShape': {
      applyBodyShapeStyle(value);
      break;
    }
    case 'eyeSize': {
      applyEyeSizeAdjustment(value);
      break;
    }
    case 'toggleGPUFur': {
      const enabled = Boolean(value);
      simState.gpuFurEnabled = enabled;
      furSystem.setGPUFurEnabled(enabled);
      if (ui) ui.setGPUFurEnabled(enabled);
      if (hudHint) {
        hudHint.textContent = enabled
          ? 'WebGPU Fur ON (Default) · 64 Volumetric Shells + 60,000 3D Strands + GPGPU Verlet Physics'
          : 'WebGL Mode ON · Lightweight Analytical WebGL Fur · Toggle WebGPU Fur anytime';
      }
      break;
    }
    case 'toggleSing': {
      handleToggleSing();
      break;
    }
    case 'startSingPreset': {
      simState.songPreset = value;
      creature.triggerBoop();
      boopShockwave = 0.6;
      singingSystem.startSinging({
        songPreset: simState.songPreset,
        vocalMode: simState.vocalMode,
        voiceName: simState.voiceName,
        harpVolume: simState.harpVolume,
        pitchShift: simState.pitchShift
      });
      break;
    }
    case 'composeAndSing': {
      creature.triggerBoop();
      boopShockwave = 0.6;
      singingSystem.composeAndSing(value, {
        vocalMode: simState.vocalMode,
        voiceName: simState.voiceName,
        harpVolume: simState.harpVolume,
        pitchShift: simState.pitchShift
      });
      break;
    }
    case 'songPreset':
    case 'vocalMode':
    case 'voiceName':
    case 'harpVolume':
    case 'pitchShift': {
      if (singingSystem.isSinging()) {
        singingSystem.startSinging({
          songPreset: simState.songPreset,
          vocalMode: simState.vocalMode,
          voiceName: simState.voiceName,
          harpVolume: simState.harpVolume,
          pitchShift: simState.pitchShift
        });
      }
      break;
    }
    case 'arToggleMirror': {
      const mirrored = envManager.toggleMirror();
      if (ui) ui.setMirrorLabel(mirrored);
      break;
    }
    case 'arFlipCamera':
      envManager.flipCamera();
      break;
    case 'furLength':
      u.uFurLength.value = value;
      break;
    case 'furDensity':
      furSystem.updateDensity(value);
      break;
    case 'clumping':
      u.uClumping.value = value;
      break;
    case 'curliness':
      u.uCurliness.value = value;
      break;
    case 'baseColor':
      u.uBaseColor.value.set(value);
      creature.skinMaterial.color.set(value).multiplyScalar(0.55);
      break;
    case 'tipColor':
      u.uTipColor.value.set(value);
      break;
    case 'roughness':
      u.uRoughness.value = value;
      break;
    case 'specular':
      u.uSpecular.value = value;
      break;
    case 'cuticleShiftR':
      u.uCuticleShiftR.value = value;
      break;
    case 'cuticleShiftTRT':
      u.uCuticleShiftTRT.value = value;
      break;
    case 'glintStrength':
      u.uGlintStrength.value = value;
      break;
    case 'transmissionTT':
      u.uTransmissionTT.value = value;
      break;
    case 'lightPreset': {
      simState.lightPreset = value;
      if (value === 'static') {
        simState.rimColor = '#c4b5fd';
        updateLightingFromState();
      } else {
        simState.pointLightEnabled = true;
        const lp = LIGHTING_SHOWCASE_PRESETS[value];
        if (lp && hudHint) {
          hudHint.textContent = `Lighting Style: ${lp.name} · ${lp.description}`;
        }
      }
      break;
    }
    case 'pointLightKelvin': {
      simState.pointLightColor = kelvinToHex(value);
      updateLightingFromState();
      break;
    }
    case 'keyColor':
    case 'lightAngle':
    case 'lightIntensity':
    case 'rimIntensity':
    case 'pointLightEnabled':
    case 'pointLightIntensity':
    case 'pointLightColor':
    case 'pointLightX':
    case 'pointLightY':
    case 'pointLightZ':
    case 'pointLightDistance':
    case 'pointLightShowHelper':
    case 'pointLightOrbit':
      updateLightingFromState();
      break;
    case 'airDustEnabled':
    case 'airDustStyle':
    case 'airDustDensity':
    case 'airDustSparkle':
    case 'airDustSize':
      airDust.updateFromState(simState);
      break;
    case 'windPreset':
    case 'windStrength':
    case 'windAngle':
    case 'windElevation':
    case 'windTurbulence':
    case 'windGustFrequency':
      updateWindFieldFromState();
      break;
    case 'bloomEnabled':
    case 'bloomStrength':
    case 'bloomRadius':
    case 'bloomThreshold':
    case 'bloomSoftKnee':
    case 'natureHighlightBoost':
      bloomProcessor.updateFromState(simState);
      break;
    case 'brushMode': {
      simState.brushMode = value;
      const bm = BRUSH_MODES[value] || BRUSH_MODES.comb;
      if (hudHint) {
        hudHint.textContent = `Combing Brush: ${bm.name} · ${bm.description}`;
      }
      break;
    }
    case 'brushRadius': {
      simState.brushRadius = Number(value);
      u.uBrushRadius.value = simState.brushRadius;
      break;
    }
    case 'brushStrength': {
      simState.brushStrength = Number(value);
      break;
    }
    case 'combPersistence': {
      simState.combPersistence = Number(value);
      break;
    }
    case 'showBrushGizmo': {
      simState.showBrushGizmo = Boolean(value);
      if (!simState.showBrushGizmo) {
        furShadowPass.updateBrushGizmo({ visible: false });
      }
      break;
    }
    case 'resetGroom': {
      gpuPhysics.resetGroom();
      webglGroomOffset.set(0, 0, 0);
      u.uWebGLGroomOffset.value.set(0, 0, 0);
      creature.triggerBoop();
      boopShockwave = 0.55;
      if (hudHint) {
        hudHint.textContent = 'Fur Groom Reset · All combed strands restored to natural plush coat alignment!';
      }
      break;
    }
    case 'toggleMic': {
      handleToggleMic();
      break;
    }
    case 'micReactivityMode': {
      simState.micReactivityMode = value;
      micAnalyzer.setReactivityMode(value);
      const mm = MIC_REACTIVITY_MODES[value];
      if (mm && hudHint) {
        hudHint.textContent = `Mic Reactivity Style: ${mm.name} · ${mm.description}`;
      }
      break;
    }
    case 'micSensitivity': {
      simState.micSensitivity = Number(value);
      micAnalyzer.setSensitivity(simState.micSensitivity);
      break;
    }
    case 'shadowPassEnabled':
    case 'selfShadowStrength':
    case 'groundShadowStrength':
    case 'shadowSoftness': {
      furShadowPass.updateFromState(simState);
      break;
    }
    case 'toggleRecordMode': {
      isRecordMode = Boolean(value);
      if (isRecordMode) {
        currentDPR = 1.0;
        renderer.setPixelRatio(1.0);
        bloomProcessor.resize(window.innerWidth, window.innerHeight, 1.0);
        document.body.classList.add('record-mode');
        furSystem.updateDensity(0.48);
        if (hudHint) {
          hudHint.textContent = 'Record Mode ON · 1x DPR · 60 FPS Lock';
        }
      } else {
        currentDPR = targetDPR;
        renderer.setPixelRatio(targetDPR);
        bloomProcessor.resize(window.innerWidth, window.innerHeight, targetDPR);
        document.body.classList.remove('record-mode');
        furSystem.updateDensity(simState.furDensity || 0.75);
      }
      break;
    }
    case 'setDPR': {
      targetDPR = value === '1x' ? 1.0 : (value === '1.5x' ? 1.5 : Math.min(window.devicePixelRatio || 1, 2));
      currentDPR = targetDPR;
      renderer.setPixelRatio(currentDPR);
      bloomProcessor.resize(window.innerWidth, window.innerHeight, currentDPR);
      break;
    }
    case 'toggleAutoFPSGuard': {
      autoFPSGuard = Boolean(value);
      break;
    }
    case 'arToggleTapPlace':
      tapToPlaceEnabled = Boolean(value);
      break;
    case 'arToggleLightEst': {
      const enabled = Boolean(value);
      envManager.setLightEstimationEnabled(enabled);
      if (hudHint) {
        hudHint.textContent = enabled
          ? 'AR Light Estimation ON · Sampling webcam color temperature, key direction & brightness'
          : 'AR Light Estimation OFF · Restored neutral studio AR lighting (sliders unlocked)';
      }
      break;
    }
    case 'arResetPosition':
      creature.resetPlacement();
      envManager.resetARAnchor();
      if (hudHint) {
        hudHint.textContent = 'Mochi reset to center position · Tap screen to place on detected surface';
      }
      break;
    default:
      break;
  }

  // Keep both UIs in sync
  if (ui) {
    ui.syncUI();
  }
  if (guiPanel) {
    guiPanel.syncGUI();
  }
}

// 6. Build Glassmorphic UI + lil-gui (dat.GUI) Inspector Panel
ui = createMinimalUI(uiContainer, simState, (key, value) => {
  handleStateChange(key, value, 'ui');
});

guiPanel = createShaderGUIPanel(
  simState,
  (key, value) => {
    handleStateChange(key, value, 'gui');
  },
  {
    onToggleSing: handleToggleSing
  }
);

let tapToPlaceEnabled = true;

envManager.onARStatusChange((statusText, isLive) => {
  ui.setARStatus(statusText, isLive);
});

envManager.onPlaneDetected((planeInfo) => {
  ui.setARPlaneStatus(
    planeInfo.surfaceType,
    planeInfo.planeY,
    planeInfo.confidence,
    planeInfo.featureCount
  );
});

envManager.onLightEstimated((lightInfo) => {
  if (simState.environment !== 'ar') return;
  if (!lightInfo.isManualReset && !envManager.isLightEstimationEnabled()) return;
  simState.keyColor = lightInfo.keyColor;
  simState.lightAngle = lightInfo.lightAngle;
  simState.lightIntensity = lightInfo.lightIntensity;
  simState.rimIntensity = lightInfo.rimIntensity;
  updateLightingFromState();
  ui.setARLightStatus(lightInfo);
  if (guiPanel) guiPanel.syncGUI();
});

// 7. Interactive 3D Pointer Raycasting for Petting, Combing & Booping
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(0, 0);
const pointerLocalPos = new THREE.Vector3(0, 0, 2);
const prevPointerLocalPos = new THREE.Vector3(0, 0, 2);
const pointerVelocity = new THREE.Vector3(0, 0, 0);
const pointerWorldHit = new THREE.Vector3(0, 0, 0);
const pointerWorldNormal = new THREE.Vector3(0, 0, 1);
const normalMatrixTmp = new THREE.Matrix3();
let isPointerOverCreature = false;
let pointerDownPos = { x: 0, y: 0 };
let boopShockwave = 0.0;

function isEventOnUIOverlay(e) {
  return Boolean(
    e.target &&
    typeof e.target.closest === 'function' &&
    (e.target.closest('#ui-root') ||
      e.target.closest('#dat-gui-container') ||
      e.target.closest('#page-nav') ||
      e.target.closest('#scene-nav') ||
      e.target.closest('#mobile-controls-btn') ||
      e.target.closest('#mobile-sheet-backdrop'))
  );
}

window.addEventListener('pointermove', (e) => {
  if (isEventOnUIOverlay(e)) {
    isPointerOverCreature = false;
    furShadowPass.updateBrushGizmo({ visible: false });
    return;
  }
  pointerNDC.x = (e.clientX / window.innerWidth) * 2.0 - 1.0;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2.0 + 1.0;

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObject(creature.bodyMesh, false);
  if (hits.length > 0) {
    prevPointerLocalPos.copy(pointerLocalPos);
    pointerWorldHit.copy(hits[0].point);
    if (hits[0].face) {
      normalMatrixTmp.getNormalMatrix(creature.bodyMesh.matrixWorld);
      pointerWorldNormal.copy(hits[0].face.normal).applyMatrix3(normalMatrixTmp).normalize();
    }
    pointerLocalPos.copy(hits[0].point);
    creature.root.worldToLocal(pointerLocalPos);

    if (isPointerOverCreature) {
      pointerVelocity.subVectors(pointerLocalPos, prevPointerLocalPos).multiplyScalar(32.0);
    }
    isPointerOverCreature = true;
    container.style.cursor = 'pointer';
    if (simState.environment === 'ar') {
      envManager.updateARCursor(pointerNDC.x, pointerNDC.y, false);
    }
  } else {
    isPointerOverCreature = false;
    pointerVelocity.multiplyScalar(0.5);
    container.style.cursor = 'grab';
    furShadowPass.updateBrushGizmo({ visible: false });
    if (simState.environment === 'ar' && tapToPlaceEnabled) {
      envManager.updateARCursor(pointerNDC.x, pointerNDC.y, true);
    }
  }
});

window.addEventListener('pointerdown', (e) => {
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
  if (isEventOnUIOverlay(e)) {
    return;
  }
  if (isPointerOverCreature) {
    controls.enabled = false;
  }
});

window.addEventListener('pointerup', (e) => {
  controls.enabled = true;
  const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (moveDist < 6) {
    if (isEventOnUIOverlay(e)) {
      return;
    }
    if (isPointerOverCreature) {
      creature.triggerBoop();
      boopShockwave = 1.0;
    } else if (simState.environment === 'ar' && tapToPlaceEnabled) {
      const planeHit = envManager.estimatePlaneAt(pointerNDC.x, pointerNDC.y);
      if (planeHit && planeHit.point) {
        pointerNDC.set(0, 0);
        creature.placeAt(planeHit.point, planeHit.normal, true, camera.position);
        envManager.triggerPlacementPulse(planeHit.point);
        if (hudHint) {
          hudHint.textContent = `Placed Mochi on ${planeHit.surfaceType} · Estimated Depth: ${planeHit.depth.toFixed(2)}m (${Math.round(planeHit.confidence * 100)}% conf)`;
        }
      }
    }
  }
});

// Dynamic DPR & Framerate Guard variables (Zero GC) — Retina by default when compatible
let targetDPR = Math.min(window.devicePixelRatio || 1, 2);
let currentDPR = targetDPR;
let isRecordMode = false;
let autoFPSGuard = false;
let lowFpsFrames = 0;
let highFpsFrames = 0;

let wasMobileViewport = window.matchMedia('(max-width: 768px)').matches;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(currentDPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomProcessor.resize(window.innerWidth, window.innerHeight, currentDPR);

  const isMobileNow = window.matchMedia('(max-width: 768px)').matches;
  if (isMobileNow || isMobileNow !== wasMobileViewport) {
    wasMobileViewport = isMobileNow;
    applyCameraFramingForEnvironment(simState.environment);
  }
});

// 8. Zero-GC Real-Time Render Loop + Moving Light & Slow Rainbow Evaluator
const clock = new THREE.Clock();
let elapsedTime = 0.0;
const webglInertiaDisp = new THREE.Vector3(0, 0, 0);
const webglInertiaVel = new THREE.Vector3(0, 0, 0);
const webglForceTmp = new THREE.Vector3(0, 0, 0);
const webglGroomOffset = new THREE.Vector3(0, 0, 0);
const tmpColorKey = new THREE.Color();
const tmpColorRim = new THREE.Color();
const tmpColorPt = new THREE.Color();

function evaluateDynamicLightPresets(time) {
  const mode = simState.lightPreset || 'static';
  const spd = simState.lightAnimSpeed ?? 1.0;

  if (mode === 'static') {
    if (simState.pointLightOrbit && simState.pointLightEnabled) {
      const orbitAngle = time * 1.15 * spd;
      simState.pointLightX = Number((Math.cos(orbitAngle) * 2.15).toFixed(2));
      simState.pointLightZ = Number((Math.sin(orbitAngle) * 2.15).toFixed(2));
      simState.pointLightY = Number((1.05 + Math.sin(time * 2.3 * spd) * 0.45).toFixed(2));
      updateLightingFromState();
      if (guiPanel) guiPanel.syncPositionOnly();
    }
    return;
  }

  const t = time * spd;

  if (mode === 'rainbow') {
    // Slow Rainbow Prism: smoothly cycles Key, Rim & orbiting Point Light through HSL spectrum
    const hueKey = (t * 0.065) % 1.0;
    const huePt = (hueKey + 0.33) % 1.0;
    const hueRim = (hueKey + 0.66) % 1.0;

    tmpColorKey.setHSL(hueKey, 0.88, 0.68);
    tmpColorPt.setHSL(huePt, 0.95, 0.62);
    tmpColorRim.setHSL(hueRim, 0.9, 0.66);

    simState.keyColor = `#${tmpColorKey.getHexString()}`;
    simState.pointLightColor = `#${tmpColorPt.getHexString()}`;
    simState.rimColor = `#${tmpColorRim.getHexString()}`;

    const orbitAngle = t * 0.72;
    simState.pointLightX = Number((Math.cos(orbitAngle) * 2.25).toFixed(2));
    simState.pointLightZ = Number((Math.sin(orbitAngle) * 2.25).toFixed(2));
    simState.pointLightY = Number((1.0 + Math.sin(t * 1.35) * 0.55).toFixed(2));
    simState.lightAngle = Math.round(Math.sin(t * 0.45) * 95);
  } else if (mode === 'goldenSweep') {
    // Golden Orbit Sweep: showcases anisotropic Marschner highlights gliding across fur strands
    const orbitAngle = t * 1.15;
    simState.pointLightX = Number((Math.cos(orbitAngle) * 2.35).toFixed(2));
    simState.pointLightZ = Number((Math.sin(orbitAngle) * 2.35).toFixed(2));
    simState.pointLightY = Number((1.15 + Math.cos(t * 1.9) * 0.55).toFixed(2));
    simState.lightAngle = Math.round(Math.sin(t * 0.75) * 115);

    const warmMix = 0.5 + 0.5 * Math.sin(t * 0.8);
    tmpColorKey.setHSL(0.09 + warmMix * 0.04, 0.92, 0.76);
    tmpColorPt.setHSL(0.06 + (1.0 - warmMix) * 0.06, 0.96, 0.66);
    tmpColorRim.setHSL(0.88, 0.78, 0.74);

    simState.keyColor = `#${tmpColorKey.getHexString()}`;
    simState.pointLightColor = `#${tmpColorPt.getHexString()}`;
    simState.rimColor = `#${tmpColorRim.getHexString()}`;
  } else if (mode === 'auroraDance') {
    // Aurora Dual-Wave: Figure-8 Lissajous orbit with northern lights emerald, cyan & violet
    simState.pointLightX = Number((Math.sin(t * 0.95) * 2.45).toFixed(2));
    simState.pointLightZ = Number((Math.sin(t * 1.9) * 1.95).toFixed(2));
    simState.pointLightY = Number((1.1 + Math.cos(t * 1.3) * 0.65).toFixed(2));
    simState.lightAngle = Math.round(Math.cos(t * 0.6) * 110);

    const auroraHue = 0.42 + 0.14 * Math.sin(t * 0.5);
    tmpColorKey.setHSL(auroraHue, 0.88, 0.7);
    tmpColorPt.setHSL(0.76 + 0.08 * Math.cos(t * 0.65), 0.92, 0.68);
    tmpColorRim.setHSL(0.52, 0.95, 0.66);

    simState.keyColor = `#${tmpColorKey.getHexString()}`;
    simState.pointLightColor = `#${tmpColorPt.getHexString()}`;
    simState.rimColor = `#${tmpColorRim.getHexString()}`;
  } else if (mode === 'cyberNeon') {
    // Cyber Neon Halo: Electric cyan and hot magenta-pink orbiting sweep
    const orbitAngle = t * 1.55;
    simState.pointLightX = Number((Math.cos(orbitAngle) * 2.25).toFixed(2));
    simState.pointLightZ = Number((Math.sin(orbitAngle) * 2.25).toFixed(2));
    simState.pointLightY = Number((0.85 + Math.sin(t * 2.6) * 0.75).toFixed(2));
    simState.lightAngle = Math.round(((t * 48) % 360) - 180);

    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    tmpColorKey.setHSL(0.53, 0.98, 0.64);
    tmpColorPt.setHSL(0.92 - pulse * 0.06, 0.96, 0.62);
    tmpColorRim.setHSL(0.82, 0.95, 0.68);

    simState.keyColor = `#${tmpColorKey.getHexString()}`;
    simState.pointLightColor = `#${tmpColorPt.getHexString()}`;
    simState.rimColor = `#${tmpColorRim.getHexString()}`;
  } else if (mode === 'sunsetBreeze') {
    // Sunset Horizon Drift: Slow warm crimson-tangerine & twilight violet
    const orbitAngle = t * 0.55;
    simState.pointLightX = Number((Math.cos(orbitAngle) * 2.3).toFixed(2));
    simState.pointLightZ = Number((Math.sin(orbitAngle) * 2.1).toFixed(2));
    simState.pointLightY = Number((0.65 + Math.sin(t * 0.8) * 0.55).toFixed(2));
    simState.lightAngle = Math.round(Math.sin(t * 0.4) * 90);

    const drift = 0.5 + 0.5 * Math.sin(t * 0.45);
    tmpColorKey.setHSL(0.03 + drift * 0.06, 0.94, 0.68);
    tmpColorPt.setHSL(0.96, 0.9, 0.64);
    tmpColorRim.setHSL(0.74, 0.85, 0.68);

    simState.keyColor = `#${tmpColorKey.getHexString()}`;
    simState.pointLightColor = `#${tmpColorPt.getHexString()}`;
    simState.rimColor = `#${tmpColorRim.getHexString()}`;
  }

  updateLightingFromState();
  if (guiPanel) guiPanel.syncPositionOnly();
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.033);
  elapsedTime += dt;

  // Auto-FPS Guard
  if (autoFPSGuard && !isRecordMode) {
    if (dt > 0.024) {
      lowFpsFrames++;
      highFpsFrames = 0;
      if (lowFpsFrames > 45 && currentDPR > 1.0) {
        currentDPR = 1.0;
        renderer.setPixelRatio(1.0);
        bloomProcessor.resize(window.innerWidth, window.innerHeight, 1.0);
        lowFpsFrames = 0;
      }
    } else if (dt < 0.018) {
      highFpsFrames++;
      if (highFpsFrames > 300 && currentDPR < targetDPR) {
        currentDPR = targetDPR;
        renderer.setPixelRatio(targetDPR);
        bloomProcessor.resize(window.innerWidth, window.innerHeight, targetDPR);
        highFpsFrames = 0;
      }
    }
  }

  controls.update();

  // Decay boop shockwave
  if (boopShockwave > 0.001) {
    boopShockwave *= Math.exp(-dt * 2.8);
  } else {
    boopShockwave = 0.0;
  }

  // Decay pointer velocity smoothly
  pointerVelocity.multiplyScalar(Math.exp(-dt * 12.0));

  // Evaluate Moving Light Presets & Slow Rainbow Prism Lighting
  evaluateDynamicLightPresets(elapsedTime);

  // Evaluate real-time Lyra + Gemini TTS singing envelope & formant lip-sync
  const singMetrics = singingSystem.getAudioMetrics(dt);
  creature.setSingingState(singMetrics);

  // Evaluate Web Audio API Microphone Analyzer (ambient sound / music -> fur vibration & rhythmic color shift)
  const micMetrics = micAnalyzer.update(dt, elapsedTime);
  const combinedAudioPulse = Math.min(1.8, singMetrics.beatPulse + micMetrics.beatPulse * 0.85);

  // Subtle musical shimmer on the Point Light orb when Mochi-Puff sings or reacts to microphone audio
  const activeMusicalAmp = Math.max(
    singMetrics.isSinging ? singMetrics.amplitude : 0.0,
    micMetrics.isActive ? micMetrics.volume : 0.0
  );
  if (activeMusicalAmp > 0.02 && simState.pointLightEnabled) {
    const musicalBoost = 1.0 + activeMusicalAmp * 0.42;
    furSystem.sharedUniforms.uPointLightIntensity.value = simState.pointLightIntensity * musicalBoost;
    pointLight.intensity = simState.pointLightIntensity * 1.35 * musicalBoost;
    const orbPulse = 1.0 + activeMusicalAmp * 0.48;
    orbHaloMesh.scale.setScalar(orbPulse);
  } else {
    orbHaloMesh.scale.setScalar(1.0);
  }

  // Update creature breathing, eye tracking, mood expression, singing lip-sync, and bounce inertia
  creature.update(dt, pointerNDC, camera.position, simState.environment === 'ar');

  // Update active 3D / AR environment (Studio, Meadow, Cozy Highrise, AR View)
  envManager.update(elapsedTime, simState.windStrength, creature.root);

  const envScale = (simState.environment === 'highrise' || simState.environment === 'ar') ? 0.25 : 1.0;

  // Update 3D Interactive Combing Brush Ring Gizmo on Mochi-Puff's coat
  furShadowPass.updateBrushGizmo({
    visible: Boolean(isPointerOverCreature && simState.showBrushGizmo),
    worldPoint: pointerWorldHit,
    worldNormal: pointerWorldNormal,
    brushRadius: simState.brushRadius,
    brushMode: simState.brushMode,
    strokeVelocity: pointerVelocity,
    envScale
  });

  // Update Atmospheric Dust Motes & Specular Bokeh Sparkles in the air
  airDust.updateFrame({
    time: elapsedTime,
    windDirection: windDirectionVec,
    windStrength: simState.windStrength,
    windTurbulence: simState.windTurbulence,
    pointLightPos: pointLight.position,
    pointLightColor: simState.pointLightColor,
    pointLightIntensity: simState.pointLightEnabled ? simState.pointLightIntensity : 0.0,
    keyLightColor: simState.keyColor,
    audioPulse: combinedAudioPulse,
    envScale,
    centerOffset: creature.getAnchorPosition(),
    pixelRatio: currentDPR
  });

  const brushModeInfo = BRUSH_MODES[simState.brushMode] || BRUSH_MODES.comb;
  let physicsTexture = gpuPhysics.fallbackTexture;
  let groomTexture = gpuPhysics.fallbackTexture;

  if (simState.gpuFurEnabled) {
    // Step GPGPU ping-pong Verlet physics + persistent Combing Brush alignment + Mic Audio vibration
    const stepOut = gpuPhysics.step({
      time: elapsedTime,
      dt,
      windStrength: simState.windStrength,
      windDirection: windDirectionVec,
      windTurbulence: simState.windTurbulence,
      windGustFrequency: simState.windGustFrequency,
      audioPulse: combinedAudioPulse,
      micBass: micMetrics.bass,
      micMid: micMetrics.mid,
      micTreble: micMetrics.treble,
      creatureVelocity: creature.animState.velocity,
      creatureAngularVel: creature.animState.angularVelocity,
      pointerLocalPos,
      pointerVelocity,
      pointerActive: isPointerOverCreature,
      brushRadius: simState.brushRadius,
      brushStrength: simState.brushStrength,
      brushMode: brushModeInfo.code,
      combPersistence: simState.combPersistence,
      boopShockwave
    });
    physicsTexture = stepOut.physicsTexture;
    groomTexture = stepOut.groomTexture;
  } else {
    // Lightweight WebGL analytical spring-damper inertia + combing offset
    webglForceTmp.set(0, -0.32, 0);
    webglForceTmp.addScaledVector(creature.animState.velocity, -1.65);
    if (isPointerOverCreature) {
      webglForceTmp.addScaledVector(pointerVelocity, 0.85 * simState.brushStrength);
      webglGroomOffset.addScaledVector(pointerVelocity, dt * 0.28 * simState.brushStrength);
      if (webglGroomOffset.length() > 0.75) {
        webglGroomOffset.normalize().multiplyScalar(0.75);
      }
    }
    const groomDecay = Math.mix ? 1.0 : (1.0 - dt * (1.0 - simState.combPersistence) * 1.4);
    webglGroomOffset.multiplyScalar(Math.max(0.92, groomDecay));

    webglForceTmp.addScaledVector(webglInertiaDisp, -24.0);
    webglInertiaVel.addScaledVector(webglForceTmp, dt);
    webglInertiaVel.multiplyScalar(Math.exp(-5.5 * dt));
    webglInertiaDisp.addScaledVector(webglInertiaVel, dt);
    if (webglInertiaDisp.lengthSq() > 0.64) {
      webglInertiaDisp.normalize().multiplyScalar(0.8);
    }
  }

  // Update shared fur uniforms
  const u = furSystem.sharedUniforms;
  u.uPhysicsTex.value = physicsTexture;
  u.uGroomTex.value = groomTexture;
  u.uTime.value = elapsedTime;
  u.uAudioPulse.value = combinedAudioPulse;
  u.uMicBass.value = micMetrics.bass;
  u.uMicMid.value = micMetrics.mid;
  u.uMicTreble.value = micMetrics.treble;
  u.uMicColorMix.value = micMetrics.colorMix;
  u.uMicBassColor.value.copy(micMetrics.bassColor);
  u.uMicTrebleColor.value.copy(micMetrics.trebleColor);
  u.uPointerLocalPos.value.copy(pointerLocalPos);
  u.uPointerActive.value = isPointerOverCreature ? 1.0 : 0.0;
  u.uBrushRadius.value = simState.brushRadius;
  u.uWebGLInertia.value.copy(webglInertiaDisp);
  u.uWebGLGroomOffset.value.copy(webglGroomOffset);
  u.uBoopShockwave.value = boopShockwave;

  // Execute 2048x2048 Light-Space Fur Shadow Map Pass (casts fur shadows onto itself & ground plane)
  furShadowPass.renderShadowPass({
    keyLightDir: u.uKeyLightDir.value,
    anchorPos: creature.getAnchorPosition(),
    envScale,
    shadowPassEnabled: simState.shadowPassEnabled
  });

  // Render scene through separable Gaussian Bloom post-processing pass
  bloomProcessor.render();
}

animate();
