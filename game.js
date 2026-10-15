import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {initializeAccountAuth, loginGoogle, loginGuest, logoutFirebase, authAvailable} from './auth.js?v=57.4.0';

// v57.4.0-beta.1 | un único estado de reglas para CPU, PvP WebRTC, 3D y WebXR.
// PeerJS usa su señalización pública: funcional para pruebas, NO es un backend SLA.
// El punto AR de cada dispositivo es LOCAL: QR de sala no comparte coordenadas físicas.
const VERSION='57.4.0-beta.1';
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
  if(!confirm('¿Cerrar sesión de este dispositivo?'))return;
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
const PLAYER_BADGES=['◆','⚡','★','✦','☣','🛡','👑','🐉','🦅','🤖','👾','🔥','❄','⚔','☯','♜'];
function profilePacket(){return {name:String(profile.name).slice(0,30),color:profile.color,badge:profile.badge};}
function saveProfile(){try{localStorage.setItem(accountProfileKey(currentAccount?.uid||'local-guest'),JSON.stringify(profile));}catch{} renderProfile();}
function renderProfile(){
 for(const [id,val] of [['profileName',profile.name],['profileAvatar',profile.badge],['rankLevel',profile.level],['eloValue',profile.elo]]){const elem=document.getElementById(id);if(elem)elem.textContent=val;}
 const a=document.getElementById('profileAvatar');if(a)a.style.color=profile.color;
 document.querySelectorAll('#colors [data-color]').forEach(x=>x.classList.toggle('current',x.dataset.color===profile.color));
 document.querySelectorAll('#badges [data-badge]').forEach(x=>x.classList.toggle('current',x.dataset.badge===profile.badge));
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
function tutorials(){
 const h=document.getElementById('tutorialHint');if(!h)return;
 h.classList.toggle('hidden',!tutorial||!game||game.status!=='play');
 if(!tutorial||!game)return;
 h.textContent=!game.rolled?'PASO 1 · Pulsa el dado luminoso de arriba.':selected<0?'PASO 2 · Toca un nodo. A continuación toca otro para construir una línea.':'PASO 3 · Escoge un segundo nodo. Cierra tres líneas para formar tu primer triángulo.';
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
function blockedNodes(s){
 const blocked=new Set();
 for(const t of s.tris){const a=xy(t.a),b=xy(t.b),c=xy(t.c);
 for(let i=0;i<POINTS.length;i++)if(![t.a,t.b,t.c].includes(i)&&pointInsideTriangle(xy(i),a,b,c))blocked.add(i);}
 return [...blocked];
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
function crossesOwnedTriangle(a,b,t){
 const A=xy(a),B=xy(b),T=[xy(t.a),xy(t.b),xy(t.c)];
 // Cualquier cruce estricto del límite de una zona pintada bloquea el camino.
 for(let i=0;i<3;i++)if(segmentsCross(A,B,T[i],T[(i+1)%3]))return true;
 // Una diagonal con extremos en los bordes puede atravesar el interior
 // sin cruzar estrictamente otro borde; el punto medio detecta ese caso.
 const midpoint={x:(A.x+B.x)/2,y:(A.y+B.y)/2};
 return pointInsideTriangle(midpoint,T[0],T[1],T[2]);
}
function edgeError(a,b,s){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=POINTS.length||b>=POINTS.length||a===b)return 'Puntos inválidos.';
 if((s.blocked||[]).includes(a)||(s.blocked||[]).includes(b))return 'Ese nodo quedó dentro de una zona cerrada.';
 if(s.lines.some(x=>linkKey(x.a,x.b)===linkKey(a,b)))return 'Esta línea ya existe.';
 // La distancia no limita el juego; únicamente las zonas coloreadas impiden cruzar.
 const A=xy(a),B=xy(b);
 for(let i=0;i<POINTS.length;i++)if(i!==a&&i!==b&&nearSegment(xy(i),A,B)<.075)return 'La línea atraviesa otro nodo.';
 // Una conexión existente también es una barrera, aunque aún no cierre una zona.
 // Los segmentos con extremos comunes pueden salir del mismo nodo sin bloquearse.
 for(const line of s.lines){
  if(a===line.a||a===line.b||b===line.a||b===line.b)continue;
  if(segmentsCross(A,B,xy(line.a),xy(line.b)))return 'No puedes cruzar una línea ya colocada.';
 }
 for(const triangle of s.tris)if(crossesOwnedTriangle(a,b,triangle))return 'No puedes atravesar un triángulo ya conquistado.';
 return null;
}
const el=id=>document.getElementById(id);
let mode='none', myPlayer=0, host=false, room='', connected=false, peer=null,conn=null,game=null;
let renderer,scene,camera,orbit,board,staticGroup,linesGroup,triGroup,nodes=[],raycaster=new THREE.Raycaster();
let selected=-1, pointerStart=null, cpuTimer=null, joinTimer=null, scanner=null,toastTimer=null;
let arSession=null,hitSource=null,arSpace=null,lastHit=null,reticle=null,arPlaced=false;
const linkKey=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
const distance=(a,b)=>POINTS[a].distanceTo(POINTS[b]);
const validEdge=(a,b,s)=>!edgeError(a,b,s);
const rand=n=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n;};
const roomId=()=>Array.from({length:6},()=>CODE_CHARS[rand(CODE_CHARS.length)]).join('');
const copyText=async s=>{try{await navigator.clipboard.writeText(s);notify('Enlace copiado al portapapeles.');}catch{prompt('Copia el enlace de invitación:',s);}};
function notify(message){const t=el('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4100);}
function screen(id){for(const n of ['menu','waiting','game','results'])el(n).classList.toggle('hidden',n!==id);el('monetization').classList.toggle('hidden',id==='game');}
function networkStatus(message,on=false){el('connection').textContent=message;el('connection').classList.toggle('online',on);}
function linkUrl(){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('room',room);return u.href;}
function cleanup(){
  clearTimeout(cpuTimer);clearTimeout(joinTimer);selected=-1;connected=false;game=null;
  if(conn){try{conn.close();}catch{}conn=null;}
  if(peer){try{peer.destroy();}catch{}peer=null;}
  room='';mode='none';host=false;networkStatus('SIN CONECTAR');
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
 game=state;POINTS=state.points.map(p=>new THREE.Vector3(...p));
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
   const A=xy(a),B=xy(b),C=xy(c);
   if(Math.abs(area(A,B,C))<.085)continue;
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
  }else if(m.type==='ACTION'&&connected&&game&&game.status==='play'){
    applyAction(m.action,m.data||{},1);
  }
 });
 c.on('close',()=>{if(conn===c){conn=null;connected=false;networkStatus('RIVAL DESCONECTADO');refresh();notify('Rival desconectado. Puede volver con el mismo código.');}});
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
function joinRoom(codeInput){
  const code=String(codeInput||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!==6){notify('El código debe tener seis letras o números.');return;}
  cleanup();if(typeof Peer==='undefined'){notify('No pudo cargarse PeerJS.');return;}
  tutorial=false;awardRecorded=false;mode='pvp';host=false;myPlayer=1;room=code;networkStatus('CONECTANDO…');el('joinBtn').disabled=true;el('joinBtn').textContent='CONECTANDO…';
  try{
    peer=new Peer(undefined,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});
    peer.on('open',()=>{
      conn=peer.connect(PEER_PREFIX+code,{reliable:true,serialization:'json'});
      conn.on('open',()=>{connected=true;networkStatus('CONECTADO',true);conn.send({type:'HELLO',version:VERSION,profile:profilePacket()});});
      conn.on('data',m=>{
        if(m?.type==='STATE'&&m.state){clearTimeout(joinTimer);el('joinBtn').disabled=false;el('joinBtn').textContent='UNIRME';setState(m.state);}
        else if(m?.type==='ERROR'){notify(m.message);home();}
      });
      conn.on('close',()=>{connected=false;networkStatus('RIVAL DESCONECTADO');refresh();notify('Se perdió la conexión con el anfitrión.');});
      conn.on('error',()=>networkStatus('ERROR DE ENLACE'));
    });
    peer.on('error',e=>{clearTimeout(joinTimer);notify('No se encontró la sala o falló la conexión: '+(e.type||e.message));home();});
    joinTimer=setTimeout(()=>{if(!game){notify('No hubo respuesta. Verifica código y conexión en ambos dispositivos.');home();}},18000);
  }catch(e){notify('No se pudo unir: '+e.message);home();}
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
 if((game.blocked||[]).includes(id)){notify('Este punto pertenece a una zona ya conquistada.');return false;}
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
 return Boolean(target?.closest?.('button,input,select,textarea,a,label,.game-header,.toolbar,.ar-size-control,.selected,.arenaLabel,.tutorial-hint,.overlay,.ar-selection-modes,.ar-aim-crosshair'));
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
function setAds(){
  // Activar solamente tras obtener la aprobación de Google H5 Games Ads.
  // Modificar en este archivo con un ID real: ca-pub-XXXXXXXXXXXXXXXX (16 dígitos).
  const PUBLISHER_ID='';
  const btn=el('rewardBtn');
  if(!/^ca-pub-\d{16}$/.test(PUBLISHER_ID))return;
  h5AdsEnabled=true;
  const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
  script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+PUBLISHER_ID;
  document.head.appendChild(script);
  window.adsbygoogle=window.adsbygoogle||[];
  window.adBreak=window.adConfig=o=>window.adsbygoogle.push(o);
  window.adConfig({preloadAdBreaks:'on',sound:'on'});
  btn.disabled=false;btn.textContent='VER ANUNCIO (+20 MONEDAS)';
  btn.addEventListener('click',()=>{
    if(typeof window.adBreak!=='function')return;
    window.adBreak({type:'reward',name:'3line-coins',beforeReward:showAd=>showAd(),
      adViewed:()=>{const coins=Number(localStorage.getItem('3line56_coins')||0)+20;localStorage.setItem('3line56_coins',String(coins));el('coins').textContent=coins;notify('¡20 monedas obtenidas por el anuncio!');},
      adDismissed:()=>notify('Anuncio cerrado; no se otorgan monedas.'),adBreakDone:()=>{}});
  });
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
 document.addEventListener('pointerdown',onARPointerDown,true);
 document.addEventListener('pointerup',onARPointerUp,true);
 document.addEventListener('pointercancel',e=>{arPointers.delete(e.pointerId);arPointerStart=null;},true);
 document.addEventListener('beforexrselect',e=>{if(arSession&&isARControl(e.target))e.preventDefault();});
 el('createBtn').addEventListener('click',createRoom);
 el('cpuBtn').addEventListener('click',()=>showCpu(false));
 el('tutorialBtn').addEventListener('click',()=>{selectedLevel=1;renderLevels();showCpu(true);});
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
 el('leaveBtn').addEventListener('click',()=>{if(!confirm('¿Abandonar la partida?'))return;action('SURRENDER');home();});
 el('homeBtn').addEventListener('click',home);
 el('continueBtn').addEventListener('click',continueToNextLevel);
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
 el('badges').addEventListener('click',e=>{const b=e.target.closest('[data-badge]');if(b){profile.badge=b.dataset.badge;saveProfile();}});
 el('googleBtn').addEventListener('click',loginGoogleFlow);
 el('guestBtn').addEventListener('click',loginGuestFlow);
 el('levelsBtn').addEventListener('click',()=>el('levelPanel').classList.toggle('hidden'));
 el('inviteBtn').addEventListener('click',()=>copyText(location.origin+location.pathname));
 el('coins').textContent=Number(profile.coins||0);
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
