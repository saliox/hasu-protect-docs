(function(){
'use strict';
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=matchMedia('(pointer: fine)').matches;
var $=function(id){return document.getElementById(id);};
var Q=function(s,r){return (r||document).querySelector(s);};
function clamp(v,a,b){a=a||0;b=b===undefined?1:b;return Math.min(b,Math.max(a,v));}
function ss(a,b,v){var t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function outExpo(t){return t>=1?1:1-Math.pow(2,-10*t);}
function lang(){var b=$('lang');return (b&&b.textContent.trim()==='FR')?'en':'fr';}

/* ── thème : toujours sombre (celui de Hasu) ── */
document.documentElement.removeAttribute('data-theme');
new MutationObserver(function(){if(document.documentElement.hasAttribute('data-theme'))document.documentElement.removeAttribute('data-theme');}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

/* ── réorganisation : chaque bloc de la doc rejoint son chapitre ── */
(function(){
  function move(sel,slotId,before){var el=typeof sel==='string'?Q(sel):sel,slot=$(slotId);if(el&&slot){if(before)slot.insertBefore(el,slot.firstChild);else slot.appendChild(el);}}
  var links=$('hp-links');
  if(links){var tb=Q('header .topbtns'),st=$('botstatus');if(tb)links.insertBefore(tb,links.firstChild);if(st)links.insertBefore(st,links.firstChild);}
  move('header .topgg-badge','hp-topgg');
  move('.main .quickstart','hp-start-slot');
  move('#gpanel','hp-guardian-slot');move('#gnext','hp-guardian-slot');
  move('.main .changelog','hp-news-slot');
  move('#faq','hp-faq-slot');
  var s=$('search');
  if(s){var bar=document.createElement('div');bar.className='hp-toolbar';s.parentNode.insertBefore(bar,s);
    ['search','rescount','catnav','accnav'].forEach(function(id){var e=$(id);if(e)bar.appendChild(e);});}
})();

/* couleurs des simulations alignées sur les repères */
(function(){var map={'#2ECC71':'#4CC38A','#E91E63':'#E1262D','#E67E22':'#F08A3C','#1ABC9C':'#3FB8C9','#9B59B6':'#A47BF0'};
  document.querySelectorAll('[data-c]').forEach(function(e){var c=map[(e.getAttribute('data-c')||'').toUpperCase()];if(c)e.setAttribute('data-c',c);});})();

/* ── chargement ── */
var loader=$('hp-loader'),cnt=$('hp-count'),bar=$('hp-bar'),t0=performance.now(),introStart=null;
function ready(){if(introStart===null)introStart=performance.now();document.body.classList.add('hp-ready');}
function tickLoader(now){
  if(!loader)return;var k=Math.min(1,(now-t0)/1000),e=outExpo(k);
  cnt.textContent=String(Math.round(e*100)).padStart(2,'0');bar.style.setProperty('--k',e.toFixed(3));
  if(k<1){requestAnimationFrame(tickLoader);return;}
  if(!loader.classList.contains('out')){loader.classList.add('out');setTimeout(ready,200);}
  if(now-t0>2200){loader.remove();loader=null;}else requestAnimationFrame(tickLoader);
}
if(reduce){loader.remove();loader=null;ready();introStart=-1e9;}
else{requestAnimationFrame(tickLoader);setTimeout(function(){ready();if(loader){loader.remove();loader=null;}},2800);}

/* ── compteurs : montée progressive quand ils apparaissent, et à chaque changement ── */
function parseNum(t){var d=(t||'').replace(/[^\d]/g,'');return d?parseInt(d,10):null;}
function fmt(n){return n.toLocaleString(lang()==='en'?'en-US':'fr-FR').replace(/ /g,' ');}
var counters=[].slice.call(document.querySelectorAll('[data-src]')).map(function(el){return {el:el,src:el.getAttribute('data-src'),shown:null,started:false};});
function animateTo(c,to){
  var from=c.shown==null?0:c.shown,t1=performance.now(),dur=reduce?0:1600;c.shown=to;
  (function step(now){var k=dur?clamp((now-t1)/dur):1;c.el.textContent=fmt(Math.round(from+(to-from)*outExpo(k)));if(k<1)requestAnimationFrame(step);})(t1);
}
function syncCounters(force){counters.forEach(function(c){var s=$(c.src),v=s?parseNum(s.textContent):null;if(v==null)return;
  var tile=c.el.closest('.hp-tile');if(!c.started&&!force&&tile&&!tile.classList.contains('in'))return;c.started=true;if(v!==c.shown)animateTo(c,v);});}
setInterval(function(){syncCounters(false);},3000);

/* état du bot */
(function(){
  var src=$('botstatus'),tile=$('hp-status'),txt=$('hp-status-txt');if(!src||!tile)return;
  function sync(){['on','off','upd','unk'].forEach(function(c){tile.classList.toggle(c,src.classList.contains(c));});var t=$('bstxt');if(t)txt.textContent=t.textContent.trim();}
  sync();new MutationObserver(sync).observe(src,{attributes:true,childList:true,subtree:true,characterData:true});
  function open(){src.click();}
  tile.addEventListener('click',open);tile.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
})();

/* Guardian : anneau de maîtrise + barres de progression, ré-appliqués quand la doc rafraîchit le panneau */
var RING=263.9;
function masteryVal(){var n=Q('#gpanel .gbig .n');return n?parseNum(n.textContent):null;}
function enhanceGuardian(){
  var p=$('gpanel');if(!p)return;obs.disconnect();
  var big=Q('.gbig',p);
  if(big&&!Q('svg',big)){big.insertAdjacentHTML('afterbegin','<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="9"/><circle class="gring" cx="50" cy="50" r="42" fill="none" stroke="url(#hp-grad)" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+RING+'" stroke-dashoffset="'+RING+'" style="transition:stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)"/></svg>');}
  p.querySelectorAll('.gstat').forEach(function(g){var v=Q('.v',g),m=v&&/(\d+(?:[.,]\d+)?)\s*%/.exec(v.textContent);if(m){g.classList.add('has-p');g.style.setProperty('--p',parseFloat(m[1].replace(',','.')));}});
  var mv=masteryVal(),ring=Q('.gring',p);
  if(ring&&mv!=null&&$('hp-guardian').classList.contains('in'))requestAnimationFrame(function(){ring.style.strokeDashoffset=RING*(1-mv/100);});
  obs.observe(p,{childList:true,subtree:true});
}
var obs=new MutationObserver(function(){enhanceGuardian();syncMastery();});
function syncMastery(){var mv=masteryVal(),r=$('hp-ring'),t=$('hp-mastery');if(mv==null||!r)return;var tile=r.closest('.hp-tile');if(tile&&!tile.classList.contains('in'))return;
  r.style.strokeDashoffset=RING*(1-mv/100);if(t.dataset.v!==String(mv)){var from=+(t.dataset.v||0),t1=performance.now();t.dataset.v=mv;(function st(now){var k=reduce?1:clamp((now-t1)/1600);t.textContent=Math.round(from+(mv-from)*outExpo(k))+'%';if(k<1)requestAnimationFrame(st);})(t1);}}
enhanceGuardian();

/* ── apparitions au défilement ── */
(function(){
  var targets=[].slice.call(document.querySelectorAll('.hp-reveal,.hp-tile,h2.cat,#hp-guardian'));
  function show(el){el.classList.add('in');if(el.classList.contains('hp-tile')){syncCounters(true);syncMastery();}if(el.id==='hp-guardian')enhanceGuardian();}
  if(reduce||!('IntersectionObserver' in window)){targets.forEach(show);syncCounters(true);return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){show(e.target);io.unobserve(e.target);}});},{rootMargin:'0px 0px -10% 0px'});
  targets.forEach(function(t){io.observe(t);});
  document.documentElement.classList.add('hp-armed');
  // filet : rien ne reste caché si l'observateur tarde
  setInterval(function(){targets.forEach(function(t){if(!t.classList.contains('in')){var r=t.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)show(t);}});},1200);
})();

/* ── fond continu (nuit → bleu Guardian → braise) ── */
var STOPS=[['hp-hero','#0B0B12'],['hp-docs','#0D0D16'],['hp-guardian','#10122E'],['hp-news','#0C0C14'],['hp-faq','#0B0B12'],['hp-invite','#0B0B12']];
STOPS.forEach(function(s){s[2]=[parseInt(s[1].slice(1,3),16),parseInt(s[1].slice(3,5),16),parseInt(s[1].slice(5,7),16)];});
var geo={tops:[]};
function measure(){geo.vh=innerHeight;var h=$('hp-hero');geo.hero=h?h.offsetHeight:innerHeight;
  geo.tops=STOPS.map(function(s){var el=$(s[0]);return el?el.getBoundingClientRect().top+scrollY:null;});
  var g=$('hp-guardian'),iv=$('hp-invite');geo.gTop=g?g.getBoundingClientRect().top+scrollY:1e9;geo.gBot=g?geo.gTop+g.offsetHeight:1e9;geo.end=iv?iv.getBoundingClientRect().top+scrollY:1e9;}
var lastCol='';
function paintBg(){var pos=scrollY+innerHeight*.55,c=STOPS[0][2].slice();
  for(var i=1;i<STOPS.length;i++){var tp=geo.tops[i];if(tp==null)continue;var t=ss(tp-innerHeight*.45,tp+innerHeight*.15,pos);if(t>0)for(var j=0;j<3;j++)c[j]+=(STOPS[i][2][j]-c[j])*t;}
  var col='rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';if(col!==lastCol){lastCol=col;document.body.style.backgroundColor=col;}}
/* barre du haut + section active */
var topEl=$('hp-top'),lastY=scrollY,spy=[].slice.call(document.querySelectorAll('[data-spy]'));
function topBar(){var y=scrollY;topEl.classList.toggle('solid',y>30);
  if(Math.abs(y-lastY)>6){topEl.classList.toggle('away',y>lastY&&y>innerHeight*.7&&!Q('.ov.open')&&!$('uppop'));lastY=y;}
  var cur=null;spy.forEach(function(a){var s=$(a.getAttribute('data-spy'));if(s&&s.getBoundingClientRect().top<innerHeight*.4)cur=a;});spy.forEach(function(a){a.classList.toggle('on',a===cur);});}
addEventListener('scroll',function(){paintBg();topBar();},{passive:true});
addEventListener('resize',function(){measure();paintBg();});
document.addEventListener('click',function(){setTimeout(function(){measure();paintBg();},150);});
document.addEventListener('input',function(){setTimeout(function(){measure();paintBg();},250);});
measure();paintBg();topBar();if(document.fonts)document.fonts.ready.then(measure);addEventListener('load',measure);setInterval(measure,2500);

/* ── défilement amorti (molette ; clavier, ancres et tactile restent natifs) ── */
(function(){
  if(reduce||!fine)return;var target=scrollY,cur=scrollY,run=false;
  function blocks(el){for(;el&&el!==document.body&&el.nodeType===1;el=el.parentElement){
      if(el.matches('.ov,.kov,.kbov,.fsheet,.uppop,textarea,select,.hp-toolbar .nav'))return true;
      var s=getComputedStyle(el);if(/(auto|scroll)/.test(s.overflowY)&&el.scrollHeight>el.clientHeight+1)return true;}return false;}
  function tick(){cur+=(target-cur)*.085;if(Math.abs(target-cur)<.4){cur=target;run=false;}window.scrollTo({top:cur,behavior:'instant'});if(run)requestAnimationFrame(tick);}
  addEventListener('wheel',function(e){
    if(e.ctrlKey||e.defaultPrevented||Math.abs(e.deltaX)>Math.abs(e.deltaY)||blocks(e.target)||Q('.ov.open'))return;
    e.preventDefault();var d=e.deltaY*(e.deltaMode===1?40:e.deltaMode===2?innerHeight:1);
    if(!run){target=cur=scrollY;}target=clamp(target+d,0,document.documentElement.scrollHeight-innerHeight);
    if(!run){run=true;requestAnimationFrame(tick);}
  },{passive:false});
  addEventListener('scroll',function(){if(!run){target=cur=scrollY;}},{passive:true});
  addEventListener('keydown',function(){run=false;});addEventListener('pointerdown',function(){run=false;});
})();

/* ── taper n'importe où écrit directement dans la recherche ── */
(function(){
  var s=$('search');if(!s)return;
  function editable(el){return el&&(/^(input|textarea|select)$/i.test(el.tagName)||el.isContentEditable);}
  function overlayOpen(){
    if(Q('.ov.open')||$('uppop'))return true;
    var o=document.querySelectorAll('.kov,.kbov,.fsheet');for(var i=0;i<o.length;i++){var cs=getComputedStyle(o[i]);if(cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0)return true;}
    return false;}
  document.addEventListener('keydown',function(e){
    if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=e.key;if(!k||k.length!==1||k==='/'||k==='?')return;          // « / » et « ? » gardent leur rôle d'origine
    var t=e.target;if(editable(t))return;
    if(k===' '&&t&&t.closest&&t.closest('a,button,[role="button"],.cmd,summary'))return;   // Espace active toujours l'élément ciblé
    if(overlayOpen())return;
    e.preventDefault();
    s.focus({preventScroll:true});
    var v=s.value+k;s.value=v;s.setSelectionRange(v.length,v.length);
    s.dispatchEvent(new Event('input',{bubbles:true}));
    var r=s.getBoundingClientRect();
    if(r.top<0||r.bottom>innerHeight){var d=$('hp-docs');if(d)window.scrollTo({top:d.getBoundingClientRect().top+scrollY-10,behavior:reduce?'auto':'smooth'});}
  });
})();

/* ── fiches : inclinaison + halo qui suit la souris ── */
(function(){
  if(reduce||!fine)return;var cur=null;
  document.addEventListener('pointermove',function(e){
    var c=e.target.closest&&e.target.closest('.cmd');
    if(cur&&cur!==c){cur.style.removeProperty('--rx');cur.style.removeProperty('--ry');cur=null;}
    if(!c)return;cur=c;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    c.style.setProperty('--rx',((.5-y)*6).toFixed(2)+'deg');c.style.setProperty('--ry',((x-.5)*8).toFixed(2)+'deg');
    c.style.setProperty('--mx',(x*100).toFixed(1)+'%');c.style.setProperty('--my',(y*100).toFixed(1)+'%');
  },{passive:true});
})();

/* ── badge suspendu (pendule) ── */
(function(){
  var lan=$('hp-lanyard'),badge=$('hp-badge'),strap=$('hp-strap');if(!lan||!badge)return;
  var h='';for(var y=0,i=0;y<200;y+=17,i++){h+=i%2?'<rect x="10" y="'+(y-2)+'" width="6" height="26" rx="3" fill="#8f939c" stroke="#2a2b2f" stroke-width="1"/>':'<rect x="5" y="'+y+'" width="16" height="22" rx="8" fill="none" stroke="#c9ccd2" stroke-width="3.2"/>';}
  strap.innerHTML=h;
  var ang=reduce?0:.3,vel=0,drag=false,lastX=null,lastSY=scrollY;
  function pivot(){var r=lan.parentElement.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top};}
  addEventListener('pointermove',function(e){
    if(drag){var p=pivot(),a=Math.atan2(-(e.clientX-p.x),Math.max(40,e.clientY-p.y));vel=(a-ang)*.5;ang=clamp(a,-1.1,1.1);}
    else if(lastX!==null){var q=pivot();if(Math.abs(e.clientX-q.x)<300&&e.clientY>q.y-60&&e.clientY<q.y+620)vel-=(e.clientX-lastX)*.001;}
    lastX=e.clientX;},{passive:true});
  badge.addEventListener('pointerdown',function(e){drag=true;badge.setPointerCapture(e.pointerId);});
  addEventListener('pointerup',function(){drag=false;});
  var lt=performance.now(),acc=0;
  (function step(now){acc+=Math.min(200,now-lt);lt=now;
    while(acc>=16.67){acc-=16.67;var dy=scrollY-lastSY;lastSY=scrollY;
      if(!drag){if(!reduce)vel+=clamp(dy*.00022,-.01,.01);vel+=-Math.sin(ang)*.012;vel*=.986;vel=clamp(vel,-.07,.07);ang=clamp(ang+vel,-1.1,1.1);}}
    lan.style.transform='rotate('+ang.toFixed(4)+'rad)';badge.style.setProperty('--sheen',(ang*160).toFixed(1)+'%');
    requestAnimationFrame(step);})(lt);
})();

/* ── WebGL : sphère de cubes + noyau d'acier + chaîne ── */
var THREE=window.THREE,canvas=$('hp-gl'),giant=$('hp-giant');
if(!THREE||!canvas)return;
var renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){canvas.remove();return;}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,14);
(function(){ // studio sombre : boîtes à lumière blanches, blurple et rouges pour les reflets de l'acier
  var c=document.createElement('canvas');c.width=1024;c.height=512;var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#3a3d52');gr.addColorStop(.48,'#14151f');gr.addColorStop(1,'#050508');g.fillStyle=gr;g.fillRect(0,0,1024,512);
  g.filter='blur(14px)';g.fillStyle='#ffffff';g.fillRect(110,70,230,70);g.fillRect(640,50,260,46);
  g.fillStyle='#5865F2';g.fillRect(420,170,170,60);g.fillRect(40,280,140,50);g.fillStyle='#E1262D';g.fillRect(830,250,150,60);g.filter='none';
  var t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
  var pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(t).texture;t.dispose();pm.dispose();
})();
var key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(5,7,8);scene.add(key);
scene.add(new THREE.HemisphereLight(0xc9ceff,0x101018,.35));
var blue=new THREE.PointLight(0x5865F2,1.6,40);blue.position.set(6,3,5);scene.add(blue);
var red=new THREE.PointLight(0xE1262D,.6,40);red.position.set(-7,-3,5);scene.add(red);

var group=new THREE.Group();scene.add(group);
var N=300,R=2.35;
function roundedBox(){var g=new THREE.BoxGeometry(1,1,1,4,4,4),p=g.attributes.position,v=new THREE.Vector3();
  for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);var c=v.clone().clampScalar(-.38,.38);v.sub(c);if(v.length()>0)v.setLength(.12);v.add(c);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
var cubes=new THREE.InstancedMesh(roundedBox(),new THREE.MeshStandardMaterial({roughness:.28,metalness:.35,envMapIntensity:1.1}),N);group.add(cubes);
var home=[],scat=[],qh=[],qs=[],size=[],tmpM=new THREE.Matrix4(),O=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
var cB=new THREE.Color('#5865F2'),cK=new THREE.Color('#16161F'),cR=new THREE.Color('#E1262D'),cW=new THREE.Color('#DADCEA');
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
for(var i=0;i<N;i++){
  var yy=1-(i+.5)/N*2,rr=Math.sqrt(1-yy*yy),th=i*2.399963,d=new THREE.Vector3(Math.cos(th)*rr,yy,Math.sin(th)*rr);
  home.push(d.clone().multiplyScalar(R));
  scat.push(d.clone().multiplyScalar(4+rnd()*8).add(new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).multiplyScalar(5)));
  tmpM.lookAt(home[i],O,UP);qh.push(new THREE.Quaternion().setFromRotationMatrix(tmpM));
  qs.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd()*6,rnd()*6,rnd()*6)));
  size.push(.36+rnd()*.1);var p=rnd();cubes.setColorAt(i,p<.4?cB:p<.78?cK:p<.88?cR:cW);
}
cubes.instanceColor.needsUpdate=true;
var core=new THREE.Group();group.add(core);
var steel=new THREE.MeshStandardMaterial({color:0x22232c,metalness:.95,roughness:.2});
core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.62,1),steel));
var coneG=new THREE.ConeGeometry(.15,1.5,16);coneG.translate(0,.75,0);
var redTip=new THREE.MeshStandardMaterial({color:0xE1262D,metalness:.5,roughness:.3,emissive:0x3a0507});
for(i=0;i<20;i++){var y2=1-(i+.5)/20*2,r2=Math.sqrt(1-y2*y2),t2=i*2.399963,d2=new THREE.Vector3(Math.cos(t2)*r2,y2,Math.sin(t2)*r2);
  var m=new THREE.Mesh(coneG,i%5===0?redTip:steel);m.quaternion.setFromUnitVectors(UP,d2);m.position.copy(d2).multiplyScalar(.38);core.add(m);}

var L=64,PITCH=1.0,linkG=new THREE.TorusGeometry(.42,.12,20,56);linkG.scale(1.55,1,1);
var chainMat=new THREE.MeshStandardMaterial({color:0xd9dbe2,metalness:1,roughness:.18,envMapIntensity:1.2});
var chain=new THREE.InstancedMesh(linkG,chainMat,L);scene.add(chain);
var S=240,cum=new Float32Array(S),pts=[];for(i=0;i<S;i++)pts.push(new THREE.Vector3());
var P={amp:.9,phase:0,tilt:.3,y:0,depth:1.2};
function curvePt(t,o){var x=-15+30*t;o.set(x,P.amp*Math.sin(t*5+P.phase)+P.tilt*x+P.y,P.depth*Math.cos(t*4+P.phase*.7)-1.4);}
var dummy=new THREE.Object3D(),X=new THREE.Vector3(1,0,0),tv=new THREE.Vector3(),qa=new THREE.Quaternion();
var qTw=[new THREE.Quaternion(),new THREE.Quaternion().setFromAxisAngle(X,Math.PI/2)];
function layoutChain(off){
  for(var i=0;i<S;i++){curvePt(i/(S-1),pts[i]);cum[i]=i?cum[i-1]+pts[i].distanceTo(pts[i-1]):0;}
  var total=cum[S-1],order=[];for(i=0;i<L;i++){var s=((i*PITCH+off)%(L*PITCH)+L*PITCH)%(L*PITCH);order.push([s,i]);}
  order.sort(function(a,b){return a[0]-b[0];});var j=0;
  order.forEach(function(o){var s=o[0],k=o[1];
    if(s>total){dummy.scale.setScalar(0);dummy.updateMatrix();chain.setMatrixAt(k,dummy.matrix);return;}
    while(j<S-2&&cum[j+1]<s)j++;var f=(s-cum[j])/Math.max(1e-6,cum[j+1]-cum[j]);
    dummy.position.lerpVectors(pts[j],pts[j+1],f);tv.subVectors(pts[j+1],pts[j]).normalize();
    qa.setFromUnitVectors(X,tv);dummy.quaternion.copy(qa).multiply(qTw[k%2]);dummy.scale.setScalar(1);dummy.updateMatrix();chain.setMatrixAt(k,dummy.matrix);});
  chain.instanceMatrix.needsUpdate=true;
}
var mouse={x:0,y:0,tx:0,ty:0};
addEventListener('pointermove',function(e){mouse.tx=e.clientX/innerWidth*2-1;mouse.ty=-(e.clientY/innerHeight*2-1);},{passive:true});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
var silver=new THREE.Color(0xd9dbe2),blueTint=new THREE.Color(0xaab2ff),redTint=new THREE.Color(0xffb0b0);
var pos=new THREE.Vector3(),q=new THREE.Quaternion(),last=performance.now(),time=0,rotY=0,sy=scrollY;
function frame(now){
  var dt=Math.min(.05,(now-last)/1000);last=now;if(!reduce)time+=dt;
  sy+=(scrollY-sy)*Math.min(1,dt*8);   // la scène suit le défilement avec un léger amorti
  var y=sy,vh=geo.vh||innerHeight,narrow=camera.aspect<.9;
  var intro=introStart===null?0:ease(clamp((now-introStart)/1800));
  var heroOut=clamp(y/((geo.hero||vh)*.85)),k=Math.max(1-intro,ease(heroOut)),thin=ss(.55,1,heroOut);
  var chainIn=ss(.25,.9,heroOut),end=ss(geo.end-vh*.9,geo.end-vh*.15,y);
  var gMix=ss(geo.gTop-vh*.8,geo.gTop-vh*.2,y)*(1-ss(geo.gBot-vh*.6,geo.gBot,y));
  if(giant&&heroOut<1.05)giant.style.transform='translate3d(0,'+(y*.3).toFixed(1)+'px,0)';
  mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;
  camera.position.x=mouse.x*.6;camera.position.y=mouse.y*.4;camera.lookAt(0,0,0);
  var hx=narrow?0:2.9,hy=narrow?1.7:.1;
  group.position.set(hx*(1-k*.6),hy+k*.4+end*6,-k*6);group.scale.setScalar(narrow?.6:1);
  rotY+=dt*(.22+k*.1);group.rotation.y=rotY+mouse.x*.5;group.rotation.x=-mouse.y*.3+.15;
  for(var i=0;i<N;i++){
    var kk=clamp(k*1.1-(i%7)*.015);pos.lerpVectors(home[i],scat[i],kk);if(kk>0)pos.y+=Math.sin(time*.6+i)*.25*kk;
    q.copy(qh[i]).slerp(qs[i],kk);dummy.position.copy(pos);dummy.quaternion.copy(q);if(kk>0)dummy.rotateX(time*.3*kk*((i%3)-1));
    dummy.scale.setScalar(size[i]*(1-.25*kk)*(1-end)*(i%3===0?1:1-thin));dummy.updateMatrix();cubes.setMatrixAt(i,dummy.matrix);
  }
  cubes.instanceMatrix.needsUpdate=true;
  core.rotation.y=-time*.5;core.rotation.z=time*.2;core.scale.setScalar(Math.max(.0001,(1-thin)*(1-end)));
  P.phase=time*.45;P.amp=.9-gMix*.3;P.tilt=.32*(1-ss(.6,1.4,y/vh))+.06;P.y=(1-ease(chainIn))*10-end*12+(narrow?.8:0);P.depth=1.2+gMix*.6;
  chain.visible=chainIn>0&&end<1;if(chain.visible)layoutChain(y*.006+time*.35);
  chainMat.color.copy(silver).lerp(blueTint,gMix*.6);
  blue.intensity=1.6+gMix*1.6;
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
