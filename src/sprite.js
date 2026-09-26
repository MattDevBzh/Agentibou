'use strict';
// Vic's existing legacy atlas is 8 columns × 9 rows. Never step through empty cells.
window.VicSprite=class {
 constructor(element){this.companion={id:'vic',name:'Vic'};this.element=element;this.state='idle';this.reduced=null;this.frame=0;this.tick=0;this.timer=setInterval(()=>this.paint(),160);this.paint();}
 use(companion){if(!companion)return;if(this.companion.id!==companion.id){this.frame=0;this.element.style.backgroundImage='url("'+companion.imageUrl+'")';}this.companion=companion;this.element.dataset.companionId=companion.id;}
 set(state,reduced=null){if(state!==this.state){this.frame=0;this.tick=0;}this.state=state;this.reduced=reduced;this.paint(false);}
 paint(advance=true){
  const sequences={idle:{row:0,frames:[0,0,0,0,1,0,0,2,3,4,5,0,0,0,0,0]},thinking:{row:8,frames:[0,0,1,1,2,2,3,3,4,4,5,5]},working:{row:7,frames:[0,1,2,3,4,5]},done:{row:4,frames:[0,1,2,3,4,0,0,0]},waiting:{row:8,frames:[0,0,1,1,2,2,3,3,4,4,5,5]},error:{row:5,frames:[2,2,3,3,4,4]}};
  const seq=sequences[this.state]||sequences.idle;const reduced=this.reduced??matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(advance&&!reduced)this.frame++;
  const col=reduced?seq.frames[0]:seq.frames[this.frame%seq.frames.length];
  this.element.style.backgroundPosition=(-col*192)+'px '+(-seq.row*208)+'px';
  this.element.setAttribute('aria-label',this.companion.name+' · '+({idle:'au repos',thinking:'en réflexion',working:'au travail',done:'célèbre la fin de réponse',waiting:'en attente',error:'a rencontré une erreur'}[this.state]||'au repos'));
 }
};
