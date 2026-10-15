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
globalThis.testAPI={LEVELS,levelPoints,segmentsCross,pointInsideTriangle,blockedNodes,edgeError,
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
test('triángulo encierra nodos interiores pero no sus vértices',()=>{
 api.setPoints([[0,0,0],[2,0,0],[0,0,2],[.5,.3,.5],[3,0,3]]);
 const s={tris:[{a:0,b:1,c:2}],lines:[],blocked:[],level:1};
 assert.equal(JSON.stringify(api.blockedNodes(s)),JSON.stringify([3]));
});
test('impide atravesar una línea existente y reutilizar nodos encerrados',()=>{
 api.setPoints([[0,0,0],[1,0,1],[0,0,1],[1,0,0]]);
 let s={lines:[{a:0,b:1}],tris:[],blocked:[],level:10};
 assert.match(api.edgeError(2,3,s),/pared o línea/);
 s={lines:[],tris:[],blocked:[0],level:10};
 assert.match(api.edgeError(0,1,s),/zona cerrada/);
});
