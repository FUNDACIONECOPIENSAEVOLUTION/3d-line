import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
function grab(name){
 const start=source.indexOf('function '+name+'(');
 if(start<0)throw Error('No existe '+name);
 const rest=source.slice(start);
 const m=/\n(?:async )?function \w+\(/g;
 m.lastIndex=12;
 const next=m.exec(rest);
 return next?rest.slice(0,next.index):rest;
}
const body=['endTurn','applyAction','scheduleCpu'].map(grab).join('\n');
const queue=[],allowed=['0-1','1-2','2-3','3-4','0-4','1-4'];
const context={
 game:{status:'play',turn:0,rolled:true,moves:1,dice:1,turns:0,maxTurns:12,version:0,
 lines:[],tris:[],scores:[0,0],winner:null,blocked:[],level:1},
 POINTS:[0,1,2,3,4],mode:'tutorial',myPlayer:0,cpuTimer:null,
 LEVELS:[{range:1.9}],tutorial:true,awardRecorded:false,
 eligibleCount(s){return allowed.filter(k=>!s.lines.some(l=>[l.a,l.b].sort().join('-')===k)).length;},
 validEdge(a,b,s){return allowed.includes([a,b].sort().join('-'))&&!s.lines.some(l=>[l.a,l.b].sort().join('-')===[a,b].sort().join('-'));},
 foundTriangles(){return [];},blockedNodes(){return [];},distance(a,b){return Math.abs(a-b);},
 notify(){},setState(){},broadcast(){},rand(){return 5;},console,
 clearTimeout(){},setTimeout(fn){queue.push(fn);return queue.length;},
 Math
};
vm.createContext(context);vm.runInContext(body+'\nglobalThis.actions={applyAction,scheduleCpu}',context);
test('el tutorial tras jugar pasa al bot y el bot devuelve el turno',()=>{
 assert.equal(context.actions.applyAction('LINE',{a:0,b:1},0),true);
 assert.equal(context.game.turn,1);
 for(let i=0;i<8&&context.game.turn===1;i++){
  const fn=queue.shift();assert.ok(fn,'Debe existir acción BOT pendiente');
  fn();
 }
 assert.equal(context.game.turn,0);
 assert.ok(context.game.lines.some(x=>x.owner===1),'El BOT crea al menos una línea');
});
test('el dado se limita a seis y los turnos no quedan atrapados',()=>{
 assert.ok(context.game.status==='play');
 assert.equal(context.actions.applyAction('ROLL',{},0),true);
 assert.equal(context.game.dice,6);
 assert.ok(context.game.moves>0&&context.game.moves<=6);
});
