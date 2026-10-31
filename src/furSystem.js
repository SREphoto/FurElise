import * as THREE from 'three';
import {
  SHELL_VERTEX_SHADER,
  SHELL_FRAGMENT_SHADER,
  STRAND_VERTEX_SHADER,
  STRAND_FRAGMENT_SHADER,
  SHELL_DEPTH_FRAGMENT_SHADER,
  STRAND_DEPTH_FRAGMENT_SHADER
} from './furShaders.js';
import { evaluateFollicleMask, evaluateGroomFlow } from './blobCreature.js';

export const SHELL_COUNT = 64;
export const WEBGL_SHELL_COUNT = 32;
export const WEBGL_STRAND_COUNT = 26000;
export const MAX_STRAND_COUNT = 60000;

/**
 * Pre-defined Marschner Hair BSDF & Coat Style Configurations
 * Modifies cuticle tilt angles (R & TRT lobes), longitudinal roughness,
 * specular reflection, caustic glint strength, forward transmission (TT),
 * and physical strand clumping/curl/length.
 */
export const MARSCHNER_STYLE_PRESETS = {
  fluffy: {
    id: 'fluffy',
    name: 'Fluffy Cloud',
    description: 'Soft diffused Marschner scatter, high TT transmission & plush loft',
    furLength: 0.36,
    furDensity: 0.86,
    clumping: 0.28,
    curliness: 0.32,
    roughness: 0.76,
    specular: 0.28,
    cuticleShiftR: -0.15,
    cuticleShiftTRT: 0.24,
    glintStrength: 0.85,
    transmissionTT: 1.38
  },
  sleek: {
    id: 'sleek',
    name: 'Sleek Satin Mink',
    description: 'Tight Marschner longitudinal sheen, low roughness & aligned cuticle scales',
    furLength: 0.22,
    furDensity: 0.96,
    clumping: 0.12,
    curliness: 0.05,
    roughness: 0.19,
    specular: 1.15,
    cuticleShiftR: -0.09,
    cuticleShiftTRT: 0.14,
    glintStrength: 1.35,
    transmissionTT: 0.85
  },
  spiky: {
    id: 'spiky',
    name: 'Spiky Anime Tuft',
    description: 'High macro-clumping, sharp TRT specular glints & bold sculpted spikes',
    furLength: 0.48,
    furDensity: 0.82,
    clumping: 0.95,
    curliness: 0.06,
    roughness: 0.34,
    specular: 0.92,
    cuticleShiftR: -0.22,
    cuticleShiftTRT: 0.34,
    glintStrength: 1.75,
    transmissionTT: 1.05
  },
  curly: {
    id: 'curly',
    name: 'Curly Poodle Wool',
    description: 'Helical ringlets with warm volumetric scattering & soft multi-angle sheen',
    furLength: 0.38,
    furDensity: 0.92,
    clumping: 0.58,
    curliness: 0.88,
    roughness: 0.68,
    specular: 0.36,
    cuticleShiftR: -0.18,
    cuticleShiftTRT: 0.28,
    glintStrength: 1.1,
    transmissionTT: 1.25
  },
  velvet: {
    id: 'velvet',
    name: 'Velvet Peach Fuzz',
    description: 'Ultra-short dense micro-coat with strong rim transmission & soft sheen',
    furLength: 0.14,
    furDensity: 1.0,
    clumping: 0.18,
    curliness: 0.12,
    roughness: 0.54,
    specular: 0.48,
    cuticleShiftR: -0.12,
    cuticleShiftTRT: 0.19,
    glintStrength: 0.75,
    transmissionTT: 1.55
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Glint Fiber',
    description: 'Prismatic Marschner TRT caustics with high specular dispersion',
    furLength: 0.34,
    furDensity: 0.88,
    clumping: 0.46,
    curliness: 0.24,
    roughness: 0.14,
    specular: 1.55,
    cuticleShiftR: -0.26,
    cuticleShiftTRT: 0.38,
    glintStrength: 2.2,
    transmissionTT: 1.45
  }
};

/**
 * Converts a blackbody color temperature in Kelvin (1000K - 15000K)
 * into normalized sRGB [r, g, b] in [0..1] and hex string.
 */
export function kelvinToRGB(kelvin) {
  const temp = Math.max(1000, Math.min(15000, Number(kelvin) || 4500)) / 100.0;
  let r, g, b;

  if (temp <= 66.0) {
    r = 255.0;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    if (temp <= 19.0) {
      b = 0.0;
    } else {
      b = 138.5177312231 * Math.log(temp - 10.0) - 305.0447927307;
    }
  } else {
    r = 329.698727446 * Math.pow(temp - 60.0, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60.0, -0.0755148492);
    b = 255.0;
  }

  const nr = Math.max(0.0, Math.min(1.0, r / 255.0));
  const ng = Math.max(0.0, Math.min(1.0, g / 255.0));
  const nb = Math.max(0.0, Math.min(1.0, b / 255.0));
  return { r: nr, g: ng, b: nb };
}

export function kelvinToHex(kelvin) {
  const { r, g, b } = kelvinToRGB(kelvin);
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Builds a 20-segment high-resolution hair strand ribbon along Y in [0..1].
 * position.x in [-1, +1] stores the cross-strand ribbon coordinate for
 * smooth camera-aligned cylindrical billboarding in the vertex shader.
 */
function createHairBladeTemplateGeometry(segments = 20) {
  const positions = [];
  const indices = [];

  for (let s = 0; s <= segments; s++) {
    const h = s / segments;
    positions.push(-1.0, h, 0.0);
    positions.push(1.0, h, 0.0);
  }

  for (let s = 0; s < segments; s++) {
    const row0 = s * 2;
    const row1 = row0 + 2;
    indices.push(row0, row0 + 1, row1);
    indices.push(row0 + 1, row1 + 1, row1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  return geom;
}

/**
 * Creates the Hybrid Dual-Pipeline GPU Fur System attached to the blob creature:
 * - Default WebGPU / GPU Fur Mode: 64-Layer Volumetric GPU Shell Mesh + 60,000 GPU-Instanced 3D Tapered Hair Strands + GPGPU Verlet
 * - Fallback / Toggleable WebGL Mode: Lightweight analytical WebGL fur (32 shells + 26k plush strands, zero GPGPU RTT)
 */
export function createGPUFurSystem(baseGeometry, initialParams) {
  let gpuFurEnabled = initialParams.gpuFurEnabled !== undefined ? Boolean(initialParams.gpuFurEnabled) : true;

  const initialPointHex = initialParams.pointLightColor || kelvinToHex(initialParams.pointLightKelvin ?? 3800);

  const sharedUniforms = {
    uPhysicsTex: { value: null },
    uGroomTex: { value: null },
    uFurLength: { value: initialParams.furLength },
    uFurDensity: { value: initialParams.furDensity },
    uClumping: { value: initialParams.clumping },
    uCurliness: { value: initialParams.curliness ?? 0.32 },
    uBaseColor: { value: new THREE.Color(initialParams.baseColor) },
    uTipColor: { value: new THREE.Color(initialParams.tipColor) },
    uRoughness: { value: initialParams.roughness },
    uSpecular: { value: initialParams.specular },
    uCuticleShiftR: { value: initialParams.cuticleShiftR ?? -0.16 },
    uCuticleShiftTRT: { value: initialParams.cuticleShiftTRT ?? 0.24 },
    uGlintStrength: { value: initialParams.glintStrength ?? 1.0 },
    uTransmissionTT: { value: initialParams.transmissionTT ?? 1.0 },
    uKeyLightDir: { value: new THREE.Vector3(0.6, 0.8, 0.7).normalize() },
    uKeyLightColor: { value: new THREE.Color('#fff7ed') },
    uKeyLightIntensity: { value: initialParams.lightIntensity },
    uRimLightDir: { value: new THREE.Vector3(-0.6, 0.4, -0.85).normalize() },
    uRimLightColor: { value: new THREE.Color('#c4b5fd') },
    uRimIntensity: { value: initialParams.rimIntensity },
    uPointLightPos: {
      value: new THREE.Vector3(
        initialParams.pointLightX ?? 1.65,
        initialParams.pointLightY ?? 1.15,
        initialParams.pointLightZ ?? 1.85
      )
    },
    uPointLightColor: { value: new THREE.Color(initialPointHex) },
    uPointLightIntensity: {
      value: (initialParams.pointLightEnabled ?? true) ? (initialParams.pointLightIntensity ?? 1.45) : 0.0
    },
    uPointLightDistance: { value: initialParams.pointLightDistance ?? 7.5 },
    uPointLightDecay: { value: initialParams.pointLightDecay ?? 1.6 },
    uAmbientIntensity: { value: 0.62 },
    uEnvSkyColor: { value: new THREE.Color('#f5d0fe') },
    uEnvGroundColor: { value: new THREE.Color('#1e1b4b') },
    uEnvTintStrength: { value: 0.0 },
    uTime: { value: 0.0 },
    uWindStrength: { value: initialParams.windStrength },
    uWindDirection: { value: new THREE.Vector3(1.0, 0.12, 0.35).normalize() },
    uWindTurbulence: { value: initialParams.windTurbulence ?? 0.85 },
    uWindGustFrequency: { value: initialParams.windGustFrequency ?? 1.1 },
    uAudioPulse: { value: 0.0 },
    // Web Audio API Microphone Reactivity Uniforms
    uMicBass: { value: 0.0 },
    uMicMid: { value: 0.0 },
    uMicTreble: { value: 0.0 },
    uMicColorMix: { value: 0.0 },
    uMicBassColor: { value: new THREE.Color('#7c3aed') },
    uMicTrebleColor: { value: new THREE.Color('#f472b6') },
    // Interactive Combing Brush Tool Uniforms
    uPointerLocalPos: { value: new THREE.Vector3(0, 0, 2) },
    uPointerActive: { value: 0.0 },
    uBrushRadius: { value: initialParams.brushRadius ?? 0.42 },
    // High-Quality Fur Shadow Map Pass Uniforms
    uFurShadowMap: { value: null },
    uFurShadowMatrix: { value: new THREE.Matrix4() },
    uShadowPassEnabled: { value: (initialParams.shadowPassEnabled ?? true) ? 1.0 : 0.0 },
    uSelfShadowStrength: { value: initialParams.selfShadowStrength ?? 0.75 },
    uShadowSoftness: { value: initialParams.shadowSoftness ?? 1.15 },
    uGpuFurMode: { value: gpuFurEnabled ? 1.0 : 0.0 },
    uShellCountScale: { value: gpuFurEnabled ? 1.0 : SHELL_COUNT / WEBGL_SHELL_COUNT },
    uWebGLInertia: { value: new THREE.Vector3(0, 0, 0) },
    uWebGLGroomOffset: { value: new THREE.Vector3(0, 0, 0) },
    uBoopShockwave: { value: 0.0 }
  };

  // ---------------------------------------------------------------------------
  // 1. Volumetric Shell Geometry (32 shells in default WebGL mode, 64 in GPU Fur mode)
  // ---------------------------------------------------------------------------
  const shellGeometry = new THREE.InstancedBufferGeometry();
  shellGeometry.index = baseGeometry.index;
  shellGeometry.attributes.position = baseGeometry.attributes.position;
  shellGeometry.attributes.normal = baseGeometry.attributes.normal;
  shellGeometry.attributes.uv = baseGeometry.attributes.uv;
  shellGeometry.attributes.aFollicleMask = baseGeometry.attributes.aFollicleMask;
  shellGeometry.attributes.aGroomTangent = baseGeometry.attributes.aGroomTangent;

  const shellIndices = new Float32Array(SHELL_COUNT);
  for (let i = 0; i < SHELL_COUNT; i++) {
    shellIndices[i] = (i + 1) / SHELL_COUNT;
  }
  shellGeometry.setAttribute(
    'aShellIndex',
    new THREE.InstancedBufferAttribute(shellIndices, 1)
  );
  shellGeometry.instanceCount = gpuFurEnabled ? SHELL_COUNT : WEBGL_SHELL_COUNT;

  const shellMaterial = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERTEX_SHADER,
    fragmentShader: SHELL_FRAGMENT_SHADER,
    uniforms: sharedUniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide
  });

  const shellDepthMaterial = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERTEX_SHADER,
    fragmentShader: SHELL_DEPTH_FRAGMENT_SHADER,
    uniforms: sharedUniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide
  });

  const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
  shellMesh.name = 'GPUFurShells64';
  shellMesh.frustumCulled = false;
  shellMesh.renderOrder = 1;

  // ---------------------------------------------------------------------------
  // 2. High-Subdivision (20-Segment) GPU-Instanced 3D Tapered Hair Strands
  // ---------------------------------------------------------------------------
  const templateGeo = createHairBladeTemplateGeometry(20);
  const strandGeometry = new THREE.InstancedBufferGeometry();
  strandGeometry.index = templateGeo.index;
  strandGeometry.attributes.position = templateGeo.attributes.position;

  // Store triangle index & barycentric weights per strand so shape/eye morphs are instant
  const strandTriIndices = new Uint32Array(MAX_STRAND_COUNT);
  const strandBaryW0 = new Float32Array(MAX_STRAND_COUNT);
  const strandBaryW1 = new Float32Array(MAX_STRAND_COUNT);
  const strandBaryW2 = new Float32Array(MAX_STRAND_COUNT);
  const strandNearestClump = new Uint16Array(MAX_STRAND_COUNT);

  const posAttr = baseGeometry.attributes.position;
  const normAttr = baseGeometry.attributes.normal;
  const idxAttr = baseGeometry.index;
  const triCount = idxAttr.count / 3;

  const cumulativeAreas = new Float32Array(triCount);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const crossVec = new THREE.Vector3();

  let totalArea = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = idxAttr.getX(t * 3);
    const i1 = idxAttr.getX(t * 3 + 1);
    const i2 = idxAttr.getX(t * 3 + 2);
    vA.fromBufferAttribute(posAttr, i0);
    vB.fromBufferAttribute(posAttr, i1);
    vC.fromBufferAttribute(posAttr, i2);
    edge1.subVectors(vB, vA);
    edge2.subVectors(vC, vA);
    const area = crossVec.crossVectors(edge1, edge2).length() * 0.5;
    totalArea += area;
    cumulativeAreas[t] = totalArea;
  }

  // Generate 420 macro-clump tuft centroids on the surface for realistic fur clumping
  const CLUMP_COUNT = 420;
  const clumpTriIndices = new Uint32Array(CLUMP_COUNT);
  const clumpCenters = new Float32Array(CLUMP_COUNT * 3);
  for (let c = 0; c < CLUMP_COUNT; c++) {
    const rArea = ((c + 0.5) / CLUMP_COUNT) * totalArea;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulativeAreas[mid] < rArea) lo = mid + 1;
      else hi = mid;
    }
    clumpTriIndices[c] = lo;
    const i0 = idxAttr.getX(lo * 3);
    clumpCenters[c * 3] = posAttr.getX(i0);
    clumpCenters[c * 3 + 1] = posAttr.getY(i0);
    clumpCenters[c * 3 + 2] = posAttr.getZ(i0);
  }

  const rootPosArray = new Float32Array(MAX_STRAND_COUNT * 3);
  const rootNormalArray = new Float32Array(MAX_STRAND_COUNT * 3);
  const groomDirArray = new Float32Array(MAX_STRAND_COUNT * 3);
  const clumpOffsetArray = new Float32Array(MAX_STRAND_COUNT * 3);
  const strandSeedArray = new Float32Array(MAX_STRAND_COUNT);
  const maskValueArray = new Float32Array(MAX_STRAND_COUNT);

  let validCount = 0;
  let prngState = 133742;
  const nextRand = () => {
    prngState = (prngState * 1664525 + 1013904223) >>> 0;
    return prngState / 4294967296;
  };

  while (validCount < MAX_STRAND_COUNT) {
    const targetArea = nextRand() * totalArea;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulativeAreas[mid] < targetArea) lo = mid + 1;
      else hi = mid;
    }

    const i0 = idxAttr.getX(lo * 3);
    const i1 = idxAttr.getX(lo * 3 + 1);
    const i2 = idxAttr.getX(lo * 3 + 2);

    const r1 = Math.sqrt(nextRand());
    const r2 = nextRand();
    const w0 = 1.0 - r1;
    const w1 = r1 * (1.0 - r2);
    const w2 = r1 * r2;

    const px =
      posAttr.getX(i0) * w0 + posAttr.getX(i1) * w1 + posAttr.getX(i2) * w2;
    const py =
      posAttr.getY(i0) * w0 + posAttr.getY(i1) * w1 + posAttr.getY(i2) * w2;
    const pz =
      posAttr.getZ(i0) * w0 + posAttr.getZ(i1) * w1 + posAttr.getZ(i2) * w2;

    const mask = evaluateFollicleMask(px, py, pz, 1.0);
    if (mask < 0.04) {
      continue;
    }

    let nx =
      normAttr.getX(i0) * w0 + normAttr.getX(i1) * w1 + normAttr.getX(i2) * w2;
    let ny =
      normAttr.getY(i0) * w0 + normAttr.getY(i1) * w1 + normAttr.getY(i2) * w2;
    let nz =
      normAttr.getZ(i0) * w0 + normAttr.getZ(i1) * w1 + normAttr.getZ(i2) * w2;
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;

    const [gx, gy, gz] = evaluateGroomFlow(px, py, pz, nx, ny, nz);

    let nearestIdx = 0;
    let minDistSq = Infinity;
    const startC = Math.floor(((py + 1.1) / 2.2) * (CLUMP_COUNT - 40));
    const searchStart = Math.max(0, Math.min(CLUMP_COUNT - 40, startC));
    for (let c = searchStart; c < searchStart + 40; c++) {
      const dx = clumpCenters[c * 3] - px;
      const dy = clumpCenters[c * 3 + 1] - py;
      const dz = clumpCenters[c * 3 + 2] - pz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearestIdx = c;
      }
    }

    let cx = clumpCenters[nearestIdx * 3] - px;
    let cy = clumpCenters[nearestIdx * 3 + 1] - py;
    let cz = clumpCenters[nearestIdx * 3 + 2] - pz;
    const dotCN = cx * nx + cy * ny + cz * nz;
    cx -= dotCN * nx;
    cy -= dotCN * ny;
    cz -= dotCN * nz;

    strandTriIndices[validCount] = lo;
    strandBaryW0[validCount] = w0;
    strandBaryW1[validCount] = w1;
    strandBaryW2[validCount] = w2;
    strandNearestClump[validCount] = nearestIdx;

    const idx3 = validCount * 3;
    rootPosArray[idx3] = px;
    rootPosArray[idx3 + 1] = py;
    rootPosArray[idx3 + 2] = pz;

    rootNormalArray[idx3] = nx;
    rootNormalArray[idx3 + 1] = ny;
    rootNormalArray[idx3 + 2] = nz;

    groomDirArray[idx3] = gx;
    groomDirArray[idx3 + 1] = gy;
    groomDirArray[idx3 + 2] = gz;

    clumpOffsetArray[idx3] = cx;
    clumpOffsetArray[idx3 + 1] = cy;
    clumpOffsetArray[idx3 + 2] = cz;

    strandSeedArray[validCount] = validCount / MAX_STRAND_COUNT;
    maskValueArray[validCount] = mask;

    validCount++;
  }

  const rootPosAttr = new THREE.InstancedBufferAttribute(rootPosArray, 3);
  const rootNormalAttr = new THREE.InstancedBufferAttribute(rootNormalArray, 3);
  const groomDirAttr = new THREE.InstancedBufferAttribute(groomDirArray, 3);
  const clumpOffsetAttr = new THREE.InstancedBufferAttribute(clumpOffsetArray, 3);
  const strandSeedAttr = new THREE.InstancedBufferAttribute(strandSeedArray, 1);
  const maskValueAttr = new THREE.InstancedBufferAttribute(maskValueArray, 1);

  strandGeometry.setAttribute('aRootPos', rootPosAttr);
  strandGeometry.setAttribute('aRootNormal', rootNormalAttr);
  strandGeometry.setAttribute('aGroomDir', groomDirAttr);
  strandGeometry.setAttribute('aClumpOffset', clumpOffsetAttr);
  strandGeometry.setAttribute('aStrandSeed', strandSeedAttr);
  strandGeometry.setAttribute('aMaskValue', maskValueAttr);

  const activeMaxStrands = gpuFurEnabled ? MAX_STRAND_COUNT : WEBGL_STRAND_COUNT;
  strandGeometry.instanceCount = Math.floor(activeMaxStrands * initialParams.furDensity);

  const strandMaterial = new THREE.ShaderMaterial({
    vertexShader: STRAND_VERTEX_SHADER,
    fragmentShader: STRAND_FRAGMENT_SHADER,
    uniforms: sharedUniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide
  });

  const strandDepthMaterial = new THREE.ShaderMaterial({
    vertexShader: STRAND_VERTEX_SHADER,
    fragmentShader: STRAND_DEPTH_FRAGMENT_SHADER,
    uniforms: sharedUniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide
  });

  const strandMesh = new THREE.Mesh(strandGeometry, strandMaterial);
  strandMesh.name = 'GPUFurStrands60k';
  strandMesh.frustumCulled = false;
  strandMesh.renderOrder = 2;

  /**
   * Re-projects all 60,000 instanced fur strands onto the updated creature surface
   * when the user changes Mochi-Puff's Body Shape style or Eye Size.
   */
  function updateSurfaceGeometry(updatedGeometry, eyeSize = 1.0) {
    const pAttr = updatedGeometry.attributes.position;
    const nAttr = updatedGeometry.attributes.normal;
    const iAttr = updatedGeometry.index;

    for (let c = 0; c < CLUMP_COUNT; c++) {
      const tri = clumpTriIndices[c];
      const i0 = iAttr.getX(tri * 3);
      clumpCenters[c * 3] = pAttr.getX(i0);
      clumpCenters[c * 3 + 1] = pAttr.getY(i0);
      clumpCenters[c * 3 + 2] = pAttr.getZ(i0);
    }

    for (let s = 0; s < MAX_STRAND_COUNT; s++) {
      const tri = strandTriIndices[s];
      const i0 = iAttr.getX(tri * 3);
      const i1 = iAttr.getX(tri * 3 + 1);
      const i2 = iAttr.getX(tri * 3 + 2);

      const w0 = strandBaryW0[s];
      const w1 = strandBaryW1[s];
      const w2 = strandBaryW2[s];

      const px = pAttr.getX(i0) * w0 + pAttr.getX(i1) * w1 + pAttr.getX(i2) * w2;
      const py = pAttr.getY(i0) * w0 + pAttr.getY(i1) * w1 + pAttr.getY(i2) * w2;
      const pz = pAttr.getZ(i0) * w0 + pAttr.getZ(i1) * w1 + pAttr.getZ(i2) * w2;

      let nx = nAttr.getX(i0) * w0 + nAttr.getX(i1) * w1 + nAttr.getX(i2) * w2;
      let ny = nAttr.getY(i0) * w0 + nAttr.getY(i1) * w1 + nAttr.getY(i2) * w2;
      let nz = nAttr.getZ(i0) * w0 + nAttr.getZ(i1) * w1 + nAttr.getZ(i2) * w2;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      const mask = evaluateFollicleMask(px, py, pz, eyeSize);
      const [gx, gy, gz] = evaluateGroomFlow(px, py, pz, nx, ny, nz);

      const nearestIdx = strandNearestClump[s];
      let cx = clumpCenters[nearestIdx * 3] - px;
      let cy = clumpCenters[nearestIdx * 3 + 1] - py;
      let cz = clumpCenters[nearestIdx * 3 + 2] - pz;
      const dotCN = cx * nx + cy * ny + cz * nz;
      cx -= dotCN * nx;
      cy -= dotCN * ny;
      cz -= dotCN * nz;

      const idx3 = s * 3;
      rootPosArray[idx3] = px;
      rootPosArray[idx3 + 1] = py;
      rootPosArray[idx3 + 2] = pz;

      rootNormalArray[idx3] = nx;
      rootNormalArray[idx3 + 1] = ny;
      rootNormalArray[idx3 + 2] = nz;

      groomDirArray[idx3] = gx;
      groomDirArray[idx3 + 1] = gy;
      groomDirArray[idx3 + 2] = gz;

      clumpOffsetArray[idx3] = cx;
      clumpOffsetArray[idx3 + 1] = cy;
      clumpOffsetArray[idx3 + 2] = cz;

      maskValueArray[s] = mask;
    }

    rootPosAttr.needsUpdate = true;
    rootNormalAttr.needsUpdate = true;
    groomDirAttr.needsUpdate = true;
    clumpOffsetAttr.needsUpdate = true;
    maskValueAttr.needsUpdate = true;
  }

  function updateDensity(density) {
    const clamped = Math.max(0.1, Math.min(1.0, density));
    sharedUniforms.uFurDensity.value = clamped;
    const cap = gpuFurEnabled ? MAX_STRAND_COUNT : WEBGL_STRAND_COUNT;
    strandGeometry.instanceCount = Math.floor(cap * clamped);
  }

  function setGPUFurEnabled(enabled) {
    gpuFurEnabled = Boolean(enabled);
    sharedUniforms.uGpuFurMode.value = gpuFurEnabled ? 1.0 : 0.0;
    sharedUniforms.uShellCountScale.value = gpuFurEnabled ? 1.0 : SHELL_COUNT / WEBGL_SHELL_COUNT;
    shellGeometry.instanceCount = gpuFurEnabled ? SHELL_COUNT : WEBGL_SHELL_COUNT;
    const cap = gpuFurEnabled ? MAX_STRAND_COUNT : WEBGL_STRAND_COUNT;
    strandGeometry.instanceCount = Math.floor(cap * sharedUniforms.uFurDensity.value);
  }

  return {
    shellMesh,
    strandMesh,
    shellDepthMaterial,
    strandDepthMaterial,
    sharedUniforms,
    updateDensity,
    updateSurfaceGeometry,
    setGPUFurEnabled,
    isGPUFurEnabled: () => gpuFurEnabled
  };
}

