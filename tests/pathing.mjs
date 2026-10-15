import assert from 'node:assert/strict';
import {UPPER_Y,STAIR,stairHeight,hasUpperFloor,supportBelow} from '../public/game/vertical.mjs';
import {isBlocked,waveConfig} from '../public/game/core.mjs';

export function verifyPathing(qa,frames){
  const still=e=>{e.speed=0;e.attack=100000;return e;};
  const stepPairs=enemies=>{
    for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
      const a=enemies[i],b=enemies[j];if(a.dead||b.dead||Math.abs(a.walkPos.y-b.walkPos.y)> .8)continue;
      assert(Math.hypot(a.walkPos.x-b.walkPos.x,a.walkPos.z-b.walkPos.z)>=a.radius+b.radius-.001,'Living bodies cannot compress into one another');
    }
  };
  function blockStair(){
    return [-.77,0,.77].map(offset=>{
      const x=STAIR.x+offset,z=-3;
      const e=still(qa.makeZombie(x,z,false,false,false,stairHeight(x,z)));
      assert(!isBlocked(x,z,e.radius,qa.get().colliders,undefined,e.floorY));return e;
    });
  }
  // Real input cannot shove a packed row off the stairs, even while sprinting.
  qa.start();qa.setHealth(10000);qa.setPlayer(STAIR.x,-1.8);qa.setAim(0,0);
  const wall=blockStair();qa.setKeys(['KeyW','ShiftLeft']);frames(100);qa.setKeys([]);
  assert(qa.get().player.z>-2.4,'A packed staircase blocks the player');
  for(const e of wall)assert.equal(e.walkPos.z,-3,'Player contact must not push zombies out of the way');
  qa.damageEnemy(wall[1],10000);qa.setKeys(['KeyW']);frames(110);qa.setKeys([]);
  assert(qa.get().player.z<-5,'Killing the central blocker opens a usable gap immediately');

  qa.start();qa.setHealth(10000);qa.setPlayer(STAIR.x,-1.8);
  const blockers=blockStair(),queue=[-6,-7.2,-8.4].map(z=>{
    const e=qa.makeZombie(STAIR.x,z,false,false,false,stairHeight(STAIR.x,z));e.speed=2.4;return e;
  });
  qa.get().nav.rebuild(STAIR.x,-1.8);
  for(let i=0;i<210;i++){frames(1);stepPairs([...blockers,...queue]);}
  assert(queue.every(e=>e.walkPos.z<-3.6),'Followers queue behind a full bottleneck');
  for(const blocker of blockers)qa.damageEnemy(blocker,10000);
  for(let i=0;i<240&&!queue.some(e=>e.walkPos.z>-3);i++)frames(1);
  assert(queue.some(e=>e.walkPos.z>-3),`The crowd resumes after the blocking row is cleared: ${queue.map(e=>e.walkPos.toArray()).join(';')}`);
  console.log('PASS: real sprint input blocked by a zombie wall, no pushing, non-overlapping stair queues and immediate passage after killing a blocker.');

  // A body directly underneath the upper landing must not block upstairs travel.
  qa.start();qa.setPlayer(0,-10.4,UPPER_Y);qa.setAim(0,0);still(qa.makeZombie(0,-10.4));
  qa.setKeys(['KeyD']);frames(40);qa.setKeys([]);assert(qa.get().player.x>2.2);
  qa.start();qa.setPlayer(0,-10.4);qa.setAim(0,0);still(qa.makeZombie(0,-10.4,false,false,false,UPPER_Y));
  qa.setKeys(['KeyD']);frames(40);qa.setKeys([]);assert(qa.get().player.x>2.2);

  const approaches=[];
  for(const flank of [-1,1]){
    qa.start();qa.setPlayer(0,26);qa.setHealth(10000);
    const e=qa.makeZombie(0,17);e.speed=2;e.flank=flank;frames(70);
    approaches.push(e.walkPos.x);assert(e.walkPos.z>19,'Both approach styles still close on the player');
  }
  assert(approaches[0]*approaches[1]<0&&approaches.every(x=>Math.abs(x)>.1),'Enemies visibly approach from either side');
  qa.start();const nav=qa.get().nav;nav.rebuild(0,26);
  const choices=new Map();
  for(let seed=0;seed<40;seed++){
    const next=nav.direction(12,20,0,{seed,crowding:()=>0});choices.set(`${next.x},${next.z}`,next);
    assert(next.distance<nav.distance[nav.index(12,20)],'Varied choices must always make route progress');
  }
  assert(choices.size>=2,'Individual route seeds choose different junction branches');
  const congested=choices.values().next().value;
  const alternative=nav.direction(12,20,0,{seed:1,crowding:(x,z)=>x===congested.x&&z===congested.z?10:0});
  assert(alternative.x!==congested.x||alternative.z!==congested.z,'Crowding encourages a clear alternative route');
  console.log('PASS: floor-separated body collision, varied left/right approaches, distinct junction choices and preference for less crowded routes.');

  for(const wave of [10,11]){
    qa.start();qa.setPlayer(0,20);for(let i=0;i<wave;i++)qa.startWave();qa.get().nav.rebuild(0,20);
    for(let i=0;i<waveConfig(wave).count;i++)assert(qa.spawnEnemy(),'Every wave slot has an available spawn');
    const enemies=qa.get().zombies,upper=enemies.filter(e=>e.floorY===UPPER_Y);
    if(wave===10)assert.equal(upper.length,0,'No upstairs spawns through wave 10');
    else assert(upper.length>=Math.floor(waveConfig(wave).count/4)&&upper.length<=Math.ceil(waveConfig(wave).count/4),'One randomized slot per four spawns goes upstairs from wave 11');
    for(const e of enemies){
      const p=e.walkPos;
      assert(!isBlocked(p.x,p.z,e.radius,qa.get().colliders,undefined,p.y,e.bodyHeight),'Spawn is outside walls/furniture');
      assert.equal(supportBelow(p.x,p.z,p.y),p.y,'Spawn rests on its actual floor');
      assert(qa.get().nav.direction(p.x,p.z,p.y).reachable,'Spawn can navigate to the player');
      assert(Math.hypot(p.x,p.z-20)>10,'Spawn keeps distance from the player');
      if(p.y===UPPER_Y){assert(hasUpperFloor(p.x,p.z,.48),'No upper spawns in the atrium or stair void');assert.equal(e.group.position.y,UPPER_Y-.02);}
    }
    stepPairs(enemies);
  }
  // Actual upstairs-spawned enemies can come down to attack the ground floor.
  const upstairs=qa.get().zombies.find(e=>e.floorY===UPPER_Y);
  for(const e of qa.get().zombies)if(e!==upstairs)qa.damageEnemy(e,100000);
  qa.setHealth(10000);upstairs.speed=3;
  for(let i=0;i<2400&&upstairs.floorY>.02;i++)frames(1);
  assert(upstairs.floorY<.02,`An upstairs spawn must reach the ground floor: ${upstairs.walkPos.toArray()}`);
  console.log('PASS: wave-10 exclusion, wave-11 upstairs spawns, collision-safe supported positions, correct render height, connected navigation and actual descent.');
  qa.start();qa.setPlayer(20,27);qa.setHealth(10000);
  const horde=[];
  for(let i=0;i<32;i++){
    const brute=i%7===6,dog=!brute&&i%5===4;
    const e=qa.makeZombie(16+(i%8)*1.3,16+Math.floor(i/8)*1.3,brute,dog,dog&&i%3===2);e.speed=2;horde.push(e);
  }
  const timings=[];
  for(let i=0;i<480;i++){
    const started=performance.now();frames(1);timings.push(performance.now()-started);stepPairs(horde);
    for(const e of horde)assert(Math.hypot(e.walkPos.x-20,e.walkPos.z-27)>=e.radius+.32-.001,'A full mixed crowd cannot enter the player body');
  }
  assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32,'Automatic spawning respects the live-enemy cap');
  assert(horde.some(e=>Math.hypot(e.walkPos.x-20,e.walkPos.z-27)<1.7),'The full crowd still closes to attack range');
  timings.sort((a,b)=>a-b);
  console.log(`PASS: 32 mixed enemies crowd the player without body overlap; CPU-only frame median ${timings[240].toFixed(2)}ms, p95 ${timings[456].toFixed(2)}ms (stubbed renderer, not browser FPS).`);
  qa.start();
}
