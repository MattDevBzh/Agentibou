'use strict';
const {spawnSync}=require('node:child_process');
const signed=['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'].every(k=>!!process.env[k]);
const env={...process.env};if(!signed){for(const k of ['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'])delete env[k];env.CSC_IDENTITY_AUTO_DISCOVERY='false';}
const args=[require.resolve('electron-builder/cli.js'),'--mac','dmg','zip','--arm64','--publish','never','-c.extraMetadata.agentibouUpdates.macSigned='+signed];
if(signed)args.push('-c.mac.notarize=true');
else args.push('-c.mac.identity=-','-c.mac.notarize=false');
console.log(signed?'Building signed and notarized Mac release.':'Building ad-hoc signed Mac beta (not Apple notarized): manual update notifications.');
const r=spawnSync(process.execPath,args,{stdio:'inherit',env});if(r.error)throw r.error;process.exitCode=r.status??1;
if(r.status===0){const verified=spawnSync(process.execPath,[require.resolve('./verify-mac-release.cjs')],{stdio:'inherit',env});if(verified.error)throw verified.error;process.exitCode=verified.status??1;}
