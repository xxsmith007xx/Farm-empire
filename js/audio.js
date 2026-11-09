/* Farm Empire — music and sound effects, synthesised live with the Web Audio API.
 * No audio files: everything is generated, so it works offline and has no licensing.
 *
 * Music: a looping tune (verse A A B A) with bass, plucked chords, a marimba melody and
 * light drums. Each farm location has its own key, tempo and feel.
 * Sound effects: FarmAudio.play('coin'), FarmAudio.play('hatch'), … (see SFX below). */
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, out = null, musicBus = null, sfxBus = null, verb = null, noiseBuf = null;
  let musicOn = true, sfxOn = true, unlocked = false, song = 0;
  const MUSIC_VOL = .32, SFX_VOL = .8;

  // ---------- audio graph ----------
  function build(c) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    comp.connect(c.destination);
    const master = c.createGain(); master.gain.value = .9; master.connect(comp);
    const mb = c.createGain(); mb.gain.value = musicOn ? MUSIC_VOL : 0; mb.connect(master);
    const sb = c.createGain(); sb.gain.value = sfxOn ? SFX_VOL : 0; sb.connect(master);
    // Small generated reverb for warmth
    const rv = c.createConvolver(), len = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rv.buffer = ir;
    const rvGain = c.createGain(); rvGain.gain.value = .22; rv.connect(rvGain); rvGain.connect(master);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return { comp, master, mb, sb, rv, nb };
  }
  function ensure() {
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      const g = build(ctx); out = g.master; musicBus = g.mb; sfxBus = g.sb; verb = g.rv; noiseBuf = g.nb;
    }
    if (ctx.state === 'suspended' && unlocked && !document.hidden) ctx.resume();
    return true;
  }

  // ---------- instruments ----------
  // Each voice schedules nodes at time `t` into `bus`. `wet` sends some signal to the reverb.
  function env(g, t, a, peak, d, sustain) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
  }
  function voice(t, bus, wet) {
    const g = ctx.createGain(); g.connect(bus);
    if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); }
    return g;
  }
  function osc(type, f, t, end, dest) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end); return o;
  }
  const I = {
    pluck(t, m, dur, vol, bus) {
      const g = voice(t, bus, .25), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur); lp.connect(g);
      env(g, t, .005, vol, dur);
      osc('triangle', mtof(m), t, t + dur + .05, lp); osc('sawtooth', mtof(m) * 1.003, t, t + dur + .05, lp).detune.value = 6;
    },
    marimba(t, m, dur, vol, bus) {
      const g = voice(t, bus, .35), f = mtof(m);
      env(g, t, .004, vol, Math.min(1.2, dur + .3));
      osc('sine', f, t, t + dur + .4, g);
      const g2 = ctx.createGain(); g2.connect(g); env(g2, t, .002, .35, .08); osc('sine', f * 4, t, t + .12, g2);
    },
    bass(t, m, dur, vol, bus) {
      const g = voice(t, bus), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2; lp.connect(g);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc('square', mtof(m), t, t + dur + .02, lp); osc('sine', mtof(m), t, t + dur + .02, g);
    },
    bell(t, m, dur, vol, bus) {
      const g = voice(t, bus, .4), f = mtof(m);
      env(g, t, .003, vol, dur);
      osc('sine', f, t, t + dur + .05, g);
      const g2 = ctx.createGain(); g2.gain.value = .3; g2.connect(g); osc('sine', f * 2.76, t, t + dur * .5, g2);
    },
    brass(t, m, dur, vol, bus) {
      const g = voice(t, bus, .3), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + .06); lp.frequency.exponentialRampToValueAtTime(1200, t + dur); lp.connect(g);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .04); g.gain.setValueAtTime(vol * .8, t + dur * .75); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .15);
      osc('sawtooth', mtof(m), t, t + dur + .2, lp); osc('sawtooth', mtof(m) * 1.005, t, t + dur + .2, lp);
    },
    kick(t, vol, bus) {
      const g = voice(t, bus); env(g, t, .002, vol, .28);
      const o = osc('sine', 130, t, t + .3, g); o.frequency.exponentialRampToValueAtTime(42, t + .18);
    },
    noise(t, dur, vol, bus, type, freq, q, wet) {
      const g = voice(t, bus, wet), f = ctx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.setValueAtTime(freq || 7000, t); f.Q.value = q || .7; f.connect(g);
      env(g, t, .002, vol, dur);
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.connect(f); n.start(t, Math.random() * .5); n.stop(t + dur + .05);
      return f;
    },
    sweep(t, f0, f1, dur, vol, bus, type) {
      const g = voice(t, bus, .2); env(g, t, .005, vol, dur);
      const o = osc(type || 'sine', f0, t, t + dur + .05, g); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    }
  };

  // ---------- music ----------
  // Farm locations (matches FarmArt.PALETTES order): key, tempo, swing and feel.
  const SONGS = [
    { root: 60, bpm: 112, swing: .1, drums: 1 },          // Sunny Acres — bright, bouncy
    { root: 65, bpm: 100, swing: .16, drums: .8 },        // Golden Valley — laid-back sunset
    { root: 62, bpm: 120, swing: .06, drums: 1 },         // Breezy Highlands — brisk
    { root: 57, bpm: 78, swing: .12, drums: 0, night: 1 } // Starlight Fields — gentle lullaby
  ];
  const PROG = {
    A: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],  // I  V  vi IV
    B: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]]   // vi IV I  V
  };
  const FORM = ['A', 'A', 'B', 'A'];
  const PENTA = [0, 2, 4, 7, 9];
  const RHYTHMS = [
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  ];
  const ENDING = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
  // Compose a 4-bar melody for a section once, so it repeats (catchy!) every time it plays.
  function compose(songIdx, section) {
    const r = rng(1234 + songIdx * 97 + section.charCodeAt(0) * 13), notes = [];
    const scale = []; for (let o = 0; o < 2; o++) PENTA.forEach(p => scale.push(12 + o * 12 + p));
    let idx = 4 + Math.floor(r() * 3);
    for (let bar = 0; bar < 4; bar++) {
      const rhythm = bar === 3 ? ENDING : RHYTHMS[Math.floor(r() * RHYTHMS.length)], chord = PROG[section][bar];
      for (let st = 0; st < 16; st++) {
        if (!rhythm[st]) continue;
        if (st % 8 === 0) { // strong beats land on a chord tone near the last note
          const targets = scale.map((n, i) => [i, n]).filter(([, n]) => chord.some(c => (n - c) % 12 === 0));
          targets.sort((a, b) => Math.abs(a[0] - idx) - Math.abs(b[0] - idx));
          idx = targets[Math.floor(r() * Math.min(2, targets.length))][0];
        } else idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)]));
        let len = 1; while (st + len < 16 && !rhythm[st + len]) len++;
        notes.push({ step: bar * 16 + st, m: scale[idx], len });
      }
    }
    return notes;
  }
  const melodies = {};
  function melody(si, sec) { const k = si + sec; return melodies[k] || (melodies[k] = compose(si, sec)); }

  // Schedule one 16th-note step of the song at time t.
  function playStep(t, step, si, bus, sd) {
    const S = SONGS[si], bar = Math.floor(step / 16) % 16, st = step % 16, sec = FORM[Math.floor(bar / 4)], loop = Math.floor(step / 256);
    const chord = PROG[sec][bar % 4], root = S.root + chord[0], night = S.night;
    // Bass
    if (st === 0 || st === 8) I.bass(t, root - 24, sd * (night ? 7 : 5), night ? .2 : .26, bus);
    if (!night && (st === 6 || st === 14)) I.bass(t, root - 24 + 7, sd * 1.5, .18, bus);
    // Plucked chord arpeggio on 8ths
    if (st % 2 === 0) {
      const tone = chord[[0, 1, 2, 1][(st / 2) % 4]] + S.root + (night ? 12 : 0);
      I.pluck(t, tone, sd * 2.2, night ? .05 : .065, bus);
    }
    // Melody (an octave up on every other loop of the B section for variety)
    const mel = melody(si, sec), local = (bar % 4) * 16 + st;
    mel.forEach(n => { if (n.step === local) I.marimba(t, S.root + n.m + (sec === 'B' && loop % 2 ? 12 : 0), n.len * sd, night ? .14 : .17, bus); });
    // Drums (dropped for a breather in the last bar of each section)
    if (S.drums && bar % 4 !== 3 || (S.drums && st < 8)) {
      if (st === 0 || st === 8 || (sec === 'B' && st === 10)) I.kick(t, .5 * S.drums, bus);
      if (st === 4 || st === 12) I.noise(t, .12, .12 * S.drums, bus, 'bandpass', 1800, 1.2, .2);
    }
    if (st % 2 === 0 || !night) I.noise(t, .035, (st % 4 === 2 ? .07 : .03) * (night ? .5 : 1), bus, 'highpass', 8000);
  }

  let step = 0, nextT = 0, timer = null;
  function scheduler() {
    if (!ctx || !musicOn || ctx.state !== 'running') return;
    const S = SONGS[song], sd = 60 / S.bpm / 4;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + .05;
    while (nextT < ctx.currentTime + .15) {
      playStep(nextT + (step % 2 ? S.swing * sd : 0), step, song, musicBus, sd);
      nextT += sd; step++;
    }
  }
  function startMusic() { if (!timer) timer = setInterval(scheduler, 30); }

  // ---------- sound effects ----------
  const last = {};
  let coinCombo = 0, coinComboAt = 0;
  function limit(name, gap) { const now = performance.now(); if (now - (last[name] || 0) < gap) return false; last[name] = now; return true; }
  const SFX = {
    tap(t, b) { I.noise(t, .025, .15, b, 'bandpass', 2500, 2); },
    pop(t, b) { I.sweep(t, 380, 950, .06, .14, b); },
    hatch(t, b, o) { // shell cracks, then a chick cheeps
      const v = o && o.quiet ? .45 : 1;
      I.noise(t, .03, .6 * v, b, 'bandpass', 3200, 3); I.noise(t + .045, .025, .48 * v, b, 'bandpass', 4200, 3);
      I.sweep(t + .09, 2100, 2900, .05, .22 * v, b, 'triangle'); I.sweep(t + .17, 2300, 3100, .05, .19 * v, b, 'triangle');
    },
    cluck(t, b) {
      const f = 480 + Math.random() * 120;
      [0, .09, .2].forEach((d, i) => {
        I.noise(t + d, .06 + i * .03, .3, b, 'bandpass', f * (i === 2 ? .8 : 1.1) * 2, 6);
        I.sweep(t + d, f * (i === 2 ? 1.2 : 1), f * (i === 2 ? .7 : .95), .05 + i * .04, .05, b, 'square');
      });
    },
    coin(t, b) { // pitch climbs when you collect quickly
      const now = performance.now(); coinCombo = now - coinComboAt < 1500 ? Math.min(12, coinCombo + 1) : 0; coinComboAt = now;
      I.bell(t, 83 + coinCombo, .12, .22, b); I.bell(t + .07, 88 + coinCombo, .35, .22, b);
    },
    tick(t, b, o) { I.bell(t, 91 + ((o && o.i) || 0) % 8, .08, .07, b); },
    buy(t, b) { I.pluck(t, 72, .1, .22, b); I.pluck(t + .07, 79, .18, .22, b); [91, 95, 98].forEach((m, i) => I.bell(t + .1 + i * .04, m, .2, .06, b)); },
    build(t, b) { I.kick(t, .5, b); I.noise(t, .25, .15, b, 'lowpass', 900); [72, 76, 79, 84].forEach((m, i) => I.marimba(t + .06 + i * .05, m, .3, .16, b)); },
    fail(t, b) { I.sweep(t, 300, 220, .09, .14, b, 'square'); I.sweep(t + .11, 220, 160, .12, .14, b, 'square'); },
    whoosh(t, b) { const f = I.noise(t, .35, .8, b, 'bandpass', 600, 1.5); f.frequency.exponentialRampToValueAtTime(3500, t + .3); },
    crate(t, b) { I.noise(t, .12, .35, b, 'lowpass', 1500); I.kick(t, .35, b); [84, 88, 91, 96].forEach((m, i) => I.bell(t + .05 + i * .035, m, .25, .1, b)); },
    gift(t, b) { [72, 76, 79, 84, 88].forEach((m, i) => I.bell(t + i * .07, m, .5, .14, b)); },
    boost(t, b) { I.sweep(t, 200, 1600, .45, .12, b, 'sawtooth'); [72, 79, 84].forEach(m => I.brass(t + .4, m, .45, .09, b)); },
    achievement(t, b) { [79, 84, 88, 91].forEach((m, i) => I.bell(t + i * .09, m, .7, .15, b)); },
    welcome(t, b) { [67, 72, 76].forEach((m, i) => I.marimba(t + i * .12, m, .6, .18, b)); },
    discover(t, b) { fanfare(t, b, 60, 1); },
    prestige(t, b) { fanfare(t, b, 62, 1.35); },
    tab(t, b) { I.noise(t, .015, .08, b, 'bandpass', 3500, 2); }
  };
  function fanfare(t, b, root, size) {
    duck(.25, 3 * size);
    const seq = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [12, 16, 19]];
    seq.forEach((ch, i) => {
      const d = i === 3 ? .9 * size : .2;
      ch.forEach(n => I.brass(t + i * .2, root + n, d, .08, b));
      I.kick(t + i * .2, i === 3 ? .8 : .45, b);
    });
    I.noise(t + .6, 1.2, .12, b, 'highpass', 5000, .7, .5); // cymbal
    [0, 4, 7, 12, 16].forEach((n, i) => I.bell(t + .7 + i * .06, root + 24 + n, .8, .08, b));
  }
  function duck(level, seconds) {
    if (!musicBus || !musicOn) return;
    const g = musicBus.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MUSIC_VOL * level, now + .08);
    g.setValueAtTime(MUSIC_VOL * level, now + seconds);
    g.linearRampToValueAtTime(MUSIC_VOL, now + seconds + 1);
  }
  const GAPS = { tap: 40, pop: 90, hatch: 110, cluck: 1500, tick: 45, coin: 60, fail: 150, buy: 60, build: 100, whoosh: 200, crate: 200 };
  function play(name, opts) {
    if (!sfxOn || !ensure() || ctx.state !== 'running' || !SFX[name]) return;
    if (GAPS[name] && !limit(name, GAPS[name])) return;
    SFX[name](ctx.currentTime + .01, sfxBus, opts);
  }

  // ---------- lifecycle ----------
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (!ensure()) return;
    ctx.resume().then(startMusic);
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume();
  });
  function fadeBus(bus, on, vol) {
    if (!bus) return;
    const now = ctx.currentTime; bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(on ? vol : 0, now + .4);
  }

  // Render a few seconds of music offline (for testing levels without speakers).
  async function renderPreview(seconds, songIdx, sfxNames) {
    const sr = 44100, oc = new OfflineAudioContext(2, sr * seconds, sr);
    const keep = [ctx, out, musicBus, sfxBus, verb, noiseBuf];
    ctx = oc; const g = build(oc); out = g.master; musicBus = g.mb; sfxBus = g.sb; verb = g.rv; noiseBuf = g.nb;
    musicBus.gain.value = MUSIC_VOL; sfxBus.gain.value = SFX_VOL;
    try {
      if (songIdx >= 0) { // songIdx -1 renders effects only
        const S = SONGS[songIdx], sd = 60 / S.bpm / 4;
        for (let st = 0, tt = 0; tt < seconds - .5; st++, tt += sd) playStep(tt + (st % 2 ? S.swing * sd : 0), st, songIdx, musicBus, sd);
      }
      (sfxNames || []).forEach((n, i) => SFX[n](.3 + i * 1.2, sfxBus));
      return await oc.startRendering();
    } finally { [ctx, out, musicBus, sfxBus, verb, noiseBuf] = keep; }
  }

  window.FarmAudio = {
    play,
    duck,
    setMusic(on) { musicOn = on; if (ctx) fadeBus(musicBus, on, MUSIC_VOL); if (on && unlocked) startMusic(); },
    setSfx(on) { sfxOn = on; if (ctx) fadeBus(sfxBus, on, SFX_VOL); },
    setSong(i) { const n = ((i % SONGS.length) + SONGS.length) % SONGS.length; if (n !== song) { song = n; step = 0; } },
    get state() { return ctx ? ctx.state : 'none'; },
    SFX_NAMES: Object.keys(SFX),
    renderPreview
  };
})();
