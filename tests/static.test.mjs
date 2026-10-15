import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
test('la aplicación carga archivos identificados por la versión 57',()=>{
  assert.match(html,/V57\.0\.0/);
  assert.match(html,/game\.js\?v=57\.0\.0/);
  assert.match(js,/const VERSION='57\.0\.0-beta\.1'/);
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
test('no anuncia ingresos simulados ni concede monedas sin evento adViewed',()=>{
  assert.equal(js.includes('ca-pub-0000000000000000'),false);
  assert.match(js,/adViewed:/);
  assert.match(js,/const PUBLISHER_ID='';/);
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
});
test('Google no afirma acceso real sin configurar cliente y servidor',()=>{
 assert.match(js,/auth-config\.json/);
 assert.match(js,/Todavía falta autenticación verificada en servidor/);
 assert.match(html,/Google requiere configurar el ID de cliente/);
});
