'use strict';
const character=document.querySelector('.sprite'),sprite=new VicSprite(character);
const names={codex:'Codex',claude:'Claude Code',copilot:'Copilot · VS Code',visualstudio:'Visual Studio'};
const labels={thinking:'◌ Réflexion',working:'⌨ Code en cours',done:'✓ Terminée · ouvrir ↗',waiting:'◷ En attente',error:'! Erreur'};
let current={state:'idle',settings:{},conversations:[],projects:[]},demo=null,demoTimer,feedbackTimer;
const rows=new Map(),busy=new Set();
function render(s){
 current=s;sprite.use(s.companion);sprite.set(demo||s.state,s.settings.reducedMotion);
 character.title='Glisser pour déplacer '+(s.companion?.name||'le compagnon');const idleStatus=document.querySelector('#idle-status');idleStatus.hidden=!!demo||!!s.conversations?.length||!names[s.provider];idleStatus.textContent=(names[s.provider]||'')+' · Au repos';
 const preference=s.petControls?.find(p=>p.provider===s.provider);document.documentElement.style.setProperty('--pet-scale',s.petLayout?.scale||1);document.querySelector('#shrink-pet').disabled=(preference?.scale||1)<=.6;document.querySelector('#grow-pet').disabled=(preference?.scale||1)>=1.5;
 document.documentElement.style.setProperty('--top-height',(s.petLayout?.topHeight||0)+'px');document.documentElement.style.setProperty('--bottom-height',(s.petLayout?.bottomHeight||0)+'px');
 const container=document.querySelector('#conversations'),visible=new Set();
 for(const e of s.conversations||[]){visible.add(e.key);let row=rows.get(e.key);
  if(!row){row=document.createElement('div');row.className='conversation';row.setAttribute('role','listitem');row.dataset.key=e.key;const open=document.createElement('button'),title=document.createElement('span'),status=document.createElement('span'),dismiss=document.createElement('button');open.className='conversation-open';title.className='conversation-title';status.className='conversation-status';dismiss.className='conversation-dismiss';dismiss.textContent='×';open.append(title,status);row.append(open,dismiss);open.onclick=()=>act(row.event,false);dismiss.onclick=()=>act(row.event,true);rows.set(e.key,row);container.append(row);}
  row.event=e;row.dataset.state=e.state;const [open,dismiss]=row.children;const title=names[e.provider]+' · '+e.project;open.firstChild.textContent=title;open.lastChild.textContent=(e.stale?'◷ Signal ancien · à vérifier':labels[e.state])+' · '+e.session.slice(-6);open.title=e.state==='done'?(e.destination?.label||'Ouvrir')+' · '+title+' · '+e.session:title+' · '+e.session;open.disabled=e.state!=='done'||!!demo||busy.has(e.key);dismiss.hidden=e.state!=='done';dismiss.disabled=!!demo||busy.has(e.key);dismiss.title='Fermer cette bulle';dismiss.setAttribute('aria-label','Fermer la bulle '+title+' · '+e.session.slice(-6));
 }
 for(const [key,row] of rows)if(!visible.has(key)){row.remove();rows.delete(key);}
 const usage=document.querySelector('#usage'),values=document.querySelector('#usage-values');usage.hidden=!s.usage?.length;values.replaceChildren();
 for(const item of s.usage||[]){const span=document.createElement('span');span.className='usage-metric';span.dataset.key=item.key;span.classList.toggle('stale',item.stale);const value=item.unit==='tokens'?new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1}).format(item.value)+' tokens':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(item.value)+' %';span.textContent=item.label+' '+value;span.title=item.source+(item.session?' · '+(item.project||'Conversation')+' · '+item.session.slice(-6):'')+' · Relevé le '+new Date(item.at).toLocaleString('fr-FR')+(item.resetAt?' · Réinitialisation le '+new Date(item.resetAt).toLocaleString('fr-FR'):'');values.append(span);}
 const observed=document.querySelector('#usage-observed');const quota=(s.usage||[]).filter(e=>e.unit==='percent');const oldest=quota.length?Math.min(...quota.map(e=>e.at)):null;observed.textContent=oldest?'Quota compte · relevé '+new Date(oldest).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';observed.hidden=!oldest;

}
async function act(event,dismiss){if(!event||demo||busy.has(event.key)||event.state!=='done')return;busy.add(event.key);render(current);try{const r=await(dismiss?window.agentibou.dismissConversation(event.key,event.at):window.agentibou.openSession(event.key,event.at));if(r.error){const box=document.querySelector('#feedback');box.textContent=r.error;box.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>box.hidden=true,8000);}}finally{busy.delete(event.key);render(current);}}
let drag=null;
character.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.screenX,y:e.screenY,position:current.petPosition||[0,0]};character.setPointerCapture(e.pointerId);});
character.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.screenX-drag.x,dy=e.screenY-drag.y;if(Math.hypot(dx,dy)>5)window.agentibou.movePet(drag.position[0]+dx,drag.position[1]+dy);});
character.addEventListener('pointerup',()=>drag=null);character.addEventListener('pointercancel',()=>drag=null);
window.agentibou.onState(render);window.agentibou.getState().then(render);window.agentibou.onDemo(state=>{demo=state;clearTimeout(demoTimer);if(state)demoTimer=setTimeout(()=>{demo=null;render(current);},12000);render(current);});document.querySelector('#open-panel').onclick=()=>window.agentibou.showPanel();

for(const [id,delta] of [['shrink-pet',-.1],['grow-pet',.1]])document.getElementById(id).onclick=()=>{const scale=current.petControls?.find(p=>p.provider===current.provider)?.scale||1;window.agentibou.petAppearance(current.provider,{scale:Math.max(.6,Math.min(1.5,Math.round((scale+delta)*100)/100))});};
document.querySelector('#hide-pet').onclick=()=>window.agentibou.petAppearance(current.provider,{hidden:true});
