'use strict';
const crypto=require('node:crypto');
const H=require('../.github/html-scripts');
const BLOCK="/* hp:shortcuts-accessibility:v2 */\n(function(){var ov2=null,back=null,closeButton=null;\n function focusable(node){\n  if(!node||typeof node.focus!=='function'||node.isConnected===false||node.disabled)return false;\n  try{var style=getComputedStyle(node);\n   if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0)return false;\n   return [].some.call(node.getClientRects(),function(rect){return rect.width>0&&rect.height>0;});\n  }catch(e){return false;}\n }\n function close(){if(!ov2)return;var target=back;back=null;ov2.remove();ov2=null;closeButton=null;\n  if(!focusable(target))target=document.getElementById('search');\n  if(focusable(target))try{target.focus({preventScroll:true});}catch(e){}\n }\n function open(){if(ov2)return;back=document.activeElement;var EN=curLang()==='en';\n  ov2=el('div','kbov');var box=el('div','kbbox');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',EN?'Keyboard shortcuts':'Raccourcis clavier');\n  box.appendChild(el('div','kbt',EN?'⌨️ Keyboard shortcuts':'⌨️ Raccourcis clavier'));\n  [['/',EN?'focus the search':'aller à la recherche'],\n   ['Ctrl+K',EN?'quick command palette':'palette de commandes rapide'],\n   [EN?'Esc':'Échap',EN?'close panels · clear the search':'fermer les panneaux · vider la recherche'],\n   [EN?'Enter':'Entrée',EN?'open the focused card':'ouvrir la carte sélectionnée'],\n   ['?',EN?'this panel':'ce panneau']].forEach(function(row){\n    var line=el('div','kbrow');line.appendChild(el('kbd',null,row[0]));line.appendChild(el('span',null,row[1]));box.appendChild(line);\n   });\n  closeButton=el('button','langbtn kbclose',EN?'Close':'Fermer');closeButton.type='button';closeButton.addEventListener('click',close);box.appendChild(closeButton);\n  ov2.appendChild(box);ov2.addEventListener('click',function(event){if(event.target===ov2)close();});\n  document.body.appendChild(ov2);closeButton.focus({preventScroll:true});\n }\n document.addEventListener('keydown',function(event){\n  if(ov2){\n   event.stopImmediatePropagation();\n   if(event.key==='Escape'){event.preventDefault();close();}\n   else if(event.key==='Tab'){event.preventDefault();closeButton.focus({preventScroll:true});}\n   return;\n  }\n  var sim=document.getElementById('ov');\n  if(event.key==='?'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/^(input|textarea|select)$/i.test((event.target&&event.target.tagName)||'')&&!(sim&&sim.classList.contains('open'))){event.preventDefault();event.stopImmediatePropagation();open();}\n },true);\n})();";
function apply(html){
 const original=H.theInlineScript(html),marker='/* hp:shortcuts-accessibility:v2 */';
 if(original.includes(marker)){if(!original.includes(BLOCK))throw Error('Shortcuts marker without expected implementation');return html;}
 const anchor='(function(){var ov2=null;';
 const bodies=[...String(html).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].filter(match=>H.normalize(match[1])===original);
 if(bodies.length!==1)throw Error('Unique raw inline script required');
 const body=bodies[0][1],start=body.indexOf(anchor),end=body.indexOf('})();',start)+5;
 if(start<0||body.indexOf(anchor,start+1)!==-1||end<start)throw Error('Unique shortcuts block required');
 const ending=body.includes('\r\n')?'\r\n':'\n';
 const nextBody=body.slice(0,start)+BLOCK.replace(/\n/g,()=>ending)+body.slice(end);
 const before=crypto.createHash('sha256').update(original).digest('base64'),after=crypto.createHash('sha256').update(H.normalize(nextBody)).digest('base64');
 const oldToken="'sha256-"+before+"'";
 if(html.split(oldToken).length!==2)throw Error('Unique original CSP authorization required');
 return html.replace(body,()=>nextBody).replace(oldToken,"'sha256-"+after+"'");
}
module.exports={apply};
