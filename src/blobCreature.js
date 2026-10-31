import * as THREE from 'three';

export const BODY_SHAPE_PRESETS = {
  mochi: {
    id: 'mochi',
    name: 'Mochi Pear',
    faceZOffset: 0.0,
    faceYOffset: 0.0
  },
  puffball: {
    id: 'puffball',
    name: 'Round Puffball',
    faceZOffset: 0.03,
    faceYOffset: 0.02
  },
  bunny: {
    id: 'bunny',
    name: 'Long-Eared Bunny',
    faceZOffset: -0.01,
    faceYOffset: -0.02
  },
  kitty: {
    id: 'kitty',
    name: 'Neko Cat Spirit',
    faceZOffset: 0.02,
    faceYOffset: 0.01
  },
  star: {
    id: 'star',
    name: 'Star-Puff Sprite',
    faceZOffset: 0.03,
    faceYOffset: 0.01
  },
  bean: {
    id: 'bean',
    name: 'Tall Jellybean',
    faceZOffset: -0.05,
    faceYOffset: 0.08
  }
};

export const MOOD_PRESETS = {
  happy: {
    id: 'happy',
    name: 'Happy Joy',
    badge: '😊 Happy',
    baseColor: '#5e2bff',
    tipColor: '#ff9ec7',
    irisColor: '#4c2882',
    blushColor: '#ff5c93',
    blushOpacity: 0.58,
    keyColor: '#fff7ed',
    pointLightKelvin: 3600,
    eyeLidScaleY: 1.0,
    eyeBrowTilt: 0.0,
    catchlightScale: 1.0,
    breathSpeed: 2.3,
    bounceAmp: 1.0
  },
  love: {
    id: 'love',
    name: 'Smitten Love',
    badge: '💖 Love',
    baseColor: '#831843',
    tipColor: '#fda4af',
    irisColor: '#be185d',
    blushColor: '#fb7185',
    blushOpacity: 0.85,
    keyColor: '#ffe4e6',
    pointLightKelvin: 2900,
    eyeLidScaleY: 1.08,
    eyeBrowTilt: -0.08,
    catchlightScale: 1.32,
    breathSpeed: 2.6,
    bounceAmp: 1.18
  },
  excited: {
    id: 'excited',
    name: 'Hyper Spark',
    badge: '⚡ Excited',
    baseColor: '#b45309',
    tipColor: '#fde047',
    irisColor: '#d97706',
    blushColor: '#fb923c',
    blushOpacity: 0.72,
    keyColor: '#fef9c3',
    pointLightKelvin: 4800,
    eyeLidScaleY: 1.16,
    eyeBrowTilt: -0.05,
    catchlightScale: 1.25,
    breathSpeed: 3.6,
    bounceAmp: 1.45
  },
  sleepy: {
    id: 'sleepy',
    name: 'Dreamy Sleepy',
    badge: '😴 Sleepy',
    baseColor: '#1e1b4b',
    tipColor: '#a5b4fc',
    irisColor: '#312e81',
    blushColor: '#c084fc',
    blushOpacity: 0.42,
    keyColor: '#e0e7ff',
    pointLightKelvin: 7800,
    eyeLidScaleY: 0.44,
    eyeBrowTilt: -0.14,
    catchlightScale: 0.82,
    breathSpeed: 1.25,
    bounceAmp: 0.55
  },
  grumpy: {
    id: 'grumpy',
    name: 'Spicy Grumpy',
    badge: '😤 Grumpy',
    baseColor: '#450a0a',
    tipColor: '#fb7185',
    irisColor: '#991b1b',
    blushColor: '#ef4444',
    blushOpacity: 0.78,
    keyColor: '#fecdd3',
    pointLightKelvin: 2200,
    eyeLidScaleY: 0.74,
    eyeBrowTilt: 0.28,
    catchlightScale: 0.88,
    breathSpeed: 2.9,
    bounceAmp: 0.9
  },
  zen: {
    id: 'zen',
    name: 'Mystic Zen',
    badge: '🌿 Zen',
    baseColor: '#064e3b',
    tipColor: '#6ee7b7',
    irisColor: '#047857',
    blushColor: '#34d399',
    blushOpacity: 0.48,
    keyColor: '#d1fae5',
    pointLightKelvin: 6400,
    eyeLidScaleY: 0.78,
    eyeBrowTilt: -0.06,
    catchlightScale: 1.05,
    breathSpeed: 1.6,
    bounceAmp: 0.75
  }
};

/**
 * Evaluates the anatomical follicle growth mask at a local position on the blob surface.
 * Scales dynamically with `eyeSize` so fur parts cleanly around both tiny and huge anime eyes.
 */
export function evaluateFollicleMask(x, y, z, eyeSize = 1.0) {
  const safeEyeSize = Math.max(0.45, Math.min(2.0, Number(eyeSize) || 1.0));
  const lx = x + 0.31;
  const rx = x - 0.31;
  const ey = y - 0.16;
  const ez = z - 0.88;

  const distLeftEye = Math.sqrt(lx * lx + ey * ey * 1.1 + ez * ez);
  const distRightEye = Math.sqrt(rx * rx + ey * ey * 1.1 + ez * ez);
  const minEyeDist = Math.min(distLeftEye, distRightEye);

  const innerCorneaRadius = 0.145 * safeEyeSize;
  const outerRimRadius = 0.25 * safeEyeSize;

  if (minEyeDist < innerCorneaRadius) {
    return 0.0;
  }
  const eyeMask = 0.28 + 0.72 * smoothstep(innerCorneaRadius, outerRimRadius, minEyeDist);

  // Small mask right under the pink nose button & mouth
  const mx = x / 1.25;
  const my = (y - 0.04) * 1.4;
  const mz = z - 0.96;
  const distMouth = Math.sqrt(mx * mx + my * my + mz * mz);
  const mouthMask = 0.22 + 0.78 * smoothstep(0.065, 0.16, distMouth);

  // Bottom belly contact pad taper
  const bottomMask = smoothstep(-1.05, -0.72, y);

  // Extra fluff boost on cheeks and chest tuft
  const cheekDist = Math.min(
    Math.hypot(x + 0.56, y - 0.02, z - 0.68),
    Math.hypot(x - 0.56, y - 0.02, z - 0.68)
  );
  const cheekFluff = 1.0 + 0.22 * (1.0 - smoothstep(0.0, 0.42, cheekDist));

  return Math.max(0.0, Math.min(1.25, eyeMask * mouthMask * bottomMask * cheekFluff));
}

/**
 * Computes the biological grooming flow tangent vector on the blob surface.
 */
export function evaluateGroomFlow(x, y, z, nx, ny, nz) {
  let fx = x * 0.25;
  let fy = -0.85;
  let fz = (z - 0.15) * 0.25;

  const eyeCenters = [
    [-0.33, 0.17, 0.86],
    [0.33, 0.17, 0.86]
  ];
  for (let i = 0; i < 2; i++) {
    const [ex, ey, ez] = eyeCenters[i];
    const dx = x - ex;
    const dy = y - ey;
    const dz = z - ez;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
    if (d < 0.48) {
      const influence = (1.0 - d / 0.48) * 0.85;
      fx += (dx / d) * influence;
      fy += (dy / d) * influence * 0.6;
      fz += (dz / d) * influence * 0.3;
    }
  }

  const dotFN = fx * nx + fy * ny + fz * nz;
  let tx = fx - dotFN * nx;
  let ty = fy - dotFN * ny;
  let tz = fz - dotFN * nz;
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
  if (len > 1e-5) {
    tx /= len;
    ty /= len;
    tz /= len;
  } else {
    tx = 1.0;
    ty = 0.0;
    tz = 0.0;
  }
  return [tx, ty, tz];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Sculpt a unit sphere vertex into one of 6 selectable creature body shapes:
 * - 'mochi': Classic Mochi Pear with chubby cheeks, perky ears & stubby arms
 * - 'puffball': Round Dandelion Puffball with ultra-spherical silhouette
 * - 'bunny': Long-Eared Bunny with tall upright ears & cottontail puff
 * - 'kitty': Neko Cat Spirit with wide pointed feline ears & heart cheeks
 * - 'star': 5-Pointed Star-Puff Sprite with soft chubby star tips
 * - 'bean': Tall Totoro/Jellybean silhouette
 */
export function sculptBlobPosition(u, v, w, shapeStyle = 'mochi') {
  let x = u;
  let y = v;
  let z = w;

  if (shapeStyle === 'puffball') {
    // Ultra-round dandelion orb with subtle cheek puff and tiny nub ears
    const roundPuff = 1.06 + 0.08 * Math.exp(-Math.pow(y / 0.65, 2.0));
    x *= roundPuff;
    z *= roundPuff * 0.98;
    y *= 1.02;

    const leftEarDir = normalize3(-0.52, 0.84, 0.08);
    const rightEarDir = normalize3(0.52, 0.84, 0.08);
    const dotEar = Math.max(
      Math.max(0.0, u * leftEarDir[0] + v * leftEarDir[1] + w * leftEarDir[2]),
      Math.max(0.0, u * rightEarDir[0] + v * rightEarDir[1] + w * rightEarDir[2])
    );
    const earProfile = Math.pow(dotEar, 18.0) * 0.22;
    x += u * earProfile * 0.7;
    y += v * earProfile * 0.9;
    z += w * earProfile * 0.5;
  } else if (shapeStyle === 'bunny') {
    // Plush bunny body with tall sculpted rabbit ears and fluffy back cottontail
    const bellyWidth = 1.0 + 0.24 * Math.exp(-Math.pow((y + 0.26) / 0.52, 2.0));
    x *= bellyWidth;
    z *= (0.94 + 0.12 * Math.exp(-Math.pow((y + 0.22) / 0.6, 2.0)));
    y *= 0.95;

    const leftEarDir = normalize3(-0.34, 0.93, 0.04);
    const rightEarDir = normalize3(0.34, 0.93, 0.04);
    const dotLEar = Math.max(0.0, u * leftEarDir[0] + v * leftEarDir[1] + w * leftEarDir[2]);
    const dotREar = Math.max(0.0, u * rightEarDir[0] + v * rightEarDir[1] + w * rightEarDir[2]);
    const earProfile = Math.pow(Math.max(dotLEar, dotREar), 19.0) * 0.92;
    x += u * earProfile * 0.48;
    y += v * earProfile * 1.35;
    z += w * earProfile * 0.35;

    // Cute back bunny tail puff
    const tailDir = normalize3(0.0, -0.35, -0.93);
    const dotTail = Math.max(0.0, u * tailDir[0] + v * tailDir[1] + w * tailDir[2]);
    const tailProfile = Math.pow(dotTail, 16.0) * 0.28;
    z -= tailProfile;
  } else if (shapeStyle === 'kitty') {
    // Neko Cat Spirit: wide pointed cat ears + wide heart cheeks + swishing side paws
    const cheekWidth = 1.0 + 0.28 * Math.exp(-Math.pow((y + 0.06) / 0.42, 2.0));
    x *= cheekWidth;
    z *= 0.96 + 0.1 * Math.exp(-Math.pow((y + 0.15) / 0.55, 2.0));
    y *= 0.94;

    const leftEarDir = normalize3(-0.64, 0.76, 0.08);
    const rightEarDir = normalize3(0.64, 0.76, 0.08);
    const dotLEar = Math.max(0.0, u * leftEarDir[0] + v * leftEarDir[1] + w * leftEarDir[2]);
    const dotREar = Math.max(0.0, u * rightEarDir[0] + v * rightEarDir[1] + w * rightEarDir[2]);
    const earProfile = Math.pow(Math.max(dotLEar, dotREar), 12.0) * 0.58;
    x += u * earProfile * 0.95;
    y += v * earProfile * 1.15;
    z += w * earProfile * 0.45;
  } else if (shapeStyle === 'star') {
    // 5-Pointed Star-Puff Sprite in the XY silhouette plane
    const angle = Math.atan2(y, x) - Math.PI * 0.5;
    const xyRadius = Math.hypot(x, y);
    const starLobe = (0.5 + 0.5 * Math.cos(angle * 5.0)) * Math.pow(xyRadius, 1.4);
    const starScale = 1.0 + 0.26 * starLobe;
    x *= starScale * 1.04;
    y *= starScale * 1.02;
    z *= 0.96 + 0.12 * (1.0 - xyRadius * 0.5);
  } else if (shapeStyle === 'bean') {
    // Tall cozy Jellybean / Totoro silhouette
    const waist = 0.88 + 0.18 * Math.exp(-Math.pow((y + 0.32) / 0.58, 2.0));
    x *= waist;
    z *= waist * 0.96;
    y *= 1.18;

    const leftEarDir = normalize3(-0.42, 0.9, 0.05);
    const rightEarDir = normalize3(0.42, 0.9, 0.05);
    const dotEar = Math.max(
      Math.max(0.0, u * leftEarDir[0] + v * leftEarDir[1] + w * leftEarDir[2]),
      Math.max(0.0, u * rightEarDir[0] + v * rightEarDir[1] + w * rightEarDir[2])
    );
    const earProfile = Math.pow(dotEar, 18.0) * 0.36;
    x += u * earProfile * 0.6;
    y += v * earProfile * 1.1;
  } else {
    // Default 'mochi': Classic Mochi Pear silhouette
    const bellyWidth = 1.0 + 0.22 * Math.exp(-Math.pow((y + 0.24) / 0.55, 2.0));
    const cheekPuff = 1.0 + 0.14 * Math.exp(-Math.pow((y + 0.05) / 0.38, 2.0)) * Math.max(0, z);
    x *= bellyWidth * cheekPuff;
    z *= (0.94 + 0.12 * Math.exp(-Math.pow((y + 0.22) / 0.6, 2.0)));
    y *= 0.96;

    const leftEarDir = normalize3(-0.46, 0.86, 0.06);
    const rightEarDir = normalize3(0.46, 0.86, 0.06);
    const dotLEar = Math.max(0.0, u * leftEarDir[0] + v * leftEarDir[1] + w * leftEarDir[2]);
    const dotREar = Math.max(0.0, u * rightEarDir[0] + v * rightEarDir[1] + w * rightEarDir[2]);
    const earProfile = Math.pow(Math.max(dotLEar, dotREar), 14.0) * 0.44;
    x += u * earProfile * 0.75;
    y += v * earProfile * 1.15;
    z += w * earProfile * 0.55;
  }

  // Slightly flatten the base so Mochi-Puff sits cozily on the ground
  if (y < -0.55) {
    const t = (-0.55 - y) / 0.45;
    y = -0.55 - Math.tanh(t * 1.15) * 0.32;
  }

  // Cute stubby side nubbins (little arms)
  const leftArmDir = normalize3(-0.94, -0.08, 0.28);
  const rightArmDir = normalize3(0.94, -0.08, 0.28);
  const dotLArm = Math.max(0.0, u * leftArmDir[0] + v * leftArmDir[1] + w * leftArmDir[2]);
  const dotRArm = Math.max(0.0, u * rightArmDir[0] + v * rightArmDir[1] + w * rightArmDir[2]);
  const armProfile = Math.pow(Math.max(dotLArm, dotRArm), 18.0) * 0.24;
  x += u * armProfile * 1.1;
  y += v * armProfile * 0.6;
  z += w * armProfile * 0.9;

  // Subtle anatomical eye socket indentation so the glossy eyes sit nested inside the plush fur
  const lx = x + 0.33;
  const rx = x - 0.33;
  const ey = y - 0.17;
  const ez = z - 0.86;
  const dEye = Math.min(
    Math.sqrt(lx * lx + ey * ey + ez * ez),
    Math.sqrt(rx * rx + ey * ey + ez * ez)
  );
  if (dEye < 0.32) {
    const indent = (1.0 - smoothstep(0.0, 0.32, dEye)) * 0.065;
    z -= indent;
  }

  return [x, y, z];
}

function normalize3(x, y, z) {
  const l = Math.sqrt(x * x + y * y + z * z) || 1.0;
  return [x / l, y / l, z / l];
}

/**
 * Updates an existing organic blob geometry in-place for a given `shapeStyle` and `eyeSize`.
 */
export function updateOrganicBlobGeometry(geom, shapeStyle = 'mochi', eyeSize = 1.0) {
  const unitPositions = geom.userData.unitPositions;
  const posAttr = geom.attributes.position;
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    const u = unitPositions[i * 3];
    const v = unitPositions[i * 3 + 1];
    const w = unitPositions[i * 3 + 2];
    const [sx, sy, sz] = sculptBlobPosition(u, v, w, shapeStyle);
    posAttr.setXYZ(i, sx, sy, sz);
  }
  posAttr.needsUpdate = true;
  geom.computeVertexNormals();

  const normAttr = geom.attributes.normal;
  const maskAttr = geom.attributes.aFollicleMask;
  const groomAttr = geom.attributes.aGroomTangent;

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);

    maskAttr.setX(i, evaluateFollicleMask(x, y, z, eyeSize));
    const [tx, ty, tz] = evaluateGroomFlow(x, y, z, nx, ny, nz);
    groomAttr.setXYZ(i, tx, ty, tz);
  }

  maskAttr.needsUpdate = true;
  groomAttr.needsUpdate = true;
}

/**
 * Builds the continuous organic blob geometry with baked vertex attributes:
 * - `aFollicleMask`: float [0..1.25] controlling fur length & density mask
 * - `aGroomTangent`: vec3 biological fur flow direction
 */
export function createOrganicBlobGeometry(widthSegments = 96, heightSegments = 72, shapeStyle = 'mochi', eyeSize = 1.0) {
  const geom = new THREE.SphereGeometry(1.0, widthSegments, heightSegments);
  const posAttr = geom.attributes.position;
  const count = posAttr.count;

  const unitPositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    unitPositions[i * 3] = posAttr.getX(i);
    unitPositions[i * 3 + 1] = posAttr.getY(i);
    unitPositions[i * 3 + 2] = posAttr.getZ(i);
  }
  geom.userData.unitPositions = unitPositions;

  const follicleMaskArray = new Float32Array(count);
  const groomTangentArray = new Float32Array(count * 3);
  geom.setAttribute('aFollicleMask', new THREE.BufferAttribute(follicleMaskArray, 1));
  geom.setAttribute('aGroomTangent', new THREE.BufferAttribute(groomTangentArray, 3));

  updateOrganicBlobGeometry(geom, shapeStyle, eyeSize);

  return geom;
}

/**
 * Creates a procedural 3D musical note mesh (note head + stem + flag) for Mochi-Puff's singing aura.
 */
function createMusicalNoteMesh(colorHex) {
  const noteGroup = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });

  const headGeo = new THREE.SphereGeometry(0.042, 14, 10);
  headGeo.scale(1.25, 0.9, 0.6);
  const head = new THREE.Mesh(headGeo, mat);
  head.rotation.z = -0.35;
  noteGroup.add(head);

  const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8);
  const stem = new THREE.Mesh(stemGeo, mat);
  stem.position.set(0.038, 0.06, 0);
  noteGroup.add(stem);

  const flagGeo = new THREE.BoxGeometry(0.048, 0.024, 0.008);
  const flag = new THREE.Mesh(flagGeo, mat);
  flag.position.set(0.056, 0.11, 0);
  flag.rotation.z = -0.32;
  noteGroup.add(flag);

  return { group: noteGroup, material: mat };
}

/**
 * Creates the complete Stylized Blob Creature group ("Mochi-Puff")
 */
export function createBlobCreature() {
  const root = new THREE.Group();
  root.name = 'MochiPuffCreature';

  let currentShapeStyle = 'mochi';
  let currentEyeSize = 1.0;
  let currentMood = MOOD_PRESETS.happy;

  const bodyGeometry = createOrganicBlobGeometry(96, 72, currentShapeStyle, currentEyeSize);

  // Under-skin velvety material (visible at roots and around eyes/mouth)
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4a3248'),
    roughness: 0.78,
    metalness: 0.02
  });

  const bodyMesh = new THREE.Mesh(bodyGeometry, skinMaterial);
  bodyMesh.name = 'BlobBodyMesh';
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // Facial features container so eyes, blush, and nose move with head tilt
  const faceGroup = new THREE.Group();
  faceGroup.name = 'FacialFeatures';
  root.add(faceGroup);

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#120d1a'),
    roughness: 0.04,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 1.0
  });

  const irisMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#3d285c')
  });

  const highlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff')
  });

  const warmHighlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffe4f2')
  });

  const eyes = [];
  const eyeSides = [-1, 1];

  for (const side of eyeSides) {
    const eyePivot = new THREE.Group();
    eyePivot.position.set(side * 0.31, 0.16, 0.94);
    eyePivot.rotation.y = side * 0.22;
    eyePivot.rotation.x = -0.06;

    // Dark glossy cornea
    const eyeballGeo = new THREE.SphereGeometry(0.17, 32, 24);
    eyeballGeo.scale(0.96, 1.08, 0.68);
    const eyeball = new THREE.Mesh(eyeballGeo, eyeMaterial);
    eyePivot.add(eyeball);

    // Warm violet-amber lower iris crescent
    const irisGeo = new THREE.SphereGeometry(0.12, 24, 16);
    irisGeo.scale(0.92, 0.95, 0.38);
    const iris = new THREE.Mesh(irisGeo, irisMaterial);
    iris.position.set(0, -0.02, 0.086);
    eyePivot.add(iris);

    // Primary large anime catchlight (top-inner)
    const catchlightMainGeo = new THREE.SphereGeometry(0.045, 16, 12);
    catchlightMainGeo.scale(1.0, 1.18, 0.32);
    const catchlightMain = new THREE.Mesh(catchlightMainGeo, highlightMat);
    catchlightMain.position.set(-side * 0.042, 0.052, 0.112);
    eyePivot.add(catchlightMain);

    // Secondary lower rim catchlight
    const catchlightSubGeo = new THREE.SphereGeometry(0.023, 14, 10);
    catchlightSubGeo.scale(1.0, 1.0, 0.32);
    const catchlightSub = new THREE.Mesh(catchlightSubGeo, warmHighlightMat);
    catchlightSub.position.set(side * 0.048, -0.052, 0.11);
    eyePivot.add(catchlightSub);

    faceGroup.add(eyePivot);
    eyes.push({
      pivot: eyePivot,
      basePos: eyePivot.position.clone(),
      catchlightMain,
      catchlightSub,
      side
    });
  }

  // Rosy glowing blush ovals nestled right below the eyes on the plush cheeks
  const blushMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff5c93'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });

  for (const side of eyeSides) {
    const blushGeo = new THREE.SphereGeometry(0.12, 20, 16);
    blushGeo.scale(1.4, 0.75, 0.35);
    const blush = new THREE.Mesh(blushGeo, blushMat);
    blush.position.set(side * 0.49, 0.0, 0.96);
    blush.rotation.y = side * 0.34;
    blush.rotation.z = -side * 0.1;
    faceGroup.add(blush);
  }

  // Cute bright pink nose button + W-shaped cat smile positioned proudly on the muzzle surface
  const noseMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff94b8')
  });
  const noseGeo = new THREE.SphereGeometry(0.048, 18, 14);
  noseGeo.scale(1.3, 0.88, 0.75);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.075, 1.05);
  faceGroup.add(nose);

  // Cute W-mouth made from two torus arcs (visible when idle/silent)
  const closedMouthArcs = [];
  const mouthMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a102e') });
  for (const side of [-1, 1]) {
    const arcGeo = new THREE.TorusGeometry(0.046, 0.013, 10, 20, Math.PI * 0.92);
    const arc = new THREE.Mesh(arcGeo, mouthMat);
    arc.position.set(side * 0.043, 0.035, 1.045);
    arc.rotation.x = Math.PI + 0.15;
    arc.rotation.y = side * 0.14;
    faceGroup.add(arc);
    closedMouthArcs.push(arc);
  }

  // Animated 3D Open Singing Mouth Cavity + Cute Pink Tongue (driven by real-time formant lip-sync)
  const openMouthGroup = new THREE.Group();
  openMouthGroup.position.set(0, -0.012, 1.042);
  openMouthGroup.visible = false;

  const cavityGeo = new THREE.SphereGeometry(0.075, 24, 18);
  cavityGeo.scale(1.15, 1.0, 0.32);
  const cavityMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3d0b28') });
  const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
  openMouthGroup.add(cavityMesh);

  const tongueGeo = new THREE.SphereGeometry(0.048, 18, 14);
  tongueGeo.scale(1.12, 0.65, 0.35);
  const tongueMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6b9d') });
  const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
  tongueMesh.position.set(0, -0.024, 0.012);
  openMouthGroup.add(tongueMesh);

  faceGroup.add(openMouthGroup);

  // Floating 3D Musical Notes Ring (visible while Mochi-Puff sings)
  const noteColors = ['#ff9ec7', '#fde68a', '#7dd3fc', '#c4b5fd', '#6ee7b7', '#fda4af'];
  const singingNotes = [];
  const notesGroup = new THREE.Group();
  notesGroup.name = 'SingingMusicalNotes';
  root.add(notesGroup);

  for (let i = 0; i < 6; i++) {
    const noteObj = createMusicalNoteMesh(noteColors[i % noteColors.length]);
    notesGroup.add(noteObj.group);
    singingNotes.push({
      ...noteObj,
      phase: (i / 6) * Math.PI * 2,
      radius: 1.25 + (i % 2) * 0.22,
      speed: 1.15 + (i % 3) * 0.2
    });
  }

  // Animation & physics state for creature motion (coupled to GPGPU fur inertia)
  const animState = {
    time: 0,
    baseScale: 1.0,
    baseX: 0.0,
    baseY: 0.0,
    baseZ: 0.0,
    blinkTimer: 0,
    nextBlink: 2.8,
    boopImpulse: 0,
    boopPhase: 0,
    singMouthOpen: 0,
    singMouthRound: 0.5,
    singAmplitude: 0,
    isSinging: false,
    prevPosition: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    targetLook: new THREE.Vector2(0, 0),
    currentLook: new THREE.Vector2(0, 0)
  };

  // Spatial anchor position & viewer-facing orientation for AR plane placement
  const anchorPos = new THREE.Vector3(0, 0, 0);
  const targetAnchorPos = new THREE.Vector3(0, 0, 0);
  const startAnchorPos = new THREE.Vector3(0, 0, 0);
  let isPlaced = false;
  let isPlacing = false;
  let placeProgress = 1.0;
  let placeHopHeight = 0.0;
  let facingYaw = 0.0;
  let facingPitch = 0.0;
  let targetFacingYaw = 0.0;
  let targetFacingPitch = 0.0;
  let faceViewerHoldTimer = 0.0;

  function placeAt(targetWorldPos, normal, animate = true, cameraPos = null) {
    if (!targetWorldPos) return;
    isPlaced = true;
    const s = animState.baseScale;
    const targetCenterY = targetWorldPos.y + 0.94 * s;

    animState.targetLook.set(0, 0);
    animState.currentLook.set(0, 0);
    faceViewerHoldTimer = 1.4;

    if (cameraPos) {
      const dx = cameraPos.x - targetWorldPos.x;
      const dy = cameraPos.y - targetCenterY;
      const dz = cameraPos.z - targetWorldPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      targetFacingYaw = Math.atan2(dx, dz);
      targetFacingPitch = -Math.atan2(dy, horizDist) * 0.72;
      if (!animate) {
        facingYaw = targetFacingYaw;
        facingPitch = targetFacingPitch;
      }
    }

    if (animate) {
      startAnchorPos.copy(anchorPos);
      targetAnchorPos.set(targetWorldPos.x, targetCenterY, targetWorldPos.z);
      placeProgress = 0.0;
      isPlacing = true;
      placeHopHeight = Math.min(0.65, Math.max(0.18, startAnchorPos.distanceTo(targetAnchorPos) * 0.22));
      animState.boopImpulse = 0.85;
      animState.boopPhase = 0.0;
    } else {
      anchorPos.set(targetWorldPos.x, targetCenterY, targetWorldPos.z);
      targetAnchorPos.copy(anchorPos);
      isPlacing = false;
      placeProgress = 1.0;
    }
  }

  function resetPlacement(animate = true) {
    isPlaced = false;
    targetFacingYaw = 0.0;
    targetFacingPitch = 0.0;
    faceViewerHoldTimer = 0.0;
    animState.targetLook.set(0, 0);
    animState.currentLook.set(0, 0);
    const s = animState.baseScale;
    const ox = animState.baseX || 0.0;
    const oz = animState.baseZ || 0.0;
    const targetY = -0.94 + 0.94 * s;
    if (animate) {
      startAnchorPos.copy(anchorPos);
      targetAnchorPos.set(ox, targetY, oz);
      placeProgress = 0.0;
      isPlacing = true;
      placeHopHeight = Math.min(0.55, Math.max(0.18, startAnchorPos.distanceTo(targetAnchorPos) * 0.22));
      animState.boopImpulse = 0.85;
      animState.boopPhase = 0.0;
    } else {
      anchorPos.set(ox, targetY, oz);
      targetAnchorPos.set(ox, targetY, oz);
      startAnchorPos.set(ox, targetY, oz);
      facingYaw = 0.0;
      facingPitch = 0.0;
      isPlacing = false;
      placeProgress = 1.0;
      animState.boopImpulse = 0.0;
      animState.boopPhase = 0.0;
    }
  }

  function setEnvironmentScale(scale, offsetX = 0.0, offsetZ = 0.0) {
    const s = Number.isFinite(scale) && scale > 0 ? scale : 1.0;
    const ox = Number.isFinite(offsetX) ? offsetX : 0.0;
    const oz = Number.isFinite(offsetZ) ? offsetZ : 0.0;
    animState.baseScale = s;
    animState.baseX = ox;
    animState.baseY = -0.94 * (1.0 - s);
    animState.baseZ = oz;
    if (!isPlaced) {
      anchorPos.set(ox, -0.94 + 0.94 * s, oz);
      targetAnchorPos.copy(anchorPos);
      startAnchorPos.copy(anchorPos);
      facingYaw = 0.0;
      facingPitch = 0.0;
      targetFacingYaw = 0.0;
      targetFacingPitch = 0.0;
    }
  }

  function triggerBoop() {
    animState.boopImpulse = 1.0;
    animState.boopPhase = 0.0;
  }

  function setBodyShape(shapeStyle) {
    const preset = BODY_SHAPE_PRESETS[shapeStyle] || BODY_SHAPE_PRESETS.mochi;
    currentShapeStyle = preset.id;
    updateOrganicBlobGeometry(bodyGeometry, currentShapeStyle, currentEyeSize);
    faceGroup.position.set(0, preset.faceYOffset || 0.0, preset.faceZOffset || 0.0);
    return bodyGeometry;
  }

  function setEyeSize(eyeSize) {
    currentEyeSize = Math.max(0.45, Math.min(1.9, Number(eyeSize) || 1.0));
    updateOrganicBlobGeometry(bodyGeometry, currentShapeStyle, currentEyeSize);
    return bodyGeometry;
  }

  function setMood(moodId) {
    const mood = MOOD_PRESETS[moodId] || MOOD_PRESETS.happy;
    currentMood = mood;
    irisMaterial.color.set(mood.irisColor);
    blushMat.color.set(mood.blushColor);
    blushMat.opacity = mood.blushOpacity;
    for (const eye of eyes) {
      eye.catchlightMain.scale.set(
        1.0 * mood.catchlightScale,
        1.18 * mood.catchlightScale,
        0.32
      );
    }
    return mood;
  }

  function setSingingState(metrics) {
    if (!metrics) {
      animState.isSinging = false;
      animState.singMouthOpen = 0;
      animState.singAmplitude = 0;
      return;
    }
    animState.isSinging = Boolean(metrics.isSinging);
    animState.singMouthOpen = metrics.mouthOpen || 0;
    animState.singMouthRound = metrics.mouthRound ?? 0.5;
    animState.singAmplitude = metrics.amplitude || 0;
  }

  function update(dt, pointerNDC, cameraPos = null, isARMode = false) {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    animState.time += safeDt;

    if (faceViewerHoldTimer > 0) {
      faceViewerHoldTimer = Math.max(0, faceViewerHoldTimer - safeDt);
    }

    // Smooth eye/head tracking toward pointer (held centered on viewer right after placement)
    if (pointerNDC && faceViewerHoldTimer <= 0) {
      animState.targetLook.set(pointerNDC.x * 0.35, pointerNDC.y * 0.25);
    } else if (faceViewerHoldTimer > 0) {
      animState.targetLook.set(0, 0);
    }
    animState.currentLook.lerp(animState.targetLook, Math.min(1.0, safeDt * 7.5));

    // Breathing & happy idle bobbing + boop jump impulse
    if (animState.boopImpulse > 0.001) {
      animState.boopPhase += safeDt * 14.0;
      animState.boopImpulse *= Math.exp(-safeDt * 3.6);
    } else {
      animState.boopImpulse = 0.0;
    }

    // Parabolic placement leap towards target anchor plane
    let hop = 0.0;
    if (isPlacing) {
      placeProgress += safeDt * 3.4;
      if (placeProgress >= 1.0) {
        placeProgress = 1.0;
        isPlacing = false;
        anchorPos.copy(targetAnchorPos);
        triggerBoop();
      } else {
        const p = placeProgress;
        anchorPos.lerpVectors(startAnchorPos, targetAnchorPos, p);
        hop = Math.sin(p * Math.PI) * placeHopHeight;
      }
    }

    // When placed in AR mode, keep Mochi's front face oriented directly towards the viewer (camera)
    if ((isPlaced || isARMode) && cameraPos) {
      const dx = cameraPos.x - anchorPos.x;
      const dy = cameraPos.y - anchorPos.y;
      const dz = cameraPos.z - anchorPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      targetFacingYaw = Math.atan2(dx, dz);
      targetFacingPitch = -Math.atan2(dy, horizDist) * 0.72;
    } else if (!isPlaced) {
      targetFacingYaw = 0.0;
      targetFacingPitch = 0.0;
    }

    const yawDiff = Math.atan2(Math.sin(targetFacingYaw - facingYaw), Math.cos(targetFacingYaw - facingYaw));
    facingYaw += yawDiff * Math.min(1.0, safeDt * 12.0);
    facingPitch += (targetFacingPitch - facingPitch) * Math.min(1.0, safeDt * 12.0);

    const s = animState.baseScale;
    const moodBreathSpeed = currentMood.breathSpeed || 2.3;
    const moodBounceAmp = currentMood.bounceAmp || 1.0;

    const singBob = animState.isSinging
      ? Math.sin(animState.time * 7.2) * (0.04 + animState.singAmplitude * 0.09)
      : 0.0;
    const singSway = animState.isSinging
      ? Math.cos(animState.time * 3.6) * (0.055 + animState.singAmplitude * 0.06)
      : 0.0;

    const breath = Math.sin(animState.time * moodBreathSpeed) * (0.035 * moodBounceAmp) + singBob * 0.65;
    const bodyLookScale = (isPlaced || isARMode) ? (faceViewerHoldTimer > 0 ? 0.0 : 0.06) : 1.0;
    const swayX = (Math.sin(animState.time * 1.35) * (0.06 * moodBounceAmp) + singSway + animState.currentLook.x * 0.15 * bodyLookScale) * s;
    const jumpY =
      (Math.sin(animState.time * moodBreathSpeed) * (0.045 * moodBounceAmp) +
        Math.max(0, singBob) * 0.9 +
        Math.abs(Math.sin(animState.boopPhase)) * animState.boopImpulse * 0.32) *
        s;

    const squash =
      1.0 +
      breath +
      Math.cos(animState.boopPhase * 2.0) * animState.boopImpulse * 0.14;

    const prevX = root.position.x;
    const prevY = root.position.y;
    const prevZ = root.position.z;
    const prevRotZ = root.rotation.z;
    const prevRotY = root.rotation.y;

    root.position.set(
      anchorPos.x + swayX,
      anchorPos.y + jumpY + hop,
      anchorPos.z
    );
    root.scale.set((1.0 / Math.sqrt(squash)) * s, squash * s, (1.0 / Math.sqrt(squash)) * s);
    root.rotation.y = facingYaw + animState.currentLook.x * 0.38 * bodyLookScale + Math.sin(animState.time * 0.9) * (isPlaced ? 0.03 : 0.08);
    root.rotation.x = facingPitch - animState.currentLook.y * 0.22 * bodyLookScale + Math.cos(animState.time * 1.8) * (isPlaced ? 0.02 : 0.04) - (animState.isSinging ? animState.singMouthOpen * 0.08 : 0);
    root.rotation.z = -(swayX / s) * 0.35 + Math.sin(animState.boopPhase) * animState.boopImpulse * 0.18 + (animState.isSinging ? Math.sin(animState.time * 3.6) * 0.09 : 0);

    // Compute instantaneous creature velocity & angular velocity for GPGPU fur inertia
    animState.velocity.set(
      (root.position.x - prevX) / (safeDt * s),
      (root.position.y - prevY) / (safeDt * s),
      (root.position.z - prevZ) / (safeDt * s)
    );
    animState.angularVelocity.set(
      0,
      (root.rotation.y - prevRotY) / safeDt,
      (root.rotation.z - prevRotZ) / safeDt
    );

    // Expressive 3D Lip-Sync Mouth & Cheek Blush Animation
    const mouthOpen = animState.singMouthOpen;
    if (mouthOpen > 0.04) {
      openMouthGroup.visible = true;
      const widthScale = 0.65 + 0.55 * (1.0 - animState.singMouthRound * 0.45);
      const heightScale = Math.max(0.18, Math.min(1.55, mouthOpen * 1.45));
      openMouthGroup.scale.set(widthScale, heightScale, 1.0);
      tongueMesh.position.y = -0.022 + Math.sin(animState.time * 18.0) * 0.004;
      for (const arc of closedMouthArcs) {
        arc.visible = false;
      }
      blushMat.opacity = (currentMood.blushOpacity || 0.55) + Math.min(0.32, mouthOpen * 0.35);
    } else {
      openMouthGroup.visible = false;
      for (const arc of closedMouthArcs) {
        arc.visible = true;
      }
      blushMat.opacity = currentMood.blushOpacity || 0.55;
    }

    // Floating 3D Musical Notes Ring Animation
    for (let i = 0; i < singingNotes.length; i++) {
      const n = singingNotes[i];
      if (animState.isSinging) {
        const cycle = (animState.time * n.speed + n.phase) % (Math.PI * 2);
        const normLife = cycle / (Math.PI * 2);
        const angle = animState.time * 0.9 + n.phase;
        const r = n.radius + Math.sin(animState.time * 2.5 + i) * 0.12;
        n.group.position.set(
          Math.cos(angle) * r,
          -0.2 + normLife * 1.65,
          Math.sin(angle) * r * 0.75 + 0.25
        );
        n.group.rotation.y = Math.sin(animState.time * 3.0 + i) * 0.4;
        n.group.rotation.z = Math.cos(animState.time * 4.2 + i) * 0.22;
        const scalePulse = 0.85 + animState.singAmplitude * 0.55;
        n.group.scale.setScalar(scalePulse);
        const fade = Math.sin(normLife * Math.PI);
        n.material.opacity = fade * (0.55 + 0.4 * animState.singAmplitude);
      } else if (n.material.opacity > 0.005) {
        n.material.opacity *= Math.exp(-safeDt * 6.0);
        n.group.position.y += safeDt * 0.4;
      } else {
        n.material.opacity = 0.0;
      }
    }

    // Blinking, Mood Eyelid Expression & Eye Size Scaling
    animState.blinkTimer += safeDt;
    let blinkScaleY = currentMood.eyeLidScaleY || 1.0;
    if (animState.blinkTimer > animState.nextBlink) {
      const blinkProgress = (animState.blinkTimer - animState.nextBlink) / 0.16;
      if (blinkProgress < 1.0) {
        blinkScaleY *= Math.max(0.08, Math.abs(Math.cos(blinkProgress * Math.PI)));
      } else {
        animState.blinkTimer = 0;
        animState.nextBlink = 2.4 + Math.random() * 2.5;
      }
    }
    if (animState.boopImpulse > 0.25) {
      blinkScaleY = Math.min(blinkScaleY, 0.18);
    }

    const browTilt = currentMood.eyeBrowTilt || 0.0;
    for (const eye of eyes) {
      eye.pivot.scale.set(
        currentEyeSize,
        currentEyeSize * blinkScaleY,
        currentEyeSize
      );
      eye.pivot.rotation.z = -eye.side * browTilt;
      eye.catchlightMain.position.x = -eye.side * 0.042 + animState.currentLook.x * 0.028;
      eye.catchlightMain.position.y = 0.052 + animState.currentLook.y * 0.025;
    }
  }

  return {
    root,
    bodyMesh,
    bodyGeometry,
    skinMaterial,
    animState,
    setEnvironmentScale,
    setBodyShape,
    setEyeSize,
    setMood,
    triggerBoop,
    setSingingState,
    placeAt,
    resetPlacement,
    isPlaced: () => isPlaced,
    getAnchorPosition: () => anchorPos,
    update
  };
}
