// High-Quality Fur Shadow Map Pass & Interactive 3D Combing Brush Gizmo
// 1. Light-space 2048x2048 Depth Pass rendering the creature body, 64 volumetric fur shells,
//    and 60,000 instanced 3D hair strands into a dedicated shadow map texture (uFurShadowMap).
// 2. Soft 12-tap Poisson-disk PCF Ground Plane Shadow Receiver mesh beneath Mochi-Puff
//    that receives real-time cast shadows from individual fur tufts, ears, and body silhouette.
// 3. 3D Surface-Aligned Combing Brush Ring & Direction Gizmo for real-time interactive grooming feedback.

import * as THREE from 'three';

const BIAS_MATRIX = new THREE.Matrix4().set(
  0.5, 0.0, 0.0, 0.5,
  0.0, 0.5, 0.0, 0.5,
  0.0, 0.0, 0.5, 0.5,
  0.0, 0.0, 0.0, 1.0
);

const BODY_DEPTH_VERTEX_SHADER = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BODY_DEPTH_FRAGMENT_SHADER = /* glsl */ `
  vec4 packDepthToRGBA(const in float v) {
    vec4 r = vec4(fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0)));
    r.xyz -= r.yzw / 255.0;
    return r;
  }

  void main() {
    gl_FragColor = packDepthToRGBA(clamp(gl_FragCoord.z, 0.0, 1.0));
  }
`;

const GROUND_SHADOW_VERTEX_SHADER = /* glsl */ `
  uniform mat4 uFurShadowMatrix;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec4 vShadowCoord;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vShadowCoord = uFurShadowMatrix * worldPosition;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const GROUND_SHADOW_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uFurShadowMap;
  uniform float uGroundShadowStrength;
  uniform float uShadowSoftness;
  uniform float uShadowPassEnabled;
  uniform vec3 uShadowTintColor;
  uniform vec3 uCreatureCenter;
  uniform float uEnvScale;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec4 vShadowCoord;

  float unpackRGBAToDepth(const in vec4 v) {
    return dot(v, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
  }

  void main() {
    // Radial vignette fade so the ground plane blends invisibly into any backdrop
    vec2 centeredUV = (vUv - 0.5) * 2.0;
    float radialDist = length(centeredUV);
    float edgeFade = 1.0 - smoothstep(0.55, 0.98, radialDist);
    if (edgeFade <= 0.002) {
      discard;
    }

    // Analytical soft contact ambient occlusion directly beneath Mochi-Puff's base
    vec2 relXZ = (vWorldPos.xz - uCreatureCenter.xz) / max(0.15, uEnvScale);
    float footDist = length(relXZ * vec2(0.88, 1.02));
    float contactAO = exp(-footDist * footDist * 2.35) * 0.42;

    float castShadow = 0.0;
    if (uShadowPassEnabled > 0.5) {
      vec3 projCoords = vShadowCoord.xyz / max(1e-5, vShadowCoord.w);
      if (
        projCoords.x > 0.01 && projCoords.x < 0.99 &&
        projCoords.y > 0.01 && projCoords.y < 0.99 &&
        projCoords.z > 0.0 && projCoords.z < 0.995
      ) {
        // 12-tap Poisson-disk PCF kernel for plush, soft penumbra from fur tufts
        float texelSize = (1.0 / 2048.0) * (1.2 + uShadowSoftness * 2.6);
        float bias = 0.0028;

        vec2 poisson[12];
        poisson[0] = vec2(-0.326, -0.406);
        poisson[1] = vec2(-0.840, -0.074);
        poisson[2] = vec2(-0.696,  0.457);
        poisson[3] = vec2(-0.203,  0.621);
        poisson[4] = vec2( 0.962, -0.195);
        poisson[5] = vec2( 0.473, -0.480);
        poisson[6] = vec2( 0.519,  0.767);
        poisson[7] = vec2( 0.185, -0.893);
        poisson[8] = vec2( 0.507,  0.064);
        poisson[9] = vec2( 0.896,  0.412);
        poisson[10] = vec2(-0.322, -0.933);
        poisson[11] = vec2(-0.792, -0.598);

        float occ = 0.0;
        for (int i = 0; i < 12; i++) {
          vec4 packed = texture2D(uFurShadowMap, projCoords.xy + poisson[i] * texelSize);
          float closestZ = unpackRGBAToDepth(packed);
          // Background clear is vec4(1.0) -> depth ~ 1.0039
          if (closestZ < 0.998 && projCoords.z - bias > closestZ) {
            occ += 1.0;
          }
        }
        castShadow = (occ / 12.0) * 0.72;
      }
    }

    float combinedAlpha = clamp((max(castShadow, contactAO * 0.85) + contactAO * 0.35) * uGroundShadowStrength * edgeFade, 0.0, 0.85);
    if (combinedAlpha < 0.004) {
      discard;
    }

    gl_FragColor = vec4(uShadowTintColor, combinedAlpha);
  }
`;

export function createFurShadowPass(renderer, creature, furSystem, initialState = {}) {
  const SHADOW_MAP_RES = 2048;

  const furShadowRT = new THREE.WebGLRenderTarget(SHADOW_MAP_RES, SHADOW_MAP_RES, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false
  });

  const shadowCam = new THREE.OrthographicCamera(-1.95, 1.95, 1.95, -1.95, 0.25, 9.5);
  const shadowMatrix = new THREE.Matrix4();

  const bodyDepthMaterial = new THREE.ShaderMaterial({
    vertexShader: BODY_DEPTH_VERTEX_SHADER,
    fragmentShader: BODY_DEPTH_FRAGMENT_SHADER,
    side: THREE.FrontSide
  });

  // Ground Plane Shadow Receiver Mesh beneath Mochi-Puff
  const groundUniforms = {
    uFurShadowMap: { value: furShadowRT.texture },
    uFurShadowMatrix: { value: shadowMatrix },
    uGroundShadowStrength: { value: initialState.groundShadowStrength ?? 0.78 },
    uShadowSoftness: { value: initialState.shadowSoftness ?? 1.15 },
    uShadowPassEnabled: { value: (initialState.shadowPassEnabled ?? true) ? 1.0 : 0.0 },
    uShadowTintColor: { value: new THREE.Color('#0c0820') },
    uCreatureCenter: { value: new THREE.Vector3(0, -0.94, 0) },
    uEnvScale: { value: 1.0 }
  };

  const groundGeometry = new THREE.PlaneGeometry(6.8, 6.8, 1, 1);
  groundGeometry.rotateX(-Math.PI * 0.5);

  const groundMaterial = new THREE.ShaderMaterial({
    vertexShader: GROUND_SHADOW_VERTEX_SHADER,
    fragmentShader: GROUND_SHADOW_FRAGMENT_SHADER,
    uniforms: groundUniforms,
    transparent: true,
    depthWrite: false
  });

  const groundShadowMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundShadowMesh.name = 'FurGroundShadowReceiver';
  groundShadowMesh.position.set(0.0, -0.942, 0.0);
  groundShadowMesh.renderOrder = 0;

  // Bind shadow texture & matrix into the shared fur uniforms
  const u = furSystem.sharedUniforms;
  u.uFurShadowMap.value = furShadowRT.texture;
  u.uFurShadowMatrix.value = shadowMatrix;
  u.uShadowPassEnabled.value = (initialState.shadowPassEnabled ?? true) ? 1.0 : 0.0;
  u.uSelfShadowStrength.value = initialState.selfShadowStrength ?? 0.75;
  u.uShadowSoftness.value = initialState.shadowSoftness ?? 1.15;

  // Interactive 3D Combing Brush Ring & Direction Gizmo on Mochi-Puff's surface
  const brushGizmoGroup = new THREE.Group();
  brushGizmoGroup.name = 'InteractiveCombingBrushGizmo';
  brushGizmoGroup.visible = false;

  const ringGeom = new THREE.RingGeometry(0.92, 1.0, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#f472b6'),
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.renderOrder = 25;
  brushGizmoGroup.add(ringMesh);

  // Inner direction arrow indicator showing real-time combing stroke direction
  const arrowPoints = [
    new THREE.Vector3(0, -0.35, 0.01),
    new THREE.Vector3(0, 0.55, 0.01),
    new THREE.Vector3(-0.22, 0.25, 0.01),
    new THREE.Vector3(0, 0.55, 0.01),
    new THREE.Vector3(0.22, 0.25, 0.01)
  ];
  const arrowGeom = new THREE.BufferGeometry().setFromPoints(arrowPoints);
  const arrowMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#38bdf8'),
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false
  });
  const arrowLine = new THREE.Line(arrowGeom, arrowMat);
  arrowLine.renderOrder = 26;
  brushGizmoGroup.add(arrowLine);

  const shadowScene = new THREE.Scene();
  const savedClearColor = new THREE.Color();
  const lightDirTmp = new THREE.Vector3();
  const targetTmp = new THREE.Vector3();
  const upVec = new THREE.Vector3(0, 1, 0);
  const gizmoQuat = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);

  function updateFromState(state) {
    const enabled = Boolean(state.shadowPassEnabled ?? true);
    const selfStrength = state.selfShadowStrength ?? 0.75;
    const groundStrength = state.groundShadowStrength ?? 0.78;
    const softness = state.shadowSoftness ?? 1.15;

    u.uShadowPassEnabled.value = enabled ? 1.0 : 0.0;
    u.uSelfShadowStrength.value = selfStrength;
    u.uShadowSoftness.value = softness;

    groundUniforms.uShadowPassEnabled.value = enabled ? 1.0 : 0.0;
    groundUniforms.uGroundShadowStrength.value = groundStrength;
    groundUniforms.uShadowSoftness.value = softness;
    groundShadowMesh.visible = groundStrength > 0.01;

    // Tint ground shadow subtly to match environment mood
    if (state.environment === 'meadow') {
      groundUniforms.uShadowTintColor.value.set('#0e2419');
    } else if (state.environment === 'highrise') {
      groundUniforms.uShadowTintColor.value.set('#140d26');
    } else {
      groundUniforms.uShadowTintColor.value.set('#0c0820');
    }
  }

  function updateBrushGizmo({
    visible,
    worldPoint,
    worldNormal,
    brushRadius = 0.42,
    brushMode = 'comb',
    strokeVelocity,
    envScale = 1.0
  }) {
    if (!visible || !worldPoint || !worldNormal) {
      brushGizmoGroup.visible = false;
      return;
    }
    brushGizmoGroup.visible = true;
    const radiusWorld = Math.max(0.08, brushRadius * envScale * 0.78);
    brushGizmoGroup.position.copy(worldPoint).addScaledVector(worldNormal, 0.04 * envScale);
    brushGizmoGroup.scale.setScalar(radiusWorld);

    gizmoQuat.setFromUnitVectors(zAxis, worldNormal);
    brushGizmoGroup.quaternion.copy(gizmoQuat);

    // Color-code brush gizmo by brush mode
    if (brushMode === 'comb') {
      ringMat.color.set('#f472b6');
      arrowMat.color.set('#38bdf8');
    } else if (brushMode === 'part') {
      ringMat.color.set('#fbbf24');
      arrowMat.color.set('#fde047');
    } else if (brushMode === 'swirl') {
      ringMat.color.set('#a855f7');
      arrowMat.color.set('#e879f9');
    } else {
      ringMat.color.set('#34d399');
      arrowMat.color.set('#6ee7b7');
    }

    if (strokeVelocity && strokeVelocity.lengthSq() > 0.01) {
      arrowLine.visible = true;
    } else {
      arrowLine.visible = false;
    }
  }

  /**
   * Executes the high-resolution light-space depth pass for Mochi-Puff's body,
   * 64 volumetric fur shells, and 60,000 3D hair strands.
   */
  function renderShadowPass({ keyLightDir, anchorPos, envScale = 1.0, shadowPassEnabled = true }) {
    // Update ground shadow plane position & scale to sit right beneath Mochi-Puff's feet
    const footY = anchorPos ? anchorPos.y - 0.942 * envScale : -0.942;
    const centerX = anchorPos ? anchorPos.x : 0.0;
    const centerZ = anchorPos ? anchorPos.z : 0.0;

    groundShadowMesh.position.set(centerX, footY, centerZ);
    groundShadowMesh.scale.setScalar(envScale);
    groundUniforms.uCreatureCenter.value.set(centerX, footY, centerZ);
    groundUniforms.uEnvScale.value = envScale;

    if (!shadowPassEnabled) {
      return;
    }

    targetTmp.set(centerX, footY + 0.85 * envScale, centerZ);
    lightDirTmp.copy(keyLightDir).normalize();
    if (lightDirTmp.y < 0.22) {
      lightDirTmp.y = 0.22;
      lightDirTmp.normalize();
    }

    const frustumHalf = 1.92 * envScale;
    shadowCam.left = -frustumHalf;
    shadowCam.right = frustumHalf;
    shadowCam.top = frustumHalf;
    shadowCam.bottom = -frustumHalf;
    shadowCam.near = 0.2 * envScale;
    shadowCam.far = 8.5 * envScale;
    shadowCam.position.copy(targetTmp).addScaledVector(lightDirTmp, 3.6 * envScale);
    shadowCam.up.copy(upVec);
    shadowCam.lookAt(targetTmp);
    shadowCam.updateMatrixWorld(true);
    shadowCam.updateProjectionMatrix();

    // Update shadowMatrix = BIAS * Proj * View
    shadowMatrix.copy(BIAS_MATRIX);
    shadowMatrix.multiply(shadowCam.projectionMatrix);
    shadowMatrix.multiply(shadowCam.matrixWorldInverse);

    // Temporarily swap body, shell, and strand materials to light-space depth shaders
    const origBodyMat = creature.bodyMesh.material;
    const origShellMat = furSystem.shellMesh.material;
    const origStrandMat = furSystem.strandMesh.material;

    // Hide facial decals/eyes during depth pass so only body + fur cast shadows
    const prevEyesVis = creature.eyeGroup ? creature.eyeGroup.visible : true;
    if (creature.eyeGroup) creature.eyeGroup.visible = false;

    creature.bodyMesh.material = bodyDepthMaterial;
    furSystem.shellMesh.material = furSystem.shellDepthMaterial;
    furSystem.strandMesh.material = furSystem.strandDepthMaterial;

    const prevRenderTarget = renderer.getRenderTarget();
    renderer.getClearColor(savedClearColor);
    const savedClearAlpha = renderer.getClearAlpha();

    renderer.setRenderTarget(furShadowRT);
    renderer.setClearColor(0xffffff, 1.0);
    renderer.clear(true, true, false);

    // Render creature root (body + shells + 60k strands) from the Key Light's perspective
    const origParent = creature.root.parent;
    shadowScene.add(creature.root);
    renderer.render(shadowScene, shadowCam);
    if (origParent) {
      origParent.add(creature.root);
    }

    // Restore materials & render target
    creature.bodyMesh.material = origBodyMat;
    furSystem.shellMesh.material = origShellMat;
    furSystem.strandMesh.material = origStrandMat;
    if (creature.eyeGroup) creature.eyeGroup.visible = prevEyesVis;

    renderer.setClearColor(savedClearColor, savedClearAlpha);
    renderer.setRenderTarget(prevRenderTarget);
  }

  return {
    furShadowRT,
    groundShadowMesh,
    brushGizmoGroup,
    updateFromState,
    updateBrushGizmo,
    renderShadowPass
  };
}
