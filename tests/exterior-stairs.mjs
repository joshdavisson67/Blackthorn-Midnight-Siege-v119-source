import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {EXTERIOR_STAIRS,UPPER_Y,stairHeight,moveActor,hasUpperFloor,supportBelow} from '../public/game/vertical.mjs';
import {isBlocked,colliderTop} from '../public/game/core.mjs';
import {BELLA} from '../public/game/bella.mjs';

export function verifyExteriorStairs(qa,frames,listeners,elements){
  const fresh=()=>{qa.start();qa.startWave();qa.holdSpawns();qa.setHealth(100000);qa.setAim(0,0);};
  fresh();const state=qa.get(),structure=state.secondFloor.exteriorStairs;
  assert.equal(state.secondFloor.doors.filter(d=>d.exterior).length,2);
  assert(!state.secondFloor.windowOpenings.some(w=>Math.abs(w.x)===42&&w.z===0),'The end windows are removed, including their panes and collision');
  assert.equal(state.secondFloor.windowOpenings.length,13,'Other windows stay intact');
  const opaque=[];state.world.updateMatrixWorld(true);state.world.traverseVisible(o=>{if(o.isMesh&&!o.material.transparent&&!o.isInstancedMesh)opaque.push(o);});
  const ray=new T.Raycaster();
  for(const s of EXTERIOR_STAIRS){
    for(const z of [-.95,0,.95])for(const height of [.12,1.7,2.25]){
      ray.set(new T.Vector3(s.side*41.3,UPPER_Y+height,z),new T.Vector3(s.side,0,0));ray.far=1.5;
      assert.equal(ray.intersectObjects(opaque,false).length,0,'Exit opening has no leftover wall, glass, sill or baseboard');
    }
    for(const x of [41.95,42.05,42.5,44,45.9])for(const z of [-.4,.4]){
      ray.set(new T.Vector3(s.side*x,UPPER_Y+.06,z),new T.Vector3(0,-1,0));ray.far=.09;
      assert(ray.intersectObjects(opaque,false).some(h=>Math.abs(h.point.y-UPPER_Y)<.001),'Interior floor joins the landing without a hole or raised threshold');
      assert(hasUpperFloor(s.side*x,z,.32));
    }
    for(const nav of [state.nav,state.nav.brutes]){
      const p=nav.exteriorPortals.find(p=>p.stair.side===s.side);
      assert(!nav.blocked[p.top]&&!nav.blocked[p.bottom],'Both portal ends accommodate walkers and full-size brutes');
    }
  }
  assert(structure.meshes.length<420,'Steelwork stays within a small static geometry budget');
  assert(structure.steel.map===structure.meshes.find(o=>o.material!==structure.steel).material.map,'Steelwork reuses the existing metal map');
  assert(structure.meshes.every(o=>!o.userData.dynamic&&o.material.metalness>=.65));
  console.log('PASS: two clear metal-framed exits, retained windows, continuous floor joins, brute-sized portal clearance and texture-sharing static steelwork.');

  // Test the finished batches, including both sides of the steel/stone seam.
  let apronRays=0;
  for(const s of EXTERIOR_STAIRS){
    const edge=s.side*(Math.abs(s.apron.x)+s.apron.w/2);
    for(const z of [10.83,11.27,11.79])for(const offset of [-.012,.012,.48]){
      ray.set(new T.Vector3(edge+s.side*offset,.20,z),new T.Vector3(0,-1,0));ray.far=.24;
      const hits=ray.intersectObjects(opaque,false).filter(h=>h.face.normal.y>.9),h=hits[0];
      assert(h&&Math.abs(h.point.y-s.apron.topY)<1e-6,'Metal and stone meet flush at the foot of each stair');
      assert.equal(h.object.material,offset<0?structure.aprons[0].material:opaque.find(o=>o.material.name==='wet-stone').material,'The join has a clean material boundary');
      assert(!hits.some((other,i)=>i>0&&Math.abs(other.distance-h.distance)<.00001),'No competing steel/stone faces remain at the bottom landing');
      if(offset<0)assert(!hits.some(h=>h.object.material.name==='wet-stone'),'Paving does not continue inside the metal apron');
      apronRays++;
    }
    for(const c of structure.rails.filter(c=>Math.sign(c.x)===s.side)){
      for(const z of [c.z-c.d*.3,c.z,c.z+c.d*.3]){
        const base=c.slope===undefined?UPPER_Y:stairHeight(s.x,z);
        assert(Math.abs(colliderTop(c,z)-base-.72)<1e-6,'Exterior guard collision matches the jumpable indoor rail height');
      }
    }
  }
  for(const o of structure.handrails){
    // Retained source transforms are the transforms baked into the static mesh.
    const s=EXTERIOR_STAIRS.find(s=>Math.sign(o.position.x)===s.side),angle=o.rotation.x;
    for(const fraction of [-.3,0,.3]){
      const point=o.localToWorld(new T.Vector3(0,.5,fraction));
      const base=angle?stairHeight(s.x,point.z):UPPER_Y;
      assert(Math.abs(point.y-base-.72)<1e-6,'Rendered rail tops align with the local floor and the vault collision');
    }
  }
  console.log(`PASS: ${apronRays} batched landing/path rays have flush, non-overlapping surfaces; visible exterior rails match their lowered collision.`);

  let walks=0;
  for(const s of EXTERIOR_STAIRS)for(const fps of [30,60,144])for(const sprint of [false,true]){
    fresh();qa.setPlayer(s.side*40,0,UPPER_Y);const ms=1000/fps,label=`${s.side<0?'West':'East'} stairs at ${fps} FPS, sprint=${sprint}`;
    let maxStep=0;
    function walk(key,arrived){
      qa.setKeys([key,...(sprint?['ShiftLeft']:[])]);let count=0;
      while(!arrived(qa.get().player)&&count++<fps*5){const before=qa.get().player.y;frames(1,ms);maxStep=Math.max(maxStep,Math.abs(qa.get().player.y-before));}
      qa.setKeys([]);assert(count<fps*5,label+' has a usable route');
      const p=qa.get().player;assert(!isBlocked(p.x,p.z,.32,state.colliders,undefined,p.y),label+' ends outside collision geometry');
    }
    walk(s.side>0?'KeyD':'KeyA',p=>s.side*p.x>=45);assert.equal(qa.get().player.y,UPPER_Y,label+' crosses the doorway onto the landing');
    walk('KeyS',p=>p.z>=13);assert.equal(qa.get().player.y,0,label+' descends to open grounds');assert(qa.get().grounded);
    walk('KeyW',p=>p.z<=.2);assert.equal(qa.get().player.y,UPPER_Y,label+' climbs back onto the landing');
    walk(s.side>0?'KeyA':'KeyD',p=>s.side*p.x<=40);assert.equal(qa.get().player.y,UPPER_Y,label+' returns inside the wing');
    assert(maxStep<.1,label+' uses continuous smooth walking heights');
    assert(Math.abs(qa.get().camera.position.y-UPPER_Y-1.68)<.03,label+' camera follows the stair height');walks++;
  }
  console.log(`PASS: ${walks} complete keyboard-controlled wing → landing → grounds → wing trips at 30/60/144 FPS, walking and sprinting.`);

  for(const s of EXTERIOR_STAIRS){
    fresh();qa.setPlayer(s.x,0,UPPER_Y);qa.setKeys(['KeyW']);frames(40);qa.setKeys([]);
    assert(qa.get().player.z>-1.45,'Landing guard stops walking into an unsupported drop');
    const midZ=(s.topZ+s.bottomZ)/2;
    qa.setPlayer(s.x,midZ,stairHeight(s.x,midZ));qa.setKeys([s.side>0?'KeyD':'KeyA']);frames(30);
    listeners.keydown({code:'Space',preventDefault(){}});frames(28);qa.setKeys([]);frames(90);
    let p=qa.get().player;assert(qa.get().grounded&&!isBlocked(p.x,p.z,.32,state.colliders,undefined,p.y),'A partial jump at a stair rail lands outside the rail collision');
    const before=p.clone();qa.setKeys(['KeyS']);frames(30);qa.setKeys([]);assert(qa.get().player.distanceTo(before)>.4,'A rail jump leaves an escape along the stairs');
    const low=new T.Vector3(s.x+s.side*1.8,0,s.bottomZ-2.2);moveActor(low,-s.side*.9,0,state.colliders);
    assert(low.y===0&&Math.abs(low.x-s.x)>s.w/2,'Sideways entry cannot teleport onto a tall tread');
    const under=new T.Vector3(s.x+s.side*1.8,0,s.topZ+.8);moveActor(under,-s.side*1.8,0,state.colliders);
    assert(Math.abs(under.x-s.x)<.05&&under.y===0,'There is real clearance below the high end of the flight');
  }
  console.log('PASS: guarded landings, safe partial rail jumps, onward escape, tall-step side-entry rejection and headroom under the high flight.');

  function escape(label){
    const landed=qa.get().player.clone();
    assert(qa.get().grounded&&!isBlocked(landed.x,landed.z,.32,state.colliders,undefined,landed.y),label+' lands outside collision');
    frames(12);assert(qa.get().player.distanceTo(landed)<.001,label+' remains supported at rest');
    let escaped=false;
    for(const key of ['KeyS','KeyW','KeyA','KeyD']){
      qa.setPlayer(landed.x,landed.z,landed.y);qa.setKeys([key]);frames(30);qa.setKeys([]);
      const p=qa.get().player;
      if(p.distanceTo(landed)>.4&&!isBlocked(p.x,p.z,.32,state.colliders,undefined,p.y)){escaped=true;break;}
    }
    assert(escaped,label+' leaves a walkable escape');
  }
  fresh();let vaults=0,partialVaults=0;
  for(const s of EXTERIOR_STAIRS){
    const out=s.side>0?'KeyD':'KeyA',inward=s.side>0?'KeyA':'KeyD';
    const edges=[
      {name:'Landing back',x:s.x,z:-.6,key:'KeyW',cleared:p=>p.z<-s.landing.d/2-.32},
      {name:'Landing outer',x:s.side*45.7,z:0,key:out,cleared:p=>s.side*p.x>Math.abs(s.landing.x)+s.landing.w/2+.32},
      {name:'Flight outer',x:s.x,z:6.2,key:out,cleared:p=>s.side*p.x>Math.abs(s.x)+s.w/2+.4},
      {name:'Flight inner',x:s.x,z:6.2,key:inward,cleared:p=>s.side*p.x<Math.abs(s.x)-s.w/2-.4},
    ];
    for(const fps of [30,60,144])for(const sprint of [false,true])for(const e of edges){
      const label=`${s.side} ${e.name}, ${fps} FPS, sprint=${sprint}`,ms=1000/fps;
      qa.setPlayer(e.x,e.z,stairHeight(e.x,e.z)??UPPER_Y);qa.setKeys([e.key,...(sprint?['ShiftLeft']:[])]);frames(Math.ceil(fps*.4),ms);
      assert(qa.get().grounded&&!e.cleared(qa.get().player),label+' blocks walking through the guard');
      listeners.keydown({code:'Space',preventDefault(){}});frames(Math.ceil(fps*.64),ms);
      assert(e.cleared(qa.get().player),label+' clears the full guard with the normal jump: '+qa.get().player.toArray());
      qa.setKeys([]);frames(Math.ceil(fps*1.6),ms);
      assert.equal(qa.get().player.y,0,label+' lands on the outside ground');escape(label);vaults++;
    }
    for(const fps of [30,60,144])for(const direction of [out,inward])for(const z of [2.3,10.2]){
      const label=`${s.side} flight at z=${z}, ${fps} FPS`,ms=1000/fps;
      qa.setPlayer(s.x,z,stairHeight(s.x,z));qa.setKeys([direction]);frames(Math.ceil(fps*.4),ms);
      const approach=qa.get().player.x;listeners.keydown({code:'Space',preventDefault(){}});frames(Math.ceil(fps*.64),ms);
      assert(Math.abs(qa.get().player.x-approach)>.5,label+' also clears the high and low ends of the rail');
      qa.setKeys([]);frames(Math.ceil(fps*1.6),ms);escape(label);vaults++;
    }
    for(const fps of [30,60,144])for(const keys of [[out,'KeyW'],[out,'KeyS']])for(const duration of [.32,.42,.46]){
      const label=`${s.side} landing corner, ${fps} FPS, ${keys.join('+')}, release=${duration}`,ms=1000/fps;
      qa.setPlayer(s.side*46.25,keys.includes('KeyW')?-1.25:1.25,UPPER_Y);qa.setKeys(keys);frames(Math.ceil(fps*.3),ms);
      listeners.keydown({code:'Space',preventDefault(){}});frames(Math.ceil(fps*duration),ms);
      qa.setKeys([]);frames(Math.ceil(fps*2),ms);escape(label);partialVaults++;
    }
    // Walk from the stone path across the apron, climb the toe, then return.
    for(const fps of [30,60,144]){
      const ms=1000/fps;qa.setPlayer(s.side*47.2,11.27);qa.setKeys([inward]);frames(Math.ceil(fps*.65),ms);qa.setKeys([]);
      // At 30 Hz, 20 steps at 3.6m/s end exactly 0.2m from center;
      // accumulated frame timestamps can put that endpoint a few ulps either side.
      let p=qa.get().player;assert(Math.abs(p.x-s.x)<=.2+1e-6&&p.y===s.apron.topY&&qa.get().grounded,'Side approach steps onto the metal apron without a lip or snag');
      qa.setKeys(['KeyW']);frames(Math.ceil(fps*.65),ms);qa.setKeys([]);
      p=qa.get().player;assert(p.z<s.bottomZ-1&&p.y>.6,'Apron approach connects to the stair flight');
      qa.setKeys(['KeyS']);frames(Math.ceil(fps*.65),ms);qa.setKeys([]);p=qa.get().player;
      assert(p.y===s.apron.topY&&qa.get().grounded&&Math.abs(supportBelow(p.x,p.z,p.y)-p.y)<1e-6,'Descending reaches the same supported apron');
      qa.setKeys([out]);frames(Math.ceil(fps*.65),ms);qa.setKeys([]);assert.equal(qa.get().player.y,0,'The apron reconnects to the grounds without trapping the player');
    }
  }
  console.log(`PASS: ${vaults} complete exterior rail vaults, ${partialVaults} partial diagonal corner jumps and both flush stair/path approaches at 30/60/144 FPS.`);

  const kinds=[['walker',false,false,false,false],['brute',true,false,false,false],['dog',false,true,false,false],['Ashfang',false,true,true,false],['feral',false,false,false,true]];
  for(const s of EXTERIOR_STAIRS)for(const [kind,brute,dog,rare,feral] of kinds){
    fresh();qa.setPlayer(s.side*40,0,UPPER_Y);qa.get().nav.rebuild(s.side*40,0,UPPER_Y);
    const enemy=qa.makeZombie(s.x,13,brute,dog,rare,0,feral);enemy.speed=3;enemy.attack=1000;
    let climbed=false,descended=false,crossedApron=false;
    for(let i=0;i<1000&&(enemy.floorY<UPPER_Y-.01||Math.abs(enemy.walkPos.x-s.side*40)>1.6);i++){frames(1);if(enemy.floorY>.1&&enemy.floorY<UPPER_Y-.1&&Math.abs(enemy.walkPos.x-s.x)<s.w/2)climbed=true;}
    assert(climbed&&enemy.floorY===UPPER_Y&&Math.abs(enemy.walkPos.x-s.side*40)<1.6,`${kind} uses the ${s.side} exterior stairs to enter the wing: ${enemy.walkPos.toArray()}`);
    qa.setPlayer(s.x,14.5);qa.get().nav.rebuild(s.x,14.5);
    for(let i=0;i<1000&&(enemy.floorY>.01||enemy.walkPos.z<s.bottomZ+.2);i++){
      frames(1);if(enemy.floorY>.1&&enemy.floorY<UPPER_Y-.1&&Math.abs(enemy.walkPos.x-s.x)<s.w/2)descended=true;
      if(enemy.floorY===s.apron.topY){crossedApron=true;assert(Math.abs(enemy.group.position.y+.02-s.apron.topY)<1e-6,`${kind} feet align with the raised metal apron`);}
    }
    assert(descended&&enemy.floorY===0&&enemy.walkPos.z>s.bottomZ,`${kind} descends to the grounds: ${enemy.walkPos.toArray()}`);
    assert(crossedApron,`${kind} walks across the supported metal approach`);
  }
  console.log('PASS: walkers, brutes, standard dogs, Ashfangs and ferals physically climb and descend both exterior stairways.');

  for(const s of EXTERIOR_STAIRS){
    fresh();const b=state.bella;qa.setPlayer(b.station.x,b.station.z+1.5,UPPER_Y);qa.setPoints(BELLA.price);qa.interact();
    for(let i=0;i<60;i++)b.update(.05,{player:state.player,yaw:0,enemies:[],onBite(){}});
    b.pos.set(s.side*40,UPPER_Y,0);qa.setPlayer(s.x,13);
    function follow(y){let stairs=false;for(let i=0;i<400&&(Math.abs(b.pos.y-y)>.01||b.pos.distanceTo(state.player)>2.1);i++){b.update(.05,{player:state.player,yaw:0,enemies:[],onBite(){}});if(b.pos.y>.1&&b.pos.y<UPPER_Y-.1&&Math.abs(b.pos.x-s.x)<s.w/2)stairs=true;}
      assert(stairs&&Math.abs(b.pos.y-y)<.01&&b.pos.distanceTo(state.player)<2.1,`Bella follows using the ${s.side} stairs: ${b.pos.toArray()}`);
    }
    follow(0);
    b.pos.set(s.x,s.apron.topY,11.27);qa.setPlayer(s.x,11.27,s.apron.topY);
    b.update(.05,{player:state.player,yaw:0,enemies:[],onBite(){},visualFloor:()=>s.apron.topY});
    assert.equal(b.pos.y,s.apron.topY);assert.equal(b.rig.group.position.y,s.apron.topY,'Bella does not sink into or hover above the metal pad');
    qa.setPlayer(s.side*40,0,UPPER_Y);follow(UPPER_Y);
  }
  console.log('PASS: Bella follows through both new doors and up/down the exterior routes.');

  fresh();const s=EXTERIOR_STAIRS[0];qa.setPlayer(s.x,0,UPPER_Y);frames(1);qa.grenade();frames(26);
  const grenade=state.effects.find(e=>e.type==='grenade');assert(grenade);grenade.mesh.position.set(s.x,UPPER_Y+.4,.3);grenade.vel.set(0,-3,0);grenade.life=10;
  for(let i=0;i<50;i++){frames(1);assert(grenade.mesh.position.y>=UPPER_Y+.12-1e-6,'Grenades bounce on the metal landing');}
  grenade.mesh.position.set(s.x,.25,11.27);grenade.vel.set(0,-2,0);grenade.life=10;
  for(let i=0;i<24;i++){frames(1);assert(grenade.mesh.position.y>=s.apron.topY+.12-1e-6,'Grenades also bounce on the raised metal approach');}
  const below=qa.makeZombie(s.x,0),hp=below.hp;state.scene.updateMatrixWorld(true);qa.explode(new T.Vector3(s.x,UPPER_Y+.2,0));assert.equal(below.hp,hp,'A solid steel deck blocks grenade damage to enemies underneath');
  const corpse=qa.makeZombie(s.x,0,false,false,false,UPPER_Y);qa.damageEnemy(corpse,10000);frames(180);
  for(const p of Object.values(corpse.ragdoll.points))if(hasUpperFloor(p.p.x,p.p.z))assert(p.p.y>=UPPER_Y+p.radius+.008-1e-6,'Corpses remain supported on steel landings');
  assert(elements.get('guideEstate').textContent.includes('steel landings'));qa.start();
  console.log('PASS: metal landing grenade bounces, floor-blocked blast damage, corpse support and updated field-guide routes.');
}
