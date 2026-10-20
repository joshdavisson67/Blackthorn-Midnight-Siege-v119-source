// Controller play. Polled once per frame through the browser Gamepad API using
// the "standard" layout (Xbox / PlayStation / Switch Pro in a modern browser).
//
//   Left stick  move              L3 (click)  sprint while pushing forward
//   Right stick look              LT / RT     aim / fire
//   A / Cross   jump              B / Circle  use / buy
//   X / Square  reload            Y / Tri.    next weapon
//   LB / L1     flashlight        RB / R1     grenade
//   D-pad       ← → weapons, ↑ flashlight     View / Share   estate map
//   Menu / Options  pause and resume
//
// Outside play the controller drives the menus: the D-pad or left stick moves
// focus between buttons, A presses, B goes back, the right stick scrolls, and
// left/right adjust sliders and choices.
export const PAD=Object.freeze({
  moveDeadZone:.16,
  lookDeadZone:.12,
  lookCurve:1.8,          // response exponent: fine aim near centre, fast at the rim
  turnRate:3.4,           // radians per second at full deflection, sensitivity 1
  pitchRatio:.72,         // vertical look relative to horizontal
  boostAfter:.22,         // seconds at the rim before turning speeds up
  boost:.6,               // extra turn speed reached over boostRamp seconds
  boostRamp:.35,
  aimSlowdown:.55,        // look speed while aiming down sights (before zoom)
  assistSlowdown:.6,      // look speed while the sights sit over an enemy
  triggerPress:.3,triggerRelease:.18,
  sprintRelease:.3,       // sprint stays latched until the stick drops below this
  repeatDelay:.38,repeatRate:.11,
  menuStick:.55,scrollSpeed:900,
  activity:.5             // stick travel or button press that counts as using the pad
});
export const BUTTON=Object.freeze({a:0,b:1,x:2,y:3,lb:4,rb:5,lt:6,rt:7,back:8,start:9,l3:10,r3:11,up:12,down:13,left:14,right:15,home:16});

// Radial dead zone, rescaled so the response starts at zero just outside it.
export function deadZone(x,y,zone){
  const m=Math.hypot(x,y);if(m<=zone)return {x:0,y:0,m:0};
  const scaled=Math.min(1,(m-zone)/(1-zone));return {x:x/m*scaled,y:y/m*scaled,m:scaled};
}
export function lookResponse(m){return Math.pow(Math.max(0,Math.min(1,m)),PAD.lookCurve);}

function readPad(pad){
  const b=i=>{const v=pad.buttons?.[i];return typeof v==='number'?v:(v?.value??(v?.pressed?1:0));};
  const pressed=i=>{const v=pad.buttons?.[i];return typeof v==='object'?!!v.pressed||(v.value??0)>.5:b(i)>.5;};
  const ax=i=>{const v=pad.axes?.[i];return Number.isFinite(v)?v:0;};
  const state={lx:ax(0),ly:ax(1),rx:ax(2),ry:ax(3),lt:b(BUTTON.lt),rt:b(BUTTON.rt),down:{}};
  for(const [name,i] of Object.entries(BUTTON))if(name!=='lt'&&name!=='rt')state.down[name]=pressed(i);
  return state;
}

export function createGamepadControls({win=globalThis,document=win.document,actions={},settings={}}={}){
  const move={x:0,z:0};
  let pad=null,padIndex=-1,previous={},fireHeld=false,aimHeld=false,sprint=false,rimTime=0,menuRepeat=0,menuDir=null,focused=null,connected=false,name='';
  // An action that throws must not stop the frame loop polling the pad.
  const call=(fn,...args)=>{try{return actions[fn]?.(...args);}catch(error){console.error(error);}};

  function pads(){try{return Array.from(win.navigator?.getGamepads?.()||[]).filter(p=>p&&p.connected!==false);}catch{return [];}}
  // Follow whichever connected pad was touched most recently.
  function pick(){
    const list=pads();if(!list.length)return null;
    let best=list.find(p=>p.index===padIndex)||list[0];
    for(const p of list){const s=readPad(p);if(Object.values(s.down).some(Boolean)||s.lt>.5||s.rt>.5||Math.hypot(s.lx,s.ly)>PAD.activity||Math.hypot(s.rx,s.ry)>PAD.activity)if(p.index!==best.index){best=p;break;}}
    return best;
  }
  function release(){
    if(fireHeld){fireHeld=false;call('fireEnd');}
    if(aimHeld){aimHeld=false;call('aim',false);}
    move.x=move.z=0;sprint=false;rimTime=0;
  }
  function reset(){release();previous={};menuDir=null;menuRepeat=0;}

  // ---- Menus -------------------------------------------------------------------
  const FOCUSABLE='button,select,input,a[href],[tabindex="0"]';
  function visible(el){
    if(!el||el.disabled||el.hidden)return false;
    if(el.closest?.('.hidden,[hidden]'))return false;
    const rects=el.getClientRects?.();return rects?rects.length>0:true;
  }
  function candidates(layer){return Array.from(layer.querySelectorAll(FOCUSABLE)).filter(visible);}
  function setFocus(el){
    if(focused&&focused!==el)focused.classList?.remove('padFocus');
    focused=el;if(!el)return;
    el.classList?.add('padFocus');
    try{el.focus({preventScroll:false});}catch{try{el.focus();}catch{}}
    try{el.scrollIntoView?.({block:'nearest',inline:'nearest'});}catch{}
  }
  function current(layer,list){
    const active=document?.activeElement;
    if(active&&list.includes(active))return active;
    if(focused&&list.includes(focused))return focused;
    return null;
  }
  function preferred(layer,list){return list.find(el=>el.matches?.('[data-pad-default]'))||list[0]||null;}
  const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
  function neighbour(from,list,dir){
    const r=from.getBoundingClientRect?.();
    const index=list.indexOf(from),order=dir==='down'||dir==='right'?1:-1;
    const flat=!r||(!r.width&&!r.height);
    if(!flat){
      const c=center(r);let best=null,score=Infinity;
      for(const el of list){
        if(el===from)continue;const er=el.getBoundingClientRect(),e=center(er);
        const dx=e.x-c.x,dy=e.y-c.y;
        const along=dir==='down'?dy:dir==='up'?-dy:dir==='right'?dx:-dx,across=dir==='down'||dir==='up'?Math.abs(dx):Math.abs(dy);
        if(along<=2)continue;const s=along+across*2.2;if(s<score){score=s;best=el;}
      }
      if(best)return best;
      // Nothing that way: walk the page order so every control stays reachable.
    }
    return list[(index+order+list.length)%list.length];
  }
  function adjust(el,step){
    if(el.tagName==='SELECT'){
      const n=el.options?.length||0;if(!n)return false;
      el.selectedIndex=(el.selectedIndex+step+n)%n;
    }else if(el.tagName==='INPUT'&&el.type==='range'){
      const min=Number(el.min||0),max=Number(el.max||100),inc=Number(el.step)||((max-min)/20);
      el.value=String(Math.min(max,Math.max(min,Number(el.value)+step*inc)));
    }else return false;
    for(const type of ['input','change']){try{el.dispatchEvent(new (win.Event||Event)(type,{bubbles:true}));}catch{}el[`on${type}`]?.({target:el});}
    return true;
  }
  function press(el){
    if(el.tagName==='SELECT'){adjust(el,1);return;}
    if(el.tagName==='INPUT'&&el.type==='range')return;
    if(el.tagName==='INPUT'&&el.type!=='checkbox'&&el.type!=='radio'){setFocus(el);return;}
    el.click?.();
  }
  function scroller(layer){
    for(const el of [layer,...layer.querySelectorAll('*')])if(el.scrollHeight>el.clientHeight+4){const o=win.getComputedStyle?.(el)?.overflowY;if(!o||o==='auto'||o==='scroll')return el;}
    return null;
  }
  function menuDirection(s,edge){
    for(const dir of ['up','down','left','right'])if(edge[dir])return {dir,fresh:true};
    for(const dir of ['up','down','left','right'])if(s.down[dir])return {dir,fresh:false};
    const {lx,ly}=s;
    if(Math.max(Math.abs(lx),Math.abs(ly))>PAD.menuStick)return {dir:Math.abs(ly)>Math.abs(lx)?(ly>0?'down':'up'):(lx>0?'right':'left'),fresh:false};
    return null;
  }
  function menu(s,edge,dt,layer){
    if(!layer){menuDir=null;return;}
    const list=candidates(layer);
    let at=current(layer,list);
    const step=menuDirection(s,edge);
    if(step){
      // First push moves at once; holding repeats after a pause.
      let firing=false;
      if(step.fresh||step.dir!==menuDir){firing=true;menuDir=step.dir;menuRepeat=PAD.repeatDelay;}
      else if((menuRepeat-=dt)<=0){firing=true;menuRepeat=PAD.repeatRate;}
      if(firing&&list.length){
        if(!at)setFocus(preferred(layer,list));
        else if((step.dir==='left'||step.dir==='right')&&adjust(at,step.dir==='right'?1:-1)){}
        else setFocus(neighbour(at,list,step.dir));
      }
    }else menuDir=null;
    if(edge.a){at=current(layer,list)||preferred(layer,list);if(at){setFocus(at);press(at);}}
    if(edge.b)call('back');
    const scroll=deadZone(s.rx,s.ry,PAD.lookDeadZone);
    if(scroll.y){const el=scroller(layer);if(el)el.scrollTop+=scroll.y*Math.abs(scroll.y)*PAD.scrollSpeed*dt;}
  }

  // ---- Play ----------------------------------------------------------------------
  function play(s,edge,dt,ctx){
    const m=deadZone(s.lx,s.ly,PAD.moveDeadZone);move.x=m.x;move.z=m.y;
    if(edge.l3&&m.m>.2&&-m.y>.35)sprint=!sprint;
    if(m.m<PAD.sprintRelease||-m.y<.2)sprint=false;
    const look=deadZone(s.rx,s.ry,PAD.lookDeadZone);
    if(look.m){
      const r=lookResponse(look.m);
      rimTime=look.m>.94?rimTime+dt:0;
      const boost=1+PAD.boost*Math.min(1,Math.max(0,rimTime-PAD.boostAfter)/PAD.boostRamp);
      const scale=(ctx.sensitivity??1)*PAD.turnRate*dt*boost*(ctx.aiming?PAD.aimSlowdown/(ctx.zoom||1):1)*(ctx.onTarget?PAD.assistSlowdown:1);
      call('look',look.x/look.m*r*scale,look.y/look.m*r*scale*PAD.pitchRatio);
    }else rimTime=0;
    const rt=fireHeld?s.rt>PAD.triggerRelease:s.rt>PAD.triggerPress;
    if(rt!==fireHeld){fireHeld=rt;call(rt?'fireStart':'fireEnd');}
    const lt=aimHeld?s.lt>PAD.triggerRelease:s.lt>PAD.triggerPress;
    if(lt!==aimHeld){aimHeld=lt;call('aim',lt);}
    if(edge.a)call('jump');if(edge.x)call('reload');if(edge.b)call('interact');
    if(edge.y||edge.right)call('nextWeapon');if(edge.left)call('previousWeapon');
    if(edge.lb||edge.up)call('flashlight');if(edge.rb)call('grenade');
    if(edge.back)call('map');
  }

  // ctx: {playing, enabled, sensitivity, aiming, zoom, onTarget, layer}
  function poll(dt,ctx={}){
    const next=pick();
    if(!next){if(connected){connected=false;name='';release();previous={};}return {connected:false,used:false};}
    if(!connected||next.index!==padIndex){connected=true;padIndex=next.index;name=String(next.id||'Controller');previous={};}
    pad=next;
    const s=readPad(pad),edge={};
    for(const [k,v] of Object.entries(s.down))edge[k]=v&&!previous[k];
    previous=s.down;
    const used=Object.values(edge).some(Boolean)||s.lt>PAD.activity||s.rt>PAD.activity||Math.hypot(s.lx,s.ly)>PAD.activity||Math.hypot(s.rx,s.ry)>PAD.activity;
    // The press that hands play to the controller also does its job.
    if(used&&!ctx.enabled&&call('used'))ctx={...ctx,enabled:true};
    if(!ctx.enabled){release();return {connected:true,used};}
    if(edge.start){call('start');release();return {connected:true,used};}
    if(ctx.playing)play(s,edge,dt,ctx);
    else{release();menu(s,edge,dt,ctx.layer||null);}
    return {connected:true,used};
  }
  // Short vibration through the standard dual-rumble effect, where supported.
  function rumble(strong,weak,ms){
    const actuator=pad?.vibrationActuator;if(!actuator?.playEffect)return false;
    try{actuator.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:Math.min(1,strong),weakMagnitude:Math.min(1,weak)})?.catch?.(()=>{});return true;}catch{return false;}
  }
  return {
    poll,reset,rumble,move,
    get sprint(){return sprint;},get connected(){return connected;},get name(){return name;},
    get firing(){return fireHeld;},get aiming(){return aimHeld;},get focused(){return focused;}
  };
}
