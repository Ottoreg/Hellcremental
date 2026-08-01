/* =========================================================================
 * Hellcremental — Bande-son (hard rock / métal) synthétisée en Web Audio.
 * Aucune ressource audio externe : accords de puissance saturés + basse +
 * batterie, générés et bouclés en temps réel. Un seul point d'entrée public :
 * HellMusic.toggle() / .setEnabled() / .isEnabled() / .kick() (démarre sur un
 * geste utilisateur, exigé par les navigateurs).
 * ========================================================================= */
const HellMusic = (function () {
  const BPM = 148;
  const STEP = 60 / BPM / 4;      // durée d'un seizième de temps (s)
  const LOOP_STEPS = 64;          // 4 mesures de 16 pas

  // Progression métal (mi mineur) : Em – Em – C – D, une par mesure.
  // Notes MIDI des fondamentales (E2=40, C2=36, D2=38).
  const RIFF = [40, 40, 36, 38];

  const DRUM_LEVEL = 0.72;        // niveau du bus batterie (baissé pour laisser passer le riff)
  const DROP_EVERY = 3;           // un « drop » (climax) toutes les 3 boucles

  let ctx = null, master = null, comp = null, drumBus = null;
  let running = false, enabled = false, timer = null;
  let curStep = 0, nextTime = 0, loopIdx = 0;
  let noiseBuf = null;

  const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function makeNoise(ac) {
    const buf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------------- Instruments (ac = contexte audio, dest = sortie) ---------------- */

  // Accord de puissance : fondamentale + quinte + octave. Grain « saturé »
  // obtenu par empilement de saws désaccordées (thick) + bosse de présence, SANS
  // WaveShaperNode (celui-ci provoque un fondu progressif du signal sous Chromium,
  // en rendu hors-ligne ET en temps réel — bug avéré).
  function powerChord(ac, dest, rootMidi, t, dur, gain) {
    const bite = ac.createBiquadFilter();       // bosse médium = mordant « guitare »
    bite.type = 'peaking'; bite.frequency.value = 1500; bite.Q.value = 1.1; bite.gain.value = 7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    bite.connect(lp); lp.connect(g); g.connect(dest);
    for (const semi of [0, 7, 12]) {
      for (const det of [-7, 7]) {              // deux saws désaccordées par note
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midiHz(rootMidi + semi);
        o.detune.value = det;
        o.connect(bite);
        o.start(t); o.stop(t + dur + 0.02);
      }
    }
  }

  function bass(ac, dest, rootMidi, t, dur, gain) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    lp.connect(g); g.connect(dest);
    const o = ac.createOscillator();            // corps (scie)
    o.type = 'sawtooth'; o.frequency.value = midiHz(rootMidi - 12); o.connect(lp);
    const o2 = ac.createOscillator();           // grain (carré) mixé plus bas
    o2.type = 'square'; o2.frequency.value = midiHz(rootMidi - 12);
    const g2 = ac.createGain(); g2.gain.value = 0.45; o2.connect(g2); g2.connect(lp);
    o.start(t); o.stop(t + dur + 0.02);
    o2.start(t); o2.stop(t + dur + 0.02);
  }

  function kick(ac, dest, t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.22);
  }

  function snare(ac, dest, t, vel) {
    const v = vel == null ? 0.9 : vel;
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(v, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(bp); bp.connect(ng); ng.connect(dest);
    n.start(t); n.stop(t + 0.18);
    // Corps tonal.
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    og.gain.setValueAtTime(v * 0.56, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(dest);
    o.start(t); o.stop(t + 0.12);
  }

  // Crash : coup de cymbale (bruit large, longue traîne) pour marquer le drop.
  function crash(ac, dest, t) {
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    n.connect(hp); hp.connect(g); g.connect(dest);
    n.start(t); n.stop(t + 0.85);
  }

  function hat(ac, dest, t, open) {
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ac.createGain();
    const dur = open ? 0.12 : 0.035;
    g.gain.setValueAtTime(open ? 0.28 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp); hp.connect(g); g.connect(dest);
    n.start(t); n.stop(t + dur + 0.02);
  }

  /* ---------------- Motif : programme un pas du loop ----------------
   * inst = bus instruments (guitare/basse), drum = bus batterie (baissé).
   * loopIdx = numéro de boucle absolu (pour les drops périodiques). */
  function scheduleStep(ac, inst, drum, step, time, loopIdx) {
    const bar = Math.floor(step / 16) % RIFF.length;
    const s = step % 16;
    const root = RIFF[bar];
    const phase = ((loopIdx % DROP_EVERY) + DROP_EVERY) % DROP_EVERY;
    const inFill = phase === DROP_EVERY - 1 && step >= 48;      // dernière mesure → montée
    const dropHit = step === 0 && loopIdx > 0 && phase === 0;   // downbeat suivant → drop

    if (dropHit) {
      // Climax : crash + gros accord de puissance tenu + frappe lourde.
      crash(ac, drum, time);
      kick(ac, drum, time);
      snare(ac, drum, time, 0.8);
      powerChord(ac, inst, root + 12, time, STEP * 6, 0.26);
      bass(ac, inst, root, time, STEP * 6, 0.30);
      return;
    }

    if (inFill) {
      // Build-up : roulement de caisse claire crescendo, guitare en tension.
      const prog = (step - 48) / 16;                           // 0 → 1 sur la mesure
      snare(ac, drum, time, 0.16 + prog * 0.55);
      if (s % 4 === 0) powerChord(ac, inst, root + 12, time, STEP * 1.2, 0.11);
      if (s % 2 === 0) bass(ac, inst, root, time, STEP * 1.6, 0.17);
      if (s % 4 === 2) hat(ac, drum, time, false);
      return;
    }

    // Motif normal.
    // Guitare : chug en croches (palm-mute), avec accents un peu plus longs.
    if (s % 2 === 0) {
      const accent = (s === 0 || s === 8);
      powerChord(ac, inst, root + 12, time, STEP * (accent ? 3.4 : 1.5), accent ? 0.19 : 0.15);
    }
    // Basse : croches sur la fondamentale.
    if (s % 2 === 0) bass(ac, inst, root, time, STEP * 1.9, 0.24);

    // Batterie.
    if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) kick(ac, drum, time);
    if (s === 4 || s === 12) snare(ac, drum, time);            // backbeat (temps 2 & 4)
    if (s % 2 === 0) hat(ac, drum, time, s === 6 || s === 14); // charley, ouvert avant le backbeat
  }

  /* ---------------- Ordonnanceur temps réel (lookahead) ---------------- */
  function loop() {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(ctx, master, drumBus, curStep, nextTime, loopIdx);
      nextTime += STEP;
      curStep++;
      if (curStep >= LOOP_STEPS) { curStep = 0; loopIdx++; }
    }
    timer = setTimeout(loop, 25);
  }

  function ensureCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noiseBuf = makeNoise(ctx);
    master = ctx.createGain();
    master.gain.value = 0.0;
    // Bus batterie (niveau baissé pour laisser passer le riff).
    drumBus = ctx.createGain();
    drumBus.gain.value = DRUM_LEVEL;
    drumBus.connect(master);
    // Compresseur pour « coller » le mix et éviter les crêtes.
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
  }

  function start() {
    ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    // Fondu d'entrée doux.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.66, ctx.currentTime + 0.8);
    if (running) return;
    running = true;
    curStep = 0; loopIdx = 0;
    nextTime = ctx.currentTime + 0.08;
    loop();
  }

  function stop() {
    if (!ctx) { running = false; return; }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.4);
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  /* ---------------- API publique ---------------- */
  const KEY = 'hellcremental_music';
  function load() {
    try { enabled = localStorage.getItem(KEY) === '1'; } catch (e) { enabled = false; }
    return enabled;
  }
  function save() { try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {} }

  return {
    isEnabled: () => enabled,
    load,
    /* Démarre si activé (à appeler sur un geste utilisateur). */
    kick() { if (enabled) start(); },
    setEnabled(on) { enabled = on; save(); if (on) start(); else stop(); },
    toggle() { this.setEnabled(!enabled); return enabled; },

    /* Rend `seconds` de musique hors-ligne (aperçu .wav). Renvoie un AudioBuffer. */
    async renderOffline(seconds) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const sr = 44100;
      const oac = new OAC(2, Math.ceil(sr * seconds), sr);
      noiseBuf = makeNoise(oac);
      const m = oac.createGain(); m.gain.value = 0.66;
      const dbus = oac.createGain(); dbus.gain.value = DRUM_LEVEL; dbus.connect(m);
      const c = oac.createDynamicsCompressor();
      c.threshold.value = -10; c.ratio.value = 8; c.attack.value = 0.003; c.release.value = 0.2;
      m.connect(c); c.connect(oac.destination);
      let t = 0.05, step = 0, li = 0;
      while (t < seconds - STEP) {
        scheduleStep(oac, m, dbus, step, t, li);
        t += STEP; step++;
        if (step >= LOOP_STEPS) { step = 0; li++; }
      }
      return await oac.startRendering();
    },
  };
})();
