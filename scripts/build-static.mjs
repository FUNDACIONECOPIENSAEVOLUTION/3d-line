// Cloudflare Pages Free: publish only the resources needed by the web game.
// This directory is intentionally different from the root GitHub Pages deploy.
// Avoid copying historical HTML, setup files, private scripts, tests or project docs.
import fs from 'node:fs';
import path from 'node:path';
const folder='dist';
const allowed=[
 'index.html','styles.css','game.js','auth.js','ads-config.json',
 'ads-rewarded.js','rewards.js','turn-modes.js','version.json',
 'privacy.html','_headers'
];
fs.rmSync(folder,{recursive:true,force:true});
fs.mkdirSync(folder,{recursive:true});
for(const file of allowed){
 if(!fs.existsSync(file))throw new Error('Missing required public asset: '+file);
 fs.copyFileSync(file,path.join(folder,file));
}
for(const forbidden of ['AGENTS.md','SECURITY.md','.gitignore','README.md',
  'firebase-admob-site','auth-config.json','3_line_ar_v50_0_commercial_edition.html',
  'tests','docs','scripts','package.json','.github']){
 if(fs.existsSync(path.join(folder,forbidden)))throw new Error('Unsafe artifact: '+forbidden);
}
console.log('3 LINE-AR isolated Cloudflare Pages build:',folder);
