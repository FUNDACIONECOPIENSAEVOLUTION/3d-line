import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
function extract(name){
 const start=js.indexOf('function '+name+'(');
 if(start<0)throw new Error('Falta '+name);
 const re=/\n(?:async )?function \w+\(/g;re.lastIndex=start+12;
 const next=re.exec(js);
 return js.slice(start,next?next.index:undefined);
}
class Vec3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 copy(p){this.x=p.x;this.y=p.y;this.z=p.z;return this;}
 project(camera){camera.used=true;return this;}
}
const cam={isPerspectiveCamera:true,used:false};
const context={
 arSession:{},arPlaced:true,board:{visible:true,updateWorldMatrix(){}},
 renderer:{xr:{getCamera(){return {isArrayCamera:true,cameras:[cam]};}}},
 window:{innerWidth:400,innerHeight:800},
 THREE:{Vector3:Vec3},
 nodes:[
  {getWorldPosition(o){o.x=-.5;o.y=0;o.z=0;}},
  {getWorldPosition(o){o.x=.5;o.y=0;o.z=0;}}
 ]
};
vm.createContext(context);
vm.runInContext(extract('xrViewCameras')+'\n'+extract('closestXRNodeOnScreen')+
 '\nglobalThis.testAPI={closestXRNodeOnScreen,xrViewCameras};',context);

test('la selección AR utiliza la cámara perspectiva interna, no ArrayCamera',()=>{
 assert.equal(context.testAPI.closestXRNodeOnScreen(300,400),1);
 assert.equal(context.testAPI.closestXRNodeOnScreen(100,400),0);
 assert.equal(cam.used,true);
});
test('un toque lejos de puntos no dibuja líneas por accidente',()=>{
 assert.equal(context.testAPI.closestXRNodeOnScreen(200,200),-1);
});
test('sin tablero fijado, la selección AR espera a la colocación',()=>{
 context.arPlaced=false;
 assert.equal(context.testAPI.closestXRNodeOnScreen(300,400),-1);
});
test('el juego recibe toques del DOM overlay y select nativo XR',()=>{
 assert.match(js,/document\.addEventListener\('pointerdown',onARPointerDown,true\)/);
 assert.match(js,/document\.addEventListener\('pointerup',onARPointerUp,true\)/);
 assert.match(js,/document\.addEventListener\('beforexrselect'/);
 assert.match(js,/session\.addEventListener\('select',onARXRSelect\)/);
 assert.doesNotMatch(js,/setFromCamera\(mouse,renderer\.xr\.isPresenting/);
});
