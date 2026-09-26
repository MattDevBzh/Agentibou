'use strict';
const updateStatus=document.querySelector('#update-status'),checkButton=document.querySelector('#check-updates'),installButton=document.querySelector('#install-update');
function showUpdate(state){
 if(!state)return;
 document.querySelector('#update-version').textContent='Agentibou '+state.currentVersion;
 const labels={idle:'Recherche automatique au démarrage, puis toutes les 6 heures.',development:'Mises à jour disponibles dans la version installée.',checking:'Recherche d’une nouvelle version…',current:'Tu utilises la dernière version disponible.',downloading:`Téléchargement de la version ${state.version} : ${state.progress||0} %`,ready:`La version ${state.version} est prête. Tes préférences seront conservées.`,manual:`La version ${state.version} est disponible. Télécharge-la pour remplacer l’application.`,installing:'Installation de la mise à jour…',error:'Vérification ou téléchargement impossible. Réessaie plus tard.'};
 updateStatus.textContent=labels[state.status]||labels.idle;
 checkButton.disabled=['development','checking','downloading','ready','installing'].includes(state.status);
 installButton.classList.toggle('hidden',!['ready','manual'].includes(state.status));
 installButton.textContent=state.status==='manual'?'Télécharger la nouvelle version ↗':'Redémarrer pour installer';
}
window.agentibou.onUpdateState(showUpdate);window.agentibou.getUpdateState().then(showUpdate);
checkButton.onclick=async()=>showUpdate(await window.agentibou.checkUpdates());
installButton.onclick=async()=>{installButton.disabled=true;try{showUpdate(await window.agentibou.installUpdate());}finally{installButton.disabled=false;}};
