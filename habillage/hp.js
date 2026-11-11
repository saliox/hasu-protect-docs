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

document.documentElement.classList.add('hp-js');   // les états « avant animation » ne s'appliquent que si ce script tourne

/* ── thème : toujours sombre (celui de Hasu) ── */
document.documentElement.removeAttribute('data-theme');
var themeBtn=$('theme');if(themeBtn)themeBtn.remove();   // bouton clair/sombre sans effet ici : retiré
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
  // À la fermeture, le focus revient sur l'élément qui a ouvert le panneau (la doc le renvoie sinon vers son badge)
  new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.removedNodes,function(n){if(n.id==='uppop'&&anchor===tile)setTimeout(function(){try{tile.focus({preventScroll:true});}catch(e){}},0);});});}).observe(document.body,{childList:true});
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
  ['hp-hero','#040405',[1,.8,.6,.8]],
  ['hp-stats','#050507',[.7,1,.5,.4]],
  ['hp-start','#040508',[.5,.6,1,.3]],
  ['hp-docs','#050506',[.35,.35,.45,.15]],
  ['hp-guardian','#07081A',[1,1,.7,.2]],
  ['hp-news','#06050C',[.5,1,.4,.3]],
  ['hp-faq','#040507',[.4,.5,.9,.2]],
  ['hp-invite','#0A0906',[1,.9,.6,.9]]];
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
  // jamais sous 55 % : le fond ne « s'éteint » plus ; parallaxe seulement si l'utilisateur accepte les animations
  var y=scrollY;bgBlobs.forEach(function(b,k){b.style.setProperty('--o',Math.max(.55,c[3+k]).toFixed(3));
    if(!reduce)b.style.translate=(Math.cos(y/1700+k*1.7)*40).toFixed(1)+'px '+(Math.sin(y/1300+k*2.1)*70).toFixed(1)+'px';});
  if(bgGrid&&!reduce)bgGrid.style.transform='translate3d(0,'+(-(y*.12)%28).toFixed(1)+'px,0)';
  if(bgGrid)bgGrid.style.opacity=(1-ss(innerHeight*.6,innerHeight*1.8,y)*.65).toFixed(3);}
/* barre du haut + section active */
var topEl=$('hp-top'),lastY=scrollY,spy=[].slice.call(document.querySelectorAll('[data-spy]')),prog=$('hp-prog');
function topBar(){var y=scrollY;topEl.classList.toggle('solid',y>30);
  if(prog){var mx=document.documentElement.scrollHeight-innerHeight;prog.style.setProperty('--p',mx>0?clamp(y/mx).toFixed(4):'0');}
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
    // Espace : garde son rôle (défiler la page, activer l'élément ciblé) ; elle n'entre dans la recherche que pour séparer deux mots
    if(k===' '&&(!s.value||(t&&t.closest&&t.closest('a,button,[role="button"],.cmd,summary'))))return;
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



/* ── guide : onglets + puces de commande qui ouvrent la simulation ── */
(function(){
  var g=Q('.hp-guide');if(!g)return;
  var tabs=[].slice.call(g.querySelectorAll('.hp-gtabs [data-g]')),panels=[].slice.call(g.querySelectorAll('.hp-gpanel'));
  function show(id,focus){tabs.forEach(function(t){var on=t.getAttribute('data-g')===id;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;if(on&&focus)t.focus();});
    panels.forEach(function(p){var on=p.getAttribute('data-g')===id;p.hidden=!on;p.classList.toggle('on',on);});}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){show(t.getAttribute('data-g'));});
    t.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;if(!d)return;e.preventDefault();show(tabs[(i+d+tabs.length)%tabs.length].getAttribute('data-g'),true);});});
  show('install');
  g.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('[data-cmd]');if(!c)return;
    var card=Q('.cmd[data-n="'+String(c.getAttribute('data-cmd')).replace(/[^a-z0-9_-]/gi,'')+'"]');if(card){e.preventDefault();card.click();}});
  g.querySelectorAll('[data-cmd]').forEach(function(c){if(Q('.cmd[data-n="'+String(c.getAttribute('data-cmd')).replace(/[^a-z0-9_-]/gi,'')+'"]')){c.tabIndex=0;c.setAttribute('role','button');
    c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}});}else c.classList.add('nolink');});
})();

/* ── FAQ : questions ajoutées par le guide (permissions, tickets, installation) ── */
(function(){var extra=$('hp-faq-extra'),faq=$('faq');if(!extra||!faq)return;[].slice.call(extra.children).forEach(function(d){faq.appendChild(d);});extra.remove();})();

/* ── FAQ : recherche dans les questions + tout déplier / replier ── */
(function(){
  var slot=$('hp-faq-slot'),faq=$('faq');if(!slot||!faq)return;
  var items=[].slice.call(faq.querySelectorAll('.fq'));if(!items.length)return;
  var en=function(){return lang()==='en';};
  var bar=document.createElement('div');bar.className='hp-faqtools';
  bar.innerHTML='<input type="search" id="hp-faqq" autocomplete="off" spellcheck="false"><button type="button" class="hp-btn ghost" id="hp-faqall"></button>';
  var none=document.createElement('p');none.className='hp-faqnone';none.hidden=true;
  slot.insertBefore(bar,slot.firstChild);faq.appendChild(none);
  var q=$('hp-faqq'),all=$('hp-faqall');
  function labels(){q.placeholder=en()?'Search the questions…':'Rechercher dans les questions…';q.setAttribute('aria-label',q.placeholder);
    var open=items.every(function(d){return d.hidden||d.open;});all.textContent=open?(en()?'Collapse all':'Tout replier'):(en()?'Expand all':'Tout déplier');
    none.textContent=en()?'No question matches.':'Aucune question ne correspond.';}
  function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
  q.addEventListener('input',function(){var t=norm(q.value.trim()),n=0;
    items.forEach(function(d){var hit=!t||norm(d.textContent).indexOf(t)>=0;d.hidden=!hit;if(hit)n++;if(t&&hit)d.open=true;});
    none.hidden=n>0;labels();});
  all.addEventListener('click',function(){var open=!items.every(function(d){return d.hidden||d.open;});items.forEach(function(d){if(!d.hidden)d.open=open;});labels();});
  items.forEach(function(d){d.addEventListener('toggle',labels);});
  var lb=$('lang');if(lb)lb.addEventListener('click',function(){setTimeout(labels,50);});
  labels();
})();

/* ── WebGL : sphère de verre + cadenas + chaîne ── */
var THREE=window.THREE,canvas=$('hp-gl'),giant=$('hp-giant');
// « réduire les animations » : pas de scène 3D du tout (elle bouge avec le défilement et la souris) ; la page reste complète
if(!THREE||!canvas||reduce){if(canvas&&reduce)canvas.remove();return;}
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
function buildEnv(){ // studio : grandes boîtes à lumière douces, bande blurple, touche rouge, contre-jour chaud au sol
  var c=document.createElement('canvas');c.width=2048;c.height=1024;var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,1024);gr.addColorStop(0,'#2c2f40');gr.addColorStop(.46,'#121320');gr.addColorStop(.54,'#0a0a12');gr.addColorStop(1,'#020203');g.fillStyle=gr;g.fillRect(0,0,2048,1024);
  g.filter='blur(22px)';
  g.fillStyle='#ffffff';g.fillRect(200,120,520,170);g.fillStyle='#e8ecff';g.fillRect(1300,90,560,90);
  g.fillStyle='#cfd5ff';g.fillRect(1650,330,90,330);
  g.fillStyle='#5865F2';g.fillRect(860,330,380,120);g.fillRect(60,560,280,90);
  g.fillStyle='#E1262D';g.fillRect(1700,700,220,80);g.fillStyle='#ffcf9e';g.fillRect(420,780,520,40);
  g.filter='none';
  var t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
  var pm=new THREE.PMREMGenerator(renderer);if(scene.environment)scene.environment.dispose();scene.environment=pm.fromEquirectangular(t).texture;t.dispose();pm.dispose();
}
buildEnv();
// Contexte graphique perdu (onglet en veille, pilote, carte graphique sollicitée) : la scène restait vide pour de bon.
// On empêche la perte définitive, on suspend le rendu, puis on recharge textures et éclairage à la reprise.
var glLost=false;
canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();glLost=true;},false);
canvas.addEventListener('webglcontextrestored',function(){
  scene.traverse(function(o){var ms=o.material?[].concat(o.material):[];ms.forEach(function(m){['map','roughnessMap','normalMap','emissiveMap','bumpMap'].forEach(function(k){if(m[k])m[k].needsUpdate=true;});m.needsUpdate=true;});});
  if(typeof ringTex!=='undefined')ringTex.needsUpdate=true;
  buildEnv();glLost=false;},false);
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

/* ── cadenas doré au centre, devant un halo céleste (rayons, cercle runique des serveurs, emblème, nuages, drapé rouge) ── */
var group=new THREE.Group();scene.add(group);
// cadenas
var lock=new THREE.Group();   // cadenas retiré de la scène (demande)
var gold=new THREE.MeshPhysicalMaterial({color:0xF4C24A,normalMap:PL.norm,normalScale:new THREE.Vector2(.12,.12),metalness:.6,roughness:.34,clearcoat:.7,clearcoatRoughness:.1,envMapIntensity:1.6,emissive:0x2a1800,emissiveIntensity:.3});
gold.toneMapped=false;   // or franc : le rendu tonal le désaturait en kaki
[PL.col,PL.rough,PL.norm].forEach(function(t){t.repeat.set(1.4,1.4);});
var chrome=new THREE.MeshStandardMaterial({color:0xdfe2ea,metalness:1,roughness:.16,envMapIntensity:1.4});
var BW=1.5,BH=1.22,BD=.42;
var bodyG=(function(){var s=new THREE.Shape(),w=BW/2,h=BH/2,r=.22;s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);
  var g=new THREE.ExtrudeGeometry(s,{depth:BD,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelSegments:5,curveSegments:10});g.center();return g;})();
var body=new THREE.Mesh(bodyG,gold);lock.add(body);
var FRONT=BD/2+.07+.003;
// trou de serrure lumineux + bague
var keyMat=new THREE.MeshBasicMaterial({color:0x5865F2,toneMapped:false});
var keyG=(function(){var s=new THREE.Shape();s.absarc(0,.08,.12,0,Math.PI*2,false);var t=new THREE.Shape();t.moveTo(-.055,.04);t.lineTo(.055,.04);t.lineTo(.085,-.26);t.lineTo(-.085,-.26);t.closePath();
  var a=new THREE.ShapeGeometry(s,24),b=new THREE.ShapeGeometry(t);var m=new THREE.Mesh(a,keyMat),n=new THREE.Mesh(b,keyMat);var gg=new THREE.Group();gg.add(m);gg.add(n);return gg;})();
keyG.position.set(0,-.05,FRONT);lock.add(keyG);
var ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,16,48),chrome);ring.position.set(0,.03,FRONT);lock.add(ring);
// anse : U en chrome, pivote autour de sa jambe gauche
var SA=.44,SH=.62,SR=.11,LEG=.42;            // demi-écart, hauteur au-dessus du corps, rayon du fil, profondeur dans le corps
var shackleG=(function(){var p=new THREE.CurvePath();
  p.add(new THREE.LineCurve3(new THREE.Vector3(0,-LEG,0),new THREE.Vector3(0,SH,0)));
  p.add(new THREE.CubicBezierCurve3(new THREE.Vector3(0,SH,0),new THREE.Vector3(0,SH+SA*1.33,0),new THREE.Vector3(2*SA,SH+SA*1.33,0),new THREE.Vector3(2*SA,SH,0)));
  p.add(new THREE.LineCurve3(new THREE.Vector3(2*SA,SH,0),new THREE.Vector3(2*SA,-LEG,0)));
  return new THREE.TubeGeometry(p,160,SR,24,false);})();
var pivot=new THREE.Group();pivot.position.set(-SA,BH/2,0);lock.add(pivot);
var shackle=new THREE.Mesh(shackleG,chrome);pivot.add(shackle);
lock.position.set(0,-.2,.1);
var lockLight=new THREE.PointLight(0xfff1d6,2.2,9,2);lockLight.position.set(1.2,1.4,3.2);group.add(lockLight);   // lumière chaude face au cadenas : l'or brille même sur fond noir
/* halo céleste : tout est peint une fois sur des canvas, puis posé sur des plans face caméra */
var GOLD='#F4C24A',halo=new THREE.Group();scene.add(halo);
function glow(g,col,blur){g.strokeStyle=col;g.fillStyle=col;g.shadowColor='rgba(255,176,48,.85)';g.shadowBlur=blur;}
function stex(c){var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=ANISO;return t;}
function hplane(w,h,t,x,y,z,ro,add,o){var m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false,opacity:o||1,side:THREE.DoubleSide,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
  m.userData.o=o||1;var p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);p.position.set(x,y,z);p.renderOrder=ro;p.userData.x=x;halo.add(p);return p;}
// rayons très fins qui partent du centre, à peine visibles
var raysCan=(function(){var S=1024,c=canvas2(S,S),g=c.getContext('2d'),r=prng(91),C=S/2;g.translate(C,C);g.lineCap='round';
  for(var i=0;i<150;i++){var a=i/150*Math.PI*2+(r()-.5)*.012,l=C*(.5+r()*.5),big=i%6===0;
    g.strokeStyle='rgba(255,'+(200+Math.floor(r()*30))+',140,'+(big?.55:(.18+r()*.22)).toFixed(2)+')';g.lineWidth=big?1.4:.6+r()*.5;
    g.beginPath();g.moveTo(Math.cos(a)*C*.22,Math.sin(a)*C*.22);g.lineTo(Math.cos(a)*l,Math.sin(a)*l);g.stroke();}
  g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-in';
  var m=g.createRadialGradient(C,C,C*.15,C,C,C);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(.3,'rgba(0,0,0,1)');m.addColorStop(.65,'rgba(0,0,0,.4)');m.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=m;g.fillRect(0,0,S,S);return c;})();
// lueur douce : cœur doré, bleu profond autour
var glowCan=(function(){var S=512,c=canvas2(S,S),g=c.getContext('2d'),C=S/2,gr=g.createRadialGradient(C,C,0,C,C,C);
  gr.addColorStop(0,'rgba(255,214,150,.38)');gr.addColorStop(.22,'rgba(110,140,255,.22)');gr.addColorStop(.55,'rgba(30,58,170,.13)');gr.addColorStop(1,'rgba(10,20,80,0)');
  g.fillStyle=gr;g.fillRect(0,0,S,S);return c;})();
// emblème : fines lignes dorées sur un voile bleu nuit
var mandCan=(function(){var S=1024,c=canvas2(S,S),g=c.getContext('2d'),C=S/2;g.translate(C,C);
  var bg=g.createRadialGradient(0,0,0,0,0,C*.98);bg.addColorStop(0,'rgba(40,70,190,.32)');bg.addColorStop(.65,'rgba(14,26,96,.22)');bg.addColorStop(1,'rgba(6,10,40,0)');
  g.fillStyle=bg;g.beginPath();g.arc(0,0,C*.98,0,6.283);g.fill();
  g.lineCap=g.lineJoin='round';glow(g,GOLD,5);
  function petals(n,r0,r1,wd,lw,rot){g.lineWidth=lw;for(var i=0;i<n;i++){g.save();g.rotate(i/n*6.283+rot);g.beginPath();g.moveTo(0,-r0);g.quadraticCurveTo(wd,-(r0+r1)/2,0,-r1);g.quadraticCurveTo(-wd,-(r0+r1)/2,0,-r0);g.stroke();g.restore();}}
  petals(16,170,330,40,1.6,0);petals(24,340,470,34,1.4,Math.PI/24);
  [160,335,488].forEach(function(r){g.lineWidth=1.4;g.beginPath();g.arc(0,0,r,0,6.283);g.stroke();});
  for(var i=0;i<72;i++){var a=i/72*6.283;g.beginPath();g.arc(Math.cos(a)*410,Math.sin(a)*410,i%3?1.6:3,0,6.283);g.fill();}
  return c;})();
// volutes : quelques traits fins qui ondulent et finissent en spirale (bleu, crème, or)
function wispCan(seed){var W=1024,H=384,c=canvas2(W,H),g=c.getContext('2d'),r=prng(seed);g.lineCap=g.lineJoin='round';
  [['rgba(120,160,255,.75)',2.2],['rgba(245,234,210,.7)',1.4],['rgba(244,194,74,.7)',1.2],['rgba(120,160,255,.45)',1.2]].forEach(function(s,k){
    var y0=H*(.35+k*.1),amp=18+r()*22,fr=.006+r()*.004,ph=r()*6,x1=W*(.62+r()*.22);g.strokeStyle=s[0];g.lineWidth=s[1];g.shadowColor=s[0];g.shadowBlur=6;g.beginPath();
    for(var x=40;x<=x1;x+=6){var y=y0+Math.sin(x*fr+ph)*amp;if(x===40)g.moveTo(x,y);else g.lineTo(x,y);}
    var ex=x1,ey=y0+Math.sin(x1*fr+ph)*amp,R0=28+k*9,a0=-Math.PI/2;
    for(var t=0;t<=1.001;t+=.02){var a=a0+t*Math.PI*2.6,rr=R0*(1-t*.8);g.lineTo(ex+Math.cos(a)*rr,ey+R0+Math.sin(a)*rr);}
    g.stroke();});
  g.shadowBlur=0;g.globalCompositeOperation='destination-out';
  var s=g.createLinearGradient(0,0,W,0);s.addColorStop(0,'rgba(0,0,0,1)');s.addColorStop(.25,'rgba(0,0,0,0)');s.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=s;g.fillRect(0,0,W,H);
  return c;}
// étoiles
var starCan=(function(){var c=canvas2(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,240,210,.6)');gr.addColorStop(1,'rgba(255,240,210,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return c;})();
var stars=(function(){var r=prng(17),n=260,p=new Float32Array(n*3),col=new Float32Array(n*3);
  for(var i=0;i<n;i++){var a=r()*6.283,d=1.5+Math.sqrt(r())*6.5;p[i*3]=Math.cos(a)*d;p[i*3+1]=Math.sin(a)*d*.8;p[i*3+2]=-2.6-r()*1.5;
    var gd=r()<.3;col[i*3]=1;col[i*3+1]=gd?.82:.95;col[i*3+2]=gd?.5:.9;}
  var gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.BufferAttribute(p,3));gm.setAttribute('color',new THREE.BufferAttribute(col,3));
  var m=new THREE.PointsMaterial({size:.07,map:stex(starCan),vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.7,toneMapped:false});m.userData.o=.7;
  var pt=new THREE.Points(gm,m);pt.renderOrder=0;halo.add(pt);return pt;})();
// cercle runique fin : anneaux, perles, runes, et les noms des serveurs protégés écrits le long du cercle
var haloCan=canvas2(2048,2048),ringTex=stex(haloCan);
var glyphs=(function(){var r=prng(73),out=[];for(var i=0;i<24;i++){var s=[],n=2+Math.floor(r()*3);
  for(var j=0;j<n;j++){var p=[Math.floor(r()*3),Math.floor(r()*4)],q=[Math.floor(r()*3),Math.floor(r()*4)];if(p[0]===q[0]&&p[1]===q[1])q[1]=(q[1]+2)%4;s.push([p,q]);}
  if(r()<.4)s.push(['o',Math.floor(r()*3),Math.floor(r()*4)]);out.push(s);}return out;})();
function drawGlyph(g,s,w,h){s.forEach(function(st){g.beginPath();
  if(st[0]==='o')g.arc(st[1]/2*w-w/2,st[2]/3*h-h/2,w*.14,0,6.283);
  else{g.moveTo(st[0][0]/2*w-w/2,st[0][1]/3*h-h/2);g.lineTo(st[1][0]/2*w-w/2,st[1][1]/3*h-h/2);}g.stroke();});}
function arcText(g,txt,a0,rad){var ch=Array.from(txt);for(var i=0;i<ch.length;i++){var w=g.measureText(ch[i]).width;g.save();g.rotate(a0+w/2/rad);g.fillText(ch[i],0,-rad);g.restore();a0+=w/rad;}return a0;}
function paintRing(list){var g=haloCan.getContext('2d'),S=haloCan.width,C=S/2,i;g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,S,S);
  g.translate(C,C);g.lineCap=g.lineJoin='round';glow(g,GOLD,6);
  [[970,1.6],[950,3],[812,1.4],[700,2.4],[684,1]].forEach(function(o){g.lineWidth=o[1];g.beginPath();g.arc(0,0,o[0],0,6.283);g.stroke();});
  g.shadowBlur=4;for(i=0;i<180;i++){var a=i/180*6.283;g.beginPath();g.arc(Math.cos(a)*922,Math.sin(a)*922,i%10===0?3.6:1.7,0,6.283);g.fill();}
  g.lineWidth=2.2;g.shadowBlur=5;g.globalAlpha=.8;for(i=0;i<120;i++){g.save();g.rotate(i/120*6.283);g.translate(0,-866);drawGlyph(g,glyphs[(i*7)%glyphs.length],16,28);g.restore();}
  g.globalAlpha=1;
  // noms : les serveurs les plus peuplés en plus grand et plus lumineux ; cycles entiers répartis sur tout le tour
  var items=list&&list.length?list:[{n:'HASU PROTECT',m:3},{n:'ANTI-RAID',m:2},{n:'ANTI-NUKE',m:2},{n:'GUARDIAN AI',m:2}];
  var mMax=Math.max.apply(null,items.map(function(s){return s.m||1;})),star='·',GAP=30,RN=752,CIRC=2*Math.PI*RN;
  g.textAlign='center';g.textBaseline='middle';
  function sizes(sc){return items.map(function(s){var w=Math.sqrt((s.m||1)/mMax),fs=Math.max(14,Math.round((34+26*w)*sc));g.font='600 '+fs+'px Sora, Inter, sans-serif';var tw=g.measureText(s.n).width;
    var ss=Math.max(14,Math.round(48*sc));g.font='700 '+ss+'px Sora, sans-serif';return {s:s,w:w,fs:fs,tw:tw,sw:g.measureText(star).width,ss:ss};});}
  var m=sizes(1),cyc=m.reduce(function(a,o){return a+o.tw+o.sw+GAP*2;},0);if(cyc>CIRC){m=sizes(CIRC/cyc*.98);cyc=m.reduce(function(a,o){return a+o.tw+o.sw+GAP*2;},0);}
  var reps=Math.max(1,Math.floor(CIRC/cyc)),pad=Math.max(0,CIRC-reps*cyc)/(reps*m.length*2),ang=0;
  for(var k=0;k<reps;k++)m.forEach(function(o){g.font='600 '+o.fs+'px Sora, Inter, sans-serif';g.fillStyle='rgba(255,222,150,'+(0.55+0.4*o.w).toFixed(2)+')';g.shadowColor='rgba(255,170,40,.7)';g.shadowBlur=3+5*o.w;
    ang=arcText(g,o.s.n.toUpperCase(),ang,RN)+(GAP+pad)/RN;
    g.font='700 '+o.ss+'px Sora, sans-serif';g.fillStyle='#9fb4ff';g.shadowColor='rgba(80,120,255,.8)';g.shadowBlur=6;ang=arcText(g,star,ang,RN)+(GAP+pad)/RN;});
  g.setTransform(1,0,0,1,0,0);ringTex.needsUpdate=true;}
// ruban de soie rouge en 3D : s'enroule derrière le cadenas, passe devant en bas à gauche et en haut à droite
var ribCan=(function(){var W=1024,H=128,c=canvas2(W,H),g=c.getContext('2d'),r=prng(23),i;
  var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#f2c650');gr.addColorStop(.05,'#d9a531');gr.addColorStop(.075,'#6e0a12');gr.addColorStop(.3,'#b8161f');gr.addColorStop(.5,'#d8252e');
  gr.addColorStop(.7,'#b8161f');gr.addColorStop(.925,'#6e0a12');gr.addColorStop(.95,'#d9a531');gr.addColorStop(1,'#f2c650');g.fillStyle=gr;g.fillRect(0,0,W,H);
  for(i=0;i<70;i++){g.fillStyle=(r()<.5?'rgba(255,130,130,':'rgba(50,0,0,')+(.04+r()*.07).toFixed(2)+')';g.fillRect(0,12+r()*(H-24),W,1+r()*2);}
  return c;})();
var NS=240,RW=.58,ribG=new THREE.PlaneGeometry(1,1,NS,1);
var ribMat=new THREE.MeshPhysicalMaterial({map:tex(ribCan,true,5,1),color:0xc8c8c8,roughness:.5,metalness:0,sheen:new THREE.Color(0x8a1a20),clearcoat:.15,clearcoatRoughness:.45,side:THREE.DoubleSide,envMapIntensity:.55,transparent:true});
ribMat.userData.o=1;var ribbon=new THREE.Mesh(ribG,ribMat);ribbon.renderOrder=3;halo.add(ribbon);
var rA=new THREE.Vector3(),rB=new THREE.Vector3(),rT=new THREE.Vector3(),rU=new THREE.Vector3(),rO=new THREE.Vector3(),rW=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
function ribPt(t,tm,o){var th=2.4+t*4.5+Math.sin(tm*.25)*.12,rad=2.45+.22*Math.sin(t*5+tm*.6);
  return o.set(Math.cos(th)*rad,-2.5+t*4.7+.16*Math.sin(t*7+tm*.8),Math.sin(th)*rad*.75-.2);}
function updateRibbon(tm){var pa=ribG.attributes.position;
  for(var i=0;i<=NS;i++){var t=i/NS;ribPt(t,tm,rA);ribPt(Math.min(1,t+.004),tm,rB);if(t>=1){ribPt(t-.004,tm,rB);rT.subVectors(rA,rB);}else rT.subVectors(rB,rA);rT.normalize();
    rU.copy(UP).addScaledVector(rT,-UP.dot(rT)).normalize();rO.crossVectors(rT,rU);
    var tw=.55*Math.sin(t*4+tm*.7),wd=RW*Math.min(1,t/.06,(1-t)/.06,1);rW.copy(rU).multiplyScalar(Math.cos(tw)).addScaledVector(rO,Math.sin(tw)).multiplyScalar(wd/2);
    pa.setXYZ(i,rA.x+rW.x,rA.y+rW.y,rA.z+rW.z);pa.setXYZ(NS+1+i,rA.x-rW.x,rA.y-rW.y,rA.z-rW.z);}
  pa.needsUpdate=true;ribG.computeVertexNormals();}
updateRibbon(0);
var hGlow=hplane(8,8,stex(glowCan),0,0,-2.2,1,true,.8);
var hRays=hplane(10,10,stex(raysCan),0,0,-2,2,true,.6);
var hRing=hplane(6.8,6.8,ringTex,0,0,-1.2,4,false,.9);
var hMand=hplane(3.7,3.7,stex(mandCan),0,0,-.8,5,false,.85);
var hClouds=[hplane(3.6,1.35,stex(wispCan(11)),-2.6,-1.9,-1,6,true,.8),hplane(3.2,1.2,stex(wispCan(29)),2.7,2.2,-1.1,6,true,.7)];
hClouds[1].scale.x=-1;
if(document.fonts)document.fonts.ready.then(function(){paintRing(null);});else paintRing(null);
// le cercle n'affiche que des totaux (décision du propriétaire : les noms des serveurs ne sont jamais publics)
var lastTotals='';
function fmtN(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');}
function applyTotals(d){
  var s=Math.max(0,Math.floor(Number(d&&d.servers)))||0,m=Math.max(0,Math.floor(Number(d&&d.members)))||0;if(!s&&!m)return;
  var key=s+'/'+m;if(key===lastTotals)return;lastTotals=key;
  var list=[{n:'HASU PROTECT',m:3},{n:'ANTI-RAID',m:2}];if(s)list.push({n:fmtN(s)+' SERVEURS PROTÉGÉS',m:3});
  list.push({n:'ANTI-NUKE',m:2});if(m)list.push({n:fmtN(m)+' MEMBRES',m:3});list.push({n:'GUARDIAN AI',m:2});paintRing(list);
}
function loadTotals(){
  var u=location.protocol==='http:'?'/heartbeat.json':'https://rapid-sound-6a32.teamfunnysgames.workers.dev/heartbeat.json';
  fetch(u,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(d)return (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){applyTotals(d);});
  }).catch(function(){});
}
loadTotals();setInterval(loadTotals,5*60*1000);
var lockO=0;   // ouverture du cadenas (0 fermé → 1 ouvert), lissée

/* chaîne : vrais maillons ovales (fil d'épaisseur constante) en or brossé */
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
var i,L=64,PITCH=LINK_A+2*(LINK_RC-LINK_W)+.02;
var chainMat=new THREE.MeshStandardMaterial({color:0xE8B53C,map:CH.col,metalness:1,roughness:1,roughnessMap:CH.rough,normalMap:CH.norm,normalScale:new THREE.Vector2(.7,.7),envMapIntensity:1.2});
var chain=new THREE.InstancedMesh(linkG,chainMat,L);   // chaîne retirée de la scène (demande)
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
var silver=new THREE.Color(0xE8B53C),blueTint=new THREE.Color(0x8f9bff),redTint=new THREE.Color(0xffb0b0);
var pos=new THREE.Vector3(),q=new THREE.Quaternion(),last=performance.now(),time=0,rotY=0,sy=scrollY;
// Qualité adaptative : si les images arrivent trop lentement, on baisse la résolution du rendu par paliers.
var perf={sum:0,n:0};
function adapt(raw){
  if(document.hidden||raw>250)return;perf.sum+=raw;perf.n++;
  if(perf.n<90)return;var avg=perf.sum/perf.n;perf.sum=0;perf.n=0;
  if(avg>28&&dpr>1){dpr=Math.max(1,dpr-.5);renderer.setPixelRatio(dpr);resize();}
  else if(avg>45&&dpr<=1&&dpr>.6){dpr=.6;renderer.setPixelRatio(dpr);resize();}
}
var endDrawn=false;
function frame(now){
  var raw=now-last;adapt(raw);
  var dt=Math.min(.05,raw/1000);last=now;if(!reduce)time+=dt;
  sy+=(scrollY-sy)*Math.min(1,dt*8);   // la scène suit le défilement avec un léger amorti
  var y=sy,vh=geo.vh||innerHeight,narrow=camera.aspect<.9;
  var intro=introStart===null?0:ease(clamp((now-introStart)/1800));
  var heroOut=clamp(y/((geo.hero||vh)*.85)),k=Math.max(1-intro,ease(heroOut)),thin=ss(.55,1,heroOut);
  var chainIn=ss(.25,.9,heroOut),end=ss(geo.end-vh*.9,geo.end-vh*.15,y);
  var gMix=ss(geo.gTop-vh*.8,geo.gTop-vh*.2,y)*(1-ss(geo.gBot-vh*.6,geo.gBot,y));
  // contexte perdu, ou scène entièrement repliée (fin de page) déjà dessinée une fois : on ne calcule ni ne dessine rien
  if(glLost||(end>=1&&endDrawn)){requestAnimationFrame(frame);return;}
  endDrawn=end>=1;
  if(giant&&heroOut<1.05)giant.style.transform='translate3d(0,'+(y*.3).toFixed(1)+'px,0)';
  mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;
  camera.position.x=mouse.x*.6;camera.position.y=mouse.y*.4;camera.lookAt(0,0,0);
  var hx=narrow?0:2.9,hy=narrow?1.7:.1;
  group.position.set(hx*(1-k*.6),hy+k*.4+end*6,-k*6);group.scale.setScalar(narrow?.6:1);
  rotY+=dt*(.22+k*.1);group.rotation.y=rotY+mouse.x*.5;group.rotation.x=-mouse.y*.3+.15;
  group.updateMatrixWorld();
  // cadenas : s'ouvre dès qu'on descend, se referme quand on remonte en haut
  var openT=ss(.01,.22,heroOut);lockO+=(openT-lockO)*Math.min(1,dt*5);
  var lift=ss(0,.45,lockO)*.4,swing=ss(.35,1,lockO);
  pivot.position.y=BH/2+lift;pivot.rotation.y=-swing*1.75;
  lock.rotation.y=Math.sin(time*.55)*.22+mouse.x*.35-rotY;lock.rotation.x=-mouse.y*.2+.05;
  lock.scale.setScalar(1.5*(1+.06*Math.sin(lockO*Math.PI)));
  var pulse=.5+.5*Math.sin(time*1.6);
  keyMat.color.setRGB(.42+.18*pulse+.55*lockO,.48+.14*pulse+.32*lockO,1-.85*lockO);   // blurple fermé → or ouvert
  var out=ss(.55,1,heroOut),appear=introStart===null?0:ease(clamp((now-introStart)/1400));
  group.scale.multiplyScalar(Math.max(.0001,(1-out)*(.6+.4*appear)*(1-end)));
  // halo : suit le cadenas sans tourner avec lui, léger parallaxe ; s'illumine quand le cadenas s'ouvre
  var gs=group.scale.x;halo.scale.setScalar(gs);halo.position.set(group.position.x,group.position.y-.3*gs,group.position.z);
  halo.rotation.set(-mouse.y*.12,mouse.x*.18,0);halo.visible=gs>.002;
  hRing.rotation.z=-time*.04;hRays.rotation.z=time*.015;hMand.rotation.z=time*.06;hRays.scale.setScalar(1+.12*lockO);
  hClouds.forEach(function(c,i){c.position.x=c.userData.x+Math.sin(time*.3+i*2)*.18;});
  if(!reduce)updateRibbon(time);
  var hf=1-ss(.35,.9,heroOut);
  halo.children.forEach(function(o){o.material.opacity=o.material.userData.o*hf;});
  hGlow.material.opacity=Math.min(1,.6+.4*lockO+.1*pulse)*hf;stars.material.opacity=(.6+.25*pulse)*hf;
  P.phase=time*.45;P.amp=.9-gMix*.3;P.tilt=.32*(1-ss(.6,1.4,y/vh))+.06;P.y=(1-ease(chainIn))*10-end*12+(narrow?.8:0);P.depth=1.2+gMix*.6;
  chain.visible=false;
  chainMat.color.copy(silver).lerp(blueTint,gMix*.6);
  blue.intensity=1.6+gMix*1.6;
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
