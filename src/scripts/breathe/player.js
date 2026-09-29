// The /breathe session player: Tide Breath Canvas (silk + Tide field, breath line, hold clock, beads, captions),
// ported from the marketing prototype. It keeps the prototype's frame loop and cue design, with these changes:
// - one score per session, loaded from /breathe/sessions/<slug>/score.json (see useScore and the shape notes);
// - phase checks use each phase's kind, so other sessions run the same grammar; magic times became phase-relative;
// - the session audio is never routed through Web Audio (iPhone silent switch); the room follows score.music;
// - no settings sheet and nothing stored; the page owns the start, end and exit screens (hooks below);
// - tiers: WebGL2 silk, WebGL1 light field, or a CSS light (no WebGL, or Reduce Motion).
//
//   const p = createPlayer({ score, audio, onTick(at, playing), onEvent(ev), onFinish(), onExit(at), onPause(at) });
//   p.start(fromSeconds)   // inside the Play tap
import './visual.js';

// Deterministic render mode (?render): a virtual clock, no audio, frames stepped by window.__render.
// Used by capture harnesses to step exact frames; the live page never takes this path.
window.RENDER=/[?&]render\b/.test(location.search);
if(window.RENDER){ (function(){
  let vt=0, pending=null; const anims=new Map(); window.__realNow=performance.now.bind(performance);
  Object.defineProperty(performance,'now',{value:()=>vt,configurable:true});
  window.requestAnimationFrame=cb=>{ pending=cb; return 1; };
  window.AudioContext=undefined; window.webkitAudioContext=undefined;
  const L={};
  window.__fakeAudio={currentTime:0,paused:true,
    play(){ this.paused=false; (L.play||[]).forEach(f=>f()); return Promise.resolve(); },
    pause(){ if(this.paused) return; this.paused=true; (L.pause||[]).forEach(f=>f()); },
    addEventListener(t,f){ (L[t]=L[t]||[]).push(f); } };
  function syncAnims(){ for(const a of document.getAnimations()){ if(!anims.has(a)){ anims.set(a,vt); a.pause(); }
      a.currentTime=Math.max(0,vt-anims.get(a)); } }
  window.__render={ music:null,
    step(dt){ vt+=dt*1000; const A=window.__fakeAudio; if(!A.paused) A.currentTime+=dt; const cb=pending; pending=null; if(cb) cb(vt); syncAnims(); },
    run(dt,n){ for(let i=0;i<n;i++) this.step(dt); },
    get vt(){ return vt/1000; } };
})(); }

export function createPlayer(P) {

  const cv = document.getElementById('stage');
  const hint = document.getElementById('hint');
  // Tiers: (1) the silk + Tide field on WebGL2, which lowers its own particle share and thread count when frames
  // run slow; (2) the WebGL1 light field on this canvas; (3) no WebGL, or Reduce Motion: a still room and a soft
  // CSS light whose size is the breath (#lostGlow), with the breath line, hold clock and words as usual.
  const reduceMotion = !!P.reduced || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let silkCv=document.getElementById('silk'), silk=null, silkOpts={}, silkLost=false, lostAt=0, lostTries=0;
  let silkGain=1;
  if(!reduceMotion && !P.noSilk){ try { const Q=new URLSearchParams(location.search), qT=+Q.get('threads'), so={};   // ?threads= &bloom=0 &bghalf=0 for measuring
    if(qT>0) so.threads=qT; if(Q.get('bloom')==='0') so.bloom=false; if(Q.get('bghalf')==='0') so.bgHalf=false; so.tide=Q.get('tide')!=='0'; so.source=Q.get('src')||'rim'; silkOpts=so; silk=createSilk(silkCv, so); silkGain=Math.pow(700/silk.threads,.55); } catch(_) { silk=null; } }
  const gl = silk || reduceMotion ? null : (cv.getContext('webgl', {antialias:false, premultipliedAlpha:false}) || cv.getContext('experimental-webgl'));
  const orbMode = !silk && !gl;
  let U={};
  if (gl) {

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const fs = `
  precision highp float;
  uniform vec2 res; uniform float t, ft, b, w, still, k; uniform int style;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
  vec3 teal=vec3(.27,.71,.63), gold=vec3(1.,.74,.42), deep=vec3(.02,.035,.045);
  // Floating dust/seed points: still in a hold, drifting up after a release (w).
  float dust(vec2 uv){
    float acc=0.;
    for(int L=0; L<2; L++){
      float sc = L==0 ? 14. : 26.;
      vec2 q = uv*sc; q.y -= ft*.02*sc*(0.2+1.8*w);
      vec2 id=floor(q), f=fract(q)-.5;
      float r=h(id); if(r<.82) continue;
      vec2 o=vec2(h(id+3.1),h(id+7.7))-.5; o*=.6;
      float d=length(f-o); acc += smoothstep(.09,.0,d)*(L==0?.9:.5)*(.5+.5*sin(t*.7+r*40.));
    }
    return acc;
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*res)/res.y; // centred, y up, height = 1
    vec3 c=deep;
    vec3 hue=mix(teal,gold,w);
    if(style==0){
      float r=.07+b*.30; float d=length(uv-vec2(0.,.03));
      c=mix(deep, vec3(.95), smoothstep(r+.004,r-.004,d)); c+=teal*k*.5*exp(-max(d-r,0.)*14.);
    } else if(style==1){
      // Light field: an aperture of light whose size is the breath, in a dark room.
      vec2 a=uv-vec2(0.,.04);
      float hw=mix(.004,.20,b), hh=mix(.19,.27,b);
      vec2 dd=max(abs(a)-vec2(hw,hh),0.); float dist=length(dd);
      float core=smoothstep(.012,0.,dist);
      float glow=exp(-dist*mix(9.,4.,b))*(.35+.65*b)*(.7+.8*k);
      float room=(.08+.55*b)*(.75+.6*k)*exp(-length(uv*vec2(1.2,.9))*1.6);
      float floorRefl = a.y< -hh ? exp(-(abs(a.x)-hw)*18.)*exp((a.y+hh)*3.)*.35*(.3+.7*b) : 0.;
      c = deep + hue*(room+glow*.9+floorRefl) + vec3(1.)*core*(.75+.25*b);
      c += mix(vec3(.85,.95,.93),vec3(1.,.9,.75),w)*dust(uv)*(.15+.6*b+.4*w);
      c *= 1.-.55*pow(length(uv*vec2(.9,.75)),2.2);
    } else {
      // Liquid light: flowing ink around a core whose size is the breath; flow slows in a hold.
      vec2 p=uv*(1.4+.8*k);
      vec2 q=vec2(fbm(p+ft*.12), fbm(p+vec2(5.2,1.3)-ft*.10));
      vec2 r=vec2(fbm(p+2.2*q+vec2(1.7,9.2)+ft*.07), fbm(p+2.2*q+vec2(8.3,2.8)));
      float f=fbm(p+(1.6+1.6*k)*r);
      float rad=.10+b*.34;
      float core=exp(-pow(length(uv)/rad,2.)*1.6);
      float ink=smoothstep(.35,.95,f)*core;
      float sheen=pow(max(0.,f-.55)*2.2,3.)*core;
      c = deep + hue*(ink*(1.0+.6*k) + core*.18) + vec3(1.)*sheen*(.3+.5*b+.4*k);
      c += hue*.05*exp(-length(uv)*3.);
      c *= 1.-.5*pow(length(uv*vec2(.9,.75)),2.2);
    }
    c += (h(gl_FragCoord.xy+fract(t)*91.)-.5)*(2.2/255.); // dither against banding
    gl_FragColor=vec4(pow(max(c,0.),vec3(.95)),1.);
  }`;
  function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const pr=gl.createProgram(); gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs)); gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['res','t','ft','b','w','still','k','style'].forEach(k=>U[k]=gl.getUniformLocation(pr,k));
  }
  // WebGL context loss (GPU reset, memory pressure, driver timeout, sleep/wake): without a handler the silk stays
  // black for the rest of the session. Allow restoration, show a soft CSS glow meanwhile, and if the context
  // doesn't come back within 2 s, replace the canvas and build a new silk on a fresh context.
  function rebuildSilk(){ const s2=createSilk(silkCv, silkOpts); if(s2.setDepthStyle) s2.setDepthStyle(dMode||1); return s2; }
  function watchCtx(cv){ cv.addEventListener('webglcontextlost', e=>{ e.preventDefault(); silkLost=true; lostAt=performance.now(); }, false);
    cv.addEventListener('webglcontextrestored', ()=>{ try{ silk=rebuildSilk(); silkLost=false; lostTries=0; }catch(_){} }, false); }
  watchCtx(silkCv);
  function recoverSilk(now){
    if(!silkLost || now-lostAt<2000 || lostTries>=3) return;
    lostTries++; lostAt=now;
    try{ const fresh=silkCv.cloneNode(false); silkCv.replaceWith(fresh); silkCv=fresh; watchCtx(fresh); silk=rebuildSilk(); silkLost=false; }catch(_){} }
  window.__silkInfo=()=>({ tide: silk && silk.tide ? { particles: silk.tide.particles, drawn: silk.tide.drawn, f32: silk.tide.f32, tier: silk.tide.L.tier } : null, threads: silk && silk.threads, lost: silkLost, tries: lostTries, resets: silk && silk.state ? silk.state.resets||0 : 0 });
  let style = silk ? 3 : 1;
  silkCv.style.display = silk ? 'block' : 'none';
  const PALS={ teal:{base:[.059,.462,.352],pale:[.55,.97,.86],tint:[.02,.12,.10],ground:[.003,.007,.012]},
    ember:{base:[.82,.30,.07],pale:[1.,.78,.50],tint:[.10,.03,.006],ground:[.0055,.0022,.0009]},
    amber:{base:[.72,.38,.10],pale:[1.,.86,.62],tint:[.09,.045,.012],ground:[.005,.003,.0012]},
    dawn:{base:[.66,.27,.22],pale:[1.,.80,.70],tint:[.09,.03,.03],ground:[.0055,.0025,.0025]},
    pearl:{base:[.40,.44,.54],pale:[.93,.95,1.],tint:[.05,.06,.11],ground:[.006,.007,.012]},
    sage:{base:[.30,.46,.26],pale:[.87,.95,.78],tint:[.04,.07,.035],ground:[.003,.0045,.002]},
    water:{base:[.05,.36,.40],pale:[.62,.96,.92],tint:[.008,.05,.06],ground:[.0012,.0045,.0065]},
    night:{base:[.30,.34,.52],pale:[.90,.93,1.],tint:[.02,.025,.06],ground:[.0015,.0018,.0045]},
    moss:{base:[.42,.46,.12],pale:[1.,.93,.62],tint:[.035,.045,.01],ground:[.0026,.0032,.0011]} };
  const ACCENT={ember:'#e08a4f',amber:'#e3a653',dawn:'#e39a8a',pearl:'#aab6cf',sage:'#8fb07e',teal:'#45b5a0'};
  const setAccent=n=>{ const PP=PALS[n]; if(PP) document.documentElement.style.setProperty('--ringc','rgba('+PP.pale.map(v=>Math.round(v*255)).join(',')+',.9)'); document.documentElement.style.setProperty('--teal',ACCENT[n]||'#45b5a0'); document.documentElement.style.setProperty('--accent', n==='teal'?'#8fe0cf':n==='pearl'?'#dfe6f5':n==='sage'?'#cfe2b0':'#F2B872'); };
  let curPal='ember'; window.SILK_PALETTE=PALS.ember; setAccent('ember');
  let curWorld=(new URLSearchParams(location.search).get('world'))||'ember';
  // fade (seconds, optional): cross-fade the room and its palette instead of switching (the start screen's session choice)
  let palFade=null;
  function setWorld(n, fade){ const W=(typeof TIDE_WORLDS!=='undefined' && TIDE_WORLDS[n]) || null; if(!W) return; const was=curPal; curWorld=n; silkOpts.tideOpts=Object.assign({}, silkOpts.tideOpts, {world:n});
    if(silk && silk.tide){ if(fade && silk.tide.fadeTo) silk.tide.fadeTo(n, fade); else silk.tide.setWorld(n); }
    palFade = fade && PALS[was] && PALS[W.pal] && was!==W.pal ? {a:PALS[was], b:PALS[W.pal], t0:performance.now(), d:fade*1000} : null;
    document.body.dataset.world=n; curPal=W.pal; window.SILK_PALETTE=PALS[curPal]||PALS.ember; setAccent(curPal); document.documentElement.style.setProperty('--accent', W.accent);
 }
  window.__setWorld=setWorld;
  // the world blend: The Wake Up travels from Dawn (arrival and the first round) into Ember (from the breath of fire)
  // (from the score's look.journey; off by default, as in the prototype; ?journey=1 turns it on)
  let JOURNEY=null;
  let journeyOn=new URLSearchParams(location.search).get('journey')==='1';
  function setJourney(on){ journeyOn=!!on; silkOpts.tideOpts=Object.assign({}, silkOpts.tideOpts, {journey: journeyOn ? JOURNEY : null}); if(silk && silk.tide) silk.tide.setJourney(journeyOn ? JOURNEY : null);
 }
  window.__journeyWorld=()=> journeyOn && silk && silk.tide && sessionMode ? silk.tide.worldName : null;
  // the room's palette blends with the journey too: [world a, world b, u] -> a mixed palette
  window.__journeyPal=()=>{ const J=journeyOn && silk && silk.tide && sessionMode ? silk.tide.L.journey : null; if(!J) return null;
    const A=PALS[TIDE_WORLDS[J[0]].pal], B=PALS[TIDE_WORLDS[J[1]].pal], u=J[2], mx=(a,b)=>a.map((x,i)=>x+(b[i]-x)*u);
    return {base:mx(A.base,B.base), pale:mx(A.pale,B.pale), tint:mx(A.tint,B.tint), ground:mx(A.ground,B.ground)}; };
  let depthOn=true; window.SILK_DEPTH=1; let dMode=1;
  function setDepthMode(n){ dMode=n; depthOn=n!==0; if(silk && silk.setDepthStyle && n) silk.setDepthStyle(n);
 }
  if(silk && silk.setDepthStyle) silk.setDepthStyle(1);
  const audio=window.RENDER ? window.__fakeAudio : P.audio;
  let sessionMode=false, freeMode=false, bline=null, holdNums='last';
  // ---- colour script: per section a target look [saturation, brightness, hue lean (-1 deep ember .. 0 amber .. +1 gold), pale lift],
  // eased over ~3 s so every change of section is a slow turn of the light. Applied within whichever palette is chosen.
  let arcOn = new URLSearchParams(location.search).get('arc')!=='0';
  const ARC_NOW=[1,1,0,0];
  function arcTarget(){
    if(!sessionMode || !arcOn) return [1,1,0,0];
    const at=audio.currentTime, ph=phaseAt(at), ty=curEv ? curEv.type : '', late=lateAt(at), fb=bnd('fire');
    if(ph==='Arrival') return [.78,.76,-.3,0];                       // dusky, low amber
    if(ph==='Four in, four out') return [1,1,0,0];                   // steady, balanced amber
    if(ph==='Breath of fire') return at<(fb?fb[0]+2.2:95) ? [1.08,1.02,.15,0] : [1.35,1.1,.5,0];   // hotter, more saturated orange-gold
    if(ph==='Last gear') return [1.45,1.2,.85,0];                    // the peak: hottest gold, strongest contrast
    if(ph==='Hold and release'){
      if(ty==='holdEmpty') return [.95,.74,-.85,0];                  // a low, deep ember
      if(ty==='hold') return late ? [1.1,1.04,.4,0] : [.7,.92,.05,0];   // quieter, still warm (round two richer)
      if(ty==='release') return late ? [1.3,1.18,.9,.2] : [1.15,1.12,.65,.1];   // a golden bloom; the second the richest
      return late ? [1.15,1.08,.5,0] : [1,1,.1,0]; }
    if(ph==='Integration') return [.8,1.08,.45,.5];                // a soft, luminous pale-gold afterglow
    if(ph==='Closing') return [.72,.72,-.35,.1];                      // a gentle dusk
    return [1,1,0,0]; }
  function colourArc(dt){
    const T=arcTarget(); for(let i=0;i<4;i++) ARC_NOW[i]+=(T[i]-ARC_NOW[i])*(1-Math.exp(-dt/2.8));
    const [sat,lum,hue,pl]=ARC_NOW, lean = hue>=0 ? [1+.03*hue, 1+.12*hue, 1-.18*hue] : [1-.03*hue, 1+.16*hue, 1+.28*hue];
    return (c,k)=>{ const L=.3*c[0]+.59*c[1]+.11*c[2]; const s=1+(sat-1)*k, l=1+(lum-1)*k;
      return c.map((v,i)=>{ let x=L+(v-L)*s; x*=1+(lean[i]-1)*k; x+=(L*1.15-x)*pl*k*.5; return Math.max(0,x*l); }); }; }
  window.__arc=()=>ARC_NOW.slice();
  window.__arcOn=()=>arcOn;   // the field's colour script follows the same toggle

  // Breath sound, generated live (Web Audio): air that follows the breath, a thin hush in a hold,
  // a warm low swell on release. Starts on the first press (browsers need a gesture).
  let A=null, sndOn=true;
  function startSound(){
    if(A) { if(A.ctx.state==='suspended') A.ctx.resume(); return; }
    const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return;
    const ctx=new Ctx(), sr=ctx.sampleRate;
    // pink-ish noise buffer
    const len=sr*4, buf=ctx.createBuffer(2,len,sr);
    for(let ch=0;ch<2;ch++){ const d=buf.getChannelData(ch); let b0=0,b1=0,b2=0;
      for(let i=0;i<len;i++){ const wn=Math.random()*2-1; b0=.997*b0+wn*.029591; b1=.985*b1+wn*.032534; b2=.95*b2+wn*.048056;
        d[i]=(b0+b1+b2+wn*.1848)*.25; } }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400; lp.Q.value=.3;
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=120;
    const air=ctx.createGain(); air.gain.value=0;
    src.connect(hp).connect(lp).connect(air);
    // hush: a very quiet high sine pair for holds
    const hush=ctx.createGain(); hush.gain.value=0;
    [1318.5,1975.5].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f*(1+i*.0015); const g=ctx.createGain(); g.gain.value=i?.35:.6; o.connect(g).connect(hush); o.start(); });
    // warm swell: low sine partials through a soft low-pass
    const warm=ctx.createGain(); warm.gain.value=0; const wlp=ctx.createBiquadFilter(); wlp.type='lowpass'; wlp.frequency.value=900;
    [73.4,110,146.8,220.2].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type=i%2?'triangle':'sine'; o.frequency.value=f; const g=ctx.createGain(); g.gain.value=[.55,.3,.22,.08][i]; o.connect(g).connect(wlp); o.start(); });
    wlp.connect(warm);
    const master=ctx.createGain(); master.gain.value=sndOn?1:0;
    const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3;
    air.connect(master); hush.connect(master); warm.connect(master); master.connect(comp).connect(ctx.destination);
    src.start();
    A={ctx,lp,air,hush,warm,master,noise:buf};
  }
  function drive(b,k,w,holding,dt){
    if(!A) return; const t=A.ctx.currentTime, r=.06;
    const moving = !holding;
    A.lp.frequency.setTargetAtTime(220+b*1600*(0.4+1.4*k)+w*300, t, r);
    A.air.gain.setTargetAtTime(moving ? (.04+.30*b)*(.45+1.2*k) : .02, t, holding?.5:r);
    A.hush.gain.setTargetAtTime(holding ? .012 : 0, t, .8);
    A.warm.gain.setTargetAtTime(.22*w, t, .6);
  }

  // Music -> room: the round's slow low-band energy (the music pad, not the beat) lifts the room's glow and the depth motes.
  let MA=null, musOn=true, musLvl=0, musPeak=1e-4;
  let musAmt=.7;
  
  // The prototype routed the session audio through an analyser (createMediaElementSource). On iPhone that puts
  // Edvin's voice under Web Audio, which the ring/silent switch mutes and an interrupted context silences. Here the
  // audio element plays on its own and the room follows an offline low-band envelope shipped in the score (music).
  function startMusic(){ try{ if(!A) startSound(); else if(A.ctx.state!=='running') A.ctx.resume(); }catch(_){} }
  function musicLevel(dt){
    const MUS = window.RENDER && window.__render.music ? {fps:30, v:window.__render.music} : SCORE && SCORE.music;
    if(MUS && MUS.v && MUS.v.length){ const M=MUS.v, i=Math.round(audio.currentTime*(MUS.fps||10));   // offline low-band energy of the same audio
      const e = audio.paused ? 0 : (M[Math.max(0,Math.min(M.length-1,i))]||0);
      musPeak=Math.max(musPeak*Math.exp(-dt/40), e); const target=audio.paused?0:Math.min(1, e/Math.max(.05,musPeak));
      musLvl += (target-musLvl)*(1-Math.exp(-dt/(target>musLvl?2.0:1.2))); return musLvl; }
    if(!MA || audio.paused){ musLvl += (0-musLvl)*(1-Math.exp(-dt/2.5)); return musLvl; }
    MA.an.getByteFrequencyData(MA.buf); const hz=A.ctx.sampleRate/MA.an.fftSize; const hi=Math.max(2,Math.round(220/hz));
    let e=0; for(let i=1;i<hi;i++) e+=MA.buf[i]; e/=hi*255;
    musPeak=Math.max(musPeak*Math.exp(-dt/40), e);                 // slow running peak for normalising
    const target=Math.min(1, e/Math.max(.05,musPeak));
    musLvl += (target-musLvl)*(1-Math.exp(-dt/(target>musLvl?2.0:1.2)));   // seconds-scale, never the beat
    return musLvl;
  }

  // Input: holding = air going in. Toolbar clicks don't count.
  let down=false, kTarget=.5;
  // Haptics where the browser allows it (Android; iPhones don't let web pages vibrate).
  const buzz=pat=>{ try{ if(freeMode && navigator.vibrate) navigator.vibrate(pat); }catch(_){} };
  let fullBuzzed=false;
  const pressTimes=[];
  const press=on=>{ if(on===down) return; down=on; if(on){ lastPress=performance.now(); pressTimes.push(lastPress); if(pressTimes.length>12) pressTimes.shift(); }
    if(on){ buzz(12); fullBuzzed=false; } else { buzz(fullFor>2 ? [30,60,30,60,120] : 8); }
    if(freeMode) emitEv(on ? 'in' : (fullFor>2 ? 'release' : 'out')); };
  const readK=e=>{ let y=1-e.clientY/innerHeight;                     // higher on screen = more intense (full height)
    let v=Math.min(1,Math.max(0,(y-.05)/.9));
    if(e.pressure && e.pressure!==.5 && e.pressure!==1 && e.pointerType!=='mouse') v=.5*v+.5*Math.min(1,e.pressure*1.4);
    kTarget=v; };
  cv.addEventListener('pointerdown',e=>{ e.preventDefault();
    if(sessionMode){ (chromeOn && !audio.paused) ? hideChrome() : showChrome(); return; }
    if(!freeMode) return;
    if(e.clientY<innerHeight*.14){ showChrome(); return; }
    startSound(); readK(e); press(true); });
  window.addEventListener('pointermove',e=>{ if(e.pointerType==='mouse' && (sessionMode||freeMode) && Math.abs(e.movementX)+Math.abs(e.movementY)>2) showChrome(); });
  cv.addEventListener('pointermove',e=>{ if(down) readK(e); });
  window.addEventListener('pointerup',()=>press(false));
  window.addEventListener('pointercancel',()=>press(false));
  window.addEventListener('keydown',e=>{
    if(e.code==='Escape' && sheetOpen()){ closeSheet(); return; }
    if(sessionMode){ if(e.code==='Space'){ e.preventDefault(); togglePlay(); }
      else if(e.code==='ArrowLeft'){ seek(audio.currentTime-10); } else if(e.code==='ArrowRight'){ seek(audio.currentTime+10); }
      else if(e.code==='KeyF'){ toggleFs(); } return; }
    if(!freeMode) return;
    if(e.code==='Space'){ e.preventDefault(); kTarget=e.shiftKey?1:.5; if(!e.repeat){ startSound(); press(true);} } });
  window.addEventListener('keyup',e=>{ if(freeMode && e.code==='Space'){ e.preventDefault(); press(false);} });
  window.addEventListener('blur',()=>press(false));

  function resize(){ if(!gl) return; const dpr=Math.min(window.devicePixelRatio||1,2);
    cv.width=Math.floor(innerWidth*dpr); cv.height=Math.floor(innerHeight*dpr); gl.viewport(0,0,cv.width,cv.height); }
  addEventListener('resize',resize); resize();

  // ---- the session score (score.json per session): phases carry a kind; the visual grammar reads canonical names ----
  const KIND_NAME={arrival:'Arrival', steady:'Four in, four out', fire:'Breath of fire', peak:'Last gear', holds:'Hold and release', integration:'Integration', closing:'Closing'};
  // a phase's kind: p[3], or the score's kind map {label: section behaviour name} (the session-scores format)
  const NAME_KIND=Object.fromEntries(Object.entries(KIND_NAME).map(([k,v])=>[v,k]));
  const kindOf=p=>{ if(p[3] && KIND_NAME[p[3]]) return p[3]; const km=SCORE && SCORE.kind && SCORE.kind[p[2]]; if(km && NAME_KIND[km]) return NAME_KIND[km];
    if(NAME_KIND[p[2]]) return NAME_KIND[p[2]]; const n=String(p[2]||'').toLowerCase();
    return /arriv|settl|intro/.test(n) ? 'arrival' : /integrat|after/.test(n) ? 'integration' : /clos|end/.test(n) ? 'closing' : /hold|release/.test(n) ? 'holds' : 'steady'; };
  let SCORE=null, CAPS=[], PHASES=[], DUR=1;
  const phaseAt=t=>{ for(const p of PHASES) if(t>=p[0] && t<p[1]) return p[2]; return ''; };
  const phaseLabel=t=>{ for(const p of PHASES) if(t>=p[0] && t<p[1]) return p[4]; return ''; };
  const bnd=kind=>{ for(const p of PHASES) if(p[3]===kind) return [p[0],p[1]]; return null; };
  // the second half of the holds (The Wake Up: its second round) is the culmination
  // (score.late sets it; otherwise the middle of the holds phase)
  const lateAt=t=>{ if(SCORE && SCORE.late!=null) return t>SCORE.late; const h=bnd('holds'); return h ? t>(h[0]+h[1])/2 : false; };
  // intensity ramps over a phase, inset by score.ramps[kind] = [from start, before end] seconds (default: the whole phase)
  const ramp=(k)=>{ const r=SCORE && SCORE.ramps && SCORE.ramps[k]; return r || [0,0]; };
  let lastCue=-1, ringT=9, ROUND_CUES=[];
  const EMPH=['inhale','exhale','hold','let','go','sigh','empty','nose','last'];
  // Breath model: eases toward full while held, toward empty when released (same as the tap tool),
  // with a slower out-breath. Warmth rises when a long full hold is released, then fades.
  const meterWrap=document.getElementById('meterWrap'); let lastPress=0;
  const meterEl=document.getElementById('meter'), phaseEl=document.getElementById('phase');
  let fpsN=0, fpsT0=0, adapted=false;
  let hintHidden=false, phaseName='', phaseAge=0, pOp=0;
  const countEl=document.getElementById('count'), capEl=document.getElementById('cap'); let countText='', capIdx=-2, capOp=0, capTarget=0;
  let fastRound=false, lastBreathAt=0;
  let trough=1, peak=0, rising=false, roundBreaths=0, roundDone=false, holdT=0;
  let introT0=null, introFrom=.3; const bornAt=performance.now();
  let k=.3, b=0, prevB=0, w=0, wTarget=0, fullFor=0, ft=0, last=performance.now(), t0=last, idle=0;
  function frame(now){
    const dt=Math.min(.25,(now-last)/1000); last=now;
    // --- where the breath comes from: Edvin's round (the locked tap timeline) or your finger
    const auto = sessionMode;
    if(!sessionMode && !freeMode && introT0!=null){   // the one guided breath before the session: in as it rises (4 s), out (5 s)
      const u=(now-introT0)/1000, s=x=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
      b = u<4 ? introFrom+(.85-introFrom)*s(u/4) : .85+(.2-.85)*s((u-4)/5); }
    else if(!sessionMode && !freeMode){ b = .22 + .16*(.5-.5*Math.cos(now/1000*2*Math.PI/7.5));
      if(P.gather){ const u=Math.min(1,(now-bornAt)/1200), e=1-Math.pow(1-u,3); b*=e; } }   // arrival: the sphere gathers from nothing
    else if(auto){
      const at=audio.currentTime;
      b=breathAt(at);
    } else {
      const tau = down ? .6 : .95;
      b += ((down?1:0)-b)*(1-Math.exp(-dt/tau));
    }
    if(!Number.isFinite(b)) b=Number.isFinite(prevB) ? prevB : .2;   // never let a NaN through to the silk
    const db=(b-prevB)/Math.max(dt,1e-3); prevB=b;
    recoverSilk(now);
    { const lg=document.getElementById('lostGlow'); const on = (silkLost && style===3) || orbMode;
      if(on || lg.style.opacity!=='0'){ const r=(.10+.25*b)*GEO.U*1.5; lg.style.opacity = on ? '.9' : '0';
        lg.style.width=lg.style.height=(2*r).toFixed(1)+'px'; lg.style.transform='translate('+((GEO.cx??innerWidth/2)-r).toFixed(1)+'px,'+(GEO.cy-r).toFixed(1)+'px)'; } }
    // --- breath counting (an inhale that rises clearly from a trough), holds and the round
    if(b<trough) trough=b;
    if(!rising && b>trough+.12 && db>.05 && !(sessionMode && (inFire(audio.currentTime) || !/^(Four|Last)/.test(phaseAt(audio.currentTime))))){ rising=true; peak=b; const nowS=now/1000; fastRound = (nowS-lastBreathAt)<3.2 && roundBreaths>=3; lastBreathAt=nowS;
      if(roundDone && trough<.15){ roundBreaths=0; roundDone=false; } roundBreaths++; }
    if(rising){ if(b>peak) peak=b; if(b<peak-.12){ rising=false; trough=b; } }
    const still = Math.abs(db)<.04;
    const inHold = still && (b>.85 || (b<.08 && roundBreaths>0));
    holdT = inHold ? holdT+(auto && audio.paused ? 0 : dt) : 0;
    if(holdT>0 && b>.85) fullFor=holdT;
    if(b<.8 && fullFor>2.){ wTarget=1; fullFor=0; roundDone=true; if(!auto) buzz([30,60,30,60,120]); }
    if(b<.8 && fullFor<=2.) fullFor=0;
    if(b>.9 && down && !fullBuzzed){ buzz([10,40,10]); fullBuzzed=true; }
    wTarget=Math.max(0,wTarget-dt/9); if(!sessionMode && !freeMode) wTarget=Math.max(wTarget,.3);   // start and end screens: the warm afterglow look
    w += (wTarget-w)*(1-Math.exp(-dt/1.2));
    // --- intensity grows with the breaths taken in the round (and your tempo); calm deepens with the hold
    const recent=pressTimes.filter(x=>now-x<6000).length/6;
    const kTempo=Math.min(1,Math.max(0,(recent-.12)/.45));
    // in a session the intensity follows the arc of the techniques (each builds on the last), not a breath count
    const kSess=at=>{ const ph=phaseAt(at), f=(a,b)=>Math.min(1,Math.max(0,(at-a)/(b-a))), pb=(k,a,b)=>{ const x=bnd(k); return x ? f(x[0]+a, x[1]-b) : 0; };
      return ph==='Four in, four out' ? .28+.17*pb('steady',...ramp('steady')) : inFire(at) ? .8+.2*f(FIRE.from+.7,FIRE.to-1.2) : ph==='Breath of fire' ? .6 : ph==='Last gear' ? .72+.28*pb('peak',...ramp('peak'))
        : ph==='Hold and release' ? .5 : ph==='Arrival' ? .15 : .18; };
    const kRound = sessionMode ? kSess(audio.currentTime) : Math.min(1, roundBreaths/22);
    const calm=Math.min(1, holdT/25); calmNow=calm;
    const kWant=Math.max(kTempo, kRound, down&&!auto?kTarget*.8:0, .12)*(1-.9*calm);
    k += (kWant-k)*(1-Math.exp(-dt/(kWant>k?.5:1.6)));
    meterWrap.style.opacity = freeMode && (down || now-lastPress<4000) ? '.9' : '0';
    meterEl.style.height=(k*100).toFixed(1)+'%'; meterEl.style.background = w>.3 ? '#f0c27a' : 'var(--teal)';
    const flow=(.12+Math.min(2.5,Math.abs(db)*2.2))*(.6+.9*k)*(1-.7*calm);
    ft += dt*flow;
    // --- phase word: arrives and behaves like the breath
    let want='';
    const sPhase = auto ? phaseAt(audio.currentTime) : '';
    if(sessionMode) trackEvents();
    if(freeMode && inHold && b>.85 && holdT>.9 && !(curEv && curEv.type==='hold')) emitEv('hold');
    if(!sessionMode && !freeMode) want='';
    else if(auto && (sPhase==='Arrival'||sPhase==='Integration'||sPhase==='Closing')) want='';
    else if(curEv){ const ty=curEv.type;
      if(ty==='kick' || ((curEv.fast || (freeMode && fastRound)) && (ty==='in'||ty==='out'))) want='';
      else want=({in:'Breathe in',top:'Breathe in',out:'Breathe out',hold:'Hold',holdEmpty:'Hold',release:'Let go'})[ty]||''; }
    if(want!==phaseName){ phaseName=want; phaseAge=0; if(want) phaseEl.textContent=want; } else phaseAge+=dt;
    if(!hintHidden && (down||auto)){ hintHidden=true; hint.style.opacity='0'; }
    let tgtOp = phaseName ? (phaseName==='Hold' ? Math.min(1,phaseAge/.9)*(1-.35*calm) : 1) : 0;
    if(phaseName==='Let go' || phaseName==='Breathe out') tgtOp*=Math.max(0,1-phaseAge/3.2);
    pOp += (tgtOp-pOp)*(1-Math.exp(-dt/(tgtOp>pOp ? .035 : .18)));   // arrives on the moment, leaves softly
    let sc=1-.07*Math.exp(-phaseAge/.09), dy=0, ls=-.01, wt=500;
    if(phaseName==='Breathe out'||phaseName==='Let go'){ const e=1-b; ls=-.01+.07*e; wt=500+100*e; sc*=1+.04*e; }
    if(phaseName==='Let go') dy=-24*Math.min(1,phaseAge/3);
    if(reduceMotion){ sc=1; dy=0; }   // reduced motion: words crossfade in place
    phaseEl.style.opacity=pOp.toFixed(3);
    phaseEl.style.transform=`translateY(${dy.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    phaseEl.style.letterSpacing=ls.toFixed(3)+'em'; phaseEl.style.fontWeight=String(Math.round(wt));
    phaseEl.style.color = phaseName==='Let go' ? '#F6D9B0' : '#F6EDE3';
    // --- counter: breaths at the top during a round; the hold time large on the sphere during a hold
    let ctext='', holdMode=false;
    const hT = sessionMode && curEv && (curEv.type==='hold'||curEv.type==='holdEmpty') ? audio.currentTime-curEv.t : holdT;
    // with the hold clock on, numbers are only the last seconds counting down (what Edvin says); the ring carries the rest
    const clockOn = bline && bline.clock!=='off' && sessionMode && curEv && curEv.dur>3;
    if(phaseName==='Hold' && hT>=1 && (!sessionMode || (curEv && (curEv.type==='hold'||curEv.type==='holdEmpty'))) && holdLeft!==0 && !(clockOn && holdNums==='none') && !(clockOn && holdNums==='last' && holdLeft<0)){ const sct = holdLeft>=0 ? holdLeft : clockOn ? Math.max(0,Math.ceil(curEv.dur-hT)) : Math.floor(hT); ctext=Math.floor(sct/60)+':'+String(sct%60).padStart(2,'0'); holdMode=true; }
    if(clockOn && phaseName==='Hold' && hT>.9 && !holdMode) phaseEl.style.opacity='0';
    else if((sessionMode||freeMode) && roundBreaths>1 && !roundDone && !(auto && !/^(Four|Last)/.test(phaseAt(audio.currentTime))) && !(sessionMode && bline && bline.count!=='off')) ctext='Breath '+roundBreaths;   // the layer's breath count replaces it in a session   // only while breaths are being counted
    if(sessionMode && inFire(audio.currentTime) && !holdMode) ctext='';
    if(ctext!==countText){ if(ctext && /^Breath/.test(ctext) && ctext!==countText) bumpT=now; countText=ctext; if(ctext) countT.textContent=ctext; }
    countT.style.transform='scale('+(reduceMotion ? 1 : 1+.12*Math.exp(-(now-bumpT)/140)).toFixed(3)+')';
    kbarB.style.width=(Math.min(1,k)*100).toFixed(1)+'%';
    if(ctext) countEl.classList.toggle('hold', holdMode);   // a hold timer fades out where it is, it doesn't fly to the top
    countEl.style.opacity = ctext ? (holdMode ? '.9' : '.6') : '0';
    if(holdMode) phaseEl.style.opacity=(pOp*.0).toFixed(3);   // in a hold only the counter speaks; the word 'Hold' merges into it
    // --- Edvin's words: the whole phrase, each word brightening as he says it (treatment A)
    if(auto){ const at=audio.currentTime-capOff; let cur=-1;
      for(let i=0;i<CAPS.length;i++){ const c=CAPS[i]; const until=Math.min(c[1]+.7, i+1<CAPS.length ? CAPS[i+1][0]-.15 : c[1]+.7);
        if(at>=c[0]-.15 && at<until && !c.cd) cur=i; }
      if(cur!==capIdx){ capIdx=cur;
        if(cur<0){ capTarget=0; }
        else { let used=false; const words=CAPS[cur][2].split(' ');
          capEl.innerHTML=words.map(x=>{ const bare=x.toLowerCase().replace(/[^a-z]/g,''); const em=!used && EMPH.includes(bare); if(em) used=true;
            return '<span class="w'+(em?' em':'')+'">'+x.replace(/[<>&]/g,'')+'</span>'; }).join(' ');
          capOp=0; capTarget=1; } }
      if(cur>=0){ const c=CAPS[cur], ws=capEl.children; let acc=0; const tot=c[2].length;
        const WS=c[3]; for(let i=0;i<ws.length;i++){ const t0 = WS && WS[i]!=null ? WS[i] : c[0]+(c[1]-c[0])*(acc/tot); ws[i].classList.toggle('on', at+.03 >= t0); acc+=ws[i].textContent.length+1; } }
    } else if(capIdx!==-2){ capIdx=-2; capTarget=0; }
    // phrase fade: in 320 ms with a 6 px rise (ease-out), out 240 ms, no movement; reduced motion: no rise
    { const k2 = capTarget>capOp ? 1-Math.exp(-dt/.11) : 1-Math.exp(-dt/.08); capOp += (capTarget-capOp)*k2;
      const rise = reduceMotion || capTarget===0 ? 0 : 6*(1-capOp);
      capEl.style.opacity=capOp.toFixed(3); capEl.style.transform='translateY('+rise.toFixed(2)+'px)'; }
    drive(b,k,w, inHold, dt);
    if(style===3 && silk && !adapted){ if(!fpsT0) fpsT0=now; fpsN++;
      if(now-fpsT0>2500){ const fps=fpsN*1000/(now-fpsT0);
        if((fps<28 || /[?&]lowfps\b/.test(location.search)) && silk.threads>200){ try{ silk.dispose(); silkOpts={threads:180,points:110,bloom:false,dprCap:1.5,tide:silkOpts.tide,source:silkOpts.source,tideOpts:{particles:128}}; silk=rebuildSilk(); silkGain=Math.pow(700/180,.55); }catch(_){} }
        adapted=true; } }
    { const ringEl=document.getElementById('ring');
      if(sessionMode){ const at=audio.currentTime, ph=phaseAt(at);
        updateBar(dragging ? dragT : at, phaseLabel(dragging ? dragT : at));
        for(const c of ROUND_CUES){ if(at>=c && at<c+.3 && lastCue!==c){ lastCue=c; ringT=0; roundBreaths=0; roundDone=false; } }   // each technique counts from 1
        // the room never drops below the start screen's presence: play opens it, the closing lets it settle, not vanish
        const cB=bnd('closing'), pres = ph==='Arrival' ? .85+.15*Math.min(1,Math.max(0,(at-3)/30)) : ph==='Closing' && cB ? .55+.45*Math.max(0,1-(at-cB[0])/10) : 1;
        silkCv.style.opacity=pres.toFixed(3);
        if(ph==='Integration') wTarget=Math.max(wTarget,.35);
        if(!audio.paused && chromeOn && !dragging && !sheetOpen() && now-chromeT>(P.hideAfter||3500)) hideChrome();
        if(P.onTick) P.onTick(at, !audio.paused);
        if(at>=DUR-.35 && !audio.paused){ audio.pause(); showEnd(); }
      } else {
        silkCv.style.opacity = '1';   // the start screen is as warm and present as the session it opens
        if(freeMode && chromeOn && !sheetOpen() && (down || now-chromeT>4000) && now-chromeT>1200) hideChrome();
      }
      ringT+=dt; const rr=Math.min(1,ringT/1.8);
      ringEl.style.opacity = ringT<1.8 ? (.45*(1-rr)).toFixed(3) : '0';
      ringEl.style.transform='scale('+(.55+1.1*rr).toFixed(3)+')'; }
    { const m = musicLevel(dt); let base=(window.__journeyPal&&window.__journeyPal())||PALS[curPal]||PALS.ember;
      if(palFade){ const u=Math.min(1,(now-palFade.t0)/palFade.d), s=u*u*(3-2*u), A=palFade.a, B=palFade.b, mx=(x,y)=>x.map((v,i)=>v+(y[i]-v)*s);
        base={base:mx(A.base,B.base), pale:mx(A.pale,B.pale), tint:mx(A.tint,B.tint), ground:mx(A.ground,B.ground)}; if(u>=1) palFade=null; } const on = musAmt>0 && sessionMode && !audio.paused;
      const g = on ? 1+musAmt*(1.1*m-.55)/.7*.7 : 1;
      const CA = colourArc(dt);
      const CS=window.__colourScript, tideArc = CS && silk && silk.tide && arcOn;
      if(tideArc){ const wN=(window.__journeyWorld&&window.__journeyWorld())||curWorld; if(!window.__roomArc) window.__roomArc=CS.create(wN); window.__roomArc.setWorld(wN); const m=window.__roomArc.update(dt, window.__bc), A=(c)=>CS.apply(c,m,wN);
        window.SILK_PALETTE = {base:A(base.base), pale:A(base.pale), ground:A(base.ground), tint:A(base.tint).map(x=>x*g)}; }
      else window.SILK_PALETTE = {base:CA(base.base,1), pale:CA(base.pale,.6), ground:CA(base.ground,.35), tint:CA(base.tint,1).map(x=>x*g)};
      window.SILK_DEPTH = depthOn ? (on ? 1+musAmt*(1.3*m-.65) : 1) : 0; }
    ambientAndPulses(dt, now);
    if(bline) bline.draw();
    // the silk is fed one frame ahead in a session (its spring settles ~1 frame behind), so it turns on the cue's frame
    const bSilk = sessionMode && !audio.paused ? breathAt(audio.currentTime+.035) : b;
    if(style===3 && silk && silk.setQuiet){ const R1=capOp>.02 && capEl.textContent ? capEl.getBoundingClientRect() : null, R2=+(phaseEl.style.opacity||0)>.02 && phaseEl.textContent ? phaseEl.getBoundingClientRect() : null;
      let r=null; for(const x of [R1,R2]) if(x && x.height>0){ const tw=x===R2 ? Math.min(x.width, phaseEl.textContent.length*14+40) : x.width, cxm=x.left+x.width/2;
        const b=[cxm-tw/2, x.top, cxm+tw/2, x.bottom]; r = r ? [Math.min(r[0],b[0]),Math.min(r[1],b[1]),Math.max(r[2],b[2]),Math.max(r[3],b[3])] : b; }
      const cOp=+(getComputedStyle(countEl).opacity)||0, dOp=+(cdnEl.style.opacity||0); let r2=null, s2=0;
      for(const [el,o] of [[countEl,cOp],[cdnEl,dOp]]) if(o>.05 && el.textContent.trim()){ const x=el.getBoundingClientRect(), tw=Math.min(x.width, el.textContent.trim().length*24+30), cxm=x.left+x.width/2;
        const bb=[cxm-tw/2, x.top, cxm+tw/2, x.bottom]; r2 = r2 ? [Math.min(r2[0],bb[0]),Math.min(r2[1],bb[1]),Math.max(r2[2],bb[2]),Math.max(r2[3],bb[3])] : bb; s2=Math.max(s2,o); }
      const off=(q)=> q ? [q[0]-(GEO.left||0), q[1]-(GEO.top||0), q[2]-(GEO.left||0), q[3]-(GEO.top||0)] : q;   // canvas-relative
      silk.setQuiet(off(r), r ? Math.max(capOp*(capsOn?1:0), +(phaseEl.style.opacity||0)) : 0, off(r2), s2);
      // a quiet lane in the air under the hold clock (the layer's, or the thin arc) and under the breath-count beads
      const lineClock = typeof bline!=='undefined' && bline && bline.clock!=='off', hrr = lineClock ? Math.max(sphereR()*1.13, GEO.U*.2)+4 : Math.max(sphereR()*1.04, GEO.U*.2);
      const holdS = lineClock ? (curEv && (curEv.type==='hold'||curEv.type==='holdEmpty') && curEv.dur>3 && sessionMode ? 1 : 0) : holdOp/.92;
      const ph0 = sessionMode ? phaseAt(audio.currentTime) : '', beads = typeof bline!=='undefined' && bline && bline.count && bline.count!=='off' && /^(Four|Last|Breath of fire)/.test(ph0);
      window.__laneS = (window.__laneS||0) + ((beads ? .7 : 0) - (window.__laneS||0))*.08;
      if(holdS>.01) silk.setHoldLane(hrr/GEO.U, holdS); else silk.setHoldLane(.39+6/GEO.U, window.__laneS); }
    if(style===3 && silk){ silk.render(bSilk, k, w, now/1000); requestAnimationFrame(frame); return; }
    if(!gl){ requestAnimationFrame(frame); return; }
    gl.uniform2f(U.res,cv.width,cv.height); gl.uniform1f(U.t,(now-t0)/1000); gl.uniform1f(U.ft,ft);
    gl.uniform1f(U.b,b); gl.uniform1f(U.w,w); gl.uniform1f(U.still,flow); gl.uniform1f(U.k,k); gl.uniform1i(U.style,style);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    requestAnimationFrame(frame);
  }

  // ---------- player (v12): start screen, controls, scrubber by phase, fullscreen, settings, end screen ----------
  const $=id=>document.getElementById(id), body=document.body;
  const chrome=$('chrome');
  let chromeOn=false, chromeT=performance.now(), dragging=false, dragT=0, wl=null;
  const fmt=t=>{ t=Math.max(0,Math.floor(t)); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); };
  function showChrome(){ chromeOn=true; chromeT=performance.now(); chrome.classList.remove('off'); }
  function hideChrome(){ chromeOn=false; chrome.classList.add('off'); }
  const P_PLAY='<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
  const P_PAUSE='<rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/>';
  function setPlayIcon(){ const pl=audio.paused; $('playIco').innerHTML=pl?P_PLAY:P_PAUSE; $('playBtn').setAttribute('aria-label',pl?'Play':'Pause'); }
  audio.addEventListener('play',()=>{ setPlayIcon(); wake(); });
  audio.addEventListener('pause',()=>{ setPlayIcon(); if(sessionMode) showChrome(); if(P.onPause) P.onPause(audio.currentTime); });
  audio.addEventListener('ended',()=>{ if(sessionMode) showEnd(); });
  setPlayIcon();
  // scrubber: one segment per phase, width by duration
  const segsEl=$('segs'), knob=$('knob'), scrub=$('scrub'), tEl=$('tEl'), tPh=$('tPh'), tRem=$('tRem');
  let segEls=[];
  function buildSegs(){ segsEl.textContent=''; PHASES.forEach(ph=>{ const i=document.createElement('i'); i.style.flex=String(ph[1]-ph[0]); i.title=ph[4]; i.appendChild(document.createElement('b')); segsEl.appendChild(i); });
    segEls=[...segsEl.children]; tRem.textContent=fmt(DUR); scrub.setAttribute('aria-valuemax', String(Math.round(DUR))); }
  let lastEl='', lastPh='';
  function updateBar(at, ph){
    const e=fmt(at); if(e!==lastEl){ lastEl=e; tEl.textContent=e; scrub.setAttribute('aria-valuenow',String(Math.floor(at))); scrub.setAttribute('aria-valuetext',e+', '+ph); }
    if(ph!==lastPh){ lastPh=ph; tPh.textContent=ph; }
    let kx=0;
    PHASES.forEach((p,i)=>{ const f=Math.min(1,Math.max(0,(at-p[0])/(p[1]-p[0]))); segEls[i].firstChild.style.width=(f*100).toFixed(2)+'%';
      if(at>=p[0] && at<p[1]+(i===PHASES.length-1?1:0)) kx=segEls[i].offsetLeft+f*segEls[i].offsetWidth; });
    knob.style.left=kx.toFixed(1)+'px';
  }
  function timeAtX(x){ const r=segsEl.getBoundingClientRect(); x-=r.left;
    for(let i=0;i<segEls.length;i++){ const el=segEls[i], p=PHASES[i];
      if(x<=el.offsetLeft+el.offsetWidth || i===segEls.length-1){ const f=Math.min(1,Math.max(0,(x-el.offsetLeft)/el.offsetWidth)); return p[0]+f*(p[1]-p[0]); } }
    return 0; }
  scrub.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); dragging=true; scrub.classList.add('drag'); dragT=timeAtX(e.clientX); showChrome(); try{scrub.setPointerCapture(e.pointerId);}catch(_){} });
  scrub.addEventListener('pointermove',e=>{ if(dragging){ dragT=timeAtX(e.clientX); showChrome(); } });
  const endDrag=()=>{ if(!dragging) return; dragging=false; scrub.classList.remove('drag'); seek(dragT); };
  scrub.addEventListener('pointerup',endDrag); scrub.addEventListener('pointercancel',endDrag);
  scrub.addEventListener('keydown',e=>{ if(e.code==='ArrowLeft'||e.code==='ArrowRight'){ e.preventDefault(); e.stopPropagation(); seek(audio.currentTime+(e.code==='ArrowLeft'?-5:5)); } });
  let resetRound=function(){ roundBreaths=0; roundDone=false; trough=1; rising=false; holdT=0; fullFor=0; capIdx=-3; lastCue=-1; wTarget=0; fastRound=false; };
  function seek(t){ t=Math.min(DUR-1,Math.max(0,t)); try{ audio.currentTime=t; }catch(_){} resetRound(); showChrome(); }
  function togglePlay(){ startMusic(); if(audio.paused){ audio.play().catch(()=>{}); } else audio.pause(); showChrome(); }
  // fullscreen where the browser allows it (Android, desktop, iPad); iPhone Safari has no element fullscreen, so the button hides
  const fsOK=!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
  const isFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  if(!fsOK) $('fsBtn').hidden=true;
  function toggleFs(){ try{ if(isFs()){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); }
    else { const el=document.documentElement; const r=(el.requestFullscreen||el.webkitRequestFullscreen).call(el,{navigationUI:'hide'}); if(r&&r.catch) r.catch(()=>{}); } }catch(_){} }
  const updFs=()=>{ $('fsIco').innerHTML = isFs() ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'; $('fsBtn').setAttribute('aria-label',isFs()?'Exit full screen':'Full screen'); };
  document.addEventListener('fullscreenchange',updFs); document.addEventListener('webkitfullscreenchange',updFs);
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  // keep the screen awake while a session plays (tolerate refusal)
  async function wake(){ try{ if(navigator.wakeLock && !wl){ wl=await navigator.wakeLock.request('screen'); wl.addEventListener('release',()=>{ wl=null; }); } }catch(_){ wl=null; } }
  // back from the background (app switch, lock screen, in-app browser sheet): the wake lock was released and the
  // audio may have been paused by the system; show the controls so one tap resumes, and wake the sound engine
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState!=='visible' || !sessionMode) return;
    if(!audio.paused) wake(); else showChrome();
    if(A && A.ctx.state!=='running'){ try{ A.ctx.resume(); }catch(_){} } evI=-2; });
  window.addEventListener('pageshow',e=>{ if(e.persisted && sessionMode) showChrome(); });
  const setTitle=(k,t)=>{ $('ttlK').textContent=k; $('ttlT').textContent=t; };
  // from: seconds to start at (0 = the beginning; the exit screen's "back to the session" resumes where it stopped).
  // Called from the Play tap itself, so audio.play() runs inside the user gesture (iOS requires it).
  function startSession(from){ introT0=null; setTitle(SCORE.kicker||'', SCORE.title||''); freeMode=false; sessionMode=true; body.classList.remove('free'); body.classList.add('in-session');
    hintHidden=true; startMusic(); resetRound(); try{ audio.currentTime=Math.max(0, from||0); }catch(_){}
    const pr=audio.play(); showChrome(); if(coarse && fsOK && !isFs()) toggleFs();
    firePulse({type:'cue'}); flash(.3,.9);   // pressing play opens the room: one slow ring and a soft glow
    return pr && pr.catch ? pr : Promise.resolve(); }
  // leave the session (the close button): the page shows its calm exit screen; the room keeps breathing behind it
  function toStart(){ const at=audio.currentTime; if(!audio.paused) audio.pause(); sessionMode=false; freeMode=false; body.classList.remove('free','in-session'); press(false);
    capTarget=0; hideChrome(); if(isFs()) toggleFs(); return at; }
  function showEnd(){ const was=sessionMode; sessionMode=false; freeMode=false; body.classList.remove('in-session'); hideChrome(); capTarget=0; if(isFs()) toggleFs(); if(was && P.onFinish) P.onFinish(); }
  const on=(id,fn)=>{ const el=$(id); if(el) el.addEventListener('click',e=>{ e.stopPropagation(); fn(); }); };
  on('closeBtn',()=>{ const at=toStart(); if(P.onExit) P.onExit(at); }); on('playBtn',togglePlay); on('backBtn',()=>seek(audio.currentTime-10)); on('fwdBtn',()=>seek(audio.currentTime+10));
  on('fsBtn',()=>{ toggleFs(); showChrome(); });
  // no settings sheet on the web: the prototype's design toggles are fixed at their defaults
  const sheetOpen=()=>false, closeSheet=()=>{};
  // captions (Edvin's words) are on by default; the CC button turns them off
  let capsOn=true;
  function setCaps(v){ capsOn=!!v; capEl.style.visibility=capsOn?'':'hidden'; const cb=$('ccBtn'); if(cb) cb.setAttribute('aria-pressed',String(capsOn)); }
  on('ccBtn',()=>{ setCaps(!capsOn); showChrome(); });
  [chrome.querySelector('.top'), chrome.querySelector('.ctl')].forEach(el=>el.addEventListener('pointerdown',e=>{ e.stopPropagation(); showChrome(); }));

  // ---------- v13: technique-shaped breath, exact transition events, cues, layout from the sphere, ambient, settings ----------
  // The breath shape: the score's tapped curve (breath[] at fps) refined by score.shape, all optional:
  //   fire {t0,P,n0,n1,hi,lo,snap,from,to,fadeIn,fadeOut}: breath of fire, an explosive exhale on every beat (65 ms snap)
  //     then a passive recoil; analytic, so it's sharp at any frame rate
  //   warp [[new time, tapped time], ...]: tapped transitions moved onto Edvin's words (tapping reaction time)
  //   lead {t0,t1,s}: a stretch read s seconds ahead (The Wake Up's last gear lands on 'In, out')
  //   bridge [[from,to,v0|null|'lead',v1,'s'?], ...]: seams eased with zero speed at both ends (null: the score's value)
  //   box {t0,P,n,lo,hi,a}: an even in/out with a short rounding at each turn
  //   natural [{from,to,fade,t0,seed,base,depth,P}]: resting breathing, irregular but deterministic, eased out over `fade`
  let FIRE=null, BOX=null, WARP=null, LEAD=null, BRIDGE=[], NATURAL=[];
  function inFire(t){ return !!FIRE && t>FIRE.from && t<FIRE.to; }
  function arrB(t){ const B=SCORE.breath, x=t*SCORE.fps, i=Math.floor(x), f=x-i, n=B.length-1; if(i<0) return B[0]; if(i>=n) return B[n]; return B[i]+(B[i+1]-B[i])*f; }
  function fireB(t){ const F=FIRE; let n=Math.floor((t-F.t0)/F.P); if(n<F.n0) return F.hi; if(n>F.n1) n=F.n1;
    const tau=t-(F.t0+n*F.P); if(tau<0) return F.hi;
    if(tau<F.snap){ const u=tau/F.snap; return F.hi-(F.hi-F.lo)*(1-Math.pow(1-u,3)); }
    return F.lo+(F.hi-F.lo)*(1-Math.exp(-(tau-F.snap)/.15)); }   // the inhale is passive: the belly lets go and the air springs back
  function warp(t){ if(!WARP) return t; for(let i=1;i<WARP.length;i++){ const [n1,o1]=WARP[i]; if(t<=n1){ const [n0,o0]=WARP[i-1]; return o0+(o1-o0)*(t-n0)/(n1-n0); } } return t; }
  function boxB(t){ const x=(t-BOX.t0)/BOX.P, n=Math.floor(x), u=x-n, S=(1-BOX.a)*u+BOX.a*(.5-.5*Math.cos(Math.PI*u));
    return n%2===0 ? BOX.lo+(BOX.hi-BOX.lo)*S : BOX.hi-(BOX.hi-BOX.lo)*S; }
  // natural, resting breathing: deterministic but irregular cycles (length +-18 %, depth +-25 %), an active rise,
  // a passive fall that slows and rests a moment at the bottom, like a body breathing on its own
  function natB(t,t0,seed,base,depth,P){ let c=t0, i=0; const r=x=>{ const s=Math.sin(i*12.9898+seed*78.233+x*4.1)*43758.5453; return s-Math.floor(s); };
    if(t<c) return base;
    for(;i<400;i++){ const len=P*(.82+.36*r(1)); if(t<c+len){ const u=(t-c)/len, dp=depth*(.75+.5*r(2)), ins=.36+.08*r(3);
        const y = u<ins ? .5-.5*Math.cos(Math.PI*u/ins) : .5+.5*Math.cos(Math.PI*Math.min(1,(u-ins)/((1-ins)*.86)));
        return base+dp*y; } c+=len; }
    return base; }
  const inLead=t=>!!LEAD && t>=LEAD.t0 && t<LEAD.t1;
  function breathAt(t){ let v = inLead(t) ? arrB(t+LEAD.s) : arrB(warp(t));
    for(const g of BRIDGE) if(t>g[0] && t<g[1]){ const v0=g[2]==null ? arrB(warp(g[0])) : g[2]==='lead' ? arrB(g[0]+(LEAD?LEAD.s:0)) : g[2], u=(t-g[0])/(g[1]-g[0]);
      return v0+(g[3]-v0)*(g[4]==='s' ? u*u*(3-2*u) : .5-.5*Math.cos(Math.PI*u)); }
    if(BOX && t>BOX.t0 && t<BOX.t0+BOX.n*BOX.P) v=boxB(t);
    for(const N of NATURAL) if(t>N.from && t<N.to){ const nat=natB(t,N.t0,N.seed,N.base,N.depth,N.P), m=Math.min(1,Math.max(0,(N.to-t)/(N.fade||2))); v=v+(nat-v)*m*m*(3-2*m); }
    if(inFire(t)){ const wg=Math.max(0,Math.min(1,(t-FIRE.from)/(FIRE.fadeIn||.6),(FIRE.to-t)/(FIRE.fadeOut||.35))); v+=(fireB(t)-v)*wg; }
    return v; }
  // exact events from the score: turning points refined to the true extremum, holds, releases, fire kicks
  let EV=[];
  function buildEV(){ const hz=50, N=Math.floor(DUR*hz), cls=[];
    const quiet=t=>{ const ph=phaseAt(t); return ph==='Arrival'||ph==='Integration'||ph==='Closing'||ph===''; };
    for(let i=0;i<N;i++){ const t=i/hz; if(inFire(t)||quiet(t)){ cls.push('x'); continue; }
      const v=(breathAt(t+.03)-breathAt(t-.03))/.06, bb=breathAt(t);
      cls.push(v>.07?'in':v<-.07?'out':(bb>.7?'hold':bb<.3?'low':'mid')); }
    const runs=[]; for(let i=0;i<N;){ let j=i; while(j<N && cls[j]===cls[i]) j++; runs.push({ty:cls[i],t:i/hz,d:(j-i)/hz}); i=j; }
    const out=[]; let last='';
    // the turning point = the last moment the breath was still at its extreme (it leaves it here)
    const ext=(t,up)=>{ let bv=breathAt(t); for(let u=t-.9;u<=t;u+=.01){ const x=breathAt(u); if(up ? x<bv : x>bv) bv=x; }
      let bt=t; for(let u=t;u>=t-.9;u-=.01){ const x=breathAt(u); if(Math.abs(x-bv)<.0015){ bt=u; break; } } return bt; };
    // a hold starts when the breath has all but arrived (within 0.05 of the plateau), not when it is perfectly still
    const arrive=(t)=>{ const pl=breathAt(t+.3); let bt=t; for(let u=t;u>=t-2;u-=.01){ if(Math.abs(breathAt(u)-pl)>.05){ bt=u+.01; break; } } return bt; };
    for(const r of runs){
      if(r.ty==='in' && r.d>=.2){ out.push({t:ext(r.t,true),type:'in',fast:r.d<1.4}); last='in'; }
      else if(r.ty==='out' && r.d>=.2){ out.push({t:ext(r.t,false),type:last==='hold'?'release':'out',fast:r.d<1.4 && last!=='hold'}); last='out'; }
      else if(r.ty==='hold' && r.d>=.8){ out.push({t:arrive(r.t),type:'hold'}); last='hold'; }
      else if(r.ty==='low' && r.d>=4 && phaseAt(r.t)==='Hold and release'){ out.push({t:r.t,type:'holdEmpty'}); last='holdEmpty'; } }
    out.sort((a,b)=>a.t-b.t);
    for(let i=0;i<out.length;i++) if(out[i].type==='hold'||out[i].type==='holdEmpty'){ const nx=out[i+1]; out[i].dur = nx ? nx.t-out[i].t : 0; }
    if(FIRE) for(let n=FIRE.n0;n<=FIRE.n1;n++) out.push({t:FIRE.t0+n*FIRE.P,type:'kick',fast:true});
    CAPS.forEach(c=>{ if(/^three,? two,? one\.?$/i.test(String(c[2]).trim()) && c[3]){ c.cd=true; c[3].forEach((t,i)=>{ if(t!=null) out.push({t,type:'count',n:3-i,fast:true}); }); } });
    for(const c of (SCORE.cues||[])) out.push({t:c,type:'cue',fast:true});
    return out.sort((a,b)=>a.t-b.t); }
  const firstKick=()=>FIRE ? FIRE.t0+FIRE.n0*FIRE.P : -99;
  window.__EV=EV;   // inspection aid for the prototype
  // what a guidance layer (or another renderer) may read, every frame
  const safeProbe=document.createElement('div'); safeProbe.style.cssText='position:fixed;left:0;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(safeProbe);
  window.__bc={get EV(){ return EV; }, phaseAt, breathAt, get FIRE(){ return FIRE; }, get phases(){ return PHASES; }, bounds:bnd, late:lateAt, get at(){ return audio.currentTime; }, get paused(){ return audio.paused; },
    get session(){ return sessionMode; }, get cur(){ return curEv; }, get free(){ return freeMode; }, get chrome(){ return chromeOn || sheetOpen(); },
    reduced: reduceMotion,
    layout(){ return { W:GEO.W||innerWidth, H:GEO.H||innerHeight, cx:(GEO.cx??innerWidth/2)-(GEO.left||0), cy:GEO.cy-(GEO.top||0), U:GEO.U, R:sphereR(),
      capBottom: (GEO.capTop ?? GEO.cy+GEO.Rmax+64)+Math.min(innerHeight*.1, 62), safeBottom: safeProbe.offsetHeight||0 }; },
    get holds(){ return EV.filter(e=>(e.type==='hold'||e.type==='holdEmpty') && e.dur>0).map(e=>({type:e.type, start:e.t, dur:e.dur})); },
    get hold(){ const e=curEv; if(!sessionMode || !e || !(e.type==='hold'||e.type==='holdEmpty') || !e.dur) return null; const el=audio.currentTime-e.t;
      return {type:e.type, start:e.t, dur:e.dur, elapsed:el, remaining:Math.max(0,e.dur-el), frac:Math.max(0,Math.min(1,el/e.dur))}; }};
  let evI=-2, curEv=null;
  const evAt=t=>{ let i=-1; while(i+1<EV.length && EV[i+1].t<=t) i++; return i; };
  function trackEvents(){ const at=audio.currentTime+.02;
    if(evI===-2 || (evI>=0 && EV[evI].t>at+.05)){ evI=evAt(at); }
    else while(evI+1<EV.length && EV[evI+1].t<=at){ evI++; if(!audio.paused && at-EV[evI].t<.3){ firePulse(EV[evI]); if(P.onEvent) P.onEvent(EV[evI]); } }
    let j=evI; while(j>=0 && (EV[j].type==='cue'||EV[j].type==='count'||EV[j].type==='kick' && false)) j--; curEv = j>=0 ? EV[j] : null;
    if(curEv && ['Arrival','Integration','Closing'].includes(phaseAt(curEv.t))) curEv=null; }
  function emitEv(type){ curEv={t:performance.now()/1000,type,fast:false}; firePulse(curEv); }

  // layout from the silk's geometry: sphere centre and its largest radius; words and counters stay off it
  const GEO={U:1,cy:0,Rmax:1};
  // geometry from the canvas the sphere is actually drawn on (in some app webviews it is taller than innerHeight)
  function visRect(){ const s=document.getElementById('silk'), st=document.getElementById('stage');
    const el = s && s.style.display!=='none' ? s : st; const r = el ? el.getBoundingClientRect() : null;
    return r && r.width>0 && r.height>0 ? r : { left:0, top:0, width:innerWidth, height:innerHeight }; }
  function layout(){ const RC=visRect(), W=RC.width, H=RC.height, U=Math.min(W,H*.5625);
    GEO.U=U; GEO.left=RC.left; GEO.top=RC.top; GEO.W=W; GEO.H=H; GEO.cx=RC.left+W/2; GEO.cy=RC.top+H/2-.10*U; GEO.Rmax=.36*U;
    phaseEl.style.top=Math.round(GEO.cy+GEO.Rmax+14)+'px';
    // captions stay at least 16 px clear of the player controls (the scrubber row), on short screens too
    const tr=document.querySelector('.times'), trTop=tr ? tr.getBoundingClientRect().top : 0, capH=62;
    GEO.capTop=Math.round(Math.min(GEO.cy+GEO.Rmax+64, trTop>0 ? trTop-16-capH : Infinity));
    capEl.style.top=GEO.capTop+'px';
    document.documentElement.style.setProperty('--holdTop', Math.max(96, Math.round(GEO.cy-GEO.Rmax-62))+'px'); }
  addEventListener('resize',layout); layout();
  try{ const ro=new ResizeObserver(()=>layout()); ['silk','stage'].forEach(id=>{ const e=document.getElementById(id); if(e) ro.observe(e); }); }catch(_){}
  if(window.visualViewport) visualViewport.addEventListener('resize',layout);
  setInterval(layout,1000);   // cheap safety net: style switches and canvas swaps (context loss) re-measure
  const sphereR=()=>{ const bs = silk && silk.state ? Math.min(1,silk.state.bs) : b; return (.10+.25*bs)*GEO.U; };

  // transition cues: in = a ring gathers into the sphere, out = a ring leaves it, hold = a ring settles on its edge,
  // release = a wide warm wave, fire = a short sharp shock on every exhale
  const countT=$('countT'), kbarB=$('kbarB'), flashEl=$('flash'), holdRing=$('holdRing');
  const RINGS=[...document.querySelectorAll('.pring')].map(el=>({el,t0:-99,dur:1,r0:1,r1:1,op:0}));
  let mood=[.25,0,1,.3], punchV=0, holdLeft=-1, calmNow=0, bumpT=-1e9, pulsesOn=true, flashV=0, flashTau=.3, holdOp=0, amb=1, ambLevel=1, capOff=0;
  // reduced motion: a ring doesn't travel; it appears at the sphere's edge and crossfades out
  function ring(r0,r1,dur,op,warm){ if(reduceMotion){ r0=r1=Math.min(r0,r1)*1.02+Math.abs(r1-r0)*.25; dur=Math.min(dur,.9); op*=.8; } const t=performance.now()/1000; let r=RINGS.find(x=>t-x.t0>x.dur); if(!r) r=RINGS.reduce((a,c)=>c.t0<a.t0?c:a);
    Object.assign(r,{t0:t,r0,r1,dur,op}); r.el.classList.toggle('warm',!!warm); }
  function flash(v,tau){ flashV=Math.max(flashV,v); flashTau=tau; }
  function kickSound(){ if(!A || !sndOn || !A.noise) return; const c=A.ctx, t=c.currentTime;
    const src=c.createBufferSource(); src.buffer=A.noise; const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500; bp.Q.value=.8;
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.2,t+.006); g.gain.exponentialRampToValueAtTime(.001,t+.12);
    src.connect(bp).connect(g).connect(A.master); src.start(t, Math.random()*2); src.stop(t+.15); }
  // transition cue designs: 'ring' = the CSS ring and flash; the others are drawn in the silk and the room (WebGL)
  const CUEMODES={ ring:0, light:1|2, catch:1|4, pressure:8, shimmer:16, rimwave:1|8, combo:1|8|16 };
  let cueStyle = (new URLSearchParams(location.search).get('cue')) || 'combo';   // default: the cue travels through the air and lights the sphere's edge
  function setCueStyle(v){ cueStyle=v; document.querySelectorAll('[data-cue]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.cue===v?'true':'false')); }
  document.querySelectorAll('[data-cue]').forEach(el=>el.addEventListener('click',e=>{ e.stopPropagation(); setCueStyle(el.dataset.cue); }));
  setCueStyle(cueStyle);
  function cueMask(){ const m = CUEMODES[cueStyle] ?? 0; return reduceMotion && m ? 1 : m; }   // reduced motion: light in place only
  function glCue(ev){
    const n=ev.n||0, T={ top:[1,.62], in:[1,1], out:[-1,1], hold:[0,.8], holdEmpty:[0,.7], release:[-1,1.5], kick:[-1,.55], count:[1,.55+.2*(3-n)] };
    const cueKind = ev.type==='cue' ? kindOf(PHASES.find(p=>Math.abs(p[0]-ev.t)<.05)||[0,0,'']) : '';
    let v = ev.type==='cue' ? (cueKind==='fire' ? [-1,1.3] : [1,1.1]) : T[ev.type];
    if(!v) return; if(ev.fast && (ev.type==='in'||ev.type==='out')) v=[v[0],.6];
    if(ev.type==='release' && sessionMode && lateAt(ev.t)) v=[v[0],1.8];
    silk.cue(v[0], v[1]); }
  function firePulse(ev){ const R=sphereR();
    if(ev.type==='kick') kickSound();
    if(pulsesOn && cueMask() && silk && silk.cue){   // world cues replace the CSS ring and flash; numerals and the hold arc stay
      silk.setCueMode(cueMask()); glCue(ev);
      punchV=Math.max(punchV, ev.type==='kick' ? (Math.abs(ev.t-firstKick())<.01 ? 1.5 : 1) : 0);
      if(ev.type==='count'){ cdN=ev.n; cdT0=performance.now()/1000; cdnEl.textContent=String(ev.n); }
      return; }
    // counts gather light towards "one"; the first fire kick is the spark that shifts the session up a gear
    if(pulsesOn) punchV=Math.max(punchV, ev.type==='count' ? .2+.15*(3-ev.n) : ev.type==='kick' ? (Math.abs(ev.t-firstKick())<.01 ? 1.5 : 1) : ev.fast && (ev.type==='out'||ev.type==='in') && !inFire(ev.t) ? .38 : 0);   // fire: only the exhale; last gear: both, equal
    if(!pulsesOn) return;
    switch(ev.type){
      case 'top': ring(R*1.32,R*1.02,.42,.34); flash(.1,.22); break;   // the double inhale's top-up: a short, distinct sip in
      case 'in':  if(ev.fast){ ring(R*1.3,R*1.0,.45,.2); break; } ring(R*1.75,R*1.04,.62,.42); flash(.14,.28); break;   // in and out carry equal weight
      case 'out': if(ev.fast){ ring(R*1.0,R*1.3,.45,.2); break; } ring(R*1.02,R*1.65,.62,.42); flash(.14,.28); break;
      case 'hold': case 'holdEmpty': flash(.24,.55); break;
      case 'release': { const big = sessionMode && lateAt(ev.t) ? 1.25 : 1; ring(R*1.0,R*2.7*big,1.7*big,.6,true); ring(R*1.0,R*1.9*big,1.1*big,.35,true); flash(.6*big,.75*big); break; }
      case 'kick': ring(R*.98,R*1.26,.28,.34); flash(.44,.1); break;
      case 'cue':   // the first round gathers attention in; breath of fire is a spark outwards; last gear draws in again
        { const ck = ev.t!=null ? kindOf(PHASES.find(p=>Math.abs(p[0]-ev.t)<.05)||[0,0,'']) : '', first = ev.t!=null && PHASES.findIndex(p=>p[3]!=='arrival')===PHASES.findIndex(p=>Math.abs(p[0]-ev.t)<.05);
        if(ev.t!=null && first){ ring(R*2.6,R*1.05,1.4,.4); ring(R*3.4,R*1.1,1.9,.22); flash(.2,.6); }
        else if(ck==='fire'){ ring(R*1.05,R*2.6,1.2,.45,true); flash(.3,.35); }
        else if(ck==='peak'){ ring(R*2.2,R*1.05,.9,.35); flash(.16,.4); }
        else ring(R*1.1,R*2.2,1.8,.3); } break;
      case 'count': cdN=ev.n; cdT0=performance.now()/1000; cdnEl.textContent=String(ev.n); ring(R*1.9,R*1.03,.7,.5); flash(.12+.1*(3-ev.n),.3); break; } }
  const cdnEl=$('cdn'), arcP=$('arcP'); let cdN=0, cdT0=-99, lastTick=-1;
  function ambientAndPulses(dt, now){
    const t=now/1000, cx=(GEO.cx??innerWidth/2), cy=GEO.cy;
    for(const r of RINGS){ const u=(t-r.t0)/r.dur; const el=r.el;
      if(u<0 || u>=1){ if(el.style.opacity!=='0') el.style.opacity='0'; continue; }
      const e=1-Math.pow(1-u,3), rad=r.r0+(r.r1-r.r0)*e;
      el.style.width=el.style.height=(2*rad).toFixed(1)+'px'; el.style.transform='translate('+(cx-rad).toFixed(1)+'px,'+(cy-rad).toFixed(1)+'px)';
      el.style.opacity=(r.op*Math.min(1,.45+u/.1)*Math.pow(1-u,1.4)).toFixed(3); }   // visible on its first frame
    punchV*=Math.exp(-dt/.1); if(silk && silk.setPunch) silk.setPunch(punchV);
    flashV*=Math.exp(-dt/flashTau); const fr=sphereR()*1.6;
    flashEl.style.width=flashEl.style.height=(2*fr).toFixed(1)+'px'; flashEl.style.transform='translate('+(cx-fr).toFixed(1)+'px,'+(cy-fr).toFixed(1)+'px)';
    flashEl.style.opacity=(pulsesOn?flashV:0).toFixed(3);
    { const u=t-cdT0; const o = cdN && u<.95 ? Math.min(1,u/.06)*Math.pow(1-u/.95,1.2) : 0;
      cdnEl.style.opacity=o.toFixed(3); cdnEl.style.top=Math.round(GEO.cy+GEO.Rmax+2)+'px';
      cdnEl.style.transform='scale('+(reduceMotion ? 1 : 1+.25*Math.exp(-u/.12)).toFixed(3)+')'; if(o) phaseEl.style.opacity='0'; }
    const holding = pulsesOn && phaseName==='Hold';
    { let frac=1, last=false; const hev = sessionMode && curEv && curEv.dur>3 && (curEv.type==='hold'||curEv.type==='holdEmpty') ? curEv : null;
      if(hev){ const el=audio.currentTime-hev.t, left=hev.dur-el; frac=Math.max(0,Math.min(1,left/hev.dur)); last = left<=10.5 && hev.dur>14;
        const sec=Math.floor(left+.15); if(last && sec!==lastTick && sec>0){ lastTick=sec; flash(.1,.2); } }
      arcP.style.strokeDashoffset=(100*(1-frac)).toFixed(2); holdRing.classList.toggle('last', last); countEl.classList.toggle('last', last);
      holdLeft = last && hev ? Math.max(0,Math.floor(hev.dur-(audio.currentTime-hev.t)+.15)) : -1; }   // reads 10 when Edvin says ten
    holdOp += ((holding ? .92*(1-.12*calmNow) : 0)-holdOp)*(1-Math.exp(-dt/(holding?.25:.2)));
    // around a small (empty-lung) sphere the arc keeps its distance, so the ember glows inside it instead of being outlined
    const hr=Math.max(sphereR()*1.04, GEO.U*.2); holdRing.style.width=holdRing.style.height=(2*hr).toFixed(1)+'px';
    holdRing.style.transform='translate('+(cx-hr).toFixed(1)+'px,'+(cy-hr).toFixed(1)+'px)'; holdRing.style.opacity=(bline && bline.clock!=='off' ? 0 : holdOp).toFixed(3);   // the layer's hold clock replaces the thin arc
    // ambient life: strongest where nothing is being asked of you
    let ambT;
    if(!sessionMode && !freeMode) ambT=1;
    else if(freeMode) ambT=(!down && now-lastPress>3000) ? .9 : .45;
    else { const ph=phaseAt(audio.currentTime);
      ambT = ph==='Arrival' ? .5+.5*Math.min(1,audio.currentTime/25) : ph==='Integration' ? 1.15 : ph==='Closing' ? .85 : ph==='Hold and release' ? (curEv && /hold/i.test(curEv.type) ? .8 : .4) : .22; }
    amb += (ambT*ambLevel-amb)*(1-Math.exp(-dt/2.2)); if(silk && silk.setAmbient) silk.setAmbient(amb);
    // mood of the room: [vignette, cool, ember clock rate]; eased so each change of phase is a slow, designed turn
    { let M=[.25,0,1,.3];
      if(sessionMode){ const at=audio.currentTime, ph=phaseAt(at), ty=curEv ? curEv.type : '';
        const late=lateAt(at);   // the second round is the culmination: its release is the biggest of the session
        M = ph==='Arrival' ? [.2,0,.9,.15+.45*Math.min(1,at/30)] : ph==='Four in, four out' ? [.42,0,.75,0] : ph==='Breath of fire' ? [.58,0,1.7,0] : ph==='Last gear' ? [.6,0,1.9,0]
          : ph==='Hold and release' ? (ty==='hold'||ty==='holdEmpty' ? [.55,.55,.22,0] : ty==='release' ? [.3,0,1.2,late?1:.3] : [.45,.15,.8,0])
          : ph==='Integration' ? [.16,0,.85,1] : ph==='Closing' ? [.45,0,.6,.6] : M; }
      else if(freeMode) M = holdT>1 ? [.5,.45,.3,0] : [.3,0,1,.3]; else M=[.22,0,.8,.7];
      for(let i=0;i<4;i++) mood[i]+=(M[i]-mood[i])*(1-Math.exp(-dt/(i===2?1.2:i===3?3.5:2.4)));
      if(silk && silk.setMood) silk.setMood(mood[0], mood[1], mood[2], mood[3]); } }

  // settings: the prototype's defaults (ambient 100 %, music moves the room 70 %, word timing 0 ms); nothing is stored
  ambLevel=1; musAmt=.7; capOff=0;
  const _reset=resetRound; resetRound=function(){ _reset(); evI=-2; curEv=null; };
  // centre: Tide's light (default) or the silk
  let curSrc=silkOpts.source||'rim';
  function setSrc(v){ curSrc=v; silkOpts.source=v; if(silk && silk.setSource) silk.setSource(v); document.querySelectorAll('[data-src]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.src===v?'true':'false')); }
  setSrc(curSrc);
  // the breath line layer
  let lineStyle=(new URLSearchParams(location.search).get('line'))||'thread';
  holdNums=(new URLSearchParams(location.search).get('nums'))||'last';
  try{ bline=window.createBreathLine(document.body, window.__bc, { halo: true, style: lineStyle==='off' ? 'thread' : lineStyle, visible: lineStyle!=='off', clock: new URLSearchParams(location.search).get('clock')||'drain', count: new URLSearchParams(location.search).get('count')||'beads' }); }catch(_){ bline=null; }
  window.__bline=bline;   // inspection aid
  const clockQ=new URLSearchParams(location.search).get('clock')||'drain';
  function setLine(v){ lineStyle=v; if(bline){ bline.setVisible(v!=='off'); bline.setClock(v==='off' ? 'off' : clockQ); if(v!=='off') bline.setStyle(v); }
    document.querySelectorAll('[data-line]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.line===v?'true':'false')); }
  setLine(lineStyle);
  let countStyle=new URLSearchParams(location.search).get('count')||'beads';
  function setCount(v){ countStyle=v; if(bline) bline.setCount(v); document.querySelectorAll('[data-count]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.count===v?'true':'false')); }
  setCount(countStyle);
  if(window.RENDER) Object.assign(window.__render,{ start:startSession, seek, EV, GEO, silk:()=>silk,
    probe(){ const op=el=>+(el.style.opacity||0); return { at:audio.currentTime, b, k, w, bs: silk&&silk.state ? silk.state.bs : b,
      rings:RINGS.map(r=>op(r.el)), flash:op(flashEl), phase:phaseName, phaseOp:op(phaseEl), cdn:cdnEl.textContent, cdnOp:op(cdnEl),
      hold:op(holdRing), gl: silk && silk.state && silk.state.cueT0!=null ? silk.state.cueS*Math.exp(-Math.max(0,performance.now()/1000-silk.state.cueT0)/.26) : 0, count:countText, countOp:+getComputedStyle(countEl).opacity, capOp:op(capEl), capB: capEl.textContent ? capEl.getBoundingClientRect().bottom : 0, band: bline && bline.band ? bline.band[0] : 0, lineOp: bline ? +bline.canvas.style.opacity||0 : 0, cur:curEv?curEv.type:'' }; } });

  // ---- load a session's score (and switch sessions later without rebuilding the renderer) ----
  function useScore(sc){
    SCORE=sc; CAPS=(sc.caps||[]).map(c=>c.slice()); DUR=+sc.dur || (sc.phases && sc.phases.length ? sc.phases[sc.phases.length-1][1] : 1);
    PHASES=(sc.phases||[]).map(p=>{ const k=kindOf(p); return [p[0],p[1],KIND_NAME[k],k,p[2]]; });   // [from, to, canonical name, kind, label]
    const sh=sc.shape||{}; FIRE=sh.fire||null; BOX=sh.box||null; WARP=sh.warp||null; LEAD=sh.lead||null; BRIDGE=sh.bridge||[]; NATURAL=sh.natural||[];
    // events: exact from the score (score.ev, the session-scores format), or derived from the curve (The Wake Up)
    EV = Array.isArray(sc.ev) ? sc.ev.map(e=>Object.assign({},e)).sort((a,b)=>a.t-b.t) : buildEV(); window.__EV=EV; evI=-2; curEv=null; capIdx=-2; ROUND_CUES=(sc.cues||[]);
    if(bline && bline.reset) bline.reset();
    buildSegs();
    const look=sc.look||{}; JOURNEY=look.journey||sc.journey||null;
    const qW=new URLSearchParams(location.search).get('world'); if(!qW && look.world && TIDE_WORLDS[look.world]) setWorld(look.world);
    setJourney(journeyOn && !!JOURNEY); }
  setWorld(curWorld);
  useScore(P.score);
  requestAnimationFrame(frame);
  return {
    start: startSession,                       // start(fromSeconds): call inside the Play tap
    exit: toStart, setScore: useScore, setCaptions: setCaps, setWorld,
    intro(on){ if(on){ introFrom=b; introT0=performance.now(); } else introT0=null; },   // one breath with the light, no voice
    get breath(){ return b; },
    relayout: ()=>layout(),
    get startAt(){ return Math.max(0, +(SCORE && SCORE.startAt) || 0); },   // where the web playback starts (1 s before Edvin's first word)
    get at(){ return audio.currentTime; }, get dur(){ return DUR; }, get playing(){ return sessionMode && !audio.paused; },
    tier: silk ? 'silk' : gl ? 'webgl1' : 'orb',
    seek: (t)=>seek(t),
  };
}
