import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const raw=await readFile(new URL('../turn-modes.js',import.meta.url),'utf8');
const {normalizeTurnRule,turnMoveAllowance,nextTurnCounts,completedTurnsForPlayer,TURN_RULES}=
 await import('data:text/javascript,'+encodeURIComponent(raw));

test('identifica Modo Galáctico y Modo Ascenso sin cambiar los niveles',()=>{
 assert.equal(TURN_RULES.ascenso.label,'MODO ASCENSO');
 assert.equal(TURN_RULES.random.label,'MODO GALÁCTICO');
 assert.equal(normalizeTurnRule('ascenso'),'ascenso');
 assert.equal(normalizeTurnRule('cualquier'),'random');
});
test('Ascenso concede 1, 2, 3, 4 conexiones por TURNOS DEL PROPIO JUGADOR',()=>{
 let s={ruleMode:'ascenso',turns:0,turnCountByPlayer:[0,0]};
 for(const needed of [1,2,3,4,5]){
  assert.equal(turnMoveAllowance(s,0,null),needed);
  assert.equal(turnMoveAllowance(s,1,null),needed);
  s.turnCountByPlayer=nextTurnCounts(s,0);s.turns++;
  assert.equal(turnMoveAllowance(s,1,null),needed,'El rival no gana conexiones por turno ajeno');
  s.turnCountByPlayer=nextTurnCounts(s,1);s.turns++;
 }
});
test('El modo Galáctico conserva el dado entre 1 y 6',()=>{
 for(let n=1;n<=6;n++)assert.equal(turnMoveAllowance({ruleMode:'random'},0,n),n);
 assert.equal(turnMoveAllowance({ruleMode:'random'},0,99),6);
 assert.equal(turnMoveAllowance({ruleMode:'random'},0,0),1);
});
test('los estados antiguos sin contadores siguen siendo interpretables',()=>{
 assert.equal(completedTurnsForPlayer({turns:5},0),3);
 assert.equal(completedTurnsForPlayer({turns:5},1),2);
 assert.equal(completedTurnsForPlayer({turns:0},0),0);
});
