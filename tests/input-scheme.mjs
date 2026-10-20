import assert from 'node:assert/strict';
import {detectDevice,createControlScheme,CONTROL_STORAGE_KEY,LEGACY_TOUCH_KEY} from '../public/game/input-scheme.mjs';

// A fake browser window: media query answers, navigator hints, gamepads and
// the events the scheme listens for.
function fakeWindow({coarse=false,fine=false,hover=!coarse,mobile,touchPoints=0,ua='',pads=[]}={}){
  const handlers={},media={};
  const state={coarse,fine,hover};
  const answer=q=>q==='(pointer: coarse)'?state.coarse:q==='(pointer: fine)'?state.fine:q==='(hover: none)'?!state.hover:false;
  const win={
    matchMedia(q){media[q]??={get matches(){return answer(q);},listeners:[],addEventListener(t,fn){this.listeners.push(fn);},removeEventListener(t,fn){this.listeners=this.listeners.filter(f=>f!==fn);}};return media[q];},
    navigator:{userAgentData:mobile===undefined?undefined:{mobile},maxTouchPoints:touchPoints,userAgent:ua,getGamepads:()=>pads},
    addEventListener(t,fn){(handlers[t]??=[]).push(fn);},removeEventListener(t,fn){handlers[t]=(handlers[t]||[]).filter(f=>f!==fn);},
    fire(t){for(const fn of handlers[t]||[])fn({});},
    setPointer(next){Object.assign(state,next);for(const m of Object.values(media))for(const fn of m.listeners)fn({});},
    pads,handlers
  };
  return win;
}
function memoryStorage(initial={}){const data={...initial};return {data,getItem:k=>k in data?data[k]:null,setItem:(k,v)=>{data[k]=String(v);},removeItem:k=>{delete data[k];}};}

const PHONE={coarse:true,fine:false,hover:false};
const DESKTOP={coarse:false,fine:true,hover:true};

// ---- Detection --------------------------------------------------------------
assert.equal(detectDevice(fakeWindow(PHONE)),'touch','Phones and tablets are touch devices');
assert.equal(detectDevice(fakeWindow(DESKTOP)),'desktop','A mouse or trackpad is a desktop');
assert.equal(detectDevice(fakeWindow({...DESKTOP,touchPoints:10})),'desktop','A touchscreen laptop with a trackpad stays a desktop');
// Stylus phones (any-pointer: fine) and phones with paired keyboards still have a coarse primary pointer.
assert.equal(detectDevice(fakeWindow({...PHONE,touchPoints:5})),'touch','A stylus phone stays a touch device');
// Without pointer media queries, platform hints decide.
assert.equal(detectDevice(fakeWindow({hover:true,mobile:true})),'touch');
assert.equal(detectDevice(fakeWindow({hover:true,touchPoints:5,ua:'Mozilla/5.0 (Linux; Android 14) Mobile'})),'touch');
assert.equal(detectDevice(fakeWindow({hover:true,touchPoints:5,ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})),'touch','iPadOS reports a Mac with touch points');
assert.equal(detectDevice(fakeWindow({hover:true,ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})),'desktop');
assert.equal(detectDevice({}),'desktop','Unknown environments get mouse and keyboard');

// ---- Defaults at load -------------------------------------------------------
{
  const phone=createControlScheme({win:fakeWindow(PHONE),storage:memoryStorage()});
  assert.equal(phone.scheme,'touch','A phone loads with touch controls');
  const desktop=createControlScheme({win:fakeWindow(DESKTOP),storage:memoryStorage()});
  assert.equal(desktop.scheme,'standard','A computer loads with mouse and keyboard');
  const noStorage=createControlScheme({win:fakeWindow(PHONE),storage:null});
  assert.equal(noStorage.scheme,'touch','Blocked storage still detects the device');
}

// ---- The retired global switch no longer overrides detection ----------------
{
  const storage=memoryStorage({[LEGACY_TOUCH_KEY]:'off'});
  const phone=createControlScheme({win:fakeWindow(PHONE),storage});
  assert.equal(phone.scheme,'touch','An old saved "off" cannot leave a phone without touch controls');
  assert(!(LEGACY_TOUCH_KEY in storage.data),'The old key is cleared');
}

// ---- A player's choice is remembered for that kind of device only ----------
{
  const storage=memoryStorage(),changes=[];
  const phone=createControlScheme({win:fakeWindow(PHONE),storage,onChange:s=>changes.push(s)});
  phone.choose('standard');
  assert.equal(phone.scheme,'standard');assert.deepEqual(changes,['standard']);
  assert.deepEqual(JSON.parse(storage.data[CONTROL_STORAGE_KEY]),{device:'touch',scheme:'standard'});
  assert.equal(createControlScheme({win:fakeWindow(PHONE),storage}).scheme,'standard','The phone remembers its own choice');
  assert.equal(createControlScheme({win:fakeWindow(DESKTOP),storage}).scheme,'standard','A desktop ignores a phone choice and uses its default');
  const desk=createControlScheme({win:fakeWindow(DESKTOP),storage});desk.choose('touch');
  assert.equal(createControlScheme({win:fakeWindow(PHONE),storage:memoryStorage({[CONTROL_STORAGE_KEY]:storage.data[CONTROL_STORAGE_KEY]})}).scheme,'touch');
  assert.equal(createControlScheme({win:fakeWindow(DESKTOP),storage}).scheme,'touch','A desktop remembers choosing touch');
  assert.equal(createControlScheme({win:fakeWindow(DESKTOP),storage:memoryStorage({[CONTROL_STORAGE_KEY]:'{broken'})}).scheme,'standard','A corrupt saved choice falls back to detection');
  assert.equal(phone.choose('joystick'),'standard','Unknown schemes are ignored');
}

// ---- Device changes while the game is open ----------------------------------
{
  const win=fakeWindow(PHONE),changes=[];
  const tablet=createControlScheme({win,storage:memoryStorage(),onChange:(s,info)=>changes.push([s,info.reason])});
  win.setPointer(DESKTOP);
  assert.equal(tablet.scheme,'standard','Attaching a trackpad to a tablet switches to mouse controls');
  win.setPointer(PHONE);
  assert.equal(tablet.scheme,'touch','Detaching it switches back');
  assert.deepEqual(changes,[['standard','device'],['touch','device']]);
}

// ---- Controllers --------------------------------------------------------------
{
  // Until gamepad play exists, a controller is tracked but changes nothing.
  const win=fakeWindow(DESKTOP),changes=[];
  const waiting=createControlScheme({win,storage:memoryStorage(),onChange:s=>changes.push(s)});
  win.pads.push({connected:true});win.fire('gamepadconnected');
  assert.equal(waiting.controller,true);assert.equal(waiting.scheme,'standard','Controllers wait for gamepad support');assert.deepEqual(changes,[]);
}
for(const device of [DESKTOP,PHONE]){
  const win=fakeWindow(device),storage=memoryStorage(),changes=[];
  const scheme=createControlScheme({win,storage,controllerSupported:true,onChange:s=>changes.push(s)});
  const natural=scheme.scheme;
  // Browsers reveal a pad only after a button press, so it arrives as an event.
  win.pads.push({connected:true});win.fire('gamepadconnected');
  assert.equal(scheme.scheme,'controller','A connected controller takes over');
  scheme.choose(natural);assert.equal(scheme.scheme,natural,'The player can switch away from a connected controller');
  win.fire('gamepadconnected');assert.equal(scheme.scheme,'controller','Connecting a controller again takes over again');
  win.pads.length=0;win.fire('gamepaddisconnected');
  assert.equal(scheme.scheme,natural,'Unplugging the controller restores the device default');
  // A pad already known at load (a button pressed before reload) starts in controller mode.
  const preloaded=fakeWindow(device);preloaded.pads.push({connected:true});
  assert.equal(createControlScheme({win:preloaded,storage:memoryStorage(),controllerSupported:true}).scheme,'controller','A known controller is the default at load');
  const throwing=fakeWindow(device);throwing.navigator.getGamepads=()=>{throw new Error('blocked by permissions policy');};
  assert.equal(createControlScheme({win:throwing,storage:memoryStorage(),controllerSupported:true}).scheme,natural,'A blocked gamepad API falls back to the device');
}
{
  const win=fakeWindow(DESKTOP),scheme=createControlScheme({win,storage:memoryStorage(),controllerSupported:true});
  scheme.dispose();win.pads.push({connected:true});win.fire('gamepadconnected');
  assert.equal(scheme.scheme,'standard','Disposed schemes stop listening');
}
console.log('PASS: control schemes — phones load touch, computers load mouse/keyboard (touchscreen laptops and stylus phones included), platform-hint fallbacks, retired global switch cleared, per-device remembered choices, live trackpad attach/detach, and controller takeover/hand-back ready for gamepad support.');
