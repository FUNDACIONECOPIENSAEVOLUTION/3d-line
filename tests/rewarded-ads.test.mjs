import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const text=await readFile(new URL('../ads-rewarded.js',import.meta.url),'utf8');
const {RewardedVideoProvider,validPublisherId}=await import('data:text/javascript,'+encodeURIComponent(text));

function setup(){
 const scripts=[];
 const doc={
  querySelector(){return scripts[0]||null;},
  createElement(){return {async:false,crossOrigin:'',dataset:{},setAttribute(){}};},
  head:{appendChild(el){scripts.push(el);}}
 };
 const window={adsbygoogle:[]};
 let provider=new RewardedVideoProvider(window,doc,async()=>({ok:true,json:async()=>({h5PublisherId:'ca-pub-1234567890123456'})}));
 return {provider,window,scripts};
}
test('sin publisher válido no hay anuncios reales ni recompensas',async()=>{
 assert.equal(validPublisherId(''),false);
 assert.equal(validPublisherId('ca-pub-000'),false);
 const {provider}=setup();
 assert.deepEqual(await provider.watch('coins'),{viewed:false,reason:'not-configured'});
});
test('configuración pública válida habilita el proveedor, no se simula video',async()=>{
 const {provider,window,scripts}=setup();
 assert.equal(await provider.init(),true);
 assert.equal(provider.enabled,true);
 assert.match(scripts[0].src,/pagead2\.googlesyndication\.com/);
 assert.equal(window.adsbygoogle.length,1);
});
test('adViewed acredita; sin callback de visualización nunca se acredita',async()=>{
 const {provider,window}=setup();await provider.init();
 let calls=[];
 window.adBreak=(opts)=>{calls.push(opts);opts.beforeReward(()=>{});opts.adViewed();opts.adBreakDone({breakStatus:'viewed'});};
 const result=await provider.watch('badge-shield');
 assert.deepEqual(result,{viewed:true,reason:'viewed'});
 assert.equal(provider.busy,false);
 window.adBreak=(opts)=>{opts.beforeReward(()=>{});opts.adDismissed();opts.adBreakDone({breakStatus:'dismissed'});};
 assert.deepEqual(await provider.watch('coins'),{viewed:false,reason:'dismissed'});
 window.adBreak=(opts)=>{opts.adBreakDone({breakStatus:'noAdPreloaded'});};
 assert.deepEqual(await provider.watch('coins'),{viewed:false,reason:'noAdPreloaded'});
});
test('no permite múltiples videos simultáneos y libera al finalizar',async()=>{
 const {provider,window}=setup();await provider.init();
 let callback;
 window.adBreak=opts=>{callback=opts;};
 const first=provider.watch('badge-dragon');
 assert.equal(provider.busy,true);
 assert.deepEqual(await provider.watch('coins'),{viewed:false,reason:'busy'});
 callback.adViewed();callback.adBreakDone({breakStatus:'viewed'});
 assert.equal((await first).viewed,true);
 assert.equal(provider.busy,false);
});
