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
  // Le clic d'origine ne doit pas remonter jusqu'à la page : la doc y referme le panneau dès qu'un clic
  // tombe hors du panneau et hors de son badge — la tuile ouvrait donc le panneau puis le refermait aussitôt.
  var anchor=src;   // élément qui a ouvert le panneau : la tuile ou le statut de la barre du haut
  // La doc donne le focus au panneau tant qu'il est encore dans l'en-tête masqué : le navigateur
  // sauterait jusqu'à la documentation. On retient la position et on la rétablit.
  var keepY=null;
  function open(e){if(e){e.stopPropagation();e.preventDefault();}anchor=tile;keepY=scrollY;src.click();
    if(keepY!==null){window.scrollTo({top:keepY,behavior:'instant'});keepY=null;}}
  tile.addEventListener('click',open);tile.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){open(e);}});
  src.addEventListener('click',function(e){if(e.isTrusted){anchor=src;var y=scrollY;setTimeout(function(){if(Math.abs(scrollY-y)>2)window.scrollTo({top:y,behavior:'instant'});},0);}},true);
  // Le panneau s'ouvre juste sous l'élément cliqué (et défile avec la page), centré sur lui sans sortir de l'écran.
  function place(){var p=$('uppop');if(!p)return;var r=anchor.getBoundingClientRect(),w=p.offsetWidth||330,
      left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2));
    var fixedBar=anchor===src;   // la barre du haut est fixe : le panneau la suit ; la tuile défile avec la page
    p.style.setProperty('position',fixedBar?'fixed':'absolute','important');
    p.style.setProperty('top',(r.bottom+(fixedBar?0:scrollY)+10)+'px','important');p.style.setProperty('left',(left+(fixedBar?0:scrollX))+'px','important');}
  // La doc accroche le panneau à son <header>, masqué ici : on le sort dans <body> pour qu'il soit visible.
  var head=Q('header');
  if(head)new MutationObserver(function(){var p=$('uppop');if(p&&p.parentNode===head){document.body.appendChild(p);place();try{p.focus({preventScroll:true});}catch(e){}}}).observe(head,{childList:true});
  addEventListener('resize',place);
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

/* ── fond continu : une teinte par chapitre + intensité des nappes de lumière (blurple, violet, bleu, rouge) ── */
var STOPS=[
  ['hp-hero','#0A0A14',[1,.8,.6,.8]],
  ['hp-stats','#0C0B1A',[.7,1,.5,.4]],
  ['hp-start','#0A0D1A',[.5,.6,1,.3]],
  ['hp-docs','#0B0C15',[.35,.35,.45,.15]],
  ['hp-guardian','#10123A',[1,1,.7,.2]],
  ['hp-news','#0E0B1E',[.5,1,.4,.3]],
  ['hp-faq','#0A0D18',[.4,.5,.9,.2]],
  ['hp-invite','#0E0F2E',[1,.9,.6,.9]]];
STOPS.forEach(function(s){s[3]=[parseInt(s[1].slice(1,3),16),parseInt(s[1].slice(3,5),16),parseInt(s[1].slice(5,7),16)].concat(s[2]);});
var bgBlobs=[].slice.call(document.querySelectorAll('#hp-bg i')),bgGrid=Q('#hp-bg .grid');
var geo={tops:[]};
function measure(){geo.vh=innerHeight;var h=$('hp-hero');geo.hero=h?h.offsetHeight:innerHeight;
  geo.tops=STOPS.map(function(s){var el=$(s[0]);return el?el.getBoundingClientRect().top+scrollY:null;});
  var g=$('hp-guardian'),iv=$('hp-invite');geo.gTop=g?g.getBoundingClientRect().top+scrollY:1e9;geo.gBot=g?geo.gTop+g.offsetHeight:1e9;geo.end=iv?iv.getBoundingClientRect().top+scrollY:1e9;}
var lastCol='';
function paintBg(){var pos=scrollY+innerHeight*.55,c=STOPS[0][3].slice();
  for(var i=1;i<STOPS.length;i++){var tp=geo.tops[i];if(tp==null)continue;var t=ss(tp-innerHeight*.45,tp+innerHeight*.15,pos);if(t>0)for(var j=0;j<c.length;j++)c[j]+=(STOPS[i][3][j]-c[j])*t;}
  var col='rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';if(col!==lastCol){lastCol=col;document.body.style.backgroundColor=col;}
  // nappes : intensité du chapitre + légère parallaxe (propriété « translate », qui se compose avec la dérive animée)
  var y=scrollY;bgBlobs.forEach(function(b,k){b.style.setProperty('--o',c[3+k].toFixed(3));b.style.translate=(Math.cos(y/1700+k*1.7)*40).toFixed(1)+'px '+(Math.sin(y/1300+k*2.1)*70).toFixed(1)+'px';});
  if(bgGrid)bgGrid.style.transform='translate3d(0,'+(-(y*.12)%28).toFixed(1)+'px,0)';
  if(bgGrid)bgGrid.style.opacity=(1-ss(innerHeight*.6,innerHeight*1.8,y)*.65).toFixed(3);}
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
// Pas d'accélération graphique (rendu logiciel : SwiftShader, llvmpipe…) : la scène gèlerait la page entière.
// On s'abstient, la page reste complète et fluide sans la 3D.
(function(){try{var gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'';
  if(/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)){renderer.dispose();canvas.remove();renderer=null;}}catch(e){}})();
if(!renderer)return;
var DPR_MAX=Math.min(devicePixelRatio||1,2),dpr=DPR_MAX;
renderer.setPixelRatio(dpr);renderer.outputEncoding=THREE.sRGBEncoding;
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
/* noms des serveurs protégés imprimés sur la face avant des dalles : un atlas de noms + (index, intensité) par dalle */
var labelUni={uAtlas:{value:new THREE.CanvasTexture(canvas2(4,4))},uGrid:{value:new THREE.Vector2(1,1)}};
/* matériau des dalles : nom du serveur, liseré lumineux sur le chanfrein, opacité par dalle et bords de sphère estompés */
function withLabels(mat,textCol,glow,edgeCol,edge){
  mat.transparent=true;mat.depthWrite=true;
  mat.onBeforeCompile=function(sh){
    sh.uniforms.uAtlas=labelUni.uAtlas;sh.uniforms.uGrid=labelUni.uGrid;sh.uniforms.uTextCol={value:new THREE.Color(textCol)};sh.uniforms.uGlow={value:glow};
    sh.uniforms.uEdgeCol={value:new THREE.Color(edgeCol)};sh.uniforms.uEdge={value:edge};
    sh.vertexShader='attribute vec2 aLabel;\nattribute vec2 aExtra;\nvarying vec2 vLabel;\nvarying float vFront;\nvarying vec2 vLuv;\nvarying float vAlpha;\n'+sh.vertexShader
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n vFront=objectNormal.z;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\n vLuv=uv; vLabel=aLabel; vAlpha=aExtra.x;');
    sh.fragmentShader='uniform sampler2D uAtlas;\nuniform vec2 uGrid;\nuniform vec3 uTextCol;\nuniform float uGlow;\nuniform vec3 uEdgeCol;\nuniform float uEdge;\nvarying vec2 vLabel;\nvarying float vFront;\nvarying vec2 vLuv;\nvarying float vAlpha;\n'+sh.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\n float hpL=0.0;\n if(vLabel.x>=0.0&&vFront>0.7){ vec2 l=clamp(vLuv,0.0,1.0); float cl=mod(vLabel.x,uGrid.x); float rw=floor(vLabel.x/uGrid.x);'+
        ' vec2 a=vec2((cl+l.x)/uGrid.x,1.0-(rw+1.0-l.y)/uGrid.y); hpL=texture2D(uAtlas,a).r*(0.45+0.55*vLabel.y); }\n diffuseColor.rgb=mix(diffuseColor.rgb,uTextCol,hpL);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=uTextCol*hpL*uGlow*(0.35+0.65*vLabel.y);'+
        '\n float hpE=smoothstep(0.31,0.40,length(vLuv-0.5))*step(0.7,vFront); totalEmissiveRadiance+=uEdgeCol*uEdge*hpE;')
      ;
    var fade='float hpF=clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.0,1.0);\n diffuseColor.a*=vAlpha*mix(0.12,1.0,smoothstep(0.04,0.5,hpF));\n';
    var outA='gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
    if(sh.fragmentShader.indexOf('#include <output_fragment>')>=0)sh.fragmentShader=sh.fragmentShader.replace('#include <output_fragment>',fade+'#include <output_fragment>');
    else if(sh.fragmentShader.indexOf(outA)>=0)sh.fragmentShader=sh.fragmentShader.replace(outA,fade+outA);
  };
  mat.customProgramCacheKey=function(){return 'hp-label2';};
}
withLabels(matPlate,'#e6e9ff',.55,'#5865F2',.35);withLabels(matBlue,'#ffffff',.9,'#9aa6ff',1.1);withLabels(matRed,'#ffffff',.9,'#ff8a8a',1);
var meshes=[0,1,2].map(function(t){var g=hexG.clone(),n=Math.max(1,counts[t]);
  g.setAttribute('aLabel',new THREE.InstancedBufferAttribute(new Float32Array(n*2).fill(-1),2));
  g.setAttribute('aExtra',new THREE.InstancedBufferAttribute(new Float32Array(n*2).fill(1),2));
  var m=new THREE.InstancedMesh(g,[matPlate,matBlue,matRed][t],counts[t]);if(t===0)m.setColorAt(0,new THREE.Color());return m;});
meshes.forEach(function(m){group.add(m);});
// données par dalle (index global) — recopiées chaque image dans l'ordre arrière → avant
var LAB=new Float32Array(N*2).fill(-1),ALPHA=new Float32Array(N),COL=new Float32Array(N*3),MAT=new Float32Array(N*16),DIST=new Float32Array(N);
var byType=[[],[],[]];
var cDark=new THREE.Color('#262836'),cDark2=new THREE.Color('#3a3d50'),cGlass=new THREE.Color('#8790d6'),tmpC=new THREE.Color();
for(i=0;i<N;i++){
  var yy=1-(i+.5)/N*2,rr=Math.sqrt(1-yy*yy),th=i*2.399963,d=new THREE.Vector3(Math.cos(th)*rr,yy,Math.sin(th)*rr);
  home.push(d.clone().multiplyScalar(R+rnd()*.07));                       // hauteurs variées : relief d'armure
  scat.push(d.clone().multiplyScalar(4+rnd()*8).add(new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).multiplyScalar(5)));
  tmpM.lookAt(home[i],O,UP);qh.push(new THREE.Quaternion().setFromRotationMatrix(tmpM));   // dalles à l'endroit : les noms restent lisibles
  qs.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd()*6,rnd()*6,rnd()*6)));
  byType[type[i]].push(i);
  if(type[i]===0){var glass=rnd()<.22;tmpC.copy(glass?cGlass:cDark);if(!glass)tmpC.lerp(cDark2,rnd());ALPHA[i]=glass?.28+rnd()*.17:.82+rnd()*.18;}
  else{tmpC.setRGB(1,1,1);ALPHA[i]=.92;}
  COL[i*3]=tmpC.r;COL[i*3+1]=tmpC.g;COL[i*3+2]=tmpC.b;
}
var wp=new THREE.Vector3();
function writeSorted(){   // tri arrière → avant : on voit l'autre face de la sphère à travers le verre et les interstices
  meshes.forEach(function(m,t){var ids=byType[t];if(!ids.length)return;
    ids.sort(function(a,b){return DIST[b]-DIST[a];});
    var lab=m.geometry.attributes.aLabel,ex=m.geometry.attributes.aExtra,arr=m.instanceMatrix.array,ic=m.instanceColor;
    for(var k=0;k<ids.length;k++){var g=ids[k];for(var e=0;e<16;e++)arr[k*16+e]=MAT[g*16+e];
      lab.array[k*2]=LAB[g*2];lab.array[k*2+1]=LAB[g*2+1];ex.array[k*2]=ALPHA[g];
      if(ic){ic.array[k*3]=COL[g*3];ic.array[k*3+1]=COL[g*3+1];ic.array[k*3+2]=COL[g*3+2];}}
    m.instanceMatrix.needsUpdate=true;lab.needsUpdate=true;ex.needsUpdate=true;if(ic)ic.needsUpdate=true;});
}

/* répartition : plus un serveur a de membres, plus il occupe de dalles et plus son nom brille */
function drawName(g,s,cx,cy,cell,word){
  var name=String(s.n||'').trim(),max=cell-36,lines=[name],fs=64;
  for(;fs>=24;fs-=4){g.font='700 '+fs+'px Sora, Inter, sans-serif';
    if(g.measureText(name).width<=max){lines=[name];break;}
    var w=name.split(/\s+/),a='',b='',k;for(k=0;k<w.length;k++){var t=a?a+' '+w[k]:w[k];if(g.measureText(t).width<=max)a=t;else break;}
    b=w.slice(k).join(' ');if(a&&g.measureText(b).width<=max){lines=[a,b];break;}}
  if(fs<24){g.font='700 24px Sora, Inter, sans-serif';lines=[name];while(lines[0].length>3&&g.measureText(lines[0]+'…').width>max)lines[0]=lines[0].slice(0,-1);lines[0]+='…';fs=24;}
  var lh=fs*1.08,top=cy-(lines.length*lh)/2-14;
  g.fillStyle='#fff';lines.forEach(function(l,i){g.fillText(l,cx,top+lh*(i+.5));});
  g.font='500 22px "JetBrains Mono", monospace';g.fillStyle='rgba(255,255,255,.7)';
  g.fillText(fmt(s.m||0)+' '+word,cx,top+lh*lines.length+22);
}
var lastGuilds='';
function applyGuilds(list){
  list=(list||[]).filter(function(g){return g&&g.n;}).slice(0,64);if(!list.length)return;
  var key=JSON.stringify(list)+lang();if(key===lastGuilds)return;lastGuilds=key;
  var n=list.length,grid=Math.ceil(Math.sqrt(n)),CELL=256,c=canvas2(grid*CELL,grid*CELL),g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.textAlign='center';g.textBaseline='middle';
  var word=lang()==='en'?'members':'membres';
  list.forEach(function(s,i){drawName(g,s,(i%grid)*CELL+CELL/2,Math.floor(i/grid)*CELL+CELL/2,CELL,word);});
  var t=new THREE.CanvasTexture(c);t.anisotropy=ANISO;t.minFilter=THREE.LinearMipmapLinearFilter;
  var old=labelUni.uAtlas.value;labelUni.uAtlas.value=t;labelUni.uGrid.value.set(grid,grid);if(old)old.dispose();
  var tot=0,i;for(i=0;i<n;i++)tot+=Math.max(1,list[i].m||0);
  var exact=list.map(function(s){return N*Math.max(1,s.m||0)/tot;}),cnt=exact.map(function(x){return Math.max(1,Math.floor(x));});
  var sum=cnt.reduce(function(a,b){return a+b;},0),rest=exact.map(function(x,j){return [x-Math.floor(x),j];}).sort(function(a,b){return b[0]-a[0];});
  for(i=0;sum<N;i++){cnt[rest[i%n][1]]++;sum++;}
  while(sum>N){var big=cnt.indexOf(Math.max.apply(null,cnt));cnt[big]--;sum--;}
  var pool=[];cnt.forEach(function(k,j){for(var q=0;q<k;q++)pool.push(j);});
  var r=prng(99);for(i=pool.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;}
  var mMax=Math.max.apply(null,list.map(function(s){return s.m||1;}));
  for(i=0;i<N;i++){var gi=pool[i];LAB[i*2]=gi;LAB[i*2+1]=Math.sqrt((list[gi].m||1)/mMax);}
}
function loadGuilds(){
  var u=location.protocol==='http:'?'/heartbeat.json':'https://rapid-sound-6a32.teamfunnysgames.workers.dev/heartbeat.json';
  fetch(u,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(d&&Array.isArray(d.guilds))(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){applyGuilds(d.guilds);});
  }).catch(function(){});
}
loadGuilds();setInterval(loadGuilds,5*60*1000);
var langBtn=$('lang');if(langBtn)langBtn.addEventListener('click',function(){setTimeout(function(){lastGuilds='';loadGuilds();},300);});

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
// Qualité adaptative : si les images arrivent trop lentement, on baisse la résolution du rendu par paliers.
var perf={sum:0,n:0};
function adapt(raw){
  if(document.hidden||raw>250)return;perf.sum+=raw;perf.n++;
  if(perf.n<90)return;var avg=perf.sum/perf.n;perf.sum=0;perf.n=0;
  if(avg>28&&dpr>1){dpr=Math.max(1,dpr-.5);renderer.setPixelRatio(dpr);resize();}
  else if(avg>45&&dpr<=1&&dpr>.6){dpr=.6;renderer.setPixelRatio(dpr);resize();}
}
function frame(now){
  var raw=now-last;adapt(raw);
  var dt=Math.min(.05,raw/1000);last=now;if(!reduce)time+=dt;
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
  group.updateMatrixWorld();
  for(var i=0;i<N;i++){
    var kk=clamp(k*1.1-(i%7)*.015);pos.lerpVectors(home[i],scat[i],kk);if(kk>0)pos.y+=Math.sin(time*.6+i)*.25*kk;
    q.copy(qh[i]).slerp(qs[i],kk);dummy.position.copy(pos);dummy.quaternion.copy(q);if(kk>0)dummy.rotateX(time*.3*kk*((i%3)-1));
    dummy.scale.setScalar(Math.max(.0001,(1+.2*kk)*(1-end)*(i%3===0?1:1-thin)));dummy.updateMatrix();dummy.matrix.toArray(MAT,i*16);
    DIST[i]=wp.copy(pos).applyMatrix4(group.matrixWorld).distanceToSquared(camera.position);
  }
  writeSorted();
  var pulse=.5+.5*Math.sin(time*1.6);matBlue.emissiveIntensity=.24+.16*pulse;matRed.emissiveIntensity=.34+.2*(1-pulse);
  P.phase=time*.45;P.amp=.9-gMix*.3;P.tilt=.32*(1-ss(.6,1.4,y/vh))+.06;P.y=(1-ease(chainIn))*10-end*12+(narrow?.8:0);P.depth=1.2+gMix*.6;
  chain.visible=chainIn>0&&end<1;if(chain.visible)layoutChain(y*.006+time*.35);
  chainMat.color.copy(silver).lerp(blueTint,gMix*.6);
  blue.intensity=1.6+gMix*1.6;
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
