import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
function source(name){
 const start=js.indexOf('function '+name+'(');
 assert.ok(start>=0,'Falta '+name);
 const rest=js.slice(start), next=/\n(?:async )?function \w+\(/g;
 next.lastIndex=12;const m=next.exec(rest);
 return m?rest.slice(0,m.index):rest;
}
function el(){
 const classes=new Set();
 return {
  disabled:false,textContent:'',attributes:{},
  classList:{toggle(name,value){if(value)classes.add(name);else classes.delete(name);},
   contains(name){return classes.has(name);}},
  setAttribute(k,v){this.attributes[k]=v;}
 };
}
const elems=Object.fromEntries(['arTouchModeBtn','arAimModeBtn','arAimCrosshair','arAimSelectBtn','arAimText'].map(k=>[k,el()]));
let pointed=2, turnActive=true;
const clicked=[];
const ctx={
 arSession:{},arPlaced:true,game:{},el(id){return elems[id];},
 closestXRNodeOnScreen(){return pointed;},
 canSelectNode(){return turnActive;},
 selectNodeById(id){clicked.push(id);return true;},
 notify(){},
 window:{innerWidth:350,innerHeight:700},
 Date, console
};
vm.createContext(ctx);
vm.runInContext("let arSelectionMode='touch',arAimedNode=-1,lastARNodePick=0;"+[
 'setARSelectionMode','updateARAim','selectAimedNode'
].map(source).join('\n')+"\nglobalThis.api={setARSelectionMode,updateARAim,selectAimedNode};",ctx);
test('tocar y apuntar se pueden elegir y los controles responden',()=>{
 ctx.api.setARSelectionMode('aim');
 assert.equal(elems.arAimModeBtn.attributes['aria-pressed'],'true');
 assert.equal(elems.arAimCrosshair.classList.contains('hidden'),false);
 ctx.api.updateARAim();
 assert.equal(elems.arAimSelectBtn.disabled,false);
 assert.match(elems.arAimText.textContent,/NODO 3/);
 assert.equal(ctx.api.selectAimedNode(),true);
 assert.deepEqual(clicked,[2]);
 ctx.api.setARSelectionMode('touch');
 assert.equal(elems.arTouchModeBtn.attributes['aria-pressed'],'true');
 assert.equal(elems.arAimCrosshair.classList.contains('hidden'),true);
});
test('apuntar no selecciona cuando el rival tiene turno o no hay objetivo',()=>{
 ctx.api.setARSelectionMode('aim');
 turnActive=false;ctx.api.updateARAim();
 assert.equal(elems.arAimSelectBtn.disabled,true);
 turnActive=true;pointed=-1;ctx.api.updateARAim();
 assert.equal(elems.arAimSelectBtn.disabled,true);
 assert.equal(ctx.api.selectAimedNode(),false);
});
