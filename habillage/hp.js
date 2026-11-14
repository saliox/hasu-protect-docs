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
  // Le script d'origine masque, pendant une recherche, toute <section> sans fiche de commande visible — et ne la
  // ré-affiche jamais. La FAQ (#faq) en est une : après une seule recherche, elle restait vide pour de bon.
  // Toute <section> sans .cmd devient donc un <div> (mêmes attributs, mêmes enfants, même place).
  [].slice.call(document.querySelectorAll('section')).forEach(function(sec){
    if(sec.querySelector('.cmd'))return;
    var d=document.createElement('div');[].slice.call(sec.attributes).forEach(function(a){d.setAttribute(a.name,a.value);});
    // si la page s'ouvre avec une recherche ou un filtre dans l'adresse (?q=, ?cat=, ?acc=), le script d'origine
    // a DÉJÀ masqué la section avant ce code : on ne recopie pas ce display:none
    d.style.removeProperty('display');if(!d.getAttribute('style'))d.removeAttribute('style');
    while(sec.firstChild)d.appendChild(sec.firstChild);sec.parentNode.replaceChild(d,sec);});
  var s=$('search');
  if(s){var bar=document.createElement('div');bar.className='hp-toolbar';s.parentNode.insertBefore(bar,s);
    ['search','rescount','catnav','accnav'].forEach(function(id){var e=$(id);if(e)bar.appendChild(e);});
    // petite flèche pour replier la recherche et les filtres (choix mémorisé dans ce navigateur)
    var lbl=document.createElement('button');lbl.type='button';lbl.className='hp-tbmin';
    lbl.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="t"></span><em></em>';
    var tog=document.createElement('button');tog.type='button';tog.className='hp-tbtog';
    tog.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
    bar.insertBefore(lbl,bar.firstChild);bar.appendChild(tog);
    function setMin(on,save){bar.classList.toggle('min',on);tog.setAttribute('aria-expanded',on?'false':'true');
      var en=(document.documentElement.lang||'').slice(0,2)==='en';tog.setAttribute('aria-label',on?(en?'Show search and filters':'Afficher la recherche et les filtres'):(en?'Hide search and filters':'Masquer la recherche et les filtres'));tog.title=tog.getAttribute('aria-label');lbl.querySelector('.t').textContent=en?'Search and filters':'Recherche et filtres';
      lbl.querySelector('em').textContent=s.value?'« '+s.value+' »':'';
      if(save)try{localStorage.setItem('hp-tb-min',on?'1':'0');}catch(e){}}
    var start=false;try{start=localStorage.getItem('hp-tb-min')==='1';}catch(e){}
    setMin(start,false);
    new MutationObserver(function(){setMin(bar.classList.contains('min'),false);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // En défilant (barre collée en haut), la barre de filtres se range : seule la petite flèche reste ;
    // un clic la déplie par-dessus la liste, un autre la range. De retour en haut de la liste, elle reprend sa place.
    var mark=document.createElement('div');mark.className='hp-tb-mark';bar.parentNode.insertBefore(mark,bar);
    function floatLabel(){if(!bar.classList.contains('hp-tb-float'))return setMin(bar.classList.contains('min'),false);
      var en=(document.documentElement.lang||'').slice(0,2)==='en',open=bar.classList.contains('hp-tb-peek');
      tog.setAttribute('aria-expanded',open?'true':'false');tog.setAttribute('aria-label',open?(en?'Hide search and filters':'Masquer la recherche et les filtres'):(en?'Show search and filters':'Afficher la recherche et les filtres'));tog.title=tog.getAttribute('aria-label');}
    // La barre flottante sort du flux (position fixe) et le repère garde sa place exacte : la liste ne saute pas.
    var TOP=0;
    function geom(){var r=mark.getBoundingClientRect();bar.style.setProperty('--tb-left',r.left+'px');bar.style.setProperty('--tb-width',r.width+'px');}
    function stuck(){if(!bar.classList.contains('hp-tb-float'))TOP=parseFloat(getComputedStyle(bar).top)||0;
      var host=bar.parentNode.getBoundingClientRect(),on=mark.getBoundingClientRect().top<TOP-4&&host.bottom>TOP+80;
      if(on===bar.classList.contains('hp-tb-float')){if(on)geom();return;}
      // toutes les LECTURES d'abord, puis les écritures d'un bloc : une lecture entre deux écritures laissait le
      // navigateur « ancrer » le défilement sur l'état intermédiaire, et la liste sautait de la hauteur de la barre
      if(on){var cs=getComputedStyle(bar),hh=bar.offsetHeight+parseFloat(cs.marginTop||0)+parseFloat(cs.marginBottom||0);geom();
        mark.style.height=hh+'px';bar.style.setProperty('--tb-top',TOP+'px');bar.classList.add('hp-tb-float');}
      else{bar.classList.remove('hp-tb-float','hp-tb-peek');mark.style.height='0';}
      floatLabel();}
    addEventListener('scroll',stuck,{passive:true});addEventListener('resize',stuck);stuck();
    tog.addEventListener('click',function(){if(bar.classList.contains('hp-tb-float')){bar.classList.toggle('hp-tb-peek');floatLabel();return;}setMin(!bar.classList.contains('min'),true);});
    lbl.addEventListener('click',function(){setMin(false,true);s.focus({preventScroll:true});});
    s.addEventListener('focus',function(){if(bar.classList.contains('hp-tb-float')&&!bar.classList.contains('hp-tb-peek')){bar.classList.add('hp-tb-peek');floatLabel();}else if(bar.classList.contains('min'))setMin(false,true);});
    s.addEventListener('input',function(){if(bar.classList.contains('min'))lbl.querySelector('em').textContent=s.value?'« '+s.value+' »':'';});}
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

/* ── Disponibilité 7 jours : grille lisible (jours en lignes, heures en colonnes) et taux honnête.
   Le relevé horaire dépend de GitHub, qui ne le lance pas toutes les heures : sur 168 heures, une partie
   seulement est mesurée. On le dit, et le taux porte sur les heures MESURÉES. Données : uptime.json. ── */
(function(){
  var SRC='https://raw.githubusercontent.com/saliox/hasu-protect-docs/uptime/uptime.json',cache=null,cacheAt=0;
  function get(){if(cache&&Date.now()-cacheAt<5*60*1000)return Promise.resolve(cache);
    return fetch(SRC,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j&&Array.isArray(j.hours)){cache=j;cacheAt=Date.now();}return cache;}).catch(function(){return cache;});}
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
  function build(pop,j){
    if(!pop.isConnected||pop.querySelector('.hp-up'))return;
    var en=lang()==='en',loc=en?'en-GB':'fr-FR',hours=j.hours.filter(function(h){return Array.isArray(h)&&typeof h[0]==='number';}).slice(-24*8);
    if(!hours.length)return;
    var days=[],byKey={};
    hours.forEach(function(h){var d=new Date(h[0]),k=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
      if(!byKey[k]){byKey[k]={date:d,slots:new Array(24).fill(undefined)};days.push(byKey[k]);}
      var v=h[1];byKey[k].slots[d.getHours()]=v==null?null:(+v>0?1:0);});
    days=days.slice(-7);
    var obs=0,up=0;days.forEach(function(d){d.slots.forEach(function(v){if(v===0||v===1){obs++;if(v===1)up++;}});});
    var box=el('div','hp-up');
    var head=el('div','hp-up-head');
    if(obs){var pct=Math.round(up/obs*1000)/10;head.appendChild(el('b','pct',(en?String(pct):String(pct).replace('.',','))+' %'));
      head.appendChild(el('span','what',en?('online across '+obs+' hourly reading'+(obs>1?'s':'')):('en ligne sur '+obs+' relevé'+(obs>1?'s':'')+' horaire'+(obs>1?'s':''))));}
    else head.appendChild(el('span','what',en?'No reading in the last 7 days':'Aucun relevé ces 7 derniers jours'));
    box.appendChild(head);
    var grid=el('div','hp-up-grid');
    days.forEach(function(d){var row=el('div','row'),o=0,u=0;
      row.appendChild(el('span','day',d.date.toLocaleDateString(loc,{weekday:'short',day:'numeric'})));
      var cells=el('div','cells');
      d.slots.forEach(function(v,h){var c=el('i',v===1?'on':v===0?'off':v===null?'none':'out');
        if(v!==undefined){var lbl=d.date.toLocaleDateString(loc,{weekday:'long',day:'numeric',month:'short'})+(en?', ':', ')+h+(en?':00':' h')+' — '+(v===1?(en?'online':'en ligne'):v===0?(en?'offline':'hors ligne'):(en?'no reading':'pas de relevé'));c.title=lbl;}
        if(v===0||v===1){o++;if(v===1)u++;}cells.appendChild(c);});
      row.appendChild(cells);row.appendChild(el('span','sum hp-mono',o?(u+'/'+o):'—'));grid.appendChild(row);});
    box.appendChild(grid);
    var axis=el('div','hp-up-axis hp-mono');['0','6','12','18','23'].forEach(function(h){var s=el('span',null,h+(en?'':' h'));s.style.setProperty('--h',h);axis.appendChild(s);});box.appendChild(axis);
    var lg=el('div','hp-up-legend');[['on',en?'online':'en ligne'],['off',en?'offline':'hors ligne'],['none',en?'no reading':'pas de relevé']].forEach(function(x){var s=el('span');s.appendChild(el('i',x[0]));s.appendChild(document.createTextNode(x[1]));lg.appendChild(s);});box.appendChild(lg);
    box.appendChild(el('p','hp-up-note',en?'The bot is checked once an hour when GitHub runs the check; hours without a reading are not counted.':'Le bot est relevé une fois par heure quand GitHub lance le relevé ; les heures sans relevé ne sont pas comptées.'));
    var h3=pop.querySelector('h3');if(h3&&h3.nextSibling)pop.insertBefore(box,h3.nextSibling);else pop.appendChild(box);
    pop.classList.add('hp-up-on');
    try{window.dispatchEvent(new Event('resize'));}catch(e){}   // replace le panneau à sa nouvelle largeur
  }
  function enhance(){var pop=$('uppop');if(!pop)return;
    // la doc re-dessine le panneau (changement de langue, nouveau relevé) : on surveille le panneau lui-même
    if(!pop.__hpWatch){pop.__hpWatch=true;new MutationObserver(function(){if(!pop.querySelector('.hp-up'))enhance();}).observe(pop,{childList:true});}
    if(pop.querySelector('.hp-up'))return;get().then(function(j){if(j)build(pop,j);});}
  new MutationObserver(function(){enhance();}).observe(document.body,{childList:true});
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
  ['hp-invite','#06060B',[.45,.4,.35,.1]]];
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
  var y=scrollY;bgBlobs.forEach(function(b,k){b.style.setProperty('--o',Math.max(.4,c[3+k]).toFixed(3));
    if(!reduce)b.style.translate=(Math.cos(y/1700+k*1.7)*40).toFixed(1)+'px '+(Math.sin(y/1300+k*2.1)*70).toFixed(1)+'px';});
  if(bgGrid&&!reduce)bgGrid.style.transform='translate3d(0,'+(-(y*.12)%28).toFixed(1)+'px,0)';
  if(bgGrid)bgGrid.style.opacity=(1-ss(innerHeight*.6,innerHeight*1.8,y)*.65).toFixed(3);}
/* barre du haut + section active */
var topEl=$('hp-top'),lastY=scrollY,spy=[].slice.call(document.querySelectorAll('[data-spy]')),prog=$('hp-prog');
function topBar(){var y=scrollY;topEl.classList.toggle('solid',y>30);
  if(prog){var mx=document.documentElement.scrollHeight-innerHeight;var pv=mx>0?clamp(y/mx).toFixed(4):'0';prog.style.setProperty('--p',pv);var tt=$('toTop');if(tt)tt.style.setProperty('--p',pv);}
  // section courante = la dernière (dans l'ordre de la page) dont le haut a passé 40 % de l'écran ; tout en bas, la dernière
  var best=null,bt=-Infinity,bottom=y+innerHeight>=document.documentElement.scrollHeight-4;
  spy.forEach(function(a){var s=$(a.getAttribute('data-spy'));if(!s)return;var t=s.getBoundingClientRect().top;if((t<innerHeight*.4||bottom)&&t>bt){bt=t;best=a.getAttribute('data-spy');}});
  spy.forEach(function(a){var on=a.getAttribute('data-spy')===best;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
/* liens du menu : défilement doux jusqu'à la section, juste sous la barre ; menu déroulant sur petit écran */
(function(){
  var drop=$('hp-drop'),burg=$('hp-burger');
  function setDrop(open){if(!drop||!burg)return;drop.hidden=!open;burg.setAttribute('aria-expanded',open?'true':'false');topEl.classList.toggle('menu',open);}
  if(burg)burg.addEventListener('click',function(e){e.stopPropagation();setDrop(drop.hidden);});
  document.addEventListener('click',function(e){if(drop&&!drop.hidden&&!drop.contains(e.target))setDrop(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&drop&&!drop.hidden){setDrop(false);burg.focus();}});
  addEventListener('resize',function(){if(innerWidth>1180)setDrop(false);});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey)return;
    if(!a.closest('#hp-top')&&!a.closest('#hp-hero')&&!a.closest('.hp-foot'))return;
    var id=a.getAttribute('href').slice(1),el=id&&document.getElementById(id);if(!el)return;
    e.preventDefault();setDrop(false);goTo(el);
    if(history.replaceState)history.replaceState(null,'','#'+id);
  });
  // la cible est recalculée à chaque image : les fiches au-dessus changent de hauteur pendant le trajet
  var anim=null;
  function want(el){return el.id==='hp-hero'?0:Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,el.getBoundingClientRect().top+scrollY-topEl.getBoundingClientRect().bottom-8));}
  function goTo(el){if(anim)anim.stop=true;
    if(reduce){window.scrollTo(0,want(el));requestAnimationFrame(function(){window.scrollTo(0,want(el));});return;}
    var a={stop:false},from=scrollY,t0=performance.now(),dur=Math.min(1100,450+Math.abs(want(el)-from)*.04);anim=a;
    function cancel(){a.stop=true;}addEventListener('wheel',cancel,{passive:true,once:true});addEventListener('touchstart',cancel,{passive:true,once:true});
    (function f(now){if(a.stop)return;var k=Math.min(1,(now-t0)/dur),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
      window.scrollTo(0,from+(want(el)-from)*e);
      if(k<1)requestAnimationFrame(f);
      else{var n=0;(function settle(){if(a.stop)return;var w=want(el);if(Math.abs(scrollY-w)>2)window.scrollTo(0,w);if(++n<20)requestAnimationFrame(settle);else{anim=null;removeEventListener('wheel',cancel);removeEventListener('touchstart',cancel);}})();}
    })(t0);}
})();
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

/* ── recherche de la barre du haut : toujours visible, synchronisée avec celle de la documentation ── */
(function(){
  var s=$('search'),ts=$('hp-tsearch');if(!ts)return;
  if(!s){ts.parentNode.style.display='none';return;}
  var syncing=false,html=document.documentElement;
  function ph(){var en=(html.lang||'').slice(0,2)==='en';ts.placeholder=en?'Search…':'Rechercher…';ts.setAttribute('aria-label',en?'Search a command':'Rechercher une commande');}
  ph();new MutationObserver(ph).observe(html,{attributes:true,attributeFilter:['lang']});
  function showResults(){var d=$('hp-docs'),bar=$('hp-top');if(!d)return;var r=s.getBoundingClientRect(),h=bar?bar.getBoundingClientRect().bottom:0;
    if(r.top<h||r.bottom>innerHeight*.5)window.scrollTo({top:d.getBoundingClientRect().top+scrollY-h-4,behavior:reduce?'auto':'smooth'});}
  ts.addEventListener('input',function(){if(syncing)return;syncing=true;s.value=ts.value;s.dispatchEvent(new Event('input',{bubbles:true}));syncing=false;if(ts.value)showResults();});
  s.addEventListener('input',function(){if(!syncing&&ts.value!==s.value)ts.value=s.value;});
  ts.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();showResults();}else if(e.key==='Escape'&&ts.value){e.preventDefault();ts.value='';ts.dispatchEvent(new Event('input',{bubbles:true}));}});
  if(s.value)ts.value=s.value;
})();

/* ── taper n'importe où écrit directement dans la recherche (celle de la barre du haut si elle existe) ── */
(function(){
  var s=$('hp-tsearch')||$('search');if(!s||!$('search'))return;
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
    if(s.id==='search'){var r=s.getBoundingClientRect();
      if(r.top<0||r.bottom>innerHeight){var d=$('hp-docs');if(d)window.scrollTo({top:d.getBoundingClientRect().top+scrollY-10,behavior:reduce?'auto':'smooth'});}}
  });
})();

/* ── accueil : mosaïque des modules (compteurs tirés de la page, clic = filtre de la documentation) ── */
(function(){
  var box=$('hp-mods');if(!box)return;
  box.querySelectorAll('[data-count]').forEach(function(b){var n=document.querySelectorAll('[data-n][data-cat="'+b.getAttribute('data-count')+'"]').length;if(n)b.textContent=n;});
  // source = la valeur rendue par le bot dans le panneau Guardian (#gpanel .gbig .n), pas la tuile animée #hp-mastery
  function mastery(){var b=box.querySelector('[data-mastery]'),g=Q('#gpanel .gbig .n'),v=g?parseNum(g.textContent):null;if(b&&v!=null)b.textContent=v+' %';}
  mastery();setInterval(mastery,3000);
  box.querySelectorAll('.hp-mod[data-cat]').forEach(function(a){a.addEventListener('click',function(e){
    var chip=document.querySelector('.navf[data-cat="'+a.getAttribute('data-cat')+'"]'),s=$('search');if(!chip||!s)return;
    e.preventDefault();if(!chip.classList.contains('active'))chip.click();
    s.value=a.getAttribute('data-q')||'';s.dispatchEvent(new Event('input',{bubbles:true}));
    var d=$('hp-docs'),bar=$('hp-top'),h=bar?bar.getBoundingClientRect().bottom:0;
    if(d)window.scrollTo({top:d.getBoundingClientRect().top+scrollY-h-4,behavior:reduce?'auto':'smooth'});});});
  if(!fine||reduce)return;
  box.querySelectorAll('.hp-mod').forEach(function(a){a.addEventListener('pointermove',function(e){var r=a.getBoundingClientRect();a.style.setProperty('--mx',(e.clientX-r.left)+'px');a.style.setProperty('--my',(e.clientY-r.top)+'px');});});
})();

/* ── à propos : chiffres tirés de la page (versions du changelog, fiches de commandes, compteur de serveurs) ── */
(function(){
  var v=$('hp-afig-v'),c=$('hp-afig-c'),s=$('hp-afig-s');if(!v)return;
  var mb=document.querySelector('#hp-news .more[data-count],#moreBtn[data-count]'),n=mb?parseInt(mb.getAttribute('data-count'),10):NaN;
  if(n>0)v.textContent=n+1;   // l'historique + la version en cours
  // Les chiffres viennent des SOURCES du bot (#bServers, #bCmds), jamais des tuiles animées : lire une tuile
  // pendant son décompte 0 → 20 donnait « 9 serveurs protégés ».
  function num(id){var e=$(id);return e?parseNum(e.textContent):null;}
  function upd(){var sv=num('bServers');if(sv!=null)s.textContent=fmt(sv);
    var cm=num('bCmds');c.textContent=fmt(cm!=null?cm:document.querySelectorAll('.cmd[data-n]').length);
    [].slice.call(document.querySelectorAll('.hp-ncmd')).forEach(function(e){e.textContent=c.textContent;});}
  upd();setInterval(upd,3000);
})();

/* ── Guardian AI : un descriptif de chaque statistique au survol (et au clavier, et au toucher) ── */
(function(){
  var panel=$('gpanel');if(!panel)return;
  // clé = libellé français sans emoji ; « Fausses alertes » existe dans deux rubriques, d'où la clé « rubrique|libellé »
  var D={
    'maîtrise globale':['Note d’ensemble de Guardian AI, calculée par le bot à partir de tous ses résultats d’entraînement.','Guardian AI’s overall score, computed by the bot from all of its training results.'],
    'Détection des menaces':['Part des attaques d’entraînement que l’IA a correctement repérées pendant le cycle en cours.','Share of training attacks the AI correctly spotted during the current cycle.'],
    'Épargne les membres sains':['Part des membres honnêtes que l’IA a laissés tranquilles : 100 % veut dire aucun membre sanctionné à tort.','Share of honest members the AI left alone: 100% means no member was punished by mistake.'],
    'Généralisation (cas inédits)':['Réussite sur des cas que l’IA n’avait jamais vus : elle montre si l’IA a compris, et pas seulement mémorisé.','Success on cases the AI had never seen: it shows whether it understood rather than just memorised.'],
    'Exemples étudiés':['Nombre total de situations (attaques et activité normale) sur lesquelles l’IA s’est entraînée.','Total number of situations (attacks and normal activity) the AI has trained on.'],
    'Solutions mémorisées':['Réponses que l’IA a retenues pour les réutiliser face à des situations semblables.','Answers the AI has kept to reuse when similar situations come up.'],
    'Erreurs corrigées (ce cycle)':['Erreurs commises puis corrigées par l’IA pendant le cycle en cours.','Mistakes the AI made and then corrected during the current cycle.'],
    'Règles re-vérifiées':['Règles de sécurité revérifiées à chaque cycle : le premier nombre compte celles qui tiennent toujours.','Security rules re-checked every cycle: the first number counts those that still hold.'],
    'Difficulté (niveau)':['Niveau des attaques d’entraînement : il monte à mesure que l’IA progresse.','Level of the training attacks: it goes up as the AI improves.'],
    'Attaques déjouées':['Part des attaques stoppées face à un adversaire simulé qui cherche exprès les failles de l’IA.','Share of attacks stopped against a simulated adversary that deliberately hunts for the AI’s weak spots.'],
    'adv|Fausses alertes':['Fois où l’IA a cru voir une attaque pendant le jeu adverse alors qu’il n’y en avait pas.','Times the AI thought it saw an attack during the adversarial game when there was none.'],
    'Angles morts découverts':['Failles trouvées par l’adversaire simulé : autant de cas que l’IA doit encore apprendre à couvrir.','Weak spots found by the simulated adversary: cases the AI still has to learn to cover.'],
    'Précision réelle':['Réussite sur un lot de cas jamais vus, testé à part de l’entraînement : c’est la mesure la plus honnête.','Success on a batch of never-seen cases, tested apart from training: the most honest measure.'],
    'Gain vs base initiale':['Points de précision gagnés depuis la toute première version de l’IA.','Accuracy points gained since the very first version of the AI.'],
    'off|Fausses alertes':['Membres honnêtes que l’IA aurait signalés à tort, sur le lot de test.','Honest members the AI would have flagged by mistake, on the test batch.'],
    'Menaces ratées':['Attaques que l’IA a laissé passer, sur le lot de test.','Attacks the AI let through, on the test batch.']
  };
  var EN2FR={};   // libellés anglais affichés → clé française
  [['overall mastery','maîtrise globale'],['Threat detection','Détection des menaces'],['Spares legitimate members','Épargne les membres sains'],['Generalization (novel cases)','Généralisation (cas inédits)'],['Examples studied','Exemples étudiés'],['Solutions memorized','Solutions mémorisées'],['Errors fixed (this cycle)','Erreurs corrigées (ce cycle)'],['Rules re-checked','Règles re-vérifiées'],['Difficulty (level)','Difficulté (niveau)'],['Attacks foiled','Attaques déjouées'],['False alarms','Fausses alertes'],['Blind spots found','Angles morts découverts'],['Actual accuracy','Précision réelle'],['Gain vs initial baseline','Gain vs base initiale'],['Missed threats','Menaces ratées']].forEach(function(x){EN2FR[x[0].toLowerCase()]=x[1];});
  function clean(s){return String(s).replace(/^[^A-Za-zÀ-ÿ]+/,'').trim();}
  var tip=document.createElement('div');tip.className='hp-gtip';tip.id='hp-gtip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
  var cur=null,shownAt=0;
  function show(el){var t=el.getAttribute('data-tip');if(!t)return;if(cur!==el)shownAt=Date.now();cur=el;tip.textContent=t;tip.hidden=false;el.setAttribute('aria-describedby','hp-gtip');
    var r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,x=Math.max(10,Math.min(innerWidth-w-10,r.left+r.width/2-w/2)),y=r.top-h-10,below=y<70;
    if(below)y=r.bottom+10;tip.classList.toggle('below',below);tip.style.left=x+'px';tip.style.top=y+'px';
    tip.style.setProperty('--ax',Math.max(14,Math.min(w-14,r.left+r.width/2-x))+'px');}
  function hide(){if(cur)cur.removeAttribute('aria-describedby');cur=null;tip.hidden=true;}
  function annotate(){var en=lang()==='en',sec='';
    [].slice.call(panel.querySelectorAll('.gsec,.gstat,.gbig')).forEach(function(el){
      if(el.classList.contains('gsec')){var t=el.getAttribute('data-en')||el.textContent;sec=/adverse|Adversarial/i.test(t+el.textContent)?'adv':/hors-ligne|Offline/i.test(t+el.textContent)?'off':'';return;}
      var lab=el.classList.contains('gbig')?el.querySelector('.l'):el.querySelector('.k');if(!lab)return;
      var k=clean(lab.textContent);k=EN2FR[k.toLowerCase()]||k;
      var d=D[sec+'|'+k]||D[k];if(!d){el.removeAttribute('data-tip');return;}
      el.setAttribute('data-tip',d[en?1:0]);el.classList.add('hp-tipped');if(!el.hasAttribute('tabindex'))el.tabIndex=0;});}
  panel.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('.hp-tipped');if(el&&el!==cur)show(el);});
  panel.addEventListener('mouseleave',hide);
  panel.addEventListener('mouseout',function(e){var el=e.target.closest&&e.target.closest('.hp-tipped');if(el&&!el.contains(e.relatedTarget))hide();});
  panel.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('.hp-tipped');if(el)show(el);});
  panel.addEventListener('focusout',hide);
  // au toucher, le navigateur envoie un survol PUIS un clic : on n'efface pas ce qui vient de s'ouvrir
  panel.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.hp-tipped');if(!el)return;if(cur===el&&Date.now()-shownAt>400)hide();else show(el);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&cur)hide();});
  addEventListener('scroll',function(){if(cur)hide();},{passive:true});
  annotate();new MutationObserver(function(){annotate();}).observe(panel,{childList:true,subtree:true});
  new MutationObserver(function(){annotate();if(cur)show(cur);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
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

/* (plus de visuel 3D : l ancien code WebGL et three.js ont été retirés) */
})();
