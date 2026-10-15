import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const start=js.indexOf('const ACADEMY_LESSONS=[');
const end=js.indexOf('\nfunction tutorials(){',start);
assert.ok(start>=0&&end>start,'Academia debe estar definida en game.js');
const elems=new Map();
function elem(){
 const classes=new Set(['hidden']);
 return {textContent:'',innerHTML:'',disabled:false,value:'',
  classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},
   toggle(v,on){if(on)classes.add(v);else classes.delete(v);},
   contains(v){return classes.has(v);}}};
}
const saved=new Map();
let started=0,notified='';
const context={el(id){if(!elems.has(id))elems.set(id,elem());return elems.get(id);},
 localStorage:{getItem(k){return saved.get(k)||null;},setItem(k,v){saved.set(k,v);}},
 currentAccount:{uid:'test-user'},showCpu(x){assert.equal(x,true);started++;},
 notify(s){notified=s;},document:{},console};
vm.createContext(context);
vm.runInContext(js.slice(start,end)+
 '\nglobalThis.api={get lessons(){return ACADEMY_LESSONS;},get index(){return academyIndex;},openAcademy,closeAcademy,answerAcademy,nextAcademy,renderAcademy,startAcademyPractice};',context);
const api=context.api;
test('manual dispone ocho ejercicios con dos respuestas cada uno',()=>{
 assert.equal(api.lessons.length,8);
 for(const lesson of api.lessons){
  assert.equal(lesson.answers.length,2);
  assert.ok([0,1].includes(lesson.correct));
  assert.ok(lesson.text.length>60);
 }
});
test('no deja avanzar antes de responder y guía con feedback',()=>{
 api.openAcademy();
 assert.equal(api.index,0);
 assert.equal(context.el('academyNextBtn').disabled,true);
 api.answerAcademy(1); // respuesta equivocada del primer ejercicio
 assert.match(context.el('academyFeedback').textContent,/INTENTA OTRA VEZ/);
 assert.equal(context.el('academyNextBtn').disabled,true);
 api.answerAcademy(0);
 assert.equal(context.el('academyNextBtn').disabled,false);
 assert.match(context.el('academyFeedback').textContent,/EJERCICIO SUPERADO/);
 api.nextAcademy();
 assert.equal(api.index,1);
 assert.ok(saved.has('3line57_academy_test-user'));
});
test('la academia conserva las respuestas guardadas en este navegador',()=>{
 api.openAcademy();
 assert.equal(context.el('academyNextBtn').disabled,false);
});
test('iniciar práctica desde academia llama al tutorial con BOT',()=>{
 context.el('game').classList.add('hidden');
 api.startAcademyPractice();
 assert.equal(started,1);
});
