import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const boot=readFileSync(new URL('../public/game/boot.js',import.meta.url),'utf8');
const gameImport="import('./game.js?v=142')";
assert(boot.includes(gameImport),'Startup checks must execute the current game import');
const source=boot.replace(gameImport,'loadGame()');
function fixture({search='',embedded=false}={}){
  const elements=new Map(),events={},state={starts:[],startGestures:[],opens:[],reloaded:0,inClick:false};
  function get(id){if(!elements.has(id)){const classes=new Set(id==='error'?['hidden']:[]);elements.set(id,{disabled:false,textContent:'',innerHTML:'',value:id==='quality'?'high':id==='sensitivity'?'1':'',checked:true,classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}},addEventListener(name,fn){this[name]=fn;}});}return elements.get(id);}
  let resolve,reject;const loaded=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const window={addEventListener(name,fn){events[name]=fn;},open(...args){state.opens.push(args);return null;}};window.self=window;window.top=embedded?{}:window;
  vm.runInNewContext(source,{document:{getElementById:get},window,location:{search,reload(){state.reloaded++;}},URLSearchParams,setTimeout(){return 1;},clearTimeout(){},loadGame:()=>loaded});
  return {get,events,state,window,resolve,reject,
    ready(start=()=>{}){window.Blackthorn.ready(options=>{state.starts.push(options);state.startGestures.push(state.inClick);start(options);});resolve();},
    click(){state.inClick=true;try{get('start').click();}finally{state.inClick=false;}}
  };
}
const landing=fixture();assert(landing.get('start').disabled);landing.click();assert.equal(landing.state.starts.length,0);assert.equal(landing.state.opens.length,0);
landing.ready();await Promise.resolve();assert.equal(landing.state.starts.length,0);assert(!landing.get('start').disabled);
assert.equal(landing.get('start').innerHTML,'ENTER THE ESTATE <span>→</span>');
landing.get('quality').value='low';landing.get('sensitivity').value='1.7';landing.get('sound').checked=false;landing.click();
assert.equal(landing.state.starts.length,1);assert.equal(landing.state.starts[0],undefined);assert.equal(landing.state.startGestures[0],true,'Start must run in the Enter gesture, without a deferred callback');assert.equal(landing.state.opens.length,0);
assert.equal(landing.get('quality').value,'low');assert.equal(landing.get('sensitivity').value,'1.7');assert.equal(landing.get('sound').checked,false);
landing.click();assert.equal(landing.state.starts.length,1,'Repeated entry must not reset the run or replace its pending capture');
console.log('PASS: Enter starts in the current page synchronously, preserves settings, opens no tab, and ignores repeated entry.');
const legacy=fixture({search:'?play=1&quality=low&sensitivity=1.7&sound=0'});let qualityApplied=0;legacy.get('quality').onchange=()=>qualityApplied++;
legacy.ready();await Promise.resolve();assert.equal(legacy.state.starts.length,0);assert.equal(qualityApplied,1);assert.equal(legacy.get('quality').value,'low');assert.equal(legacy.get('sensitivity').value,'1.7');assert.equal(legacy.get('sound').checked,false);legacy.click();assert.equal(legacy.state.starts.length,1);assert.equal(legacy.state.startGestures[0],true);assert.equal(legacy.state.opens.length,0);
const embedded=fixture({search:'?play=1',embedded:true});embedded.ready();assert.equal(embedded.state.starts.length,0);embedded.click();assert.equal(embedded.state.starts.length,1);assert.equal(embedded.state.opens.length,0);
console.log('PASS: legacy play links retain settings and wait for Enter; framed pages also start in place without pop-ups.');
const failed=fixture();failed.reject(new Error('A game module failed to load'));await Promise.resolve();await Promise.resolve();assert(!failed.get('error').classList.contains('hidden'));assert.equal(failed.get('errorDetails').textContent,'A game module failed to load');failed.click();assert.equal(failed.state.starts.length,0);failed.get('retry').click();assert.equal(failed.state.reloaded,1);
const runtime=fixture();runtime.ready(()=>{throw new Error('Launch failed');});runtime.click();assert.equal(runtime.get('errorDetails').textContent,'Launch failed');assert(runtime.get('start').disabled);
console.log('PASS: startup and launch exceptions show an actionable error and reload control.');

// Exercise the real run/capture callback through boot.js, rather than only
// testing the game module's separate fallback onclick handler.
export async function verifyInPlaceEntry({qa,frames,elements,gameCanvas,document,acquireMouse}){
  const launch=fixture();launch.ready(()=>qa.start());let requests=0,settle;
  gameCanvas.requestPointerLock=()=>{assert(launch.state.inClick,'Mouse lock must be requested in the Enter click');requests++;return new Promise(resolve=>{settle=resolve;});};
  launch.click();assert.equal(requests,1);assert.equal(qa.get().mode,'capturing');assert.equal(document.pointerLockElement,null);
  assert(elements.get('menu').classList.contains('hidden'));assert(!elements.get('hud').classList.contains('hidden'));
  launch.click();assert.equal(requests,1,'Double Enter must not restart a pending capture');
  const waiting={z:qa.get().player.z,waveDelay:qa.get().waveDelay,runTime:qa.get().runTime};qa.setKeys(['KeyW']);frames(120);qa.setKeys([]);
  assert.equal(qa.get().player.z,waiting.z);assert.equal(qa.get().waveDelay,waiting.waveDelay);assert.equal(qa.get().runTime,waiting.runTime);
  await acquireMouse();settle();await Promise.resolve();assert.equal(qa.get().mode,'playing');assert(qa.get().pointer);assert(gameCanvas.classList.contains('mouse-locked'));assert(elements.get('pause').classList.contains('hidden'));
  const denied=fixture();denied.ready(()=>qa.start());
  gameCanvas.requestPointerLock=()=>{assert(denied.state.inClick);return Promise.reject(Object.assign(new Error('Mouse capture denied'),{name:'NotAllowedError'}));};
  denied.click();await Promise.resolve();assert.equal(qa.get().mode,'paused');assert.equal(document.pointerLockElement,null);assert(!elements.get('captureHelp').classList.contains('hidden'));assert(denied.get('error').classList.contains('hidden'),'Permission denial must use capture retry, not a startup failure');
  gameCanvas.requestPointerLock=acquireMouse;elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');assert(qa.get().pointer);assert(elements.get('captureHelp').classList.contains('hidden'));
  qa.start();
  console.log('PASS: real Enter callback requests capture in its click, waits for permission without gameplay advancing, and recovers from denial through Retry.');
}
