// GPU Atmospheric Dust Motes & Specular Air Sparkle Particle System +
// Dynamic Moving Light & Slow Rainbow Lighting Showcase Presets

import * as THREE from 'three';

export const AIR_DUST_STYLES = {
  specular: {
    id: 'specular',
    name: 'Specular Prism Sparkles',
    colorA: '#ffffff',
    colorB: '#a5f3fc',
    starShape: 1.0,
    sizeScale: 1.1
  },
  gold: {
    id: 'gold',
    name: 'Golden Sun Dust Motes',
    colorA: '#fef08a',
    colorB: '#fdba74',
    starShape: 0.45,
    sizeScale: 1.0
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Dew Shimmer',
    colorA: '#fbcfe8',
    colorB: '#f472b6',
    starShape: 0.65,
    sizeScale: 1.15
  },
  firefly: {
    id: 'firefly',
    name: 'Bioluminescent Fireflies',
    colorA: '#6ee7b7',
    colorB: '#fde047',
    starShape: 0.25,
    sizeScale: 1.35
  }
};

export const LIGHTING_SHOWCASE_PRESETS = {
  static: {
    id: 'static',
    name: 'Static Studio Rig',
    description: 'Manual Key & Point Light placement'
  },
  rainbow: {
    id: 'rainbow',
    name: 'Slow Rainbow Prism',
    description: 'Slowly cycles Key, Rim & orbiting Point Light through a full HSL spectrum'
  },
  goldenSweep: {
    id: 'goldenSweep',
    name: 'Golden Orbit Sweep',
    description: 'Sweeps warm golden-amber & rose light across fur to showcase Marschner sheen'
  },
  auroraDance: {
    id: 'auroraDance',
    name: 'Aurora Dual-Wave',
    description: 'Figure-8 northern lights dance with cyan, emerald, and violet rim scatter'
  },
  cyberNeon: {
    id: 'cyberNeon',
    name: 'Cyber Neon Halo',
    description: 'Dynamic electric cyan & magenta moving light rig with high specular glint'
  },
  sunsetBreeze: {
    id: 'sunsetBreeze',
    name: 'Sunset Horizon Drift',
    description: 'Slowly drifting crimson-gold key light and twilight violet rim light'
  }
};

const MAX_DUST_PARTICLES = 1200;

const AIR_DUST_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aScale;

  uniform float uTime;
  uniform float uDustDensity;
  uniform float uDustSize;
  uniform float uSparkleIntensity;
  uniform float uPixelRatio;
  uniform float uEnvScale;
  uniform vec3 uCenterOffset;
  uniform vec3 uWindDirection;
  uniform float uWindStrength;
  uniform float uWindTurbulence;
  uniform vec3 uPointLightPos;
  uniform vec3 uPointLightColor;
  uniform float uPointLightIntensity;
  uniform vec3 uKeyLightColor;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uAudioPulse;

  varying float vAlpha;
  varying float vSpecFlash;
  varying vec3 vTint;
  varying float vSeedPhase;

  void main() {
    // Cull particles beyond active density slider
    if (aSeed.x > uDustDensity) {
      gl_Position = vec4(2.0, 2.0, 2.0, 0.0);
      gl_PointSize = 0.0;
      return;
    }

    vSeedPhase = aSeed.z * 6.2831853;

    // 3D bounding volume centered around Mochi-Puff
    vec3 boxSpan = vec3(5.6, 3.8, 4.6) * uEnvScale;
    vec3 basePos = (aSeed - 0.5) * boxSpan;

    // Wind drift + gentle upward convection + curl swirl
    vec3 windDir = normalize(uWindDirection + vec3(1e-5, 0.0, 0.0));
    float driftSpeed = 0.18 + 0.35 * uWindStrength;
    vec3 drift = windDir * (uTime * driftSpeed) + vec3(0.0, uTime * 0.08 * (0.6 + aSeed.y), 0.0);

    // Wrap smoothly inside [-0.5*boxSpan, +0.5*boxSpan]
    vec3 wrapped = mod(basePos + drift + boxSpan * 0.5, boxSpan) - boxSpan * 0.5;

    // Add organic 3D turbulence flutter
    float turb = 0.35 + 0.65 * uWindTurbulence;
    vec3 flutter = vec3(
      sin(uTime * 1.3 + vSeedPhase + aSeed.y * 9.0),
      cos(uTime * 1.1 + aSeed.x * 11.0 + vSeedPhase),
      sin(uTime * 1.5 + aSeed.z * 7.0)
    ) * (0.14 * turb * uEnvScale);

    vec3 worldPos = wrapped + flutter + uCenterOffset;

    // Smooth spherical fade near volume boundaries so particles never pop in/out
    vec3 normBox = wrapped / (boxSpan * 0.5);
    float radialDist = length(normBox);
    float edgeFade = 1.0 - smoothstep(0.62, 1.0, radialDist);

    // Specular glint flash: facets tumbling in the air catch the Key Light and 3D Point Light
    float tumble = sin(uTime * (2.2 + aSeed.x * 3.5) + vSeedPhase) *
                   cos(uTime * (1.7 + aSeed.y * 2.8) - vSeedPhase * 0.7);
    float specGlint = pow(max(0.0, tumble), 6.0) * uSparkleIntensity;

    // Boost brightness when dust mote passes near the 3D Point Light
    float distToPoint = distance(worldPos, uPointLightPos);
    float pointProximity = exp(-distToPoint * 0.85 / max(0.25, uEnvScale)) * clamp(uPointLightIntensity * 0.6, 0.0, 1.8);

    vSpecFlash = clamp(specGlint + pointProximity * 0.85 + uAudioPulse * 0.6, 0.0, 2.5);

    // Mix particle base palette with active scene Point Light & Key Light hues
    vec3 baseHue = mix(uColorA, uColorB, aSeed.y);
    vec3 lightHue = mix(uKeyLightColor, uPointLightColor, 0.55);
    vTint = mix(baseHue, lightHue * 1.25, clamp(pointProximity * 0.55 + specGlint * 0.35, 0.0, 0.85));

    vAlpha = edgeFade * (0.28 + 0.52 * aScale + min(0.55, vSpecFlash * 0.45));

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float depthScale = (18.0 * uDustSize * (0.55 + 0.85 * aScale) * (1.0 + vSpecFlash * 0.42) * uPixelRatio) / max(0.8, -mvPosition.z);
    gl_PointSize = clamp(depthScale, 2.0, 44.0);
  }
`;

const AIR_DUST_FRAGMENT_SHADER = /* glsl */ `
  uniform float uStarShape;

  varying float vAlpha;
  varying float vSpecFlash;
  varying vec3 vTint;
  varying float vSeedPhase;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r = length(uv);
    if (r > 1.0) {
      discard;
    }

    // Soft optical bokeh disc + airy Gaussian halo
    float softHalo = exp(-r * r * 3.8);
    float bokehRing = smoothstep(0.85, 0.55, r) * (0.35 + 0.45 * smoothstep(0.2, 0.68, r));

    // 4-point specular cross-star glint when particle facet catches the light
    float c = cos(vSeedPhase * 0.25);
    float s = sin(vSeedPhase * 0.25);
    vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    float starRays =
      exp(-abs(rotUV.x) * 9.5) * exp(-abs(rotUV.y) * 2.2) +
      exp(-abs(rotUV.y) * 9.5) * exp(-abs(rotUV.x) * 2.2);
    starRays *= (1.0 - smoothstep(0.0, 1.0, r));

    float shapeMix = mix(softHalo * 0.75 + bokehRing * 0.45, softHalo * 0.65 + starRays * 0.85, uStarShape * clamp(0.35 + vSpecFlash * 0.65, 0.0, 1.0));
    float coreHotspot = exp(-r * r * 16.0) * (0.6 + vSpecFlash * 1.15);

    vec3 finalColor = vTint * (shapeMix + coreHotspot * 1.35) + vec3(1.0) * (coreHotspot * 0.65 * vSpecFlash);
    float finalAlpha = clamp((shapeMix + coreHotspot * 0.5) * vAlpha, 0.0, 0.95);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export function createAirDustSystem(initialState = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_DUST_PARTICLES * 3);
  const seeds = new Float32Array(MAX_DUST_PARTICLES * 3);
  const scales = new Float32Array(MAX_DUST_PARTICLES);

  let prng = 987654321;
  const rand = () => {
    prng = (prng * 1664525 + 1013904223) >>> 0;
    return prng / 4294967296;
  };

  for (let i = 0; i < MAX_DUST_PARTICLES; i++) {
    const i3 = i * 3;
    // Stratified index in seeds[i3] so density culling is uniform
    seeds[i3] = i / MAX_DUST_PARTICLES;
    seeds[i3 + 1] = rand();
    seeds[i3 + 2] = rand();
    scales[i] = 0.35 + 0.65 * Math.pow(rand(), 1.4);

    positions[i3] = (seeds[i3] - 0.5) * 4.0;
    positions[i3 + 1] = (seeds[i3 + 1] - 0.5) * 3.0;
    positions[i3 + 2] = (seeds[i3 + 2] - 0.5) * 4.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const initialStyle = AIR_DUST_STYLES[initialState.airDustStyle] || AIR_DUST_STYLES.specular;

  const uniforms = {
    uTime: { value: 0.0 },
    uDustDensity: { value: initialState.airDustDensity ?? 0.72 },
    uDustSize: { value: (initialState.airDustSize ?? 1.0) * initialStyle.sizeScale },
    uSparkleIntensity: { value: initialState.airDustSparkle ?? 1.25 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uEnvScale: { value: 1.0 },
    uCenterOffset: { value: new THREE.Vector3(0, 0.1, 0) },
    uWindDirection: { value: new THREE.Vector3(1, 0.12, 0.35).normalize() },
    uWindStrength: { value: initialState.windStrength ?? 0.95 },
    uWindTurbulence: { value: initialState.windTurbulence ?? 0.85 },
    uPointLightPos: { value: new THREE.Vector3(1.55, 1.1, 1.75) },
    uPointLightColor: { value: new THREE.Color('#ffd6a5') },
    uPointLightIntensity: { value: 1.5 },
    uKeyLightColor: { value: new THREE.Color('#fff7ed') },
    uColorA: { value: new THREE.Color(initialStyle.colorA) },
    uColorB: { value: new THREE.Color(initialStyle.colorB) },
    uStarShape: { value: initialStyle.starShape },
    uAudioPulse: { value: 0.0 }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: AIR_DUST_VERTEX_SHADER,
    fragmentShader: AIR_DUST_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const pointsMesh = new THREE.Points(geometry, material);
  pointsMesh.name = 'AtmosphericSpecularDust';
  pointsMesh.frustumCulled = false;
  pointsMesh.renderOrder = 4;
  pointsMesh.visible = initialState.airDustEnabled !== undefined ? Boolean(initialState.airDustEnabled) : true;

  function updateFromState(state) {
    pointsMesh.visible = Boolean(state.airDustEnabled);
    const style = AIR_DUST_STYLES[state.airDustStyle] || AIR_DUST_STYLES.specular;
    uniforms.uDustDensity.value = Math.max(0.0, Math.min(1.0, Number(state.airDustDensity ?? 0.72)));
    uniforms.uDustSize.value = Math.max(0.3, Math.min(2.5, Number(state.airDustSize ?? 1.0))) * style.sizeScale;
    uniforms.uSparkleIntensity.value = Math.max(0.0, Math.min(3.0, Number(state.airDustSparkle ?? 1.25)));
    uniforms.uColorA.value.set(style.colorA);
    uniforms.uColorB.value.set(style.colorB);
    uniforms.uStarShape.value = style.starShape;
  }

  function updateFrame({
    time,
    windDirection,
    windStrength,
    windTurbulence,
    pointLightPos,
    pointLightColor,
    pointLightIntensity,
    keyLightColor,
    audioPulse,
    envScale,
    centerOffset,
    pixelRatio
  }) {
    if (!pointsMesh.visible) return;
    uniforms.uTime.value = time;
    if (windDirection) uniforms.uWindDirection.value.copy(windDirection);
    if (windStrength !== undefined) uniforms.uWindStrength.value = windStrength;
    if (windTurbulence !== undefined) uniforms.uWindTurbulence.value = windTurbulence;
    if (pointLightPos) uniforms.uPointLightPos.value.copy(pointLightPos);
    if (pointLightColor) uniforms.uPointLightColor.value.set(pointLightColor);
    if (pointLightIntensity !== undefined) uniforms.uPointLightIntensity.value = pointLightIntensity;
    if (keyLightColor) uniforms.uKeyLightColor.value.set(keyLightColor);
    if (audioPulse !== undefined) uniforms.uAudioPulse.value = audioPulse;
    if (envScale !== undefined) uniforms.uEnvScale.value = envScale;
    if (centerOffset) uniforms.uCenterOffset.value.copy(centerOffset);
    if (pixelRatio !== undefined) uniforms.uPixelRatio.value = pixelRatio;
  }

  return {
    pointsMesh,
    uniforms,
    updateFromState,
    updateFrame
  };
}
