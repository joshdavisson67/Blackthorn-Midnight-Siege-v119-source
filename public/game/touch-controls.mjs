// Phone shooter controls: a floating left thumbstick moves, dragging anywhere
// on the right half looks, and on-screen buttons cover every keyboard action.
// The fire button also steers while held, so a thumb can shoot and track a
// target in one motion. Double-tapping the right half fires too (v141): the
// second tap holds the trigger and keeps steering until it lifts. Touch play does not need mouse capture. Which scheme
// is on (and remembering the player's choice) belongs to input-scheme.mjs.
export const TOUCH=Object.freeze({
  stickRadius:56,     // CSS px of thumb travel for full speed
  deadZone:.12,       // fraction of the radius ignored around the centre
  sprintPush:1.35,    // drag this far past the rim, mostly forward, to sprint
  sprintForward:.6,
  lookSpeed:.0055,    // radians per CSS px at sensitivity 1
  doubleTap:300,      // ms from the first tap lifting to the second landing
  tapTime:250,        // ms: a longer touch is a look, not a tap
  tapSlop:14,         // CSS px a tap may wander before it counts as a look drag
  tapReach:90         // CSS px between the two taps of a double tap
});

const BUTTONS=[
  ['fire','FIRE','touchFire'],['aim','AIM','touchAim'],['jump','JUMP','touchJump'],
  ['reload','RELOAD','touchReload'],['grenade','NADE','touchGrenade'],['use','USE','touchUse'],
  ['swap','SWAP','touchSwap'],['light','LIGHT','touchLight'],['map','MAP','touchMap'],['pause','II','touchPause']
];

export function createTouchControls({document,toggle,enabled:initial=false,actions,onToggle=null,onChange=()=>{},now=()=>globalThis.performance?.now?.()??Date.now()}){
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

  let enabled=!!initial,active=false,movePointer=null,lookPointer=null,firePointer=null,originX=0,originY=0,lastX=0,lastY=0;
  const move={x:0,z:0};let sprint=false;
  // Double-tap fire: where and when the current look touch began, how far it
  // has wandered, and the last quick tap that could open a double tap.
  let lookStart=null,lastTap=null,clock=now;
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
  function startFire(e){
    firePointer=e.pointerId;buttons.fire.classList.add('held');
    // The firing thumb also aims, unless the other thumb is already looking.
    if(lookPointer===null){lookPointer=e.pointerId;({x:lastX,y:lastY}=point(e));}
    actions.fireStart();
  }
  function reset(){
    releaseStick();if(lookPointer===firePointer)lookPointer=null;
    releaseFire();lookPointer=null;lookStart=lastTap=null;
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
    const t=clock(),{x,y}=point(e),tap=lastTap;lastTap=null;capture(lookZone,e);
    // Second tap of a double tap: pull the trigger and keep steering while held.
    if(tap&&firePointer===null&&t-tap.t<=TOUCH.doubleTap&&Math.hypot(x-tap.x,y-tap.y)<=TOUCH.tapReach){lookStart=null;startFire(e);return;}
    lookPointer=e.pointerId;lastX=x;lastY=y;lookStart={x,y,t,far:false};
  });
  function pointerMove(e){
    if(!active)return;
    if(e.pointerId===movePointer){swallow(e);const {x,y}=point(e);setStick(x-originX,y-originY);}
    else if(e.pointerId===lookPointer){
      swallow(e);const {x,y}=point(e);actions.look(x-lastX,y-lastY);lastX=x;lastY=y;
      if(lookStart&&Math.hypot(x-lookStart.x,y-lookStart.y)>TOUCH.tapSlop)lookStart.far=true;
    }
  }
  function pointerEnd(e){
    if(e.pointerId===movePointer)releaseStick();
    if(e.pointerId===lookPointer){
      // A short, still touch is a tap that can open a double tap; drags are not.
      const fired=e.pointerId===firePointer,start=lookStart;
      lastTap=!fired&&start&&!start.far&&clock()-start.t<=TOUCH.tapTime?{x:start.x,y:start.y,t:clock()}:null;
      lookPointer=null;lookStart=null;
    }
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
        if(firePointer!==null)return;startFire(e);return;
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
  function setEnabled(value){
    value=!!value;if(value===enabled)return;enabled=value;
    if(!enabled)setActive(false);
    apply();onChange(enabled);
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
  // The pause-menu switch asks the scheme owner, which calls setEnabled back.
  if(toggle)toggle.onclick=()=>onToggle?onToggle(!enabled):setEnabled(!enabled);
  apply();
  return {
    get enabled(){return enabled;},get active(){return active;},get sprint(){return active&&sprint;},
    move,setEnabled,setActive,update,reset,root,buttons,
    // Test hooks for the stick geometry and the double-tap clock.
    _setStick:setStick,_setClock(fn){clock=fn||now;}
  };
}
