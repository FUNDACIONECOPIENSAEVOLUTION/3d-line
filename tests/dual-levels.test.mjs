import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../game.js',import.meta.url),'utf8');
const raw=await readFile(new URL('../turn-modes.js',import.meta.url),'utf8');
const rules=await import('data:text/javascript,'+encodeURIComponent(raw));
function getFunction(name){
 const first=source.indexOf('function '+name+'(');
 assert.ok(first>=0,'Falta '+name);
 const re=/\n(?:async )?function [A-Za-z0-9_]+\(/g;re.lastIndex=first+10;
 const next=re.exec(source);return source.slice(first,next?next.index:undefined);
}
const disk=new Map();
const context={
 game:{status:'end',winner:0,level:1,ruleMode:'random'},
 myPlayer:0,mode:'cpu',awardRecorded:false,
 profile:{elo:1000,coins:0,level:1},currentAccount:{uid:'test-user'},
 localStorage:{setItem(k,v){disk.set(k,v)},getItem(k){return disk.get(k)||null}},
 normalizeTurnRule:rules.normalizeTurnRule,
 renderLevels(){},saveProfile(){},Math
};
vm.createContext(context);
const code='let completedModesByLevel={};let unlockedLevel=1;'+
 ['modeWinsStorageKey','saveModeWins','modesWonAtLevel','completedBothRules','pendingModeAtLevel','awardResult'].map(getFunction).join('\n')+
 '\nglobalThis.testAPI={awardResult,completedBothRules,pendingModeAtLevel,getLevel:()=>unlockedLevel};';
vm.runInContext(code,context);
test('un solo modo superado NO desbloquea el siguiente nivel',()=>{
 assert.equal(context.testAPI.awardResult(),false);
 assert.equal(context.testAPI.getLevel(),1);
 assert.equal(context.testAPI.pendingModeAtLevel(1),'ascenso');
 assert.equal(context.profile.coins,15);
});
test('al ganar el segundo modo del mismo nivel desbloquea el siguiente',()=>{
 context.awardRecorded=false;
 context.game={status:'end',winner:0,level:1,ruleMode:'ascenso'};
 assert.equal(context.testAPI.awardResult(),true);
 assert.equal(context.testAPI.getLevel(),2);
 assert.equal(context.testAPI.completedBothRules(1),true);
 assert.equal(disk.get('3line57_unlocked_test-user'),'2');
});
test('en niveles siguientes se puede ganar primero Ascenso',()=>{
 context.awardRecorded=false;
 context.game={status:'end',winner:0,level:2,ruleMode:'ascenso'};
 assert.equal(context.testAPI.awardResult(),false);
 assert.equal(context.testAPI.pendingModeAtLevel(2),'random');
 context.awardRecorded=false;context.game.ruleMode='random';
 assert.equal(context.testAPI.awardResult(),true);
 assert.equal(context.testAPI.getLevel(),3);
});
test('el progreso no aumenta por resultado perdido o PvP',()=>{
 context.awardRecorded=false;context.game={status:'end',winner:1,level:3,ruleMode:'random'};
 assert.equal(context.testAPI.awardResult(),false);
 assert.equal(context.testAPI.getLevel(),3);
 context.awardRecorded=false;context.game.winner=0;context.mode='pvp';
 assert.equal(context.testAPI.awardResult(),false);
 assert.equal(context.testAPI.getLevel(),3);
});
