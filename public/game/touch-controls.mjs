// Phone shooter controls: a floating left thumbstick moves, dragging anywhere
// on the right half looks, and on-screen buttons cover every keyboard action.
// The fire button also steers while held, so a thumb can shoot and track a
// target in one motion. Touch play does not need mouse capture.
export const TOUCH_STORAGE_KEY='blackthorn-touch-controls';
export const TOUCH=Object.freeze({
  stickRadius:56,     // CSS px of thumb travel for full speed
  deadZone:.12,       // fraction of the radius ignored around the centre
  sprintPush:1.35,    // drag this far past the rim, mostly forward, to sprint
  sprintForward:.6,
  lookSpeed:.0055     // radians per CSS px at sensitivity 1
});

// Phones and tablets without a mouse or trackpad.
export function touchPreferred(win=globalThis){
  try{return !!win.matchMedia?.('(pointer: coarse)').matches&&!win.matchMedia('(any-pointer: fine)').matches;}catch{return false;}
}

const BUTTONS=[
  ['fire','FIRE','touchFire'],['aim','AIM','touchAim'],['jump','JUMP','touchJump'],
  ['reload','RELOAD','touchReload'],['grenade','NADE','touchGrenade'],['use','USE','touchUse'],
  ['swap','SWAP','touchSwap'],['light','LIGHT','touchLight'],['map','MAP','touchMap'],['pause','II','touchPause']
];

export function createTouchControls({document,toggle,storage=globalThis.localStorage,preferred=false,actions,onChange=()=>{}}){
  const body=document.body;
  const root=document.createElement('div');root.id='touchControls';root.setAttribute('aria-hidden','true');
  const moveZone=document.createElement('div');moveZone.className='touchZone touchMoveZone';
  const lookZone=document.createElement('div');lookZone.className='touchZone touchLookZone';
  const stick=document.createElement('div');stick.className='touchStick';
  const knob=document.createElement('i');stick.append(knob);moveZone.append(stick);
  root.append(lookZone,moveZone);
  const buttons={};
  for(const [name,label,id] of BUTTONS){
    const b=document.createElement('button');b.type='button';b.id=id;b.className='touchButton';b.dataset.action=name;b.tabIndex=-1;
    b.innerHTML=`<span>${label}</span>`;root.append(b);buttons[name]=b;
  }
  const hint=document.createElement('div');hint.id='touchRotate';hint.innerHTML='<b>TURN YOUR PHONE SIDEWAYS</b><span>Blackthorn plays in landscape.</span>';
  body.append(root,hint);

  let enabled=preferred,active=false,movePointer=null,lookPointer=null,firePointer=null,originX=0,originY=0,lastX=0,lastY=0;
  try{const saved=storage?.getItem(TOUCH_STORAGE_KEY);if(saved==='on')enabled=true;else if(saved==='off')enabled=false;}catch{}
  const move={x:0,z:0};let sprint=false;
  const shown={};

  function setStick(dx,dy){
    const r=TOUCH.stickRadius,dist=Math.hypot(dx,dy),clamped=Math.min(dist,r);
    const nx=dist?dx/dist:0,ny=dist?dy/dist:0,amount=clamped/r;
    const live=amount<=TOUCH.deadZone?0:(amount-TOUCH.deadZone)/(1-TOUCH.deadZone);
    move.x=nx*live;move.z=ny*live;
    sprint=dist>r*TOUCH.sprintPush&&-ny>TOUCH.sprintForward;
    knob.style.transform=`translate(${nx*clamped}px,${ny*clamped}px)`;
    stick.classList.toggle('sprinting',sprint);
  }
  function releaseStick(){
    movePointer=null;move.x=move.z=0;sprint=false;
    knob.style.transform='';stick.classList.remove('engaged','sprinting');stick.style.left=stick.style.top='';
  }
  function releaseFire(){if(firePointer===null)return;firePointer=null;buttons.fire.classList.remove('held');actions.fireEnd();}
  function reset(){
    releaseStick();if(lookPointer===firePointer)lookPointer=null;
    releaseFire();lookPointer=null;
    for(const b of Object.values(buttons))b.classList.remove('pressed');
  }
  const point=e=>({x:e.clientX,y:e.clientY});
  function capture(el,e){try{el.setPointerCapture(e.pointerId);}catch{}}
  // Cancel the browser's emulated mouse events, scrolling and zoom.
  function swallow(e){e.preventDefault?.();e.stopPropagation?.();}

  moveZone.addEventListener('pointerdown',e=>{
    swallow(e);if(!active||movePointer!==null)return;
    movePointer=e.pointerId;capture(moveZone,e);
    const rect=moveZone.getBoundingClientRect(),{x,y}=point(e);
    originX=x;originY=y;stick.style.left=`${x-rect.left}px`;stick.style.top=`${y-rect.top}px`;
    stick.classList.add('engaged');setStick(0,0);
  });
  lookZone.addEventListener('pointerdown',e=>{
    swallow(e);if(!active||lookPointer!==null)return;
    lookPointer=e.pointerId;capture(lookZone,e);({x:lastX,y:lastY}=point(e));
  });
  function pointerMove(e){
    if(!active)return;
    if(e.pointerId===movePointer){swallow(e);const {x,y}=point(e);setStick(x-originX,y-originY);}
    else if(e.pointerId===lookPointer){swallow(e);const {x,y}=point(e);actions.look(x-lastX,y-lastY);lastX=x;lastY=y;}
  }
  function pointerEnd(e){
    if(e.pointerId===movePointer)releaseStick();
    if(e.pointerId===lookPointer)lookPointer=null;
    if(e.pointerId===firePointer)releaseFire();
    for(const b of Object.values(buttons))if(b.dataset.pointer===String(e.pointerId)){b.classList.remove('pressed');delete b.dataset.pointer;}
  }
  for(const el of [root,moveZone,lookZone,...Object.values(buttons)]){
    el.addEventListener('pointermove',pointerMove);
    el.addEventListener('pointerup',pointerEnd);el.addEventListener('pointercancel',pointerEnd);
    el.addEventListener('lostpointercapture',pointerEnd);
  }
  for(const [name,b] of Object.entries(buttons)){
    b.addEventListener('pointerdown',e=>{
      swallow(e);if(!active)return;
      capture(b,e);b.classList.add('pressed');b.dataset.pointer=String(e.pointerId);
      if(name==='fire'){
        if(firePointer!==null)return;firePointer=e.pointerId;b.classList.add('held');
        // The firing thumb also aims, unless the other thumb is already looking.
        if(lookPointer===null){lookPointer=e.pointerId;({x:lastX,y:lastY}=point(e));}
        actions.fireStart();return;
      }
      ({aim:actions.aimToggle,jump:actions.jump,reload:actions.reload,grenade:actions.grenade,use:actions.interact,
        swap:actions.nextWeapon,light:actions.flashlight,map:actions.map,pause:actions.pause})[name]?.();
    });
    b.addEventListener('contextmenu',e=>e.preventDefault());
  }
  root.addEventListener('contextmenu',e=>e.preventDefault());

  function apply(){
    body.classList.toggle('touch-controls',enabled);
    toggle?.setAttribute('aria-checked',String(enabled));
    const label=toggle?.querySelector('[data-touch-setting]');if(label)label.textContent=enabled?'ON':'OFF';
  }
  function setEnabled(value,{save=true}={}){
    value=!!value;if(value===enabled&&save)return;enabled=value;
    if(!enabled)setActive(false);
    apply();
    if(save)try{storage?.setItem(TOUCH_STORAGE_KEY,enabled?'on':'off');}catch{}
    onChange(enabled);
  }
  function setActive(value){
    value=enabled&&!!value;if(value===active)return;active=value;
    body.classList.toggle('touch-playing',active);if(!active)reset();
  }
  // Per-frame HUD state; classes only change when the state does.
  function update(state){
    setActive(state.playing);if(!active)return;
    for(const [key,cls,el] of [['aiming','on',buttons.aim],['canInteract','available',buttons.use],['flashlight','on',buttons.light],['canSwap','available',buttons.swap]]){
      const v=!!state[key];if(shown[key]!==v){shown[key]=v;el.classList.toggle(cls,v);}
    }
  }
  if(toggle)toggle.onclick=()=>setEnabled(!enabled);
  apply();
  return {
    get enabled(){return enabled;},get active(){return active;},get sprint(){return active&&sprint;},
    move,setEnabled,setActive,update,reset,root,buttons,
    // Test hooks for the stick geometry.
    _setStick:setStick
  };
}
