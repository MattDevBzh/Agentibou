'use strict';
const sprite=document.querySelector('#demo-sprite');
const states={idle:{row:0,frames:[0,0,0,0,1,0,0,2,3,4,5,0,0,0,0,0],label:'au repos',title:'Un instant de calme',detail:'profite de la pause. Le prochain défi arrive.'},thinking:{row:8,frames:[0,0,1,1,2,2,3,3,4,4,5,5],label:'en réflexion',title:'L’agent réfléchit',detail:'cherche aussi. Les bonnes idées prennent leur temps.'},working:{row:7,frames:[0,1,2,3,4,5],label:'au travail',title:'L’agent est au travail',detail:'aussi. Chacun sa spécialité.'},done:{row:4,frames:[0,1,2,3,4,0,0,0],label:'a terminé',title:'La réponse est prête',detail:'célèbre ! À toi de regarder le résultat.'}};
let state='working',companion='vic',frame=0,paused=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const name=()=>companion==='vic'?'Vic':'Toktokette';
const text=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
function paint(){if(!sprite)return;const seq=states[state];const col=seq.frames[frame%seq.frames.length];sprite.style.backgroundPosition=`${-col*192}px ${-seq.row*208}px`;}
function update(){if(!sprite)return;frame=0;sprite.classList.toggle('toktokette',companion==='toktokette');sprite.setAttribute('aria-label',`${name()} ${states[state].label}`);text('#pet-name',name());text('#pet-state',states[state].label);text('#agent-status',states[state].title);text('#agent-detail',`${name()} ${states[state].detail}`);document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));document.querySelectorAll('[data-companion]').forEach(b=>{const active=b.dataset.companion===companion;b.setAttribute('aria-pressed',String(active));const badge=b.querySelector('.selection-badge');if(badge)badge.textContent=active?'En démo ↗':'Essayer ↗';});document.body.dataset.animation=state;paint();}
document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{state=b.dataset.state;update();}));
document.querySelectorAll('[data-companion]').forEach(b=>b.addEventListener('click',()=>{companion=b.dataset.companion;update();text('#companion-announcement',`${name()} est dans la démo. Utilise les boutons Repos, Réflexion, Travail et Terminé pour essayer ses animations.`);}));
const pause=document.querySelector('#pause-animation');
function syncPause(){const stopped=paused||reduced.matches;document.body.classList.toggle('paused',stopped);if(pause){pause.setAttribute('aria-pressed',String(stopped));pause.setAttribute('aria-label',reduced.matches?'Animations réduites selon les préférences du système':paused?'Reprendre les animations':'Mettre les animations en pause');pause.textContent=stopped?'▶':'Ⅱ';}if(stopped){frame=0;paint();}}
pause?.addEventListener('click',()=>{if(reduced.matches)return;paused=!paused;syncPause();});
reduced.addEventListener('change',syncPause);
setInterval(()=>{if(!paused&&!reduced.matches&&!document.hidden){frame++;paint();}},160);
function revealAnchor(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(target?.tagName==='DETAILS'){target.open=true;target.scrollIntoView({block:'start'});}}
window.addEventListener('hashchange',revealAnchor);revealAnchor();update();syncPause();
