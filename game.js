import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {initializeAccountAuth, loginGoogle, loginGuest, logoutFirebase, authAvailable} from './auth.js?v=57.7.0';
import {FREE_BADGES,BADGE_ORDER,badgeCost,initialRewards,normalizeRewards,isBadgeUnlocked,badgeProgress,applyCompletedBadgeVideo,rewardsStorageKey} from './rewards.js?v=57.7.0';
import {RewardedVideoProvider} from './ads-rewarded.js?v=57.7.0';

// v57.4.0-beta.1 | un único estado de reglas para CPU, PvP WebRTC, 3D y WebXR.
// PeerJS usa su señalización pública: funcional para pruebas, NO es un backend SLA.
// El punto AR de cada dispositivo es LOCAL: QR de sala no comparte coordenadas físicas.
const VERSION='57.7.0-beta.1';
const PEER_PREFIX='3line-beta57-';
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TURNS=18;
const MAX_LINK=2.5;
// Niveles jugables: 1-4 composición guiada, 5-10 disposición por semilla del anfitrión.
const LEVELS=[
 {level:1,count:5,random:false,range:1.9},{level:2,count:6,random:false,range:1.9},
 {level:3,count:7,random:false,range:1.95},{level:4,count:9,random:false,range:2.1},
 {level:5,count:9,random:true,range:2.15},{level:6,count:12,random:true,range:2.2},
 {level:7,count:16,random:true,range:2.25},{level:8,count:20,random:true,range:2.35},
 {level:9,count:25,random:true,range:2.4},{level:10,count:30,random:true,range:2.5}
];
const DEFAULT_PROFILE={name:'INVITADO',color:'#00eaff',badge:'◆',level:1,elo:1000,coins:0};
function readProfile(key='3line57_profile'){try{return {...DEFAULT_PROFILE,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return {...DEFAULT_PROFILE}}}
let profile=readProfile(),selectedLevel=1,tutorial=false,awardRecorded=false;
let currentAccount=null,unlockedLevel=1,loginReady=false,authError='';
function accountProfileKey(uid){return '3line57_profile_'+uid;}
function openLoginGate(message='Inicia sesión para acceder al juego.'){
  loginReady=true;currentAccount=null;
  el('loginGate').classList.remove('hidden');el('app').classList.add('auth-locked');
  el('loginStatus').textContent=message;
}
function enterAccount(account){
  if(!account?.uid)return;
  currentAccount=account;loginReady=true;
  const localGuest=account.provider==='local-guest';
  const key=accountProfileKey(account.uid);
  const saved=localStorage.getItem(key);
  profile=readProfile(saved?key:localGuest?'3line57_profile':key);
  profile.name=account.provider==='google'?String(account.name||'AGENTE').toUpperCase().slice(0,30):profile.name||'INVITADO';
  if(!['#00eaff','#ff2d7a','#50ff65','#ffd231','#b35aff'].includes(profile.color))profile.color='#00eaff';
  if(!PLAYER_BADGES.includes(profile.badge))profile.badge='◆';
  unlockedLevel=Math.max(1,Math.min(10,Number(localStorage.getItem('3line57_unlocked_'+account.uid))||1));
  profile.level=unlockedLevel;selectedLevel=unlockedLevel;
  loadCosmetics();
  localStorage.setItem(key,JSON.stringify(profile));
  el('loginGate').classList.add('hidden');el('app').classList.remove('auth-locked');
  el('googleNote').textContent=account.provider==='google'?
   'Conectado con Google a través de Firebase. La sesión se conserva en este navegador; el progreso del juego sigue siendo local.':
   'Sesión de invitado persistente en este dispositivo. Puedes jugar sin correo.';
  renderProfile();renderLevels();screen('menu');
  if(pendingJoinCode){const code=pendingJoinCode.toUpperCase();pendingJoinCode='';el('joinCode').value=code;setTimeout(()=>joinRoom(code),250);}
}
function localGuestAccount(){
  localStorage.setItem('3line57_guest_session','yes');
  enterAccount({uid:'local-guest',name:'INVITADO',provider:'local-guest',verified:false});
}
async function beginLogin(){
  el('loginStatus').textContent='Comprobando tu sesión guardada…';
  const savedGuest=localStorage.getItem('3line57_guest_session')==='yes';
  const success=await initializeAccountAuth(
    account=>{
      if(account){
        localStorage.removeItem('3line57_guest_session');
        enterAccount(account);
      }else if(!currentAccount){
        if(savedGuest)localGuestAccount();
        else openLoginGate('Selecciona Google o invitado para continuar.');
      }
    },
    err=>{
      authError=err?.message||'No se pudo conectar con Firebase';
      el('loginStatus').textContent='Firebase: '+authError+' · Puedes continuar como invitado local.';
    }
  );
  if(!success&&!currentAccount){
    if(savedGuest)localGuestAccount();
    else openLoginGate('Conexión Firebase no disponible. Puedes probar el modo invitado local.');
  }
}
async function loginGoogleFlow(){
  el('loginStatus').textContent='Abriendo Google para iniciar sesión…';
  try{
    await loginGoogle();
    localStorage.removeItem('3line57_guest_session');
  }catch(e){
    const msg=e?.code==='auth/unauthorized-domain'?
      'Este dominio debe autorizarse en Firebase Authentication → Settings → Authorized domains.':
      e?.code==='auth/popup-closed-by-user'?'Ventana de Google cerrada.':
      ('Google no pudo iniciar sesión: '+(e?.code||e?.message||'desconocido'));
    el('loginStatus').textContent=msg;
  }
}
async function loginGuestFlow(){
  el('loginStatus').textContent='Iniciando invitado…';
  if(authAvailable()){
    try{await loginGuest();return;}catch(e){authError=e?.message||String(e);}
  }
  localGuestAccount();
  notify('Invitado local: se conserva el acceso en este navegador; no hay cuenta cloud.');
}
async function logoutGame(){
  if(!await gameConfirm('¿Cerrar sesión de este dispositivo y regresar a la pantalla de acceso?','CERRAR SESIÓN'))return;
  cleanup();localStorage.removeItem('3line57_guest_session');
  try{await logoutFirebase();}catch{}
  openLoginGate('Sesión cerrada. Vuelve a entrar para jugar.');
}
let POINTS=[]; // Escena y reglas comparten los puntos enviados por anfitrión.
const seedRandom=seed=>{let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}};
function levelPoints(level,seed){
 const l=LEVELS[level-1]||LEVELS[0],pts=[];
 if(level===1)return [[-.85,.15,.25],[0,.75,-.28],[.85,.15,.25],[.1,1.05,.65],[-.05,.2,.85]];
 if(level===2)return [[-.88,.12,-.6],[0,.75,-.75],[.88,.14,-.6],[-.88,.13,.65],[0,.9,.5],[.88,.13,.65]];
 if(level===3)return [[-.9,.15,-.8],[0,.65,-.8],[.9,.12,-.8],[-.9,.15,.8],[0,.95,.8],[.9,.15,.8],[0,.45,0]];
 if(level===4){for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)pts.push([x*.82,.2+((x+z+4)%3)*.34,z*.82]);return pts;}
 const rng=seedRandom(seed),side=level>8?1.7:level>6?1.5:1.15;
 let attempts=0;while(pts.length<l.count&&attempts++<5000){
  const p=[(rng()*2-1)*side,.12+rng()*.95,(rng()*2-1)*side];
  if(pts.every(q=>Math.hypot(q[0]-p[0],q[2]-p[2])>.42))pts.push(p);
 }
 return pts;
}
const PLAYER_BADGES=BADGE_ORDER;
function profilePacket(){return {name:String(profile.name).slice(0,30),color:profile.color,badge:profile.badge};}
// Recompensas SOLO cosméticas guardadas por UID en navegador (BETA).
// No son una economía antifraude: Firestore + validación backend quedan pendientes.
let cosmeticRewards=initialRewards();
const rewardedAds=new RewardedVideoProvider(window,document,fetch);
let badgeRewardBusy=false;
function loadCosmetics(){
 const uid=currentAccount?.uid||'local-guest';
 try{cosmeticRewards=normalizeRewards(JSON.parse(localStorage.getItem(rewardsStorageKey(uid))||'{}'));}
 catch{cosmeticRewards=initialRewards();}
 if(!isBadgeUnlocked(profile.badge,cosmeticRewards))profile.badge='◆';
}
function saveCosmetics(){
 if(!currentAccount)return;
 try{localStorage.setItem(rewardsStorageKey(currentAccount.uid),JSON.stringify(cosmeticRewards));}catch{}
}
function saveProfile(){
 try{localStorage.setItem(accountProfileKey(currentAccount?.uid||'local-guest'),JSON.stringify(profile));}catch{}
 renderProfile();
}
function renderProfile(){
 for(const [id,val] of [['profileName',profile.name],['profileAvatar',profile.badge],['rankLevel',profile.level],['eloValue',profile.elo]]){
  const elem=document.getElementById(id);if(elem)elem.textContent=val;
 }
 const a=document.getElementById('profileAvatar');if(a)a.style.color=profile.color;
 document.querySelectorAll('#colors [data-color]').forEach(x=>x.classList.toggle('current',x.dataset.color===profile.color));
 document.querySelectorAll('#badges [data-badge]').forEach(x=>{
  const badge=x.dataset.badge,progress=badgeProgress(badge,cosmeticRewards);
  const locked=!progress.unlocked;
  x.classList.toggle('current',badge===profile.badge);
  x.classList.toggle('locked-badge',locked);
  x.setAttribute('aria-pressed',String(badge===profile.badge));
  x.setAttribute('aria-label',locked?
   'Insignia '+(x.title||badge)+' bloqueada, '+progress.completed+' de '+progress.required+' videos':
   'Insignia '+(x.title||badge)+' disponible');
  x.title=locked?
   (badge+' · 🔒 '+progress.completed+'/'+progress.required+' videos completados'):
   (badge+' · DESBLOQUEADA');
 });
 const unlocked=cosmeticRewards.unlocked.length;
 const note=el('badgeProgressNote');
 note.textContent='5 insignias gratuitas · '+unlocked+'/11 especiales desbloqueadas. '+
  (rewardedAds.enabled?'Elige una insignia 🔒 para ver un video voluntario.':'Videos pendientes de aprobación de Google H5 Games Ads.');
}
async function chooseBadge(badge){
 if(!PLAYER_BADGES.includes(badge)||!currentAccount)return;
 if(isBadgeUnlocked(badge,cosmeticRewards)){
  profile.badge=badge;saveProfile();notify('Insignia '+badge+' equipada.');return;
 }
 const p=badgeProgress(badge,cosmeticRewards);
 if(badgeRewardBusy){notify('Ya hay un video en proceso.');return;}
 if(!rewardedAds.enabled){
  await showGameDialog({title:'INSIGNIA BLOQUEADA 🔒',
   message:badge+' requiere '+p.required+' videos completos ('+p.completed+'/'+p.required+
   '). Los videos reales se habilitarán cuando Google apruebe el juego y configuremos el ID publicitario.',
   accept:'ENTENDIDO',cancel:null});
  return;
 }
 const agreed=await showGameDialog({title:'DESBLOQUEAR '+badge,
  message:'Progreso: '+p.completed+'/'+p.required+' videos. ¿Quieres ver voluntariamente un video recompensado? Solo se cuenta al terminarlo.',
  accept:'VER VIDEO',cancel:'AHORA NO'});
 if(!agreed)return;
 badgeRewardBusy=true;
 try{
  const outcome=await rewardedAds.watch('badge-'+PLAYER_BADGES.indexOf(badge));
  if(!outcome.viewed){notify('No se completó ningún anuncio. Tu progreso no cambia.');return;}
  cosmeticRewards=applyCompletedBadgeVideo(badge,cosmeticRewards);
  saveCosmetics();renderProfile();
  const status=badgeProgress(badge,cosmeticRewards);
  if(status.unlocked){profile.badge=badge;saveProfile();notify('¡Insignia '+badge+' desbloqueada y equipada!');}
  else notify('Video completado: '+status.completed+'/'+status.required+' para '+badge+'.');
 }finally{badgeRewardBusy=false;}
}
function renderLevels(){
 const grid=el('levelGrid');if(!grid)return;grid.replaceChildren();
 const accessible=Math.min(10,unlockedLevel),level=LEVELS[accessible-1];
 selectedLevel=accessible;
 const b=document.createElement('button');b.className='level-current';
 const title=document.createElement('span');title.textContent='NIVEL '+accessible+' · '+level.count+' NODOS';
 const icon=document.createElement('strong');icon.textContent='▶';b.append(title,icon);
 b.addEventListener('click',()=>showCpu(accessible===1));
 grid.appendChild(b);
 el('levelDescription').textContent=accessible===1?'Nivel 1: aprende conectando cinco nodos frente al BOT.':'Nivel '+accessible+': '+level.count+' nodos '+(level.random?'en posiciones aleatorias':'ordenados')+'. Gana para continuar.';
 el('tutorialBtn').textContent=accessible===1?'🎓 NIVEL 1 · APRENDER CON BOT':'🎓 REPASAR TUTORIAL';
 el('cpuBtn').textContent='⚡ JUGAR NIVEL '+accessible+' CONTRA BOT';
}
// Academia táctica: siete retos visuales de respuesta corta, sin cobro ni anuncios.
// La lectura es opcional y puede abrirse durante la partida sin reiniciarla.
const ACADEMY_LESSONS=[
 {title:'El dado galáctico',text:'Cuando sea tu turno, pulsa el dado central. El número es aleatorio entre 1 y 6 y determina cuántas conexiones puedes intentar.',question:'¿Qué debes hacer antes de dibujar?',answers:['Lanzar el dado','Tocar cualquier línea'],correct:0,art:'dice'},
 {title:'Une dos puntos',text:'Toca un nodo y después otro. Puedes conectar puntos en distintos ejes y alturas. La distancia por sí sola no prohíbe la línea.',question:'¿Pueden conectarse dos nodos lejanos si no hay barrera?',answers:['Sí, si la trayectoria está libre','No, solo nodos próximos'],correct:0,art:'line'},
 {title:'Las líneas son barreras',text:'Una línea existente no puede ser atravesada físicamente por otra en 3D. Se pueden crear varias conexiones desde un vértice compartido.',question:'¿Puedes cruzar una línea colocada en el mismo lugar?',answers:['Sí, siempre','No, hay una barrera'],correct:1,art:'cross'},
 {title:'Conquista el triángulo',text:'Tres conexiones que cierran una cara triangular válida colorean un territorio con tu insignia. Cada triángulo aporta 10 puntos a su conquistador.',question:'¿Qué completa un territorio y da puntos?',answers:['Cerrar un triángulo','Crear una única línea'],correct:0,art:'triangle'},
 {title:'Un nodo elevado está libre',text:'El tablero existe en tres dimensiones. Un triángulo sombreado debajo de un nodo no lo bloquea mientras la superficie no pase físicamente por él.',question:'¿El triángulo inferior bloquea al nodo flotante superior?',answers:['No, permanece disponible','Sí, aunque esté muy arriba'],correct:0,art:'above'},
 {title:'Caras que cubren nodos',text:'Si una cara triangular conquistada pasa por un nodo que NO es uno de sus tres vértices, ese nodo queda bloqueado. Sus vértices siguen utilizables; una cara distinta sí podría cubrirlos.',question:'¿Qué ocurre con un nodo interior atravesado por el sombreado?',answers:['Queda bloqueado','Puede conectarse siempre'],correct:0,art:'covered'},
 {title:'Cerramiento tridimensional',text:'Un conjunto de triángulos puede formar un volumen cerrado (laterales, arriba y abajo). Los puntos estrictamente dentro del volumen quedan bloqueados, aunque ninguna cara pase exactamente por ellos.',question:'¿Cuándo queda atrapado un punto interior en el espacio?',answers:['Con una sola cara inferior','Cuando se cierra el volumen 3D'],correct:1,art:'shell'}
];
const academyCircle=(x,y,color='#5ceaff',radius=6)=>
 '<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="'+color+'" stroke="#e0ffff" stroke-width="1.5"/>';
function academyArt(type){
 const edge=(x1,y1,x2,y2,color='#42e8ff',width=4)=>
  '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round"/>';
 const a=academyCircle(75,120),b=academyCircle(240,120),c=academyCircle(160,31,'#f9df67');
 const triangle='<polygon points="75,120 240,120 160,31" fill="#ee3986" fill-opacity=".35" stroke="#ff3b97" stroke-width="4"/>';
 const dice='<polygon points="120,35 200,35 233,70 200,120 120,120 87,70" fill="#073652" stroke="#50ebff" stroke-width="4"/>'+
  '<text x="160" y="91" font-size="57" font-weight="bold" text-anchor="middle" fill="#a3ffff">6</text>';
 let drawing='';
 if(type==='dice')drawing=dice;
 if(type==='line')drawing=edge(75,120,240,50)+academyCircle(75,120)+academyCircle(240,50);
 if(type==='cross')drawing=edge(70,40,244,128,'#fb528a',6)+edge(70,128,244,40,'#43eaff',6)+
  '<circle cx="157" cy="84" r="19" stroke="#ffdc5f" stroke-width="3" fill="#4f111f"/>'+
  '<text x="157" y="92" font-size="27" text-anchor="middle" fill="#ffdc5f">×</text>';
 if(type==='triangle')drawing=triangle+a+b+c+academyCircle(160,80,'#ffc744',10);
 if(type==='above')drawing=triangle+a+b+c+edge(160,79,160,16,'#ade8ff',2)+academyCircle(160,12,'#6cfb85',9);
 if(type==='covered')drawing=triangle+a+b+c+academyCircle(160,86,'#ffcd5e',9)+
  '<circle cx="160" cy="86" r="19" fill="none" stroke="#ffd856" stroke-dasharray="4 4" stroke-width="2"/>';
 if(type==='shell')drawing='<polygon points="82,124 235,124 158,20" fill="#ec3370" fill-opacity=".25" stroke="#ff3b92" stroke-width="3"/>'+
  edge(158,20,155,151,'#6adfff',3)+edge(155,151,82,124,'#6adfff',3)+edge(155,151,235,124,'#6adfff',3)+
  academyCircle(82,124)+academyCircle(235,124)+academyCircle(158,20)+academyCircle(155,151)+
  academyCircle(155,95,'#ffe56d',9);
 return '<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
  '<rect width="320" height="170" rx="15" fill="#031727"/>'+
  '<path d="M5 145H315M5 105H315M5 65H315M5 25H315" stroke="#1b4559" stroke-width="1"/>'+
  drawing+'</svg>';
}
let academyIndex=0,academySolved=new Set();
function openAcademy(){
 academyIndex=0;
 try{
  const saved=JSON.parse(localStorage.getItem('3line57_academy_'+(currentAccount?.uid||'guest'))||'[]');
  academySolved=new Set(saved.filter(v=>Number.isInteger(v)&&v>=0&&v<ACADEMY_LESSONS.length));
 }catch{academySolved=new Set();}
 el('academyOverlay').classList.remove('hidden');
 renderAcademy();
}
function closeAcademy(){el('academyOverlay').classList.add('hidden');}
function renderAcademy(){
 const lesson=ACADEMY_LESSONS[academyIndex],solved=academySolved.has(academyIndex);
 el('academyStep').textContent='EJERCICIO '+(academyIndex+1)+' / '+ACADEMY_LESSONS.length;
 el('academyStars').textContent=ACADEMY_LESSONS.map((_,i)=>academySolved.has(i)?'★':'☆').join('');
 el('academyTitle').textContent=lesson.title;
 el('academyDescription').textContent=lesson.text;
 el('academyQuestion').textContent=lesson.question;
 el('academyExample').innerHTML=academyArt(lesson.art); // arte estático interno, sin entrada de usuario
 el('academyChoiceA').textContent='A · '+lesson.answers[0];
 el('academyChoiceB').textContent='B · '+lesson.answers[1];
 el('academyChoiceA').disabled=solved;el('academyChoiceB').disabled=solved;
 el('academyFeedback').textContent=solved?'✓ EJERCICIO SUPERADO. Puedes continuar.':'Escoge la respuesta correcta para desbloquear la explicación siguiente.';
 el('academyFeedback').classList.toggle('academy-correct',solved);
 el('academyPrevBtn').disabled=academyIndex===0;
 el('academyNextBtn').disabled=!solved;
 el('academyNextBtn').textContent=academyIndex===ACADEMY_LESSONS.length-1?'TERMINAR ACADEMIA':'SIGUIENTE →';
}
function answerAcademy(option){
 const lesson=ACADEMY_LESSONS[academyIndex];
 if(academySolved.has(academyIndex))return;
 if(option!==lesson.correct){
  el('academyFeedback').textContent='✕ INTENTA OTRA VEZ · Revisa el diagrama y la regla.';
  el('academyFeedback').classList.remove('academy-correct');return;
 }
 academySolved.add(academyIndex);
 try{localStorage.setItem('3line57_academy_'+(currentAccount?.uid||'guest'),JSON.stringify([...academySolved]));}catch{}
 renderAcademy();
}
function nextAcademy(){
 if(!academySolved.has(academyIndex))return;
 if(academyIndex===ACADEMY_LESSONS.length-1){
  closeAcademy();notify('¡Academia completada! Practica lo aprendido contra el BOT.');return;
 }
 academyIndex++;renderAcademy();
}
function startAcademyPractice(){
 closeAcademy();
 if(!el('game').classList.contains('hidden')){notify('Puedes continuar esta partida y practicar las reglas.');return;}
 showCpu(true);
}
function tutorials(){
 const h=el('tutorialHint');if(!h)return;
 const active=Boolean(tutorial&&game&&game.status==='play');
 h.classList.toggle('hidden',!active);
 if(!active)return;
 const ownLines=game.lines.filter(l=>l.owner===0).length;
 const ownTriangles=game.tris.filter(t=>t.owner===0).length;
 if(ownTriangles>0)h.textContent='✓ RETO 3/3 SUPERADO · ¡Has conquistado un triángulo! Sus tres esquinas pueden seguir jugando.';
 else if(ownLines>=1)h.textContent='RETO 3/3 · Cierra un triángulo: une tres pares de nodos, sin cruzar líneas existentes.';
 else if(game.turn!==0)h.textContent='EL BOT ESTÁ JUGANDO · Observa su jugada y espera tu turno.';
 else if(!game.rolled)h.textContent='RETO 1/3 · Pulsa el dado galáctico para obtener entre 1 y 6 conexiones.';
 else if(selected<0)h.textContent='RETO 2/3 · Toca el primer nodo. Después elige otro para construir tu línea.';
 else h.textContent='RETO 2/3 · Nodo '+(selected+1)+' elegido. Selecciona el segundo nodo.';
}
function awardResult(){
 if(!game||game.status!=='end'||awardRecorded)return false;
 awardRecorded=true;
 if(game.winner!==myPlayer || mode==='pvp')return false;
 profile.elo=(profile.elo||1000)+12;profile.coins=(profile.coins||0)+15;
 const next=Math.min(10,game.level+1);
 unlockedLevel=Math.max(unlockedLevel,next);
 profile.level=unlockedLevel;
 try{localStorage.setItem('3line57_unlocked_'+(currentAccount?.uid||'local-guest'),String(unlockedLevel));}catch{}
 saveProfile();renderLevels();return true;
}
function xy(i){return {x:POINTS[i].x,y:POINTS[i].z};}
function area(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function pointInsideTriangle(p,a,b,c){
 const v1=area(a,b,p),v2=area(b,c,p),v3=area(c,a,p);
 return (v1>1e-5&&v2>1e-5&&v3>1e-5)||(v1< -1e-5&&v2< -1e-5&&v3< -1e-5);
}
// Geometría real XYZ: un triángulo es una superficie 2D en el espacio,
// NO encierra por sí solo un nodo situado encima o debajo de esa cara.
function v3(p){return {x:p.x,y:p.y,z:p.z};}
function sub3(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function dot3(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross3(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function normSq3(v){return dot3(v,v);}
function pointSegmentDistance3(p,a,b){
 const d=sub3(b,a),len=normSq3(d);
 const t=len<1e-12?0:Math.max(0,Math.min(1,dot3(sub3(p,a),d)/len));
 const closest={x:a.x+d.x*t,y:a.y+d.y*t,z:a.z+d.z*t};
 return Math.sqrt(normSq3(sub3(p,closest)));
}
function segmentDistance3(a,b,c,d){
 // Distancia entre DOS segmentos 3D; proyecciones 2D que se cruzan a distinta
 // altura NO constituyen una intersección.
 const u=sub3(b,a),v=sub3(d,c),w=sub3(a,c);
 const A=dot3(u,u),B=dot3(u,v),C=dot3(v,v),D=dot3(u,w),E=dot3(v,w);
 let sn,sd=A*C-B*B,tn,td=sd;
 if(A<1e-12)return pointSegmentDistance3(a,c,d);
 if(C<1e-12)return pointSegmentDistance3(c,a,b);
 if(sd<1e-12){sn=0;sd=1;tn=E;td=C;}
 else{sn=B*E-C*D;tn=A*E-B*D;
  if(sn<0){sn=0;tn=E;td=C;}
  else if(sn>sd){sn=sd;tn=E+B;td=C;}
 }
 if(tn<0){tn=0;if(-D<0)sn=0;else if(-D>A)sn=sd;else{sn=-D;sd=A;}}
 else if(tn>td){tn=td;if(-D+B<0)sn=0;else if(-D+B>A)sn=sd;else{sn=-D+B;sd=A;}}
 const sc=Math.abs(sn)<1e-12?0:sn/sd,tc=Math.abs(tn)<1e-12?0:tn/td;
 return Math.sqrt(normSq3({x:w.x+sc*u.x-tc*v.x,y:w.y+sc*u.y-tc*v.y,z:w.z+sc*u.z-tc*v.z}));
}
function triangleNormal(a,b,c){return cross3(sub3(b,a),sub3(c,a));}
function projectedTriangleFace(face){
 const [A,B,C]=[POINTS[face.a],POINTS[face.b],POINTS[face.c]];
 const n=triangleNormal(A,B,C),x=Math.abs(n.x),y=Math.abs(n.y),z=Math.abs(n.z);
 if(x>=y&&x>=z)return p=>({x:p.y,y:p.z});
 if(y>=z)return p=>({x:p.x,y:p.z});
 return p=>({x:p.x,y:p.y});
}
function rayTriangleT(origin,dir,a,b,c){
 // Möller-Trumbore, ambas caras, devuelve distancia del rayo al triángulo.
 const edge1=sub3(b,a),edge2=sub3(c,a),p=cross3(dir,edge2);
 const det=dot3(edge1,p);if(Math.abs(det)<1e-10)return null;
 const inv=1/det,t=sub3(origin,a),u=dot3(t,p)*inv;
 if(u< -1e-7||u>1+1e-7)return null;
 const q=cross3(t,edge1),v=dot3(dir,q)*inv;
 if(v< -1e-7||u+v>1+1e-7)return null;
 const distance=dot3(edge2,q)*inv;
 return distance>1e-7?distance:null;
}
function segmentIntersectsFace3D(a,b,face){
 const A=POINTS[a],B=POINTS[b],T=[POINTS[face.a],POINTS[face.b],POINTS[face.c]];
 const n=triangleNormal(...T),length=Math.sqrt(normSq3(n));
 if(length<1e-9)return false;
 const d0=dot3(sub3(A,T[0]),n)/length,d1=dot3(sub3(B,T[0]),n)/length;
 if(d0*d1< -1e-9){
  const t=d0/(d0-d1),hit={x:A.x+(B.x-A.x)*t,y:A.y+(B.y-A.y)*t,z:A.z+(B.z-A.z)*t};
  const proj=projectedTriangleFace(face);
  return pointInsideTriangle(proj(hit),proj(T[0]),proj(T[1]),proj(T[2]));
 }
 // Segmento coplanar: entra en la superficie sombreada por cualquiera de sus lados.
 if(Math.abs(d0)<1e-6&&Math.abs(d1)<1e-6){
  const proj=projectedTriangleFace(face),P=proj(A),Q=proj(B);
  const [U,V,W]=T.map(proj);
  if(pointInsideTriangle(P,U,V,W)||pointInsideTriangle(Q,U,V,W))return true;
  if(pointInsideTriangle({x:(P.x+Q.x)/2,y:(P.y+Q.y)/2},U,V,W))return true;
  return [[U,V],[V,W],[W,U]].some(([X,Y])=>segmentsCross(P,Q,X,Y));
 }
 return false;
}
function closedTriangleShells(tris){
 // Solo una malla cerrada (cada arista usada exactamente por dos caras)
 // puede crear un volumen bloqueado. Una cara o varios triángulos abiertos NO.
 const edges=new Map();
 tris.forEach((t,i)=>{
  for(const [a,b] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]){
   const key=a<b?a+'-'+b:b+'-'+a;
   if(!edges.has(key))edges.set(key,[]);
   edges.get(key).push(i);
  }
 });
 const seen=new Set(),result=[];
 for(let i=0;i<tris.length;i++){
  if(seen.has(i))continue;
  const todo=[i],part=[];seen.add(i);
  while(todo.length){
   const j=todo.pop();part.push(j);const t=tris[j];
   for(const [a,b] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]){
    const key=a<b?a+'-'+b:b+'-'+a;
    for(const k of edges.get(key)||[])if(!seen.has(k)){seen.add(k);todo.push(k);}
   }
  }
  if(part.length<4)continue;
  const counts=new Map(),vertices=new Set();
  for(const j of part){const t=tris[j];
   for(const v of [t.a,t.b,t.c])vertices.add(v);
   for(const [a,b] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]){
    const key=a<b?a+'-'+b:b+'-'+a;
    counts.set(key,(counts.get(key)||0)+1);
   }
  }
  if(vertices.size>=4&&[...counts.values()].every(c=>c===2)){
   // Una lámina plana cubierta por dos lados no es un sólido con interior.
   const ids=[...vertices],p0=POINTS[ids[0]];
   let spansVolume=false;
   outer: for(let a=1;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)for(let c=b+1;c<ids.length;c++){
    const triple=dot3(sub3(POINTS[ids[a]],p0),
      cross3(sub3(POINTS[ids[b]],p0),sub3(POINTS[ids[c]],p0)));
    if(Math.abs(triple)>1e-5){spansVolume=true;break outer;}
   }
   if(spansVolume)result.push(part.map(j=>tris[j]));
  }
 }
 return result;
}
function pointInsideClosedShell(p,shell){
 const dirs=[{x:1,y:.347,z:.159},{x:.197,y:1,z:.439},{x:.281,y:.233,z:1}];
 let insideVotes=0;
 for(const dir of dirs){
  const hits=[];
  for(const t of shell){
   const hit=rayTriangleT(p,dir,POINTS[t.a],POINTS[t.b],POINTS[t.c]);
   if(hit!==null&&!hits.some(n=>Math.abs(n-hit)<1e-5))hits.push(hit);
  }
  if(hits.length%2===1)insideVotes++;
 }
 return insideVotes>=2;
}
function pointCoveredByFace3D(index,face){
 // Una superficie tiene espesor numérico de tolerancia, pero no atrapa
 // puntos que estén a distinta altura ni puntos de sus tres esquinas.
 if([face.a,face.b,face.c].includes(index))return false;
 const point=POINTS[index],A=POINTS[face.a],B=POINTS[face.b],C=POINTS[face.c];
 const normal=triangleNormal(A,B,C);
 const len=Math.sqrt(normSq3(normal));
 if(len<1e-9)return false;
 const signed=dot3(sub3(point,A),normal)/len;
 if(Math.abs(signed)>.025)return false;
 const projected=projectedTriangleFace(face);
 const [p,a,b,c]=[point,A,B,C].map(projected);
 const total=area(a,b,c);if(Math.abs(total)<1e-9)return false;
 const u=area(a,b,p)/total,v=area(b,c,p)/total,w=area(c,a,p)/total;
 // En el borde de una cara también queda cubierto, excepto los vértices del
 // triángulo. Una cara independiente sí puede cubrir el vértice de otra.
 const epsilon=1e-5;
 return u>=-epsilon&&v>=-epsilon&&w>=-epsilon&&u<=1+epsilon&&v<=1+epsilon&&w<=1+epsilon;
}
function blockedNodes(s){
 const tris=s.tris||[],closed=closedTriangleShells(tris);
 const blocked=[];
 for(let i=0;i<POINTS.length;i++){
  // REGLA 1: una superficie triangular conquistada cubre realmente ese punto
  // (interior o borde de cara), pero no sus tres vértices.
  const covered=tris.some(face=>pointCoveredByFace3D(i,face));
  // REGLA 2: una envolvente 3D totalmente sellada bloquea los puntos interiores,
  // preservando vértices propios salvo que otra cara independiente los cubra.
  const enclosed=closed.some(shell=>
   !shell.some(t=>[t.a,t.b,t.c].includes(i)) && pointInsideClosedShell(POINTS[i],shell));
  if(covered||enclosed)blocked.push(i);
 }
 return blocked;
}

function segmentsCross(a,b,c,d){
 const A=area(a,b,c),B=area(a,b,d),C=area(c,d,a),D=area(c,d,b);
 return ((A>1e-6&&B< -1e-6)||(A< -1e-6&&B>1e-6))&&((C>1e-6&&D< -1e-6)||(C< -1e-6&&D>1e-6));
}
function nearSegment(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
// Las líneas sueltas NO son paredes. Solo la zona de un triángulo ya conquistado
// (s.tris) impide nuevas conexiones que atraviesen su superficie proyectada XZ.
// El análisis XZ coincide con las reglas actuales de encapsulamiento de nodos.
function crossesOwnedTriangle(a,b,t){return segmentIntersectsFace3D(a,b,t);}
function edgeError(a,b,s){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=POINTS.length||b>=POINTS.length||a===b)return 'Puntos inválidos.';
 if((s.blocked||[]).includes(a)||(s.blocked||[]).includes(b))return 'Nodo bloqueado: una cara conquistada lo atraviesa o quedó encerrado en 3D.';
 if(s.lines.some(l=>linkKey(l.a,l.b)===linkKey(a,b)))return 'Esta línea ya está construida.';
 const A=POINTS[a],B=POINTS[b];
 for(let i=0;i<POINTS.length;i++)if(i!==a&&i!==b&&pointSegmentDistance3(POINTS[i],A,B)<.055)return 'La conexión atravesaría otro nodo.';
 for(const l of s.lines){
  if(a===l.a||a===l.b||b===l.a||b===l.b)continue;
  if(segmentDistance3(A,B,POINTS[l.a],POINTS[l.b])<.04)return 'No puedes cruzar una línea existente en el espacio 3D.';
 }
 // Las caras triangulares conquistadas son superficies que bloquean SOLO si
 // se atraviesan realmente en 3D; un punto por encima queda libre.
 for(const t of s.tris)if(crossesOwnedTriangle(a,b,t))return 'Una cara conquistada bloquea esta trayectoria 3D.';
 return null;
}
const el=id=>document.getElementById(id);
let mode='none', myPlayer=0, host=false, room='', connected=false, peer=null,conn=null,game=null;
let reconnectTimer=null,pendingSyncTimer=null,reconnectAttempts=0;
let renderer,scene,camera,orbit,board,staticGroup,linesGroup,triGroup,nodes=[],raycaster=new THREE.Raycaster();
let selected=-1, pointerStart=null, cpuTimer=null, joinTimer=null, scanner=null,toastTimer=null;
let arSession=null,hitSource=null,arSpace=null,lastHit=null,reticle=null,arPlaced=false;
const linkKey=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
const distance=(a,b)=>POINTS[a].distanceTo(POINTS[b]);
const validEdge=(a,b,s)=>!edgeError(a,b,s);
const rand=n=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n;};
const roomId=()=>Array.from({length:6},()=>CODE_CHARS[rand(CODE_CHARS.length)]).join('');
const copyText=async s=>{
 try{await navigator.clipboard.writeText(s);notify('Enlace copiado al portapapeles.');}
 catch{await showGameDialog({title:'COPIAR INVITACIÓN',message:'Selecciona el enlace para copiarlo desde tu dispositivo.',accept:'LISTO',cancel:null,copy:s});}
};
function notify(message){
 const t=el('toast');t.textContent='⬡ '+String(message);t.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4600);
}
let gameDialogResolve=null;
function closeGameDialog(accept){
 const layer=el('gameDialog');layer.classList.add('hidden');
 const callback=gameDialogResolve;gameDialogResolve=null;
 if(callback)callback(Boolean(accept));
}
function showGameDialog({title='AVISO DEL NEXO',message,accept='ACEPTAR',cancel='CANCELAR',copy=null}){
 if(gameDialogResolve)closeGameDialog(false);
 el('gameDialogTitle').textContent=title;
 el('gameDialogMessage').textContent=String(message);
 el('gameDialogAccept').textContent=accept;
 el('gameDialogCancel').classList.toggle('hidden',cancel===null);
 if(cancel!==null)el('gameDialogCancel').textContent=cancel;
 const field=el('gameDialogCopy');
 field.classList.toggle('hidden',copy===null);
 if(copy!==null)field.value=String(copy);
 el('gameDialog').classList.remove('hidden');
 if(copy!==null){field.focus();field.select();}
 else el('gameDialogAccept').focus();
 return new Promise(resolve=>{gameDialogResolve=resolve;});
}
const gameConfirm=(message,title='CONFIRMAR ACCIÓN')=>showGameDialog({title,message,accept:'SÍ, CONTINUAR',cancel:'REGRESAR'});
function screen(id){for(const n of ['menu','waiting','game','results'])el(n).classList.toggle('hidden',n!==id);el('monetization').classList.toggle('hidden',id==='game');}
function networkStatus(message,on=false){el('connection').textContent=message;el('connection').classList.toggle('online',on);}
function linkUrl(){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('room',room);return u.href;}
function cleanup(){
  clearTimeout(cpuTimer);clearTimeout(joinTimer);clearTimeout(reconnectTimer);clearTimeout(pendingSyncTimer);reconnectTimer=null;pendingSyncTimer=null;reconnectAttempts=0;selected=-1;connected=false;game=null;
  if(conn){try{conn.close();}catch{}conn=null;}
  if(peer){try{peer.destroy();}catch{}peer=null;}
  room='';mode='none';host=false;networkStatus('SIN CONECTAR');
}
function scheduleGuestReconnection(){
 if(mode!=='pvp'||host||!room||reconnectTimer||document.visibilityState==='hidden')return;
 const code=room;
 const delay=Math.min(8000,700*Math.pow(1.7,Math.min(reconnectAttempts,6)));
 reconnectTimer=setTimeout(()=>{
  reconnectTimer=null;
  if(mode!=='pvp'||host||room!==code||document.visibilityState==='hidden'||conn?.open)return;
  reconnectAttempts++;networkStatus('RECONEXIÓN '+reconnectAttempts+'…');
  joinRoom(code,true);
 },delay);
}
function askHostForFreshState(){
 if(mode!=='pvp'||host||!room)return;
 if(!conn?.open){scheduleGuestReconnection();return;}
 clearTimeout(pendingSyncTimer);
 try{
  conn.send({type:'SYNC_REQUEST',knownVersion:game?.version??-1});
  networkStatus('SINCRONIZANDO…');
  pendingSyncTimer=setTimeout(()=>{
   pendingSyncTimer=null;
   if(mode==='pvp'&&!host&&room){
    connected=false;
    if(conn){try{conn.close();}catch{}conn=null;}
    networkStatus('RECUPERANDO PARTIDA…');
    scheduleGuestReconnection();
   }
  },4500);
 }catch{
  connected=false;networkStatus('RECUPERANDO PARTIDA…');scheduleGuestReconnection();
 }
}
function restoreNetworkAfterPause(){
 if(mode!=='pvp'||!room||document.visibilityState==='hidden')return;
 if(peer?.disconnected&&!peer?.destroyed)try{peer.reconnect();}catch{}
 if(host){
  if(conn?.open)broadcast();
  else networkStatus('ESPERANDO AL RIVAL…');
 }else askHostForFreshState();
}
function newState(){
 const seed=rand(0x7fffffff),level=tutorial?1:selectedLevel;
 awardRecorded=false;
 return {schema:2,version:0,status:'play',turn:0,rolled:false,moves:0,dice:0,turns:0,
 lines:[],tris:[],scores:[0,0],winner:null,blocked:[],seed,level,
 players:[profilePacket(),{name:tutorial?'TUTOR BOT':'NEXUS BOT',color:'#ff2d7a',badge:'⚡'}],
 points:levelPoints(level,seed),maxTurns:LEVELS[level-1].count*2};
}
function enterGame(){
  screen('game');selected=-1;
  initialize3D();rebuildBoard();refresh();
  notify('Partida iniciada. Lanza el dado cuando sea tu turno.');
}
function setState(state){
 if(!state||state.schema!==2||!Array.isArray(state.points)||!Array.isArray(state.lines)||!Array.isArray(state.tris)||!Array.isArray(state.scores))return;
 /* los mensajes PvP se validan por esquema y versión */
 if(mode==='pvp'&&!host&&game&&state.version<game.version)return;
 game=state;POINTS=state.points.map(p=>new THREE.Vector3(...p));
 if(game.turn!==myPlayer)selected=-1;
 if(!el('game').classList.contains('hidden')){
   rebuildBoard();refresh();
 }else if(state.status==='play')enterGame();
 if(state.status==='end'&&!(!el('results').classList.contains('hidden')))finishGame();
}
function broadcast(){if(mode==='pvp'&&host&&conn?.open){try{conn.send({type:'STATE',state:game});}catch{notify('No se pudo enviar el estado');}}}
function action(type,data={}){
  if(!game||game.status!=='play')return;
  if(mode==='pvp'&&!host){if(!conn?.open){notify('Rival desconectado. Espera la reconexión.');return;}conn.send({type:'ACTION',action:type,data});return;}
  applyAction(type,data,0);
}
function foundTriangles(a,b,lines,existing){
 const result=[],known=new Set(existing.map(t=>[t.a,t.b,t.c].sort((x,y)=>x-y).join('-')));
 for(let c=0;c<POINTS.length;c++){
   if(c===a||c===b)continue;
   if(!lines.some(e=>linkKey(e.a,e.b)===linkKey(a,c)))continue;
   if(!lines.some(e=>linkKey(e.a,e.b)===linkKey(b,c)))continue;
   const k=[a,b,c].sort((x,y)=>x-y).join('-');if(known.has(k))continue;
   const n=triangleNormal(POINTS[a],POINTS[b],POINTS[c]);
   if(Math.sqrt(normSq3(n))<.085)continue;
   known.add(k);result.push({a,b,c,owner:game.turn});
 }
 return result;
}
function eligibleCount(s){
  let count=0;
  for(let a=0;a<POINTS.length;a++)for(let b=a+1;b<POINTS.length;b++)if(validEdge(a,b,s))count++;
  return count;
}
function endTurn(){
 game.moves=0;game.rolled=false;game.turns++;
 game.blocked=blockedNodes(game);
 if(game.turns>=game.maxTurns||eligibleCount(game)===0){
   game.status='end';game.winner=game.scores[0]===game.scores[1]?-1:(game.scores[0]>game.scores[1]?0:1);
 }else game.turn=1-game.turn;
}
function applyAction(type,data,player){
 if(!game||game.status!=='play'||game.turn!==player)return false;
 if(type==='ROLL'){
  if(game.rolled)return false;
  const candidates=eligibleCount(game);
  if(candidates===0){endTurn();}else{
   game.rolled=true;game.dice=1+rand(6);game.moves=Math.min(game.dice,candidates);
   if(player===1)game.botMovedThisTurn=false;
  }
 }else if(type==='LINE'){
  if(!game.rolled||game.moves<1)return false;
  const {a,b}=data;
  if(!validEdge(a,b,game)){if(player===myPlayer)notify(edgeError(a,b,game));return false;}
  game.lines.push({a,b,owner:player});
  const triangles=foundTriangles(a,b,game.lines,game.tris);
  game.tris.push(...triangles);game.scores[player]+=triangles.length*10;
  game.blocked=blockedNodes(game);game.moves--;
  if(player===1)game.botMovedThisTurn=true;
  // No congelar tutorial si el dado otorga más líneas que las que quedan disponibles.
  if(game.moves===0||eligibleCount(game)===0)endTurn();
 }else if(type==='PASS'){
  if(!game.rolled)return false;
  endTurn();
 }else if(type==='SURRENDER'){
  game.status='end';game.winner=1-player;
 }else return false;
 game.version++;setState(game);broadcast();
 if(['cpu','tutorial'].includes(mode))scheduleCpu();
 return true;
}
function scheduleCpu(){
 clearTimeout(cpuTimer);
 if(!['cpu','tutorial'].includes(mode)||!game||game.status!=='play'||game.turn!==1)return;
 const stateVersion=game.version;
 cpuTimer=setTimeout(()=>{
  if(!game||game.version!==stateVersion||game.status!=='play'||game.turn!==1)return;
  if(!game.rolled){applyAction('ROLL',{},1);return;}
  if(mode==='tutorial' && game.botMovedThisTurn){applyAction('PASS',{},1);return;}
  let best=null,bestValue=-Infinity;
  for(let a=0;a<POINTS.length;a++)for(let b=a+1;b<POINTS.length;b++){
   if(!validEdge(a,b,game))continue;
   const future=[...game.lines,{a,b,owner:1}];
   const score=foundTriangles(a,b,future,game.tris).length*100-distance(a,b)+(Math.random()*.12);
   if(score>bestValue){bestValue=score;best={a,b};}
  }
  if(best)applyAction('LINE',best,1);
  else applyAction('PASS',{},1);
 },mode==='tutorial'?650:470);
}
function refresh(){
 if(!game)return;
 el('score0').textContent=game.scores[0];el('score1').textContent=game.scores[1];
 el('namePlayer1').textContent=(game.players?.[0]?.name||'JUGADOR 1').slice(0,12).toUpperCase();
 el('namePlayer2').textContent=(game.players?.[1]?.name||(mode==='tutorial'?'TUTOR BOT':'IA BOT')).slice(0,12).toUpperCase();
 el('roomDisplay').textContent=room?'SALA '+room:(mode==='cpu'?'VS CPU':'TUTORIAL');
 el('turnDisplay').textContent=game.status==='end'?'FIN DE PARTIDA':'TURNO JUGADOR '+(game.turn+1);
 el('energyDisplay').textContent=game.status==='end'?'FINALIZADO':!game.rolled?'TOCA EL DADO':game.moves+' CONEXIONES';
 const diceNumber=Number(game.dice)||0;
 el('diceResult').textContent=diceNumber?String(diceNumber):'TIRAR';
 el('levelTag').textContent='NIVEL '+game.level+' · '+POINTS.length+' NODOS';
 const yourTurn=game.turn===myPlayer&&game.status==='play'&&(mode!=='pvp'||connected);
 el('diceBtn').disabled=!yourTurn||game.rolled;el('passBtn').disabled=!yourTurn||!game.rolled;
 el('leaveBtn').disabled=false;
 el('selectedLabel').textContent=game.status==='end'?'Partida finalizada':
  !yourTurn?(mode==='tutorial'?'El BOT está jugando, espera un momento…':'Espera el turno del rival'):
  !game.rolled?'Pulsa el dado del centro para lanzar':selected<0?'Selecciona el primer nodo':'Nodo '+(selected+1)+' seleccionado. Elige otro.';
 for(let i=0;i<nodes.length;i++){
  const isSelected=i===selected,blocked=(game.blocked||[]).includes(i);
  nodes[i].material.color.setHex(blocked?0x5b7181:isSelected?0xffd231:0x68dcff);
  nodes[i].scale.setScalar(isSelected?1.45:1);
 }
 tutorials();
}
function finishGame(){
 if(!game)return;
 const didWin=game.winner===myPlayer,solo=['tutorial','cpu'].includes(mode);
 if(arSession)arSession.end().catch(()=>{});
 const won=awardResult();
 el('resultTitle').textContent=game.winner===-1?'EMPATE':(didWin?'¡VICTORIA!':'PARTIDA TERMINADA');
 el('resultSummary').textContent='Nivel '+game.level+' · Puntos '+game.scores[0]+' vs '+game.scores[1]+' · '+game.tris.length+' zonas conquistadas.';
 el('levelWinNotice').textContent=won?
  (game.level>=10?'¡Has completado los 10 niveles iniciales!':
  '¡Nivel '+Math.min(10,game.level+1)+' desbloqueado! El anuncio se mostrará entre niveles cuando la cuenta publicitaria esté aprobada.'):
  (game.winner===-1?'Empate: practica de nuevo.':'Puedes repetir el nivel para mejorarlo.');
 el('continueBtn').classList.toggle('hidden',!solo||!didWin||game.level>=10);
 el('restartLevelBtn').classList.toggle('hidden',!solo);
 el('restartLevelBtn').textContent=rewardedAds.enabled?'🎬 VER VIDEO Y REINICIAR':'↻ REINTENTAR NIVEL (BETA)';
 el('restartAdHint').classList.toggle('hidden',!solo);
 el('restartAdHint').textContent=rewardedAds.enabled?
  'El video es voluntario. También puedes volver al menú y repetir gratis.':
  'Todavía no hay videos publicitarios aprobados: puedes repetir directamente durante las pruebas.';
 screen('results');
 if(won)requestLevelInterstitial();
}
function showCpu(teach=false){
 if(!currentAccount){openLoginGate('Inicia sesión primero.');return;}
 cleanup();tutorial=!!teach;mode=teach?'tutorial':'cpu';host=true;connected=true;myPlayer=0;
 if(teach)selectedLevel=1;else selectedLevel=unlockedLevel;
 networkStatus(teach?'TUTORIAL':'MODO CPU',true);
 setState(newState());scheduleCpu();
}
function hostConnection(c){
 if(conn?.open){c.on('open',()=>{c.send({type:'ERROR',message:'La sala está ocupada'});c.close();});return;}
 conn=c;
 c.on('data',m=>{
  if(!m||typeof m!=='object')return;
  if(m.type==='HELLO'){
    connected=true;networkStatus('RIVAL CONECTADO',true);
    if(!game)game=newState();
    if(m.profile&&typeof m.profile==='object'){
      const p=m.profile;
      game.players[1]={name:String(p.name||'RIVAL').slice(0,30),color:/^#[0-9a-fA-F]{6}$/.test(p.color)?p.color:'#ff2d7a',badge:PLAYER_BADGES.includes(p.badge)?p.badge:'★'};
    }
    setState(game);broadcast();
  }else if(m.type==='SYNC_REQUEST'&&game){
    broadcast();
  }else if(m.type==='ACTION'&&connected&&game&&game.status==='play'){
    applyAction(m.action,m.data||{},1);
  }
 });
 c.on('close',()=>{if(conn===c){conn=null;connected=false;networkStatus('ESPERANDO RECONEXIÓN');refresh();notify('El rival puede reconectarse a la misma sala; la partida sigue guardada.');}});
 c.on('error',()=>networkStatus('ERROR DE CONEXIÓN'));
}
function showHostRoom(){
  screen('waiting');el('roomCode').textContent=room;el('qr').innerHTML='';
  if(typeof QRCode!=='undefined')new QRCode(el('qr'),{text:linkUrl(),width:164,height:164,correctLevel:QRCode.CorrectLevel.M});
  else el('qr').textContent='Comparte el código mostrado';
  el('waitingNote').textContent='Preparando la sala…';
}
function createRoom(){
  cleanup();if(typeof Peer==='undefined'){notify('No pudo cargarse PeerJS. Verifica la conexión a Internet.');return;}
  tutorial=false;awardRecorded=false;mode='pvp';host=true;myPlayer=0;room=roomId();showHostRoom();networkStatus('CONECTANDO…');
  try{
    peer=new Peer(PEER_PREFIX+room,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});
    peer.on('open',()=>{networkStatus('SALA ABIERTA',true);el('waitingNote').textContent='Sala abierta. Tu rival puede escribir el código o escanear el QR.';});
    peer.on('connection',hostConnection);
    peer.on('error',e=>{networkStatus('ERROR DE RED');el('waitingNote').textContent='Fallo de señalización: '+(e.type||e.message);notify('Prueba crear otra sala o usa otra red.');});
    peer.on('disconnected',()=>networkStatus('RECONECTANDO…'));
  }catch(e){notify('No se pudo crear sala: '+e.message);cleanup();screen('menu');}
}
function joinRoom(codeInput,keepState=false){
 const code=String(codeInput||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!==6){notify('El código debe tener seis letras o números.');return;}
 if(keepState){
  clearTimeout(joinTimer);clearTimeout(pendingSyncTimer);
  if(conn){try{conn.close();}catch{}conn=null;}
  if(peer){try{peer.destroy();}catch{}peer=null;}
  connected=false;
 }else cleanup();
 if(typeof Peer==='undefined'){
  notify('No pudo cargarse la conexión de salas. Verifica internet.');
  if(keepState)scheduleGuestReconnection();
  return;
 }
 tutorial=false;mode='pvp';host=false;myPlayer=1;room=code;
 networkStatus(keepState?'RECONECTANDO…':'CONECTANDO…');
 el('joinBtn').disabled=true;el('joinBtn').textContent='CONECTANDO…';
 try{
  const newPeer=new Peer(undefined,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});
  peer=newPeer;
  newPeer.on('open',()=>{
   if(peer!==newPeer)return;
   const newConn=newPeer.connect(PEER_PREFIX+code,{reliable:true,serialization:'json'});
   conn=newConn;
   newConn.on('open',()=>{
    if(conn!==newConn)return;
    clearTimeout(reconnectTimer);reconnectTimer=null;reconnectAttempts=0;
    connected=true;networkStatus('CONECTADO',true);
    newConn.send({type:'HELLO',version:VERSION,profile:profilePacket(),resume:Boolean(keepState)});
    // El anfitrión conserva la autoridad: siempre envía STATE completo.
    if(keepState)askHostForFreshState();
   });
   newConn.on('data',m=>{
    if(conn!==newConn)return;
    if(m?.type==='STATE'&&m.state){
     clearTimeout(joinTimer);clearTimeout(pendingSyncTimer);pendingSyncTimer=null;
     el('joinBtn').disabled=false;el('joinBtn').textContent='UNIRME';
     connected=true;reconnectAttempts=0;networkStatus('SINCRONIZADO',true);
     setState(m.state);
    }else if(m?.type==='ERROR'){notify(m.message);home();}
   });
   newConn.on('close',()=>{
    if(conn!==newConn)return;
    conn=null;connected=false;networkStatus('PARTIDA EN PAUSA');
    refresh();notify('Conexión interrumpida. Se intentará recuperar la misma sala.');
    scheduleGuestReconnection();
   });
   newConn.on('error',()=>{if(conn===newConn){connected=false;networkStatus('RECONEXIÓN PENDIENTE');scheduleGuestReconnection();}});
  });
  newPeer.on('error',e=>{
   if(peer!==newPeer)return;
   networkStatus('ERROR DE ENLACE');
   if(keepState||game){
    notify('Reconectando a la partida…');scheduleGuestReconnection();
   }else{
    clearTimeout(joinTimer);
    notify('No se encontró la sala o falló la conexión: '+(e.type||e.message));
    home();
   }
  });
  newPeer.on('disconnected',()=>{if(peer===newPeer&&!newPeer.destroyed)try{newPeer.reconnect();}catch{}});
  joinTimer=setTimeout(()=>{
   if(peer!==newPeer||conn?.open)return;
   if(keepState||game){networkStatus('BUSCANDO ANFITRIÓN');scheduleGuestReconnection();}
   else{notify('La sala no respondió. Revisa el código y la conexión.');home();}
  },14000);
 }catch(e){
  notify('No se pudo establecer la conexión: '+e.message);
  if(keepState)scheduleGuestReconnection();else home();
 }
}
function home(){if(arSession)arSession.end().catch(()=>{});cleanup();el('joinBtn').disabled=false;el('joinBtn').textContent='UNIRME';screen('menu');}

function badgeSprite(badge,color){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#081c30';ctx.beginPath();ctx.arc(64,64,43,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=color;ctx.lineWidth=5;ctx.stroke();
 ctx.fillStyle=color;ctx.font='bold 54px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(badge,64,66);
 const texture=new THREE.CanvasTexture(canvas),mat=new THREE.SpriteMaterial({map:texture,transparent:true});
 const spr=new THREE.Sprite(mat);spr.scale.set(.42,.42,1);return spr;
}
function scaleBoard(mult){
 if(!arSession||!board){notify('La escala se usa después de iniciar AR.');return;}
 const scale=Math.max(.12,Math.min(1.4,board.scale.x*mult));
 board.scale.setScalar(scale);syncARSlider();notify('Escala AR '+Math.round(scale*100)+'%');
}
function initBackground(){
 const canvas=el('bg-canvas');if(!canvas)return;const ctx=canvas.getContext('2d');let points=[];
 function resize(){canvas.width=innerWidth;canvas.height=innerHeight;points=Array.from({length:Math.min(70,Math.floor(innerWidth/24))},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,dx:(Math.random()-.5)*.28,dy:(Math.random()-.5)*.28}));}
 function tick(){
  if(document.hidden){requestAnimationFrame(tick);return;}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<points.length;i++){const p=points[i];p.x+=p.dx;p.y+=p.dy;
   if(p.x<0||p.x>canvas.width)p.dx=-p.dx;if(p.y<0||p.y>canvas.height)p.dy=-p.dy;
   ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,6.283);ctx.fillStyle='#0ab9dd';ctx.fill();
   for(let j=i+1;j<points.length;j++){const q=points[j],d=Math.hypot(p.x-q.x,p.y-q.y);
    if(d<125){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='rgba(0,222,255,'+(0.13*(1-d/125))+')';ctx.stroke();}
   }
  }
  requestAnimationFrame(tick);
 }
 resize();addEventListener('resize',resize);requestAnimationFrame(tick);
}
function initialize3D(){
 if(renderer){resize3D();return;}
 const viewport=el('viewport');scene=new THREE.Scene();scene.background=new THREE.Color(0x03121d);
 camera=new THREE.PerspectiveCamera(55,1,.01,100);camera.position.set(2.85,3.15,4.1);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.xr.enabled=true;viewport.appendChild(renderer.domElement);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1.5;orbit.maxDistance=12;orbit.target.set(0,.45,0);orbit.update();
 scene.add(new THREE.HemisphereLight(0xffffff,0x18405b,2.2));
 const light=new THREE.DirectionalLight(0x8ceeff,2.7);light.position.set(3,5,2);scene.add(light);
 board=new THREE.Group();scene.add(board);staticGroup=new THREE.Group();linesGroup=new THREE.Group();triGroup=new THREE.Group();
 board.add(staticGroup,triGroup,linesGroup);
 renderer.domElement.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart)return;const delta=Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1]);pointerStart=null;if(delta<9)pickNode(e);});
 window.addEventListener('resize',resize3D);
 renderer.setAnimationLoop((time,frame)=>{if(orbit&&!arSession)orbit.update();updateAR(frame);if(arSession)updateARAim();renderer.render(scene,camera);});
 resize3D();
}
function resize3D(){if(!renderer||arSession)return;const rect=el('viewport').getBoundingClientRect();if(!rect.width||!rect.height)return;camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);}
function clearGroup(gr){for(const o of [...gr.children]){gr.remove(o);o.traverse?.(m=>{if(m.isMesh){m.geometry?.dispose();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());else m.material?.dispose();}});}}
function lineMesh(a,b,color){
  const start=POINTS[a],end=POINTS[b],delta=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,delta.length(),8),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.36}));
  mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return mesh;
}
function rebuildBoard(){
 if(!game||!board)return;
 clearGroup(linesGroup);clearGroup(triGroup);clearGroup(staticGroup);
 nodes=[];
 // Base inferior holográfica: sin cubo envolvente, con guías al nivel del piso.
 const ring=new THREE.Mesh(new THREE.RingGeometry(1.7,1.75,80),new THREE.MeshBasicMaterial({color:0x00ccff,transparent:true,opacity:.40,side:THREE.DoubleSide}));
 ring.rotation.x=-Math.PI/2;staticGroup.add(ring);
 const grid=new THREE.GridHelper(3.35,12,0x286985,0x164057);grid.position.y=0;staticGroup.add(grid);
 const mat=new THREE.MeshStandardMaterial({color:0x68dcff,emissive:0x0c9cbc,emissiveIntensity:.55,metalness:.15,roughness:.3});
 const geo=new THREE.SphereGeometry(.073,16,12);
 for(let i=0;i<POINTS.length;i++){
  const p=POINTS[i];
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,p.y,6),new THREE.MeshBasicMaterial({color:0x37bdd5,transparent:true,opacity:.42}));
  post.position.set(p.x,p.y/2,p.z);staticGroup.add(post);
  const node=new THREE.Mesh(geo,mat.clone());node.position.copy(p);node.userData.nodeId=i;staticGroup.add(node);nodes.push(node);
 }
 for(const t of game.tris){
   const geom=new THREE.BufferGeometry().setFromPoints([POINTS[t.a],POINTS[t.b],POINTS[t.c]]);
   geom.setIndex([0,1,2]);geom.computeVertexNormals();
   const color=game.players?.[t.owner]?.color|| (t.owner===0?'#00eaff':'#ff2d7a');
   triGroup.add(new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false})));
   const center=POINTS[t.a].clone().add(POINTS[t.b]).add(POINTS[t.c]).multiplyScalar(1/3);center.y+=.10;
   const badge=badgeSprite(game.players?.[t.owner]?.badge||'◆',color);badge.position.copy(center);triGroup.add(badge);
 }
 for(const l of game.lines){
  const color=game.players?.[l.owner]?.color||(l.owner===0?'#00eaff':'#ff2d7a');
  linesGroup.add(lineMesh(l.a,l.b,color));
 }
}
// En AR los toques pertenecen al DOM overlay o XRSession; no a la ArrayCamera.
let arPointerStart=null,lastARNodePick=0,arSelectionMode='touch',arAimedNode=-1;
const arPointers=new Set();
function canSelectNode(){
 return Boolean(game&&game.status==='play'&&game.turn===myPlayer&&game.rolled&&game.moves&&(mode!=='pvp'||connected));
}
function selectNodeById(id){
 if(!canSelectNode()||!Number.isInteger(id))return false;
 if((game.blocked||[]).includes(id)){notify('Nodo bloqueado: una zona conquistada lo atraviesa o está encerrado.');return false;}
 if(selected===-1){selected=id;refresh();return true;}
 if(selected===id){selected=-1;refresh();return true;}
 const a=selected;selected=-1;
 if(!validEdge(a,id,game)){notify(edgeError(a,id,game)||'Conexión bloqueada');refresh();return false;}
 action('LINE',{a,b:id});refresh();return true;
}
function xrViewCameras(){
 const xrCamera=renderer?.xr?.getCamera();
 return xrCamera?.cameras?.filter(c=>c.isPerspectiveCamera)||[];
}
function closestXRNodeOnScreen(clientX,clientY){
 if(!arSession||!arPlaced||!board?.visible)return -1;
 const width=window.innerWidth,height=window.innerHeight;
 if(width<=0||height<=0)return -1;
 const views=xrViewCameras();if(!views.length)return -1;
 board.updateWorldMatrix(true,true);
 const pos=new THREE.Vector3(),ndc=new THREE.Vector3();
 let nearest=-1,nearDist=Infinity;
 for(let i=0;i<nodes.length;i++){
  nodes[i].getWorldPosition(pos);
  for(const view of views){
   ndc.copy(pos).project(view);
   if(ndc.z< -1||ndc.z>1)continue;
   const x=(ndc.x+1)*width/2,y=(1-ndc.y)*height/2;
   const d=Math.hypot(clientX-x,clientY-y);
   if(d<nearDist){nearDist=d;nearest=i;}
  }
 }
 // Facilitar el toque: las esferas AR físicas son de pocos centímetros.
 return nearDist<=Math.max(32,Math.min(52,width*.12))?nearest:-1;
}
function pickNode(e){
 if(arSession||!canSelectNode())return;
 const rect=renderer.domElement.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
 raycaster.setFromCamera(mouse,camera);
 const hits=raycaster.intersectObjects(nodes,false);
 if(hits.length)selectNodeById(hits[0].object.userData.nodeId);
}
// Dos formas de seleccionar: tocar el nodo en pantalla o apuntar con la cámara
// a su posición en el espacio y confirmar. El evento XRSelect también está activo.
function setARSelectionMode(next){
 arSelectionMode=next==='aim'?'aim':'touch';
 arAimedNode=-1;
 const aiming=arSelectionMode==='aim';
 el('arTouchModeBtn').classList.toggle('ar-mode-active',!aiming);
 el('arAimModeBtn').classList.toggle('ar-mode-active',aiming);
 el('arTouchModeBtn').setAttribute('aria-pressed',String(!aiming));
 el('arAimModeBtn').setAttribute('aria-pressed',String(aiming));
 el('arAimCrosshair').classList.toggle('hidden',!aiming||!arSession);
 el('arAimSelectBtn').classList.toggle('hidden',!aiming);
 el('arAimSelectBtn').disabled=true;
 el('arAimText').textContent=aiming?'Apunta la cruz al punto 3D y pulsa SELECCIONAR.':'Toca directamente dos nodos en la pantalla.';
}
function updateARAim(){
 if(!arSession||!arPlaced||arSelectionMode!=='aim')return;
 const id=closestXRNodeOnScreen(window.innerWidth/2,window.innerHeight/2);
 // El turno puede cambiar aunque el objetivo siga siendo el mismo.
 el('arAimSelectBtn').disabled=id<0||!canSelectNode();
 if(id===arAimedNode)return;
 arAimedNode=id;
 const target=el('arAimText');
 target.textContent=id>=0?'OBJETIVO: NODO '+(id+1)+' · pulsa SELECCIONAR':'Mueve el celular hasta alinear la cruz con un nodo.';
 el('arAimCrosshair').classList.toggle('ar-aim-target',id>=0);
}
function selectAimedNode(){
 if(!arSession||arSelectionMode!=='aim'||!arPlaced)return false;
 const id=closestXRNodeOnScreen(window.innerWidth/2,window.innerHeight/2);
 if(id<0){notify('Apunta al nodo con la cruz del centro.');return false;}
 if(Date.now()-lastARNodePick<330)return false;
 const didSelect=selectNodeById(id);
 if(didSelect)lastARNodePick=Date.now();
 return didSelect;
}
function isARControl(target){
 return Boolean(target?.closest?.('button,input,select,textarea,a,label,.game-header,.toolbar,.ar-size-control,.selected,.arenaLabel,.tutorial-hint,.overlay,.ar-selection-modes,.ar-aim-crosshair,.academy-overlay'));
}
function pickNodeInAR(clientX,clientY){
 if(!arPlaced||!canSelectNode()||Date.now()-lastARNodePick<330)return false;
 const id=closestXRNodeOnScreen(clientX,clientY);
 if(id<0)return false;
 const ok=selectNodeById(id);if(ok)lastARNodePick=Date.now();return ok;
}
function onARPointerDown(e){
 if(!arSession||!arPlaced||arSelectionMode!=='touch'||isARControl(e.target))return;
 arPointers.add(e.pointerId);
 if(arPointers.size===1)arPointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};
 else arPointerStart=null;
}
function onARPointerUp(e){
 if(!arSession)return;
 arPointers.delete(e.pointerId);
 const start=arPointerStart;arPointerStart=null;
 if(!start||arSelectionMode!=='touch'||arPointers.size||start.id!==e.pointerId||isARControl(e.target))return;
 if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>20)return;
 pickNodeInAR(e.clientX,e.clientY);
}
function onARXRSelect(e){
 if(!arSession||!arPlaced||!canSelectNode()||Date.now()-lastARNodePick<330)return;
 if(arSelectionMode==='aim'){selectAimedNode();return;}
 try{
  const ref=renderer.xr.getReferenceSpace(),raySpace=e.inputSource?.targetRaySpace;
  if(!ref||!raySpace)return;
  const pose=e.frame.getPose(raySpace,ref);if(!pose)return;
  const transform=pose.transform;
  const origin=new THREE.Vector3(transform.position.x,transform.position.y,transform.position.z);
  const q=new THREE.Quaternion(transform.orientation.x,transform.orientation.y,transform.orientation.z,transform.orientation.w);
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
  const ray=new THREE.Ray(origin,direction);
  board.updateWorldMatrix(true,true);
  const world=new THREE.Vector3();
  let closest=-1,min=Infinity;
  const radius=Math.max(.055,board.scale.x*.19);
  for(let i=0;i<nodes.length;i++){
   nodes[i].getWorldPosition(world);
   if(world.clone().sub(origin).dot(direction)<0)continue;
   const distance=Math.sqrt(ray.distanceSqToPoint(world));
   if(distance<radius&&distance<min){closest=i;min=distance;}
  }
  if(closest>=0&&selectNodeById(closest))lastARNodePick=Date.now();
 }catch(err){console.debug('AR select sin pose válida:',err);}
}

function resetView(){
 if(!camera||arSession){notify('En AR puedes ajustar el tamaño con ESCALA.');return;}
 camera.position.set(2.85,3.15,4.1);orbit.target.set(0,.42,0);orbit.update();
}
function resetBoard(){
  board.position.set(0,0,0);board.quaternion.identity();board.scale.setScalar(1);
}
function updateAR(frame){
 if(!frame||!arSession||!hitSource||arPlaced)return;
 const hits=frame.getHitTestResults(hitSource);
 if(!hits.length){reticle.visible=false;lastHit=null;return;}
 const pose=hits[0].getPose(arSpace);
 if(!pose){reticle.visible=false;lastHit=null;return;}
 reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix);lastHit=reticle.matrix.clone();
}
async function startAR(){
 if(!renderer||!game||arSession)return;
 if(!navigator.xr){notify('Este navegador no ofrece WebXR AR. Continúa en 3D.');return;}
 try{
  const session=await navigator.xr.requestSession('immersive-ar',{optionalFeatures:['hit-test','dom-overlay','local-floor','bounded-floor'],domOverlay:{root:document.body}});
  arSession=session;arPlaced=false;lastHit=null;scene.background=null;orbit.enabled=false;
  board.visible=false;document.body.classList.add('xr-active');el('arSelectionModes').classList.remove('hidden');setARSelectionMode('touch');el('arSizeControl').classList.remove('hidden');syncARSlider();el('placeBtn').classList.remove('hidden');el('exitArBtn').classList.remove('hidden');el('arBtn').classList.add('hidden');
  session.addEventListener('select',onARXRSelect);
  session.addEventListener('end',()=>{
   arSession=null;arPlaced=false;lastHit=null;arPointerStart=null;arPointers.clear();
   if(hitSource){try{hitSource.cancel();}catch{}hitSource=null;}
   scene.background=new THREE.Color(0x03121d);document.body.classList.remove('xr-active');el('arSelectionModes').classList.add('hidden');el('arAimCrosshair').classList.add('hidden');arAimedNode=-1;el('arSizeControl').classList.add('hidden');
   el('placeBtn').classList.add('hidden');el('exitArBtn').classList.add('hidden');el('arBtn').classList.remove('hidden');
   if(reticle)reticle.visible=false;board.visible=true;resetBoard();orbit.enabled=true;resize3D();
   if(document.visibilityState==='visible')remindARAfterSleep();
  });
  if(!reticle){reticle=new THREE.Mesh(new THREE.RingGeometry(.065,.083,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x00ffbb,side:THREE.DoubleSide}));reticle.matrixAutoUpdate=false;scene.add(reticle);}
  reticle.visible=false;
  // Corrección de referenceSpace: probar compatibilidad antes de pasar sesión a Three.js.
  let spaceType=null;
  for(const type of ['local','local-floor','viewer']){
   try{arSpace=await session.requestReferenceSpace(type);spaceType=type;break;}catch{}
  }
  if(!spaceType)throw new Error('Ningún espacio de referencia AR compatible.');
  renderer.xr.setReferenceSpaceType(spaceType);
  await renderer.xr.setSession(session);
  try{
   const viewer=await session.requestReferenceSpace('viewer');
   hitSource=await session.requestHitTestSource({space:viewer});
   notify('Busca una superficie con la cámara y pulsa FIJAR TABLERO.');
  }catch{
   hitSource=null;board.visible=true;arPlaced=true;board.position.set(0,-.25,-1.2);board.scale.setScalar(.26);syncARSlider();
   el('placeBtn').classList.add('hidden');
   notify('Holograma AR activado. Lanza el dado y toca dos nodos; este modo no fija el suelo.');
  }
 }catch(e){notify('AR no disponible: '+(e.message||'equipo incompatible'));if(arSession)try{await arSession.end();}catch{}}
}
function placeAR(){
 if(!arSession||!lastHit){notify('Todavía no se detecta una superficie. Mueve el teléfono lentamente.');return;}
 const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();lastHit.decompose(p,q,s);
 board.position.copy(p);board.quaternion.copy(q);board.scale.setScalar(.26);
 board.visible=true;arPlaced=true;syncARSlider();if(reticle)reticle.visible=false;
 el('placeBtn').classList.add('hidden');
 notify('Tablero fijado: lanza el dado cuando sea tu turno y toca dos nodos. La ubicación AR sigue siendo local.');
}
async function stopScanner(){
  el('scanner').classList.add('hidden');
  if(scanner){const current=scanner;scanner=null;try{await current.stop();}catch{}try{await current.clear();}catch{}}
}
function startScanner(){
  el('scanner').classList.remove('hidden');
  if(typeof Html5Qrcode==='undefined'){notify('No se pudo cargar el lector QR. Usa el código.');return;}
  scanner=new Html5Qrcode('qr-reader');
  scanner.start({facingMode:'environment'},{fps:8,qrbox:200},decoded=>{
    let c='';
    try{c=new URL(decoded).searchParams.get('room')||'';}catch{c=decoded;}
    c=c.toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(c.length===6){stopScanner();el('joinCode').value=c;joinRoom(c);}
  },()=>{}).catch(()=>{notify('No se obtuvo acceso a la cámara. Usa el código de la sala.');stopScanner();});
}
let h5AdsEnabled=false;
function requestLevelInterstitial(){
 if(!h5AdsEnabled||typeof window.adBreak!=='function')return;
 try{window.adBreak({type:'next',name:'level-completed',adBreakDone:()=>{}});}
 catch(e){console.warn('Anuncio H5 no disponible:',e);}
}
function continueToNextLevel(){
 if(!currentAccount||!game)return;
 selectedLevel=Math.min(10,game.level+1);
 tutorial=false;
 showCpu(false);
}
function animateGalacticDice(){
 const dice=el('diceBtn');
 dice.classList.remove('is-rolling');void dice.offsetWidth;dice.classList.add('is-rolling');
 setTimeout(()=>dice.classList.remove('is-rolling'),740);
}
async function setAds(){
 const btn=el('rewardBtn');
 btn.disabled=true;
 btn.textContent='VIDEOS RECOMPENSADOS PENDIENTES';
 const ready=await rewardedAds.init();
 h5AdsEnabled=ready;
 if(!ready){renderProfile();return;}
 btn.disabled=false;
 btn.textContent='VER VIDEO VOLUNTARIO (+20 MONEDAS)';
 renderProfile();
}
async function earnCoinReward(){
 if(!rewardedAds.enabled)return;
 const agreed=await showGameDialog({title:'BONO DE 20 MONEDAS',
  message:'¿Quieres ver un anuncio recompensado voluntario? Solo recibirás monedas cuando el video termine.',
  accept:'VER VIDEO',cancel:'CANCELAR'});
 if(!agreed)return;
 const result=await rewardedAds.watch('coins');
 if(!result.viewed){notify('No hubo video completado. No se otorgaron monedas.');return;}
 profile.coins=(Number(profile.coins)||0)+20;
 saveProfile();el('coins').textContent=profile.coins;
 notify('¡20 monedas cosméticas añadidas!');
}
function retryCurrentSoloRound(){
 if(!game||!['cpu','tutorial'].includes(mode)||!currentAccount)return;
 const level=game.level,teach=mode==='tutorial';
 cleanup();
 tutorial=teach;selectedLevel=level;mode=teach?'tutorial':'cpu';
 host=true;connected=true;myPlayer=0;
 networkStatus(teach?'TUTORIAL':'MODO CPU',true);
 setState(newState());scheduleCpu();
}
async function restartLevelWithReward(){
 if(!game||!['cpu','tutorial'].includes(mode))return;
 if(!rewardedAds.enabled){
  // Beta sin publicidad: el usuario SIEMPRE puede continuar jugando.
  retryCurrentSoloRound();notify('Nivel reiniciado gratuitamente (beta sin anuncios).');return;
 }
 const agreed=await showGameDialog({title:'REINTENTAR NIVEL',
  message:'Puedes regresar al menú y repetir gratuitamente, o ver voluntariamente un video para reiniciar directamente aquí.',
  accept:'VER VIDEO Y REINICIAR',cancel:'CANCELAR'});
 if(!agreed)return;
 const result=await rewardedAds.watch('retry-level');
 if(result.viewed){retryCurrentSoloRound();notify('¡Reintento habilitado!');}
 else notify('No hubo video completado. Puedes volver al menú para repetir gratis.');
}

// Diagnóstico local (no solicita permisos ni comunica datos a la red).
let diagnosticText='';
async function showDiagnostics(){
  const layer=el('diagnostics'),box=el('diagResults');
  layer.classList.remove('hidden');box.replaceChildren();
  const check=(name,ok,note)=>{
    const node=document.createElement('div');node.className='diagRow';
    const icon=document.createElement('span');icon.className=ok?'diagOK':'diagWarn';
    icon.textContent=ok?'✓':'!';
    const detail=document.createElement('div');
    const title=document.createElement('b');title.textContent=name;
    const info=document.createElement('small');info.textContent=note;
    detail.append(title,info);node.append(icon,detail);box.appendChild(node);
    diagnosticText+=name+': '+(ok?'OK':'LIMITADO')+' — '+note+'\n';
  };
  diagnosticText='3 LINE-AR '+VERSION+' | Diagnóstico local\n';
  diagnosticText+='Sistema: '+navigator.userAgent+'\n';
  diagnosticText+='Fecha: '+new Date().toISOString()+'\n';
  check('HTTPS / contexto seguro',window.isSecureContext,'La cámara y WebXR requieren HTTPS (o localhost).');
  check('Motor WebGL',Boolean(document.createElement('canvas').getContext('webgl2')),'Necesario para renderizar el tablero 3D.');
  check('WebRTC',typeof RTCPeerConnection!=='undefined','API del navegador para PvP; esto no prueba conectividad entre redes.');
  check('Señalización PeerJS',typeof window.Peer!=='undefined','El servidor de señalización externo aún debe estar accesible.');
  check('Acceso posible a cámara',Boolean(navigator.mediaDevices?.getUserMedia),'No significa que se hayan concedido permisos.');
  check('Internet (indicador)',navigator.onLine!==false,'navigator.onLine no garantiza acceso a servicios externos.');
  if(navigator.xr?.isSessionSupported){
    try{
      const supported=await navigator.xr.isSessionSupported('immersive-ar');
      check('WebXR immersive-ar',supported,supported?'Disponible en el navegador; se probará al activar AR.':'Este dispositivo debe utilizar el modo 3D.');
    }catch(e){check('WebXR immersive-ar',false,'No pudo consultarse: '+(e.message||String(e)));}
  }else check('WebXR immersive-ar',false,'No está disponible en este navegador; puedes jugar en 3D.');
  diagnosticText+='Estado de conexión en la partida: '+el('connection').textContent+'\n';
  diagnosticText+='Aviso: compartir este informe revela tipo de dispositivo y navegador, nunca contraseñas.\n';
}

let pendingJoinCode='';
let arWasActiveWhenHidden=false;
function remindARAfterSleep(){
 if(arWasActiveWhenHidden && !arSession && game?.status==='play'){
  arWasActiveWhenHidden=false;
  notify('⬡ AR PAUSADA: tu partida continúa. Pulsa ACTIVAR AR y fija de nuevo el tablero para seguir jugando.');
 }
}

let pinchDistance=0,pinchScaleStart=0;
function syncARSlider(){
 if(board&&el('arScaleSlider'))el('arScaleSlider').value=String(Math.max(.12,Math.min(1.4,board.scale.x)));
}
function enablePinchScale(){
 const root=el('viewport');
 root.addEventListener('touchstart',e=>{
  if(!arSession||e.touches.length!==2)return;
  const [a,b]=e.touches;
  pinchDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  pinchScaleStart=board?.scale.x||.26;e.preventDefault();
 },{passive:false});
 root.addEventListener('touchmove',e=>{
  if(!arSession||e.touches.length!==2||pinchDistance<=0||!board)return;
  const [a,b]=e.touches,d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  board.scale.setScalar(Math.max(.12,Math.min(1.4,pinchScaleStart*d/pinchDistance)));
  syncARSlider();e.preventDefault();
 },{passive:false});
 root.addEventListener('touchend',e=>{if(e.touches.length<2)pinchDistance=0;},{passive:true});
}

function bind(){
 el('gameDialogAccept').addEventListener('click',()=>closeGameDialog(true));
 el('gameDialogCancel').addEventListener('click',()=>closeGameDialog(false));
 el('gameDialog').addEventListener('pointerdown',e=>{if(e.target===el('gameDialog'))closeGameDialog(false);});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!el('academyOverlay').classList.contains('hidden')){e.preventDefault();closeAcademy();return;}
  if(el('gameDialog').classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();closeGameDialog(false);}
 });
 // En dispositivos móviles la suspensión de pantalla puede interrumpir WebRTC.
 // Al regresar se solicita snapshot completo sin reiniciar la partida ni nivel.
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden' && arSession) arWasActiveWhenHidden=true;
  if(document.visibilityState==='visible'){
   restoreNetworkAfterPause();
   if(arSession)arWasActiveWhenHidden=false;
   else remindARAfterSleep();
  }
 });
 window.addEventListener('pageshow',()=>{if(mode==='pvp')restoreNetworkAfterPause();});
 window.addEventListener('online',()=>{if(mode==='pvp')restoreNetworkAfterPause();});
 document.addEventListener('pointerdown',onARPointerDown,true);
 document.addEventListener('pointerup',onARPointerUp,true);
 document.addEventListener('pointercancel',e=>{arPointers.delete(e.pointerId);arPointerStart=null;},true);
 document.addEventListener('beforexrselect',e=>{if(arSession&&isARControl(e.target))e.preventDefault();});
 el('createBtn').addEventListener('click',createRoom);
 el('cpuBtn').addEventListener('click',()=>showCpu(false));
 el('tutorialBtn').addEventListener('click',()=>{selectedLevel=1;renderLevels();showCpu(true);});
 el('academyBtn').addEventListener('click',openAcademy);
 el('academyGameBtn').addEventListener('click',openAcademy);
 el('academyCloseBtn').addEventListener('click',closeAcademy);
 el('academyChoiceA').addEventListener('click',()=>answerAcademy(0));
 el('academyChoiceB').addEventListener('click',()=>answerAcademy(1));
 el('academyPrevBtn').addEventListener('click',()=>{if(academyIndex>0){academyIndex--;renderAcademy();}});
 el('academyNextBtn').addEventListener('click',nextAcademy);
 el('academyPracticeBtn').addEventListener('click',startAcademyPractice);
 el('academyOverlay').addEventListener('pointerdown',e=>{if(e.target===el('academyOverlay'))closeAcademy();});
 el('joinBtn').addEventListener('click',()=>joinRoom(el('joinCode').value));
 el('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom(el('joinCode').value);});
 el('scanBtn').addEventListener('click',startScanner);
 el('diagnoseBtn').addEventListener('click',showDiagnostics);
 el('diagCloseBtn').addEventListener('click',()=>el('diagnostics').classList.add('hidden'));
 el('diagCopyBtn').addEventListener('click',()=>copyText(diagnosticText));
 el('closeScanBtn').addEventListener('click',stopScanner);
 el('copyBtn').addEventListener('click',()=>copyText(linkUrl()));
 el('cancelBtn').addEventListener('click',home);
 el('diceBtn').addEventListener('click',()=>{animateGalacticDice();action('ROLL');});
 el('passBtn').addEventListener('click',()=>action('PASS'));
 el('leaveBtn').addEventListener('click',async()=>{if(!await gameConfirm('Abandonar la sala finalizará tu participación. ¿Quieres salir?','ABANDONAR PARTIDA'))return;action('SURRENDER');home();});
 el('homeBtn').addEventListener('click',home);
 el('continueBtn').addEventListener('click',continueToNextLevel);
 el('restartLevelBtn').addEventListener('click',restartLevelWithReward);
 el('resetViewBtn').addEventListener('click',resetView);
 el('arBtn').addEventListener('click',startAR);
 el('arTouchModeBtn').addEventListener('click',()=>setARSelectionMode('touch'));
 el('arAimModeBtn').addEventListener('click',()=>setARSelectionMode('aim'));
 el('arAimSelectBtn').addEventListener('click',selectAimedNode);
 el('placeBtn').addEventListener('click',placeAR);
 el('scaleDownBtn').addEventListener('click',()=>scaleBoard(.87));
 el('scaleUpBtn').addEventListener('click',()=>scaleBoard(1.15));
 el('exitArBtn').addEventListener('click',()=>arSession?.end().catch(()=>{}));
 el('colors').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(b){profile.color=b.dataset.color;saveProfile();}});
 el('badges').addEventListener('click',e=>{const b=e.target.closest('[data-badge]');if(b)chooseBadge(b.dataset.badge);});
 el('googleBtn').addEventListener('click',loginGoogleFlow);
 el('guestBtn').addEventListener('click',loginGuestFlow);
 el('levelsBtn').addEventListener('click',()=>el('levelPanel').classList.toggle('hidden'));
 el('inviteBtn').addEventListener('click',()=>copyText(location.origin+location.pathname));
 el('coins').textContent=Number(profile.coins||0);
 el('rewardBtn').addEventListener('click',earnCoinReward);
 setAds();screen('menu');networkStatus('SIN CONECTAR');
 renderProfile();renderLevels();initBackground();enablePinchScale();beginLogin();
 el('signGoogleBtn').addEventListener('click',loginGoogleFlow);
 el('signGuestBtn').addEventListener('click',loginGuestFlow);
 el('logoutBtn').addEventListener('click',logoutGame);
 el('arScaleSlider').addEventListener('input',e=>{if(board&&arSession)board.scale.setScalar(Math.max(.12,Math.min(1.4,Number(e.target.value)||.26)));});
 pendingJoinCode=new URLSearchParams(location.search).get('room')||'';
 if(!/^[A-Z0-9]{6}$/i.test(pendingJoinCode))pendingJoinCode='';
}
bind();
// Exposición limitada para pruebas automatizadas sin alterar el juego desde consola.
window.__gameDiagnostics=()=>({version:VERSION,mode,room,connected,player:myPlayer,turn:game?.turn,status:game?.status,gameVersion:game?.version,scores:game?.scores,edges:game?.lines.length,triangles:game?.tris.length});
