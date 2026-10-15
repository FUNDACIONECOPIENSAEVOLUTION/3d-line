import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const hosting=join(root,'firebase-admob-site');
const read=path=>readFile(join(hosting,path),'utf8');

test('Firebase Hosting apunta exclusivamente al proyecto d-line-g',async()=>{
 const rc=JSON.parse(await read('.firebaserc'));
 const conf=JSON.parse(await read('firebase.json'));
 assert.equal(rc.projects.default,'d-line-g');
 assert.equal(conf.hosting.site,'d-line-g');
 assert.equal(conf.hosting.public,'public');
 assert.equal(conf.hosting.rewrites,undefined);
 assert.equal(conf.firestore,undefined);
 assert.equal(conf.functions,undefined);
 assert.equal(conf.auth,undefined);
});
test('portal de desarrollador contiene el enlace real a 3 LINE-AR',async()=>{
 const html=await read('public/index.html');
 assert.match(html,/3 LINE/);
 assert.match(html,/https:\/\/fundacionecopiensaevolution\.github\.io\/3d-line\//);
 assert.match(html,/https:\/\/github\.com\/FUNDACIONECOPIENSAEVOLUTION\/3d-line\/issues/);
 assert.match(html,/name="viewport"/);
});
test('no publica app-ads falso ni secretos antes de AdMob',async()=>{
 const template=await read('app-ads.template.txt');
 assert.match(template,/NO PUBLICAR/);
 await assert.rejects(access(join(hosting,'public','app-ads.txt')),{code:'ENOENT'});
 const conf=JSON.parse(await read('firebase.json'));
 assert.equal(conf.hosting.headers[0].source,'/app-ads.txt');
 assert.equal(conf.hosting.headers[0].headers[0].value,'text/plain; charset=utf-8');
});
test('script PowerShell requiere consentimiento antes de desplegar Hosting',async()=>{
 const script=await readFile(join(root,'scripts/firebase-admob-hosting.ps1'),'utf8');
 assert.match(script,/hosting:sites:list --project \$project/);
 assert.match(script,/Read-Host 'Para confirmar escribe exactamente PUBLICAR d-line-g'/);
 assert.match(script,/deploy --only hosting --project \$project/);
 assert.match(script,/google\.com, pub-\$pub, DIRECT, f08c47fec0942fa0/);
 assert.match(script,/if\(-not \$Deploy\)/);
 assert.doesNotMatch(script,/--only firestore/);
 assert.doesNotMatch(script,/--only functions/);
});
