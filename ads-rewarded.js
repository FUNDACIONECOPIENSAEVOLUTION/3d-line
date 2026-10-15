// Puente oficial Google H5 Games Ad Placement API para sitio web.
// Solo confirma recompensa mediante callback adViewed. No hay "video falso".
// Id del editor en ads-config.json solo tras aprobacion real de H5 Games Ads.
export const validPublisherId=id=>/^ca-pub-\d{16}$/.test(String(id||''));
export class RewardedVideoProvider{
 constructor(win=window,doc=document,fetcher=fetch){
  this.win=win;this.doc=doc;this.fetcher=fetcher;
  this.enabled=false;this.busy=false;this.publisherId='';
 }
 async init(configUrl='./ads-config.json'){
  try{
   const response=await this.fetcher(configUrl,{cache:'no-store'});
   if(!response.ok)return false;
   const config=await response.json();
   if(!validPublisherId(config.h5PublisherId))return false;
   this.publisherId=config.h5PublisherId;
   if(this.doc.querySelector('script[data-h5-3line]')){this.enabled=true;return true;}
   const win=this.win,script=this.doc.createElement('script');
   script.async=true;script.crossOrigin='anonymous';script.dataset.h5_3line='yes';
   script.setAttribute('data-h5-3line','');
   script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+this.publisherId;
   win.adsbygoogle=win.adsbygoogle||[];
   win.adBreak=win.adConfig=o=>win.adsbygoogle.push(o);
   this.doc.head.appendChild(script);
   win.adConfig({preloadAdBreaks:'on',sound:'on'});
   this.enabled=true;return true;
  }catch{return false;}
 }
 watch(placement){
  if(!this.enabled||typeof this.win.adBreak!=='function')
   return Promise.resolve({viewed:false,reason:'not-configured'});
  if(this.busy)return Promise.resolve({viewed:false,reason:'busy'});
  this.busy=true;
  return new Promise(resolve=>{
   let viewed=false,settled=false;
   const finish=(result)=>{
    if(settled)return;
    settled=true;this.busy=false;
    resolve(result);
   };
   try{
    this.win.adBreak({
     type:'reward',
     name:('3line-'+String(placement||'reward')).slice(0,48),
     // El usuario ya pulso VER VIDEO voluntariamente. Este callback
     // solo se dispara cuando hay un anuncio listo para mostrarse.
     beforeReward:showAd=>showAd(),
     adViewed:()=>{viewed=true;},
     adDismissed:()=>{viewed=false;},
     adBreakDone:info=>finish({viewed,reason:viewed?'viewed':(info?.breakStatus||'not-available')})
    });
   }catch(error){finish({viewed:false,reason:'error'});}
  });
 }
}
