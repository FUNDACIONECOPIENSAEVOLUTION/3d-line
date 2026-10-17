import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js';

const $ = (id) => document.getElementById(id);
const canvas = $('render'), stage = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1724');
const camera = new THREE.PerspectiveCamera(49, 1, 0.01, 300);
camera.position.set(8.4, 10.6, 11.5);
const orbit = new OrbitControls(camera, canvas);
orbit.target.set(0, 0, 0); orbit.minDistance = 7; orbit.maxDistance = 25;
orbit.maxPolarAngle = 1.45; orbit.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xcde7ff, 0x182a2d, 2.1));
const light = new THREE.DirectionalLight(0xffead6, 2.25);
light.position.set(3, 12, 7); light.castShadow = true; scene.add(light);
light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -9;
light.shadow.camera.right = 9; light.shadow.camera.top = 9; light.shadow.camera.bottom = -9;
const game = new Chess();
const world = new THREE.Group(), tiles = new THREE.Group(), pieces = new THREE.Group();
const decorations = new THREE.Group(), markers = new THREE.Group();
world.add(tiles, decorations, pieces, markers); scene.add(world);
const rootBase = new THREE.Mesh(new THREE.BoxGeometry(8.45, .35, 8.45), new THREE.MeshStandardMaterial({color:0x213544, metalness:.5, roughness:.28}));
rootBase.position.y = -.23; rootBase.receiveShadow = true; tiles.add(rootBase);
const raycaster = new THREE.Raycaster(), point = new THREE.Vector2();
const goldMat = new THREE.MeshStandardMaterial({color:0xf9d890,metalness:.5,roughness:.28});
const darkMat = new THREE.MeshStandardMaterial({color:0x203d54,metalness:.45,roughness:.27});
const highlightMat = new THREE.MeshBasicMaterial({color:0x5affad,transparent:true,opacity:.56,depthWrite:false});
const FILES = 'abcdefgh';
let selected = null, squares = [], isAR = false, boardPlaced = true;
let hitSource = null, hitRequested = false, reticlePose = null, timer = null;
let theme = 'classic', lang = 'es', botDifficulty = 'easy', mode = 'bot';
const reticle = new THREE.Mesh(new THREE.RingGeometry(.125,.145,40), new THREE.MeshBasicMaterial({color:0x72ffba,side:THREE.DoubleSide}));
reticle.rotation.x = -Math.PI/2; reticle.visible = false; scene.add(reticle);
const letters = {
es:{mode:'Modo de juego',bot:'Contra computadora',local:'Dos jugadores locales',difficulty:'Dificultad de demostración',easy:'Principiante',medium:'Intermedio',advanced:'Avanzado (básico)',scenario:'Escenario 3D',classic:'Clásico de obsidiana',jungle:'Selva encantada',game:'Partida',new:'Nueva partida',undo:'Deshacer',keyboard:'Movimiento por teclado (e2e4)',move:'Mover',historyTitle:'Movimientos',about:'Cómo jugar',center:'Centrar cámara',rotate:'Girar vista',turn:'Turno:',white:'Blancas',black:'Negras',check:'¡Jaque!',mate:'Jaque mate',draw:'Tablas',ar:'Busca una superficie plana, luego toca para fijar el tablero.',wait:'La computadora está pensando…',invalid:'Movimiento no permitido',help:'Toca una figura y una casilla iluminada. Arrastra para girar. En Android compatible, pulsa AR, apunta a una mesa y toca para fijarlo.'},
en:{mode:'Game mode',bot:'Against computer',local:'Two local players',difficulty:'Demo difficulty',easy:'Beginner',medium:'Intermediate',advanced:'Advanced (basic)',scenario:'3D environment',classic:'Obsidian classic',jungle:'Enchanted jungle',game:'Game',new:'New game',undo:'Undo',keyboard:'Keyboard move (e2e4)',move:'Play move',historyTitle:'Move history',about:'How to play',center:'Reset camera',rotate:'Rotate view',turn:'Turn:',white:'White',black:'Black',check:'Check!',mate:'Checkmate',draw:'Draw',ar:'Point at a flat surface, then tap to place the board.',wait:'Computer thinking…',invalid:'Illegal move',help:'Tap a piece and a highlighted square. Drag to rotate. On compatible Android, press AR, find a table and tap to place the board.'},
zh:{mode:'游戏模式',bot:'与电脑对弈',local:'本地双人',difficulty:'演示难度',easy:'初学者',medium:'中级',advanced:'高级（基础版）',scenario:'3D 场景',classic:'经典黑曜石',jungle:'魔法丛林',game:'对局',new:'新游戏',undo:'悔棋',keyboard:'键盘走棋 (e2e4)',move:'走棋',historyTitle:'着法记录',about:'玩法',center:'重置视角',rotate:'旋转视角',turn:'轮到：',white:'白方',black:'黑方',check:'将军！',mate:'将死',draw:'和棋',ar:'寻找平面并轻触放置棋盘。',wait:'电脑思考中…',invalid:'无效着法',help:'轻触棋子，再轻触高亮格子。拖动可旋转棋盘。支持AR的安卓设备可点击AR并寻找平面。'}
};
function t(k){return letters[lang][k] || letters.es[k] || k;}
function translate(){
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $('help').textContent=t('help'); updateStatus();
}
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').style.display='none',3000);}
const geoCache = {
  cyl:(a,b,h,n=20)=>new THREE.CylinderGeometry(a,b,h,n),
  box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),
  sphere:(r)=>new THREE.SphereGeometry(r,18,12)
};
function mesh(g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;return o;}
function positionOf(square){
  return {x:FILES.indexOf(square[0])-3.5, z:3.5-(Number(square[1])-1)};
}
function buildTiles(){
  const lightTile = new THREE.MeshStandardMaterial({color:0xc7dacd,metalness:.18,roughness:.54});
  const darkTile = new THREE.MeshStandardMaterial({color:0x305c61,metalness:.24,roughness:.5});
  for(let row=0;row<8;row++) for(let col=0;col<8;col++){
    const s=FILES[col]+String(8-row);
    const tile=mesh(new THREE.BoxGeometry(.99,.075,.99),(row+col)%2===0?lightTile:darkTile,col-3.5,.025,row-3.5);
    tile.receiveShadow=true;tile.userData.square=s;tiles.add(tile);squares.push(tile);
  }
}
function addPart(group,geometry,mat,x,y,z){const p=mesh(geometry,mat,x,y,z);group.add(p);return p;}
function pieceModel(p){
  const mat=p.color==='w'?goldMat:darkMat;
  const g=new THREE.Group(); g.userData.square=p.square;
  const base = addPart(g,geoCache.cyl(.32,.36,.13),mat,0,.13,0);
  addPart(g,geoCache.cyl(.24,.31,.12),mat,0,.245,0);
  if(p.type==='p'){
    addPart(g,geoCache.cyl(.12,.19,.3),mat,0,.42,0);
    addPart(g,geoCache.sphere(.17),mat,0,.66,0);
  }else if(p.type==='r'){
    addPart(g,geoCache.cyl(.20,.23,.5),mat,0,.52,0);
    addPart(g,geoCache.cyl(.29,.26,.12,8),mat,0,.82,0);
    for(let i=0;i<4;i++){let a=i*Math.PI/2;addPart(g,geoCache.box(.13,.16,.13),mat,Math.cos(a)*.21,.93,Math.sin(a)*.21);}
  }else if(p.type==='n'){
    addPart(g,geoCache.box(.30,.48,.36),mat,0,.52,0).rotation.z=-.2;
    addPart(g,geoCache.box(.37,.30,.27),mat,.10,.83,0).rotation.z=-.2;
    addPart(g,geoCache.box(.23,.11,.31),mat,.23,.80,0);
    addPart(g,geoCache.box(.07,.13,.05),goldMat,-.07,.99,.15);
  }else if(p.type==='b'){
    addPart(g,geoCache.cyl(.12,.22,.43),mat,0,.51,0);
    addPart(g,new THREE.ConeGeometry(.25,.40,24),mat,0,.95,0);
    addPart(g,geoCache.sphere(.08),mat,0,1.17,0);
  }else if(p.type==='q'){
    addPart(g,geoCache.cyl(.12,.25,.59),mat,0,.58,0);
    addPart(g,geoCache.cyl(.26,.20,.16),mat,0,.96,0);
    for(let i=0;i<5;i++){let a=i*Math.PI*2/5;addPart(g,geoCache.sphere(.085),mat,Math.cos(a)*.21,1.10,Math.sin(a)*.21);}
    addPart(g,geoCache.sphere(.10),mat,0,1.15,0);
  }else if(p.type==='k'){
    addPart(g,geoCache.cyl(.13,.24,.65),mat,0,.61,0);
    addPart(g,geoCache.cyl(.25,.20,.13),mat,0,1,0);
    addPart(g,geoCache.box(.11,.39,.10),mat,0,1.27,0);
    addPart(g,geoCache.box(.31,.10,.10),mat,0,1.30,0);
  }
  return g;
}
function clearGroup(group){
  while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(node=>{if(node.isMesh && node.geometry)node.geometry.dispose();});}
}
function renderPieces(){
  clearGroup(pieces);clearGroup(markers);
  for(const row of game.board())for(const p of row)if(p){
    const g=pieceModel(p),loc=positionOf(p.square);
    g.position.set(loc.x,.07,loc.z);
    if(p.color==='b')g.rotation.y=Math.PI;
    pieces.add(g);
  }
  if(selected){
    for(const m of game.moves({square:selected,verbose:true})){
      const loc=positionOf(m.to);
      const circle=mesh(new THREE.CylinderGeometry(.37,.37,.015,24),highlightMat,loc.x,.10,loc.z);
      circle.userData.square=m.to;markers.add(circle);
    }
  }
}
function makeJungle(){
  clearGroup(decorations);
  if(theme!=='jungle')return;
  const stem=new THREE.MeshStandardMaterial({color:0x33785a,roughness:1});
  const bloom=new THREE.MeshStandardMaterial({color:0xe15372,emissive:0x4d1422,emissiveIntensity:.3});
  for(let i=0;i<90;i++){
    let a=i*2.39996, radius=4.35+(i%4)*.23;
    const x=Math.cos(a)*radius,z=Math.sin(a)*radius, h=.17+(i%5)*.09;
    const plant=new THREE.Group();plant.position.set(x,0,z);
    addPart(plant,new THREE.ConeGeometry(.07,h,5),i%3===0?bloom:stem,0,h/2,0);
    plant.userData.sway=a;decorations.add(plant);
  }
}
function setTheme(next){
  theme=next;
  squares.forEach((tile,i)=>{
    const even=(Math.floor(i/8)+i%8)%2===0;
    tile.material.color.set(theme==='jungle'?(even?'#d9f4b5':'#4d8b54'):(even?'#cadbd0':'#315d63'));
  });
  rootBase.material.color.set(theme==='jungle'?'#453925':'#1d3b4d');
  scene.background=isAR?null:new THREE.Color(theme==='jungle'?'#102a1e':'#0a1724');
  makeJungle();
}
function updateStatus(){
  let text='';
  if(game.isCheckmate()){text=t('mate')+' · '+t(game.turn()==='w'?'black':'white');}
  else if(game.isDraw()){text=t('draw');}
  else {text=t('turn')+' '+t(game.turn()==='w'?'white':'black')+(game.isCheck()?' · '+t('check'):'');}
  $('status').textContent=text;
  const history=game.history();
  $('history').textContent=history.length?history.map((v,i)=>(i%2===0?String(Math.floor(i/2)+1)+'. ':'')+v).join('  '):'—';
}
function playMove(from,to){
  if(mode==='bot' && game.turn()!=='w')return false;
  try{
    const moved=game.move({from,to,promotion:'q'});
    if(!moved)return false;
  }catch(e){return false;}
  selected=null;renderPieces();updateStatus();
  if(mode==='bot' && !game.isGameOver()){clearTimeout(timer);timer=setTimeout(playBot,500);}
  return true;
}
function pickSquare(square){
  if(!square || game.isGameOver())return;
  if(mode==='bot'&&game.turn()!=='w')return;
  const current=game.get(square);
  if(selected && playMove(selected,square))return;
  if(current && current.color===game.turn()){selected=square;renderPieces();}
  else {selected=null;renderPieces();}
}
function valueOf(type){return {p:1,n:3.2,b:3.3,r:5,q:9,k:0}[type]||0;}
function evaluate(){
  if(game.isCheckmate())return game.turn()==='b'?-9999:9999;
  let score=0;
  for(const row of game.board())for(const p of row)if(p){
    const loc=positionOf(p.square);
    const center=(3.5-Math.abs(loc.x))*.045+(3.5-Math.abs(loc.z))*.045;
    score+=(p.color==='b'?1:-1)*(valueOf(p.type)+center);
  }
  return score;
}
function chooseBot(){
  const all=game.moves({verbose:true});if(!all.length)return null;
  if(botDifficulty==='easy')return all[Math.floor(Math.random()*all.length)];
  let best=-Infinity, choices=[];
  for(const m of all){
    game.move({from:m.from,to:m.to,promotion:'q'});
    let v=evaluate();
    if(botDifficulty==='advanced'&&!game.isGameOver()){
      let replyWorst=Infinity;
      const answers=game.moves({verbose:true});
      for(const a of answers){
        game.move({from:a.from,to:a.to,promotion:'q'});
        replyWorst=Math.min(replyWorst,evaluate());
        game.undo();
      }
      v=replyWorst;
    }
    game.undo();
    v+=(Math.random()-.5)*.22;
    if(v>best+0.001){best=v;choices=[m];}
    else if(Math.abs(v-best)<.001)choices.push(m);
  }
  return choices[Math.floor(Math.random()*choices.length)];
}
function playBot(){
  if(mode!=='bot'||game.turn()!=='b'||game.isGameOver())return;
  const m=chooseBot();
  if(m)game.move({from:m.from,to:m.to,promotion:'q'});
  selected=null;renderPieces();updateStatus();
}
function reset(){
  clearTimeout(timer);game.reset();selected=null;renderPieces();updateStatus();
}
function squareFromHit(objects, origin, direction){
  raycaster.set(origin,direction);
  const hits=raycaster.intersectObjects(objects,true);
  for(const h of hits){
    let o=h.object;
    while(o && !o.userData.square)o=o.parent;
    if(o && o.userData.square)return o.userData.square;
  }
  return null;
}
let down=null;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{
  if(isAR || !down)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)return;
  const rect=canvas.getBoundingClientRect();
  point.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(point,camera);
  const square=squareFromHit([pieces,markers,tiles],raycaster.ray.origin,raycaster.ray.direction);
  if(square)pickSquare(square);
});
$('reset').onclick=reset;
$('undo').onclick=()=>{
  clearTimeout(timer);
  if(game.history().length){
    game.undo();
    if(mode==='bot' && game.turn()==='b' && game.history().length)game.undo();
    selected=null;renderPieces();updateStatus();
  }
};
$('playMove').onclick=()=>{
  const v=$('moveInput').value.trim().toLowerCase();
  if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(v)||!playMove(v.slice(0,2),v.slice(2,4)))toast(t('invalid'));
  else $('moveInput').value='';
};
$('moveInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('playMove').click();});
$('mode').onchange=()=>{mode=$('mode').value;$('difficulty').disabled=mode!=='bot';reset();};
$('difficulty').onchange=()=>{botDifficulty=$('difficulty').value;};
$('theme').onchange=()=>setTheme($('theme').value);
$('lang').onchange=()=>{lang=$('lang').value;translate();document.documentElement.lang=lang;};
$('center').onclick=()=>{if(isAR){toast(t('ar'));return;}camera.position.set(8.4,10.6,11.5);orbit.target.set(0,0,0);orbit.update();};
$('rotate').onclick=()=>{if(isAR)return;camera.position.set(-camera.position.z,camera.position.y,camera.position.x);orbit.update();};

let session=null;
const arOptions={requiredFeatures:['hit-test'],optionalFeatures:['local-floor','dom-overlay'],domOverlay:{root:document.body}};
const arButton=ARButton.createButton(renderer,arOptions);
$('arButtonHolder').appendChild(arButton);
renderer.xr.addEventListener('sessionstart',()=>{
  isAR=true;boardPlaced=false;orbit.enabled=false;scene.background=null;
  world.visible=false;reticle.visible=false;hitSource=null;hitRequested=false;
  session=renderer.xr.getSession();
  session.addEventListener('select',handleXRSelect);
  $('arMessage').style.display='block';$('arMessage').textContent=t('ar');
});
renderer.xr.addEventListener('sessionend',()=>{
  if(session)session.removeEventListener('select',handleXRSelect);
  if(hitSource){hitSource.cancel();hitSource=null;}
  session=null;isAR=false;boardPlaced=true;hitRequested=false;
  world.position.set(0,0,0);world.quaternion.identity();world.scale.setScalar(1);
  world.visible=true;reticle.visible=false;orbit.enabled=true;scene.background=new THREE.Color('#0a1724');
  $('arMessage').style.display='none';setTheme(theme);
});
function handleXRSelect(event){
  if(!boardPlaced){
    if(!reticle.visible || !reticlePose)return;
    world.position.set(reticlePose.position.x,reticlePose.position.y,reticlePose.position.z);
    world.quaternion.set(reticlePose.orientation.x,reticlePose.orientation.y,reticlePose.orientation.z,reticlePose.orientation.w);
    world.scale.setScalar(.0625);world.visible=true;boardPlaced=true;
    reticle.visible=false;$('arMessage').style.display='none';
    return;
  }
  const frame=event.frame, input=event.inputSource, ref=renderer.xr.getReferenceSpace();
  if(!frame||!input||!ref)return;
  let pos=frame.getPose(input.targetRaySpace,ref);
  let origin,dir;
  if(pos){
    origin=new THREE.Vector3(pos.transform.position.x,pos.transform.position.y,pos.transform.position.z);
    const q=pos.transform.orientation;
    dir=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
  }else{
    const c=renderer.xr.getCamera();
    origin=c.getWorldPosition(new THREE.Vector3());dir=c.getWorldDirection(new THREE.Vector3());
  }
  const sq=squareFromHit([pieces,markers,tiles],origin,dir);
  if(sq)pickSquare(sq);
}
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();
function render(timestamp,frame){
  if(isAR && frame){
    if(!hitRequested){
      hitRequested=true;
      const currentSession=renderer.xr.getSession();
      currentSession.requestReferenceSpace('viewer')
        .then(ref=>currentSession.requestHitTestSource({space:ref}))
        .then(src=>{hitSource=src;})
        .catch(()=>{$('arMessage').textContent='Este dispositivo no pudo activar la detección de superficies.';});
    }
    if(!boardPlaced && hitSource){
      const results=frame.getHitTestResults(hitSource);
      if(results.length){
        const pose=results[0].getPose(renderer.xr.getReferenceSpace());
        if(pose){
          reticlePose=pose.transform;
          reticle.visible=true;
          reticle.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);
          const q=pose.transform.orientation;
          reticle.quaternion.set(q.x,q.y,q.z,q.w);
          reticle.rotateX(-Math.PI/2);
        }
      }else reticle.visible=false;
    }
  }else orbit.update();
  if(theme==='jungle'&&!isAR)decorations.children.forEach((p,i)=>{p.rotation.z=Math.sin(timestamp*.0016+i*.8)*.12;});
  renderer.render(scene,camera);
}
buildTiles();setTheme(theme);renderPieces();updateStatus();translate();
renderer.setAnimationLoop(render);
