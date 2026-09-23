import {cp,mkdir,rm,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const portal=new URL('../',import.meta.url);
const site=new URL('../../Host site/public/',import.meta.url);
try{await stat(site);}catch{throw new Error('Host site/public is required beside Host portal to export the teaser preview.');}
const destination=new URL('portal-preview/',site);
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
await cp(new URL('dist/',portal),destination,{recursive:true});
console.log(`Portal preview copied to ${fileURLToPath(destination)}`);
