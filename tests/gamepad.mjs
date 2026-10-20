import assert from 'node:assert/strict';
import {PAD,BUTTON,deadZone,lookResponse} from '../public/game/gamepad-controls.mjs';

// A standard-mapping pad the test can push around.
function fakePad(){
  const effects=[];
  const pad={index:0,connected:true,mapping:'standard',id:'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)',
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),
    vibrationActuator:{playEffect(type,options){effects.push({type,...options});return Promise.resolve('complete');}},effects};
  pad.set=(name,on=true)=>{const b=pad.buttons[BUTTON[name]];b.pressed=!!on;b.value=on?1:0;};
  pad.clear=()=>{pad.axes.fill(0);for(const b of pad.buttons){b.pressed=false;b.value=0;}};
  return pad;
}

export function verifyGamepad(qa,frames,listeners,elements,windowEvents){
  // ---- Pure stick shaping ------------------------------------------------------
  assert.deepEqual(deadZone(.1,.1,PAD.moveDeadZone),{x:0,y:0,m:0},'Stick drift inside the dead zone is ignored');
  const edge=deadZone(PAD.moveDeadZone+.01,0,PAD.moveDeadZone);assert(edge.m>0&&edge.m<.02,'Response starts at zero just outside the dead zone');
  assert.equal(deadZone(1,1,PAD.moveDeadZone).m,1,'Diagonals clamp to full speed');
  assert(lookResponse(.5)<.35&&lookResponse(1)===1,'Look response is fine near the centre and full at the rim');

  const pad=fakePad(),pads=[];
  globalThis.window.navigator={getGamepads:()=>pads};
  const scheme=()=>qa.get().controlScheme,state=()=>qa.get();
  const tap=(name,n=2)=>{pad.set(name);frames(1);pad.set(name,false);frames(n);};

  qa.start();qa.holdSpawns();frames(2);
  assert.equal(state().mode,'playing');assert.equal(scheme().scheme,'standard');
  assert.equal(elements.get('controllerStatus').textContent,'No controller detected. Connect one and press any button to play with it.');

  // ---- A controller takes over on its first button press -----------------------
  pads.push(pad);windowEvents.gamepadconnected?.({gamepad:pad});frames(1);
  assert.equal(scheme().scheme,'controller','Connecting a controller hands play to it');
  pad.clear();frames(1);
  assert.equal(state().mode,'playing','Controller play needs no mouse lock and is not paused');
  assert.match(elements.get('controllerStatus').textContent,/^Xbox Wireless Controller · in use/,'The pause menu names the controller without its vendor codes');
  tap('start');assert.equal(state().mode,'paused','Menu pauses and releases the mouse');assert.equal(state().pointer,false);
  tap('start');assert.equal(state().mode,'playing','Menu resumes without asking for mouse lock');
  frames(5);assert.equal(state().mode,'playing','Controller play is not paused for a missing mouse lock');
  // A real key hands play back to the keyboard, which then needs mouse lock.
  windowEvents.keydown({isTrusted:true,code:'KeyW'});assert.equal(scheme().scheme,'standard','A real key press hands play back to the keyboard');
  frames(1);assert.equal(state().mode,'paused','Keyboard play without mouse lock pauses, ready to relock');
  assert.match(elements.get('resume').textContent,/LOCK MOUSE/);
  windowEvents.keydown({isTrusted:false,code:'KeyW'});
  // Any controller button takes over again, and that press also does its job.
  pad.set('b');frames(1);assert.equal(scheme().scheme,'controller','A controller button takes over again');
  assert.equal(state().mode,'playing','B on the pause screen resumes in the same press');pad.set('b',false);frames(1);

  // ---- Movement, sprint and look -------------------------------------------------
  const speed=(set,seconds=1)=>{qa.setPlayer(0,20);qa.setAim(0,0);set();frames(60*seconds);const p=state().player,d=Math.hypot(p.x,p.z-20);pad.clear();qa.setKeys([]);frames(2);return d/seconds;};
  const walk=speed(()=>{pad.axes[1]=-1;});
  assert(Math.abs(walk-3.6)<.15,`Full stick walks at keyboard speed (${walk.toFixed(2)} m/s)`);
  const slow=speed(()=>{pad.axes[1]=-.5;});assert(slow>1.2&&slow<2.4,`Half stick is a slower walk (${slow.toFixed(2)} m/s)`);
  assert.equal(speed(()=>{pad.axes[1]=-.1;}),0,'Stick drift does not move the player');
  const sprint=speed(()=>{pad.axes[1]=-1;frames(1);pad.set('l3');frames(1);pad.set('l3',false);});
  assert(sprint>5.2&&sprint<6,`Clicking the left stick sprints (${sprint.toFixed(2)} m/s)`);
  assert.equal(state().gamepad.sprint,false,'Letting go of the stick ends the sprint');
  const sens=Number(elements.get('sensitivity').value);
  qa.setAim(0,0);pad.axes[2]=1;frames(12);
  const early=-state().lookYaw;assert(Math.abs(early-PAD.turnRate*sens*.2)<.08,`Right stick turns right at the set rate (${early.toFixed(2)} rad in .2 s)`);
  frames(30);const later=-state().lookYaw-early;assert(later>PAD.turnRate*sens*.5*1.1,'Holding the stick at the rim speeds the turn up');
  pad.clear();qa.setAim(0,0);pad.axes[3]=-1;frames(20);assert(state().lookPitch>.3,'Pushing the right stick up looks up');
  pad.clear();frames(1);qa.setAim(0,0);
  pad.axes[2]=.5;frames(30);const free=-state().lookYaw;pad.clear();frames(1);qa.setAim(0,0);
  pad.axes[2]=.5;pad.set('lt');frames(30);const aimed=-state().lookYaw;pad.clear();frames(10);
  assert(aimed<free*.75,`Aiming slows the look speed (${aimed.toFixed(2)} vs ${free.toFixed(2)})`);

  // ---- Triggers, buttons and vibration --------------------------------------------
  qa.selectWeapon('glock');frames(30);const ammo=state().inventory.glock.ammo,shakes=pad.effects.length;
  pad.buttons[BUTTON.rt].value=.9;frames(1);
  assert(state().mouseDown,'RT holds the trigger');assert.equal(state().inventory.glock.ammo,ammo-1,'RT fires immediately');
  assert(pad.effects.length>shakes&&pad.effects.at(-1).type==='dual-rumble','Firing vibrates the controller');
  pad.buttons[BUTTON.rt].value=.25;frames(1);assert(state().mouseDown,'The trigger has release hysteresis');
  pad.buttons[BUTTON.rt].value=0;frames(1);assert.equal(state().mouseDown,false);
  pad.set('lt');frames(1);assert(state().aiming,'LT aims');pad.set('lt',false);frames(1);assert.equal(state().aiming,false,'Releasing LT lowers the sights');
  frames(30);tap('a');assert(state().jumpV>0,'A jumps');frames(90);
  state().inventory.glock.ammo=5;tap('x');assert(state().reloadLeft>0,'X reloads');frames(200);
  const lit=state().flashlightOn;tap('lb');assert.equal(state().flashlightOn,!lit,'LB toggles the flashlight');tap('up');assert.equal(state().flashlightOn,lit,'D-pad up toggles it too');
  state().inventory.shotgun.owned=state().inventory.smg.owned=true;frames(1);
  tap('y');assert.equal(state().weapon,'shotgun','Y cycles to the next weapon');tap('right');assert.equal(state().weapon,'smg','D-pad right cycles forward');
  tap('left');assert.equal(state().weapon,'shotgun','D-pad left cycles back');tap('left');assert.equal(state().weapon,'glock');
  state().inventory.shotgun.owned=state().inventory.smg.owned=false;
  qa.setGrenades(3);qa.setPlayer(0,20);frames(1);tap('rb');frames(1);assert(state().grenades<3||state().grenadeThrow.active,'RB throws a grenade');frames(240);
  const perk=state().interactables.find(s=>s.type==='perk'&&s.id==='iron'&&s.y===0);
  qa.setPoints(20000);qa.setPlayer(perk.x+Math.sin(perk.rotation||0)*1.6,perk.z+Math.cos(perk.rotation||0)*1.6);frames(2);
  assert(elements.get('interaction').innerHTML.startsWith('<strong>B</strong>'),'Prompts show the B button');
  tap('b');assert(state().perkOwned.has('iron'),'B buys like E');
  qa.setPlayer(0,20);frames(2);
  const hurt=pad.effects.length;qa.hurtPlayer(20,null);assert(pad.effects.length>hurt&&pad.effects.at(-1).strongMagnitude>.6,'Taking damage rumbles hard');
  qa.setHealth(100);

  // ---- Map, pause and menu navigation ---------------------------------------------
  tap('back');assert(!elements.get('estateMap').classList.contains('hidden'),'View opens the map');
  tap('b');assert(elements.get('estateMap').classList.contains('hidden'));assert.equal(state().mode,'playing','B closes the map back into play');
  tap('start');assert.equal(state().mode,'paused','Menu pauses');
  assert.equal(elements.get('resume').textContent,'RESUME →');assert.match(elements.get('pauseText').textContent,/Press Menu, or A on Resume/);
  tap('down');assert.equal(state().gamepad.focused,elements.get('resume'),'The first D-pad press selects Resume');
  assert(elements.get('resume').classList.contains('padFocus'),'The selection is visibly marked');
  tap('down');const below=state().gamepad.focused;assert.notEqual(below,elements.get('resume'),'D-pad down moves to the next button');
  tap('up');assert.equal(state().gamepad.focused,elements.get('resume'),'D-pad up moves back');
  // Holding a direction repeats after a pause.
  pad.set('down');frames(1);const first=state().gamepad.focused;frames(Math.round(PAD.repeatDelay*60)-4);assert.equal(state().gamepad.focused,first,'No repeat before the delay');
  frames(12);assert.notEqual(state().gamepad.focused,first,'Holding repeats');pad.set('down',false);frames(1);
  // Toggles respond to A, and the vibration toggle silences the pad.
  const rumble=elements.get('rumbleToggle');
  for(let i=0;i<40&&state().gamepad.focused!==rumble;i++)tap('down');
  assert.equal(state().gamepad.focused,rumble,'The vibration switch is reachable with the D-pad');
  tap('a');assert.equal(rumble.getAttribute('aria-checked'),'false','A flips the focused switch');
  for(let i=0;i<40&&state().gamepad.focused!==elements.get('resume');i++)tap('down');
  tap('a');assert.equal(state().mode,'playing','A on Resume resumes');
  const quiet=pad.effects.length;pad.buttons[BUTTON.rt].value=1;frames(1);pad.buttons[BUTTON.rt].value=0;frames(30);
  assert.equal(pad.effects.length,quiet,'Vibration off means no rumble');
  tap('start');for(let i=0;i<40&&state().gamepad.focused!==rumble;i++)tap('down');tap('a');assert.equal(rumble.getAttribute('aria-checked'),'true');
  tap('b');assert.equal(state().mode,'playing','B on the pause screen resumes');
  // The field guide opens from the pause menu and B closes it again.
  tap('start');elements.get('guidePause').click();assert(!elements.get('guide').classList.contains('hidden'));
  tap('b');assert(elements.get('guide').classList.contains('hidden'),'B closes the field guide');assert.equal(state().mode,'paused');
  tap('start');assert.equal(state().mode,'playing');

  // ---- Unplugging hands play back -------------------------------------------------
  pad.axes[1]=-1;frames(5);pads.length=0;windowEvents.gamepaddisconnected?.({gamepad:pad});frames(2);
  assert.equal(scheme().scheme,'standard','Unplugging restores mouse and keyboard');
  assert(state().gamepad.move.x===0&&state().gamepad.move.z===0,'A vanished pad stops moving the player');
  assert.equal(elements.get('controllerStatus').textContent,'No controller detected. Connect one and press any button to play with it.');
  frames(2);assert.equal(state().mode,'paused','Back on the mouse, play waits for mouse lock');
  globalThis.window.navigator=undefined;
  console.log('PASS: controller — drift-free dead zones and curved look, takeover on a button press and hand-back on a key or unplug, analog walk and L3 sprint, aim slowdown, RT/LT with hysteresis, A/B/X/Y/LB/RB/D-pad/View/Menu actions, B prompts and purchases, rumble with an off switch, D-pad menu focus with hold-to-repeat, A/B in the pause menu, map and field guide.');
}
