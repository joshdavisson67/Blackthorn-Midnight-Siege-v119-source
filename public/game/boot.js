// Start in this page and request mouse capture in the Enter click itself.
const byId=id=>document.getElementById(id);
const launchParams=new URLSearchParams(location.search);
const legacyPlayLink=launchParams.get('play')==='1';
let ready=false,startRun=null,failed=false;
if(legacyPlayLink){
  const quality=launchParams.get('quality'),sensitivity=Number(launchParams.get('sensitivity'));
  if(['high','ultra','low'].includes(quality))byId('quality').value=quality;
  if(sensitivity>=.5&&sensitivity<=2)byId('sensitivity').value=String(sensitivity);
  if(launchParams.has('sound'))byId('sound').checked=launchParams.get('sound')!=='0';
}
function report(error){if(failed)return;failed=true;byId('loading').classList.add('hidden');byId('error').classList.remove('hidden');byId('errorDetails').textContent=error?.message||String(error||'The game could not load.');byId('start').disabled=true;}
window.Blackthorn={ready(fn){
  startRun=fn;ready=true;byId('start').disabled=false;
  byId('start').innerHTML='ENTER THE ESTATE <span>→</span>';
  byId('loading').classList.add('hidden');
  if(legacyPlayLink)byId('quality').onchange?.();
},report};
byId('start').disabled=true;byId('start').textContent='PREPARING THE ESTATE…';
byId('start').addEventListener('click',()=>{
  if(!ready||failed||byId('start').disabled)return;
  try{
    byId('start').disabled=true;
    // Rendering is prepared before readiness. Keep reset/capture synchronous
    // so requestPointerLock retains this button's user activation.
    startRun();
  }catch(error){report(error);}
});
byId('retry').addEventListener('click',()=>location.reload());
window.addEventListener('error',event=>{if(event.error)report(event.error);});
window.addEventListener('unhandledrejection',event=>report(event.reason));
const timeout=setTimeout(()=>{if(!ready&&!failed){byId('loading').classList.add('hidden');byId('error').classList.remove('hidden');byId('errorDetails').textContent='The estate is taking too long to load. Try reloading the game.';}},45000);
import('./game.js?v=142').then(()=>clearTimeout(timeout)).catch(report);
