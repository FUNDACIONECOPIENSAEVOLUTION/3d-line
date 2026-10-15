// V57.1.0 · Firebase Auth utilizado originalmente en la edición V51.2.
// Las claves "apiKey" y "appId" del SDK web son identificadores públicos,
// NO credenciales administrativas. Firestore y la identidad deben protegerse
// con reglas de seguridad y validación en servidor antes de lanzar economía online.
const firebaseConfig={
 apiKey:"AIzaSyBbPYnUPaO-kzWWStS8013SOvdTSuK3KP4",
 authDomain:"ar-3lilne.firebaseapp.com",
 projectId:"ar-3lilne",
 appId:"1:382966716480:web:ee244825bb34bc35c667a5"
};
let sdk=null,auth=null,ready=false;
let listener=null;
export function authAvailable(){return !!auth&&ready;}
export async function initializeAccountAuth(onUser,onError){
 if(ready)return true;
 try{
  const [appLib,authLib]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js')
  ]);
  sdk=authLib;
  const app=appLib.getApps().find(x=>x.name==='3line-ar-game')||appLib.initializeApp(firebaseConfig,'3line-ar-game');
  auth=authLib.getAuth(app);
  await authLib.setPersistence(auth,authLib.browserLocalPersistence);
  ready=true;
  listener=authLib.onAuthStateChanged(auth,user=>{
    if(user){
      onUser({
        uid:user.uid,
        name:(user.displayName||'').trim()||('AGENTE-'+user.uid.slice(0,4).toUpperCase()),
        email:user.email||null,
        provider:user.isAnonymous?'anonymous':'google',
        photoURL:user.photoURL||null,
        verified:true
      });
    }else onUser(null);
  },error=>onError?.(error));
  return true;
 }catch(error){onError?.(error);return false;}
}
export async function loginGoogle(){
 if(!authAvailable())throw new Error('La autenticación Firebase aún no está disponible.');
 const provider=new sdk.GoogleAuthProvider();
 provider.setCustomParameters({prompt:'select_account'});
 await sdk.setPersistence(auth,sdk.browserLocalPersistence);
 return sdk.signInWithPopup(auth,provider);
}
export async function loginGuest(){
 if(!authAvailable())throw new Error('No está disponible la autenticación anónima de Firebase.');
 await sdk.setPersistence(auth,sdk.browserLocalPersistence);
 return sdk.signInAnonymously(auth);
}
export async function logoutFirebase(){
 if(authAvailable())await sdk.signOut(auth);
}
export function disposeAuth(){listener?.();listener=null;}
