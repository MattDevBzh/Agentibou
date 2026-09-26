'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/sprite.js'),'utf8');
function fixture(systemReduced){
 const media={matches:systemReduced},element={style:{},dataset:{},setAttribute(){}};
 const context={window:{},matchMedia:()=>media,setInterval:()=>0};
 vm.runInNewContext(source,context);
 return {sprite:new context.window.VicSprite(element),element,media};
}
test('explicit animation preference overrides system reduction in every state',()=>{
 for(const state of ['idle','thinking','working','done','waiting','error']){
  const {sprite,element}=fixture(true),positions=new Set();
  sprite.set(state,false);
  for(let i=0;i<32;i++){sprite.paint();positions.add(element.style.backgroundPosition);sprite.set(state,false);}
  assert.ok(positions.size>1,`${state} must animate even when Windows requests reduced motion`);
 }
});
test('system default follows live OS changes and explicit reduction remains still',()=>{
 const {sprite,element,media}=fixture(true);
 for(const preference of [undefined,null,true]){
  sprite.set('working',preference);const first=element.style.backgroundPosition;
  for(let i=0;i<8;i++)sprite.paint();
  assert.equal(element.style.backgroundPosition,first);
 }
 sprite.set('working',null);media.matches=false;
 const first=element.style.backgroundPosition;sprite.paint();assert.notEqual(element.style.backgroundPosition,first);
 sprite.set('working',true);const reduced=element.style.backgroundPosition;
 sprite.paint();assert.equal(element.style.backgroundPosition,reduced);
});
