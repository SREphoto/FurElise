import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

const SIM_SIZE = 128; // 128x128 = 16,384 parallel GPU spring-verlet & groom-alignment hair patches

export const BRUSH_MODES = {
  comb: {
    id: 'comb',
    code: 0.0,
    name: 'Comb & Align Stroke',
    description: 'Combs and aligns fur strands along your drag direction'
  },
  part: {
    id: 'part',
    code: 1.0,
    name: 'Part & Feather Crown',
    description: 'Parts fur radially outward away from the brush center'
  },
  swirl: {
    id: 'swirl',
    code: 2.0,
    name: 'Vortex Cowlick Swirl',
    description: 'Twists fur velocity and alignment into a spiral rosette'
  },
  fluff: {
    id: 'fluff',
    code: 3.0,
    name: 'Ruffle & Volumize',
    description: 'Lifts fur outward and relaxes combed strands back to fluffy loft'
  }
};

// Persistent Groom & Strand Alignment Buffer (xyz = combed tangent vector, w = alignment weight [0..1])
const GROOM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uDelta;
  uniform vec3 uPointerLocalPos;
  uniform vec3 uPointerVelocity;
  uniform float uPointerActive;
  uniform float uBrushRadius;
  uniform float uBrushStrength;
  uniform float uBrushMode;
  uniform float uCombPersistence;
  uniform float uResetGroom;

  void main() {
    if (uResetGroom > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float theta = (uv.x * 2.0 - 1.0) * 3.14159265;
    float phi = (1.0 - uv.y) * 3.14159265;
    vec3 surfNormal = normalize(vec3(
      sin(phi) * sin(theta),
      cos(phi),
      sin(phi) * cos(theta)
    ));

    vec4 groomData = texture2D(textureGroom, uv);
    vec3 combedDir = groomData.xyz;
    float combWeight = groomData.w;

    float dt = clamp(uDelta, 0.001, 0.033);

    // Gradual relaxation when persistence < 0.99
    float decayRate = mix(2.2, 0.0, clamp(uCombPersistence, 0.0, 1.0));
    if (decayRate > 0.005) {
      float decay = exp(-decayRate * dt);
      combedDir *= decay;
      combWeight *= decay;
    }

    if (uPointerActive > 0.5) {
      vec3 ptrNorm = normalize(uPointerLocalPos + vec3(0.0, 0.0, 1e-5));
      float radius = max(0.12, uBrushRadius);
      float dist = distance(surfNormal, ptrNorm);
      if (dist < radius) {
        float falloff = pow(1.0 - dist / radius, 1.65) * clamp(uBrushStrength, 0.1, 3.0);
        vec3 radialOut = normalize(surfNormal - ptrNorm + vec3(0.0, 1e-4, 0.0));
        radialOut -= surfNormal * dot(radialOut, surfNormal);
        radialOut = normalize(radialOut + vec3(1e-5, 0.0, 0.0));

        vec3 swirlDir = normalize(cross(surfNormal, radialOut) + vec3(1e-5, 0.0, 0.0));

        // Project pointer drag velocity onto local follicle tangent plane
        vec3 tangVel = uPointerVelocity - surfNormal * dot(uPointerVelocity, surfNormal);
        float velMag = length(tangVel);
        vec3 strokeDir = velMag > 0.02 ? (tangVel / velMag) : radialOut;

        if (uBrushMode < 0.5) {
          // Mode 0: Smooth Comb & Align along brush stroke velocity
          float strokeInfluence = clamp(velMag * 0.45, 0.18, 1.0);
          vec3 targetAlign = strokeDir * 0.72;
          combedDir = mix(combedDir, targetAlign, min(1.0, falloff * strokeInfluence * dt * 16.0));
          combWeight = min(1.0, combWeight + falloff * dt * 10.0);
        } else if (uBrushMode < 1.5) {
          // Mode 1: Part & Feather radially outward
          vec3 targetAlign = radialOut * 0.75;
          combedDir = mix(combedDir, targetAlign, min(1.0, falloff * dt * 14.0));
          combWeight = min(1.0, combWeight + falloff * dt * 10.0);
        } else if (uBrushMode < 2.5) {
          // Mode 2: Vortex Cowlick Swirl
          vec3 targetAlign = normalize(swirlDir * 0.85 + radialOut * 0.25) * 0.78;
          combedDir = mix(combedDir, targetAlign, min(1.0, falloff * dt * 14.0));
          combWeight = min(1.0, combWeight + falloff * dt * 10.0);
        } else {
          // Mode 3: Ruffle & Volumize (lifts fur & relaxes comb memory back to natural fluff)
          combedDir *= exp(-falloff * dt * 18.0);
          combWeight *= exp(-falloff * dt * 14.0);
        }
      }
    }

    // Clamp maximum combed tangent offset magnitude
    float cLen = length(combedDir);
    if (cLen > 0.82) {
      combedDir = (combedDir / cLen) * 0.82;
    }

    gl_FragColor = vec4(combedDir, combWeight);
  }
`;

const VELOCITY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uDelta;
  uniform float uStiffness;
  uniform float uDamping;
  uniform float uGravity;
  uniform float uWindStrength;
  uniform vec3 uWindDirection;
  uniform float uWindTurbulence;
  uniform float uWindGustFrequency;
  uniform float uAudioPulse;
  uniform float uMicBass;
  uniform float uMicMid;
  uniform float uMicTreble;
  uniform vec3 uCreatureVelocity;
  uniform vec3 uCreatureAngularVel;
  uniform vec3 uPointerLocalPos;
  uniform vec3 uPointerVelocity;
  uniform float uPointerActive;
  uniform float uBrushRadius;
  uniform float uBrushStrength;
  uniform float uBrushMode;
  uniform float uBoopShockwave;

  // 3D Procedural Hash & Gradient Noise for Curl-Noise Wind Force Field
  vec3 hash33(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(dot(hash33(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
            dot(hash33(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
        mix(dot(hash33(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
            dot(hash33(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x),
        u.y
      ),
      mix(
        mix(dot(hash33(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
            dot(hash33(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
        mix(dot(hash33(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
            dot(hash33(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x),
        u.y
      ),
      u.z
    );
  }

  // Divergence-free 3D Curl Noise (vortex eddies) via finite-difference vector potential
  vec3 curlNoise3D(vec3 p) {
    const float e = 0.08;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_y0 = vec3(noise3D(p - dy), noise3D(p - dy + vec3(19.1, 33.4, 47.2)), noise3D(p - dy + vec3(74.2, 12.8, 91.5)));
    vec3 p_y1 = vec3(noise3D(p + dy), noise3D(p + dy + vec3(19.1, 33.4, 47.2)), noise3D(p + dy + vec3(74.2, 12.8, 91.5)));
    vec3 p_z0 = vec3(noise3D(p - dz), noise3D(p - dz + vec3(19.1, 33.4, 47.2)), noise3D(p - dz + vec3(74.2, 12.8, 91.5)));
    vec3 p_z1 = vec3(noise3D(p + dz), noise3D(p + dz + vec3(19.1, 33.4, 47.2)), noise3D(p + dz + vec3(74.2, 12.8, 91.5)));
    vec3 p_x0 = vec3(noise3D(p - dx), noise3D(p - dx + vec3(19.1, 33.4, 47.2)), noise3D(p - dx + vec3(74.2, 12.8, 91.5)));
    vec3 p_x1 = vec3(noise3D(p + dx), noise3D(p + dx + vec3(19.1, 33.4, 47.2)), noise3D(p + dx + vec3(74.2, 12.8, 91.5)));

    float cx = (p_y1.z - p_y0.z) - (p_z1.y - p_z0.y);
    float cy = (p_z1.x - p_z0.x) - (p_x1.z - p_x0.z);
    float cz = (p_x1.y - p_x0.y) - (p_y1.x - p_y0.x);

    return vec3(cx, cy, cz) / (2.0 * e);
  }

  // Procedural Multi-Scale Wind Force Field
  vec3 evaluateProceduralWindField(vec3 surfNormal, vec3 currentDisp, float t) {
    vec3 windDir = normalize(uWindDirection + vec3(1e-5, 0.0, 0.0));
    float gustFreq = max(0.15, uWindGustFrequency);

    vec3 samplePos = (surfNormal + currentDisp * 0.35) * 1.65 - windDir * (t * gustFreq * 1.45);

    float phase = dot(surfNormal, windDir) * 3.8 - t * gustFreq * 3.4;
    float gustWave = 0.55 + 0.45 * sin(phase) + 0.25 * sin(phase * 2.15 + 1.3);
    float gustEnvelope = max(0.1, gustWave);

    vec3 tangentWind = windDir - surfNormal * min(0.0, dot(windDir, surfNormal) * 0.75);
    float windwardExposure = 0.45 + 0.55 * clamp(1.0 - abs(dot(surfNormal, windDir)) * 0.4, 0.0, 1.0);
    vec3 steadyStream = tangentWind * gustEnvelope * windwardExposure * 1.35;

    vec3 curlVortex = curlNoise3D(samplePos * 1.15);
    vec3 microFlutter = vec3(
      sin(surfNormal.y * 5.2 + t * 4.6 * gustFreq) * cos(surfNormal.z * 4.3 - t * 3.1),
      cos(surfNormal.x * 4.8 + t * 3.8 * gustFreq) * 0.45,
      sin(surfNormal.x * 5.5 - t * 4.2 * gustFreq) * sin(surfNormal.y * 4.1 + t * 2.9)
    );

    vec3 turbulentEddies = (curlVortex * 0.85 + microFlutter * 0.35) * uWindTurbulence * (0.6 + 0.4 * gustEnvelope);

    vec3 rawWind = (steadyStream + turbulentEddies) * uWindStrength;
    float inwardWind = min(0.0, dot(rawWind, surfNormal));
    return rawWind - surfNormal * inwardWind * 0.85;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    float theta = (uv.x * 2.0 - 1.0) * 3.14159265;
    float phi = (1.0 - uv.y) * 3.14159265;
    vec3 surfNormal = normalize(vec3(
      sin(phi) * sin(theta),
      cos(phi),
      sin(phi) * cos(theta)
    ));

    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec4 groomData = texture2D(textureGroom, uv);
    vec3 disp = posData.xyz;
    vec3 vel = velData.xyz;
    vec3 combedRest = groomData.xyz;
    float combWeight = groomData.w;

    float dt = clamp(uDelta, 0.001, 0.033);

    // 1. Hookean angular spring restoring force toward combed rest alignment (combedRest)
    vec3 force = -uStiffness * (disp - combedRest * 0.72);

    // 2. Tangential gravity droop (reduced slightly on strongly combed locks so styling holds)
    vec3 gravVec = vec3(0.0, -uGravity * (1.0 - combWeight * 0.35), 0.0);
    vec3 tangentGravity = gravVec - surfNormal * min(0.0, dot(gravVec, surfNormal));
    force += tangentGravity;

    // 3. Creature movement & rotational inertia
    vec3 linearInertia = -uCreatureVelocity * 1.85;
    vec3 rotationalInertia = -cross(uCreatureAngularVel, surfNormal) * 2.2;
    force += linearInertia + rotationalInertia;

    // 4. Procedural 3D Wind Force Field
    vec3 windForce = evaluateProceduralWindField(surfNormal, disp, uTime);
    force += windForce * 1.45;

    // 5. Musical Singing & Web Audio Microphone Rhythmic Fur Vibration
    float totalAudio = uAudioPulse + uMicBass * 0.85 + uMicMid * 0.65;
    if (totalAudio > 0.005 || uMicTreble > 0.005) {
      vec3 danceWave = vec3(
        sin(uTime * 12.0 + surfNormal.y * 4.5) * 1.6,
        abs(cos(uTime * 15.0 + surfNormal.x * 3.5)) * 2.2,
        cos(uTime * 12.0 + surfNormal.z * 4.5) * 1.6
      ) * totalAudio;
      // High-frequency acoustic standing-wave shimmer from microphone treble
      vec3 trebleShimmer = vec3(
        sin(uTime * 34.0 + surfNormal.z * 14.0),
        cos(uTime * 38.0 + surfNormal.x * 14.0),
        sin(uTime * 36.0 - surfNormal.y * 14.0)
      ) * (uMicTreble * 2.1);
      vec3 combinedSoundForce = danceWave * 3.0 + trebleShimmer * 2.2;
      combinedSoundForce -= surfNormal * min(0.0, dot(combinedSoundForce, surfNormal));
      force += combinedSoundForce;
    }

    // 6. Interactive Brush Tool (Comb & Align, Part, Swirl, or Ruffle/Fluff)
    if (uPointerActive > 0.5) {
      vec3 ptrNorm = normalize(uPointerLocalPos + vec3(0.0, 0.0, 1e-5));
      float radius = max(0.12, uBrushRadius);
      float dist = distance(surfNormal, ptrNorm);
      if (dist < radius) {
        float falloff = pow(1.0 - dist / radius, 1.8) * clamp(uBrushStrength, 0.1, 3.0);
        vec3 partDir = normalize(surfNormal - ptrNorm + vec3(0.0, 1e-4, 0.0));
        partDir -= surfNormal * dot(partDir, surfNormal);
        partDir = normalize(partDir + vec3(1e-5, 0.0, 0.0));
        vec3 swirlDir = normalize(cross(surfNormal, partDir) + vec3(1e-5, 0.0, 0.0));

        vec3 strokeImpulse = vec3(0.0);
        if (uBrushMode < 0.5) {
          // Comb & Align: strong directional velocity impulse along brush drag vector
          strokeImpulse = uPointerVelocity * 3.8 + partDir * 1.2;
        } else if (uBrushMode < 1.5) {
          // Part & Feather: pushes fur radially away from brush center
          strokeImpulse = partDir * 5.2 + uPointerVelocity * 1.4;
        } else if (uBrushMode < 2.5) {
          // Vortex Swirl: rotational velocity around brush center
          strokeImpulse = swirlDir * 5.6 + partDir * 1.2;
        } else {
          // Ruffle & Volumize: energetic high-frequency outward fluffing
          vec3 ruffle = vec3(
            sin(uTime * 28.0 + surfNormal.y * 19.0),
            cos(uTime * 26.0 + surfNormal.x * 19.0),
            sin(uTime * 30.0 + surfNormal.z * 19.0)
          );
          strokeImpulse = (surfNormal * 2.5 + ruffle * 3.8 + uPointerVelocity * 1.8);
        }

        if (uBrushMode < 2.5) {
          strokeImpulse -= surfNormal * dot(strokeImpulse, surfNormal);
        }
        force += strokeImpulse * falloff * 18.0;
      }
    }

    // 7. Click-to-boop radial shockwave ripple
    if (uBoopShockwave > 0.01) {
      float waveFront = (1.0 - uBoopShockwave) * 2.2;
      float dFront = abs(distance(surfNormal, vec3(0.0, 0.1, 0.98)) - waveFront);
      if (dFront < 0.35) {
        float ripple = (1.0 - dFront / 0.35) * uBoopShockwave;
        vec3 radial = normalize(surfNormal - vec3(0.0, 0.1, 0.98) + vec3(0.0, 1e-4, 0.0));
        force += radial * ripple * 22.0;
      }
    }

    vel = (vel + force * dt) * exp(-uDamping * dt);

    float speed = length(vel);
    if (speed > 6.5) {
      vel = (vel / speed) * 6.5;
    }

    gl_FragColor = vec4(vel, combWeight);
  }
`;

const POSITION_FRAGMENT_SHADER = /* glsl */ `
  uniform float uDelta;
  uniform float uResetGroom;

  void main() {
    if (uResetGroom > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float theta = (uv.x * 2.0 - 1.0) * 3.14159265;
    float phi = (1.0 - uv.y) * 3.14159265;
    vec3 surfNormal = normalize(vec3(
      sin(phi) * sin(theta),
      cos(phi),
      sin(phi) * cos(theta)
    ));

    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec4 groomData = texture2D(textureGroom, uv);
    vec3 disp = posData.xyz;
    vec3 vel = velData.xyz;
    float combMemory = groomData.w;

    float dt = clamp(uDelta, 0.001, 0.033);
    disp += vel * dt;

    // Prevent hair from penetrating inward along the surface normal
    float inward = dot(disp, surfNormal);
    if (inward < -0.15) {
      disp -= surfNormal * (inward + 0.15);
    }

    // Elastic length constraint
    float maxDisp = 0.92;
    float dLen = length(disp);
    if (dLen > maxDisp) {
      disp = (disp / dLen) * maxDisp;
    }

    gl_FragColor = vec4(disp, combMemory);
  }
`;

export function createGPUFurPhysics(renderer) {
  let gpuCompute = null;
  let posVariable = null;
  let velVariable = null;
  let groomVariable = null;
  let fallbackTexture = null;
  let isGPGPUActive = false;
  let pendingResetGroom = false;

  const fallbackData = new Float32Array(4 * 4 * 4);
  fallbackTexture = new THREE.DataTexture(
    fallbackData,
    4,
    4,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  fallbackTexture.needsUpdate = true;

  try {
    gpuCompute = new GPUComputationRenderer(SIM_SIZE, SIM_SIZE, renderer);
    gpuCompute.setDataType(THREE.HalfFloatType);

    const dtPosition = gpuCompute.createTexture();
    const dtVelocity = gpuCompute.createTexture();
    const dtGroom = gpuCompute.createTexture();

    groomVariable = gpuCompute.addVariable('textureGroom', GROOM_FRAGMENT_SHADER, dtGroom);
    posVariable = gpuCompute.addVariable('texturePosition', POSITION_FRAGMENT_SHADER, dtPosition);
    velVariable = gpuCompute.addVariable('textureVelocity', VELOCITY_FRAGMENT_SHADER, dtVelocity);

    gpuCompute.setVariableDependencies(groomVariable, [groomVariable]);
    gpuCompute.setVariableDependencies(velVariable, [posVariable, velVariable, groomVariable]);
    gpuCompute.setVariableDependencies(posVariable, [posVariable, velVariable, groomVariable]);

    // Initialize groom alignment uniforms
    groomVariable.material.uniforms.uDelta = { value: 0.016 };
    groomVariable.material.uniforms.uPointerLocalPos = { value: new THREE.Vector3(0, 0, 1) };
    groomVariable.material.uniforms.uPointerVelocity = { value: new THREE.Vector3() };
    groomVariable.material.uniforms.uPointerActive = { value: 0.0 };
    groomVariable.material.uniforms.uBrushRadius = { value: 0.45 };
    groomVariable.material.uniforms.uBrushStrength = { value: 1.25 };
    groomVariable.material.uniforms.uBrushMode = { value: 0.0 };
    groomVariable.material.uniforms.uCombPersistence = { value: 0.82 };
    groomVariable.material.uniforms.uResetGroom = { value: 0.0 };

    // Initialize velocity uniforms
    velVariable.material.uniforms.uTime = { value: 0.0 };
    velVariable.material.uniforms.uDelta = { value: 0.016 };
    velVariable.material.uniforms.uStiffness = { value: 26.0 };
    velVariable.material.uniforms.uDamping = { value: 5.2 };
    velVariable.material.uniforms.uGravity = { value: 2.8 };
    velVariable.material.uniforms.uWindStrength = { value: 1.4 };
    velVariable.material.uniforms.uWindDirection = { value: new THREE.Vector3(1.0, 0.12, 0.35).normalize() };
    velVariable.material.uniforms.uWindTurbulence = { value: 0.85 };
    velVariable.material.uniforms.uWindGustFrequency = { value: 1.1 };
    velVariable.material.uniforms.uAudioPulse = { value: 0.0 };
    velVariable.material.uniforms.uMicBass = { value: 0.0 };
    velVariable.material.uniforms.uMicMid = { value: 0.0 };
    velVariable.material.uniforms.uMicTreble = { value: 0.0 };
    velVariable.material.uniforms.uCreatureVelocity = { value: new THREE.Vector3() };
    velVariable.material.uniforms.uCreatureAngularVel = { value: new THREE.Vector3() };
    velVariable.material.uniforms.uPointerLocalPos = { value: new THREE.Vector3(0, 0, 1) };
    velVariable.material.uniforms.uPointerVelocity = { value: new THREE.Vector3() };
    velVariable.material.uniforms.uPointerActive = { value: 0.0 };
    velVariable.material.uniforms.uBrushRadius = { value: 0.45 };
    velVariable.material.uniforms.uBrushStrength = { value: 1.25 };
    velVariable.material.uniforms.uBrushMode = { value: 0.0 };
    velVariable.material.uniforms.uBoopShockwave = { value: 0.0 };

    // Initialize position uniforms
    posVariable.material.uniforms.uDelta = { value: 0.016 };
    posVariable.material.uniforms.uResetGroom = { value: 0.0 };

    const error = gpuCompute.init();
    if (error === null) {
      isGPGPUActive = true;
    } else {
      console.warn('GPGPU fallback mode enabled:', error);
    }
  } catch (_e) {
    console.warn('GPGPU initialization fell back to analytical shader physics');
  }

  function resetGroom() {
    pendingResetGroom = true;
  }

  function step({
    time,
    dt,
    windStrength,
    windDirection,
    windTurbulence = 0.85,
    windGustFrequency = 1.1,
    audioPulse = 0.0,
    micBass = 0.0,
    micMid = 0.0,
    micTreble = 0.0,
    creatureVelocity,
    creatureAngularVel,
    pointerLocalPos,
    pointerVelocity,
    pointerActive,
    brushRadius = 0.45,
    brushStrength = 1.25,
    brushMode = 'comb',
    combPersistence = 0.82,
    boopShockwave
  }) {
    if (!isGPGPUActive || !gpuCompute) {
      return {
        physicsTexture: fallbackTexture,
        groomTexture: fallbackTexture
      };
    }

    const modeObj = BRUSH_MODES[brushMode] || BRUSH_MODES.comb;
    const gUni = groomVariable.material.uniforms;
    const vUni = velVariable.material.uniforms;
    const pUni = posVariable.material.uniforms;

    gUni.uDelta.value = dt;
    gUni.uPointerLocalPos.value.copy(pointerLocalPos);
    gUni.uPointerVelocity.value.copy(pointerVelocity);
    gUni.uPointerActive.value = pointerActive ? 1.0 : 0.0;
    gUni.uBrushRadius.value = brushRadius;
    gUni.uBrushStrength.value = brushStrength;
    gUni.uBrushMode.value = modeObj.code;
    gUni.uCombPersistence.value = combPersistence;
    gUni.uResetGroom.value = pendingResetGroom ? 1.0 : 0.0;

    vUni.uTime.value = time;
    vUni.uDelta.value = dt;
    vUni.uWindStrength.value = windStrength;
    if (windDirection) {
      vUni.uWindDirection.value.copy(windDirection);
    }
    vUni.uWindTurbulence.value = windTurbulence;
    vUni.uWindGustFrequency.value = windGustFrequency;
    vUni.uAudioPulse.value = audioPulse;
    vUni.uMicBass.value = micBass;
    vUni.uMicMid.value = micMid;
    vUni.uMicTreble.value = micTreble;
    vUni.uCreatureVelocity.value.copy(creatureVelocity);
    vUni.uCreatureAngularVel.value.copy(creatureAngularVel);
    vUni.uPointerLocalPos.value.copy(pointerLocalPos);
    vUni.uPointerVelocity.value.copy(pointerVelocity);
    vUni.uPointerActive.value = pointerActive ? 1.0 : 0.0;
    vUni.uBrushRadius.value = brushRadius;
    vUni.uBrushStrength.value = brushStrength;
    vUni.uBrushMode.value = modeObj.code;
    vUni.uBoopShockwave.value = boopShockwave;

    pUni.uDelta.value = dt;
    pUni.uResetGroom.value = pendingResetGroom ? 1.0 : 0.0;

    gpuCompute.compute();
    pendingResetGroom = false;

    return {
      physicsTexture: gpuCompute.getCurrentRenderTarget(posVariable).texture,
      groomTexture: gpuCompute.getCurrentRenderTarget(groomVariable).texture
    };
  }

  return {
    step,
    resetGroom,
    get isGPGPUActive() {
      return isGPGPUActive;
    },
    get fallbackTexture() {
      return fallbackTexture;
    }
  };
}
