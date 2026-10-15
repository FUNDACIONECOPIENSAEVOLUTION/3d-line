import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// v57.0.0-beta.1 | un único estado de reglas para CPU, PvP WebRTC, 3D y WebXR.
// PeerJS usa su señalización pública: funcional para pruebas, NO es un backend SLA.
// El punto AR de cada dispositivo es LOCAL: QR de sala no comparte coordenadas físicas.
const VERSION='57.0.0-beta.1';
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
function readProfile(){try{return {...DEFAULT_PROFILE,...JSON.parse(localStorage.getItem('3line57_profile')||'{}')}}catch{return {...DEFAULT_PROFILE}}}
let profile=readProfile(),selectedLevel=Math.min(10,Math.max(1,profile.level||1)),tutorial=false,awardRecorded=false;
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
function profilePacket(){return {name:String(profile.name).slice(0,30),color:profile.color,badge:profile.badge};}
function saveProfile(){try{localStorage.setItem('3line57_profile',JSON.stringify(profile));}catch{} renderProfile();}
function renderProfile(){
 for(const [id,val] of [['profileName',profile.name],['profileAvatar',profile.badge],['rankLevel',profile.level],['eloValue',profile.elo]]){const elem=document.getElementById(id);if(elem)elem.textContent=val;}
 const a=document.getElementById('profileAvatar');if(a)a.style.color=profile.color;
 document.querySelectorAll('#colors [data-color]').forEach(x=>x.classList.toggle('current',x.dataset.color===profile.color));
 document.querySelectorAll('#badges [data-badge]').forEach(x=>x.classList.toggle('current',x.dataset.badge===profile.badge));
}
function renderLevels(){
 const grid=document.getElementById('levelGrid');if(!grid)return;grid.replaceChildren();
 LEVELS.forEach(l=>{const b=document.createElement('button');b.textContent=l.level;b.className=l.level===selectedLevel?'active':'';
 b.title=l.count+' nodos'+(l.random?' aleatorios':' guiados');
 b.onclick=()=>{selectedLevel=l.level;renderLevels();document.getElementById('levelDescription').textContent='Nivel '+l.level+' · '+l.count+' puntos · '+(l.random?'posiciones aleatorias':'posiciones guiadas')+' · VS CPU o PvP';};
 grid.appendChild(b);});
}
function tutorials(){
 const h=document.getElementById('tutorialHint');if(!h)return;
 h.classList.toggle('hidden',!tutorial||!game||game.status!=='play');
 if(!tutorial||!game)return;
 h.textContent=!game.rolled?'PASO 1 · Pulsa el dado luminoso de arriba.':selected<0?'PASO 2 · Toca un nodo. A continuación toca otro para construir una línea.':'PASO 3 · Escoge un segundo nodo. Cierra tres líneas para formar tu primer triángulo.';
}
function awardResult(){
 if(!game||game.status!=='end'||awardRecorded||game.winner!==0||mode==='pvp'&&!host)return;
 awardRecorded=true;profile.elo+=12;profile.coins+=15;profile.level=Math.max(profile.level,Math.min(10,(game.level||1)+1));saveProfile();
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
function edgeError(a,b,s){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=POINTS.length||b>=POINTS.length||a===b)return 'Puntos inválidos.';
 if((s.blocked||[]).includes(a)||(s.blocked||[]).includes(b))return 'Ese nodo quedó dentro de una zona cerrada.';
 if(s.lines.some(x=>linkKey(x.a,x.b)===linkKey(a,b)))return 'Esta línea ya existe.';
 if(distance(a,b)>(LEVELS[(s.level||1)-1]?.range||2))return 'Conexión demasiado larga.';
 const A=xy(a),B=xy(b);
 for(let i=0;i<POINTS.length;i++)if(i!==a&&i!==b&&nearSegment(xy(i),A,B)<.075)return 'La línea atraviesa otro nodo.';
 for(const l of s.lines)if(![a,b].includes(l.a)&&![a,b].includes(l.b)&&segmentsCross(A,B,xy(l.a),xy(l.b)))return 'No puedes atravesar una pared o línea.';
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
 players:[profilePacket(),{name:'RIVAL',color:'#ff2d7a',badge:'★'}],
 points:levelPoints(level,seed),maxTurns:LEVELS[level-1].count*2};
}
function enterGame(){
  screen('game');selected=-1;
  initialize3D();rebuildBoard();refresh();
  notify('Partida iniciada. Lanza el dado cuando sea tu turno.');
}
function setState(state){
 if(!state||state.schema!==2||!Array.isArray(state.points)||!Array.isArray(state.lines)||!Array.isArray(state.tris)||!Array.isArray(state.scores))return;
 const previous=game?.version;
 game=state;POINTS=state.points.map(p=>new THREE.Vector3(...p));
 if(!el('game').classList.contains('hidden')){
   rebuildBoard();refresh();
 }else if(state.status==='play')enterGame();
 if(state.status==='end'&&previous!==state.version)finishGame();
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
   game.rolled=true;game.dice=1+rand(6);game.moves=Math.min(game.dice,Math.max(1,eligibleCount(game)));
 }else if(type==='LINE'){
   if(!game.rolled||game.moves<1)return false;
   const {a,b}=data;
   if(!validEdge(a,b,game)){if(player===myPlayer)notify(edgeError(a,b,game));return false;}
   game.lines.push({a,b,owner:player});
   const newTris=foundTriangles(a,b,game.lines,game.tris);
   game.tris.push(...newTris);game.scores[player]+=newTris.length*10;
   game.blocked=blockedNodes(game);game.moves--;
   if(game.moves===0)endTurn();
 }else if(type==='PASS'){if(!game.rolled)return false;endTurn();}
 else if(type==='SURRENDER'){game.status='end';game.winner=1-player;}
 else return false;
 game.version++;setState(game);broadcast();
 if(mode==='cpu'||mode==='tutorial')scheduleCpu();
 return true;
}
function scheduleCpu(){
 clearTimeout(cpuTimer);
 if(!['cpu','tutorial'].includes(mode)||!game||game.status!=='play'||game.turn!==1)return;
 cpuTimer=setTimeout(()=>{
  if(!game||game.status!=='play'||game.turn!==1)return;
  if(!game.rolled){applyAction('ROLL',{},1);return;}
  if(mode==='tutorial'){applyAction('PASS',{},1);return;}
  let best=null,bestValue=-Infinity;
  for(let a=0;a<POINTS.length;a++)for(let b=a+1;b<POINTS.length;b++){
    if(!validEdge(a,b,game))continue;
    const future=[...game.lines,{a,b,owner:1}];
    const triangles=foundTriangles(a,b,future,game.tris).length;
    const score=triangles*100-distance(a,b)+Math.random()*.12;
    if(score>bestValue){bestValue=score;best={a,b};}
  }
  if(best)applyAction('LINE',best,1);
  else applyAction('PASS',{},1);
 },mode==='tutorial'?850:480);
}
function refresh(){
 if(!game)return;
 el('score0').textContent=game.scores[0];el('score1').textContent=game.scores[1];
 el('roomDisplay').textContent=room?'SALA '+room:(mode==='cpu'?'VS CPU':'TUTORIAL');
 el('turnDisplay').textContent=game.status==='end'?'FIN DE PARTIDA':'TURNO JUGADOR '+(game.turn+1);
 el('energyDisplay').textContent=game.status==='end'?'FINALIZADO':!game.rolled?'LANZA EL DADO':game.moves+' CONEXIONES';
 el('diceResult').textContent=game.rolled?('RESULTADO '+game.dice):'DADO 1–6';
 el('levelTag').textContent='NIVEL '+game.level+' · '+POINTS.length+' NODOS';
 const yourTurn=game.turn===myPlayer&&game.status==='play'&&(mode!=='pvp'||connected);
 el('diceBtn').disabled=!yourTurn||game.rolled;el('passBtn').disabled=!yourTurn||!game.rolled;
 el('leaveBtn').disabled=false;
 el('selectedLabel').textContent=game.status==='end'?'Partida finalizada':!yourTurn?'Espera el turno de tu rival':!game.rolled?'Lanza el dado para conseguir conexiones':selected<0?'Selecciona el primer nodo para unir':'Nodo '+(selected+1)+' elegido. Selecciona otro.';
 for(let i=0;i<nodes.length;i++){
  const selectedNow=i===selected,blocked=(game.blocked||[]).includes(i);
  nodes[i].material.color.setHex(blocked?0x5b7181:selectedNow?0xffd231:0x68dcff);
  nodes[i].scale.setScalar(selectedNow?1.4:1);
 }
 tutorials();
}
function finishGame(){
 if(!game)return;
 awardResult();
 const result=game.winner===-1?'EMPATE':('GANA JUGADOR '+(game.winner+1));
 el('resultTitle').textContent=result;
 el('resultSummary').textContent='Nivel '+game.level+' · Puntos: '+game.scores[0]+' vs '+game.scores[1]+'. Triángulos: '+game.tris.length+'.';
 if(arSession)arSession.end().catch(()=>{});
 screen('results');
}
function showCpu(teach=false){
 cleanup();tutorial=!!teach;mode=teach?'tutorial':'cpu';host=true;connected=true;myPlayer=0;
 networkStatus(teach?'TUTORIAL':'MODO CPU',true);setState(newState());scheduleCpu();
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
      game.players[1]={name:String(p.name||'RIVAL').slice(0,30),color:/^#[0-9a-fA-F]{6}$/.test(p.color)?p.color:'#ff2d7a',badge:['◆','⚡','★','✦','☣'].includes(p.badge)?p.badge:'★'};
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
  mode='pvp';host=true;myPlayer=0;room=roomId();showHostRoom();networkStatus('CONECTANDO…');
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
  mode='pvp';host=false;myPlayer=1;room=code;networkStatus('CONECTANDO…');el('joinBtn').disabled=true;el('joinBtn').textContent='CONECTANDO…';
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
function initialize3D(){
  if(renderer){resize3D();return;}
  const viewport=el('viewport');
  scene=new THREE.Scene();scene.background=new THREE.Color(0x061522);
  camera=new THREE.PerspectiveCamera(55,1,.01,100);
  camera.position.set(2.85,2.85,3.6);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.xr.enabled=true;
  viewport.appendChild(renderer.domElement);
  orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enableDamping=true;orbit.dampingFactor=.09;orbit.minDistance=1.5;orbit.maxDistance=8;
  orbit.target.set(0,.42,0);orbit.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x194f70,2.3));
  const light=new THREE.DirectionalLight(0x8ceeff,2.8);light.position.set(3,5,2);scene.add(light);
  board=new THREE.Group();scene.add(board);
  staticGroup=new THREE.Group();linesGroup=new THREE.Group();triGroup=new THREE.Group();
  board.add(staticGroup,triGroup,linesGroup);
  const pgeo=new THREE.SphereGeometry(.071,16,12);
  for(let i=0;i<POINTS.length;i++){
    const node=new THREE.Mesh(pgeo,new THREE.MeshStandardMaterial({color:0x68dcff,emissive:0x0686b9,emissiveIntensity:.45,metalness:.25,roughness:.2}));
    node.position.copy(POINTS[i]);node.userData.nodeId=i;staticGroup.add(node);nodes.push(node);
  }
  const frameMat=new THREE.LineBasicMaterial({color:0x18516e,transparent:true,opacity:.46});
  const bounds=new THREE.Box3(new THREE.Vector3(-1.12,-.28,-1.12),new THREE.Vector3(1.12,1.14,1.12));
  const helper=new THREE.Box3Helper(bounds,0x26566c);helper.material=frameMat;staticGroup.add(helper);
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart)return;const delta=Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1]);pointerStart=null;if(delta<8)pickNode(e);});
  window.addEventListener('resize',resize3D);
  renderer.setAnimationLoop((time,frame)=>{if(orbit&&!arSession)orbit.update();updateAR(frame);renderer.render(scene,camera);});
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
  clearGroup(linesGroup);clearGroup(triGroup);
  for(const t of game.tris){
    const geom=new THREE.BufferGeometry().setFromPoints([POINTS[t.a],POINTS[t.b],POINTS[t.c]]);
    geom.setIndex([0,1,2]);geom.computeVertexNormals();
    triGroup.add(new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:t.owner===0?0x00d7ff:0xff5c90,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false})));
  }
  for(const l of game.lines)linesGroup.add(lineMesh(l.a,l.b,l.owner===0?0x23d9ff:0xff5e96));
}
function pickNode(e){
  if(!game||game.status!=='play'||game.turn!==myPlayer||!game.rolled||!game.moves)return;
  if(mode==='pvp'&&!connected)return;
  const rect=renderer.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(nodes,false);if(!hits.length)return;
  const id=hits[0].object.userData.nodeId;
  if(selected===-1){selected=id;refresh();return;}
  if(selected===id){selected=-1;refresh();return;}
  const a=selected;selected=-1;
  if(!validEdge(a,id,game)){notify('Enlace inválido: nodos alejados o conexión ya utilizada.');refresh();return;}
  action('LINE',{a,b:id});refresh();
}
function resetView(){
  if(!camera||arSession){notify('Sal del modo AR para centrar la vista 3D.');return;}
  camera.position.set(2.85,2.85,3.6);orbit.target.set(0,.42,0);orbit.update();
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
  reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix);
  lastHit=reticle.matrix.clone();
}
async function startAR(){
  if(!renderer||!game||arSession)return;
  if(!navigator.xr){notify('Este navegador no ofrece WebXR AR. Continúa en 3D.');return;}
  try{
    // DOM overlay obligatorio: evita iniciar AR si los controles no van a ser accesibles.
    const session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],domOverlay:{root:document.body}});
    arSession=session;arPlaced=false;lastHit=null;scene.background=null;orbit.enabled=false;
    board.visible=false;document.body.classList.add('xr-active');el('placeBtn').classList.remove('hidden');el('exitArBtn').classList.remove('hidden');el('arBtn').classList.add('hidden');
    if(!reticle){
      reticle=new THREE.Mesh(new THREE.RingGeometry(.065,.08,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x00ffbb,side:THREE.DoubleSide}));
      reticle.matrixAutoUpdate=false;scene.add(reticle);
    }
    reticle.visible=false;
    session.addEventListener('end',()=>{arSession=null;arPlaced=false;lastHit=null;if(hitSource){hitSource.cancel();hitSource=null;}scene.background=new THREE.Color(0x061522);document.body.classList.remove('xr-active');el('placeBtn').classList.add('hidden');el('exitArBtn').classList.add('hidden');el('arBtn').classList.remove('hidden');if(reticle)reticle.visible=false;board.visible=true;resetBoard();orbit.enabled=true;resize3D();});
    await renderer.xr.setSession(session);
    arSpace=await session.requestReferenceSpace('local');
    const viewer=await session.requestReferenceSpace('viewer');
    hitSource=await session.requestHitTestSource({space:viewer});
    notify('Mueve el celular hasta detectar una superficie y pulsa FIJAR.');
  }catch(e){notify('AR no disponible: '+(e.message||'hardware no compatible'));if(arSession)arSession.end().catch(()=>{});}
}
function placeAR(){
  if(!arSession||!lastHit){notify('Todavía no se detecta una superficie. Mueve el teléfono lentamente.');return;}
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  lastHit.decompose(p,q,s);
  board.position.copy(p);board.quaternion.copy(q);board.scale.setScalar(.28);
  board.visible=true;arPlaced=true;if(reticle)reticle.visible=false;
  el('placeBtn').classList.add('hidden');
  notify('Tablero fijado localmente. Para coincidir en dos celulares ambos deben alinearlo manualmente; no es un ancla espacial compartida.');
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
function setAds(){
  // Activar solamente tras obtener la aprobación de Google H5 Games Ads.
  // Modificar en este archivo con un ID real: ca-pub-XXXXXXXXXXXXXXXX (16 dígitos).
  const PUBLISHER_ID='';
  const btn=el('rewardBtn');
  if(!/^ca-pub-\d{16}$/.test(PUBLISHER_ID))return;
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

function bind(){
  el('createBtn').addEventListener('click',createRoom);
  el('cpuBtn').addEventListener('click',showCpu);
  el('joinBtn').addEventListener('click',()=>joinRoom(el('joinCode').value));
  el('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom(el('joinCode').value);});
  el('scanBtn').addEventListener('click',startScanner);
  el('diagnoseBtn').addEventListener('click',showDiagnostics);
  el('diagCloseBtn').addEventListener('click',()=>el('diagnostics').classList.add('hidden'));
  el('diagCopyBtn').addEventListener('click',()=>copyText(diagnosticText));
  el('closeScanBtn').addEventListener('click',stopScanner);
  el('copyBtn').addEventListener('click',()=>copyText(linkUrl()));
  el('cancelBtn').addEventListener('click',home);
  el('diceBtn').addEventListener('click',()=>action('ROLL'));
  el('passBtn').addEventListener('click',()=>action('PASS'));
  el('leaveBtn').addEventListener('click',()=>{if(!confirm('¿Abandonar la partida?'))return;action('SURRENDER');home();});
  el('homeBtn').addEventListener('click',home);
  el('resetViewBtn').addEventListener('click',resetView);
  el('arBtn').addEventListener('click',startAR);
  el('placeBtn').addEventListener('click',placeAR);
  el('exitArBtn').addEventListener('click',()=>arSession?.end().catch(()=>{}));
  el('coins').textContent=Number(localStorage.getItem('3line56_coins')||0);
  setAds();screen('menu');networkStatus('SIN CONECTAR');
  const startCode=new URLSearchParams(location.search).get('room');
  if(startCode&&/^[A-Z0-9]{6}$/i.test(startCode)){el('joinCode').value=startCode.toUpperCase();setTimeout(()=>joinRoom(startCode),650);}
}
bind();
// Exposición limitada para pruebas automatizadas sin alterar el juego desde consola.
window.__gameDiagnostics=()=>({version:VERSION,mode,room,connected,player:myPlayer,turn:game?.turn,status:game?.status,gameVersion:game?.version,scores:game?.scores,edges:game?.lines.length,triangles:game?.tris.length});
