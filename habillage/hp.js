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



/* ── WebGL : sphère de cubes + noyau d'acier + chaîne ── */
var THREE=window.THREE,canvas=$('hp-gl'),giant=$('hp-giant');
if(!THREE||!canvas)return;
var renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){canvas.remove();return;}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;   // contrastes « caméra » sur le métal
var ANISO=renderer.capabilities.getMaxAnisotropy();
var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,14);
(function(){ // studio : grandes boîtes à lumière douces, bande blurple, touche rouge, contre-jour chaud au sol
  var c=document.createElement('canvas');c.width=2048;c.height=1024;var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,1024);gr.addColorStop(0,'#2c2f40');gr.addColorStop(.46,'#121320');gr.addColorStop(.54,'#0a0a12');gr.addColorStop(1,'#020203');g.fillStyle=gr;g.fillRect(0,0,2048,1024);
  g.filter='blur(22px)';
  g.fillStyle='#ffffff';g.fillRect(200,120,520,170);g.fillStyle='#e8ecff';g.fillRect(1300,90,560,90);
  g.fillStyle='#cfd5ff';g.fillRect(1650,330,90,330);
  g.fillStyle='#5865F2';g.fillRect(860,330,380,120);g.fillRect(60,560,280,90);
  g.fillStyle='#E1262D';g.fillRect(1700,700,220,80);g.fillStyle='#ffcf9e';g.fillRect(420,780,520,40);
  g.filter='none';
  var t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
  var pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(t).texture;t.dispose();pm.dispose();
})();
var key=new THREE.DirectionalLight(0xffffff,1.35);key.position.set(5,7,8);scene.add(key);
var rim=new THREE.DirectionalLight(0x9aa6ff,.9);rim.position.set(-6,4,-6);scene.add(rim);   // contre-jour : détache le contour
scene.add(new THREE.HemisphereLight(0xb8c0ff,0x05050a,.12));
var blue=new THREE.PointLight(0x5865F2,.8,40);blue.position.set(6,3,5);scene.add(blue);
var red=new THREE.PointLight(0xE1262D,.4,40);red.position.set(-7,-3,5);scene.add(red);

/* ── textures procédurales : relief (→ normal map), brillance, couleur ── */
function canvas2(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function prng(s){return function(){s=(s*16807)%2147483647;return s/2147483647;};}
function addNoise(c,amp,r){var g=c.getContext('2d'),im=g.getImageData(0,0,c.width,c.height),d=im.data;for(var i=0;i<d.length;i+=4){var n=(r()-.5)*2*amp;d[i]=clamp(d[i]+n,0,255);d[i+1]=clamp(d[i+1]+n,0,255);d[i+2]=clamp(d[i+2]+n,0,255);}g.putImageData(im,0,0);}
function normalFrom(hc,str){var w=hc.width,h=hc.height,s=hc.getContext('2d').getImageData(0,0,w,h).data,o=canvas2(w,h),og=o.getContext('2d'),im=og.createImageData(w,h),d=im.data;
  function H(x,y){x=(x+w)%w;y=(y+h)%h;return s[(y*w+x)*4]/255;}
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var dx=(H(x+1,y)-H(x-1,y))*str,dy=(H(x,y+1)-H(x,y-1))*str,l=Math.sqrt(dx*dx+dy*dy+1),i=(y*w+x)*4;
    d[i]=(-dx/l*.5+.5)*255;d[i+1]=(-dy/l*.5+.5)*255;d[i+2]=(1/l*.5+.5)*255;d[i+3]=255;}
  og.putImageData(im,0,0);return o;}
function tex(c,srgb,rx,ry){var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=ANISO;if(srgb)t.encoding=THREE.sRGBEncoding;if(rx)t.repeat.set(rx,ry||rx);return t;}
function blobs(g,r,n,rmin,rmax,size,val,alpha){for(var i=0;i<n;i++){var x=r()*size,y=r()*size,rad=rmin+r()*(rmax-rmin),gr=g.createRadialGradient(x,y,0,x,y,rad),v=typeof val==='function'?val():val;
  gr.addColorStop(0,'rgba('+v+','+v+','+v+','+alpha+')');gr.addColorStop(1,'rgba('+v+','+v+','+v+',0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}}
function scratches(g,r,n,size,val,alpha,lmin,lmax){g.lineCap='round';for(var i=0;i<n;i++){var x=r()*size,y=r()*size,a=r()*6.283,l=lmin+r()*(lmax-lmin);
  g.strokeStyle='rgba('+val+','+val+','+val+','+(alpha*(.4+r()*.6))+')';g.lineWidth=.5+r()*1.1;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a+.15)*l*.5,y+Math.sin(a+.15)*l*.5,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}}
var PL=(function(){ // plaques : métal martelé, rayures, traces, bords assombris
  var S=512,r=prng(31),h=canvas2(S,S),hg=h.getContext('2d');hg.fillStyle='#808080';hg.fillRect(0,0,S,S);
  blobs(hg,r,320,8,38,S,function(){return r()<.5?95:165;},.35);addNoise(h,7,r);scratches(hg,r,140,S,70,.7,14,150);
  var ro=canvas2(S,S),rg=ro.getContext('2d');rg.fillStyle='#6e6e6e';rg.fillRect(0,0,S,S);
  blobs(rg,r,60,30,110,S,function(){return r()<.5?40:150;},.45);addNoise(ro,12,r);scratches(rg,r,140,S,215,.8,14,150);
  var co=canvas2(S,S),cg=co.getContext('2d');cg.fillStyle='#f0f0f0';cg.fillRect(0,0,S,S);blobs(cg,r,40,30,120,S,190,.35);
  var e=cg.createRadialGradient(S/2,S/2,S*.28,S/2,S/2,S*.5);e.addColorStop(0,'rgba(0,0,0,0)');e.addColorStop(1,'rgba(0,0,0,.45)');cg.fillStyle=e;cg.fillRect(0,0,S,S);addNoise(co,6,r);
  return {col:tex(co,true),rough:tex(ro,false),norm:tex(normalFrom(h,3.2),false)};
})();
var CH=(function(){ // chaîne : acier brossé dans le sens du fil, micro-piqûres, patine
  var W=1024,Hh=128,r=prng(57),h=canvas2(W,Hh),hg=h.getContext('2d');hg.fillStyle='#808080';hg.fillRect(0,0,W,Hh);
  for(var i=0;i<2600;i++){var v=r()<.5?100:160;hg.fillStyle='rgba('+v+','+v+','+v+','+(.15+r()*.3)+')';hg.fillRect(r()*W,r()*Hh,20+r()*220,.5+r()*.9);}
  for(i=0;i<420;i++){var x=r()*W,y=r()*Hh,rad=.6+r()*1.8;hg.fillStyle='rgba(40,40,40,.8)';hg.beginPath();hg.arc(x,y,rad,0,6.283);hg.fill();}
  addNoise(h,5,r);
  var ro=canvas2(W,Hh),rg=ro.getContext('2d');rg.fillStyle='#5c5c5c';rg.fillRect(0,0,W,Hh);
  for(i=0;i<1800;i++){var q=r()<.5?40:120;rg.fillStyle='rgba('+q+','+q+','+q+','+(.2+r()*.3)+')';rg.fillRect(r()*W,r()*Hh,30+r()*260,.6+r()*1.2);}
  blobs(rg,r,30,10,40,W,150,.4);addNoise(ro,8,r);
  var co=canvas2(W,Hh),cg=co.getContext('2d');cg.fillStyle='#f2f2f2';cg.fillRect(0,0,W,Hh);blobs(cg,r,36,8,34,W,170,.4);addNoise(co,5,r);
  return {col:tex(co,true,3,1),rough:tex(ro,false,3,1),norm:tex(normalFrom(h,2.4),false,3,1)};
})();

/* bouclier : plaques hexagonales biseautées en métal anodisé, quelques plaques lumineuses, cœur d'énergie */
var group=new THREE.Group();scene.add(group);
var N=420,R=2.35;
var hexG=(function(){var s=new THREE.Shape(),rad=.185;for(var k=0;k<6;k++){var a=k*Math.PI/3+Math.PI/6,x=Math.cos(a)*rad,y=Math.sin(a)*rad;if(k)s.lineTo(x,y);else s.moveTo(x,y);}s.closePath();
  var g=new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelThickness:.022,bevelSize:.022,bevelSegments:3,curveSegments:1});g.center();
  var uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2.3+.5,uv.getY(i)*2.3+.5);  // une plaque ≈ toute la texture, centrée
  g.computeVertexNormals();return g;})();
var NS=new THREE.Vector2(.9,.9);
var matPlate=new THREE.MeshPhysicalMaterial({map:PL.col,roughnessMap:PL.rough,normalMap:PL.norm,normalScale:NS,metalness:.92,roughness:1,clearcoat:.35,clearcoatRoughness:.32,envMapIntensity:1.05});
var matBlue=new THREE.MeshPhysicalMaterial({color:0x0c1260,emissive:0x2a3cff,emissiveMap:PL.col,emissiveIntensity:.5,roughnessMap:PL.rough,normalMap:PL.norm,normalScale:NS,metalness:.35,roughness:1,clearcoat:.6,clearcoatRoughness:.2,envMapIntensity:.6});
var matRed=new THREE.MeshPhysicalMaterial({color:0x6e0f13,emissive:0xE1262D,emissiveMap:PL.col,emissiveIntensity:.45,roughnessMap:PL.rough,normalMap:PL.norm,normalScale:NS,metalness:.35,roughness:1,clearcoat:.6,clearcoatRoughness:.2,envMapIntensity:.6});
var home=[],scat=[],qh=[],qs=[],type=[],loc=[],tmpM=new THREE.Matrix4(),O=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
var counts=[0,0,0];
for(var i=0;i<N;i++){var p=rnd(),t=p<.12?1:p<.155?2:0;type.push(t);loc.push(counts[t]++);}
var meshes=[new THREE.InstancedMesh(hexG,matPlate,counts[0]),new THREE.InstancedMesh(hexG,matBlue,counts[1]),new THREE.InstancedMesh(hexG,matRed,counts[2])];
meshes.forEach(function(m){group.add(m);});
var cDark=new THREE.Color('#262836'),cDark2=new THREE.Color('#3a3d50'),tmpC=new THREE.Color();
for(i=0;i<N;i++){
  var yy=1-(i+.5)/N*2,rr=Math.sqrt(1-yy*yy),th=i*2.399963,d=new THREE.Vector3(Math.cos(th)*rr,yy,Math.sin(th)*rr);
  home.push(d.clone().multiplyScalar(R));
  scat.push(d.clone().multiplyScalar(4+rnd()*8).add(new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).multiplyScalar(5)));
  tmpM.lookAt(home[i],O,UP);var qq=new THREE.Quaternion().setFromRotationMatrix(tmpM);
  qq.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),th));qh.push(qq);
  qs.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd()*6,rnd()*6,rnd()*6)));
  if(type[i]===0)meshes[0].setColorAt(loc[i],tmpC.copy(cDark).lerp(cDark2,rnd()));
}
meshes[0].instanceColor.needsUpdate=true;
var core=new THREE.Mesh(new THREE.SphereGeometry(2.05,48,32),new THREE.MeshStandardMaterial({color:0x05060f,emissive:0x2f3bd6,emissiveIntensity:.55,roughness:.7}));
group.add(core);

/* chaîne : vrais maillons ovales (fil d'épaisseur constante) en acier brossé */
var LINK_A=.5,LINK_RC=.3,LINK_W=.1;                       // partie droite, rayon des arrondis, rayon du fil
var linkG=(function(){
  var per=2*LINK_A+2*Math.PI*LINK_RC;
  class Stadium extends THREE.Curve{
    getPoint(t,o){o=o||new THREE.Vector3();var s=t*per,h=LINK_A/2;
      if(s<LINK_A)return o.set(-h+s,LINK_RC,0);s-=LINK_A;
      if(s<Math.PI*LINK_RC){var a=s/LINK_RC;return o.set(h+Math.sin(a)*LINK_RC,Math.cos(a)*LINK_RC,0);}s-=Math.PI*LINK_RC;
      if(s<LINK_A)return o.set(h-s,-LINK_RC,0);s-=LINK_A;
      var b=s/LINK_RC;return o.set(-h-Math.sin(b)*LINK_RC,-Math.cos(b)*LINK_RC,0);}
  }
  return new THREE.TubeGeometry(new Stadium(),220,LINK_W,28,true);
})();
var L=64,PITCH=LINK_A+2*(LINK_RC-LINK_W)+.02;
var chainMat=new THREE.MeshStandardMaterial({color:0xc4c8d6,map:CH.col,metalness:1,roughness:1,roughnessMap:CH.rough,normalMap:CH.norm,normalScale:new THREE.Vector2(.7,.7),envMapIntensity:1.2});
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
var silver=new THREE.Color(0xc4c8d6),blueTint=new THREE.Color(0x8f9bff),redTint=new THREE.Color(0xffb0b0);
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
    dummy.scale.setScalar(Math.max(.0001,(1+.2*kk)*(1-end)*(i%3===0?1:1-thin)));dummy.updateMatrix();meshes[type[i]].setMatrixAt(loc[i],dummy.matrix);
  }
  meshes.forEach(function(m){m.instanceMatrix.needsUpdate=true;});
  var pulse=.5+.5*Math.sin(time*1.6);matBlue.emissiveIntensity=.24+.16*pulse;matRed.emissiveIntensity=.34+.2*(1-pulse);
  core.scale.setScalar(Math.max(.0001,(1-ss(0,.5,k))*(1-end)));core.material.emissiveIntensity=.18+.08*pulse;
  P.phase=time*.45;P.amp=.9-gMix*.3;P.tilt=.32*(1-ss(.6,1.4,y/vh))+.06;P.y=(1-ease(chainIn))*10-end*12+(narrow?.8:0);P.depth=1.2+gMix*.6;
  chain.visible=chainIn>0&&end<1;if(chain.visible)layoutChain(y*.006+time*.35);
  chainMat.color.copy(silver).lerp(blueTint,gMix*.6);
  blue.intensity=1.6+gMix*1.6;
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
