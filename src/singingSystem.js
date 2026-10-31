// Lyra Harp & Gemini 3.8 TTS Singing Engine for Mochi-Puff
// Combines server-side @google/genai (gemini-3.8-flash-tts & gemini-3.8-flash)
// with a polyphonic Web Audio "Lyra" plucked harp + 3-formant singing synthesizer
// and real-time AnalyserNode lip-sync metrics.

export const SONG_PRESETS = {
  sakura: {
    id: 'sakura',
    title: 'Sakura Mochi Lullaby',
    lyrics:
      'La la la, soft sakura petals drift in the breeze! <breath> Mochi-Puff hums a sweet lullaby under the glowing trees! <laugh>',
    style:
      'Sweet, melodic, high-pitched cute creature singing a gentle lullaby with musical cadence and warm vibrato',
    tempoBpm: 104,
    notes: [
      { midi: 72, dur: 1.0, vowel: 'la' },
      { midi: 74, dur: 0.5, vowel: 'la' },
      { midi: 76, dur: 1.0, vowel: 'ah' },
      { midi: 79, dur: 1.5, vowel: 'oh' },
      { midi: 81, dur: 1.0, vowel: 'ee' },
      { midi: 79, dur: 0.5, vowel: 'la' },
      { midi: 76, dur: 1.0, vowel: 'ah' },
      { midi: 74, dur: 1.5, vowel: 'oo' },
      { midi: 72, dur: 1.0, vowel: 'la' },
      { midi: 76, dur: 1.0, vowel: 'ee' },
      { midi: 79, dur: 1.0, vowel: 'ah' },
      { midi: 84, dur: 1.5, vowel: 'oh' },
      { midi: 81, dur: 0.5, vowel: 'la' },
      { midi: 79, dur: 1.0, vowel: 'ah' },
      { midi: 76, dur: 1.0, vowel: 'ee' },
      { midi: 72, dur: 2.0, vowel: 'oh' }
    ]
  },
  starlight: {
    id: 'starlight',
    title: 'Starlight Lyra Serenade',
    lyrics:
      'Twinkle, twinkle, golden starlight shining from above! <breath> Mochi-Puff is singing softly, sending fluffy love!',
    style:
      'Dreamy, angelic, expressive musical singing voice with sparkling lyrical phrasing',
    tempoBpm: 96,
    notes: [
      { midi: 69, dur: 1.0, vowel: 'oh' },
      { midi: 76, dur: 1.0, vowel: 'ah' },
      { midi: 76, dur: 1.0, vowel: 'la' },
      { midi: 81, dur: 1.5, vowel: 'ee' },
      { midi: 79, dur: 0.5, vowel: 'ah' },
      { midi: 76, dur: 1.0, vowel: 'oh' },
      { midi: 74, dur: 1.5, vowel: 'oo' },
      { midi: 72, dur: 1.0, vowel: 'la' },
      { midi: 74, dur: 1.0, vowel: 'ah' },
      { midi: 76, dur: 1.0, vowel: 'ee' },
      { midi: 72, dur: 1.0, vowel: 'oh' },
      { midi: 69, dur: 2.0, vowel: 'ah' }
    ]
  },
  pop: {
    id: 'pop',
    title: 'Fluffy Boop Bop',
    lyrics:
      'Boop-bop, wiggle and hop! <laugh> Shake my fluffy coat, never gonna stop! La-la-la-la Mochi pop!',
    style:
      'Energetic, bubbly, joyful upbeat pop singing creature with rhythmic bounce and giggles',
    tempoBpm: 132,
    notes: [
      { midi: 72, dur: 0.5, vowel: 'oo' },
      { midi: 76, dur: 0.5, vowel: 'ah' },
      { midi: 79, dur: 0.5, vowel: 'ee' },
      { midi: 84, dur: 1.0, vowel: 'oh' },
      { midi: 81, dur: 0.5, vowel: 'la' },
      { midi: 79, dur: 0.5, vowel: 'la' },
      { midi: 76, dur: 0.5, vowel: 'ah' },
      { midi: 79, dur: 1.0, vowel: 'ee' },
      { midi: 74, dur: 0.5, vowel: 'la' },
      { midi: 77, dur: 0.5, vowel: 'la' },
      { midi: 81, dur: 0.5, vowel: 'ah' },
      { midi: 79, dur: 1.0, vowel: 'oh' },
      { midi: 76, dur: 0.5, vowel: 'ee' },
      { midi: 74, dur: 0.5, vowel: 'ah' },
      { midi: 72, dur: 1.5, vowel: 'oh' }
    ]
  },
  wind: {
    id: 'wind',
    title: 'Breezy Meadow Waltz',
    lyrics:
      'Swaying in the summer wind, dancing through the sky! <breath> Watch my sixty thousand strands of velvet fur fly high! <laugh>',
    style:
      'Soaring, lyrical, joyful waltz singing voice with expressive breath and flowing cadence',
    tempoBpm: 116,
    notes: [
      { midi: 67, dur: 1.0, vowel: 'ah' },
      { midi: 71, dur: 0.5, vowel: 'la' },
      { midi: 74, dur: 0.5, vowel: 'la' },
      { midi: 79, dur: 1.5, vowel: 'oh' },
      { midi: 78, dur: 0.5, vowel: 'ee' },
      { midi: 79, dur: 1.0, vowel: 'ah' },
      { midi: 83, dur: 1.5, vowel: 'oo' },
      { midi: 81, dur: 1.0, vowel: 'la' },
      { midi: 79, dur: 0.5, vowel: 'ah' },
      { midi: 74, dur: 1.0, vowel: 'ee' },
      { midi: 71, dur: 1.0, vowel: 'oh' },
      { midi: 67, dur: 2.0, vowel: 'ah' }
    ]
  }
};

// Vowel Formant Frequencies (F1, F2, F3 in Hz) and Mouth Rounding [0..1]
const VOWEL_FORMANTS = {
  ah: { f1: 820, f2: 1280, f3: 2750, round: 0.25 },
  oh: { f1: 520, f2: 920, f3: 2550, round: 0.85 },
  oo: { f1: 360, f2: 780, f3: 2450, round: 0.95 },
  ee: { f1: 320, f2: 2350, f3: 3100, round: 0.1 },
  la: { f1: 720, f2: 1450, f3: 2700, round: 0.35 }
};

function midiToFreq(midi, pitchShift = 1.0) {
  return 440.0 * Math.pow(2.0, (midi - 69) / 12.0) * pitchShift;
}

export function createSingingSystem({ onStatusChange } = {}) {
  let audioCtx = null;
  let masterGain = null;
  let analyser = null;
  let timeDomainBuf = null;
  let freqDomainBuf = null;

  let isSinging = false;
  let isLoadingTTS = false;
  let activeSong = SONG_PRESETS.sakura;
  let scheduledTimers = [];
  let activeNodes = [];
  let currentAudioElement = null;
  let mediaElementSource = null;

  let currentVowel = 'ah';
  let currentPitchNorm = 0.5;
  let currentLyricText = '';
  let smoothMouthOpen = 0.0;
  let smoothMouthRound = 0.4;
  let smoothAmplitude = 0.0;

  // Cache for Gemini TTS audio per (lyrics + voiceName + style) so re-playing is instant
  const ttsAudioCache = new Map();

  function notifyStatus(statusText, active = isSinging, lyric = currentLyricText) {
    if (typeof onStatusChange === 'function') {
      onStatusChange({
        statusText,
        isSinging: active,
        isLoading: isLoadingTTS,
        lyric,
        songTitle: activeSong?.title || 'Sakura Mochi Lullaby'
      });
    }
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.85;

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      timeDomainBuf = new Uint8Array(analyser.fftSize);
      freqDomainBuf = new Uint8Array(analyser.frequencyBinCount);

      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Synthesizes a single plucked "Lyra" celestial harp string + harmonic bell shimmer.
   */
  function playLyraHarpNote(ctx, freq, startTime, durationSec, harpVolume = 0.7) {
    if (!isSinging || harpVolume <= 0.01) return;

    // 1. Fundamental + Octave + Fifth Harp String Pluck
    const partials = [
      { mult: 1.0, amp: 0.28, decay: durationSec * 1.45 },
      { mult: 2.0, amp: 0.12, decay: durationSec * 0.95 },
      { mult: 3.0, amp: 0.05, decay: durationSec * 0.55 },
      { mult: 0.5, amp: 0.11, decay: durationSec * 1.65 } // Warm harp body bass
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = p.mult === 1.0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * p.mult, startTime);

      const peakGain = p.amp * harpVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(0.15, p.decay));

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + Math.max(0.18, p.decay + 0.04));
      activeNodes.push(osc);
    }
  }

  /**
   * Synthesizes a cute 3-formant singing voice note ("Mochi Vocal Synth") with natural vibrato.
   */
  function playFormantVocalNote(ctx, freq, startTime, durationSec, vowelKey = 'ah', vocalVolume = 0.65) {
    if (!isSinging || vocalVolume <= 0.01) return;
    const formant = VOWEL_FORMANTS[vowelKey] || VOWEL_FORMANTS.ah;

    // Glottal source (warm sawtooth + triangle blend)
    const oscSaw = ctx.createOscillator();
    const oscTri = ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscTri.type = 'triangle';

    // Cute Child/Creature Pitch (1 octave higher shimmer)
    const singFreq = freq * 1.0;
    oscSaw.frequency.setValueAtTime(singFreq, startTime);
    oscTri.frequency.setValueAtTime(singFreq, startTime);

    // Expressive 5.8 Hz vocal vibrato
    const vibratoOsc = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibratoOsc.frequency.setValueAtTime(5.8, startTime);
    vibratoGain.gain.setValueAtTime(singFreq * 0.016, startTime);
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(oscSaw.frequency);
    vibratoGain.connect(oscTri.frequency);

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, startTime);
    envGain.gain.linearRampToValueAtTime(vocalVolume * 0.26, startTime + 0.045);
    envGain.gain.setValueAtTime(vocalVolume * 0.22, startTime + Math.max(0.06, durationSec * 0.72));
    envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec + 0.06);

    // 3 Parallel Formant Bandpass Resonators (F1, F2, F3)
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(formant.f1 * 1.15, startTime);
    f1.Q.setValueAtTime(5.5, startTime);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(formant.f2 * 1.12, startTime);
    f2.Q.setValueAtTime(7.0, startTime);

    const f3 = ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.setValueAtTime(formant.f3 * 1.08, startTime);
    f3.Q.setValueAtTime(8.5, startTime);

    const formantSum = ctx.createGain();
    formantSum.gain.value = 1.6;

    oscSaw.connect(f1);
    oscSaw.connect(f2);
    oscSaw.connect(f3);
    oscTri.connect(f1);
    oscTri.connect(envGain); // Warm fundamental body

    f1.connect(formantSum);
    f2.connect(formantSum);
    f3.connect(formantSum);
    formantSum.connect(envGain);
    envGain.connect(masterGain);

    oscSaw.start(startTime);
    oscTri.start(startTime);
    vibratoOsc.start(startTime);

    const stopAt = startTime + durationSec + 0.08;
    oscSaw.stop(stopAt);
    oscTri.stop(stopAt);
    vibratoOsc.stop(stopAt);

    activeNodes.push(oscSaw, oscTri, vibratoOsc);
  }

  /**
   * Schedules the Lyra Harp & Formant Melody sequence in Web Audio API.
   */
  function scheduleMelodyScore(song, options = {}) {
    const ctx = ensureAudioContext();
    const {
      includeFormantVoice = true,
      harpVolume = 0.75,
      pitchShift = 1.0,
      onComplete
    } = options;

    const notes = Array.isArray(song.notes) && song.notes.length > 0
      ? song.notes
      : SONG_PRESETS.sakura.notes;
    const bpm = Math.max(60, Math.min(180, Number(song.tempoBpm) || 108));
    const secPerBeat = 60.0 / bpm;

    let cursorSec = 0.05;
    const baseTime = ctx.currentTime;

    notes.forEach((n, idx) => {
      const midi = Math.max(48, Math.min(96, Number(n.midi) || 72));
      const durSec = Math.max(0.18, (Number(n.dur) || 1.0) * secPerBeat);
      const freq = midiToFreq(midi, pitchShift);
      const vowel = n.vowel || 'la';
      const noteStart = baseTime + cursorSec;

      // Schedule Lyra harp pluck + arpeggiated harmony fifth
      playLyraHarpNote(ctx, freq, noteStart, durSec, harpVolume);
      if (idx % 2 === 0) {
        playLyraHarpNote(ctx, freq * 0.75, noteStart + 0.04, durSec * 1.2, harpVolume * 0.45);
      }

      // Schedule formant singing voice if enabled
      if (includeFormantVoice) {
        playFormantVocalNote(ctx, freq, noteStart, durSec * 0.92, vowel, 0.62);
      }

      // Schedule vowel & pitch state updates for lip-sync
      const delayMs = Math.max(0, cursorSec * 1000);
      const timerId = window.setTimeout(() => {
        if (!isSinging) return;
        currentVowel = vowel;
        currentPitchNorm = Math.max(0, Math.min(1, (midi - 60) / 24));
      }, delayMs);
      scheduledTimers.push(timerId);

      cursorSec += durSec;
    });

    const totalMs = (cursorSec + 0.35) * 1000;
    const endTimer = window.setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, totalMs);
    scheduledTimers.push(endTimer);

    return totalMs;
  }

  /**
   * Stops any active singing or scheduled notes cleanly.
   */
  function stopSinging() {
    isSinging = false;
    isLoadingTTS = false;

    for (const t of scheduledTimers) {
      window.clearTimeout(t);
    }
    scheduledTimers = [];

    for (const node of activeNodes) {
      try {
        node.stop();
      } catch (_e) {
        // Ignore already-stopped nodes
      }
    }
    activeNodes = [];

    if (currentAudioElement) {
      try {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      } catch (_e) {
        // Ignore
      }
      currentAudioElement = null;
    }

    currentLyricText = '';
    notifyStatus('Ready to sing', false, '');
  }

  /**
   * Starts singing the selected preset or custom song using Lyra + Gemini 3.8 TTS.
   */
  async function startSinging(options = {}) {
    stopSinging();

    const presetId = options.songPreset || 'sakura';
    const customSong = options.customSong || null;
    activeSong = customSong || SONG_PRESETS[presetId] || SONG_PRESETS.sakura;

    const vocalMode = options.vocalMode || 'hybrid'; // 'hybrid' | 'lyra-synth' | 'tts-solo'
    const voiceName = options.voiceName || 'Puck';
    const harpVolume = options.harpVolume ?? 0.78;
    const pitchShift = options.pitchShift ?? 1.0;

    const ctx = ensureAudioContext();
    isSinging = true;
    currentLyricText = activeSong.lyrics.replace(/<[^>]+>/g, '');

    // Mode 1: Pure Lyra Formant Choir + Plucked Harp (Instant, zero network wait)
    if (vocalMode === 'lyra-synth') {
      notifyStatus(`Singing "${activeSong.title}" (Lyra Choir)`, true, currentLyricText);
      scheduleMelodyScore(activeSong, {
        includeFormantVoice: true,
        harpVolume,
        pitchShift,
        onComplete: () => {
          if (isSinging) stopSinging();
        }
      });
      return;
    }

    // Mode 2 & 3: Gemini 3.8 TTS ('hybrid' with Lyra harp accompaniment, or 'tts-solo')
    const cacheKey = `${voiceName}::${activeSong.lyrics}::${activeSong.style}`;
    let cachedWavBase64 = ttsAudioCache.get(cacheKey);

    if (!cachedWavBase64) {
      isLoadingTTS = true;
      notifyStatus(`Synthesizing "${activeSong.title}" with Gemini TTS (${voiceName})...`, true, currentLyricText);

      // Play a gentle Lyra harp intro arpeggio while Gemini TTS generates
      playLyraHarpNote(ctx, midiToFreq(72, pitchShift), ctx.currentTime + 0.02, 0.6, harpVolume * 0.55);
      playLyraHarpNote(ctx, midiToFreq(76, pitchShift), ctx.currentTime + 0.16, 0.6, harpVolume * 0.55);
      playLyraHarpNote(ctx, midiToFreq(79, pitchShift), ctx.currentTime + 0.30, 0.8, harpVolume * 0.55);

      try {
        const res = await fetch('/api/sing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lyrics: activeSong.lyrics,
            style: activeSong.style,
            voiceName
          })
        });
        const data = await res.json();
        if (res.ok && data.audioBase64) {
          cachedWavBase64 = data.audioBase64;
          ttsAudioCache.set(cacheKey, cachedWavBase64);
        } else {
          // Graceful fallback to Lyra Formant Singing Choir if API key not set or error
          isLoadingTTS = false;
          if (!isSinging) return;
          notifyStatus(`Singing "${activeSong.title}" (Lyra Vocal Synth)`, true, currentLyricText);
          scheduleMelodyScore(activeSong, {
            includeFormantVoice: true,
            harpVolume,
            pitchShift,
            onComplete: () => {
              if (isSinging) stopSinging();
            }
          });
          return;
        }
      } catch (_err) {
        isLoadingTTS = false;
        if (!isSinging) return;
        notifyStatus(`Singing "${activeSong.title}" (Lyra Vocal Synth)`, true, currentLyricText);
        scheduleMelodyScore(activeSong, {
          includeFormantVoice: true,
          harpVolume,
          pitchShift,
          onComplete: () => {
            if (isSinging) stopSinging();
          }
        });
        return;
      }
    }

    isLoadingTTS = false;
    if (!isSinging) return;

    notifyStatus(`Singing "${activeSong.title}" (${voiceName} + Lyra)`, true, currentLyricText);

    // Play the decoded WAV buffer through AudioContext so AnalyserNode captures exact lip-sync
    try {
      const binaryString = window.atob(cachedWavBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      if (!isSinging) return;

      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.playbackRate.value = pitchShift;

      const ttsGain = ctx.createGain();
      ttsGain.gain.value = 1.15;
      bufferSource.connect(ttsGain);
      ttsGain.connect(masterGain);

      activeNodes.push(bufferSource);

      // Accompany Gemini TTS vocals with the Lyra Harp score if in 'hybrid' mode
      const effectiveHarpVol = vocalMode === 'tts-solo' ? harpVolume * 0.22 : harpVolume * 0.65;
      scheduleMelodyScore(activeSong, {
        includeFormantVoice: false,
        harpVolume: effectiveHarpVol,
        pitchShift
      });

      bufferSource.onended = () => {
        if (isSinging) {
          stopSinging();
        }
      };

      bufferSource.start(0);
    } catch (_decodeErr) {
      // Fallback via HTML5 Audio element or Lyra Formant Synth
      scheduleMelodyScore(activeSong, {
        includeFormantVoice: true,
        harpVolume,
        pitchShift,
        onComplete: () => {
          if (isSinging) stopSinging();
        }
      });
    }
  }

  /**
   * Calls Gemini 3.8 Flash (/api/compose-song) to compose a custom song & Lyra melody on any topic,
   * and immediately starts Mochi-Puff singing it!
   */
  async function composeAndSing(topic, options = {}) {
    const cleanTopic = String(topic || 'dancing in the sakura breeze').trim();
    isLoadingTTS = true;
    isSinging = true;
    notifyStatus(`Composing song about "${cleanTopic}" with Gemini...`, true, '');

    try {
      const res = await fetch('/api/compose-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cleanTopic,
          mood: options.mood || 'joyful and melodic'
        })
      });
      const composed = await res.json();
      if (res.ok && composed && composed.lyrics) {
        const customSong = {
          id: 'custom',
          title: composed.title || 'Mochi Custom Song',
          lyrics: composed.lyrics,
          style: composed.style || 'Cheerful, melodic singing creature with bright musical pitch',
          tempoBpm: composed.tempoBpm || 112,
          notes: Array.isArray(composed.notes) && composed.notes.length >= 4
            ? composed.notes
            : SONG_PRESETS.sakura.notes
        };
        await startSinging({
          ...options,
          customSong
        });
        return customSong;
      }
    } catch (_e) {
      // Fallback to preset with custom topic woven into lyrics
    }

    const fallbackCustom = {
      ...SONG_PRESETS.sakura,
      title: `Song of ${cleanTopic.slice(0, 22)}`,
      lyrics: `La la la, Mochi-Puff sings about ${cleanTopic}! <laugh> Dancing in the fluffy breeze!`
    };
    await startSinging({
      ...options,
      customSong: fallbackCustom
    });
    return fallbackCustom;
  }

  /**
   * Zero-GC per-frame audio envelope & formant lip-sync analyzer.
   */
  const metricsOut = {
    isSinging: false,
    amplitude: 0.0,
    mouthOpen: 0.0,
    mouthRound: 0.4,
    pitchNormalized: 0.5,
    beatPulse: 0.0,
    currentLyric: ''
  };

  function getAudioMetrics(dt = 0.016) {
    if (!isSinging || !analyser || !timeDomainBuf) {
      smoothAmplitude *= Math.exp(-dt * 12.0);
      smoothMouthOpen *= Math.exp(-dt * 14.0);
      metricsOut.isSinging = false;
      metricsOut.amplitude = smoothAmplitude;
      metricsOut.mouthOpen = smoothMouthOpen;
      metricsOut.mouthRound = smoothMouthRound;
      metricsOut.beatPulse = 0.0;
      metricsOut.currentLyric = '';
      return metricsOut;
    }

    analyser.getByteTimeDomainData(timeDomainBuf);
    analyser.getByteFrequencyData(freqDomainBuf);

    // Compute RMS amplitude from time-domain waveform
    let sumSq = 0.0;
    const len = timeDomainBuf.length;
    for (let i = 0; i < len; i++) {
      const sample = (timeDomainBuf[i] - 128.0) / 128.0;
      sumSq += sample * sample;
    }
    const rms = Math.sqrt(sumSq / len);

    // Compute low/mid vs high spectral centroid for dynamic vowel rounding (Ah/Oh vs Ee)
    let lowBand = 0.0;
    let highBand = 0.0;
    for (let i = 2; i < 18; i++) lowBand += freqDomainBuf[i];
    for (let i = 18; i < 64; i++) highBand += freqDomainBuf[i];
    const spectralRatio = highBand / Math.max(1.0, lowBand + highBand);

    const targetAmp = Math.min(1.0, rms * 4.2);
    smoothAmplitude += (targetAmp - smoothAmplitude) * Math.min(1.0, dt * 18.0);

    const targetMouth = targetAmp > 0.03 ? Math.min(1.0, 0.15 + targetAmp * 1.15) : 0.0;
    smoothMouthOpen += (targetMouth - smoothMouthOpen) * Math.min(1.0, dt * 22.0);

    const presetRound = (VOWEL_FORMANTS[currentVowel] || VOWEL_FORMANTS.ah).round;
    const targetRound = presetRound * 0.65 + (1.0 - spectralRatio) * 0.35;
    smoothMouthRound += (targetRound - smoothMouthRound) * Math.min(1.0, dt * 14.0);

    metricsOut.isSinging = true;
    metricsOut.amplitude = smoothAmplitude;
    metricsOut.mouthOpen = smoothMouthOpen;
    metricsOut.mouthRound = smoothMouthRound;
    metricsOut.pitchNormalized = currentPitchNorm;
    metricsOut.beatPulse = smoothAmplitude * 0.85;
    metricsOut.currentLyric = currentLyricText;
    return metricsOut;
  }

  return {
    startSinging,
    stopSinging,
    composeAndSing,
    getAudioMetrics,
    isSinging: () => isSinging
  };
}
