import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const start=js.indexOf('const LEVELS=['),end=js.indexOf('const el=id=>',start);
if(start<0||end<0)throw new Error('No se encontró el motor geométrico');
const minimal = js.slice(start,end)+`
const linkKey=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
const distance=(a,b)=>POINTS[a].distanceTo(POINTS[b]);
globalThis.testAPI={LEVELS,levelPoints,segmentsCross,pointInsideTriangle,blockedNodes,crossesOwnedTriangle,edgeError,segmentDistance3,segmentIntersectsFace3D,closedTriangleShells,
setPoints(p){POINTS=p.map(q=>new THREE.Vector3(...q))}};
`;
class Vector3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 distanceTo(b){return Math.hypot(this.x-b.x,this.y-b.y,this.z-b.z);}
}
const context={THREE:{Vector3},localStorage:{getItem:()=>null,setItem:()=>{}},document:{},console};
vm.runInNewContext(minimal,context);
const api=context.testAPI;

test('hay exactamente 10 niveles, iniciando con 5 puntos',()=>{
 assert.equal(api.LEVELS.length,10);
 assert.equal(api.levelPoints(1,20).length,5);
 for(const l of api.LEVELS){assert.equal(api.levelPoints(l.level,987321).length,l.count);}
});
test('los niveles aleatorios son reproducibles con la misma semilla y varían entre partidas',()=>{
 const a=api.levelPoints(10,123),b=api.levelPoints(10,123),c=api.levelPoints(10,124);
 assert.equal(JSON.stringify(a),JSON.stringify(b));
 assert.notEqual(JSON.stringify(a),JSON.stringify(c));
});
test('cruces proyectados se detectan y los segmentos separados no se bloquean',()=>{
 const p=(x,y)=>({x,y});
 assert.equal(api.segmentsCross(p(0,0),p(2,2),p(0,2),p(2,0)),true);
 assert.equal(api.segmentsCross(p(0,0),p(2,0),p(0,1),p(2,1)),false);
});
test('un punto SOBRE un triángulo, a mayor altura, queda libre',()=>{
 api.setPoints([[0,0,0],[2,0,0],[0,0,2],[.5,.8,.5]]);
 const state={tris:[{a:0,b:1,c:2,owner:0}],lines:[],blocked:[],level:1};
 assert.equal(JSON.stringify(api.blockedNodes(state)),'[]');
 assert.equal(api.edgeError(3,0,state),null);
});
test('triángulos abiertos NO encapsulan un nodo, aunque esté bajo su proyección',()=>{
 api.setPoints([[0,0,0],[2,0,0],[0,0,2],[.5,-.3,.5]]);
 const state={tris:[{a:0,b:1,c:2}],lines:[],blocked:[],level:1};
 assert.equal(api.blockedNodes(state).length,0);
});
test('una línea en altura distinta puede cruzar su proyección 2D sin colisión',()=>{
 api.setPoints([[0,0,0],[2,0,2],[0,1,2],[2,1,0]]);
 const state={lines:[{a:0,b:1}],tris:[],blocked:[],level:1};
 assert.equal(api.edgeError(2,3,state),null);
});
test('dos segmentos que se cruzan de verdad en XYZ se bloquean',()=>{
 api.setPoints([[0,0,0],[2,0,2],[0,0,2],[2,0,0]]);
 const state={lines:[{a:0,b:1}],tris:[],blocked:[],level:1};
 assert.match(api.edgeError(2,3,state),/espacio 3D/);
});
test('una cara conquistada impide atravesarla, no pasar POR ENCIMA',()=>{
 api.setPoints([[0,0,0],[2,0,0],[0,0,2],[.4,-1,.4],[.4,1,.4],[1,1,1]]);
 const state={lines:[],tris:[{a:0,b:1,c:2,owner:0}],blocked:[],level:1};
 assert.match(api.edgeError(3,4,state),/cara conquistada/);
 assert.equal(api.edgeError(4,5,state),null);
});
test('solo una envolvente tetraédrica cerrada bloquea puntos en su interior',()=>{
 api.setPoints([[0,0,0],[2,0,0],[0,2,0],[0,0,2],[.3,.3,.3],[.6,2.5,.6]]);
 const faces=[{a:0,b:1,c:2},{a:0,b:1,c:3},{a:0,b:2,c:3},{a:1,b:2,c:3}];
 const state={tris:faces,lines:[],blocked:[],level:1};
 assert.equal(api.closedTriangleShells(faces).length,1);
 assert.equal(JSON.stringify(api.blockedNodes(state)),'[4]');
 const open={...state,tris:faces.slice(0,3)};
 assert.equal(api.blockedNodes(open).length,0);
});
test('distancia entre puntos no es por sí sola un bloqueo',()=>{
 api.setPoints([[0,0,0],[20,0,0]]);
 assert.equal(api.edgeError(0,1,{lines:[],tris:[],blocked:[],level:1}),null);
});

test('las líneas desde un nodo común son válidas sin cruces',()=>{
 api.setPoints([[0,0,0],[1,0,0],[0,0,1]]);
 const state={lines:[{a:0,b:1}],tris:[],blocked:[],level:1};
 assert.equal(api.edgeError(0,2,state),null);
});
test('la longitud por sí sola no impide conexiones',()=>{
 api.setPoints([[0,0,0],[20,0,0]]);
 assert.equal(api.edgeError(0,1,{lines:[],tris:[],blocked:[],level:1}),null);
});
test('bloquea nodos encerrados, aun cuando están cerca',()=>{
 api.setPoints([[0,0,0],[1,0,1],[0,0,1],[1,0,0]]);
 const s={lines:[],tris:[],blocked:[0],level:10};
 assert.match(api.edgeError(0,1,s),/volumen completamente cerrado/);
});
