'use strict';
const {spawnSync}=require('node:child_process');
const signed=['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'].every(k=>!!process.env[k]);
const env={...process.env};if(!signed){for(const k of ['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'])delete env[k];env.CSC_IDENTITY_AUTO_DISCOVERY='false';}
const args=[require.resolve('electron-builder/cli.js'),'--mac','dmg','zip','--arm64','--publish','never','-c.extraMetadata.agentibouUpdates.macSigned='+signed];
if(signed)args.push('-c.mac.notarize=true');
console.log(signed?'Building signed and notarized Mac release.':'Building unsigned Mac beta: manual update notifications.');
const r=spawnSync(process.execPath,args,{stdio:'inherit',env});if(r.error)throw r.error;process.exitCode=r.status??1;
