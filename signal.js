/* TOFFLER signal engine — static -> robotic bleeps & glitch -> static, looping,
   like a radio drifting across a transmission and back into interference.
   Pure WebAudio, no samples. createSignal() only SCHEDULES events up to a horizon
   (scheduleUntil), so the same code drives a live AudioContext (play) and an
   OfflineAudioContext (the render test). */
(function(root){
"use strict";

function createSignal(ac, dest, rng){
  rng = rng || Math.random;
  const rand = (a,b)=>a+rng()*(b-a);
  const pick = arr=>arr[Math.floor(rng()*arr.length)];

  /* ---- graph: everything -> master -> compressor -> dest ---- */
  const master = ac.createGain(); master.gain.value = 1;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6;
  comp.attack.value = 0.003; comp.release.value = 0.2;
  master.connect(comp); comp.connect(dest);

  const bed = ac.createGain();   bed.gain.value = 1;   bed.connect(master);
  const hiss = ac.createGain();  hiss.gain.value = 0;  hiss.connect(master);
  const burst = ac.createGain(); burst.gain.value = 1; burst.connect(master);

  /* synth bus is bit-crushed: amplitude quantised to 16 levels */
  const crush = ac.createWaveShaper();
  const curve = new Float32Array(2048);
  for(let i=0;i<curve.length;i++){ const x=i/(curve.length-1)*2-1; curve[i]=Math.round(x*8)/8; }
  crush.curve = curve;
  const synth = ac.createGain(); synth.gain.value = 3.6;
  crush.connect(synth); synth.connect(master);

  /* ---- noise ---- */
  const nlen = ac.sampleRate*2;
  const nbuf = ac.createBuffer(1, nlen, ac.sampleRate);
  const nd = nbuf.getChannelData(0);
  for(let i=0;i<nlen;i++) nd[i] = rng()*2-1;
  function noise(t, dur){            // one-shot slice of the noise buffer
    const s = ac.createBufferSource(); s.buffer = nbuf;
    s.start(t, rng()*(2-dur-0.05), dur);
    return s;
  }

  /* ---- the static bed: drone + filtered wind (the original sound) ---- */
  const oscs = [55, 55.7, 82.4].map((f,i)=>{
    const o = ac.createOscillator(); o.type = i<2?"sine":"triangle"; o.frequency.value = f;
    const g = ac.createGain(); g.gain.value = i<2?0.5:0.12;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.05+i*0.021;
    const lg = ac.createGain(); lg.gain.value = i<2?0.18:0.06;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(bed);
    return [o,lfo];
  });
  const wind = ac.createBufferSource(); wind.buffer = nbuf; wind.loop = true;
  const wlp = ac.createBiquadFilter(); wlp.type = "lowpass"; wlp.frequency.value = 340; wlp.Q.value = 0.4;
  const wg = ac.createGain(); wg.gain.value = 0.05;
  wind.connect(wlp); wlp.connect(wg); wg.connect(bed);
  /* constant broadband hiss under the static phase */
  const hissSrc = ac.createBufferSource(); hissSrc.buffer = nbuf; hissSrc.loop = true;
  const hhp = ac.createBiquadFilter(); hhp.type = "highpass"; hhp.frequency.value = 2200;
  const hg = ac.createGain(); hg.gain.value = 0.05;
  hissSrc.connect(hhp); hhp.connect(hg); hg.connect(hiss);

  /* ---- one-shot voices ---- */
  function env(g, t, peak, dur, attack){
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t+(attack||0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  }
  function crackle(t){
    const dur = rand(0.012, 0.09);
    const s = noise(t, dur);
    const bp = ac.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = rand(600, 7000); bp.Q.value = rand(0.7, 4);
    const g = ac.createGain();
    env(g, t, rand(0.04, 0.22), dur);
    s.connect(bp); bp.connect(g); g.connect(burst);
  }
  function tuneSweep(t, dur){        // dial spun across the band, whine riding it
    const s = noise(t, dur);
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 7;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(6500, t+dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3, t+dur*0.8);
    g.gain.linearRampToValueAtTime(0.0001, t+dur);
    s.connect(bp); bp.connect(g); g.connect(burst);
    const w = ac.createOscillator(); w.type = "sine";
    w.frequency.setValueAtTime(220, t);
    w.frequency.exponentialRampToValueAtTime(2600, t+dur);
    const wgn = ac.createGain();
    wgn.gain.setValueAtTime(0.0001, t);
    wgn.gain.linearRampToValueAtTime(0.05, t+dur*0.8);
    wgn.gain.linearRampToValueAtTime(0.0001, t+dur);
    w.connect(wgn); wgn.connect(burst); w.start(t); w.stop(t+dur+0.02);
  }
  function signalLost(t){            // carrier drops: full-band slam, then hiss
    const dur = 0.32;
    const s = noise(t, dur);
    const g = ac.createGain();
    env(g, t, 0.3, dur, 0.001);
    s.connect(g); g.connect(burst);
  }
  function kick(t){
    const o = ac.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t+0.12);
    const g = ac.createGain(); env(g, t, 0.95, 0.2);
    o.connect(g); g.connect(crush); o.start(t); o.stop(t+0.22);
  }
  function hat(t, open){
    const dur = open?0.12:0.035;
    const s = noise(t, dur);
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const g = ac.createGain(); env(g, t, open?0.28:0.34, dur, 0.001);
    s.connect(hp); hp.connect(g); g.connect(crush);
  }
  function bleep(t, f, dur, type, slide){
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide), t+dur);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
    const g = ac.createGain(); env(g, t, 0.34, dur, 0.002);
    o.connect(lp); lp.connect(g); g.connect(crush); o.start(t); o.stop(t+dur+0.02);
  }
  function bass(t, f, dur){
    const o = ac.createOscillator(); o.type = "square"; o.frequency.value = f;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(140, t+dur);
    const g = ac.createGain(); env(g, t, 0.5, dur, 0.004);
    o.connect(lp); lp.connect(g); g.connect(crush); o.start(t); o.stop(t+dur+0.02);
  }
  function chirp(t, step){           // modem-ish run of hopping tones
    const n = 4+Math.floor(rng()*6);
    for(let i=0;i<n;i++){
      const o = ac.createOscillator(); o.type = rng()<0.5?"square":"sine";
      o.frequency.value = rand(500, 3400);
      const g = ac.createGain(); env(g, t+i*step, 0.2, step*0.9, 0.001);
      o.connect(g); g.connect(crush); o.start(t+i*step); o.stop(t+(i+1)*step);
    }
  }
  function stutter(t, step){         // a slice of noise repeated & squeezed
    const n = 4+Math.floor(rng()*5);
    const f = rand(500, 5000), q = rand(1, 6), up = rng()<0.5;
    for(let i=0;i<n;i++){
      const at = t+i*step;
      const s = noise(at, step*0.8);
      const bp = ac.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.value = f*(up?1+i*0.25:1); bp.Q.value = q;
      const g = ac.createGain(); env(g, at, 0.5, step*0.8, 0.001);
      s.connect(bp); bp.connect(g); g.connect(crush);
    }
  }
  function zap(t){
    const o = ac.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(rand(1800, 3200), t);
    o.frequency.exponentialRampToValueAtTime(110, t+0.16);
    const g = ac.createGain(); env(g, t, 0.26, 0.17, 0.001);
    o.connect(g); g.connect(crush); o.start(t); o.stop(t+0.19);
  }

  /* ---- timeline: a small state machine advanced by scheduleUntil ---- */
  const BPM = 132, STEP = 60/BPM/4;
  const BLEEPS = [220, 261.63, 293.66, 349.23, 392];   // A minor pentatonic-ish
  const BASS = [55, 55, 65.41, 82.41];
  let cursor = 0, started = false;
  let phase = "static", phaseEnd = 0, sweepAt = 0, sweepDone = false;
  let step = 0, steps = 0;

  function enterStatic(t){
    phase = "static"; sweepDone = false;
    phaseEnd = t + rand(7, 11);
    sweepAt = phaseEnd - 0.7;
    bed.gain.setTargetAtTime(1, t, 0.4);
    hiss.gain.setTargetAtTime(1, t, 0.2);
  }
  function enterRobo(t){
    phase = "robo"; step = 0;
    steps = 16*(5+Math.floor(rng()*3));          // 5-7 bars
    bed.gain.setTargetAtTime(0.22, t, 0.15);     // static stays faintly underneath
    hiss.gain.setTargetAtTime(0.25, t, 0.1);
  }

  function roboStep(t){
    const i = step%16, bar = Math.floor(step/16), last = step >= steps-16;
    if(i%4===0 ? rng()<0.92 : ((i===7||i===10||i===15) && rng()<0.3)) kick(t);
    if(i%2===1 && rng()<0.8) hat(t, false);
    if(i===14 && rng()<0.45) hat(t, true);
    if((i===0||i===3||i===6||i===10) && rng()<0.6) bass(t, pick(BASS), STEP*2.4);
    if(bar>0 || i>7){
      if(rng()<0.5){
        const f = pick(BLEEPS)*pick([1,1,2,2,4]);
        bleep(t, f, rand(0.03, 0.1), pick(["square","square","sawtooth"]), rng()<0.35?pick([0.5,2]):0);
      }
      if(rng()<0.06) chirp(t, STEP/2);
      if(rng()<0.04) zap(t);
    }
    if(rng()<0.07 || (last && i===15 && rng()<0.7)) stutter(t, STEP/2);
    step++;
  }

  return {
    master,
    start(t0){
      cursor = t0; started = true;
      oscs.forEach(p=>p.forEach(o=>o.start(t0)));
      wind.start(t0); hissSrc.start(t0);
      enterStatic(t0);
    },
    /* schedule everything that falls before `horizon`. `now` is the live clock:
       if the caller fell behind (throttled tab) skip forward rather than fire a backlog. */
    scheduleUntil(horizon, now){
      if(!started) return;
      if(now !== undefined && cursor < now) cursor = now;
      while(cursor < horizon){
        if(phase === "static"){
          if(!sweepDone && cursor >= sweepAt){
            tuneSweep(cursor, 0.7); sweepDone = true;
            cursor = Math.max(cursor, sweepAt)+0.7;
          } else if(cursor >= phaseEnd){
            enterRobo(cursor);
          } else {
            crackle(cursor);
            const next = cursor + 0.07 + rng()*0.5;
            cursor = sweepDone ? next : Math.min(next, sweepAt);
            if(sweepDone && cursor > phaseEnd) cursor = phaseEnd;
          }
        } else {
          if(step >= steps){ signalLost(cursor); enterStatic(cursor); cursor += 0.05; }
          else { roboStep(cursor); cursor += STEP; }
        }
      }
    },
    phaseNow(){ return phase; }
  };
}

/* live playback: returns a handle with stop() */
function play(){
  const AC = root.AudioContext || root.webkitAudioContext;
  const ac = new AC();
  const sig = createSignal(ac, ac.destination);
  const t0 = ac.currentTime+0.05;
  sig.master.gain.setValueAtTime(0.0001, ac.currentTime);
  sig.master.gain.linearRampToValueAtTime(0.16, ac.currentTime+4);
  sig.start(t0);
  const tick = ()=>sig.scheduleUntil(ac.currentTime+2.5, ac.currentTime);
  tick();
  const timer = setInterval(tick, 250);
  return {
    ctx: ac,
    stop(){
      clearInterval(timer);        // first: no more events onto a closing context
      const t = ac.currentTime;
      sig.master.gain.cancelScheduledValues(t);
      sig.master.gain.setValueAtTime(Math.max(0.0001, sig.master.gain.value), t);
      sig.master.gain.linearRampToValueAtTime(0.0001, t+1.2);
      setTimeout(()=>ac.close(), 1400);
    }
  };
}

root.TofflerSignal = {createSignal, play};
})(typeof self!=="undefined"?self:globalThis);
