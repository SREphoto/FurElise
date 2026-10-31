// Web Audio API Real-Time Microphone & Ambient Music Analyzer
// Drives rhythmic fur strand vibration, beat-synced wave ripples, and
// frequency-mapped root/tip fur color modulation.

import * as THREE from 'three';

export const MIC_REACTIVITY_MODES = {
  vibrateColor: {
    id: 'vibrateColor',
    name: 'Vibrate + Color Pulse'
  },
  vibrateOnly: {
    id: 'vibrateOnly',
    name: 'Fur Vibration Only'
  },
  spectrumRainbow: {
    id: 'spectrumRainbow',
    name: 'Pitch Spectrum Synesthesia'
  }
};

export function createMicAudioAnalyzer({ onStatusChange } = {}) {
  let audioCtx = null;
  let analyser = null;
  let mediaStream = null;
  let sourceNode = null;
  let freqData = null;
  let timeData = null;

  let isMicActive = false;
  let isSimBeatActive = false;
  let simTime = 0.0;

  // Smoothed zero-GC audio metrics
  const metrics = {
    active: false,
    bass: 0.0,
    mid: 0.0,
    treble: 0.0,
    volume: 0.0,
    centroid: 0.5,
    beatPulse: 0.0,
    colorMix: 0.0,
    bassColor: new THREE.Color('#6d28d9'),
    trebleColor: new THREE.Color('#f472b6')
  };

  let rollingEnergy = 0.08;
  let beatHoldTimer = 0.0;

  function notify(statusText, isLive) {
    if (typeof onStatusChange === 'function') {
      onStatusChange({
        statusText,
        isLive: Boolean(isLive),
        isSimBeat: isSimBeatActive
      });
    }
  }

  async function startMicrophone() {
    stopMicrophone();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      isSimBeatActive = true;
      notify('Mic API unavailable · Ambient Beat Synth Active', true);
      return true;
    }

    notify('Requesting microphone access...', false);
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true
          },
          video: false
        });
      } catch (_inner) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.76;

      sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      mediaStream = stream;
      isMicActive = true;
      isSimBeatActive = false;
      notify('Live Mic Active · Speak, clap, or play music!', true);
      return true;
    } catch (_err) {
      // Automatically engage built-in ambient rhythm generator if mic permission is declined
      isMicActive = false;
      isSimBeatActive = true;
      notify('Mic permission declined · Demo Music Pulse Active', true);
      return true;
    }
  }

  function stopMicrophone() {
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch (_e) {
        // Ignore disconnect error
      }
      sourceNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    isMicActive = false;
    isSimBeatActive = false;
    metrics.active = false;
    metrics.bass = 0.0;
    metrics.mid = 0.0;
    metrics.treble = 0.0;
    metrics.volume = 0.0;
    metrics.beatPulse = 0.0;
    metrics.colorMix = 0.0;
    notify('Mic Off · Click to enable ambient sound reactivity', false);
  }

  function toggleMicrophone() {
    if (isMicActive || isSimBeatActive) {
      stopMicrophone();
      return false;
    }
    startMicrophone();
    return true;
  }

  function update(dt, state) {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    const sensitivity = Math.max(0.2, Math.min(4.0, Number(state.micSensitivity ?? 1.4)));
    const mode = state.micReactivityMode || 'vibrateColor';

    let rawBass = 0.0;
    let rawMid = 0.0;
    let rawTreble = 0.0;
    let rawRms = 0.0;
    let weightedBinSum = 0.0;
    let totalBinMag = 0.001;

    if (isMicActive && analyser && freqData && timeData) {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const binCount = freqData.length; // 256 bins (~93 Hz per bin at 48kHz)
      // Bass: bins 1..4 (~45 - 380 Hz)
      for (let i = 1; i <= 4; i++) {
        rawBass += freqData[i] / 255.0;
      }
      rawBass /= 4.0;

      // Mid: bins 5..24 (~450 - 2200 Hz)
      for (let i = 5; i <= 24; i++) {
        rawMid += freqData[i] / 255.0;
      }
      rawMid /= 20.0;

      // Treble: bins 25..96 (~2300 - 9000 Hz)
      for (let i = 25; i <= 96; i++) {
        rawTreble += freqData[i] / 255.0;
      }
      rawTreble /= 72.0;

      // Spectral centroid for pitch-to-color synesthesia
      for (let i = 1; i < 96; i++) {
        const mag = freqData[i] / 255.0;
        weightedBinSum += i * mag;
        totalBinMag += mag;
      }

      // Time-domain RMS amplitude
      let sqSum = 0.0;
      for (let i = 0; i < timeData.length; i++) {
        const sample = (timeData[i] - 128.0) / 128.0;
        sqSum += sample * sample;
      }
      rawRms = Math.sqrt(sqSum / timeData.length);
    } else if (isSimBeatActive) {
      // Built-in rhythmic ambient synth envelope when testing without physical mic
      simTime += safeDt;
      const kickPhase = (simTime * 2.1) % 1.0;
      const snarePhase = ((simTime * 2.1) + 0.5) % 1.0;
      rawBass = Math.pow(Math.max(0.0, 1.0 - kickPhase * 3.2), 2.0) * 0.82;
      rawMid = (0.35 + 0.35 * Math.sin(simTime * 6.4) * Math.cos(simTime * 4.1)) * 0.65;
      rawTreble = (Math.pow(Math.max(0.0, 1.0 - snarePhase * 4.0), 2.0) * 0.6 + 0.25 * Math.abs(Math.sin(simTime * 16.0)));
      rawRms = (rawBass * 0.5 + rawMid * 0.3 + rawTreble * 0.2);
      weightedBinSum = (0.3 + 0.28 * Math.sin(simTime * 1.4)) * 32.0;
      totalBinMag = 1.0;
    } else {
      metrics.active = false;
      metrics.bass *= Math.exp(-safeDt * 10.0);
      metrics.mid *= Math.exp(-safeDt * 10.0);
      metrics.treble *= Math.exp(-safeDt * 10.0);
      metrics.volume *= Math.exp(-safeDt * 10.0);
      metrics.beatPulse *= Math.exp(-safeDt * 8.0);
      metrics.colorMix *= Math.exp(-safeDt * 8.0);
      return metrics;
    }

    metrics.active = true;

    const scaledBass = Math.min(2.2, rawBass * sensitivity * 1.35);
    const scaledMid = Math.min(2.2, rawMid * sensitivity * 1.45);
    const scaledTreble = Math.min(2.2, rawTreble * sensitivity * 1.75);
    const scaledVol = Math.min(2.0, Math.max(rawRms * sensitivity * 2.6, (scaledBass + scaledMid) * 0.45));

    // Smooth attack / decay
    const smoothRate = Math.min(1.0, safeDt * 16.0);
    metrics.bass += (scaledBass - metrics.bass) * smoothRate;
    metrics.mid += (scaledMid - metrics.mid) * smoothRate;
    metrics.treble += (scaledTreble - metrics.treble) * smoothRate;
    metrics.volume += (scaledVol - metrics.volume) * smoothRate;

    const normCentroid = Math.max(0.0, Math.min(1.0, (weightedBinSum / totalBinMag) / 36.0));
    metrics.centroid += (normCentroid - metrics.centroid) * Math.min(1.0, safeDt * 10.0);

    // Onset / beat detection
    const instEnergy = scaledBass * 0.65 + scaledMid * 0.35;
    rollingEnergy = rollingEnergy * 0.94 + instEnergy * 0.06;
    if (beatHoldTimer > 0) {
      beatHoldTimer -= safeDt;
    }
    if (instEnergy > rollingEnergy * 1.38 && instEnergy > 0.18 && beatHoldTimer <= 0) {
      metrics.beatPulse = Math.min(1.6, instEnergy * 1.25);
      beatHoldTimer = 0.16;
    } else {
      metrics.beatPulse *= Math.exp(-safeDt * 7.5);
    }

    // Compute rhythmic fur color shift based on reactivity mode
    if (mode === 'vibrateOnly') {
      metrics.colorMix *= Math.exp(-safeDt * 10.0);
    } else if (mode === 'spectrumRainbow') {
      const targetMix = Math.min(0.95, metrics.volume * 0.9 + metrics.beatPulse * 0.35);
      metrics.colorMix += (targetMix - metrics.colorMix) * Math.min(1.0, safeDt * 12.0);
      const baseHue = (metrics.centroid * 0.85 + performance.now() * 0.00008) % 1.0;
      const tipHue = (baseHue + 0.28 + metrics.treble * 0.18) % 1.0;
      metrics.bassColor.setHSL(baseHue, 0.88, 0.38 + metrics.bass * 0.15);
      metrics.trebleColor.setHSL(tipHue, 0.95, 0.66 + metrics.treble * 0.12);
    } else {
      // 'vibrateColor': Rhythmic bass/treble color pulse around warm magenta, electric cyan, and gold
      const targetMix = Math.min(0.88, metrics.volume * 0.78 + metrics.beatPulse * 0.42);
      metrics.colorMix += (targetMix - metrics.colorMix) * Math.min(1.0, safeDt * 12.0);
      const rootHue = (0.76 - metrics.bass * 0.18 + metrics.centroid * 0.25 + 1.0) % 1.0;
      const tipHue = (0.92 + metrics.treble * 0.35 + metrics.mid * 0.18) % 1.0;
      metrics.bassColor.setHSL(rootHue, 0.86, 0.36 + Math.min(0.22, metrics.bass * 0.18));
      metrics.trebleColor.setHSL(tipHue, 0.95, 0.68 + Math.min(0.18, metrics.treble * 0.14));
    }

    return metrics;
  }

  return {
    startMicrophone,
    stopMicrophone,
    toggleMicrophone,
    isActive: () => isMicActive || isSimBeatActive,
    isLiveMic: () => isMicActive,
    update,
    getMetrics: () => metrics
  };
}
