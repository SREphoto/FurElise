// Interactive dat.GUI / lil-gui Inspector Panel for Marschner Fur Styles,
// Mood & Shape/Eye Size Tools, Point Light & Moving/Rainbow Lighting,
// Gaussian Bloom Post-Processing, Atmospheric Dust & Specular Sparkles,
// Procedural Wind Force Field, and Lyra / Gemini TTS Singing.

import GUI from 'lil-gui';
import { kelvinToHex } from './furSystem.js';

export const WIND_FIELD_PRESETS = {
  breeze: {
    name: 'Gentle Breeze',
    windStrength: 0.95,
    windAngle: 28,
    windElevation: 0.12,
    windTurbulence: 0.75,
    windGustFrequency: 1.05
  },
  meadow: {
    name: 'Gusty Meadow',
    windStrength: 1.65,
    windAngle: -45,
    windElevation: 0.18,
    windTurbulence: 1.15,
    windGustFrequency: 1.65
  },
  vortex: {
    name: 'Vortex Swirl',
    windStrength: 1.95,
    windAngle: 95,
    windElevation: 0.35,
    windTurbulence: 1.85,
    windGustFrequency: 2.35
  },
  gale: {
    name: 'Storm Gale',
    windStrength: 2.5,
    windAngle: -115,
    windElevation: -0.1,
    windTurbulence: 1.55,
    windGustFrequency: 3.1
  },
  calm: {
    name: 'Calm Studio',
    windStrength: 0.18,
    windAngle: 0,
    windElevation: 0.05,
    windTurbulence: 0.3,
    windGustFrequency: 0.6
  }
};

export function createShaderGUIPanel(state, onChange, actions = {}) {
  const host = document.createElement('div');
  host.id = 'dat-gui-container';
  host.className = 'dat-gui-container';
  host.setAttribute('aria-label', 'Fur Shader, Marschner Style, Mood, Shape, Light, Bloom & Wind GUI Inspector');
  document.body.appendChild(host);

  const gui = new GUI({
    container: host,
    title: 'Fur Shader & Physics GUI',
    width: 288
  });

  const controllers = {};

  // =========================================================================
  // FOLDER 0A: INTERACTIVE COMBING BRUSH, MIC REACTIVITY & SHADOW MAP PASS
  // =========================================================================
  const brushMicShadowFolder = gui.addFolder('Combing Brush, Mic & Shadow Map');

  controllers.brushMode = brushMicShadowFolder
    .add(state, 'brushMode', {
      'Comb & Align': 'comb',
      'Part & Feather': 'part',
      'Vortex Swirl': 'swirl',
      'Ruffle & Volumize': 'fluff'
    })
    .name('Brush Mode')
    .onChange((v) => onChange('brushMode', v));

  controllers.brushRadius = brushMicShadowFolder
    .add(state, 'brushRadius', 0.16, 0.85, 0.02)
    .name('Brush Radius')
    .onChange((v) => onChange('brushRadius', Number(v)));

  controllers.brushStrength = brushMicShadowFolder
    .add(state, 'brushStrength', 0.2, 2.5, 0.05)
    .name('Comb Strength')
    .onChange((v) => onChange('brushStrength', Number(v)));

  controllers.combPersistence = brushMicShadowFolder
    .add(state, 'combPersistence', 0.0, 1.0, 0.02)
    .name('Comb Persistence')
    .onChange((v) => onChange('combPersistence', Number(v)));

  controllers.micReactivityMode = brushMicShadowFolder
    .add(state, 'micReactivityMode', {
      'Vibrate + Color Pulse': 'vibrateColor',
      'Fur Vibration Only': 'vibrateOnly',
      'Pitch Spectrum Synesthesia': 'spectrumRainbow'
    })
    .name('Mic Audio Mode')
    .onChange((v) => onChange('micReactivityMode', v));

  controllers.micSensitivity = brushMicShadowFolder
    .add(state, 'micSensitivity', 0.25, 3.0, 0.05)
    .name('Mic Sensitivity')
    .onChange((v) => onChange('micSensitivity', Number(v)));

  controllers.shadowPassEnabled = brushMicShadowFolder
    .add(state, 'shadowPassEnabled')
    .name('Fur Shadow Pass')
    .onChange((v) => onChange('shadowPassEnabled', Boolean(v)));

  controllers.selfShadowStrength = brushMicShadowFolder
    .add(state, 'selfShadowStrength', 0.0, 1.2, 0.02)
    .name('Fur Self-Shadow')
    .onChange((v) => onChange('selfShadowStrength', Number(v)));

  controllers.groundShadowStrength = brushMicShadowFolder
    .add(state, 'groundShadowStrength', 0.0, 1.2, 0.02)
    .name('Ground Cast Shadow')
    .onChange((v) => onChange('groundShadowStrength', Number(v)));

  controllers.shadowSoftness = brushMicShadowFolder
    .add(state, 'shadowSoftness', 0.2, 2.5, 0.05)
    .name('Penumbra Softness')
    .onChange((v) => onChange('shadowSoftness', Number(v)));

  const extraGuiActions = {
    resetGroom: () => onChange('resetGroom', true),
    toggleMic: () => onChange('toggleMic', true)
  };

  controllers.resetGroomBtn = brushMicShadowFolder
    .add(extraGuiActions, 'resetGroom')
    .name('↺ Reset Combed Fur');

  controllers.micBtn = brushMicShadowFolder
    .add(extraGuiActions, 'toggleMic')
    .name('🎤 Toggle Mic Audio');

  brushMicShadowFolder.open();

  // =========================================================================
  // FOLDER 0: MARSCHNER STYLE, MOOD, BODY SHAPE & EYE SIZE
  // =========================================================================
  const styleMoodFolder = gui.addFolder('Marschner Style, Mood & Shape');

  controllers.marschnerStyle = styleMoodFolder
    .add(state, 'marschnerStyle', {
      'Fluffy Cloud': 'fluffy',
      'Sleek Satin Mink': 'sleek',
      'Spiky Anime Tuft': 'spiky',
      'Curly Poodle Wool': 'curly',
      'Velvet Peach Fuzz': 'velvet',
      'Crystal Glint Fiber': 'crystal'
    })
    .name('Fur Style (Marschner)')
    .onChange((v) => onChange('marschnerStyle', v));

  controllers.mood = styleMoodFolder
    .add(state, 'mood', {
      '😊 Happy Joy': 'happy',
      '💖 Smitten Love': 'love',
      '⚡ Hyper Excited': 'excited',
      '😴 Dreamy Sleepy': 'sleepy',
      '😤 Spicy Grumpy': 'grumpy',
      '🌿 Mystic Zen': 'zen'
    })
    .name('Creature Mood')
    .onChange((v) => onChange('mood', v));

  controllers.bodyShape = styleMoodFolder
    .add(state, 'bodyShape', {
      'Mochi Pear': 'mochi',
      'Round Puffball': 'puffball',
      'Long-Eared Bunny': 'bunny',
      'Neko Cat Spirit': 'kitty',
      'Star-Puff Sprite': 'star',
      'Tall Jellybean': 'bean'
    })
    .name('Body Shape Style')
    .onChange((v) => onChange('bodyShape', v));

  controllers.eyeSize = styleMoodFolder
    .add(state, 'eyeSize', 0.5, 1.75, 0.02)
    .name('Eye Size')
    .onChange((v) => onChange('eyeSize', Number(v)));

  controllers.cuticleShiftR = styleMoodFolder
    .add(state, 'cuticleShiftR', -0.45, 0.1, 0.01)
    .name('Cuticle Shift (R)')
    .onChange((v) => onChange('cuticleShiftR', Number(v)));

  controllers.cuticleShiftTRT = styleMoodFolder
    .add(state, 'cuticleShiftTRT', 0.02, 0.55, 0.01)
    .name('Cuticle Shift (TRT)')
    .onChange((v) => onChange('cuticleShiftTRT', Number(v)));

  controllers.glintStrength = styleMoodFolder
    .add(state, 'glintStrength', 0.2, 2.5, 0.05)
    .name('TRT Caustic Glint')
    .onChange((v) => onChange('glintStrength', Number(v)));

  controllers.transmissionTT = styleMoodFolder
    .add(state, 'transmissionTT', 0.2, 2.2, 0.05)
    .name('Forward Scatter (TT)')
    .onChange((v) => onChange('transmissionTT', Number(v)));

  styleMoodFolder.open();

  // =========================================================================
  // FOLDER 1: POINT LIGHT, MOVING LIGHTS & SLOW RAINBOW (FUR SHADER)
  // =========================================================================
  const pointFolder = gui.addFolder('Point Light & Rainbow Motion');

  controllers.lightPreset = pointFolder
    .add(state, 'lightPreset', {
      'Static Studio Rig': 'static',
      'Slow Rainbow Prism': 'rainbow',
      'Golden Orbit Sweep': 'goldenSweep',
      'Aurora Dual-Wave': 'auroraDance',
      'Cyber Neon Halo': 'cyberNeon',
      'Sunset Horizon Drift': 'sunsetBreeze'
    })
    .name('Lighting Style')
    .onChange((v) => onChange('lightPreset', v));

  controllers.lightAnimSpeed = pointFolder
    .add(state, 'lightAnimSpeed', 0.15, 2.5, 0.05)
    .name('Motion/Rainbow Spd')
    .onChange((v) => onChange('lightAnimSpeed', Number(v)));

  controllers.pointLightEnabled = pointFolder
    .add(state, 'pointLightEnabled')
    .name('Enable Point Light')
    .onChange((v) => onChange('pointLightEnabled', Boolean(v)));

  controllers.pointLightIntensity = pointFolder
    .add(state, 'pointLightIntensity', 0.0, 4.0, 0.05)
    .name('Light Intensity')
    .onChange((v) => onChange('pointLightIntensity', Number(v)));

  controllers.pointLightKelvin = pointFolder
    .add(state, 'pointLightKelvin', 1800, 12000, 50)
    .name('Color Temp (K)')
    .onChange((k) => {
      const hex = kelvinToHex(k);
      state.pointLightColor = hex;
      if (controllers.pointLightColor) {
        controllers.pointLightColor.updateDisplay();
      }
      onChange('pointLightKelvin', Number(k));
    });

  controllers.pointLightColor = pointFolder
    .addColor(state, 'pointLightColor')
    .name('Kelvin RGB Tint')
    .onChange((hex) => onChange('pointLightColor', hex));

  controllers.pointLightX = pointFolder
    .add(state, 'pointLightX', -4.0, 4.0, 0.05)
    .name('Position X')
    .onChange((v) => onChange('pointLightX', Number(v)));

  controllers.pointLightY = pointFolder
    .add(state, 'pointLightY', -2.0, 4.0, 0.05)
    .name('Position Y')
    .onChange((v) => onChange('pointLightY', Number(v)));

  controllers.pointLightZ = pointFolder
    .add(state, 'pointLightZ', -4.0, 4.0, 0.05)
    .name('Position Z')
    .onChange((v) => onChange('pointLightZ', Number(v)));

  controllers.pointLightDistance = pointFolder
    .add(state, 'pointLightDistance', 1.5, 16.0, 0.25)
    .name('Falloff Range')
    .onChange((v) => onChange('pointLightDistance', Number(v)));

  controllers.pointLightShowHelper = pointFolder
    .add(state, 'pointLightShowHelper')
    .name('Show 3D Light Orb')
    .onChange((v) => onChange('pointLightShowHelper', Boolean(v)));

  controllers.pointLightOrbit = pointFolder
    .add(state, 'pointLightOrbit')
    .name('Auto-Orbit Light')
    .onChange((v) => onChange('pointLightOrbit', Boolean(v)));

  pointFolder.open();

  // =========================================================================
  // FOLDER 2: ATMOSPHERIC DUST & SPECULAR AIR SPARKLES
  // =========================================================================
  const airFolder = gui.addFolder('Air Dust & Specular Sparkles');

  controllers.airDustEnabled = airFolder
    .add(state, 'airDustEnabled')
    .name('Enable Air Dust')
    .onChange((v) => onChange('airDustEnabled', Boolean(v)));

  controllers.airDustStyle = airFolder
    .add(state, 'airDustStyle', {
      'Specular Prism Sparkles': 'specular',
      'Golden Sun Dust Motes': 'gold',
      'Sakura Dew Shimmer': 'sakura',
      'Bioluminescent Fireflies': 'firefly'
    })
    .name('Particle Style')
    .onChange((v) => onChange('airDustStyle', v));

  controllers.airDustDensity = airFolder
    .add(state, 'airDustDensity', 0.05, 1.0, 0.05)
    .name('Dust Density')
    .onChange((v) => onChange('airDustDensity', Number(v)));

  controllers.airDustSparkle = airFolder
    .add(state, 'airDustSparkle', 0.0, 2.5, 0.05)
    .name('Specular Glint')
    .onChange((v) => onChange('airDustSparkle', Number(v)));

  controllers.airDustSize = airFolder
    .add(state, 'airDustSize', 0.4, 2.2, 0.05)
    .name('Bokeh Mote Size')
    .onChange((v) => onChange('airDustSize', Number(v)));

  airFolder.open();

  // =========================================================================
  // FOLDER 3: GAUSSIAN BLOOM POST-PROCESSING PASS
  // =========================================================================
  const bloomFolder = gui.addFolder('Gaussian Bloom Post-Pass');

  controllers.bloomEnabled = bloomFolder
    .add(state, 'bloomEnabled')
    .name('Enable Gaussian Bloom')
    .onChange((v) => onChange('bloomEnabled', Boolean(v)));

  controllers.bloomStrength = bloomFolder
    .add(state, 'bloomStrength', 0.0, 2.2, 0.02)
    .name('Bloom Strength')
    .onChange((v) => onChange('bloomStrength', Number(v)));

  controllers.bloomRadius = bloomFolder
    .add(state, 'bloomRadius', 0.2, 2.8, 0.05)
    .name('Gaussian Radius (σ)')
    .onChange((v) => onChange('bloomRadius', Number(v)));

  controllers.bloomThreshold = bloomFolder
    .add(state, 'bloomThreshold', 0.1, 1.2, 0.02)
    .name('Highlight Threshold')
    .onChange((v) => onChange('bloomThreshold', Number(v)));

  controllers.bloomSoftKnee = bloomFolder
    .add(state, 'bloomSoftKnee', 0.05, 0.85, 0.02)
    .name('Soft Knee')
    .onChange((v) => onChange('bloomSoftKnee', Number(v)));

  controllers.natureHighlightBoost = bloomFolder
    .add(state, 'natureHighlightBoost', 0.8, 2.2, 0.05)
    .name('Nature Glow Boost')
    .onChange((v) => onChange('natureHighlightBoost', Number(v)));

  // =========================================================================
  // FOLDER 4: PROCEDURAL WIND FORCE FIELD (GPU VELOCITY BUFFERS)
  // =========================================================================
  const windFolder = gui.addFolder('Procedural Wind Force Field');

  controllers.windPreset = windFolder
    .add(state, 'windPreset', {
      'Gentle Breeze': 'breeze',
      'Gusty Meadow': 'meadow',
      'Vortex Swirl': 'vortex',
      'Storm Gale': 'gale',
      'Calm Studio': 'calm'
    })
    .name('Wind Field Preset')
    .onChange((presetKey) => {
      const p = WIND_FIELD_PRESETS[presetKey];
      if (p) {
        state.windStrength = p.windStrength;
        state.windAngle = p.windAngle;
        state.windElevation = p.windElevation;
        state.windTurbulence = p.windTurbulence;
        state.windGustFrequency = p.windGustFrequency;
        syncGUI();
        onChange('windPreset', presetKey);
      }
    });

  controllers.windStrength = windFolder
    .add(state, 'windStrength', 0.0, 3.0, 0.05)
    .name('Wind Force')
    .onChange((v) => onChange('windStrength', Number(v)));

  controllers.windAngle = windFolder
    .add(state, 'windAngle', -180, 180, 1)
    .name('Wind Direction (°)')
    .onChange((v) => onChange('windAngle', Number(v)));

  controllers.windElevation = windFolder
    .add(state, 'windElevation', -0.8, 0.8, 0.02)
    .name('Vertical Lift')
    .onChange((v) => onChange('windElevation', Number(v)));

  controllers.windTurbulence = windFolder
    .add(state, 'windTurbulence', 0.0, 2.0, 0.05)
    .name('Curl Turbulence')
    .onChange((v) => onChange('windTurbulence', Number(v)));

  controllers.windGustFrequency = windFolder
    .add(state, 'windGustFrequency', 0.2, 4.0, 0.05)
    .name('Gust Speed (Hz)')
    .onChange((v) => onChange('windGustFrequency', Number(v)));

  // =========================================================================
  // FOLDER 5: LYRA & GEMINI TTS SINGING PERFORMANCE
  // =========================================================================
  const singFolder = gui.addFolder('Lyra & Gemini TTS Singing');

  controllers.songPreset = singFolder
    .add(state, 'songPreset', {
      'Sakura Mochi Lullaby': 'sakura',
      'Starlight Lyra Serenade': 'starlight',
      'Fluffy Boop Bop': 'pop',
      'Breezy Meadow Waltz': 'wind'
    })
    .name('Song Selection')
    .onChange((v) => onChange('songPreset', v));

  controllers.vocalMode = singFolder
    .add(state, 'vocalMode', {
      'Lyra + Gemini TTS': 'hybrid',
      'Lyra Formant Choir': 'lyra-synth',
      'Gemini TTS Solo': 'tts-solo'
    })
    .name('Singing Engine')
    .onChange((v) => onChange('vocalMode', v));

  controllers.voiceName = singFolder
    .add(state, 'voiceName', {
      'Puck (Playful)': 'Puck',
      'Kore (Sweet)': 'Kore',
      'Zephyr (Airy)': 'Zephyr',
      'Fenrir (Warm)': 'Fenrir',
      'Charon (Deep)': 'Charon'
    })
    .name('TTS Voice')
    .onChange((v) => onChange('voiceName', v));

  controllers.harpVolume = singFolder
    .add(state, 'harpVolume', 0.0, 1.0, 0.05)
    .name('Lyra Harp Vol')
    .onChange((v) => onChange('harpVolume', Number(v)));

  controllers.pitchShift = singFolder
    .add(state, 'pitchShift', 0.75, 1.35, 0.05)
    .name('Vocal Pitch')
    .onChange((v) => onChange('pitchShift', Number(v)));

  const guiActions = {
    toggleSing: () => {
      if (typeof actions.onToggleSing === 'function') {
        actions.onToggleSing();
      }
    }
  };

  controllers.singBtn = singFolder
    .add(guiActions, 'toggleSing')
    .name('♪ Sing / Stop Song');

  function syncGUI() {
    Object.values(controllers).forEach((ctrl) => {
      if (ctrl && typeof ctrl.updateDisplay === 'function') {
        ctrl.updateDisplay();
      }
    });
  }

  function syncPositionOnly() {
    if (controllers.pointLightX) controllers.pointLightX.updateDisplay();
    if (controllers.pointLightY) controllers.pointLightY.updateDisplay();
    if (controllers.pointLightZ) controllers.pointLightZ.updateDisplay();
    if (controllers.pointLightColor) controllers.pointLightColor.updateDisplay();
    if (controllers.lightAngle) controllers.lightAngle.updateDisplay();
  }

  function setSingingButtonState(isSinging) {
    if (controllers.singBtn) {
      controllers.singBtn.name(isSinging ? '⏹ Stop Singing' : '♪ Sing Selected Song');
    }
  }

  function setMicButtonState(isActive) {
    if (controllers.micBtn) {
      controllers.micBtn.name(isActive ? '⏹ Stop Mic Analyzer' : '🎤 Enable Mic Audio');
    }
  }

  return {
    gui,
    host,
    syncGUI,
    syncPositionOnly,
    setSingingButtonState,
    setMicButtonState
  };
}
