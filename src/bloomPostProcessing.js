// Multi-Scale Separable Gaussian Bloom Post-Processing Pipeline for 3D GPU Fur
// Uses Three.js EffectComposer + RenderPass + Custom Separable Gaussian Bloom ShaderPass
// Specifically calibrated to enhance Marschner R/TRT specular glints and forward TT rim scattering
// on fur strands, with an automatic solar-scattering boost in the 'meadow' / 'nature' scene mode.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

export const ENVIRONMENT_BLOOM_PRESETS = {
  studio: {
    bloomEnabled: true,
    bloomStrength: 0.46,
    bloomRadius: 1.05,
    bloomThreshold: 0.72,
    bloomSoftKnee: 0.32,
    natureHighlightBoost: 1.0
  },
  meadow: {
    bloomEnabled: true,
    bloomStrength: 0.86,
    bloomRadius: 1.42,
    bloomThreshold: 0.56,
    bloomSoftKnee: 0.42,
    natureHighlightBoost: 1.45
  },
  highrise: {
    bloomEnabled: true,
    bloomStrength: 0.58,
    bloomRadius: 1.18,
    bloomThreshold: 0.66,
    bloomSoftKnee: 0.36,
    natureHighlightBoost: 1.1
  },
  ar: {
    bloomEnabled: true,
    bloomStrength: 0.44,
    bloomRadius: 1.0,
    bloomThreshold: 0.74,
    bloomSoftKnee: 0.3,
    natureHighlightBoost: 1.0
  }
};

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// 1. Soft-Knee Luminance & Fur Rim-Highlight Extraction Shader
const BRIGHT_PASS_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uSoftKnee;
  uniform float uNatureBoost;
  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    vec3 col = max(vec3(0.0), texel.rgb);

    // Perceptual luminance + peak channel sensitivity for colored fur tips
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float peak = max(col.r, max(col.g, col.b));
    float brightness = mix(luma, peak, 0.42);

    // Smooth cubic soft-knee curve so individual hair strands never shimmer or alias
    float knee = max(1e-4, uThreshold * uSoftKnee);
    float soft = brightness - uThreshold + knee;
    soft = clamp(soft, 0.0, 2.0 * knee);
    soft = (soft * soft) / (4.0 * knee + 1e-5);

    float contribution = max(soft, brightness - uThreshold) / max(brightness, 1e-4);
    vec3 extracted = col * clamp(contribution, 0.0, 1.0);

    // In 'nature' / 'meadow' mode, subtly warm and amplify golden solar rim scatter on fur tips
    vec3 natureTint = mix(vec3(1.0), vec3(1.06, 1.02, 0.94), clamp((uNatureBoost - 1.0) * 1.5, 0.0, 1.0));
    extracted *= uNatureBoost * natureTint;

    gl_FragColor = vec4(extracted, texel.a);
  }
`;

// 2. Separable 9-Tap Analytical Gaussian Blur Shader (Horizontal & Vertical Passes)
const GAUSSIAN_BLUR_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection; // (1/width, 0) or (0, 1/height)
  uniform float uSigma;
  uniform float uRadiusMultiplier;
  varying vec2 vUv;

  void main() {
    float sigma = max(0.35, uSigma);
    float twoSigmaSq = 2.0 * sigma * sigma;
    vec2 stepVec = uDirection * uRadiusMultiplier;

    vec3 accum = vec3(0.0);
    float weightSum = 0.0;

    // 9-tap symmetric Gaussian filter (-4 .. +4)
    for (int i = -4; i <= 4; i++) {
      float fi = float(i);
      float w = exp(-(fi * fi) / twoSigmaSq);
      vec2 sampleUv = clamp(vUv + stepVec * fi, vec2(0.001), vec2(0.999));
      accum += texture2D(tDiffuse, sampleUv).rgb * w;
      weightSum += w;
    }

    gl_FragColor = vec4(accum / max(weightSum, 1e-5), 1.0);
  }
`;

// 3. Multi-Scale Gaussian Bloom Composite Shader (Preserves Alpha for Studio/AR & Applies Filmic Highlight Shoulder)
const BLOOM_COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloomFine;
  uniform sampler2D tBloomWide;
  uniform float uBloomStrength;
  uniform float uNatureBoost;
  varying vec2 vUv;

  void main() {
    vec4 baseTexel = texture2D(tScene, vUv);
    vec3 fineGlow = texture2D(tBloomFine, vUv).rgb;
    vec3 wideGlow = texture2D(tBloomWide, vUv).rgb;

    // Combine tight strand-level specular glow (fine) with wide atmospheric halo (wide)
    float wideMix = clamp(0.45 + (uNatureBoost - 1.0) * 0.35, 0.45, 0.72);
    vec3 combinedBloom = fineGlow * 0.68 + wideGlow * wideMix;

    vec3 bloomContribution = combinedBloom * uBloomStrength;

    // Soft highlight shoulder to prevent harsh white blowouts while keeping fur plush and luminous
    vec3 softShoulderBloom = bloomContribution / (vec3(1.0) + bloomContribution * 0.32);
    vec3 finalRgb = baseTexel.rgb + softShoulderBloom;

    gl_FragColor = vec4(finalRgb, baseTexel.a);
  }
`;

export class GaussianBloomPass extends Pass {
  constructor(resolution, params = {}) {
    super();

    this.resolution = new THREE.Vector2(
      resolution ? resolution.x : window.innerWidth,
      resolution ? resolution.y : window.innerHeight
    );

    this.strength = params.strength ?? 0.46;
    this.radius = params.radius ?? 1.05;
    this.threshold = params.threshold ?? 0.72;
    this.softKnee = params.softKnee ?? 0.32;
    this.natureBoost = params.natureBoost ?? 1.0;

    const rtParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false
    };

    const w2 = Math.max(1, Math.round(this.resolution.x * 0.5));
    const h2 = Math.max(1, Math.round(this.resolution.y * 0.5));
    const w4 = Math.max(1, Math.round(this.resolution.x * 0.25));
    const h4 = Math.max(1, Math.round(this.resolution.y * 0.25));

    this.rtBright = new THREE.WebGLRenderTarget(w2, h2, rtParams);
    this.rtBlurH1 = new THREE.WebGLRenderTarget(w2, h2, rtParams);
    this.rtBlurV1 = new THREE.WebGLRenderTarget(w2, h2, rtParams);
    this.rtBlurH2 = new THREE.WebGLRenderTarget(w4, h4, rtParams);
    this.rtBlurV2 = new THREE.WebGLRenderTarget(w4, h4, rtParams);

    this.brightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: this.threshold },
        uSoftKnee: { value: this.softKnee },
        uNatureBoost: { value: this.natureBoost }
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: BRIGHT_PASS_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1.0 / w2, 0.0) },
        uSigma: { value: 1.8 },
        uRadiusMultiplier: { value: 1.0 }
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: GAUSSIAN_BLUR_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloomFine: { value: this.rtBlurV1.texture },
        tBloomWide: { value: this.rtBlurV2.texture },
        uBloomStrength: { value: this.strength },
        uNatureBoost: { value: this.natureBoost }
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: BLOOM_COMPOSITE_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.fsQuad = new FullScreenQuad(null);
  }

  setSize(width, height) {
    this.resolution.set(width, height);
    const w2 = Math.max(1, Math.round(width * 0.5));
    const h2 = Math.max(1, Math.round(height * 0.5));
    const w4 = Math.max(1, Math.round(width * 0.25));
    const h4 = Math.max(1, Math.round(height * 0.25));

    this.rtBright.setSize(w2, h2);
    this.rtBlurH1.setSize(w2, h2);
    this.rtBlurV1.setSize(w2, h2);
    this.rtBlurH2.setSize(w4, h4);
    this.rtBlurV2.setSize(w4, h4);
  }

  render(renderer, writeBuffer, readBuffer) {
    const w2 = this.rtBright.width;
    const h2 = this.rtBright.height;
    const w4 = this.rtBlurH2.width;
    const h4 = this.rtBlurH2.height;

    const sigma = Math.max(0.4, this.radius * 1.65);
    const radiusMult = Math.max(0.35, this.radius);

    // 1. Extract soft-knee bright fur highlights at half-res
    this.brightMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.brightMaterial.uniforms.uThreshold.value = this.threshold;
    this.brightMaterial.uniforms.uSoftKnee.value = this.softKnee;
    this.brightMaterial.uniforms.uNatureBoost.value = this.natureBoost;
    this.fsQuad.material = this.brightMaterial;
    renderer.setRenderTarget(this.rtBright);
    this.fsQuad.render(renderer);

    // 2. Fine Separable Gaussian Blur (Half-Resolution Horizontal + Vertical)
    this.blurMaterial.uniforms.uSigma.value = sigma;
    this.blurMaterial.uniforms.uRadiusMultiplier.value = radiusMult;

    this.blurMaterial.uniforms.tDiffuse.value = this.rtBright.texture;
    this.blurMaterial.uniforms.uDirection.value.set(1.0 / w2, 0.0);
    this.fsQuad.material = this.blurMaterial;
    renderer.setRenderTarget(this.rtBlurH1);
    this.fsQuad.render(renderer);

    this.blurMaterial.uniforms.tDiffuse.value = this.rtBlurH1.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0.0, 1.0 / h2);
    renderer.setRenderTarget(this.rtBlurV1);
    this.fsQuad.render(renderer);

    // 3. Wide Separable Gaussian Halo (Quarter-Resolution Horizontal + Vertical)
    this.blurMaterial.uniforms.uSigma.value = sigma * 1.25;
    this.blurMaterial.uniforms.uRadiusMultiplier.value = radiusMult * 1.45;

    this.blurMaterial.uniforms.tDiffuse.value = this.rtBlurV1.texture;
    this.blurMaterial.uniforms.uDirection.value.set(1.0 / w4, 0.0);
    renderer.setRenderTarget(this.rtBlurH2);
    this.fsQuad.render(renderer);

    this.blurMaterial.uniforms.tDiffuse.value = this.rtBlurH2.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0.0, 1.0 / h4);
    renderer.setRenderTarget(this.rtBlurV2);
    this.fsQuad.render(renderer);

    // 4. Composite multi-scale Gaussian bloom onto scene buffer (preserving alpha)
    this.compositeMaterial.uniforms.tScene.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloomFine.value = this.rtBlurV1.texture;
    this.compositeMaterial.uniforms.tBloomWide.value = this.rtBlurV2.texture;
    this.compositeMaterial.uniforms.uBloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.uNatureBoost.value = this.natureBoost;
    this.fsQuad.material = this.compositeMaterial;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }

  dispose() {
    this.rtBright.dispose();
    this.rtBlurH1.dispose();
    this.rtBlurV1.dispose();
    this.rtBlurH2.dispose();
    this.rtBlurV2.dispose();
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.fsQuad.dispose();
  }
}

export function createBloomPostProcessor(renderer, scene, camera, initialState = {}) {
  const pixelRatio = renderer.getPixelRatio();
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Use HalfFloat multisample / alpha-capable render target so tone-mapping and AR alpha work cleanly
  const composerTarget = new THREE.WebGLRenderTarget(
    Math.max(1, Math.round(width * pixelRatio)),
    Math.max(1, Math.round(height * pixelRatio)),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    }
  );

  const composer = new EffectComposer(renderer, composerTarget);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0.0;
  composer.addPass(renderPass);

  const bloomPass = new GaussianBloomPass(new THREE.Vector2(width * pixelRatio, height * pixelRatio), {
    strength: initialState.bloomStrength ?? 0.46,
    radius: initialState.bloomRadius ?? 1.05,
    threshold: initialState.bloomThreshold ?? 0.72,
    softKnee: initialState.bloomSoftKnee ?? 0.32,
    natureBoost: initialState.natureHighlightBoost ?? 1.0
  });
  composer.addPass(bloomPass);

  let enabled = initialState.bloomEnabled !== undefined ? Boolean(initialState.bloomEnabled) : true;

  function updateFromState(state) {
    enabled = Boolean(state.bloomEnabled);
    bloomPass.enabled = enabled;
    bloomPass.strength = Number(state.bloomStrength ?? 0.46);
    bloomPass.radius = Number(state.bloomRadius ?? 1.05);
    bloomPass.threshold = Number(state.bloomThreshold ?? 0.72);
    bloomPass.softKnee = Number(state.bloomSoftKnee ?? 0.32);
    bloomPass.natureBoost = Number(state.natureHighlightBoost ?? 1.0);
  }

  function resize(w, h, dpr) {
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloomPass.setSize(w * dpr, h * dpr);
  }

  function render() {
    if (enabled && bloomPass.strength > 0.005) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  return {
    composer,
    renderPass,
    bloomPass,
    updateFromState,
    resize,
    render,
    isEnabled: () => enabled
  };
}
