import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {UPPER_Y,UPPER_CEILING,UPPER_ROOMS,STAIR,hasUpperFloor,stairHeight,moveActor,updateActorHeight,supportBelow} from '../public/game/vertical.mjs';
import {isBlocked} from '../public/game/core.mjs';

export function verifyStairs(qa,frames,listeners,elements){
  qa.start();qa.setAim(0,0);qa.setPlayer(STAIR.x,-1.8);qa.setKeys(['KeyW']);let maxStep=0,previous=0;
  for(let i=0;i<150;i++){frames(1);maxStep=Math.max(maxStep,Math.abs(qa.get().player.y-previous));previous=qa.get().player.y;}
  qa.setKeys([]);let s=qa.get();assert.equal(s.player.y,UPPER_Y,'W must climb the real staircase onto the landing');assert(s.player.z<-9.5);assert(s.grounded);assert(maxStep<.10,'Stair walking must remain smooth');assert(Math.abs(s.camera.position.y-(UPPER_Y+1.68))<.03);
  listeners.keydown({code:'Space',preventDefault(){}});let peak=UPPER_Y;for(let i=0;i<100;i++){frames(1);peak=Math.max(peak,qa.get().player.y);}
  assert(peak>UPPER_Y+.6&&peak+1.8<=UPPER_CEILING+.001,'Jumping upstairs respects ceiling clearance');assert.equal(qa.get().player.y,UPPER_Y);assert(qa.get().grounded);
  qa.setKeys(['KeyS']);frames(150);qa.setKeys([]);assert.equal(qa.get().player.y,0,'S must descend all the way back to the ground floor');assert(qa.get().player.z>-2.1);
  console.log('PASS: actual W/S controls climb and descend smoothly, camera follows elevation, upstairs jumping lands and respects the ceiling.');

  qa.start();s=qa.get();s.nav.rebuild(STAIR.x,-10.5,UPPER_Y);assert(!s.nav.blocked[s.nav.top]&&!s.nav.blocked[s.nav.bottom],'Both stair portals must be walkable');
  let cells=0;for(let i=s.nav.w*s.nav.h;i<s.nav.blocked.length;i++)if(!s.nav.blocked[i]&&s.nav.distance[i]<99999)cells++;
  assert(cells>1100,'Second floor must offer substantial connected exploration space');
  for(const room of UPPER_ROOMS){
    assert(hasUpperFloor(room.x,room.z),room.name+' is supported by an actual floor');
    assert(!isBlocked(room.x,room.z,.32,s.colliders,undefined,UPPER_Y),room.name+' center has player clearance');
    assert(s.nav.direction(room.x,room.z,UPPER_Y)?.reachable,room.name+' connects to the stairs');
    const p=new T.Vector3(room.x,UPPER_Y,room.z);let iterations=0;
    while(p.distanceTo(new T.Vector3(STAIR.x,UPPER_Y,-10.5))>.8&&iterations++<3000){
      const next=s.nav.direction(p.x,p.z,p.y),delta=new T.Vector2(next.x-p.x,next.z-p.z).normalize().multiplyScalar(.055);
      moveActor(p,delta.x,delta.y,s.colliders,{allowFall:false,radius:.34});
    }
    assert(iterations<3000,room.name+' must have a physically walkable route to the landing');
  }
  console.log(`PASS: all ${UPPER_ROOMS.length} upstairs areas have physically walkable routes; ${cells} reachable upper-floor grid cells.`);

  // Lower furniture does not block the floor above; upper walls do not block below.
  const upperAmmo=s.interactables.find(st=>st.type==='ammo'&&st.y===UPPER_Y);
  assert(!isBlocked(upperAmmo.x,upperAmmo.z,.3,s.colliders,undefined,0));assert(isBlocked(upperAmmo.x,upperAmmo.z,.3,s.colliders,undefined,UPPER_Y));
  qa.setPlayer(0,10,UPPER_Y);qa.setKeys(['KeyW']);frames(45);qa.setKeys([]);assert(qa.get().player.z>9.35,'Gallery railing must protect the atrium edge');
  const balconyEdges=[
    {name:'Front gallery',x:0,z:10,key:'KeyW'},
    {name:'Upper landing',x:0,z:-10,key:'KeyS'},
    {name:'East balcony',x:4.3,z:2,key:'KeyA'},
    {name:'West balcony',x:-4.2,z:3.4,key:'KeyD'},
  ];
  const jumps=balconyEdges.flatMap(edge=>[false,true].map(sprint=>({...edge,sprint,fps:60})));
  for(const fps of [30,144])for(const sprint of [false,true])jumps.push({...balconyEdges[0],sprint,fps});
  for(const edge of jumps){
    qa.start();qa.holdSpawns();qa.setAim(0,0);qa.setPlayer(edge.x,edge.z,UPPER_Y);qa.setKeys([edge.key,...(edge.sprint?['ShiftLeft']:[])]);
    frames(Math.ceil(edge.fps*.4),1000/edge.fps);assert.equal(qa.get().player.y,UPPER_Y,`${edge.name} still blocks walking off the balcony`);assert(qa.get().grounded);
    listeners.keydown({code:'Space',preventDefault(){}});frames(Math.ceil(edge.fps*.6),1000/edge.fps);
    assert(!hasUpperFloor(qa.get().player.x,qa.get().player.z),`${edge.name} jump clears the rail at ${edge.fps} FPS, sprint=${edge.sprint}: ${qa.get().player.toArray()}`);
    qa.setKeys([]);frames(Math.ceil(edge.fps*1.1),1000/edge.fps);
    const landed=qa.get();assert.equal(landed.player.y,0,`${edge.name} drop lands on the first floor`);assert(landed.grounded);assert(!isBlocked(landed.player.x,landed.player.z,.32,landed.colliders,undefined,0));assert(Math.abs(landed.camera.position.y-1.68)<.03);
  }
  console.log(`PASS: ${jumps.length} real-keyboard balcony jumps clear the lowered railing, land on the first floor and retain walking guards at 30/60/144 FPS.`);

  const rails=s.colliders.filter(c=>c.railing&&!c.exteriorStairs&&!c.attic)/* Olivia's attic rail is its own height (v131) */,stairRails=rails.filter(c=>c.slope!==undefined);
  assert.equal(stairRails.length,2,'Each stair banister has one continuous sloped collider');
  for(const c of rails)assert(Math.abs((c.slope===undefined?c.maxY-c.minY:c.topY-c.baseY)-.72)<1e-6,'Stair and balcony rail tops have the same height');
  // Retained source meshes have the same transforms used by static batching.
  assert.equal(s.secondFloor.banisters.length,2);
  for(const o of s.secondFloor.banisters){
    o.updateMatrixWorld(true);
    const angle=o.rotation.x;
    for(const z of [-8.4,-6.4,-4.5,-2.6]){
      const localZ=(z-o.position.z-.075/2*Math.sin(angle))/Math.cos(angle);
      const top=o.localToWorld(new T.Vector3(0,.5,localZ/o.scale.z));
      assert(Math.abs(top.y-stairHeight(STAIR.x,z)-.72)<1e-6,'Visible banister matches the local walking slope and collision height');
    }
  }

  // Reproduce the reported hole by releasing movement while still over a rail,
  // especially at the two joins between the balcony and the stairwell.
  const partialJumps=[];
  for(const fps of [30,60,144]){
    for(const z of [-2.2,-2.1,-1.7])for(const duration of [.3,.4,.5])partialJumps.push({name:'West stairwell join',x:-4.2,z,y:UPPER_Y,keys:['KeyD'],duration,fps});
    for(const x of [-2.5,-2.2])for(const duration of [.3,.4])partialJumps.push({name:'Landing join',x,z:-10.1,y:UPPER_Y,keys:['KeyS'],duration,fps});
    for(const z of [-8.4,-6.4,-4.5,-2.6])for(const key of ['KeyA','KeyD'])partialJumps.push({name:'Stair banister',x:STAIR.x,z,y:stairHeight(STAIR.x,z),keys:[key],duration:.6,fps});
    for(const keys of [['KeyD','KeyW'],['KeyD','KeyS']])for(const duration of [.35,.5])partialJumps.push({name:'Diagonal stairwell join',x:-4.2,z:-2.1,y:UPPER_Y,keys,duration,fps});
  }
  for(const jump of partialJumps){
    const label=`${jump.name} at ${jump.fps} FPS, ${jump.keys.join('+')}, release at ${jump.duration}s`;
    qa.start();qa.holdSpawns();qa.setAim(0,0);qa.setPlayer(jump.x,jump.z,jump.y);qa.setKeys(jump.keys);
    frames(Math.ceil(jump.fps*.4),1000/jump.fps);const approach=qa.get().player.clone();
    listeners.keydown({code:'Space',preventDefault(){}});frames(Math.ceil(jump.fps*jump.duration),1000/jump.fps);
    qa.setKeys([]);frames(Math.ceil(jump.fps*2),1000/jump.fps);
    const landed=qa.get().player.clone();assert(qa.get().grounded,`${label} lands on a supported surface`);
    assert(!isBlocked(landed.x,landed.z,.32,qa.get().colliders,undefined,landed.y),`${label} cannot fall inside a railing: ${landed.toArray()}`);
    frames(Math.ceil(jump.fps*.3),1000/jump.fps);assert(qa.get().player.distanceTo(landed)<.001,`${label} remains supported when standing still`);
    if(jump.name==='Stair banister')assert(Math.abs(landed.x-approach.x)>.20,`${label} clears the lowered rail`);
    let canEscape=false;
    for(const key of ['KeyW','KeyS','KeyA','KeyD']){
      qa.setPlayer(landed.x,landed.z,landed.y);qa.setKeys([key]);frames(Math.ceil(jump.fps*.6),1000/jump.fps);qa.setKeys([]);
      const p=qa.get().player;
      if(p.distanceTo(landed)>.4&&!isBlocked(p.x,p.z,.32,qa.get().colliders,undefined,p.y)){canEscape=true;break;}
    }
    assert(canEscape,`${label} leaves a walkable escape route`);
  }
  console.log(`PASS: matching 0.72m banister visuals/collision and ${partialJumps.length} partial/diagonal stairwell jumps land safely and retain escape routes at 30/60/144 FPS.`);
  const side=new T.Vector3(STAIR.x+1.7,0,-4.3);moveActor(side,-.8,0,s.colliders);assert(side.x>STAIR.x+1.0&&side.y===0,'A tall stair cannot be entered sideways by teleporting upward');
  const underFlight=new T.Vector3(STAIR.x+1.7,0,-8.4);moveActor(underFlight,-1.5,0,s.colliders);assert(underFlight.x<STAIR.x+1.0&&underFlight.y===0,'The sloped banister preserves passage beneath the high end of the stairs');
  const upper=s.interactables.find(st=>st.y===UPPER_Y),approach={x:upper.x+Math.sin(upper.rotation||0)*1.5,z:upper.z+Math.cos(upper.rotation||0)*1.5};qa.setPlayer(approach.x,approach.z,0);qa.setPoints(5000);qa.interact();assert.equal(qa.get().points,5000,'Cannot buy upstairs supplies through the floor');
  qa.setPlayer(approach.x,approach.z,UPPER_Y);qa.interact();assert.equal(qa.get().points,4650);qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();
  console.log('PASS: collision layers, atrium rails, stair side-entry protection, upper ammunition and floor-aware map/purchases.');

  // An enemy underneath the player must route to the staircase instead of waiting
  // at matching x/z coordinates or dealing damage through the floor.
  qa.start();qa.setHealth(10000);qa.setPlayer(0,-10.4,UPPER_Y);const enemy=qa.makeZombie(0,-10.4);qa.get().nav.rebuild(0,-10.4,UPPER_Y);
  enemy.speed=2.2;enemy.attack=0;const health=qa.get().health;frames(60);assert.equal(qa.get().health,health,'No attacks through floors');
  for(let i=0;i<1400&&enemy.floorY<UPPER_Y-.02;i++)frames(1);
  assert(enemy.floorY>UPPER_Y-.02,`Zombie must climb stairs: ${enemy.walkPos.toArray()}`);
  qa.setPlayer(0,0,0);qa.get().nav.rebuild(0,0,0);for(let i=0;i<1400&&enemy.floorY>.02;i++)frames(1);assert(enemy.floorY<.02,`Zombie must descend the same flight: ${enemy.walkPos.toArray()}`);
  console.log('PASS: zombies chase between floors in both directions without attacking through the floor.');

  qa.start();qa.setPlayer(-21,-7,UPPER_Y);frames(1);const corpse=qa.makeZombie(-21,-7);corpse.walkPos.y=UPPER_Y;corpse.floorY=UPPER_Y;corpse.group.position.y=UPPER_Y-.02;qa.damageEnemy(corpse,10000);frames(180);
  for(const p of Object.values(corpse.ragdoll.points))assert(p.p.y>=UPPER_Y+p.radius+.008-1e-6,'Ragdolls stay on the upper floor');
  qa.start();qa.setPlayer(-21,-7,UPPER_Y);frames(1);qa.grenade();frames(26);const grenade=qa.get().effects.find(e=>e.type==='grenade');grenade.vel.set(0,-3,0);grenade.life=10;for(let i=0;i<50;i++){frames(1);assert(grenade.mesh.position.y>=UPPER_Y+.12-1e-6,'Grenade cannot fall through the upper floor');}
  const below=qa.makeZombie(-21,-7),before=below.hp;qa.get().scene.updateMatrixWorld(true);qa.explode(new T.Vector3(-21,UPPER_Y+.2,-7));assert.equal(below.hp,before,'The solid upper floor shields enemies below a grenade');
  console.log('PASS: upper-floor ragdolls and grenade bounces, with solid floors blocking explosion damage.');
}
