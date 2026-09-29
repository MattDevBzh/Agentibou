'use strict';
const PET_PROVIDERS=['idle','codex','claude','copilot','copilot-cli','visualstudio'];
function petPreference(settings,provider){
 const value=settings.petAppearance?.[provider];
 return {scale:Number.isFinite(value?.scale)?Math.max(.6,Math.min(1.5,Math.round(value.scale*100)/100)):1,hidden:value?.hidden===true};
}
// Logical CSS dimensions plus physical window dimensions. Keep the character
// anchored while lists grow and reserve scrollable room on small screens.
function petLayout(conversations,usageRows,availableHeight=900,requestedScale=1,availableWidth=Infinity){
 const scale=Math.min(Math.max(.6,Math.min(1.5,requestedScale)),availableWidth/300,availableHeight/240);
 const extra=Math.max(0,Math.floor(availableHeight/scale)-240);
 const topHeight=Math.min(conversations*58,232,Math.floor(extra*.75));
 const bottomHeight=usageRows?Math.min(48,extra-topHeight):0;
 return {width:Math.ceil(300*scale),height:Math.ceil((240+topHeight+bottomHeight)*scale),topHeight,bottomHeight,scale};
}
module.exports={petLayout,petPreference,PET_PROVIDERS};
