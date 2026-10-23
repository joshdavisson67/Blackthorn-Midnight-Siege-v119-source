import assert from 'node:assert/strict';
import {TOUCH} from '../public/game/touch-controls.mjs';

// Phone controls: the pause-menu switch, play without mouse capture, analog
// stick speed and sprint, look, every on-screen action, and switching back.
export function verifyTouchControls(qa,frames,listeners,elements,document,gameCanvas){
  const DomEvent=document.defaultView?.Event??document.createEvent?.('Event').constructor;
  const event=(type,extra)=>{const e=new DomEvent(type,{bubbles:true,cancelable:true});Object.assign(e,extra);return e;};
  const touch=()=>qa.get().touchControls,body=document.body,toggle=elements.get('touchToggle'),resume=elements.get('resume');
  const press=(name,type='pointerdown',extra={})=>touch().buttons[name].dispatchEvent(event(type,{pointerId:40,clientX:700,clientY:300,...extra}));
  const tap=name=>{press(name);press(name,'pointerup');};
  const scheme=()=>qa.get().controlScheme;
  assert.equal(scheme().device,'desktop');assert.equal(scheme().scheme,'standard','The test desktop is detected at load');

  qa.start();qa.holdSpawns();frames(2);
  listeners.keydown({code:'Escape'});assert.equal(qa.get().mode,'paused');
  assert.equal(touch().enabled,false,'Desktop default stays on mouse controls');
  assert.equal(toggle.getAttribute('aria-checked'),'false');assert.match(resume.textContent,/LOCK MOUSE/);
  toggle.onclick();
  assert.equal(scheme().scheme,'touch');assert.equal(scheme().choice,'touch','The pause-menu switch is the player choosing a scheme');
  assert(touch().enabled&&body.classList.contains('touch-controls'));assert.equal(toggle.getAttribute('aria-checked'),'true');
  assert.equal(resume.textContent,'RESUME →','The pause menu switches to touch wording immediately');
  assert.match(elements.get('pauseText').textContent,/Tap Resume/);

  resume.onclick();
  assert.equal(qa.get().mode,'playing','Touch play starts without requesting mouse lock');
  assert.equal(qa.get().pointer,false);frames(10);
  assert.equal(qa.get().mode,'playing','Touch play is not paused for a missing mouse lock');
  assert(touch().active&&body.classList.contains('touch-playing'));

  // Analog movement: full push matches W, half push is slower, sprint is faster.
  const speed=(set,seconds=1)=>{qa.setPlayer(0,20);qa.setAim(0,0);set();frames(60*seconds);const p=qa.get().player,d=Math.hypot(p.x,p.z-20);touch().reset();qa.setKeys([]);frames(2);return d/seconds;};
  const keyboard=speed(()=>qa.setKeys(['KeyW']));
  const full=speed(()=>touch()._setStick(0,-TOUCH.stickRadius));
  const half=speed(()=>touch()._setStick(0,-TOUCH.stickRadius/2));
  const sprint=speed(()=>{touch()._setStick(0,-TOUCH.stickRadius*1.5);assert(touch().sprint,'Pushing past the rim sprints');});
  const sideways=speed(()=>{touch()._setStick(TOUCH.stickRadius*1.5,0);assert(!touch().sprint,'Only forward pushes sprint');});
  const resting=speed(()=>touch()._setStick(3,-3));
  assert(Math.abs(full-keyboard)/keyboard<.04,`Full stick (${full.toFixed(2)} m/s) matches W (${keyboard.toFixed(2)} m/s)`);
  assert(half>keyboard*.3&&half<keyboard*.6,`Half stick is a walk (${half.toFixed(2)} m/s)`);
  assert(Math.abs(sprint/keyboard-5.6/3.6)<.06,`Sprint is 5.6/3.6 of walking (${(sprint/keyboard).toFixed(2)})`);
  assert(Math.abs(sideways-keyboard)/keyboard<.04,'Strafing at full push walks');
  assert.equal(resting,0,'The dead zone ignores a resting thumb');
  assert(qa.get().touchControls.move.x===0&&qa.get().touchControls.move.z===0,'Releasing the stick stops movement');

  // Look, fire and steer.
  qa.setPlayer(0,20);qa.setAim(0,0);
  const look=event('pointerdown',{pointerId:3,clientX:600,clientY:200});touch().root.querySelector('.touchLookZone').dispatchEvent(look);
  const drag=event('pointermove',{pointerId:3,clientX:650,clientY:180});touch().root.querySelector('.touchLookZone').dispatchEvent(drag);
  const expected=Number(elements.get('sensitivity').value)*TOUCH.lookSpeed;
  assert(Math.abs(qa.get().lookYaw+50*expected)<1e-9&&Math.abs(qa.get().lookPitch-20*expected)<1e-9,'Right-thumb drag turns and pitches');
  const lift=event('pointerup',{pointerId:3});touch().root.querySelector('.touchLookZone').dispatchEvent(lift);
  qa.selectWeapon('glock');const ammo=qa.get().inventory.glock.ammo;
  press('fire');assert(qa.get().mouseDown,'FIRE holds the trigger');assert.equal(qa.get().inventory.glock.ammo,ammo-1,'FIRE shoots immediately');
  const yaw=qa.get().lookYaw;press('fire','pointermove',{clientX:670});assert(qa.get().lookYaw>yaw,'Dragging the held FIRE button left turns left');
  press('fire','pointerup');assert.equal(qa.get().mouseDown,false);frames(30);
  // Double-tap the right half to fire (v141); the held second tap keeps steering.
  {
    const zone=touch().root.querySelector('.touchLookZone');let clock=1000;touch()._setClock(()=>clock);
    const down=(id,x,y=220)=>zone.dispatchEvent(event('pointerdown',{pointerId:id,clientX:x,clientY:y}));
    const moveTo=(id,x,y=220)=>zone.dispatchEvent(event('pointermove',{pointerId:id,clientX:x,clientY:y}));
    const up=id=>zone.dispatchEvent(event('pointerup',{pointerId:id}));
    const shots=()=>qa.get().inventory.glock.ammo;
    qa.get().inventory.glock.ammo=12;let before=shots();
    down(11,800);clock+=90;up(11);clock+=150;down(12,812);
    assert(qa.get().mouseDown,'A double tap on the right half pulls the trigger');assert.equal(shots(),before-1,'The double tap fires immediately');
    assert(touch().buttons.fire.classList.contains('held'),'FIRE lights up while a double tap holds the trigger');
    const yaw=qa.get().lookYaw;moveTo(12,840);assert(qa.get().lookYaw<yaw,'The held second tap still steers');
    up(12);assert.equal(qa.get().mouseDown,false,'Lifting the second tap releases the trigger');frames(30);
    // A third quick tap does not chain into another shot by itself.
    before=shots();clock+=120;down(13,840);assert.equal(qa.get().mouseDown,false,'A fired double tap does not arm the next tap');up(13);frames(30);
    // Look drags, slow second taps, far-apart taps and long presses never fire.
    const misses=[
      ['a drag then a tap',()=>{down(14,700);moveTo(14,760);clock+=80;up(14);clock+=100;down(15,760);}],
      ['a slow second tap',()=>{down(16,700);clock+=80;up(16);clock+=TOUCH.doubleTap+120;down(17,700);}],
      ['taps far apart',()=>{down(18,640);clock+=80;up(18);clock+=100;down(19,640+TOUCH.tapReach+60);}],
      ['a long first press',()=>{down(20,700);clock+=TOUCH.tapTime+200;up(20);clock+=100;down(21,700);}]
    ];
    for(const [name,act] of misses){clock+=1000;before=shots();act();assert.equal(qa.get().mouseDown,false,`${name} does not fire`);assert.equal(shots(),before,`${name} does not shoot`);for(const id of [15,17,19,21])up(id);frames(30);}
    touch()._setClock(null);
  }
  tap('aim');assert(qa.get().aiming,'AIM toggles sights on');frames(2);tap('aim');assert.equal(qa.get().aiming,false);
  tap('jump');assert(qa.get().jumpV>0,'JUMP leaves the ground');frames(90);
  qa.get().inventory.glock.ammo=5;tap('reload');assert(qa.get().reloadLeft>0,'RELOAD');frames(200);
  const lit=qa.get().flashlightOn;tap('light');assert.equal(qa.get().flashlightOn,!lit);tap('light');
  qa.get().inventory.shotgun.owned=true;frames(1);tap('swap');assert.equal(qa.get().weapon,'shotgun','SWAP cycles owned weapons');tap('swap');assert.equal(qa.get().weapon,'glock');qa.get().inventory.shotgun.owned=false;
  qa.setGrenades(3);qa.setPlayer(0,20);frames(1);tap('grenade');frames(1);assert(qa.get().grenades<3||qa.get().grenadeThrow.active,'NADE throws');frames(240);

  // Contextual USE appears at a station and buys like E.
  const perk=qa.get().interactables.find(s=>s.type==='perk'&&s.id==='iron'&&s.y===0);
  qa.setPoints(20000);qa.setPlayer(perk.x+Math.sin(perk.rotation||0)*1.6,perk.z+Math.cos(perk.rotation||0)*1.6);frames(2);
  assert(touch().buttons.use.classList.contains('available'),'USE appears beside a station');
  assert(elements.get('interaction').innerHTML.startsWith('<strong>USE</strong>'),'Prompts name the USE button');
  tap('use');assert(qa.get().perkOwned.has('iron'),'USE buys like E');
  qa.setPlayer(0,20);frames(2);assert(!touch().buttons.use.classList.contains('available'));

  // II pauses; the map closes back into touch play.
  tap('pause');assert.equal(qa.get().mode,'paused');assert(!touch().active&&!body.classList.contains('touch-playing'));
  resume.onclick();assert.equal(qa.get().mode,'playing');
  tap('map');assert.equal(qa.get().mode,'paused');qa.closeMap();assert.equal(qa.get().mode,'playing','Closing the map resumes touch play');

  // Emulated mouse clicks from taps never trigger the mouse-capture path.
  let locks=0;const lock=gameCanvas.requestPointerLock;gameCanvas.requestPointerLock=()=>{locks++;return lock();};
  gameCanvas.events.mousedown({button:0,preventDefault(){}});assert.equal(qa.get().mode,'playing');assert.equal(locks,0);gameCanvas.requestPointerLock=lock;

  // Switching back restores the mouse scheme.
  listeners.keydown({code:'Escape'});toggle.onclick();
  assert.equal(scheme().scheme,'standard');assert.equal(touch().enabled,false);assert(!body.classList.contains('touch-controls'));assert.match(resume.textContent,/LOCK MOUSE/);
  frames(2);console.log('PASS: touch controls — pause-menu switch, play without mouse lock, analog stick with dead zone and forward sprint, look/fire-and-steer, double-tap fire (held second tap steers; drags, slow, distant and long taps ignored), AIM/JUMP/RELOAD/LIGHT/SWAP/NADE/USE/MAP/II, USE prompts, and switching back to mouse.');
}
