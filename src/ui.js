// Minimalist, XSS-safe Glassmorphic DOM UI for GPU Fur Simulation
// Features:
// 1. Primary Scene Selection Menu as a top-floating glass pill bar + 1-Click Sing & GPU Fur Toggles
// 2. Collapsible Materials, Point Light, Wind Force Field & Singing Settings panel on the side
// 3. Native Google Sans font typography with full fallbacks
// 4. Strict pure safe DOM construction with input sanitization

import { ENVIRONMENT_PRESETS, sanitizeEnvId } from './environments.js';
import { kelvinToHex, MARSCHNER_STYLE_PRESETS } from './furSystem.js';
import { BODY_SHAPE_PRESETS, MOOD_PRESETS } from './blobCreature.js';
import { AIR_DUST_STYLES, LIGHTING_SHOWCASE_PRESETS } from './airParticles.js';
import { BRUSH_MODES } from './gpuPhysics.js';
import { MIC_REACTIVITY_MODES } from './micAudioAnalyzer.js';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function clampNumber(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

export function sanitizeHexColor(val, fallback) {
  if (typeof val === 'string' && HEX_COLOR_REGEX.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

export const FUR_PRESETS = [
  {
    name: 'Sakura Mochi',
    baseColor: '#5e2bff',
    tipColor: '#ff9ec7',
    furLength: 0.31,
    furDensity: 0.75,
    roughness: 0.77,
    specular: 0.24,
    clumping: 0.35,
    curliness: 0.23,
    lightPreset: 'static'
  },
  {
    name: 'Golden Fluff',
    baseColor: '#7c3f14',
    tipColor: '#fde68a',
    furLength: 0.38,
    furDensity: 0.92,
    roughness: 0.62,
    specular: 0.42,
    clumping: 0.64,
    curliness: 0.58,
    lightPreset: 'goldenSweep'
  },
  {
    name: 'Midnight Velvet',
    baseColor: '#131638',
    tipColor: '#67e8f9',
    furLength: 0.29,
    furDensity: 0.95,
    roughness: 0.38,
    specular: 0.68,
    clumping: 0.44,
    curliness: 0.15,
    lightPreset: 'auroraDance'
  },
  {
    name: 'Matcha Puff',
    baseColor: '#1e4631',
    tipColor: '#bbf7d0',
    furLength: 0.36,
    furDensity: 0.86,
    roughness: 0.74,
    specular: 0.28,
    clumping: 0.62,
    curliness: 0.72,
    lightPreset: 'static'
  },
  {
    name: 'Prism Rainbow',
    baseColor: '#4c1d95',
    tipColor: '#fbcfe8',
    furLength: 0.36,
    furDensity: 0.9,
    roughness: 0.24,
    specular: 1.15,
    clumping: 0.42,
    curliness: 0.28,
    lightPreset: 'rainbow'
  },
  {
    name: 'Neon Kitsune',
    baseColor: '#3b0764',
    tipColor: '#22d3ee',
    furLength: 0.44,
    furDensity: 0.88,
    roughness: 0.28,
    specular: 1.05,
    clumping: 0.82,
    curliness: 0.12,
    lightPreset: 'cyberNeon'
  }
];

export function createMinimalUI(container, state, onChange) {
  // =========================================================================
  // 1. PRIMARY SCENE SELECTION MENU (TOP GLASS PILL BAR)
  // =========================================================================
  let sceneNav = document.getElementById('scene-nav');
  if (!sceneNav) {
    sceneNav = document.createElement('nav');
    sceneNav.id = 'scene-nav';
    sceneNav.className = 'scene-nav-bar';
    sceneNav.setAttribute('aria-label', 'Scene Selection');
    document.body.appendChild(sceneNav);
  }
  sceneNav.replaceChildren();

  const sceneButtons = {};

  for (const env of ENVIRONMENT_PRESETS) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'scene-pill';
    pill.setAttribute('data-env', env.id);
    pill.setAttribute('aria-label', `${env.name} · ${env.subtitle}`);
    const isCurrent = (state.environment || 'studio') === env.id;
    if (isCurrent) {
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
    } else {
      pill.setAttribute('aria-selected', 'false');
    }

    const dot = document.createElement('span');
    dot.className = 'scene-pill-dot';

    const label = document.createElement('span');
    label.className = 'scene-pill-label';
    label.textContent = env.name;

    pill.appendChild(dot);
    pill.appendChild(label);

    pill.addEventListener('click', () => {
      const safeEnv = sanitizeEnvId(env.id, 'studio');
      state.environment = safeEnv;
      updateEnvSelectionUI(safeEnv);
      onChange('environment', safeEnv);
    });

    sceneButtons[env.id] = pill;
    sceneNav.appendChild(pill);
  }

  // Divider + 1-Click WebGL / GPU Fur Toggle Pill in Top Floating Bar
  const navDivider = document.createElement('span');
  navDivider.className = 'scene-nav-divider';
  navDivider.setAttribute('aria-hidden', 'true');
  sceneNav.appendChild(navDivider);

  const topGpuFurPill = document.createElement('button');
  topGpuFurPill.type = 'button';
  topGpuFurPill.className = 'scene-pill gpu-fur-pill';
  topGpuFurPill.setAttribute('aria-label', 'Toggle between default WebGL Fur and full GPU Fur');

  const topGpuDot = document.createElement('span');
  topGpuDot.className = 'scene-pill-dot';

  const topGpuLabel = document.createElement('span');
  topGpuLabel.className = 'scene-pill-label';

  topGpuFurPill.appendChild(topGpuDot);
  topGpuFurPill.appendChild(topGpuLabel);
  sceneNav.appendChild(topGpuFurPill);

  // 1-Click Sing Pill in Top Floating Bar
  const singNavDivider = document.createElement('span');
  singNavDivider.className = 'scene-nav-divider';
  singNavDivider.setAttribute('aria-hidden', 'true');
  sceneNav.appendChild(singNavDivider);

  const topSingPill = document.createElement('button');
  topSingPill.type = 'button';
  topSingPill.className = 'scene-pill sing-top-pill';
  topSingPill.setAttribute('aria-label', 'Make Mochi-Puff sing with Lyra and Gemini TTS');

  const topSingDot = document.createElement('span');
  topSingDot.className = 'scene-pill-dot';

  const topSingLabel = document.createElement('span');
  topSingLabel.className = 'scene-pill-label';
  topSingLabel.textContent = '♪ Sing';

  topSingPill.appendChild(topSingDot);
  topSingPill.appendChild(topSingLabel);
  topSingPill.addEventListener('click', () => {
    onChange('toggleSing', true);
  });
  sceneNav.appendChild(topSingPill);

  // 1-Click Microphone Audio Reactivity Pill in Top Floating Bar
  const topMicPill = document.createElement('button');
  topMicPill.type = 'button';
  topMicPill.className = 'scene-pill mic-top-pill';
  topMicPill.setAttribute('aria-label', 'Toggle Web Audio Microphone Reactivity');

  const topMicDot = document.createElement('span');
  topMicDot.className = 'scene-pill-dot';

  const topMicLabel = document.createElement('span');
  topMicLabel.className = 'scene-pill-label';
  topMicLabel.textContent = '🎤 Mic Audio';

  topMicPill.appendChild(topMicDot);
  topMicPill.appendChild(topMicLabel);
  topMicPill.addEventListener('click', () => {
    onChange('toggleMic', true);
  });
  sceneNav.appendChild(topMicPill);

  // =========================================================================
  // 2. COLLAPSIBLE MATERIALS & LIGHTING SETTINGS PANEL (SIDE GLASS CARD ON DESKTOP, BOTTOM SHEET ON MOBILE)
  // =========================================================================
  container.replaceChildren();

  let mobileBackdrop = document.getElementById('mobile-sheet-backdrop');
  if (!mobileBackdrop) {
    mobileBackdrop = document.createElement('div');
    mobileBackdrop.id = 'mobile-sheet-backdrop';
    mobileBackdrop.className = 'mobile-sheet-backdrop';
    mobileBackdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mobileBackdrop);
  }

  let mobileControlsBtn = document.getElementById('mobile-controls-btn');
  if (!mobileControlsBtn) {
    mobileControlsBtn = document.createElement('button');
    mobileControlsBtn.id = 'mobile-controls-btn';
    mobileControlsBtn.type = 'button';
    mobileControlsBtn.className = 'mobile-controls-btn';
    mobileControlsBtn.setAttribute('aria-label', 'Open simulation controls');
    mobileControlsBtn.setAttribute('aria-expanded', 'false');
    document.body.appendChild(mobileControlsBtn);
  }
  mobileControlsBtn.replaceChildren();

  const mobileBtnDot = document.createElement('span');
  mobileBtnDot.className = 'mobile-controls-btn-dot';

  const mobileBtnLabel = document.createElement('span');
  mobileBtnLabel.className = 'mobile-controls-btn-label';
  mobileBtnLabel.textContent = 'Controls';

  const mobileBtnSep = document.createElement('span');
  mobileBtnSep.className = 'mobile-controls-btn-sep';
  mobileBtnSep.setAttribute('aria-hidden', 'true');
  mobileBtnSep.textContent = '·';

  const mobileBtnScene = document.createElement('span');
  mobileBtnScene.className = 'mobile-controls-btn-scene';
  const currentPresetInit =
    ENVIRONMENT_PRESETS.find((e) => e.id === (state.environment || 'studio')) ||
    ENVIRONMENT_PRESETS[0];
  mobileBtnScene.textContent = currentPresetInit.name;

  mobileControlsBtn.appendChild(mobileBtnDot);
  mobileControlsBtn.appendChild(mobileBtnLabel);
  mobileControlsBtn.appendChild(mobileBtnSep);
  mobileControlsBtn.appendChild(mobileBtnScene);

  const handleWrap = document.createElement('div');
  handleWrap.className = 'mobile-sheet-handle-wrap';
  handleWrap.setAttribute('aria-hidden', 'true');
  const handleBar = document.createElement('div');
  handleBar.className = 'mobile-sheet-handle';
  handleWrap.appendChild(handleBar);
  container.appendChild(handleWrap);

  const header = document.createElement('div');
  header.className = 'ui-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'ui-title-wrap';

  const dot = document.createElement('span');
  dot.className = 'ui-dot';

  const title = document.createElement('span');
  title.className = 'ui-title';
  title.textContent = 'Comb, Mic, Style & Shadow';

  titleWrap.appendChild(dot);
  titleWrap.appendChild(title);

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'ui-toggle-btn';

  function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function syncToggleBtnLabel() {
    if (isMobileViewport()) {
      const isOpen = container.classList.contains('mobile-sheet-open');
      toggleBtn.textContent = isOpen ? 'Done' : 'Controls';
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      mobileControlsBtn.setAttribute('aria-expanded', String(isOpen));
    } else {
      const isCollapsed = container.classList.contains('collapsed');
      toggleBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
      toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    }
  }

  function setMobileSheetOpen(open) {
    const isOpen = Boolean(open);
    container.classList.toggle('mobile-sheet-open', isOpen);
    mobileBackdrop.classList.toggle('active', isOpen);
    document.body.classList.toggle('mobile-sheet-active', isOpen);
    syncToggleBtnLabel();
  }

  toggleBtn.setAttribute('aria-label', 'Toggle settings panel');
  syncToggleBtnLabel();

  mobileControlsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMobileSheetOpen(true);
  });

  mobileBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    setMobileSheetOpen(false);
  });

  handleWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobileViewport()) {
      setMobileSheetOpen(false);
    }
  });

  let touchStartY = null;
  function onSheetTouchStart(e) {
    if (!isMobileViewport()) return;
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }
  function onSheetTouchEnd(e) {
    if (touchStartY === null || !isMobileViewport()) return;
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (deltaY > 36) {
        setMobileSheetOpen(false);
      }
    }
    touchStartY = null;
  }
  handleWrap.addEventListener('touchstart', onSheetTouchStart, { passive: true });
  handleWrap.addEventListener('touchend', onSheetTouchEnd, { passive: true });
  header.addEventListener('touchstart', onSheetTouchStart, { passive: true });
  header.addEventListener('touchend', onSheetTouchEnd, { passive: true });

  window.addEventListener('resize', () => {
    if (!isMobileViewport() && container.classList.contains('mobile-sheet-open')) {
      setMobileSheetOpen(false);
    } else {
      syncToggleBtnLabel();
    }
  });

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobileViewport()) {
      const nextOpen = !container.classList.contains('mobile-sheet-open');
      setMobileSheetOpen(nextOpen);
      return;
    }
    const isCollapsed = container.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
  });

  header.addEventListener('click', () => {
    if (isMobileViewport()) {
      return;
    }
    if (container.classList.contains('collapsed')) {
      container.classList.remove('collapsed');
      toggleBtn.textContent = 'Collapse';
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  header.appendChild(titleWrap);
  header.appendChild(toggleBtn);
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'ui-body';
  container.appendChild(body);

  const sliderRefs = {};
  const colorRefs = {};
  const selectRefs = {};
  const moodButtonRefs = {};
  const mobileSceneButtons = {};

  function addSection(titleText) {
    const sec = document.createElement('section');
    sec.className = 'ui-section';
    const h = document.createElement('div');
    h.className = 'ui-section-title';
    h.textContent = titleText;
    sec.appendChild(h);
    body.appendChild(sec);
    return sec;
  }

  function addDropdown(parent, key, labelText, optionsList, onSelectCallback) {
    const row = document.createElement('div');
    row.className = 'ui-select-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const lbl = document.createElement('span');
    lbl.className = 'control-label';
    lbl.textContent = labelText;
    labelRow.appendChild(lbl);

    const select = document.createElement('select');
    select.className = 'ui-select';
    select.setAttribute('aria-label', labelText);

    optionsList.forEach((opt) => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (state[key] === opt.value) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener('change', () => {
      state[key] = select.value;
      if (typeof onSelectCallback === 'function') {
        onSelectCallback(select.value);
      } else {
        onChange(key, select.value);
      }
    });

    row.appendChild(labelRow);
    row.appendChild(select);
    parent.appendChild(row);
    selectRefs[key] = select;
    return select;
  }

  // --- Mobile-Only Section: Scene Selection inside the Bottom Sheet ---
  const mobileSceneSection = addSection('Scene Selection');
  mobileSceneSection.classList.add('mobile-scene-section');

  const mobileSceneGrid = document.createElement('div');
  mobileSceneGrid.className = 'preset-grid mobile-scene-grid';

  for (const env of ENVIRONMENT_PRESETS) {
    const mBtn = document.createElement('button');
    mBtn.type = 'button';
    mBtn.className = 'preset-btn mobile-scene-btn';
    mBtn.setAttribute('data-env', env.id);
    mBtn.setAttribute('aria-label', `${env.name} · ${env.subtitle}`);
    const isCur = (state.environment || 'studio') === env.id;
    if (isCur) {
      mBtn.classList.add('active');
      mBtn.setAttribute('aria-selected', 'true');
    } else {
      mBtn.setAttribute('aria-selected', 'false');
    }

    const mDot = document.createElement('span');
    mDot.className = 'scene-pill-dot';

    const mLabel = document.createElement('span');
    mLabel.className = 'preset-label';
    mLabel.textContent = env.name;

    mBtn.appendChild(mDot);
    mBtn.appendChild(mLabel);

    mBtn.addEventListener('click', () => {
      const safeEnv = sanitizeEnvId(env.id, 'studio');
      state.environment = safeEnv;
      updateEnvSelectionUI(safeEnv);
      onChange('environment', safeEnv);
    });

    mobileSceneButtons[env.id] = mBtn;
    mobileSceneGrid.appendChild(mBtn);
  }
  mobileSceneSection.appendChild(mobileSceneGrid);

  function addSlider(parent, key, labelText, min, max, step, formatFn) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const lbl = document.createElement('span');
    lbl.className = 'control-label';
    lbl.textContent = labelText;

    const valSpan = document.createElement('span');
    valSpan.className = 'control-val';
    valSpan.textContent = formatFn(state[key]);

    labelRow.appendChild(lbl);
    labelRow.appendChild(valSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(state[key]);
    input.setAttribute('aria-label', labelText);

    input.addEventListener('input', () => {
      const sanitized = clampNumber(input.value, min, max, state[key]);
      state[key] = sanitized;
      valSpan.textContent = formatFn(sanitized);
      onChange(key, sanitized);
    });

    row.appendChild(labelRow);
    row.appendChild(input);
    parent.appendChild(row);

    sliderRefs[key] = { input, valSpan, formatFn };
  }

  // --- Section 00a: Interactive Combing Brush Tool ---
  const brushSection = addSection('Interactive Combing Brush Tool');

  const brushOptions = Object.values(BRUSH_MODES).map((bm) => ({
    value: bm.id,
    label: bm.name
  }));
  addDropdown(brushSection, 'brushMode', 'Brush Stroke Mode', brushOptions);

  addSlider(
    brushSection,
    'brushRadius',
    'Brush Radius',
    0.16,
    0.85,
    0.02,
    (v) => `${Math.round(v * 100)}%`
  );
  addSlider(
    brushSection,
    'brushStrength',
    'Comb Alignment Force',
    0.2,
    2.5,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );
  addSlider(
    brushSection,
    'combPersistence',
    'Groom Hold (Memory)',
    0.0,
    1.0,
    0.02,
    (v) => `${Math.round(v * 100)}%`
  );

  const brushActionRow = document.createElement('div');
  brushActionRow.className = 'action-row';
  brushActionRow.style.marginTop = '6px';

  const resetGroomBtn = document.createElement('button');
  resetGroomBtn.type = 'button';
  resetGroomBtn.className = 'action-btn';
  resetGroomBtn.textContent = '↺ Reset Combed Fur';
  resetGroomBtn.addEventListener('click', () => {
    onChange('resetGroom', true);
  });

  const toggleGizmoBtn = document.createElement('button');
  toggleGizmoBtn.type = 'button';
  toggleGizmoBtn.className = `action-btn ${state.showBrushGizmo ? 'active' : ''}`;
  toggleGizmoBtn.textContent = state.showBrushGizmo ? 'Brush Ring: ON' : 'Brush Ring: OFF';
  toggleGizmoBtn.addEventListener('click', () => {
    state.showBrushGizmo = !state.showBrushGizmo;
    toggleGizmoBtn.classList.toggle('active', state.showBrushGizmo);
    toggleGizmoBtn.textContent = state.showBrushGizmo ? 'Brush Ring: ON' : 'Brush Ring: OFF';
    onChange('showBrushGizmo', state.showBrushGizmo);
  });

  brushActionRow.appendChild(resetGroomBtn);
  brushActionRow.appendChild(toggleGizmoBtn);
  brushSection.appendChild(brushActionRow);

  // --- Section 00b: Web Audio API Microphone Reactivity ---
  const micSection = addSection('Web Audio Microphone Reactivity');

  const micToggleBtn = document.createElement('button');
  micToggleBtn.type = 'button';
  micToggleBtn.className = `action-btn sing-action-btn ${state.micEnabled ? 'active' : ''}`;
  micToggleBtn.textContent = state.micEnabled
    ? '⏹ Stop Microphone Analyzer'
    : '🎤 Enable Live Microphone Audio';
  micToggleBtn.addEventListener('click', () => {
    onChange('toggleMic', true);
  });
  micSection.appendChild(micToggleBtn);

  const micModeOptions = Object.values(MIC_REACTIVITY_MODES).map((mm) => ({
    value: mm.id,
    label: mm.name
  }));
  addDropdown(micSection, 'micReactivityMode', 'Audio Reactivity Style', micModeOptions);

  addSlider(
    micSection,
    'micSensitivity',
    'Mic Gain / Sensitivity',
    0.25,
    3.0,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );

  const micStatusBanner = document.createElement('div');
  micStatusBanner.className = 'sing-status-banner';
  micStatusBanner.textContent = 'Mic Off · Click to vibrate fur & pulse colors to music';
  micSection.appendChild(micStatusBanner);

  // --- Section 00c: High-Quality Fur Shadow Map Pass ---
  const shadowSection = addSection('Fur Self & Ground Shadow Pass');

  const shadowToggleBtn = document.createElement('button');
  shadowToggleBtn.type = 'button';
  shadowToggleBtn.className = `action-btn ${state.shadowPassEnabled ? 'active' : ''}`;
  shadowToggleBtn.style.width = '100%';
  shadowToggleBtn.style.marginBottom = '8px';
  shadowToggleBtn.textContent = state.shadowPassEnabled
    ? '☀ 2048px Fur Shadow Map Pass: ON'
    : '☀ 2048px Fur Shadow Map Pass: OFF';
  shadowToggleBtn.addEventListener('click', () => {
    state.shadowPassEnabled = !state.shadowPassEnabled;
    shadowToggleBtn.classList.toggle('active', state.shadowPassEnabled);
    shadowToggleBtn.textContent = state.shadowPassEnabled
      ? '☀ 2048px Fur Shadow Map Pass: ON'
      : '☀ 2048px Fur Shadow Map Pass: OFF';
    onChange('shadowPassEnabled', state.shadowPassEnabled);
  });
  shadowSection.appendChild(shadowToggleBtn);

  addSlider(
    shadowSection,
    'selfShadowStrength',
    'Fur Self-Shadow Depth',
    0.0,
    1.2,
    0.02,
    (v) => `${Math.round(v * 100)}%`
  );
  addSlider(
    shadowSection,
    'groundShadowStrength',
    'Ground Plane Cast Shadow',
    0.0,
    1.2,
    0.02,
    (v) => `${Math.round(v * 100)}%`
  );
  addSlider(
    shadowSection,
    'shadowSoftness',
    'PCF Penumbra Softness',
    0.2,
    2.5,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );

  // --- Section 0a: Mood Tool (Changes Mood, Coat Colors & Facial Expression) ---
  const moodSection = addSection('Mood Tool (Changes Colors & Vibe)');
  const moodGrid = document.createElement('div');
  moodGrid.className = 'mood-grid';

  Object.values(MOOD_PRESETS).forEach((m) => {
    const mBtn = document.createElement('button');
    mBtn.type = 'button';
    mBtn.className = 'mood-btn';
    if ((state.mood || 'happy') === m.id) {
      mBtn.classList.add('active');
    }
    mBtn.textContent = m.badge;
    mBtn.setAttribute('aria-label', `Set mood to ${m.name}`);

    mBtn.addEventListener('click', () => {
      state.mood = m.id;
      Object.keys(moodButtonRefs).forEach((id) => {
        moodButtonRefs[id].classList.toggle('active', id === m.id);
      });
      onChange('mood', m.id);
    });

    moodButtonRefs[m.id] = mBtn;
    moodGrid.appendChild(mBtn);
  });
  moodSection.appendChild(moodGrid);

  // --- Section 0b: Creature Body Shape & Eye Size Tool ---
  const shapeSection = addSection('Creature Shape & Eye Size');

  const shapeOptions = Object.values(BODY_SHAPE_PRESETS).map((s) => ({
    value: s.id,
    label: s.name
  }));
  addDropdown(shapeSection, 'bodyShape', 'Body Shape Style', shapeOptions);

  addSlider(
    shapeSection,
    'eyeSize',
    'Eye Size Adjustment',
    0.5,
    1.75,
    0.02,
    (v) => `${Math.round(v * 100)}%`
  );

  // --- Section 0c: Lyra & Gemini TTS Singing ---
  const singSection = addSection('Lyra & Gemini TTS Singing');

  const singPrimaryBtn = document.createElement('button');
  singPrimaryBtn.type = 'button';
  singPrimaryBtn.className = 'action-btn sing-action-btn';
  singPrimaryBtn.textContent = '♪ Sing Song (Lyra + Gemini TTS)';
  singPrimaryBtn.addEventListener('click', () => {
    onChange('toggleSing', true);
  });
  singSection.appendChild(singPrimaryBtn);

  const songGrid = document.createElement('div');
  songGrid.className = 'preset-grid';
  songGrid.style.marginTop = '7px';

  const songChoices = [
    { id: 'sakura', label: 'Sakura Lullaby' },
    { id: 'starlight', label: 'Starlight Lyra' },
    { id: 'pop', label: 'Fluffy Boop Bop' },
    { id: 'wind', label: 'Meadow Waltz' }
  ];
  const songButtons = {};

  songChoices.forEach((s) => {
    const sBtn = document.createElement('button');
    sBtn.type = 'button';
    sBtn.className = 'preset-btn';
    if ((state.songPreset || 'sakura') === s.id) {
      sBtn.classList.add('active');
    }
    const sLbl = document.createElement('span');
    sLbl.className = 'preset-label';
    sLbl.textContent = s.label;
    sBtn.appendChild(sLbl);
    sBtn.addEventListener('click', () => {
      state.songPreset = s.id;
      Object.keys(songButtons).forEach((id) => {
        songButtons[id].classList.toggle('active', id === s.id);
      });
      onChange('songPreset', s.id);
      onChange('startSingPreset', s.id);
    });
    songButtons[s.id] = sBtn;
    songGrid.appendChild(sBtn);
  });
  singSection.appendChild(songGrid);

  // Custom AI Song Composer Row
  const composeRow = document.createElement('div');
  composeRow.className = 'compose-row';

  const composeInput = document.createElement('input');
  composeInput.type = 'text';
  composeInput.className = 'compose-input';
  composeInput.placeholder = 'Custom song topic (e.g. moonlit marshmallows)...';
  composeInput.setAttribute('aria-label', 'Custom song topic for Mochi-Puff');

  const composeBtn = document.createElement('button');
  composeBtn.type = 'button';
  composeBtn.className = 'action-btn compose-btn';
  composeBtn.textContent = 'Compose';
  composeBtn.addEventListener('click', () => {
    const topic = composeInput.value.trim() || 'starlight marshmallows and soft breeze';
    onChange('composeAndSing', topic);
  });
  composeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const topic = composeInput.value.trim() || 'starlight marshmallows and soft breeze';
      onChange('composeAndSing', topic);
    }
  });

  composeRow.appendChild(composeInput);
  composeRow.appendChild(composeBtn);
  singSection.appendChild(composeRow);

  const singStatusBanner = document.createElement('div');
  singStatusBanner.className = 'sing-status-banner';
  singStatusBanner.textContent = 'Ready · Select a song or click Sing';
  singSection.appendChild(singStatusBanner);

  // --- Section 1: Quick Coat & Light Presets ---
  const presetSection = addSection('Quick Coat & Light Presets');
  const presetGrid = document.createElement('div');
  presetGrid.className = 'preset-grid';

  for (const preset of FUR_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';

    const pDot = document.createElement('span');
    pDot.className = 'preset-dot';
    pDot.style.background = `linear-gradient(135deg, ${preset.tipColor} 0%, ${preset.baseColor} 100%)`;

    const pLabel = document.createElement('span');
    pLabel.className = 'preset-label';
    pLabel.textContent = preset.name;

    btn.appendChild(pDot);
    btn.appendChild(pLabel);

    btn.addEventListener('click', () => {
      Object.keys(preset).forEach((k) => {
        if (k === 'name') return;
        state[k] = preset[k];
        if (sliderRefs[k]) {
          sliderRefs[k].input.value = String(preset[k]);
          sliderRefs[k].valSpan.textContent = sliderRefs[k].formatFn(preset[k]);
        }
        if (colorRefs[k]) {
          colorRefs[k].value = preset[k];
        }
        if (selectRefs[k]) {
          selectRefs[k].value = preset[k];
        }
        onChange(k, preset[k]);
      });
    });
    presetGrid.appendChild(btn);
  }
  presetSection.appendChild(presetGrid);

  // --- Section 2: Coat Materials & Marschner Style Dropdown ---
  const geoSection = addSection('Marschner Fur Style & Coat');

  const engineModeRow = document.createElement('div');
  engineModeRow.className = 'dpr-selector-row engine-mode-row';

  const gpuFurModeBtn = document.createElement('button');
  gpuFurModeBtn.type = 'button';
  gpuFurModeBtn.className = 'dpr-pill-btn engine-mode-btn';
  gpuFurModeBtn.textContent = 'WebGPU (Default)';
  gpuFurModeBtn.setAttribute('aria-label', 'Switch to default 60k WebGPU Fur and GPGPU physics');

  const webglModeBtn = document.createElement('button');
  webglModeBtn.type = 'button';
  webglModeBtn.className = 'dpr-pill-btn engine-mode-btn';
  webglModeBtn.textContent = 'WebGL';
  webglModeBtn.setAttribute('aria-label', 'Switch to lightweight WebGL Fur fallback mode');

  engineModeRow.appendChild(gpuFurModeBtn);
  engineModeRow.appendChild(webglModeBtn);
  geoSection.appendChild(engineModeRow);

  // Pre-defined Marschner Style Dropdown ('Fluffy', 'Sleek', 'Spiky', 'Curly Wool', 'Velvet', 'Crystal Glint')
  const marschnerOptions = Object.values(MARSCHNER_STYLE_PRESETS).map((p) => ({
    value: p.id,
    label: p.name
  }));
  addDropdown(geoSection, 'marschnerStyle', 'Fur Style (Marschner BSDF)', marschnerOptions);

  addSlider(
    geoSection,
    'furLength',
    'Fur Length',
    0.06,
    0.62,
    0.01,
    (v) => `${(v * 2.0).toFixed(2)}" (${Math.round(v * 50.8)} mm)`
  );
  addSlider(
    geoSection,
    'furDensity',
    'Fur Density',
    0.12,
    1.0,
    0.01,
    (v) =>
      state.gpuFurEnabled
        ? `${Math.round(v * 100)}% (${Math.round(v * 60)}k)`
        : `${Math.round(v * 100)}% (WebGL)`
  );
  addSlider(
    geoSection,
    'curliness',
    'Curl / Waviness',
    0.0,
    1.0,
    0.01,
    (v) => `${Math.round(v * 100)}%`
  );
  addSlider(
    geoSection,
    'clumping',
    'Tuft Clumping',
    0.0,
    1.0,
    0.01,
    (v) => `${Math.round(v * 100)}%`
  );

  // --- Section 3: Physical Hair Shading (Marschner Lobes) ---
  const shadingSection = addSection('Physical Hair Shading');

  const colorGrid = document.createElement('div');
  colorGrid.className = 'color-grid';

  function addColorPicker(key, labelText) {
    const cell = document.createElement('label');
    cell.className = 'color-cell';

    const span = document.createElement('span');
    span.textContent = labelText;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = sanitizeHexColor(state[key], '#ff9ec7');
    picker.setAttribute('aria-label', labelText);

    picker.addEventListener('input', () => {
      const safeColor = sanitizeHexColor(picker.value, state[key]);
      state[key] = safeColor;
      onChange(key, safeColor);
    });

    cell.appendChild(span);
    cell.appendChild(picker);
    colorGrid.appendChild(cell);
    colorRefs[key] = picker;
  }

  addColorPicker('baseColor', 'Root Color');
  addColorPicker('tipColor', 'Tip Color');
  shadingSection.appendChild(colorGrid);

  addSlider(
    shadingSection,
    'roughness',
    'Roughness (R/TRT)',
    0.06,
    0.95,
    0.01,
    (v) => v.toFixed(2)
  );
  addSlider(
    shadingSection,
    'specular',
    'Specular Sheen',
    0.0,
    2.0,
    0.02,
    (v) => v.toFixed(2)
  );
  addSlider(
    shadingSection,
    'glintStrength',
    'Marschner TRT Glint',
    0.2,
    2.5,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );
  addSlider(
    shadingSection,
    'transmissionTT',
    'Forward Scatter (TT)',
    0.2,
    2.2,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );

  // --- Section 4: Moving Light Presets, Slow Rainbow & Gaussian Bloom ---
  const lightSection = addSection('Lighting, Rainbow & Motion');

  const lightPresetOptions = Object.values(LIGHTING_SHOWCASE_PRESETS).map((lp) => ({
    value: lp.id,
    label: lp.name
  }));
  addDropdown(lightSection, 'lightPreset', 'Light Motion & Rainbow Style', lightPresetOptions);

  // Quick 1-click Rainbow & Moving Light Showcase Buttons
  const lightQuickRow = document.createElement('div');
  lightQuickRow.className = 'action-row';
  lightQuickRow.style.marginBottom = '9px';

  const rainbowQuickBtn = document.createElement('button');
  rainbowQuickBtn.type = 'button';
  rainbowQuickBtn.className = 'action-btn rainbow-badge-btn';
  rainbowQuickBtn.textContent = '🌈 Slow Rainbow';
  rainbowQuickBtn.addEventListener('click', () => {
    const nextMode = state.lightPreset === 'rainbow' ? 'static' : 'rainbow';
    state.lightPreset = nextMode;
    if (selectRefs.lightPreset) selectRefs.lightPreset.value = nextMode;
    rainbowQuickBtn.classList.toggle('active', nextMode === 'rainbow');
    orbitQuickBtn.classList.toggle('active', nextMode === 'goldenSweep');
    onChange('lightPreset', nextMode);
  });

  const orbitQuickBtn = document.createElement('button');
  orbitQuickBtn.type = 'button';
  orbitQuickBtn.className = 'action-btn';
  orbitQuickBtn.textContent = '✨ Orbit Sweep';
  orbitQuickBtn.addEventListener('click', () => {
    const nextMode = state.lightPreset === 'goldenSweep' ? 'static' : 'goldenSweep';
    state.lightPreset = nextMode;
    if (selectRefs.lightPreset) selectRefs.lightPreset.value = nextMode;
    orbitQuickBtn.classList.toggle('active', nextMode === 'goldenSweep');
    rainbowQuickBtn.classList.toggle('active', nextMode === 'rainbow');
    onChange('lightPreset', nextMode);
  });

  lightQuickRow.appendChild(rainbowQuickBtn);
  lightQuickRow.appendChild(orbitQuickBtn);
  lightSection.appendChild(lightQuickRow);

  addSlider(
    lightSection,
    'lightAnimSpeed',
    'Light Motion / Rainbow Speed',
    0.15,
    2.5,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );

  const keyColorCell = document.createElement('label');
  keyColorCell.className = 'color-cell';
  keyColorCell.style.marginBottom = '9px';

  const keyColorSpan = document.createElement('span');
  keyColorSpan.textContent = 'Key Light Color';

  const keyColorPicker = document.createElement('input');
  keyColorPicker.type = 'color';
  keyColorPicker.value = sanitizeHexColor(state.keyColor, '#fff7ed');
  keyColorPicker.setAttribute('aria-label', 'Key Light Color');

  keyColorPicker.addEventListener('input', () => {
    const safeColor = sanitizeHexColor(keyColorPicker.value, state.keyColor || '#fff7ed');
    state.keyColor = safeColor;
    onChange('keyColor', safeColor);
  });

  keyColorCell.appendChild(keyColorSpan);
  keyColorCell.appendChild(keyColorPicker);
  lightSection.appendChild(keyColorCell);
  colorRefs.keyColor = keyColorPicker;

  addSlider(
    lightSection,
    'bloomStrength',
    'Gaussian Bloom',
    0.0,
    2.2,
    0.02,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'bloomRadius',
    'Bloom Radius',
    0.2,
    2.8,
    0.05,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'pointLightKelvin',
    'Point Light Temp',
    1800,
    12000,
    50,
    (v) => `${Math.round(v)}K`
  );
  addSlider(
    lightSection,
    'pointLightIntensity',
    'Point Intensity',
    0.0,
    4.0,
    0.05,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'lightAngle',
    'Key Light Angle',
    -180,
    180,
    1,
    (v) => `${Math.round(v)}°`
  );
  addSlider(
    lightSection,
    'lightIntensity',
    'Key Intensity',
    0.2,
    2.5,
    0.05,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'rimIntensity',
    'Rim Scatter',
    0.0,
    2.5,
    0.05,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'windStrength',
    'Wind Force',
    0.0,
    3.0,
    0.05,
    (v) => v.toFixed(2)
  );
  addSlider(
    lightSection,
    'windTurbulence',
    'Curl Turbulence',
    0.0,
    2.0,
    0.05,
    (v) => v.toFixed(2)
  );

  // --- Section 4b: Atmospheric Dust & Specular Air Effects ---
  const airSection = addSection('Air Dust & Specular Sparkles');

  const airToggleBtn = document.createElement('button');
  airToggleBtn.type = 'button';
  airToggleBtn.className = `action-btn ${state.airDustEnabled ? 'active' : ''}`;
  airToggleBtn.style.width = '100%';
  airToggleBtn.style.marginBottom = '8px';
  airToggleBtn.textContent = state.airDustEnabled
    ? '✦ Air Dust & Specular Sparkles: ON'
    : '✦ Air Dust & Specular Sparkles: OFF';
  airToggleBtn.addEventListener('click', () => {
    state.airDustEnabled = !state.airDustEnabled;
    airToggleBtn.classList.toggle('active', state.airDustEnabled);
    airToggleBtn.textContent = state.airDustEnabled
      ? '✦ Air Dust & Specular Sparkles: ON'
      : '✦ Air Dust & Specular Sparkles: OFF';
    onChange('airDustEnabled', state.airDustEnabled);
  });
  airSection.appendChild(airToggleBtn);

  const airStyleOptions = Object.values(AIR_DUST_STYLES).map((st) => ({
    value: st.id,
    label: st.name
  }));
  addDropdown(airSection, 'airDustStyle', 'Air Particle Style', airStyleOptions);

  addSlider(
    airSection,
    'airDustDensity',
    'Air Dust Density',
    0.05,
    1.0,
    0.05,
    (v) => `${Math.round(v * 100)}%`
  );
  addSlider(
    airSection,
    'airDustSparkle',
    'Specular Glint Flash',
    0.0,
    2.5,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );
  addSlider(
    airSection,
    'airDustSize',
    'Mote Bokeh Size',
    0.4,
    2.2,
    0.05,
    (v) => `${v.toFixed(2)}x`
  );

  // --- Section 5: Recording & Performance (Hidden per user preference; Retina enabled by default) ---
  const perfSection = addSection('Recording & Performance');
  perfSection.style.display = 'none';
  perfSection.setAttribute('aria-hidden', 'true');

  // --- Section 6: AR Camera Controls (Active only in AR Mode) ---
  const arSection = addSection('AR Camera Controls');
  arSection.className = 'ui-section ar-section';
  arSection.style.display = (state.environment === 'ar') ? 'block' : 'none';

  const arControlsWrap = document.createElement('div');
  arControlsWrap.className = 'ar-controls-wrap';

  const arStatusRow = document.createElement('div');
  arStatusRow.className = 'ar-status-row';

  const arStatusDot = document.createElement('span');
  arStatusDot.className = 'ar-status-dot';

  const arStatusText = document.createElement('span');
  arStatusText.className = 'ar-status-text';
  arStatusText.textContent = 'Ready for AR Camera';

  arStatusRow.appendChild(arStatusDot);
  arStatusRow.appendChild(arStatusText);
  arControlsWrap.appendChild(arStatusRow);

  const arPlaneRow = document.createElement('div');
  arPlaneRow.className = 'ar-plane-row';

  const arPlaneInfo = document.createElement('div');
  arPlaneInfo.className = 'ar-plane-info';

  const arPlaneDot = document.createElement('span');
  arPlaneDot.className = 'ar-plane-dot';

  const arPlaneText = document.createElement('span');
  arPlaneText.className = 'ar-plane-text';
  arPlaneText.textContent = 'Estimating plane from video...';

  arPlaneInfo.appendChild(arPlaneDot);
  arPlaneInfo.appendChild(arPlaneText);

  const arPlaneBadge = document.createElement('span');
  arPlaneBadge.className = 'ar-plane-badge';
  arPlaneBadge.textContent = '0 pts';

  arPlaneRow.appendChild(arPlaneInfo);
  arPlaneRow.appendChild(arPlaneBadge);
  arControlsWrap.appendChild(arPlaneRow);

  const arLightRow = document.createElement('div');
  arLightRow.className = 'ar-plane-row';

  const arLightInfo = document.createElement('div');
  arLightInfo.className = 'ar-plane-info';

  const arLightDot = document.createElement('span');
  arLightDot.className = 'ar-plane-dot';
  arLightDot.style.background = '#fffdf7';
  arLightDot.style.boxShadow = '0 0 6px rgba(253, 224, 71, 0.8)';

  const arLightText = document.createElement('span');
  arLightText.className = 'ar-plane-text';
  arLightText.textContent = 'Light Est: 5200K · 100% · -32°';

  arLightInfo.appendChild(arLightDot);
  arLightInfo.appendChild(arLightText);

  const arLightBadge = document.createElement('span');
  arLightBadge.className = 'ar-plane-badge';
  arLightBadge.textContent = '#fffdf7';

  arLightRow.appendChild(arLightInfo);
  arLightRow.appendChild(arLightBadge);
  arControlsWrap.appendChild(arLightRow);

  const arActionRow = document.createElement('div');
  arActionRow.className = 'action-row';

  let tapPlaceActive = true;
  const tapPlaceBtn = document.createElement('button');
  tapPlaceBtn.type = 'button';
  tapPlaceBtn.className = 'action-btn active';
  tapPlaceBtn.textContent = 'Tap to Place: ON';
  tapPlaceBtn.addEventListener('click', () => {
    tapPlaceActive = !tapPlaceActive;
    tapPlaceBtn.textContent = tapPlaceActive ? 'Tap to Place: ON' : 'Tap to Place: OFF';
    tapPlaceBtn.classList.toggle('active', tapPlaceActive);
    onChange('arToggleTapPlace', tapPlaceActive);
  });

  let lightEstActive = true;
  const lightEstBtn = document.createElement('button');
  lightEstBtn.type = 'button';
  lightEstBtn.className = 'action-btn active';
  lightEstBtn.textContent = 'Light Est: ON';
  lightEstBtn.addEventListener('click', () => {
    lightEstActive = !lightEstActive;
    lightEstBtn.textContent = lightEstActive ? 'Light Est: ON' : 'Light Est: OFF';
    lightEstBtn.classList.toggle('active', lightEstActive);
    onChange('arToggleLightEst', lightEstActive);
  });

  const resetPosBtn = document.createElement('button');
  resetPosBtn.type = 'button';
  resetPosBtn.className = 'action-btn';
  resetPosBtn.textContent = 'Reset';
  resetPosBtn.addEventListener('click', () => {
    onChange('arResetPosition', true);
  });

  arActionRow.appendChild(tapPlaceBtn);
  arActionRow.appendChild(lightEstBtn);
  arActionRow.appendChild(resetPosBtn);
  arControlsWrap.appendChild(arActionRow);

  const arBtnRow = document.createElement('div');
  arBtnRow.className = 'action-row';

  const mirrorBtn = document.createElement('button');
  mirrorBtn.type = 'button';
  mirrorBtn.className = 'action-btn';
  mirrorBtn.textContent = 'Mirror: ON';
  mirrorBtn.addEventListener('click', () => {
    onChange('arToggleMirror', true);
  });

  const flipBtn = document.createElement('button');
  flipBtn.type = 'button';
  flipBtn.className = 'action-btn';
  flipBtn.textContent = 'Flip / Retry Cam';
  flipBtn.addEventListener('click', () => {
    onChange('arFlipCamera', true);
  });

  arBtnRow.appendChild(mirrorBtn);
  arBtnRow.appendChild(flipBtn);
  arControlsWrap.appendChild(arBtnRow);
  arSection.appendChild(arControlsWrap);

  function updateGPUFurModeUI(isGpuFur) {
    const enabled = Boolean(isGpuFur);
    state.gpuFurEnabled = enabled;

    topGpuFurPill.classList.toggle('active', enabled);
    topGpuFurPill.setAttribute('aria-pressed', String(enabled));
    topGpuLabel.textContent = enabled ? 'WebGPU Fur: ON' : 'WebGL Mode: ON';

    webglModeBtn.classList.toggle('active', !enabled);
    webglModeBtn.setAttribute('aria-pressed', String(!enabled));
    gpuFurModeBtn.classList.toggle('active', enabled);
    gpuFurModeBtn.setAttribute('aria-pressed', String(enabled));

    if (sliderRefs.furDensity) {
      sliderRefs.furDensity.valSpan.textContent = sliderRefs.furDensity.formatFn(state.furDensity);
    }
  }

  topGpuFurPill.addEventListener('click', () => {
    const next = !state.gpuFurEnabled;
    updateGPUFurModeUI(next);
    onChange('toggleGPUFur', next);
  });

  webglModeBtn.addEventListener('click', () => {
    if (state.gpuFurEnabled) {
      updateGPUFurModeUI(false);
      onChange('toggleGPUFur', false);
    }
  });

  gpuFurModeBtn.addEventListener('click', () => {
    if (!state.gpuFurEnabled) {
      updateGPUFurModeUI(true);
      onChange('toggleGPUFur', true);
    }
  });

  updateGPUFurModeUI(Boolean(state.gpuFurEnabled));

  function updateEnvSelectionUI(activeId) {
    const safeId = sanitizeEnvId(activeId, 'studio');
    Object.keys(sceneButtons).forEach((id) => {
      const isSel = id === safeId;
      sceneButtons[id].classList.toggle('active', isSel);
      sceneButtons[id].setAttribute('aria-selected', String(isSel));
    });
    Object.keys(mobileSceneButtons).forEach((id) => {
      const isSel = id === safeId;
      mobileSceneButtons[id].classList.toggle('active', isSel);
      mobileSceneButtons[id].setAttribute('aria-selected', String(isSel));
    });
    const matchedPreset = ENVIRONMENT_PRESETS.find((e) => e.id === safeId);
    if (matchedPreset && mobileBtnScene) {
      mobileBtnScene.textContent = matchedPreset.name;
    }
    if (arSection) {
      arSection.style.display = safeId === 'ar' ? 'block' : 'none';
    }
  }

  return {
    syncUI() {
      Object.keys(sliderRefs).forEach((k) => {
        if (state[k] !== undefined) {
          sliderRefs[k].input.value = String(state[k]);
          sliderRefs[k].valSpan.textContent = sliderRefs[k].formatFn(state[k]);
        }
      });
      Object.keys(colorRefs).forEach((k) => {
        if (state[k] !== undefined) {
          colorRefs[k].value = state[k];
        }
      });
      Object.keys(selectRefs).forEach((k) => {
        if (state[k] !== undefined) {
          selectRefs[k].value = String(state[k]);
        }
      });
      Object.keys(moodButtonRefs).forEach((id) => {
        moodButtonRefs[id].classList.toggle('active', id === (state.mood || 'happy'));
      });
      Object.keys(songButtons).forEach((id) => {
        songButtons[id].classList.toggle('active', id === (state.songPreset || 'sakura'));
      });
      rainbowQuickBtn.classList.toggle('active', state.lightPreset === 'rainbow');
      orbitQuickBtn.classList.toggle('active', state.lightPreset === 'goldenSweep');
      airToggleBtn.classList.toggle('active', Boolean(state.airDustEnabled));
      airToggleBtn.textContent = state.airDustEnabled
        ? '✦ Air Dust & Specular Sparkles: ON'
        : '✦ Air Dust & Specular Sparkles: OFF';
      shadowToggleBtn.classList.toggle('active', Boolean(state.shadowPassEnabled));
      shadowToggleBtn.textContent = state.shadowPassEnabled
        ? '☀ 2048px Fur Shadow Map Pass: ON'
        : '☀ 2048px Fur Shadow Map Pass: OFF';
      toggleGizmoBtn.classList.toggle('active', Boolean(state.showBrushGizmo));
      toggleGizmoBtn.textContent = state.showBrushGizmo ? 'Brush Ring: ON' : 'Brush Ring: OFF';
      updateEnvSelectionUI(state.environment || 'studio');
      updateGPUFurModeUI(Boolean(state.gpuFurEnabled));
    },
    setMicStatus({ isActive, isFallbackSynth, statusText }) {
      const active = Boolean(isActive);
      state.micEnabled = active;
      topMicPill.classList.toggle('active', active);
      topMicLabel.textContent = active
        ? (isFallbackSynth ? '🎤 Audio Demo' : '🎤 Mic: LIVE')
        : '🎤 Mic Audio';
      micToggleBtn.classList.toggle('active', active);
      micToggleBtn.textContent = active
        ? '⏹ Stop Microphone Analyzer'
        : '🎤 Enable Live Microphone Audio';
      micStatusBanner.textContent =
        statusText || 'Mic Off · Click to vibrate fur & pulse colors to music';
    },
    setSingingStatus({ statusText, isSinging, lyric }) {
      topSingPill.classList.toggle('active', Boolean(isSinging));
      topSingLabel.textContent = isSinging ? '⏹ Singing' : '♪ Sing';
      singPrimaryBtn.classList.toggle('active', Boolean(isSinging));
      singPrimaryBtn.textContent = isSinging
        ? '⏹ Stop Singing'
        : '♪ Sing Song (Lyra + Gemini TTS)';
      if (lyric && isSinging) {
        singStatusBanner.textContent = `♪ ${lyric}`;
      } else {
        singStatusBanner.textContent = statusText || 'Ready · Select a song or click Sing';
      }
    },
    setGPUFurEnabled(enabled) {
      updateGPUFurModeUI(Boolean(enabled));
    },
    setActiveEnvironment(envId) {
      const safeEnv = sanitizeEnvId(envId, 'studio');
      state.environment = safeEnv;
      updateEnvSelectionUI(safeEnv);
    },
    setARStatus(statusText, isLive) {
      arStatusText.textContent = String(statusText || '');
      arStatusDot.classList.toggle('live', Boolean(isLive));
    },
    setARPlaneStatus(surfaceType, planeY, confidence, featureCount) {
      const confPct = Math.round((confidence || 0.9) * 100);
      arPlaneText.textContent = `${surfaceType} (${confPct}% conf)`;
      arPlaneBadge.textContent = `${featureCount || 0} pts`;
    },
    setARLightStatus(lightInfo) {
      if (!lightInfo) return;
      const safeHex = sanitizeHexColor(lightInfo.keyColor, '#fffdf7');
      if (lightInfo.isManualReset) {
        arLightDot.style.background = '#94a3b8';
        arLightDot.style.boxShadow = 'none';
        arLightText.textContent = 'Light Est: OFF (Manual Studio Light)';
        arLightBadge.textContent = 'MANUAL';
      } else {
        arLightDot.style.background = safeHex;
        arLightDot.style.boxShadow = `0 0 8px ${safeHex}`;
        arLightText.textContent = `Webcam Light: ${lightInfo.kelvin || 5200}K · ${lightInfo.luminancePct || 100}% · ${Math.round(lightInfo.lightAngle || 0)}°`;
        arLightBadge.textContent = safeHex;
      }
      if (colorRefs.keyColor) {
        colorRefs.keyColor.value = safeHex;
      }
      ['lightAngle', 'lightIntensity', 'rimIntensity'].forEach((k) => {
        if (sliderRefs[k] && state[k] !== undefined) {
          sliderRefs[k].input.value = String(state[k]);
          sliderRefs[k].valSpan.textContent = sliderRefs[k].formatFn(state[k]);
        }
      });
    },
    setLightEstActive(isActive) {
      lightEstActive = Boolean(isActive);
      lightEstBtn.textContent = lightEstActive ? 'Light Est: ON' : 'Light Est: OFF';
      lightEstBtn.classList.toggle('active', lightEstActive);
    },
    setSurfaceTrackedStatus(isLocked, confidence) {
      if (isLocked) {
        arPlaneDot.style.background = '#4ade80';
        arPlaneDot.style.boxShadow = '0 0 6px rgba(74, 222, 128, 0.8)';
        arPlaneBadge.textContent = `${confidence}% lock`;
        arPlaneBadge.style.color = '#86efac';
        arPlaneBadge.style.borderColor = '#4ade80';
      } else {
        arPlaneDot.style.background = '#38bdf8';
        arPlaneDot.style.boxShadow = '0 0 6px rgba(56, 189, 248, 0.7)';
        arPlaneBadge.style.color = '#7dd3fc';
        arPlaneBadge.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      }
    },
    setTapPlaceActive(isActive) {
      tapPlaceActive = Boolean(isActive);
      tapPlaceBtn.textContent = tapPlaceActive ? 'Tap to Place: ON' : 'Tap to Place: OFF';
      tapPlaceBtn.classList.toggle('active', tapPlaceActive);
    },
    setMirrorLabel(isMirrored) {
      mirrorBtn.textContent = isMirrored ? 'Mirror: ON' : 'Mirror: OFF';
    }
  };
}
