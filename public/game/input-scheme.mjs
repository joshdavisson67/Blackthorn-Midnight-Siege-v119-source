// Chooses the control scheme when the game loads, and again when the device
// changes: a phone or tablet starts on touch controls, a computer on mouse and
// keyboard, and a game controller takes over as soon as one is connected.
// A scheme the player picks in the pause menu is remembered for this kind of
// device only, so a choice made on one device never sticks on another.
export const CONTROL_STORAGE_KEY='blackthorn-control-scheme';
// v121–v126 stored one global touch on/off switch; it is retired on load.
export const LEGACY_TOUCH_KEY='blackthorn-touch-controls';
export const SCHEMES=Object.freeze(['standard','touch','controller']);

function query(win,q){try{return !!win.matchMedia?.(q).matches;}catch{return false;}}

// 'touch' for phones and tablets, 'desktop' for anything with a mouse or
// trackpad as its main pointer (including touchscreen laptops).
export function detectDevice(win=globalThis){
  const nav=win.navigator||{};
  // The primary pointer decides. Phones with a stylus or a paired accessory
  // still report a coarse primary pointer that cannot hover.
  if(query(win,'(pointer: coarse)')&&query(win,'(hover: none)'))return 'touch';
  if(query(win,'(pointer: fine)'))return 'desktop';
  // Browsers without pointer media queries: fall back to platform hints.
  if(nav.userAgentData?.mobile===true)return 'touch';
  const points=nav.maxTouchPoints||0,ua=nav.userAgent||'';
  if(points>0&&/Android|iPhone|iPad|iPod|Mobile/i.test(ua))return 'touch';
  if(points>1&&/Macintosh/.test(ua))return 'touch'; // iPadOS reports a desktop Mac
  if(query(win,'(pointer: coarse)'))return 'touch';
  return 'desktop';
}

// Phones (v142): a touch device whose screen's short side is at most
// PHONE_MAX CSS px. Tablets have touch too but room for the full-size HUD.
export const PHONE_MAX=540;
export function detectPhone(win=globalThis,device=detectDevice(win)){
  if(device!=='touch')return false;
  const s=win.screen||{},w=s.width||win.innerWidth||0,h=s.height||win.innerHeight||0;
  const short=Math.min(w||h,h||w);
  return short>0&&short<=PHONE_MAX;
}

// Browsers only reveal a gamepad after one of its buttons is pressed while the
// page is open, so a controller is usually found by the connect event rather
// than at load.
export function connectedController(win=globalThis){
  try{return Array.from(win.navigator?.getGamepads?.()||[]).some(pad=>pad&&pad.connected!==false);}catch{return false;}
}

export function defaultScheme({device,controller=false,controllerSupported=false}){
  if(controller&&controllerSupported)return 'controller';
  return device==='touch'?'touch':'standard';
}

export function createControlScheme({win=globalThis,storage,controllerSupported=false,onChange=()=>{}}={}){
  if(storage===undefined){try{storage=win.localStorage;}catch{storage=null;}}
  let device=detectDevice(win),phone=detectPhone(win,device),controller=connectedController(win),choice=null,scheme=null,dismissed=false;
  try{storage?.removeItem(LEGACY_TOUCH_KEY);}catch{}
  function readChoice(){
    try{
      const saved=JSON.parse(storage?.getItem(CONTROL_STORAGE_KEY)||'null');
      return saved&&saved.device===device&&SCHEMES.includes(saved.scheme)?saved.scheme:null;
    }catch{return null;}
  }
  function resolve(){
    // A live controller wins unless the player switched away from it since it
    // connected; otherwise the player's choice for this device, otherwise the
    // device's natural scheme.
    if(controller&&controllerSupported&&!dismissed)return 'controller';
    if(choice&&choice!=='controller')return choice;
    return defaultScheme({device});
  }
  function update(reason){
    const next=resolve();if(next===scheme)return;
    const previous=scheme;scheme=next;if(previous!==null)onChange(scheme,{reason,device,controller});
  }
  function refresh(reason='device'){
    const nextDevice=detectDevice(win);
    if(nextDevice!==device){device=nextDevice;choice=readChoice();}
    phone=detectPhone(win,device);
    controller=connectedController(win);update(reason);
  }
  // The last device actually used takes over without being saved: pressing a
  // controller button hands play to the controller, and a key, click or tap
  // hands it back to the device's own scheme.
  function noteInput(kind){
    if(kind==='controller'){
      if(!controllerSupported)return scheme;
      controller=true;dismissed=false;
    }else if(scheme==='controller')dismissed=true;
    else return scheme;
    update('input');return scheme;
  }
  function choose(next){
    if(!SCHEMES.includes(next))return scheme;
    choice=next;dismissed=controller&&next!=='controller';
    try{storage?.setItem(CONTROL_STORAGE_KEY,JSON.stringify({device,scheme:next}));}catch{}
    update('choice');return scheme;
  }
  choice=readChoice();update('load');
  const listeners=[];
  const listen=(target,type,fn)=>{try{target?.addEventListener?.(type,fn);listeners.push(()=>target.removeEventListener?.(type,fn));}catch{}};
  listen(win,'gamepadconnected',()=>{controller=true;dismissed=false;update('controller');});
  listen(win,'gamepaddisconnected',()=>{controller=connectedController(win);update('controller');});
  // A tablet gaining or losing a trackpad changes its primary pointer.
  for(const q of ['(pointer: coarse)','(pointer: fine)','(hover: none)']){
    let list=null;try{list=win.matchMedia?.(q);}catch{}
    listen(list,'change',()=>refresh('device'));
  }
  return {
    get scheme(){return scheme;},get device(){return device;},get phone(){return phone;},get controller(){return controller;},get choice(){return choice;},
    choose,refresh,noteInput,
    dispose(){for(const off of listeners.splice(0))off();}
  };
}
