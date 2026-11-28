'use strict';
const crypto=require('node:crypto'),H=require('../.github/html-scripts');
function apply(html){
 let script=H.theInlineScript(html);const original=script;
 function replace(name,transform){const old=H.extractFunction(script,name);script=script.replace(old,transform(old));}
 replace('splitForms',old=>old.replace("if(c==='|'&&d===0&&", "if((c==='|'||c==='·'||c==='•')&&d===0&&"));
 replace('exFor',()=>String.raw`function exFor(tok){var t=tok.toLowerCase(),en=curLang()==='en';
 if(FLAG.test(t)||/^(full|status|create|save|preview|info)$/.test(t))return t;
 if(/membre2|member2|cible2|target2|user2/.test(t))return '@Alex';
 if(/membre|member|user|utilisateur|pseudo|cible|target|@/.test(t))return '@Jean';
 if(/salon|channel|#/.test(t))return en?'#general':'#général';
 if(/r[oô]le/.test(t))return en?'@Member':'@Membre';
 if(/jours|days/.test(t))return '14';
 if(/dur[ée]|duree|duration|temps|time|delai|délai|delay|minutes/.test(t))return '10m';
 if(/n°|numero|numéro|number|nombre|montant|amount|prix|price|quantit|count|^nb|xp|niveau|level|gagnant|mise|pari|strikes/.test(t))return '5';
 if(/raison|motif|reason/.test(t))return en?'repeated spam':'spam répété';
 if(/message|texte|text|contenu|content|annonce|lot|titre|title|sujet/.test(t))return en?'Hello everyone!':'Bonjour à tous !';
 if(/lien|link|url|invit/.test(t))return 'https://example.com';
 if(/\bid\b|identifiant/.test(t))return '123456789012345678';
 if(/emoji/.test(t))return '🎉';
 if(/couleur|color|hex/.test(t))return '#5865F2';
 if(/prefix|préfixe|prefixe/.test(t))return '!';
 if(/mot|word|terme/.test(t))return en?'scam':'arnaque';
 return en?'example':'exemple';}`);
 replace('parseParams',old=>old.replace("var first=splitForms(usage||'')[0].trim();",String.raw`var first=splitForms(usage||'')[0].trim().replace(/\s{2,}\((?:ou|or|réponds|reply)\b[\s\S]*$/i,'').replace(/\b(on|enable|add)\/(off|disable|remove)\b/g,'$1|$2');`));
 replace('botReply',old=>{
  old=old.replace(/\n \/\/ hp:simulation-contracts:start[\s\S]*?\n \/\/ hp:simulation-contracts:end\n/,'');
  const start=old.indexOf('\n',old.indexOf(' var who='));if(start<0)throw Error('botReply prelude changed');
  const priority=String.raw`
 // hp:simulation-contracts:start
 var act=params.length?String(params[0].ex||'').toLowerCase():'',words=params.map(function(p){return String(p.ex||'').toLowerCase();}).join(' ');
 if(/^quarantine$/.test(n)){
  if(/^(on|off)$/.test(act))return ['🚷',en?'Quarantine module':'Module quarantaine',en?'Automatic quarantine module setting: **'+act+'**. This does not isolate a member by itself.':'Réglage du module automatique de quarantaine : **'+act+'**. Cette action n’isole pas un membre à elle seule.'];
  if(/^@|^\d{17,20}$/.test(act))return ['🚷',en?'Manual quarantine':'Quarantaine manuelle',en?'Local isolation requested for '+who+'. The result distinguishes confirmed isolation from a **partial** outcome.':'Isolement local demandé pour '+who+'. Le résultat distingue un isolement confirmé d’un résultat **partiel**.'];
  return ['📋',en?'Quarantine list':'Liste de quarantaine',en?'Shows the **list** of quarantined members on this server; no new member is isolated.':'Affiche la **liste** des membres en quarantaine sur ce serveur ; aucun nouveau membre n’est isolé.'];
 }
 if(/^backup$/.test(n)){
  if(!params.length)return ['💾',en?'Backup menu':'Menu des sauvegardes',en?'Opens the backup **menu** to choose a scope and action.':'Ouvre le **menu** des sauvegardes pour choisir un périmètre et une action.'];
  if(/\b(list|info|preview|restore|load)\b/.test(words))return ['💾',en?'Backup management':'Gestion des sauvegardes',en?'Shows or prepares the requested backup action. A restoration requires its confirmation and reports any failures.':'Consulte ou prépare l’action de sauvegarde demandée. Une restauration exige sa confirmation et rapporte ses échecs.'];
  if(/\broles\b/.test(words))return ['💾',en?'Roles and channels backup':'Sauvegarde rôles et salons',en?'Saves roles and channels, **without the bot settings**. Existing messages are a separate scope.':'Sauvegarde les rôles et les salons, **sans les réglages du bot**. Les messages existants relèvent d’un autre périmètre.'];
  if(/\b(messages|msg)\b/.test(words))return ['💬',en?'Message archive':'Archive de messages',en?'Prepares a message archive within the selected limits.':'Prépare une archive des messages dans les limites choisies.'];
  return ['💾',en?'Server backup':'Sauvegarde serveur',en?'Saves the server structure and bot settings within the full backup scope.':'Sauvegarde la structure du serveur et les réglages du bot dans le périmètre complet.'];
 }
 if(/^voicexp$/.test(n))return ['🎙️',en?'Voice XP settings':'Réglages XP vocal',en?(act==='off'?'Voice XP is disabled.':act==='on'?'Voice XP is enabled; eligibility and configured bonuses still apply.':'Shows the current Voice XP status and eligibility rules.'):(act==='off'?'L’XP vocal est désactivé.':act==='on'?'L’XP vocal est activé ; les conditions et bonus configurés continuent de s’appliquer.':'Affiche l’état actuel de l’XP vocal et ses règles d’éligibilité.')];
 if(/^shop$/.test(n))return ['🛒',en?'Aura shop':'Boutique Aura',en?'Shows the Aura catalogue or prepares the explicit catalogue action. Opening the shop does not confirm a purchase.':'Affiche le catalogue Aura ou prépare l’action explicite sur le catalogue. Ouvrir la boutique ne confirme aucun achat.'];
 if(/^find$/.test(n))return ['🔍',en?'Voice location':'Localisation vocale',en?'Checks the requested member’s voice state; access to this command is owner-only. This preview does not locate anyone on a real server.':'Consulte l’état vocal du membre demandé ; l’accès à cette commande est réservé aux owners. Cet aperçu ne localise personne sur un serveur réel.'];
 if(/^diag$/.test(n))return ['🔍',en?'Diagnostic checks':'Contrôles de diagnostic',en?'Runs diagnostic checks; the result reports actual warnings and errors rather than guaranteeing an all-green server.':'Lance les contrôles de diagnostic ; le résultat rapporte les avertissements et erreurs réels sans garantir un serveur entièrement au vert.'];
 if(/^permissiondiff$/.test(n))return ['🔎',en?'Permission comparison':'Comparaison des permissions',en?'Compares effective permissions of the two targets without changing their roles or access.':'Compare les permissions effectives des deux cibles sans modifier leurs rôles ni leurs accès.'];
 if(/^growth$/.test(n)){var days=get(/jours|days/)||'14';return ['📈',en?'Growth':'Croissance',en?'Shows joins and leaves over '+days+' days.':'Affiche les arrivées et départs sur '+days+' jours.'];}
 // hp:simulation-contracts:end
`;
  return old.slice(0,start)+priority+old.slice(start);
 });
 const raw=[...String(html).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].filter(m=>H.normalize(m[1])===original);
 if(raw.length!==1)throw Error('Unique raw inline script not found');
 const beforeHash=crypto.createHash('sha256').update(original).digest('base64'),afterHash=crypto.createHash('sha256').update(script).digest('base64');
 if(!html.includes("'sha256-"+beforeHash+"'"))throw Error('Original inline script is not authorized by CSP');
 return html.replace(raw[0][1],()=>script).replace("'sha256-"+beforeHash+"'","'sha256-"+afterHash+"'");
}
module.exports={apply};
