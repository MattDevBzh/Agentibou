const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('agentibou',{
 getUpdateState:()=>ipcRenderer.invoke('get-update-state'),checkUpdates:()=>ipcRenderer.invoke('check-updates'),installUpdate:()=>ipcRenderer.invoke('install-update'),onUpdateState:fn=>ipcRenderer.on('update-state',(_,state)=>fn(state)),
 restorePets:()=>ipcRenderer.invoke('restore-pets'),
 petAppearance:(provider,value)=>ipcRenderer.invoke('pet-appearance',provider,value),
 dismissConversation:(key,at)=>ipcRenderer.invoke('dismiss-conversation',key,at),importCompanion:name=>ipcRenderer.invoke('import-companion',name),selectCompanions:value=>ipcRenderer.invoke('select-companions',value),openSession:(key,at)=>ipcRenderer.invoke('open-session',key,at),movePet:(x,y)=>ipcRenderer.invoke('move-pet',x,y),getState:()=>ipcRenderer.invoke('get-state'),showPanel:()=>ipcRenderer.invoke('panel'),togglePet:()=>ipcRenderer.invoke('toggle-pet'),demo:state=>ipcRenderer.invoke('demo',state),preferences:value=>ipcRenderer.invoke('preferences',value),install:kind=>ipcRenderer.invoke('install',kind),clearSession:key=>ipcRenderer.invoke('clear-session',key),openFolder:()=>ipcRenderer.invoke('open-folder'),
 onState:fn=>ipcRenderer.on('state',(_,s)=>fn(s)),onDemo:fn=>ipcRenderer.on('demo',(_,s)=>fn(s))
});
