import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const browser=await chromium.launch({headless:true});
const viewports=[
 {width:320,height:568,label:'Android pequeño'},
 {width:360,height:640,label:'Android mediano'},
 {width:390,height:844,label:'Android actual'},
 {width:430,height:932,label:'Android grande'},
 {width:740,height:380,label:'horizontal compacta'},
 {width:1280,height:720,label:'computador'}
];
let failures=0;
for(const vp of viewports){
 const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:vp.width<600,hasTouch:true});
 await page.route('**/*',route=>{
   if(route.request().url().startsWith('file:'))route.continue();
   else route.abort();
 });
 await page.goto(pathToFileURL(resolve('index.html')).href,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  document.getElementById('loginGate').classList.add('hidden');
  document.getElementById('app').classList.remove('auth-locked');
 });
 const menu=await page.evaluate(()=>{
  const all=[...document.querySelectorAll('.gamer-menu,.player-profile,.badge-choices,.badge-choices button,.account-controls button,.gamer-actions button')];
  return all.filter(el=>{
   const r=el.getBoundingClientRect();
   return getComputedStyle(el).display!=='none' && (r.left < -1 || r.right > innerWidth+1);
  }).map(el=>({tag:el.tagName,text:el.textContent.slice(0,30),rect:el.getBoundingClientRect().toJSON()}));
 });
 await page.evaluate(()=>{
  document.body.classList.add('xr-active');
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('arSelectionModes').classList.remove('hidden');
  document.getElementById('arAimCrosshair').classList.remove('hidden');
  document.getElementById('arAimSelectBtn').classList.remove('hidden');
  document.getElementById('arSizeControl').classList.remove('hidden');
  for(const b of document.querySelectorAll('.toolbar button'))b.classList.remove('hidden');
 });
 const ar=await page.evaluate(()=>{
  const selectors=['.toolbar','.toolbar button','.ar-selection-modes','.ar-selection-modes button','.game-header','.game-header button','.ar-size-control'];
  return [...document.querySelectorAll(selectors.join(','))].filter(el=>{
   const r=el.getBoundingClientRect(),style=getComputedStyle(el);
   if(style.display==='none' || style.visibility==='hidden')return false;
   // Los elementos dentro de una barra desplazable pueden necesitar scroll vertical,
   // pero nunca deben quedar fuera a los lados del teléfono.
   return r.left< -1 || r.right>innerWidth+1;
  }).map(el=>({tag:el.tagName,id:el.id,text:el.textContent.trim().slice(0,28),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
 });
 const frame=await page.evaluate(()=>{
  return ['.toolbar','.ar-selection-modes','.game-header'].filter(selector=>{
   const r=document.querySelector(selector).getBoundingClientRect();
   return r.left< -1||r.right>innerWidth+1||r.top< -1||r.bottom>innerHeight+1;
  });
 });
 if(menu.length||ar.length||frame.length){
  failures++;
  console.error('ERROR',vp.label,menu,ar,frame);
 }else console.log('OK',vp.label,vp.width+'x'+vp.height);
 await page.close();
}
await browser.close();
if(failures)process.exit(1);
