import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../auth.js',import.meta.url),'utf8');
test('la aplicación carga archivos identificados por la versión 57',()=>{
  assert.match(html,/V57\.7\.0/);
  assert.match(html,/game\.js\?v=57\.7\.0/);
  assert.match(js,/const VERSION='57\.7\.0-beta\.1'/);
});
test('JavaScript del juego compila después de eliminar imports de navegador',()=>{
  const body=js.replace(/^import .*?;\s*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(body,{filename:'game.js'}));
});
test('todos los IDs usados mediante el(id) existen en index',()=>{
  const refs=[...js.matchAll(/\bel\('([^']+)'\)/g)].map(m=>m[1]);
  assert.ok(refs.length>20);
  for(const id of new Set(refs))assert.match(html,new RegExp('id="'+id+'"'),id);
});
test('controles PvP, QR, 3D, CPU y AR están presentes',()=>{
  for(const id of ['tutorialBtn','levelsBtn','levelGrid','googleBtn','profileName','diceResult','scaleUpBtn','createBtn','joinCode','joinBtn','scanBtn','cpuBtn','viewport','diceBtn','arBtn','placeBtn','roomCode','diagnoseBtn','diagCopyBtn','diagResults'])assert.ok(html.includes('id="'+id+'"'),id);
  for(const term of ["'HELLO'","'ACTION'","'STATE'","foundTriangles","validEdge","requestHitTestSource","new Peer"])assert.ok(js.includes(term),term);
});
test('anuncios reales se configuran por archivo, nunca con un publisher ficticio',()=>{
 const ads=fs.readFileSync(new URL('../ads-rewarded.js',import.meta.url),'utf8');
 const config=JSON.parse(fs.readFileSync(new URL('../ads-config.json',import.meta.url),'utf8'));
 assert.equal(js.includes('ca-pub-0000000000000000'),false);
 assert.match(ads,/adViewed:/);
 assert.match(ads,/adDismissed:/);
 assert.match(ads,/adBreakDone:/);
 assert.equal(config.h5PublisherId,'');
 assert.match(js,/rewardedAds\.watch/);
 assert.match(html,/rewardBtn" disabled/);
});

test('los estilos CSS se incluyeron y hay indicadores de pantalla',()=>{
  assert.match(css,/\.menu\{/);
  assert.match(css,/\.arena\{/);
  assert.match(css,/\.hidden\{/);
});

test('el diagnóstico comprueba las API sin pedir cámara por adelantado',()=>{
  assert.match(js,/async function showDiagnostics/);
  assert.match(js,/isSessionSupported\('immersive-ar'\)/);
  assert.match(js,/typeof RTCPeerConnection/);
  assert.match(js,/navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(js,/diagnosticText/);
});

test('niveles y reglas geométricas de V57',()=>{
  assert.match(js,/const LEVELS=\[/);
  for(const count of [5,6,7,9,12,16,20,25,30])assert.match(js,new RegExp('count:'+count));
  assert.match(js,/rand\(6\)/);
  assert.match(js,/blockedNodes\(game\)/);
  assert.match(js,/segmentsCross/);
  assert.match(js,/pointInsideTriangle/);
  assert.match(js,/renderer\.xr\.setReferenceSpaceType\(spaceType\)/);
  assert.match(js,/crossesOwnedTriangle/);
  assert.match(js,/pointInsideClosedShell/);
  assert.match(js,/segmentDistance3/);
  assert.match(js,/closestXRNodeOnScreen/);
  assert.match(js,/setARSelectionMode/);
  assert.match(js,/selectAimedNode/);
  assert.match(js,/PLAYER_BADGES/);
});
test('Google no afirma acceso real sin configurar cliente y servidor',()=>{
 assert.match(js,/initializeAccountAuth/);
 assert.match(auth,/browserLocalPersistence/);
 assert.match(auth,/GoogleAuthProvider/);
 assert.match(auth,/projectId:"d-line-g"/);
 assert.match(auth,/authDomain:"d-line-g.firebaseapp.com"/);
 assert.doesNotMatch(auth,/ar-3lilne/);
 assert.match(html,/Google requiere configurar el ID de cliente/);
});

test('la pantalla de acceso controla el menú y preserva la sesión',()=>{
 assert.match(html,/id="loginGate"/);
 assert.match(html,/id="signGoogleBtn"/);
 assert.match(html,/id="signGuestBtn"/);
 assert.match(html,/id="logoutBtn"/);
 assert.match(css,/\.auth-locked\{display:none!important\}/);
 assert.match(js,/function enterAccount\(/);
 assert.match(js,/beginLogin\(\)/);
 assert.match(auth,/onAuthStateChanged/);
 assert.match(auth,/signInAnonymously/);
});
test('HUD gamer, tutorial BOT, escala AR y progresión',()=>{
 for(const id of ['arScaleSlider','arSizeControl','continueBtn','namePlayer2'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function enablePinchScale/);
 assert.match(js,/mode==='tutorial'/);
 assert.match(js,/applyAction\('ROLL',\{\},1\)/);
 assert.match(js,/eligibleCount\(game\)===0\)endTurn\(\)/);
 assert.match(js,/localStorage\.setItem\('3line57_unlocked_'/);
 assert.match(js,/type:'next',name:'level-completed'/);
});

test('cambio de proyecto Firebase y cache-busting de auth.js',()=>{
 assert.match(js,/from '\.\/auth\.js\?v=57\.7\.0'/);
 assert.match(auth,/appId:"1:1078189274558:web:5db5ebbb74ee2fc8df75ef"/);
 assert.match(auth,/browserLocalPersistence/);
 assert.match(auth,/onAuthStateChanged/);
 assert.doesNotMatch(html,/accounts\.google\.com\/gsi\/client/);
});

test('AR táctil y apuntar con cámara tienen botones y controles dedicados',()=>{
 for(const id of ['arSelectionModes','arTouchModeBtn','arAimModeBtn','arAimSelectBtn','arAimCrosshair','arAimText'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function selectAimedNode/);
 assert.match(js,/function onARPointerUp/);
 assert.match(js,/session\.addEventListener\('select',onARXRSelect\)/);
});
test('insignias y controles adaptables a móviles pequeños',()=>{
 const badges=[...html.matchAll(/data-badge="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(new Set(badges).size>=16);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/orientation:landscape/);
});

test('avisos y confirmaciones propios, sin ventanas JS normales',()=>{
 for(const id of ['gameDialog','gameDialogTitle','gameDialogAccept','gameDialogCancel','gameDialogCopy'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function showGameDialog/);
 assert.match(js,/gameConfirm/);
 assert.doesNotMatch(js,/\bwindow\.confirm\s*\(/);
 assert.doesNotMatch(js,/\bwindow\.prompt\s*\(/);
 assert.match(css,/\.game-dialog-overlay/);
});
test('reconexión tras suspensión solicita estado de la misma sala',()=>{
 assert.match(js,/function askHostForFreshState/);
 assert.match(js,/type:'SYNC_REQUEST'/);
 assert.match(js,/m\.type==='SYNC_REQUEST'/);
 assert.match(js,/function scheduleGuestReconnection/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/pageshow/);
 assert.match(js,/joinRoom\(code,true\)/);
});

test('Academia de reglas y tutorial visible en menú y durante la partida',()=>{
 for(const id of ['academyBtn','academyGameBtn','academyOverlay','academyExample','academyChoiceA','academyChoiceB',
  'academyCloseBtn','academyNextBtn','academyPrevBtn','academyPracticeBtn','academyFeedback','academyStars']){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(js,/const ACADEMY_LESSONS=\[/);
 assert.match(js,/function openAcademy\(/);
 assert.match(js,/function answerAcademy\(/);
 assert.match(js,/function startAcademyPractice\(/);
 assert.match(js,/RETO 3\/3/);
 assert.match(css,/\.academy-overlay/);
});
test('Regla de superficie atravesando punto distinto de vértices',()=>{
 assert.match(js,/function pointCoveredByFace3D\(/);
 assert.match(js,/face\.a,face\.b,face\.c/);
 assert.match(js,/const covered=tris\.some\(face=>pointCoveredByFace3D/);
});

test('al volver del bloqueo, WebXR avisa si hay que reactivar AR sin salir de la partida',()=>{
 assert.match(js,/let arWasActiveWhenHidden=false/);
 assert.match(js,/function remindARAfterSleep/);
 assert.match(js,/document\.visibilityState==='hidden' && arSession/);
 assert.match(js,/restoreNetworkAfterPause\(\)/);
 assert.match(js,/Pulsa ACTIVAR AR/);
});

test('cinco insignias gratis y todas las demás con desbloqueo progresivo',()=>{
 const rules=fs.readFileSync(new URL('../rewards.js',import.meta.url),'utf8');
 assert.match(rules,/export const FREE_BADGES=\['◆','⚡','★','✦','☣'\]/);
 assert.match(rules,/export function applyCompletedBadgeVideo/);
 assert.match(js,/function chooseBadge/);
 assert.match(js,/function saveCosmetics/);
 assert.match(js,/function loadCosmetics/);
 assert.match(html,/id="badgeProgressNote"/);
 assert.match(css,/\.locked-badge/);
});
test('reintento contra BOT desde resultado y beta funcional sin anuncios',()=>{
 for(const id of ['restartLevelBtn','restartAdHint'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(js,/function retryCurrentSoloRound/);
 assert.match(js,/function restartLevelWithReward/);
 assert.match(js,/retryCurrentSoloRound\(\);notify\('Nivel reiniciado gratuitamente/);
 assert.match(js,/mode==='tutorial'/);
 assert.match(css,/\.reward-retry/);
});
