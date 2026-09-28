// Tide Breath Canvas visual layers, ported from the marketing prototype (wehale-app
// docs/marketing/2026-q4-paid/breath-canvas, scratchpad 'tide'). Three self-contained parts, kept verbatim
// apart from phase handling: the colour script, the silk + Tide field renderer (WebGL2), and the breath line.
// Phase checks read canonical phase names from window.__bc.phaseAt(), which the player maps from each
// phase's kind, so any session's score drives the same visual grammar.
// ---- Tide colour script: the palette shifts with the session, section by section (FEELING-MAP.md) ----
// A small, reusable function: session time + phase + current event -> a colour modifier (luminance, saturation,
// warmth towards the world's own hot or pale tone, glow), eased over seconds so changes feel designed, not cut.
// Every world uses the same arc in its own hues. Exposed as window.__colourScript for other pages (e.g. the silk
// player): const arc = __colourScript.create('ember'); each frame: const m = arc.update(dt, window.__bc);
// then __colourScript.apply([r,g,b], m, 'ember') -> [r,g,b].
(function () {
  // each world's own hues: hot (energy), pale (afterglow), deep (the low, held empty-lung hold). Night stays silver and
  // ink (deeper and dimmer, never red); Water stays blue-green.
  const TONES = {
    ember: { hot: [1, .45, .08], pale: [1, .88, .66], deep: [.85, .26, .05] },
    dawn: { hot: [1, .42, .35], pale: [1, .90, .84], deep: [.72, .26, .30] },
    water: { hot: [.10, .72, .78], pale: [.75, .95, 1], deep: [.03, .34, .48], amp: .35 },   // amp: how far the brightness moves (calm worlds move less)
    night: { hot: [.66, .72, 1], pale: [.95, .95, 1], deep: [.30, .36, .66], amp: .6 },
    moss: { hot: [.78, .82, .16], pale: [.95, .95, .72], deep: [.34, .46, .12] },
  };
  // the arc: lum (brightness), sat (saturation), warm (+ towards the hot tone, - towards the pale one), glow
  const ARC = {
    start: { lum: .95, sat: .9, warm: 0, glow: 1 },   // deep (0..1): how much a warm lean uses the deep tone instead of the hot one
    arrival: { lum: .80, sat: .80, warm: -.15, glow: .85 },      // dusky, low: first light
    box: { lum: 1.0, sat: 1.0, warm: 0, glow: 1 },                // steady, balanced
    fire: { lum: 1.10, sat: 1.22, warm: .50, glow: 1.12 },        // hotter, more saturated
    gear: { lum: 1.18, sat: 1.30, warm: .70, glow: 1.22 },        // the peak: hottest, strongest contrast
    hold: { lum: .90, sat: .72, warm: -.10, glow: .95 },          // quieter, less saturated, still warm
    release: { lum: 1.15, sat: 1.08, warm: .40, glow: 1.30 },     // a golden bloom spreading out
    empty: { lum: .72, sat: 1.0, warm: .45, glow: .90, tone: 'deep' },   // a low, deep ember (in each world's own deep tone)
    round2: { lum: 1.12, sat: 1.20, warm: .55, glow: 1.18 },      // the richest
    integration: { lum: 1.05, sat: .78, warm: -.35, glow: 1.08 }, // soft, luminous, pale afterglow
    closing: { lum: .66, sat: .70, warm: .10, glow: .80 },       // a gentle dusk
  };
  const TAU = { lum: 3, sat: 3.5, warm: 4, glow: 2.5, deep: 4 };
  function section(bc) {
    if (!bc || !bc.session) return 'start';
    const at = bc.at, ph = bc.phaseAt(at), e = bc.cur, ty = e ? e.type : '';
    if (ph === 'Arrival') return 'arrival';
    if (ph === 'Four in, four out') return 'box';
    if (ph === 'Breath of fire') return 'fire';
    if (ph === 'Last gear') return 'gear';
    if (ph === 'Integration') return 'integration';
    if (ph === 'Closing' || ph === '') return 'closing';
    // hold and release: the holds, the releases (a few seconds of bloom), the empty hold, the second round
    if (ty === 'holdEmpty') return 'empty';
    if (ty === 'hold') return 'hold';
    if (ty === 'release' && at - e.t < 4) return 'release';
    return (bc.late ? bc.late(at) : at > 205) ? 'round2' : 'box';
  }
  function create(world) {
    const m = Object.assign({}, ARC.start); let name = world || 'ember', sec = 'start';
    return {
      get section() { return sec; }, setWorld(w) { name = w; },
      update(dt, bc) { sec = section(bc); const T = ARC[sec] || ARC.box;
        for (const k in TAU) { const tv = k === 'deep' ? (T.tone === 'deep' ? 1 : 0) : T[k]; m[k] = (m[k] ?? tv) + (tv - (m[k] ?? tv)) * (1 - Math.exp(-Math.max(0, dt || 0) / TAU[k])); }
        return m; },
      get mods() { return m; }, get world() { return name; } };
  }
  function apply(c, m, world) {
    const t = TONES[world] || TONES.ember; let r = c[0], g = c[1], b = c[2];
    const L0 = Math.max(1e-4, .3 * r + .59 * g + .11 * b);
    if (m.warm > 0) { const k = m.warm * .7, dp = m.deep || 0, h = [0, 1, 2].map((i) => t.hot[i] + (t.deep[i] - t.hot[i]) * dp), Lh = .3 * h[0] + .59 * h[1] + .11 * h[2], s = L0 / Lh;
      r += (h[0] * s - r) * k; g += (h[1] * s - g) * k; b += (h[2] * s - b) * k; }
    else if (m.warm < 0) { const k = -m.warm * .7, h = t.pale, Lh = .3 * h[0] + .59 * h[1] + .11 * h[2], s = L0 / Lh;
      r += (h[0] * s - r) * k; g += (h[1] * s - g) * k; b += (h[2] * s - b) * k; }
    const L = .3 * r + .59 * g + .11 * b;
    r = L + (r - L) * m.sat; g = L + (g - L) * m.sat; b = L + (b - L) * m.sat;
    const lm = 1 + (m.lum - 1) * (t.amp ?? 1);
    return [Math.max(1e-4, r * lm), Math.max(1e-4, g * lm), Math.max(1e-4, b * lm)];   // never exactly 0 (some shaders divide by a channel)
  }
  window.__colourScript = { create, apply, section, ARC, TONES };
})();

// WeHale silk: a breath visual made of fine silk threads. WebGL2, no libraries.
// Size and tautness of the silk sphere = breath. Nothing moves on its own clock: rotation and
// flow advance only while the breath changes, then settle; in a hold only a very slow sheen drifts.
//
//   <script src="silk.js"><\/script>   (classic script: defines window.createSilk; can also be inlined)
//   const silk = createSilk(canvas, { palette: 'ember', depth: 1 });
//   silk.render(b, k, w, t);   // b breath 0..1, k intensity 0..1, w release warmth 0..1, t seconds
//   silk.setPalette('teal' | {base, pale, tint, ground});   silk.setDepth(0..1);
//
// Options: { threads, points, palette, depth, ss, dprCap, grain, autoSize, preserve }.
// Defaults cap the geometry on phones (coarse pointer / small screen).
// For compatibility, window.SILK_PALETTE / window.SILK_DEPTH are honoured until setPalette/setDepth is called.
(function () {
const PALETTES = {
  ember: { base: [.82, .30, .07], pale: [1., .78, .50], tint: [.10, .03, .006], ground: [.0055, .0022, .0009] },
  teal:  { base: [.059, .462, .352], pale: [.55, .97, .86], tint: [.02, .12, .10], ground: [.003, .007, .012] },
  amber: { base: [.72, .38, .10], pale: [1., .86, .62], tint: [.09, .045, .012], ground: [.005, .003, .0012] },
  dawn:  { base: [.66, .27, .22], pale: [1., .80, .70], tint: [.09, .03, .03], ground: [.0055, .0025, .0025] },
  pearl: { base: [.40, .44, .54], pale: [.93, .95, 1.], tint: [.05, .06, .11], ground: [.006, .007, .012] },
  sage:  { base: [.30, .46, .26], pale: [.87, .95, .78], tint: [.04, .07, .035], ground: [.003, .0045, .002] },
};

const VS_LINES = `#version 300 es
precision highp float;
in vec3 a;                       // thread id, position along the thread 0..1, side -1/+1
uniform vec2 uRes; uniform float uU, uM;
uniform float uB, uTaut, uFlowT, uWarm, uRl, uLift, uK, uLight, uDens, uWind, uCalm, uRel0, uSpin, uTilt, uHL, uPunch, uAmb, uB2, uCueA, uCueD, uCueS, uCueM;
// transition cue drawn in the world itself (uCueM bits: 1 rim flare, 2 meridian sweep, 4 threads catch, 8 pressure wave, 16 shimmer ring)
bool cueOn(int bit){ return (int(uCueM+.5) & bit) != 0; }
float cueEnv(float tau){ return uCueS*step(0.,uCueA)*exp(-max(uCueA,0.)/tau); }
uniform vec3 uBase, uPale;
out vec3 vC; out float vS; out float vB;
float h(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h3(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx)*2.-1.; }
float gn(vec3 p){ p=mat3(.8,.36,-.48, -.6,.48,-.64, 0.,.8,.6)*p; vec3 i=floor(p), f=fract(p); vec3 u=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(h3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(h3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(h3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
vec3 flow(vec3 p){ return vec3(gn(p), gn(p+vec3(31.4,7.2,3.3)), gn(p+vec3(-5.1,19.7,11.9))); }
mat3 ry(float a){ float c=cos(a),s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rx(float a){ float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }
const float TAU=6.2831853;
// world position of thread L at angle t (world units: 1 = frame width on a 9:16 screen)
vec3 pos(float L, float t, out float alpha, out float orbit, out float rib, out float pr){
  float g=h(L+.8);
  // intensity: more loose orbit fibres flaring out at high k; the hold draws them calmly back in
  float oth=1.-(.05+.09*uK)*(1.-.45*uCalm);   // intensity shows as light and flow, not as stray hairs
  orbit=smoothstep(oth-.025,oth+.025,g);
  // the longer the hold, the more the fibres settle and align
  float lo0=(1.-uTaut)*(1.-uRl);
  float spread=(g<.62 ? .36+.55*lo0 : .98+.22*lo0)*(1.-.18*uCalm*uB);   // fewer wild crossings: wound silk, not a hair ball
  float tilt=(h(L)*2.-1.)*spread, az=h(L+.37)*TAU;
  vec3 n=normalize(vec3(sin(tilt)*cos(az), cos(tilt), sin(tilt)*sin(az)));
  vec3 u=normalize(cross(n, vec3(.31,.0,.95))); vec3 v=cross(n,u);
  float rr=1.+(h(L+.3)-.5)*.07*(1.-.5*uCalm) + orbit*(.18+.30*h(L+.61)+.16*uK*h(L+.33))*(1.-.35*uCalm);
  vec3 P=(cos(t)*u+sin(t)*v)*rr;
  // orbit fibres are partial arcs floating in front of and behind the sphere
  float c=h(L+.71)*TAU, w=.5+1.1*h(L+.19);
  float ad=abs(mod(t-c+3.14159,TAU)-3.14159);
  alpha=mix(1., smoothstep(w,w*.25,ad), orbit);
  // low k is sparse and calm: part of the threads fade out
  alpha*=smoothstep(0.,.1,(.55+.48*uK)-h(L+.05));
  // after a release the remaining silk settles into a calm, even orb (independent of how fast w ramps)
  float settle=max(uRl, uRel0*(1.-uB));
  float lo=(1.-uTaut)*(1.-settle);
  float ft=uFlowT*.18;
  vec3 q=P*1.1+vec3(0.,0.,L*.0007);
  vec3 D=flow(q+vec3(0.,ft,0.)) + flow(q*2.3-vec3(ft*.7,0.,0.))*(.22+.5*uK);
  // secondary motion: loose outer fibres ride a softer spring (uB2), so they trail the sphere, overshoot a little and settle
  float R=mix(.085,.335,mix(uB,uB2,orbit*.85))+.02*settle;
  float amp=(.012+lo*.020)*(.50+.45*uK)*(1.-.6*uPunch)*(cueOn(4) ? 1.-.75*min(1.,cueEnv(.3)) : 1.)   /* smooth arcs read as silk, wavy ones as hair */*(1.-.55*uCalm)*(1.-.8*settle)*(1.+orbit*1.2*(1.-settle));
  vec3 X=P*R*(1.+lo*.40) + D*amp;
  // high k: a finer wobble along the threads (it too only moves while the breath moves)
  X+=flow(q*4.5+vec3(ft*1.4,0.,L*.002))*.004*uK*uK*(1.-settle)*(1.-.6*uCalm)*R/.3;
  // rotation follows the breath (winds on the inhale, unwinds with weight on the exhale)
  X=ry(.4+uWind+ft*.5+uSpin)*rx(.35+uTilt)*X;   // + the hold's slow, wandering turn
  // release: some threads leave with the exhale as silk ribbons, nearly level loops that rise, widen
  // and fade into the warm light; the rest settle into the small, even form left when the air is out
  float leaves=step(.74,h(L+.93));
  rib=leaves*smoothstep(0.,.9,uRl);
  float spd=.45+.9*h(L+.91);
  pr=uWarm*uLift*spd;
  vec3 Pl=vec3(cos(t),0.,sin(t))*(.19+.11*h(L+.29))*(1.+.32*pr);   // the loops open as they rise
  Pl.y+=.020*sin(2.*t+TAU*h(L+.41))+.010*sin(3.*t+.8*pr);
  Pl=rx(.30+(h(L+.2)-.5)*1.7)*ry(az+.25*pr)*Pl;   // loops at varied tilts: a rising veil, not a flat disc
  Pl+=flow(Pl*1.1+vec3(0.,-.35*pr,0.))*(.014+.02*pr);
  Pl.y+=.17*pr+.03;
  Pl.xz+=(vec2(h(L+.61),h(L+.63))-.5)*.16*(.4+.6*rib);
  X=mix(X, Pl, rib);
  // each ribbon is a long open arc with soft ends, not a closed ring: fewer crossings, reads as cloth
  float c2=h(L+.51)*TAU, w2=.8+1.1*h(L+.57);
  float ad2=abs(mod(t-c2+3.14159,TAU)-3.14159);
  alpha*=mix(1., smoothstep(w2,w2*.35,ad2), rib);
  alpha*=1.-rib*smoothstep(.45,1.9,pr);   // the released silk rises and dissolves completely
  return X;
}
vec2 proj(vec3 X){ return (X.xy*(2.4/(2.4-X.z))+vec2(0.,.10))*uU; }
void main(){
  float L=a.x, t=a.y*TAU, side=a.z;
  float al, orb, rib, pr, al2, orb2, rib2, pr2;
  vec3 X=pos(L,t,al,orb,rib,pr);
  vec3 X2=pos(L,t+.6*TAU/uM,al2,orb2,rib2,pr2);
  vec3 T=normalize(X2-X+1e-6);
  float R=mix(.085,.335,uB);
  // silk sheen (Kajiya-Kay) along the thread
  vec3 Lk=normalize(vec3(-.55+.25*sin(uLight),.62,.55));
  vec3 H=normalize(Lk+vec3(0,0,1));
  float th=dot(T,H); float sinTH=sqrt(max(0.,1.-th*th));
  float spec=(pow(sinTH,90.)*2.1+pow(sinTH,12.)*.32)*(.35+1.25*uK)*(1.+.35*uCalm);
  // cue, on the silk itself: a rim flare (the edge lights on the frame of the turn), a meridian of light turning over
  // the surface (up on an inhale, down on an exhale), or the threads "catching": drawn tight with their sheen lines flaring
  float cueGain=1.;
  { vec3 nn=normalize(X+1e-6);
    if(cueOn(1)) cueGain+=3.*cueEnv(.26)*pow(max(0.,1.-abs(nn.z)),1.6);
    if(cueOn(2)){ float u=clamp(uCueA/.6,0.,1.), y0=(uCueD>=0. ? -1.15+2.3*u : 1.15-2.3*u)*(uCueD==0. ? 0. : 1.);
      float band_=exp(-pow((nn.y-y0)/(uCueD==0. ? .6 : .2),2.))*smoothstep(-.3,.4,nn.z);
      cueGain+=2.6*uCueS*step(0.,uCueA)*(1.-u)*sqrt(u+.05)*band_*2.; }
    if(cueOn(4)) spec*=1.+2.8*cueEnv(.3); }
  // ribbons twist, catching the light across their width
  float tw=abs(cos(1.5*t+TAU*h(L+.12)+.6*pr));
  spec+=rib*pow(tw,6.)*1.4;
  // about one thread in eight is a wide, thin silk band: it twists slowly, catching the light across its width,
  // and gives the sphere layers of cloth between the fine threads
  float band=step(.55,h(L+.66))*(1.-rib)*(1.-orb);   // silk ribbons on the sphere (a wide loose fibre folds into a hook)
  float twb=abs(cos(1.1*t+TAU*h(L+.14)+.25*uFlowT));
  spec+=band*pow(twb,5.)*1.1;
  vec3 N=normalize(X-vec3(0.,.04*uRl,0.)+1e-6);
  float diff=.28+.72*max(0.,dot(N,Lk));   // a lit side and a shadow side: the sphere has volume
  float depth=clamp(X.z/max(R*1.6,.12),-1.,1.);
  float front=.14+.86*smoothstep(-.95,1.,depth);
  // the far side is seen through the silk: threads behind the sphere's body are dimmed where they cross it
  { vec2 sp0=proj(X)/uU-vec2(0.,.10); float inside=smoothstep(R*1.05,R*.55,length(sp0));
    front*=1.-.45*inside*smoothstep(.0,-.6,depth)*(1.-rib); }
  vec3 amber=vec3(.807,.352,.069), gold=vec3(.98,.66,.30), cream=vec3(1.,.86,.62);
  float wv=h(L+.55);
  vec3 base=mix(uBase, uPale, .22*uB);
  float wz=uWarm*smoothstep(0.,1.,(uRl/max(uWarm,.001))*.8+wv*.2);
  base=mix(base, mix(amber, gold, wv), wz);
  vec3 hi=mix(uPale, cream, wz);
  float rim=pow(max(0.,1.-abs(normalize(X).z)),3.)*(1.-uRl);
  // brightness varies between threads and slowly along each thread, like real silk
  float var=(.45+.55*h(L+.13))*(.72+.5*gn(vec3(t*1.3,L*.37,3.1)));
  float I=var*al*front*(.030+.060*uB+.045*uWarm+.055*uRel0*(1.-uB))*(1.-.35*orb)*(1.+.9*rim*uB)*(1.-.85*pow(max(0.,1.-abs(normalize(X).z)),1.6)*smoothstep(.4,.05,uB)*uHL*(1.-rib))*(1.+2.2*rib);   // a small sphere is a soft ember, not an outlined ring
  vec3 col=(base*diff + hi*spec*(.5+.8*uB+1.4*uWarm))*I*(.84+.22*uK)*uDens;
  // width: most threads hair-fine, a few thicker; ribbons wide where they face us; out-of-focus fibres
  // in front of and behind the sphere get softer (wider, dimmer), like a shallow depth of field
  // ribbons: crisp-edged, 2-6 px wide, narrowing where they twist edge-on; hairs stay fine
  float wBase=mix((.0009+.0024*pow(h(L+.66),3.))*(.8+.5*uK), (.0022+.0042*h(L+.68))*(.30+.70*twb)*(.7+.3*uB)*smoothstep(.97,.6,abs(T.z)), band);   // edge-on turns narrow to a hair: no folded hooks
  float wRib=.0040+.0090*tw;
  // focus sits on the sphere: its front is crisp, its back a touch softer, far fibres clearly soft
  float wW=mix(wBase,wRib,rib) + max(0.,abs(X.z-.02)-max(.07,R*1.02))*.035 + max(0.,-X.z-.04)*.005;
  float wPx=wW*uU, wEff=max(wPx,1.25);
  col*=(uU/1620.)/(.626*wEff)*(1.+1.6*band);   // bands carry more light: a sheet of silk, not a faint smear          // same light per length whatever the width or resolution
  vec2 s1=proj(X), s2=proj(X2);
  vec2 dir=normalize(s2-s1+1e-5), nrm=vec2(-dir.y,dir.x);
  vec2 sp=s1+nrm*side*wEff*.75;
  vC=col*cueGain*(1.35+.55*uHL+.45*uPunch+.5*smoothstep(.35,1.,uAmb)*(1.-uHL)); vS=side; vB=band;   // a punch (fire exhale, a driving turn) lights every thread at once
  gl_Position=vec4(sp*2./uRes, 0., 1.);
}`;
const FS_LINES = `#version 300 es
precision highp float; in vec3 vC; in float vS; in float vB; out vec4 o;
void main(){ float a=abs(vS);   // a hair is a soft gaussian; a ribbon has a flat face and a crisp anti-aliased edge
  float prof=mix(exp(-4.5*a*a), (1.-smoothstep(.62,1.,a))*.54*(.85+.3*(1.-a*a)), vB); o=vec4(vC*prof,1.); }`;
const VS_TRI = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0,1); }`;
const FS_BG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uU, uB, uWarm, uRl, uK, uFlowT, uLift, uDepth, uCalm, uRel0, uDStyle, uAmb, uTime, uHL, uPunch, uVig, uCool, uET, uRich, uCueA, uCueD, uCueS, uCueM;
bool cueOn(int bit){ return (int(uCueM+.5) & bit) != 0; }
uniform vec3 uTint, uGround, uPale, uBase;
out vec4 o;
float bh(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
// far, out-of-focus motes: spread a little with the breath (parallax), still in a hold, rise on release
float motes(vec2 p){
  float acc=0.;
  for(int L=0; L<2; L++){
    float fl=float(L), sc=mix(4.2,7.5,fl);
    vec2 q=p*(1.-.07*uB*(1.+fl))*sc;
    q.y-=(uLift*.05+uFlowT*.006)*sc*(1.+.6*fl);
    vec2 id=floor(q), f=fract(q)-.5;
    float r=bh(id+fl*17.); if(r<.87) continue;
    vec2 off=(vec2(bh(id+3.1),bh(id+7.7))-.5)*.55;
    float rad=mix(.30,.16,fl)*(.7+.6*bh(id+5.3));
    float d=length(f-off);
    acc+=smoothstep(rad,rad*.15,d)*(.4+.6*bh(id+2.2))*mix(1.,.55,fl);
  }
  return acc;
}
// ---- depth layer (far behind the silk). Moves only with the breath (parallax), flow and release lift.
float bgn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  float a=bh(i), b=bh(i+vec2(1,0)), c=bh(i+vec2(0,1)), d=bh(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
// one plane of lens bokeh: soft discs with a faint brighter rim, slight warm/cool variation
vec3 bokeh(vec2 p, float sc, float par, float dens, float r0, float r1, float soft, float rimA, float seed){
  vec2 q=p*(1.-par*uB)*sc;
  q.y-=(uLift*.05+uFlowT*.006)*sc*(1.+4.*par);
  vec2 id=floor(q), f=fract(q)-.5;
  if(bh(id+seed)>dens) return vec3(0.);
  vec2 off=(vec2(bh(id+3.1+seed),bh(id+7.7+seed))-.5)*.45;
  float rad=mix(r0,r1,bh(id+5.3+seed));
  float d=length(f-off)/rad;
  float disc=1.-smoothstep(1.-soft,1.,d);
  float rim=smoothstep(.6,.97,d)*disc;
  float tc=bh(id+9.9+seed);
  vec3 tint=mix(vec3(1.,.90,.80),vec3(.86,.93,1.),tc*tc);
  return tint*disc*(.72+rimA*rim)*(.35+.65*bh(id+2.2+seed));
}
vec3 depthD1(vec2 p){
  return bokeh(p, 9.0, .035, .12, .10, .20, .30, .45, 1.)*1.7
       + bokeh(p, 5.2, .075, .10, .16, .30, .38, .35, 7.)*2.3
       + bokeh(p, 2.6, .150, .08, .22, .38, .60, .20, 13.)*1.7;
}
// slow volumetric haze bands far behind; brighten with the breath, part (open up and down) on release
vec3 depthD2(vec2 p){
  float part=sign(p.y-.10)*(.10*uLift*uWarm);
  vec2 q=vec2(p.x*1.1, (p.y-part)*3.0)*(1.-.05*uB) + vec2(uFlowT*.015,0.);
  float n=bgn(q*1.3)*.6+bgn(q*2.9+7.)*.3+bgn(q*6.1+3.)*.1;
  float bands=smoothstep(.40,.95,n)*smoothstep(1.3,.1,abs(p.y-.10));
  float gap=1.-uWarm*.6*exp(-pow((p.y-.10)/(.08+.10*uLift*uWarm),2.));
  float lit=.35+1.4*exp(-dot(p-vec2(0.,.10),p-vec2(0.,.10))/.35);   // mist lit by the silk
  return mix(uBase,uPale,.5)*bands*gap*lit*(.6+.7*uB)*2.6;
}
// a fine field of tiny sharp specks very far away, plus a few large soft bokeh close to the lens
vec3 depthD3(vec2 p){
  vec3 acc=vec3(0.);
  for(int L=0; L<2; L++){
    float fl=float(L), sc=mix(26.,40.,fl);
    vec2 q=p*(1.-.02*uB*(1.+fl))*sc; q.y-=(uLift*.03+uFlowT*.003)*sc;
    vec2 id=floor(q), f=fract(q)-.5;
    if(bh(id+fl*31.)>.28) continue;
    vec2 off=(vec2(bh(id+3.1),bh(id+7.7))-.5)*.7;
    float dpx=length(f-off)/sc*uU;
    float s=.55*uU/540.;
    acc+=vec3(1.,.95,.9)*exp(-dpx*dpx/(2.*s*s))*(.3+.7*pow(bh(id+2.2+fl),3.))*4.5;
  }
  acc+=bokeh(p, 1.5, .22, .10, .28, .42, .75, .15, 21.)*2.4;
  return acc;
}
// ---- ambient life (v13): embers that rise and twinkle, slow light veils. Moves with time, so still parts stay alive.
vec3 embers(vec2 p){
  vec3 acc=vec3(0.);
  for(int L=0; L<3; L++){
    float fl=float(L)*.5, sc=mix(3.0,7.5,fl);
    vec2 q=p*sc;
    q.y-=uET*mix(.055,.03,fl)*sc;
    q.x+=.32*sin(q.y*.5+fl*4.2+uET*.19);
    vec2 id=floor(q), f=fract(q)-.5;
    float r=bh(id+fl*13.+.5); if(r>.30) continue;
    vec2 off=(vec2(bh(id+3.7+fl),bh(id+8.1+fl))-.5)*.6;
    float dpx=length(f-off)/sc*uU;
    float sz=mix(2.3,1.1,fl)*uU/540.;
    float tw=.5+.5*sin(uET*(.6+2.2*r)+r*61.);
    acc+=(exp(-dpx*dpx/(2.*sz*sz))+.16*exp(-dpx/(5.*sz)))*tw*tw*mix(1.,.5,fl);
  }
  return acc*smoothstep(1.05,.3,p.y);
}
vec3 veils(vec2 p){
  float t=uET;
  vec2 q=vec2(p.x*1.25+.28*sin(p.y*1.6+t*.06), p.y*.55-t*.016);
  float n=bgn(q*2.2+vec2(t*.012,0.))*.55+bgn(q*4.9+vec2(-t*.018,t*.01))*.3+bgn(q*10.3+3.)*.15;
  float c=smoothstep(.5,.95,n);
  float env=exp(-pow(p.x/.8,2.))*smoothstep(-1.1,-.15,p.y)*smoothstep(1.15,.25,p.y);
  return mix(uBase,uPale,.65)*c*env*(.72+.28*sin(t*.33));
}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uU; vec2 d=p-vec2(0.,.10); float r=length(d);
  vec3 col=uGround+uGround*.7*(1.-p.y);
  float R=mix(.085,.335,uB);
  col+=uTint*exp(-r*r/(R*R*1.8))*(.03+.12*uB)*(1.-uWarm);
  // lit from within: a soft inner glow that grows with the breath and deepens in the hold
  float core=exp(-r*r/(R*R*.55));
  col+=mix(uBase,uPale,.55)*core*(.22+.78*pow(uB,1.6))*(.035+.03*uK+.02*uCalm)*(1.-uRl);   // lit from within at every size
  // a hold glows from within, whatever the size: a slow, uneven shimmer
  { float Rg=max(R,.11)*1.5; float sh=.75+.25*sin(uTime*.83+2.*sin(uTime*.29))*sin(uTime*.47+1.1);
    float gw=max(uHL, .6*smoothstep(.35,1.,uAmb)*(1.-uRl));   // the calm parts (arrival, integration) glow the same way
    // an empty-lung hold is a small ember: filled with light from the centre, not a thin ring of threads
    col+=mix(uPale,vec3(1.,.86,.66),.4)*(exp(-r*r/(R*R*.30))*.16+exp(-r*r/(R*R*1.6))*.05)*uHL*smoothstep(.45,.05,uB)*sh;
    col+=mix(uBase,uPale,.6)*exp(-r*r/(Rg*Rg))*(uHL*.13+max(0.,gw-uHL)*.24)*sh + mix(uBase,uPale,.3)*exp(-r*r/(Rg*Rg*5.))*gw*.025; }
  vec3 ember=vec3(.006,.0025,.0015), rose=vec3(.034,.015,.006);
  vec3 warmG=mix(ember, rose, smoothstep(-.9,.9,p.y));
  float ww=uWarm*uWarm*(3.-2.*uWarm);
  col=mix(col, warmG, ww*.92);
  vec2 gc=(d-vec2(0.,.10+.30*uRl))*vec2(1.,.75);
  float front=.30+uRl*.40;
  vec3 champ=vec3(.95,.56,.22);
  // the release lights up at once (the air leaving is warm), before the room fully turns gold
  col+=champ*uRel0*(1.-uB)*(1.-ww)*.07*exp(-r*r/.12);
  col+=champ*ww*(.20*exp(-dot(gc,gc)/(front*front*.5))+.02*exp(-dot(gc,gc)/(front*front*3.)));
  // the released air rises: soft columns of warm light drift up out of the sphere, and the edges of the room
  // stay dark, so the gold has depth instead of a flat wash
  { float sx=d.x*(1.+.8*max(0.,d.y));
    float n=bgn(vec2(sx*9.+1.3*sin(d.y*2.3+uLift*.4), d.y*1.4-uLift*.55))*.6+bgn(vec2(sx*19.-3., d.y*2.2-uLift*.8))*.4;
    float col_=smoothstep(.45,.95,n)*smoothstep(-.05,.18,d.y)*smoothstep(1.2,.2,d.y)*exp(-sx*sx/.09);
    col+=champ*ww*col_*.10*(1.-.5*uB)*(1.+.8*uRich);
    col*=1.-ww*.38*smoothstep(.25,1.05,length(p*vec2(1.25,.72))); }
  // cue through the room: a pressure wave travels from the sphere (exhale) or in to it (inhale), pushing or drawing
  // the embers and bokeh as it passes and lighting them; or a soft refracting ring of heat-shimmer in the air
  vec2 pc=p; float cw=0.;
  if((cueOn(8) || cueOn(16)) && uCueA>=0. && uCueA<1.2 && uCueD!=0.){
    // out: from the sphere's edge across the room; in: from close around it, drawn in to the edge (visible on the frame)
    float u=clamp(uCueA/(uCueD<0. ? 1.1 : .7),0.,1.), e=1.-(1.-u)*(1.-u)*(1.-u);
    float fr = uCueD<0. ? R*1.05+1.1*e : R*1.02+(.22+.5*R)*(1.-e);
    float wd=.05+.08*u, z=(r-fr)/wd; cw=exp(-z*z)*(1.-u)*uCueS;
    vec2 dir=d/max(r,1e-3);
    pc=p-dir*(-uCueD)*.018*cw*(cueOn(16) ? z : 1.);   // exhale pushes out, inhale draws in; shimmer bends light across the ring
    if(cueOn(16)) col+=mix(uPale,vec3(1.,.9,.75),.5)*exp(-pow((r-fr)/(.006+.01*u),2.))*(1.-u)*(1.-u)*uCueS*(cueOn(8) ? .03 : .05);
    col+=mix(uBase,uPale,.5)*cw*.018*(cueOn(8) ? 1. : .4); }
  vec3 dl = uDStyle<.5 ? vec3(motes(pc)) : (uDStyle<1.5 ? depthD1(pc) : (uDStyle<2.5 ? depthD2(pc) : depthD3(pc)));
  dl*=1.+(cueOn(8) ? 3. : 1.)*cw;
  col+=mix(uPale,vec3(1.,.82,.55),uWarm)*dl*(.0024+.0065*uB+.012*uWarm)*uDepth;   // the room a touch softer than the sphere
  // energy: the harder the breathing, the more the sphere burns (breath of fire, last gear), and each punch
  // is a burst of light from the core that fills the sphere and spills just past its edge
  col+=mix(uBase,uPale,.35)*exp(-r*r/(R*R*2.4))*uK*(.01+.02*uB)*(1.-uRl)*(1.-.6*uHL);
  { vec2 dp=d+vec2(0.,.28*R); float rp=dot(dp,dp);   // the snap starts low in the centre, where the belly drives it
    col+=mix(uPale,vec3(1.,.93,.8),.5)*(exp(-rp/(R*R*.38))*.13+exp(-r*r/(R*R*2.2))*.06)*uPunch; }
  col+=uAmb*(veils(pc)*.06*(1.-.5*uB) + mix(uPale,vec3(1.,.74,.46),.55)*embers(pc)*.30*(1.+(cueOn(8) ? 3. : 1.)*cw));
  // richness (the room coming alive in the arrival, fullest in the integration): a warm mist far behind, lit by
  // the silk, drifting on the room's clock, and a second, nearer plane of soft bokeh
  if(uRich>.01){ vec2 q=vec2(p.x*1.05+.05*sin(uET*.05), (p.y-.10)*2.3-uET*.012);
    float n=bgn(q*1.5+vec2(uET*.01,0.))*.55+bgn(q*3.3+vec2(7.,-uET*.015))*.3+bgn(q*7.1+3.)*.15;
    float mist=smoothstep(.38,.92,n)*exp(-pow(p.y-.1,2.)/.5);
    float lit=(.55+.7*exp(-r*r/(max(R,.15)*max(R,.15)*9.)))*smoothstep(R*.9,R*2.2,r);   // behind and around, never a smudge on the sphere
    col+=mix(uBase,uPale,.55)*mist*lit*uRich*.05;
    col+=mix(uPale,vec3(1.,.8,.55),.4)*bokeh(p, 1.9, .10, .09, .20, .34, .55, .3, 31.)*uRich*.018; }
  // the room's mood per phase (the page eases it over seconds): how deep the edges fall away, and a cooler,
  // stiller room in a hold so the warm sphere stands alone in it
  { float lum=dot(col,vec3(.3,.59,.11)), nearS=exp(-r*r/(R*R*2.5));
    col*=1.-uCool*.3*(1.-nearS);   // a hold hushes the room (darker, same warmth: never grey or cold)
    col*=1.-uVig*.62*smoothstep(.16,1.05,length(p*vec2(1.15,.72))); }
  o=vec4(col,1);
}`;
const FS_POST = `#version 300 es
precision highp float; uniform sampler2D t, b1, b2; uniform int ss; uniform vec2 uOut; uniform float uFrame, uGrain, uBl1, uBl2, uSharp; uniform vec4 uQz; uniform float uQs, uQd; out vec4 o;
float h(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){ ivec2 q=ivec2(gl_FragCoord.xy)*ss; vec3 c=vec3(0);
  for(int y=0;y<ss;y++) for(int x=0;x<ss;x++) c+=texelFetch(t,q+ivec2(x,y),0).rgb;
  c/=float(ss*ss); if(any(isnan(c)) || any(isinf(c))) c=vec3(0.);
  // bloom: light scatters from the bright threads themselves (a tight glow and a wide one), before the tone curve
  vec2 uv=gl_FragCoord.xy/uOut;
  // b1, b2 are plain low-passes of the scene (1/4 and 1/8). Local contrast first: the scene minus its blur, so the
  // sphere's edge and its sheen lines read crisply against the softer room (and a faint darker zone forms around
  // the bright sphere). Then bloom from the part of the blur above a soft threshold: glow, not fog.
  vec3 L1=texture(b1,uv).rgb, L2=texture(b2,uv).rgb;
  { const vec3 Wl=vec3(.3,.59,.11); float lc=dot(c,Wl), lL=dot(L1,Wl);   // on luminance only, so the hue stays
    c*=clamp(1.+uSharp*(lc-lL)/max(lc,.004), .45, 1.9); }
  { float l1=dot(L1,vec3(.3,.59,.11)), l2=dot(L2,vec3(.3,.59,.11));   // threshold on luminance (per channel would shift the hue to red)
    c+=L1*(max(l1-.06,0.)/max(l1,1e-4))*uBl1+L2*(max(l2-.035,0.)/max(l2,1e-4))*uBl2; }
  // the caption's quiet zone: a soft, rounded dip in exposure behind the words (part of the light, not a box)
  if(uQs>0.){ vec2 qc=(uQz.xy+uQz.zw)*.5, qh=(uQz.zw-uQz.xy)*.5; vec2 qd=abs(gl_FragCoord.xy-qc)-qh; float sd=length(max(qd,0.))+min(max(qd.x,qd.y),0.);
    c*=1.-uQs*.68*exp(-2.*max(sd+uQd*.5,0.)*max(sd+uQd*.5,0.)/(uQd*uQd)); }
  c=pow(aces(c),vec3(1./2.2));
  vec2 g=gl_FragCoord.xy+fract(uFrame*vec2(.618,.382))*vec2(517.,331.);
  float n=(h(g)+h(g+17.3)+h(g+41.1)-1.5)*.9;
  float l=dot(c,vec3(.3,.59,.11)); c+=n*uGrain*(.35+.65*sqrt(max(l,0.))*(1.-l*.6));
  c+=(h(g+7.)-h(g+91.))/255.;
  o=vec4(c,1); }`;
// bloom: a 4-tap bilinear downsample (covers 4x4 source texels) with a soft knee, then separable 9-tap blurs
const FS_DOWN = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 uSrc, uDst; uniform float uKnee; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uDst, d=1./uSrc;
  vec3 c=(texture(t,uv+vec2(-d.x,-d.y)).rgb+texture(t,uv+vec2(d.x,-d.y)).rgb+texture(t,uv+vec2(-d.x,d.y)).rgb+texture(t,uv+vec2(d.x,d.y)).rgb)*.25;
  if(any(isnan(c)) || any(isinf(c))) c=vec3(0.); c=min(c,vec3(32.));   // one bad pixel must never bloom into a block
  float l=max(c.r,max(c.g,c.b)); c*=uKnee>0. ? smoothstep(0.,uKnee,l) : 1.;
  o=vec4(c,1); }`;
const FS_BLIT = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 uDst; out vec4 o;
void main(){ o=vec4(texture(t,gl_FragCoord.xy/uDst).rgb,1); }`;
const FS_BLUR = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 uDst, uDir; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uDst, d=uDir/uDst;
  vec3 c=texture(t,uv).rgb*.2270270;
  c+=(texture(t,uv+d*1.3846154).rgb+texture(t,uv-d*1.3846154).rgb)*.3162162;
  c+=(texture(t,uv+d*3.2307692).rgb+texture(t,uv-d*3.2307692).rgb)*.0702703;
  o=vec4(c,1); }`;

// ---- Tide: the air of the room, a field of fine light that the breath draws in and breathes out ----
// Lives inside the silk renderer: drawn into the silk's scene buffer after the room and before the threads, so the
// same bloom, sharpening and tone curve apply to both. The sphere is the source and the sink: inhale = the air
// streams in from every edge and disappears into it, exhale = it pours out of its surface, hold = it hangs.
// Positions are stored as hi + lo pairs in half floats (exact to ~1e-7), so phones without float32 render
// targets get the same smooth motion; without any float target the field turns itself off (the room remains).
//
// A WORLD is a small set of parameters (colour and behaviour); the same breath grammar runs in every world.
const TIDE_WORLDS = {
  ember: { centre: 0, warm: 1, label: 'Ember', pal: 'ember', accent: '#F2B872', far: [.9, .32, .08], near: [1, .8, .55], size: 1, shape: 0, decay: .74, breeze: 1, curl: 1.5,
    flow: .75, hang: 1, swirl: 1, pulse: 1, fire: 1, count: 1, twinkle: .2, rise: 0, caustic: 0, shafts: 0, room: 1, source: 'silk', glow: 1 },
  dawn: { centre: 0, warm: 1, label: 'Dawn', pal: 'dawn', accent: '#F4BFA8', far: [.85, .30, .28], near: [1, .84, .74], size: 1, shape: 0, decay: .76, breeze: 1, curl: 1.3,
    flow: .75, hang: 1, swirl: 1, pulse: 1, fire: 1, count: .9, twinkle: .25, rise: .006, caustic: 0, shafts: .5, room: 1, source: 'silk', glow: 1 },
  water: { centre: 1, warm: 0.45, label: 'Water', pal: 'water', accent: '#A8E3D8', far: [.04, .30, .36], near: [.62, .96, .92], size: 1.25, shape: 1, decay: .86, breeze: 1.5, curl: 1,
    flow: .55, hang: 1.3, swirl: 1.6, pulse: .6, fire: .45, count: .6, twinkle: .1, rise: .014, caustic: 1, shafts: 0, room: .8, source: 'silk', glow: .62 },
  night: { centre: 2, warm: 0.3, label: 'Night', pal: 'night', accent: '#C9D3EA', far: [.28, .32, .52], near: [.92, .94, 1], size: .95, shape: 2, decay: .62, breeze: .5, curl: 1,
    flow: .7, hang: .8, swirl: .8, pulse: .9, fire: .9, count: .35, twinkle: .9, rise: 0, caustic: 0, shafts: 0, room: .7, source: 'silk', glow: .8 },
  moss: { centre: 3, warm: 0.7, label: 'Moss', pal: 'moss', accent: '#DCCB84', far: [.30, .38, .08], near: [1, .92, .55], size: 1.1, shape: 0, decay: .8, breeze: .8, curl: 1.2,
    flow: .7, hang: 1.1, swirl: 1.2, pulse: .9, fire: .9, count: .75, twinkle: .35, rise: -.008, caustic: 0, shafts: 1, room: .9, source: 'silk', glow: .95 },
};
const TIDE_SIM = `#version 300 es
precision highp float;
uniform sampler2D tP, tV; uniform float uDt, uVb, uR, uCalm, uAmb, uTime, uSeed, uInit, uXe, uYt, uYb, uPulse, uFront, uGather, uSwirl, uBreeze, uFire;
uniform float uFlow, uHang, uRise, uCurl, uEmit; uniform vec4 uQz; uniform float uQs;
layout(location=0) out vec4 oP; layout(location=1) out vec4 oV;
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
vec2 rnd2(vec2 s){ return vec2(hash(s+uSeed*1.37), hash(s.yx*1.7+uSeed*2.11+3.1)); }
vec2 field(vec2 s){ vec2 r=rnd2(s); return vec2(mix(-uXe,uXe,r.x), mix(uYb,uYt,r.y)); }
float heat=0.;
void write(vec2 p, vec2 v){ vec2 hi=floor(p*1024.+.5)/1024.; oP=vec4(hi,p-hi); oV=vec4(v,heat,1.); }
void main(){
  vec2 ij=gl_FragCoord.xy; vec4 S=texelFetch(tP,ivec2(ij),0); vec4 V0=texelFetch(tV,ivec2(ij),0); vec2 p=S.xy+S.zw, v=V0.xy; heat=V0.z*exp(-uDt/.35); if(isnan(heat)) heat=0.;
  if(uInit>.5 || any(isnan(p)) || any(isinf(p)) || any(isnan(v))){ write(field(ij),vec2(0.)); return; }
  float z=hash(ij*.731+.17), par=.35+.65*z;              // fake depth: far particles move less
  float d=length(p); vec2 dir=p/max(d,1e-4), perp=vec2(-dir.y,dir.x);
  float K=(uR+.18)/(d+.08);                               // ~1/r: a radial flow that neither piles up nor thins out
  float vr=-uVb*uFlow*K;
  // cue pulse: exhale cues push outward inside a soft travelling front, inhale cues gather everywhere at once
  vr+=uPulse*K*smoothstep(uFront+.35,uFront-.05,d) - uGather*K;
  float e=.08; vec2 np=p*uCurl+vec2(uTime*.02,-uTime*.013);
  float n0=noise(np), nx=noise(np+vec2(e,0)), ny=noise(np+vec2(0,e));
  vec2 curl=vec2(ny-n0,-(nx-n0))/e;
  vec2 tv=dir*vr + curl*uBreeze*(1.-.5*uCalm) + perp*uSwirl*(uR+.1)/(d+.1) + vec2(0.,uRise*(1.-.6*uCalm));
  // the caption's quiet zone: the air parts softly around Edvin's words (only while they are shown)
  float tau=(.12+.45*uCalm)*uHang;
  v+=(tv*par-v)*(1.-exp(-uDt/tau));
  p+=v*uDt;
  // diffusion: fronts and clumps spread out again within a few seconds (stronger in the fast rounds)
  p+=(rnd2(ij*1.1+uTime)-.5)*(.0030+.007*uFire)*sqrt(uDt*60.)*(1.-.5*uCalm);
  d=length(p);
  bool out_=abs(p.x)>uXe+.06 || p.y>uYt+.06 || p.y<uYb-.06;
  if(d<uR*.97){ float a=hash(ij+uSeed)*6.2831; vec2 q=vec2(cos(a),sin(a));
    // breathed in: reborn anywhere in the outer room (uniform, no ring or front where they appear)
    if(uVb>0.){ p=field(ij.yx*1.3+7.); if(length(p)<uR*2.2) p=normalize(p+1e-3)*uR*2.2*(1.+.6*hash(ij+uSeed*.9)); } else p=q*uR*mix(1.02,1.25,hash(ij*2.1+uSeed));
    v=vec2(0.); }
  // an active exhale (a fire snap, a strong push) breathes fresh air out of the core: a bright spray from the surface
  else if(uVb< -.5 && hash(ij*.53+uSeed*3.7)<min(.05,.03*(-uVb-.5))*uEmit){ float a=hash(ij.yx+uSeed*1.9)*6.2831; vec2 q=vec2(cos(a),sin(a));
    p=q*uR*mix(1.01,1.1,hash(ij+uSeed*4.1)); v=q*(.25+.45*z)*min(3.,-uVb)*.4; heat=1.; }
  else if(abs(uVb)<.08 && hash(ij*.37+uSeed*5.3)<.004){ p=field(ij.yx+3.); v=vec2(0.); }   // the air slowly evens out
  else if(out_){ float a=hash(ij+uSeed*.7)*6.2831;
    // breathed out past the edge: reborn in a soft shell just outside the sphere (not on one line, so no rings form)
    if(uVb< -.05){ p=vec2(cos(a),sin(a))*uR*mix(1.02,1.4,pow(hash(ij*1.3+uSeed),1.5)); v=vec2(cos(a),sin(a))*.05; }
    else { p=field(ij); v=vec2(0.); } }
  write(p,v);
}`;
const TIDE_PVS = `#version 300 es
precision highp float;
uniform sampler2D tP, tV; uniform int uN; uniform vec2 uRes, uC; uniform float uU, uR, uPx, uGlow, uYb, uYt, uBand, uTopBand, uTw, uNear, uTwk, uSize, uPg;
uniform vec3 uFar, uNearC; uniform vec4 uQz, uQz2; uniform float uQs, uQs2; uniform vec3 uHr;
out vec3 vC; out float vSoft;
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){ ivec2 ij=ivec2(gl_VertexID%uN, gl_VertexID/uN); vec4 S=texelFetch(tP,ij,0); vec2 p=S.xy+S.zw, v=texelFetch(tV,ij,0).xy;
  float z=hash(vec2(ij)*.731+.17), w=hash(vec2(ij)*1.93+4.1), nearL=step(1.-uNear,hash(vec2(ij)*3.17+.9));
  gl_Position=vec4((uC+p*uU)/uRes*2.-1.,0.,1.);
  float d=length(p), sp=length(v), heat=texelFetch(tV,ij,0).z;
  float lit=(uR*uR*1.6)/(d*d+.012)*(.7+.6*uGlow);          // lit by the sphere: the room glows where the breath is
  float I=(.05+.9*min(lit,3.))*(.35+.65*z)*(1.+min(sp*4.,2.));
  I*=1.-uTwk+uTwk*(.5+.5*sin(uTw*(.7+1.3*w)+w*31.));     // twinkle, per world
  I*=smoothstep(uYb, uYb+uBand, p.y)*.85+.15*smoothstep(uYb, uYb+uBand*.5, p.y); // the bottom band stays quiet (guidance layer)
  I*=.2+.8*smoothstep(uYt, uYt-uTopBand, p.y);                                       // and the top, where the logo sits
  // the caption's quiet zone and the hold arc's lane: the air dims there, so the words and the clock always read
  if(uQs>0.){ vec2 c=(uQz.xy+uQz.zw)*.5, hs=(uQz.zw-uQz.xy)*.5+vec2(.04,.07); vec2 q=(p-c)/hs; I*=1.-.92*uQs*exp(-1.3*dot(q*vec2(.9,1.),q*vec2(.9,1.))); }
  if(uQs2>0.){ vec2 c=(uQz2.xy+uQz2.zw)*.5, hs=(uQz2.zw-uQz2.xy)*.5+vec2(.04,.05); vec2 q=(p-c)/hs; I*=1.-.9*uQs2*exp(-2.2*dot(q,q)); }
  if(uHr.z>0.){ I*=1.-.85*uHr.z*exp(-(d-uHr.x)*(d-uHr.x)/(uHr.y*uHr.y)); }
  vec3 col=mix(uFar,uNearC,clamp(lit*.5,0.,1.));
  vSoft=nearL;
  float px=mix(uPx*uSize*(.8+1.3*z*z), uPx*(9.+10.*w), nearL);   // a few near-lens motes: large, soft and faint, for depth
  vC=mix(col,uNearC*1.15,clamp(heat,0.,1.))*I*(1.+2.5*clamp(heat,0.,1.))*(.6+.8*w)*.5*mix(1.,.06,nearL)*uPg;
  gl_PointSize=px; }`;
const TIDE_PFS = `#version 300 es
precision highp float; in vec3 vC; in float vSoft; uniform float uShape; out vec4 o;
void main(){ vec2 q=gl_PointCoord-.5; float r=length(q);
  float a=smoothstep(.5,.15,r);                                                     // 0: a soft dot
  if(uShape>.5 && uShape<1.5) a=smoothstep(.5,.34,r)*(.35+.65*smoothstep(.2,.4,r)); // 1: a bubble, brighter at its rim
  if(uShape>1.5) a=smoothstep(.22,0.,r)+.5*smoothstep(.5,.0,r)*(smoothstep(.07,0.,abs(q.x))+smoothstep(.07,0.,abs(q.y)))*.4; // 2: a star, sharp core
  a=mix(a, smoothstep(.5,.0,r)*(.7+.3*smoothstep(.3,.46,r)), vSoft);
  o=vec4(vC*a,1.); }`;
const TIDE_FADE = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 uDst; uniform float uDecay; out vec4 o;
void main(){ vec3 c=texture(t,gl_FragCoord.xy/uDst).rgb*uDecay; if(any(isnan(c)) || any(isinf(c))) c=vec3(0.); o=vec4(min(c,vec3(32.)),1.); }`;
// the field's layer into the scene, plus the world's own light: caustics (water) or shafts through the canopy (moss)
const TIDE_ADD = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 uDst, uC; uniform float uGain, uU, uTime, uCaus, uShaft, uB, uR; uniform vec3 uNearC; uniform vec4 uQz; uniform float uQs; out vec4 o;
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
void main(){ vec3 c=texture(t,gl_FragCoord.xy/uDst).rgb*uGain; if(any(isnan(c)) || any(isinf(c))) c=vec3(0.); c=min(c,vec3(32.)); vec2 p=(gl_FragCoord.xy-uC)/uU; float d=length(p);
  float qm=1.; if(uQs>0.){ vec2 cc=(uQz.xy+uQz.zw)*.5, hs=(uQz.zw-uQz.xy)*.5+vec2(.04,.07); vec2 q=(p-cc)/hs; qm=1.-.92*uQs*exp(-2.2*dot(q*vec2(.9,1.),q*vec2(.9,1.))); }
  if(uCaus>0.){ vec2 w=p*3.2+vec2(noise(p*2.+uTime*.07),noise(p*2.-uTime*.05))*1.3;
    float k=abs(sin(w.x*3.1+uTime*.4)+sin(w.y*2.7-uTime*.33)+sin((w.x+w.y)*2.2+uTime*.21));
    float cs=pow(max(0.,1.-k/1.2),6.)*smoothstep(uR*.9,uR*2.5,d)*exp(-d*.9);
    c+=uNearC*cs*.045*uCaus*(.5+uB)*qm; }
  if(uShaft>0.){ float s=p.x*.8+p.y*.45; float b=noise(vec2(s*6.,uTime*.02))*noise(vec2(s*13.+3.,uTime*.03));
    c+=uNearC*pow(b,2.2)*.05*uShaft*smoothstep(-1.2,.8,p.y)*qm; }
  o=vec4(c,1.); }`;
// the rim source (an alternative to the silk): a sharp bright rim around a dim, glowing interior
const TIDE_RIM = `#version 300 es
// the centre: a clear, simple source. uKind 0 = ember core (incandescent rim, glowing glass interior), 1 = bubble
// (thin bright rim, a highlight, the air shows through), 2 = moon disc (silver, soft maria, crisp limb), 3 = lantern
// (a seed of light with drifting motes inside). Output is premultiplied: the interior covers the room, the rim adds.
precision highp float; uniform vec2 uC; uniform float uU, uR, uGlow, uTime, uLine, uKind, uB; uniform vec3 uFar, uNearC; out vec4 o;
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ return noise(p)*.55+noise(p*2.1+3.1)*.28+noise(p*4.3+7.7)*.17; }
void main(){ vec2 q=(gl_FragCoord.xy-uC)/uU; float d=length(q), px=1./uU;
  float disc=smoothstep(uR+px,uR-px,d); vec2 u=q/uR; float mu=sqrt(max(0.,1.-min(1.,dot(u,u)))); vec3 n=vec3(u,mu);
  float rw=max(1.2*px, uR*.010), rim=exp(-(d-uR)*(d-uR)/(rw*rw)), halo=exp(-max(0.,d-uR)/(uR*.05))*(1.-disc);
  vec3 c=vec3(0.); float a=disc;
  if(uLine>.5){ o=vec4(uNearC*1.1*rim*(.8+.5*uGlow),0.); return; }        // blend: only a hairline over the silk
  if(uKind<.5){            // ember core
    float fl=noise(u*1.3+vec2(uTime*.03,-uTime*.02));                         // one slow, soft current: clean glass, not mottled
    c=uFar*(.03+.17*pow(mu,2.5)*(.55+.8*uGlow)*(.92+.16*fl))*disc*(1.-.5*smoothstep(.72,.97,d/uR));   // an inner shadow before the rim              // glass lit from inside, deeper at the edge
    c+=uNearC*.35*pow(1.-mu,3.)*disc;                                        // a fresnel sheen just inside the rim
    c+=uNearC*(2.1*rim+.25*halo)*(.75+.5*uGlow);
  } else if(uKind<1.5){    // bubble
    a=disc*.28;                                                              // mostly clear: the air shows through
    c=uFar*.05*disc + uNearC*.55*pow(1.-mu,2.2)*disc;                        // thin film brightening towards the edge
    float spec=pow(clamp(dot(n,normalize(vec3(-.45,.55,.7))),0.,1.),60.)*disc;   // clamped: outside the disc the dot product is large and pow() overflows    // a window highlight, upper left
    float spec2=pow(clamp(dot(n,normalize(vec3(.5,-.5,.72))),0.,1.),24.)*disc*.35;
    c+=vec3(1.)*(spec*1.6+spec2)*(.7+.4*uGlow);
    c+=uNearC*(1.5*rim+.2*halo)*(.7+.5*uGlow);
  } else if(uKind<2.5){    // moon
    float m=fbm(u*1.6+vec2(3.,1.)), cr=smoothstep(.62,.7,noise(u*5.+9.))*.25;
    float lam=.55+.45*dot(n,normalize(vec3(-.25,.3,.92)));
    c=vec3(.62,.65,.74)*(.55+.45*smoothstep(.35,.75,m)-cr)*lam*pow(mu,.18)*(.55+.45*uGlow)*disc;
    c+=uNearC*(.9*rim+.3*halo)*(.7+.4*uGlow);
  } else {                 // lantern
    float fl=fbm(u*2.6+vec2(-uTime*.04,uTime*.03));
    c=uFar*(.06+.28*pow(mu,1.6)*(.6+.7*uGlow))*(.7+.6*fl)*disc;
    for(int i=0;i<6;i++){ float fi=float(i); vec2 pp=vec2(sin(uTime*(.21+.05*fi)+fi*2.1),cos(uTime*(.17+.04*fi)+fi*1.3))*.55;
      c+=uNearC*.28*exp(-dot(u-pp,u-pp)*160.)*disc; }
    c+=uNearC*(1.7*rim+.25*halo)*(.75+.5*uGlow);
  }
  o=vec4(c,a); }`;

function createTideField(gl, prog, VS, opts = {}) {
  const f32 = !!gl.getExtension('EXT_color_buffer_float');
  const f16 = f32 || !!gl.getExtension('EXT_color_buffer_half_float');
  const Q = new URLSearchParams(location.search);
  if (!f16 || Q.get('tidefloat') === '0') return null;          // no float targets: the room without the field (v15 as it is)
  const mobile = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600);
  const NW = +(Q.get('pn') || opts.particles || (mobile ? 180 : 224));
  const pSim = prog(VS, TIDE_SIM), pPts = prog(TIDE_PVS, TIDE_PFS), pFade = prog(VS, TIDE_FADE), pAdd = prog(VS, TIDE_ADD), pRim = prog(VS, TIDE_RIM);
  const tex = (w, h, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const state = () => { const p = tex(NW, NW, gl.NEAREST), v = tex(NW, NW, gl.NEAREST), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, p, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, v, 0); return { p, v, fb }; };
  const S = [state(), state()];
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  let si = 0, inited = false, T = null, ti = 0, TW = 0, TH = 0;
  const trail = (w, h) => { const t = tex(w, h, gl.LINEAR), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, fb, w, h }; };
  const vPts = gl.createVertexArray();
  const L = { vb: 0, pulse: 0, gather: 0, front: 0, glow: .3, swirl: 0, sdir: 1, seed: 0, lastCue: null, tw: 0, breeze: .018,
    tier: 0, ema: 16, emaT: 0, fire: 0, qz: [0, 0, 0, 0], qs: 0, qz2: [0, 0, 0, 0], qs2: 0, hr: [0, .01, 0] };
  let worldName = TIDE_WORLDS[opts.world] ? opts.world : 'ember', world = TIDE_WORLDS[worldName];
  const CS = typeof window !== 'undefined' && window.__colourScript, arc = CS ? CS.create(worldName) : null;
  const setWorld = (name) => { if (TIDE_WORLDS[name]) { worldName = name; world = TIDE_WORLDS[name]; if (arc) arc.setWorld(name); } };
  // the world blend (off by default): a session can travel between worlds, e.g. The Wake Up from Dawn into Ember.
  // A journey is [[t, world], ...]; each change eases over `over` seconds. Numbers interpolate, shape and centre
  // switch half way, the colour arc follows the world it is closest to.
  let journey = null; const setJourney = (J) => { journey = J && J.length ? J : null; if (!journey) { L.journey = null; world = TIDE_WORLDS[opts.world] || world; } };
  const blendWorld = (A, B, u) => { const o = {}; for (const k in A) { const a = A[k], b = B[k];
      o[k] = Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * u) : typeof a === 'number' && (k === 'shape' || k === 'centre') ? (u < .5 ? a : b) : typeof a === 'number' ? a + (b - a) * u : (u < .5 ? a : b); }
    return o; };
  function journeyAt(at) { let i = 0; while (i + 1 < journey.length && journey[i + 1][0] <= at) i++;
    const cur = journey[i], nx = journey[i + 1], prev = journey[i - 1], over = 10;
    if (prev && at - cur[0] < over) { const u = (at - cur[0]) / over; return [prev[1], cur[1], u * u * (3 - 2 * u)]; }
    return [cur[1], nx ? nx[1] : cur[1], 0]; }
  const arcOff = new URLSearchParams(location.search).get('arc') === '0';
  let FAR = world.far, NEAR = world.near;   // this frame's colours: the world's, moved along the session's colour arc
  // the page tells the field where the words are (world units, sphere centre = 0) and where the hold arc is
  const setQuiet = (rect, s, rect2, s2) => { if (rect) L.qz = rect; L.qs = Math.max(0, Math.min(1, s || 0)); if (rect2) L.qz2 = rect2; L.qs2 = Math.max(0, Math.min(1, s2 || 0)); };
  const setHoldLane = (r, s) => { L.hr = [r, .03, Math.max(0, Math.min(1, s || 0))]; };
  const TIERS = [1, .55, .3];                                  // share of the particles drawn, by measured frame time
  function update(st, dt, t) {
    L.vb += ((st.v || 0) - L.vb) * (1 - Math.exp(-dt / .05));
    if (!Number.isFinite(L.vb)) L.vb = 0;
    // a new cue from the page (same call the silk's own cues use): dir -1 out, +1 in, 0 hold
    if (st.cueT0 != null && st.cueT0 !== L.lastCue) { L.lastCue = st.cueT0; const s = st.cueS || 0;
      if (st.cueD < 0) { L.pulse = Math.max(L.pulse, .10 * s * world.pulse); L.front = 0; } else if (st.cueD > 0) L.gather = Math.max(L.gather, .05 * s * world.pulse); }
    L.pulse *= Math.exp(-dt / .45); L.gather *= Math.exp(-dt / .3); L.front += dt * 1.3;
    const bc = typeof window !== 'undefined' && window.__bc;
    const at = bc && bc.session ? bc.at : -1, ph = at >= 0 ? bc.phaseAt(at) : '';
    // the room's air: a light breeze where nothing is asked (arrival, integration, start), almost none in the rounds
    const bzT = (!bc || !bc.session ? .045 : ph === 'Arrival' ? .05 : ph === 'Integration' || ph === 'Closing' ? .045 : .016) * world.breeze;
    L.breeze += (bzT - L.breeze) * (1 - Math.exp(-dt / 3));
    L.fire = ph === 'Breath of fire' || ph === 'Last gear' ? 1 : 0;
    // holds: the air turns very slowly around the sphere, on a wandering direction (alive, never a spin)
    const hl = st.hl || 0; L.sdir = Math.sin(t * .071) + .6 * Math.sin(t * .031 + 1.7);
    L.swirl += (hl * .018 * L.sdir * world.swirl - L.swirl) * (1 - Math.exp(-dt / 1.5));
    L.tw += dt * (.6 + .8 * (st.calm || 0));
    const arcEnabled = !arcOff && (typeof window.__arcOn !== 'function' || window.__arcOn());   // the page's "Colour follows the session" toggle
    if (journey && bc && bc.session) { const [a, b2, u] = journeyAt(bc.at); L.journey = [a, b2, u]; world = blendWorld(TIDE_WORLDS[a], TIDE_WORLDS[b2], u); const nm = u < .5 ? a : b2;
      if (nm !== worldName) { worldName = nm; if (arc) arc.setWorld(nm); } }
    const mods = arc && arcEnabled ? arc.update(dt, bc) : null;
    FAR = mods ? CS.apply(world.far, mods, worldName) : world.far; NEAR = mods ? CS.apply(world.near, mods, worldName) : world.near;
    const gT = (.25 + .5 * Math.min(1, st.bs) + .9 * (st.punch || 0) + .25 * L.fire * (st.kk || 0)) * world.glow * (mods ? mods.glow : 1); L.glow += (gT - L.glow) * (1 - Math.exp(-dt / .4));
    if (!window.RENDER && opts.adapt !== false) { const now = performance.now(); if (L.emaT) { const f = now - L.emaT; if (f < 250) L.ema += (f - L.ema) * .03; } L.emaT = now;
      L.tierT = (L.tierT || 0) + dt; if (L.tierT > 3 && L.ema > 22 && L.tier < TIERS.length - 1) { L.tier++; L.tierT = 0; L.ema = 16; } }
  }
  function draw(dst, W, H, U, cx, cy, R, st, pal, vTri) {
    const dt = Math.min(.05, st.dt || 1 / 60), xe = .5 * W / U, yt = (H - cy) / U, yb = -cy / U, Wd = world;
    if (!T || TW !== W || TH !== H) { if (T) T.forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); }); T = [trail(W, H), trail(W, H)]; TW = W; TH = H; ti = 0;
      for (const x of T) { gl.bindFramebuffer(gl.FRAMEBUFFER, x.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } }
    const steps = dt > 1 / 45 ? 2 : 1;
    gl.useProgram(pSim.p);
    for (let s = 0; s < steps; s++) {
      const a = S[si], b = S[1 - si]; L.seed = (L.seed + 1.618) % 1000;
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.viewport(0, 0, NW, NW);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.p); gl.uniform1i(pSim.u.tP, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.v); gl.uniform1i(pSim.u.tV, 1);
      const u = pSim.u, f = (n, x) => u[n] && gl.uniform1f(u[n], x);
      f('uDt', dt / steps); f('uVb', L.vb); f('uR', R); f('uCalm', st.calm || 0); f('uAmb', st.amb || 0); f('uTime', st.et || 0); f('uSeed', L.seed);
      f('uInit', inited ? 0 : 1); f('uXe', xe); f('uYt', yt); f('uYb', yb); f('uPulse', L.pulse); f('uFront', R + L.front); f('uGather', L.gather);
      f('uSwirl', L.swirl); f('uBreeze', L.breeze); f('uFire', L.fire * Wd.fire); f('uFlow', Wd.flow); f('uHang', Wd.hang); f('uRise', Wd.rise); f('uCurl', Wd.curl); f('uEmit', Wd.fire);
      gl.uniform4fv(u.uQz, L.qz); f('uQs', L.qs);
      gl.drawArrays(gl.TRIANGLES, 0, 3); si = 1 - si; inited = true;
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    // lowest tier (a slow phone): no trails, the particles go straight into the scene (two full-screen passes saved)
    const trails = L.tier < 2 && opts.trails !== false && Q.get('trails') !== '0';
    const A = T[ti], B = trails ? T[1 - ti] : { fb: dst.fb, t: null };
    if (trails) { gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb); gl.viewport(0, 0, W, H); gl.useProgram(pFade.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(pFade.u.t, 0); gl.uniform2f(pFade.u.uDst, W, H);
      gl.uniform1f(pFade.u.uDecay, Math.pow(Math.min(.95, Wd.decay + .12 * (st.calm || 0) + .08 * L.fire * Wd.fire - .06 * L.fire * (1 - Wd.fire)), dt * 60)); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(pPts.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S[si].p); gl.uniform1i(pPts.u.tP, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S[si].v); gl.uniform1i(pPts.u.tV, 1);
    let u = pPts.u, f = (n, x) => u[n] && gl.uniform1f(u[n], x);
    gl.uniform1i(u.uN, NW); gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uC, cx, cy); f('uU', U); f('uR', R); f('uGlow', L.glow);
    f('uPx', Math.max(1.4, W / 390 * 1.05)); f('uYb', yb); f('uYt', yt); f('uTopBand', 90 * (W / 390) / U); f('uBand', 150 * (W / 390) / U); f('uTw', L.tw); f('uNear', .006); f('uTwk', Wd.twinkle); f('uSize', Wd.size);
    f('uShape', Wd.shape); f('uPg', trails ? 1 : 2.3); gl.uniform3fv(u.uFar, FAR); gl.uniform3fv(u.uNearC, NEAR); gl.uniform4fv(u.uQz, L.qz); f('uQs', L.qs); gl.uniform4fv(u.uQz2, L.qz2); f('uQs2', L.qs2); gl.uniform3fv(u.uHr, L.hr);
    gl.bindVertexArray(vPts); gl.drawArrays(gl.POINTS, 0, Math.floor(NW * NW * TIERS[L.tier] * Wd.count));
    gl.bindVertexArray(vTri);
    if (!trails) { gl.disable(gl.BLEND); return; }
    ti = 1 - ti;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(pAdd.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.t); gl.uniform1i(pAdd.u.t, 0);
    u = pAdd.u; f = (n, x) => u[n] && gl.uniform1f(u[n], x);
    gl.uniform2f(u.uDst, dst.w, dst.h); gl.uniform2f(u.uC, cx, cy); f('uU', U); f('uGain', opts.gain ?? 1); f('uTime', st.et || 0); f('uCaus', Wd.caustic); f('uShaft', Wd.shafts);
    f('uB', Math.min(1, st.bs)); f('uR', R); gl.uniform3fv(u.uNearC, NEAR); gl.uniform4fv(u.uQz, L.qz); f('uQs', L.qs);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }
  // the rim source (source 'rim', or 'blend' = a hairline rim over the silk), additive into the scene after the threads
  function drawSource(dst, U, cx, cy, R, st, mode, vTri) {
    if (mode !== 'rim' && mode !== 'blend') return;
    gl.bindVertexArray(vTri); gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(pRim.p);
    const u = pRim.u, f = (n, x) => u[n] && gl.uniform1f(u[n], x);
    gl.uniform2f(u.uC, cx, cy); f('uU', U); f('uR', R * 1.005); f('uGlow', L.glow); f('uTime', st.et || 0); f('uLine', mode === 'blend' ? 1 : 0);
    f('uKind', world.centre || 0); f('uB', Math.min(1, st.bs));
    gl.uniform3fv(u.uFar, FAR); gl.uniform3fv(u.uNearC, NEAR);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND);
  }
  function dispose() { try { [pSim, pPts, pFade, pAdd, pRim].forEach((q) => gl.deleteProgram(q.p)); S.forEach((s) => { gl.deleteTexture(s.p); gl.deleteTexture(s.v); gl.deleteFramebuffer(s.fb); });
    if (T) T.forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); }); gl.deleteVertexArray(vPts); } catch (_) {} }
  return { update, draw, drawSource, dispose, setWorld, setJourney, get worldName() { return worldName; }, get arc() { return arc; }, setQuiet, setHoldLane, get world() { return world; }, L, particles: NW * NW,
    get drawn() { return Math.floor(NW * NW * TIERS[L.tier] * world.count); }, f32 };
}

if (typeof window !== "undefined") window.TIDE_WORLDS = TIDE_WORLDS;
function createSilk(canvas, opts = {}) {
  const mobile = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600);
  const N = opts.threads ?? (mobile ? 420 : 800);
  const M = opts.points ?? (mobile ? 120 : 220);
  const SS = opts.ss ?? 1;
  const dprCap = opts.dprCap ?? 2;
  const grain = opts.grain ?? 0.035;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 not available');
  const floatOK = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f));
    gl.bindAttribLocation(p, 0, 'a'); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p, u }; };
  const pLines = prog(VS_LINES, FS_LINES), pBg = prog(VS_TRI, FS_BG), pPost = prog(VS_TRI, FS_POST);
  const pDown = prog(VS_TRI, FS_DOWN), pBlur = prog(VS_TRI, FS_BLUR), pBlit = prog(VS_TRI, FS_BLIT);
  const bgHalf = opts.bgHalf !== false;   // the room is soft light: drawn at half resolution, a quarter of the cost
  const bloomOn = opts.bloom !== false;
  // Tide: the room's air (null when the device has no float render targets; the room then stays as in v15)
  let tide = null; if (opts.tide) { try { tide = createTideField(gl, prog, VS_TRI, opts.tideOpts || {}); } catch (e) { tide = null; } }
  let srcMode = opts.source || 'rim'; const setSource = (m) => { srcMode = m === 'silk' || m === 'blend' ? m : 'rim'; };
  let quiet = null, quietS = 0, quiet2 = null, quietS2 = 0, holdLane = [0, 0];
  const setQuiet = (r, s, r2, s2) => { quiet = r; quietS = Number.isFinite(s) ? s : 0; quiet2 = r2 || null; quietS2 = Number.isFinite(s2) ? s2 : 0; };
  const setHoldLane = (r, s) => { holdLane = [r, s]; };
  const vTri = gl.createVertexArray(); gl.bindVertexArray(vTri);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  // each thread is a closed strip of soft-edged quads (two vertices per point)
  const vLines = gl.createVertexArray(); gl.bindVertexArray(vLines);
  const v = new Float32Array(N * M * 2 * 3), idx = new Uint32Array(N * M * 6); let k = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const o = (i * M + j) * 2;
    v.set([i, j / M, -1, i, j / M, 1], o * 3);
    const n = (i * M + (j + 1) % M) * 2;
    idx.set([o, o + 1, n, o + 1, n + 1, n], k); k += 6;
  }
  const count = k;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  let W = 0, H = 0, tex = null, fbo = null, BL = [];
  const target = (w, h, filter) => { const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    if (floatOK) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
    return { tx, fb, w, h }; };
  function resize() {
    let w = canvas.width, h = canvas.height;
    if (opts.autoSize !== false) {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = Math.max(1, Math.round(canvas.clientWidth * dpr)); h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    if (w === W && h === H && fbo) return;
    W = w; H = h;
    if (tex) gl.deleteTexture(tex); if (fbo) gl.deleteFramebuffer(fbo);
    BL.forEach((r) => { gl.deleteTexture(r.tx); gl.deleteFramebuffer(r.fb); });
    { const w4 = Math.max(1, Math.round(W * SS / 4)), h4 = Math.max(1, Math.round(H * SS / 4)), w8 = Math.max(1, Math.round(w4 / 2)), h8 = Math.max(1, Math.round(h4 / 2));
      BL = [target(w4, h4, gl.LINEAR), target(w4, h4, gl.LINEAR), target(w8, h8, gl.LINEAR), target(w8, h8, gl.LINEAR),
        target(Math.max(1, Math.round(W * SS / 2)), Math.max(1, Math.round(H * SS / 2)), gl.LINEAR)]; }
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (floatOK) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W * SS, H * SS, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W * SS, H * SS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  // palette and depth
  const toPal = (p) => (typeof p === 'string' ? PALETTES[p] : p) || PALETTES.ember;
  let pal = opts.palette ? toPal(opts.palette) : null, depth = opts.depth ?? null, dStyle = opts.depthStyle ?? 1;
  const setPalette = (p) => { pal = toPal(p); };
  const setDepth = (d) => { depth = Math.min(2, Math.max(0, +d || 0)); };   // 1 = default; up to 2 for music-driven boosts
  const setDepthStyle = (n) => { dStyle = n | 0; };                            // 0 motes (v5), 1 lens bokeh, 2 haze bands, 3 specks + near bokeh

  // breath-derived state; everything here only moves because the breath moved
  const st = { lastT: null, lastB: 0, v: 0, still: 1, flowT: 0, lift: 0, wind: 0, omega: 0,
    bs: 0, bv: 0, taut: 0, holdT: 0, calm: 0, kk: 0.5, frame: 0 };
  // guard: nothing that is not a finite number may reach the springs (a NaN would be sticky and black out every frame)
  const fin = (x, d) => (Number.isFinite(x) ? x : d);
  const KEYS = ['bs', 'bv', 'bs2', 'bv2', 'taut', 'flowT', 'wind', 'omega', 'spin', 'tilt', 'lift', 'et', 'v', 'still', 'holdT', 'calm', 'hl', 'kk', 'punch', 'amb'];
  function sane(b) { for (const key of KEYS) if (st[key] != null && !Number.isFinite(st[key])) {
      Object.assign(st, { bs: b, bv: 0, bs2: b, bv2: 0, taut: b, flowT: 0, wind: 0, omega: 0, spin: 0, tilt: 0, lift: 0, et: 0, v: 0, still: 1, holdT: 0, calm: 0, hl: 0, kk: .5, punch: 0, amb: 0 });
      st.resets = (st.resets || 0) + 1; return; } }
  function update(b, k = 0.5, w = 0, t = performance.now() / 1000) {
    b = fin(b, fin(st.lastB, .2)); k = fin(k, .5); w = fin(w, 0); t = fin(t, fin(st.lastT, 0));
    w *= tide ? (tide.world.warm ?? 1) : 1;   // a world sets how warm the release light is
    k = Math.min(1, Math.max(0, k));
    if (st.lastT === null) { st.lastT = t; st.lastB = b; st.bs = b; st.kk = k; st.taut = b; }
    const dt = Math.min(0.1, Math.max(0, t - st.lastT)); st.dt = dt;
    if (dt > 0) {
      // the sphere follows the breath with a little weight: a slight lag as it fills and a soft
      // settle ("catch") at the top; it never runs ahead of the breath
      const vabs = Math.abs((b - st.lastB) / Math.max(dt, 1e-4));
      const n = 8, h = dt / n, wn = 18 + 30 * Math.min(1, Math.max(0, (vabs - 1.2) / 3)), z = 0.8;   // stiffer on fast moves so a sharp exhale stays sharp
      // damping acts on the error in velocity (feed-forward), so the sphere tracks a moving breath with no steady lag
      // and turns on the frame the breath turns; the weight shows only as a soft settle when the breath stops
      const vT = (b - st.lastB) / dt;
      for (let i = 0; i < n; i++) { const bT = st.lastB + (b - st.lastB) * (i + 1) / n;
        st.bv += (wn * wn * (bT - st.bs) + 2 * z * wn * (vT - st.bv)) * h; st.bs += st.bv * h; }
      st.bs = Math.min(1.02, Math.max(0, st.bs));
      if (st.bs2 == null) { st.bs2 = st.bs; st.bv2 = 0; }
      for (let i = 0; i < n; i++) { st.bv2 += (36 * (st.bs - st.bs2) - 2 * .5 * 6 * st.bv2) * h; st.bs2 += st.bv2 * h; }   // wn 6, damping 0.5
      const vi = (b - st.lastB) / dt; st.v += (vi - st.v) * (1 - Math.exp(-dt / 0.08));
      const target = 1 - Math.min(1, Math.abs(st.v) / 0.35);
      st.still += (target - st.still) * (1 - Math.exp(-dt / (target > st.still ? 1.6 : 0.25)));
      // tautness trails the size: the threads draw tight just after the sphere arrives
      const tt = Math.min(1, Math.max(0, (st.bs - 0.04) / 0.91));
      // effort draws the threads tight: intensity holds them taut, each punch (a fire exhale) snaps them tighter,
      // and they loosen again on the passive spring back
      const tT = Math.min(1, Math.max(tt * tt * (3 - 2 * tt), .5 * st.kk, .3) + .45 * (st.punch || 0));   // never a loose tangle
      st.taut += (tT - st.taut) * (1 - Math.exp(-dt / (tT > st.taut ? 0.45 : 0.3)));
      st.kk += (k - st.kk) * (1 - Math.exp(-dt / 0.35));
      // the hold deepens: calm grows slowly while the breath is held, resets when it moves
      if (st.still > 0.85) st.holdT += dt; else st.holdT *= Math.exp(-dt / 0.4);
      st.calm = 1 - Math.exp(-st.holdT / 9);
      // hold life: fades in over ~2 s of stillness; the sphere then turns slowly on a wandering axis
      const hlT = st.holdT > 0.6 ? Math.min(1, (st.holdT - 0.6) / 2) : 0;
      st.hl = (st.hl || 0) + (hlT - (st.hl || 0)) * (1 - Math.exp(-dt / (hlT > (st.hl || 0) ? 0.8 : 0.25)));
      const w1 = 0.16 * Math.sin(t * 0.131) + 0.11 * Math.sin(t * 0.077 + 1.3) + 0.07 * Math.sin(t * 0.293 + 2.1);
      const w2 = 0.05 * Math.sin(t * 0.101 + 0.4) + 0.035 * Math.sin(t * 0.217 + 2.7);
      st.spin = (st.spin || 0) + dt * st.hl * (0.10 + w1) * 1.6;
      st.tilt = (st.tilt || 0) + dt * st.hl * w2 * 1.6; st.tilt *= Math.exp(-dt * (1 - st.hl) / 3);
      const speed = (0.04 + 0.96 * Math.pow(1 - st.still, 1.3) + 0.6 * Math.abs(st.v)) * (0.45 + 1.1 * st.kk) * (1 - 0.7 * st.calm) + 0.22 * (st.amb || 0);
      st.flowT += speed * dt;
      // winding: quick to follow the inhale, a long gravity-like glide on the exhale
      const om = st.v * 1.25 * (0.7 + 0.7 * st.kk);
      const tau = Math.abs(om) > Math.abs(st.omega) ? 0.22 : (st.omega < 0 ? 1.6 : 0.7);
      st.omega += (om - st.omega) * (1 - Math.exp(-dt / tau));
      st.wind += st.omega * dt;
      st.et = (st.et || 0) + dt * (st.eRate ?? 1);   // the room's own clock: embers and veils slow down in a hold
      if (w > 0.001) st.lift += (0.25 + Math.max(0, -st.v)) * dt; else st.lift *= Math.exp(-dt / 0.8);
    }
    st.lastT = t; st.lastB = b; st.w = w; sane(b);
    if (tide && st.dt > 0) tide.update(st, st.dt, t);
  }

  function draw(t) {
    if (gl.isContextLost()) return;   // the page shows its fallback until the context comes back
    resize();
    const P = pal || (typeof window !== 'undefined' && window.SILK_PALETTE) || PALETTES.ember;
    const dep = depth ?? ((typeof window !== 'undefined' && window.SILK_DEPTH != null) ? +window.SILK_DEPTH : 1);
    const w = st.w || 0, bs = Math.min(1, st.bs);
    const U = Math.min(W, H * 0.5625) * SS;       // px per world unit (fits a 9:16 column)
    let qPx = [0, 0, 0, 0]; { const dpr = W / Math.max(1, canvas.clientWidth), cyG = H * SS / 2 + .10 * U;
      if (quiet && quietS > .01) { const x0 = quiet[0] * dpr * SS, x1 = quiet[2] * dpr * SS, y0 = H * SS - quiet[3] * dpr * SS, y1 = H * SS - quiet[1] * dpr * SS; qPx = [x0, y0, x1, y1];
        if (tide) tide.setQuiet([(x0 - W * SS / 2) / U, (y0 - cyG) / U, (x1 - W * SS / 2) / U, (y1 - cyG) / U], quietS); } else if (tide) tide.setQuiet(null, 0);
      if (tide && quiet2 && quietS2 > .01) { const W2 = (x) => (x * dpr * SS - W * SS / 2) / U, H2 = (y) => (H * SS - y * dpr * SS - cyG) / U;
        tide.setQuiet(quiet && quietS > .01 ? null : null, tide.L.qs, [W2(quiet2[0]), H2(quiet2[3]), W2(quiet2[2]), H2(quiet2[1])], quietS2); }
      if (tide) tide.setHoldLane(holdLane[0], holdLane[1]); }
    const uni = { uB: bs, uTaut: st.taut, uFlowT: st.flowT, uWarm: w, uRl: w * Math.max(0, 1 - bs), uLift: st.lift, uK: st.kk,
      uU: U, uM: M, uWind: st.wind, uCalm: st.calm, uRel0: Math.min(1, w * 6), uDStyle: dStyle, uLight: st.flowT * 0.15 + t * 0.03, uDens: Math.pow(900 / N, 0.8), uDepth: dep, uAmb: st.amb || 0, uTime: t, uSpin: st.spin || 0, uTilt: st.tilt || 0, uHL: st.hl || 0, uPunch: st.punch || 0, uVig: st.vig ?? .3, uCool: st.cool || 0, uET: st.et || 0, uRich: st.rich || 0, uB2: Math.min(1.1, Math.max(0, st.bs2 ?? bs)), uCueA: st.cueT0 == null ? -1 : t - st.cueT0, uCueD: st.cueD || 0, uCueS: st.cueS || 0, uCueM: cueMode };
    const set = (Pg) => { gl.useProgram(Pg.p); gl.uniform2f(Pg.u.uRes, W * SS, H * SS);
      for (const n in uni) if (Pg.u[n]) gl.uniform1f(Pg.u[n], uni[n]);
      if (Pg.u.uBase) gl.uniform3fv(Pg.u.uBase, P.base); if (Pg.u.uPale) gl.uniform3fv(Pg.u.uPale, P.pale);
      if (Pg.u.uTint) gl.uniform3fv(Pg.u.uTint, P.tint); if (Pg.u.uGround) gl.uniform3fv(Pg.u.uGround, P.ground); };
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W * SS, H * SS);
    if (bgHalf) {
      const bgT = BL[4]; gl.bindFramebuffer(gl.FRAMEBUFFER, bgT.fb); gl.viewport(0, 0, bgT.w, bgT.h);
      set(pBg); gl.uniform2f(pBg.u.uRes, bgT.w, bgT.h); gl.uniform1f(pBg.u.uU, U * bgT.w / (W * SS));
      gl.bindVertexArray(vTri); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W * SS, H * SS);
      gl.useProgram(pBlit.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgT.tx); gl.uniform1i(pBlit.u.t, 0);
      gl.uniform2f(pBlit.u.uDst, W * SS, H * SS); gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else { set(pBg); gl.bindVertexArray(vTri); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    if (tide) { tide.draw({ fb: fbo, w: W * SS, h: H * SS }, W * SS, H * SS, U, W * SS / 2, H * SS / 2 + .10 * U, .10 + .25 * bs, st, P, vTri);
      gl.bindVertexArray(vTri); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W * SS, H * SS); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (srcMode !== 'rim') set(pLines); if (srcMode !== 'rim') { gl.bindVertexArray(vLines); gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0); }
    if (tide) { tide.drawSource({ fb: fbo, w: W * SS, h: H * SS }, U, W * SS / 2, H * SS / 2 + .10 * U, .10 + .25 * bs, st, srcMode, vTri); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(vTri);
    if (bloomOn) {
      // scene -> 1/4 (soft knee) -> blur H, V; 1/4 -> 1/8 -> blur H, V
      const pass = (Pg, src, dst, f) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(Pg.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tx); gl.uniform1i(Pg.u.t, 0); gl.uniform2f(Pg.u.uDst, dst.w, dst.h); f(Pg.u); gl.drawArrays(gl.TRIANGLES, 0, 3); };
      const [a4, b4, a8, b8] = BL, sc = { tx: tex, w: W * SS, h: H * SS };
      pass(pDown, sc, a4, (u) => { gl.uniform2f(u.uSrc, sc.w, sc.h); gl.uniform1f(u.uKnee, 0); });
      pass(pBlur, a4, b4, (u) => gl.uniform2f(u.uDir, 1, 0)); pass(pBlur, b4, a4, (u) => gl.uniform2f(u.uDir, 0, 1));
      pass(pDown, a4, a8, (u) => { gl.uniform2f(u.uSrc, a4.w, a4.h); gl.uniform1f(u.uKnee, 0); });
      pass(pBlur, a8, b8, (u) => gl.uniform2f(u.uDir, 1.6, 0)); pass(pBlur, b8, a8, (u) => gl.uniform2f(u.uDir, 0, 1.6));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(pPost.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, BL[0].tx); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, BL[2].tx);
    gl.uniform1i(pPost.u.b1, 1); gl.uniform1i(pPost.u.b2, 2); gl.uniform2f(pPost.u.uOut, W, H);
    gl.uniform1f(pPost.u.uBl1, bloomOn ? bloom[0] : 0); gl.uniform1f(pPost.u.uBl2, bloomOn ? bloom[1] : 0); gl.uniform1f(pPost.u.uSharp, bloomOn ? sharp : 0); gl.uniform4fv(pPost.u.uQz, qPx); gl.uniform1f(pPost.u.uQs, quietS); gl.uniform1f(pPost.u.uQd, 70 * W / Math.max(1, canvas.clientWidth) * SS);
    gl.uniform1i(pPost.u.t, 0); gl.uniform1i(pPost.u.ss, SS); gl.uniform1f(pPost.u.uFrame, st.frame++); gl.uniform1f(pPost.u.uGrain, grain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function render(b, k = 0.5, w = 0, t = performance.now() / 1000) { update(b, k, w, t); draw(t); }
  const setAmbient = (a) => { st.amb = Math.max(0, +a || 0); };
  const setPunch = (a) => { st.punch = Math.max(0, +a || 0); };
  let cueMode = 0;
  const setCueMode = (m) => { cueMode = m | 0; };
  // a cue starts on the frame it is called: dir +1 in (gather), -1 out (push), 0 a hold (settle in place)
  const cue = (dir, strength, t = performance.now() / 1000) => { st.cueT0 = t; st.cueD = dir; st.cueS = strength; };
  const setMood = (vig, cool, rate, rich) => { st.vig = vig; st.cool = cool; st.eRate = rate; st.rich = rich || 0; };
  const bloom = [opts.bloomTight ?? .6, opts.bloomWide ?? .25], sharp = opts.sharp ?? +(new URLSearchParams(location.search).get('sharp') ?? .45);
  // free everything this instance made (used when the page swaps to a lighter silk on the same canvas)
  function dispose() { try { if (tide) tide.dispose(); [pLines, pBg, pPost, pDown, pBlur, pBlit].forEach((q) => gl.deleteProgram(q.p)); gl.deleteVertexArray(vTri); gl.deleteVertexArray(vLines);
    if (tex) gl.deleteTexture(tex); if (fbo) gl.deleteFramebuffer(fbo); BL.forEach((r) => { gl.deleteTexture(r.tx); gl.deleteFramebuffer(r.fb); }); } catch (_) {} }
  return { get tide() { return tide; }, setQuiet, setHoldLane, setSource, get source() { return srcMode; }, render, update, draw, dispose, setPalette, setDepth, setDepthStyle, setAmbient, setPunch, setMood, setCueMode, cue, gl, threads: N, state: st, PALETTES };
}
createSilk.PALETTES = PALETTES;
if (typeof window !== 'undefined') window.createSilk = createSilk;
})();

// Breath line: a guidance layer that works on top of any visual. It draws the session's breath curve so the next
// breaths can be read before they come: the past as a fading trail, the future ahead of a "now" bead.
//
//   const line = createBreathLine(hostEl, bc, { style: 'thread' });
//   line.draw();              // once per frame, after the visual
//   opts: { style, clock: 'drain'|'segments'|'sweep'|'off', visible, halo (dark halo for bright worlds) }
//   line.setVisible(true|false);  line.setStyle('thread' | 'horizon' | 'orbit' | 'chart');
//
// bc (window.__bc) is read every frame: { EV, phaseAt(t), breathAt(t), FIRE, phases, at, paused, session, free,
//   chrome (player controls visible), layout() -> { W, H, cx, cy, U, R (sphere radius px), capBottom, safeBottom },
//   reduced (prefers-reduced-motion) }.
// It owns one 2D canvas (pointer-events: none) and nothing else; it never throws into the page.
(function () {
const LABELS = { 'Four in, four out': 'Four in, four out', 'Breath of fire': 'Breath of fire', 'Last gear': 'Last gear', 'Hold and release': 'Hold and release' };
const fin = (x, d) => (Number.isFinite(x) ? x : d);
function createBreathLine(host, bc, opts = {}) {
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
  host.appendChild(cv);
  const cvc = cv.cloneNode(); host.appendChild(cvc);   // the hold clock has its own canvas (its own fade)
  let ctx = cv.getContext('2d'), cctx = cvc.getContext('2d');
  let style = opts.style || 'thread', visible = opts.visible !== false;
  const halo = !!opts.halo;   // a dark halo under the crisp strokes, for bright worlds (costs ~0.4 ms on a phone-size canvas)
  const S = { op: 0, rev: 0, trail: 0, pulse: 0, lastEv: -1, lastT: null, ch: 0 };
  const TYPES = { in: 1, out: 1, hold: .8, holdEmpty: .8, release: 1.3, kick: .7, count: .6 };
  const col = (a, c = [255, 230, 202]) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  function envelope(at) {    // enters before the first round, dissolves into free breathing
    const ph = bc.phaseAt(at);
    if (!bc.session || bc.free || ph === 'Closing' || ph === '') return [0, 0];
    // times relative to the session's own arrival end and integration start (The Wake Up: 40.9 s and 246 s)
    const aE = bc.bounds && bc.bounds('arrival') ? bc.bounds('arrival')[1] : 40.9, iS = bc.bounds && bc.bounds('integration') ? bc.bounds('integration')[0] : 246;
    const rev = ph === 'Arrival' ? smooth((at - (aE - 4.4)) / 3.5) : ph === 'Integration' ? 1 - smooth((at - (iS + .5)) / 4.5) : 1;
    const trail = ph === 'Arrival' ? smooth((at - (aE - 4.9)) / 2.5) : ph === 'Integration' ? 1 - smooth((at - (iS + 3)) / 4) : 1;
    return [rev, trail];
  }
  function B(t) { if (t < 0) return 0; const v = fin(bc.breathAt(t), 0); return Math.max(0, Math.min(1.05, v)); }
  function pulseAt(at) {      // a soft brightening of the bead on each event; fire kicks only on the exhale
    let p = 0; const E = bc.EV; let lo = 0, hi = E.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (E[m].t < at - .6) lo = m + 1; else hi = m; }   // events are sorted by time
    for (let i = lo; i < E.length; i++) { const e = E[i]; if (e.t > at) break; const a = at - e.t; if (a > .6) continue;
      const w = TYPES[e.type]; if (w) p = Math.max(p, w * Math.exp(-a / .14)); }
    return p;
  }
  // time -> x. Now sits under the sphere; the near future is wide, the far future recedes (like a path to the horizon)
  function mapper(W, x0, past, fut, k, xl = 0) {
    const g = (u) => (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
    return (dt) => dt < 0 ? x0 + (dt / past) * (x0 - xl) : x0 + g(Math.min(1, dt / fut)) * (W - x0);
  }
  function holdsIn(t0, t1) { return bc.EV.filter((e) => (e.type === 'hold' || e.type === 'holdEmpty') && e.dur > 2 && e.t < t1 && e.t + e.dur > t0); }

  function drawHorizontal(L, at, rev, trail, dpr, mode) {
    const { W, H } = L; let cx = L.cx, xl = 0;
    // the band: below Edvin's words (never on them), above the bottom edge and safe area
    let bottom = H - L.safeBottom - 34 * dpr, top = Math.max(L.capBottom + 18 * dpr, bottom - .24 * L.U);
    if (bottom - top < 44 * dpr && W > H) {   // landscape: no room under the words, so the line runs beside the sphere
      cx = L.cx + .62 * L.U; xl = cx - 44 * dpr; top = L.cy - .2 * L.U; bottom = L.cy + .2 * L.U; }
    S.band = [top / dpr, bottom / dpr];
    const A = Math.max(16, bottom - top), y = (b) => bottom - b * A;
    // the window follows the rhythm: about three breaths ahead in the box, fewer seconds (same number of beats) in fire
    const wantFut = mode === 'chart' ? 5 : (bc.phaseAt(at + 1.5) === 'Breath of fire' && at > (bc.bounds && bc.bounds('fire') ? bc.bounds('fire')[0] + 1.2 : 94) ? 3.6 : 6.5);
    S.fut = S.fut == null ? wantFut : S.fut + (wantFut - S.fut) * .06;
    const fut = S.fut, past = mode === 'chart' ? 5 : fut * .4, k = mode === 'chart' ? .0001 : .55;
    const X = mapper(W, cx, past, fut, k, xl);
    const futEnd = fut * rev;
    // sample time finely so a fire snap (65 ms) stays a crisp drop
    const pts = []; const n = Math.ceil(W / 1.5);
    for (let i = 0; i <= n; i++) { const u = i / n; const dt = -past + u * (past + fut); if (dt > futEnd) break; pts.push([X(dt), y(B(at + dt)), dt]); }
    if (pts.length < 2) return;
    const c = ctx; c.lineJoin = 'round'; c.lineCap = 'round';
    if (mode === 'chart') {   // the explorer's baseline: chart line with ticks
      c.strokeStyle = col(.08); c.lineWidth = dpr; c.beginPath(); c.moveTo(0, bottom + 6 * dpr); c.lineTo(W, bottom + 6 * dpr); c.stroke();
      c.fillStyle = col(.16); for (let s = Math.ceil(at - past); s <= at + futEnd; s++) c.fillRect(X(s - at) - .5 * dpr, bottom + 6 * dpr, dpr, (s % 4 ? 2.5 : 5) * dpr);
      c.beginPath(); pts.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy)));
      const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, col(0)); g.addColorStop(cx / W, col(.28)); g.addColorStop(cx / W + .001, col(.95, [255, 214, 168])); g.addColorStop(1, col(0, [255, 214, 168]));
      c.strokeStyle = g; c.lineWidth = 1.6 * dpr; c.globalAlpha = trail; c.stroke(); c.globalAlpha = 1;
      return;
    }
    const pastPts = pts.filter((p) => p[2] <= 0), futPts = pts.filter((p) => p[2] >= 0);
    const path = (P) => { c.beginPath(); P.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy))); };
    const xEnd = X(futEnd);
    if (mode === 'horizon' && futPts.length > 1) {   // a ribbon of light: the area under the future curve, lit at its crest
      c.save(); path(futPts); c.lineTo(futPts[futPts.length - 1][0], bottom + 12 * dpr); c.lineTo(futPts[0][0], bottom + 12 * dpr); c.closePath();
      const gv = c.createLinearGradient(0, top - 4 * dpr, 0, bottom + 12 * dpr); gv.addColorStop(0, col(.22, [255, 206, 150])); gv.addColorStop(1, col(0, [255, 206, 150]));
      const gh = c.createLinearGradient(cx, 0, Math.max(cx + 1, xEnd), 0); gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gv; c.globalAlpha = .9 * rev; c.fill(); c.restore();
      // fade the ribbon towards the horizon by painting the far part again with destination-out
      c.save(); c.globalCompositeOperation = 'destination-out'; const go = c.createLinearGradient(cx, 0, W, 0); go.addColorStop(0, 'rgba(0,0,0,0)'); go.addColorStop(1, 'rgba(0,0,0,.95)');
      c.fillStyle = go; c.fillRect(cx, top - 30 * dpr, W - cx, A + 60 * dpr); c.restore();
    }
    // the past: a trail that fades away behind the bead
    if (pastPts.length > 1) { path(pastPts); const g = c.createLinearGradient(xl, 0, cx, 0); g.addColorStop(0, col(0)); g.addColorStop(1, col(.34));
      c.strokeStyle = g; c.lineWidth = 1.3 * dpr; c.globalAlpha = trail; c.stroke(); c.globalAlpha = 1; }
    // the future: a luminous thread, brightest where it meets the bead, dimmer towards the horizon
    if (futPts.length > 1) {
      const g = c.createLinearGradient(cx, 0, Math.max(cx + 1, xEnd), 0);
      g.addColorStop(0, col(.95)); g.addColorStop(.45, col(.55)); g.addColorStop(1, col(.06));
      c.save(); c.globalCompositeOperation = 'lighter';
      path(futPts); c.strokeStyle = g; c.globalAlpha = .16; c.lineWidth = 7 * dpr; c.stroke();   // soft glow around the thread
      c.restore(); c.save();   // a soft dark halo under the crisp thread keeps it readable over a bright world (Tide, the release gold)
      if (halo) { c.shadowColor = 'rgba(12,6,2,.55)'; c.shadowBlur = 5 * dpr; } path(futPts); c.strokeStyle = g; c.lineWidth = 2.1 * dpr; c.stroke(); c.restore();
      // holds: the plateau ahead is a lit bar; its end marks the next turn; its length ahead = the time left
      for (const h of holdsIn(at - past, at + futEnd)) {
        const a0 = Math.max(0, h.t - at), a1 = Math.min(futEnd, h.t + h.dur - at); if (a1 <= a0) continue;
        const yy = y(B(h.t + h.dur * .5)), x0 = X(a0), x1 = X(a1);
        const gh = c.createLinearGradient(cx, 0, Math.max(cx + 1, xEnd), 0); gh.addColorStop(0, col(.55, [255, 214, 168])); gh.addColorStop(1, col(.08, [255, 214, 168]));
        c.strokeStyle = gh; c.lineWidth = 3.2 * dpr; c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke();
        if (h.t + h.dur - at <= futEnd) { c.fillStyle = col(.7 * Math.min(1, (W - x1) / (40 * dpr))); c.beginPath(); c.arc(x1, yy, 2.2 * dpr, 0, 6.283); c.fill(); }
      }
      if (count === 'ticks') drawTicks(c, X, (tt) => y(B(tt)), at, futEnd, dpr, W);
      // technique names arrive on the thread, at the moment each begins, and leave once passed
      c.font = `600 ${10.5 * dpr}px "Nunito Sans", system-ui, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      for (const p of bc.phases || []) { const lab = LABELS[p[2]]; if (!lab) continue; const dt = p[0] - at; if (dt < -1.5 || dt > futEnd) continue;
        const x = X(dt), f = Math.min(1, (W - x) / (70 * dpr)) * (dt < 0 ? Math.max(0, 1 + dt / 1.5) : 1) * rev;
        const gm = c.createLinearGradient(0, top - 10 * dpr, 0, bottom); gm.addColorStop(0, col(.4 * f)); gm.addColorStop(1, col(0));
        c.fillStyle = gm; c.fillRect(x - .5 * dpr, top - 10 * dpr, dpr, A + 10 * dpr);   // a soft marker where the technique begins
        c.save(); try { c.letterSpacing = (1.4 * dpr) + 'px'; } catch (_) {}
        const tw = c.measureText(lab.toUpperCase()).width, tx = Math.min(x + 6 * dpr, W - tw - 12 * dpr);   // never cut at the edge
        c.fillStyle = col(.62 * f); c.fillText(lab.toUpperCase(), tx, top - 4 * dpr); c.restore(); }
    }
    // now: the bead, at the sphere's breath; it brightens on each event
    const yb = y(B(at)), pr = S.pulse; c.globalAlpha = Math.max(rev, trail);
    const gb = c.createRadialGradient(cx, yb, 0, cx, yb, (10 + 9 * pr) * dpr); gb.addColorStop(0, col(.42 + .3 * pr)); gb.addColorStop(1, col(0));
    c.fillStyle = gb; c.beginPath(); c.arc(cx, yb, (10 + 9 * pr) * dpr, 0, 6.283); c.fill();
    c.fillStyle = col(1, [255, 238, 214]); c.beginPath(); c.arc(cx, yb, (3.1 + .8 * pr) * dpr, 0, 6.283); c.fill();
  }

  function drawOrbit(L, at, rev, trail, dpr) {   // a circular timeline around the sphere: now at the top, the future clockwise
    const { cx, cy, U } = L, R0 = .415 * U, A = .05 * U, fut = 7, past = 1.6, span = 1.72 * Math.PI;
    const ang = (dt) => -Math.PI / 2 + (dt / fut) * span, P = (dt) => { const a = ang(dt), r = R0 + B(at + dt) * A; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const c = ctx, n = 360, futEnd = fut * rev;
    c.lineJoin = 'round'; c.lineCap = 'round';
    const seg = (d0, d1, a0, a1, w) => { const m = Math.max(2, Math.ceil(n * (d1 - d0) / (fut + past)));
      for (let i = 0; i < m; i++) { const u0 = d0 + (d1 - d0) * i / m, u1 = d0 + (d1 - d0) * (i + 1) / m, al = a0 + (a1 - a0) * (i + .5) / m;
        const [x0, y0] = P(u0), [x1, y1] = P(u1); c.strokeStyle = col(al); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } };
    c.globalAlpha = trail; seg(-past, 0, 0, .3, 1.3 * dpr); c.globalAlpha = 1;
    if (futEnd > .05) seg(0, futEnd, .9, .06, 1.6 * dpr);
    const [bx, by] = P(0), pr = S.pulse;
    const gb = c.createRadialGradient(bx, by, 0, bx, by, (9 + 8 * pr) * dpr); gb.addColorStop(0, col(.45 + .3 * pr)); gb.addColorStop(1, col(0));
    c.fillStyle = gb; c.beginPath(); c.arc(bx, by, (9 + 8 * pr) * dpr, 0, 6.283); c.fill();
    c.fillStyle = col(1, [255, 238, 214]); c.beginPath(); c.arc(bx, by, 3 * dpr, 0, 6.283); c.fill();
  }

  // ---- the hold clock: time left in a hold, moving to zero (a ring around the sphere) ----
  let clock = opts.clock || 'drain';
  const clk = { op: 0, hev: null };
  function drawClock(L, at, dpr, dt) {
    const E = bc.cur; const hev = E && (E.type === 'hold' || E.type === 'holdEmpty') && E.dur > 3 && at >= E.t && at < E.t + E.dur ? E : null;
    if (hev) clk.hev = hev;
    const want = hev && bc.session && clock !== 'off' && clock !== 'plateau' ? 1 : 0;
    clk.op += (want - clk.op) * (1 - Math.exp(-dt / (want ? .25 : .3)));
    if (clk.op < .01 || !clk.hev) return;
    const h = clk.hev, left = Math.max(0, h.t + h.dur - at), frac = Math.max(0, Math.min(1, left / h.dur));
    const last = left <= 10.5 && h.dur > 14;
    const { cx, cy, U } = L, r = Math.max(L.R * 1.13, .2 * U) + 4 * dpr, c = cctx, a0 = -Math.PI / 2;
    const warm = last ? [255, 206, 140] : [255, 230, 202];
    c.save(); c.globalAlpha = clk.op; c.lineCap = 'round';
    // the track: the whole hold, faint
    c.strokeStyle = col(.13); c.lineWidth = 1.2 * dpr; c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.stroke();
    if (clock === 'segments') {
      const n = Math.max(4, Math.min(40, Math.round(h.dur))), gap = .5 / n * 6.2832 * .35;
      for (let i = 0; i < n; i++) { const s0 = a0 + i / n * 6.2832 + gap, s1 = a0 + (i + 1) / n * 6.2832 - gap;
        const on = (i + 1) / n <= frac + 1e-6, part = !on && i / n < frac;
        c.strokeStyle = col(on ? .85 : part ? .85 * (frac * n - i) : .0, warm); c.lineWidth = 3 * dpr; c.beginPath(); c.arc(cx, cy, r, s0, s1); c.stroke(); }
    } else if (clock === 'sweep') {
      const a1 = a0 + frac * 6.2832;
      const g = c.createRadialGradient(cx, cy, r * .96, cx, cy, r * 1.25); g.addColorStop(0, col(.14, warm)); g.addColorStop(1, col(0, warm));
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r * 1.25, a0, a1); c.closePath(); c.fill();
      const hx = cx + Math.cos(a1) * r, hy = cy + Math.sin(a1) * r;
      c.strokeStyle = col(.9, warm); c.lineWidth = 1.6 * dpr; c.beginPath(); c.moveTo(cx + Math.cos(a1) * r * .9, cy + Math.sin(a1) * r * .9); c.lineTo(cx + Math.cos(a1) * r * 1.22, cy + Math.sin(a1) * r * 1.22); c.stroke();
      c.strokeStyle = col(.5, warm); c.lineWidth = 2 * dpr; c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke();
    } else {   // drain: the time left is a bright arc from twelve o'clock, its leading head drawing back to zero
      // the head moves clockwise like a clock hand; what is still lit ahead of it back to twelve is the time left
      const a1 = a0 + (1 - frac) * 6.2832, aE = a0 + 6.2832;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = col(.18, warm); c.lineWidth = 9 * dpr; c.beginPath(); c.arc(cx, cy, r, a1, aE); c.stroke();
      c.restore();
      c.save(); if (halo) { c.shadowColor = 'rgba(12,6,2,.55)'; c.shadowBlur = 6 * dpr; }
      c.strokeStyle = col(.9, warm); c.lineWidth = 2.6 * dpr; c.beginPath(); c.arc(cx, cy, r, a1, aE); c.stroke(); c.restore();
      if (frac > .002) { const hx = cx + Math.cos(a1) * r, hy = cy + Math.sin(a1) * r;
        const gh = c.createRadialGradient(hx, hy, 0, hx, hy, 12 * dpr); gh.addColorStop(0, col(.7, warm)); gh.addColorStop(1, col(0, warm));
        c.fillStyle = gh; c.beginPath(); c.arc(hx, hy, 12 * dpr, 0, 6.2832); c.fill();
        c.fillStyle = col(1, [255, 242, 222]); c.beginPath(); c.arc(hx, hy, 3.2 * dpr, 0, 6.2832); c.fill(); }
    }
    c.restore();
  }
  // ---- the breath count: where you are in the round, and how many are left ----
  let count = opts.count || 'beads';
  let ROUNDS = null;
  function rounds() {   // every counted round from the score: box and last gear by inhales; breath of fire by its kicks
    if (ROUNDS) return ROUNDS; ROUNDS = [];
    for (const p of bc.phases || []) {
      const kind = p[2] === 'Four in, four out' ? 'box' : p[2] === 'Last gear' ? 'gear' : p[2] === 'Breath of fire' ? 'fire' : null; if (!kind) continue;
      const ty = kind === 'fire' ? 'kick' : 'in', ts = bc.EV.filter((e) => e.type === ty && e.t >= p[0] && e.t < p[1]).map((e) => e.t);
      if (ts.length > 1) ROUNDS.push({ kind, ts, t0: ts[0], t1: ts[ts.length - 1] + (kind === 'fire' ? .5 : 2) });
    }
    return ROUNDS;
  }
  const cnt = { op: 0, r: null, bump: -9 };
  function drawCount(L, at, dpr, dt) {
    const R = rounds().find((r) => at >= r.t0 - 1.2 && at < r.t1 + .8);
    if (R) cnt.r = R;
    const want = R && bc.session && count !== 'off' && !(count === 'ticks') ? 1 : 0;
    cnt.op += (want - cnt.op) * (1 - Math.exp(-dt / (want ? .35 : .5)));
    if (cnt.op < .01 || !cnt.r) return;
    const r0 = cnt.r, N = r0.ts.length; let i = 0; while (i < N && r0.ts[i] <= at + .02) i++;   // i = breaths begun
    const c = cctx, { cx, cy, U } = L, rad = .39 * U + 6 * dpr;
    c.save(); c.globalAlpha = cnt.op;
    if (count === 'numeral') {   // a large, quiet numeral on each new breath, fading
      if (r0.kind === 'fire' || i < 1) { c.restore(); return; }
      const age = at - r0.ts[i - 1], o = Math.max(0, 1 - age / 1.6) * Math.min(1, age / .08);
      c.font = `300 ${40 * dpr}px "Nunito Sans", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = col(.8 * o, N - i < 3 ? [255, 206, 140] : [255, 236, 214]); c.fillText(String(i), cx, cy - rad - 26 * dpr);
      c.restore(); return; }
    // beads on the upper half of a ring around the sphere (clear of the words below and the logo above)
    // centred over the top; a short round is a short arc (six box breaths ~ 120°), a long one spreads to 200°
    const span = Math.min(200, 24 * Math.max(1, (r0.kind === 'fire' ? 9 : N) - 1)) * Math.PI / 180, a0 = 1.5 * Math.PI - span / 2, a1 = a0 + span, ang = (u) => a0 + (a1 - a0) * u;
    if (r0.kind === 'fire') {   // Edvin doesn't count the fire: a quiet progress arc through the round, no beads
      const u = Math.max(0, Math.min(1, (at - r0.t0) / (r0.t1 - r0.t0)));
      c.lineCap = 'round'; c.strokeStyle = col(.16); c.lineWidth = 1.4 * dpr; c.beginPath(); c.arc(cx, cy, rad, a0, a1); c.stroke();
      c.strokeStyle = col(.7); c.lineWidth = 2.4 * dpr; c.beginPath(); c.arc(cx, cy, rad, a0, ang(u)); c.stroke();
      c.restore(); return; }
    for (let k = 0; k < N; k++) {
      const u = N > 1 ? k / (N - 1) : .5, x = cx + Math.cos(ang(u)) * rad, y = cy + Math.sin(ang(u)) * rad;
      const done = k < i - 1, cur = k === i - 1, left = N - k;   // the last three ahead are a little brighter: nearly there
      if (cur) { const age = Math.max(0, at - r0.ts[k]), pb = bc.reduced ? 0 : Math.exp(-age / .25);
        const g = c.createRadialGradient(x, y, 0, x, y, (9 + 6 * pb) * dpr); g.addColorStop(0, col(.55 + .3 * pb)); g.addColorStop(1, col(0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, (9 + 6 * pb) * dpr, 0, 6.2832); c.fill();
        c.fillStyle = col(1, [255, 242, 222]); c.beginPath(); c.arc(x, y, 3.2 * dpr, 0, 6.2832); c.fill(); }
      else { c.fillStyle = done ? col(.62) : col(left <= 3 ? .55 : .36, left <= 3 ? [255, 206, 140] : [255, 230, 202]);
        c.beginPath(); c.arc(x, y, (done ? 2.3 : 2.1) * dpr, 0, 6.2832); c.fill(); }
    }
    c.restore();
  }
  function drawTicks(c, X, y, at, futEnd, dpr, W) {   // 'ticks': a small bead above the line where each breath of the round begins
    const R = rounds().find((r) => at >= r.t0 - 7 && at < r.t1 + .8); if (!R || R.kind === 'fire') return;
    const N = R.ts.length;
    R.ts.forEach((t, k) => { const dt = t - at; if (dt < -.3 || dt > futEnd) return; const x = X(dt), yy = y(t) - 9 * dpr, left = N - k;
      c.fillStyle = col((left <= 3 ? .7 : .45) * Math.min(1, (W - x) / (40 * dpr)), left <= 3 ? [255, 206, 140] : [255, 230, 202]);
      c.beginPath(); c.arc(x, yy, (k === N - 1 ? 3 : 2) * dpr, 0, 6.2832); c.fill(); });
  }
  function draw() {
    try {
      const L0 = bc.layout(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(L0.W * dpr), H = Math.round(L0.H * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cvc.width = W; cvc.height = H; }
      if (!ctx || (ctx.isContextLost && ctx.isContextLost())) { ctx = cv.getContext('2d'); if (!ctx) return; }
      if (!cctx || (cctx.isContextLost && cctx.isContextLost())) cctx = cvc.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); if (cctx) cctx.clearRect(0, 0, W, H);
      const at = fin(bc.at, 0), now = performance.now() / 1000, dt = S.lastT == null ? 0 : Math.min(.25, Math.max(0, now - S.lastT)); S.lastT = now;
      const [rev, trail] = envelope(at);
      const ch = bc.chrome ? 1 : 0; S.ch += (ch - S.ch) * (1 - Math.exp(-dt / .18));   // the player controls take the bottom: the line steps aside
      const target = visible ? 1 : 0; S.op += (target - S.op) * (1 - Math.exp(-dt / .3));
      S.rev += (rev - S.rev) * (1 - Math.exp(-dt / .25)); S.trail += (trail - S.trail) * (1 - Math.exp(-dt / .4));
      S.pulse = bc.reduced ? 0 : pulseAt(at);
      const op = S.op * (1 - S.ch);
      const L1 = { W, H, cx: L0.cx * dpr, cy: L0.cy * dpr, U: L0.U * dpr, R: L0.R * dpr };
      if (cctx) { drawClock(L1, at, dpr, dt); drawCount(L1, at, dpr, dt); }
      cv.style.opacity = op.toFixed(3);
      if (op < .01 || (S.rev < .01 && S.trail < .01)) return;
      const L = { W, H, cx: L0.cx * dpr, cy: L0.cy * dpr, U: L0.U * dpr, capBottom: L0.capBottom * dpr, safeBottom: L0.safeBottom * dpr };
      ctx.save();   // the layer's opacity is the canvas opacity (the draw calls set their own alphas)
      if (style === 'orbit') drawOrbit(L, at, S.rev, S.trail, dpr); else drawHorizontal(L, at, S.rev, S.trail, dpr, style);
      ctx.restore();
    } catch (e) { /* a guidance layer must never break the session */ }
  }
  return { draw, reset: () => { ROUNDS = null; cnt.r = null; }, setCount: (k) => { count = k; }, get count() { return count; }, setVisible: (v) => { visible = !!v; }, setStyle: (s) => { style = s; }, setClock: (k) => { clock = k; }, get clock() { return clock; },
    get style() { return style; }, get band() { return S.band; }, canvas: cv };
}
window.createBreathLine = createBreathLine;
})();

