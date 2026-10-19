import assert from 'node:assert/strict';
import {createCrowd,SPREAD} from '../public/game/crowd.mjs';

// Crowd spreading: followers fan around a leader and the group arrives as a
// ring around the player instead of a single-file queue.
export function verifyCrowdSpread(qa,frames){
  // Unit: two enemies on one line share out the arc; the one in front keeps course.
  {
    const player={x:0,y:0,z:0},actor=(z,side)=>({walkPos:{x:0,y:0,z},radius:.38,bodyHeight:1.8,routeSide:side,flank:0,clearPath:true,dead:false});
    const leader=actor(4,1),follower=actor(5,1),crowd=createCrowd([leader,follower],player);
    crowd.plan(0);
    assert(leader.engaged&&follower.engaged);
    const arc=Math.abs(follower.slotShift-leader.slotShift);
    // Bodies 1 m apart in depth need only part of a shoulder width to pass.
    assert(arc>=.5*(leader.radius+follower.radius+SPREAD.gap)/4,`A follower directly behind is steered onto its own arc (${arc.toFixed(3)} rad)`);
    assert(Math.abs(follower.slotShift)>Math.abs(leader.slotShift)*2,'The enemy further out yields most of the arc');
    const far=actor(20,1),lone=createCrowd([far],player);lone.plan(0);assert(!far.engaged,'Distant enemies keep following routes');
    // A lone enemy walks its line exactly: no sway into landing rails.
    for(const t of [0,.4,1.3,2.9]){lone.steer(far,0,-1,t);assert(far.steerX===0&&far.steerZ===-1,'Sway only applies in company');}
    const pair=[actor(4,1),actor(4.6,-1)],duo=createCrowd(pair,player);duo.steer(pair[1],0,-1,.7);assert(pair[1].steerX!==0,'Company jostles');
    const blind=actor(4,1);blind.clearPath=false;createCrowd([blind],player).plan(0);assert(!blind.engaged,'Slots need a clear walk to the player');
  }
  // Scenario: sixteen walkers come through the main door at a player in the hall.
  qa.start();qa.holdSpawns();for(const e of qa.get().zombies)e.dead=true;frames(400);
  // Seed the shared generator so every rolled trait (stride, attack timing) repeats exactly.
  qa.setSeed(4242);qa.setPlayer(0,3);const horde=[];
  for(let i=0;i<16;i++){const e=qa.makeZombie((i%4-1.5)*.95,24+Math.floor(i/4)*.95);e.speed=2.1+.15*((i*7)%5)/4;
    // Fixed personal traits keep the scenario independent of earlier tests.
    e.phase=i/16+.02;e.routeSide=i%2?1:-1;e.flank=e.routeSide*(.3+.12*(i%5));e.pathTimer=0;e.stride=1;e.attack=.6;horde.push(e);}
  let conga=0,samples=0,sectors=0;const arrived=new Set();
  for(let f=0;f<20*60;f++){
    qa.setHealth(1e9);frames(1);const p=qa.get().player;
    for(let i=0;i<horde.length;i++)for(let j=i+1;j<horde.length;j++){const a=horde[i].walkPos,b=horde[j].walkPos;assert(Math.hypot(a.x-b.x,a.z-b.z)>=horde[i].radius+horde[j].radius-.001,'Jostling never compresses bodies');}
    for(const e of horde)if(Math.hypot(e.walkPos.x-p.x,e.walkPos.z-p.z)<2.6)arrived.add(e);
    if(f%10)continue;
    for(const e of horde){
      const d=Math.hypot(p.x-e.walkPos.x,p.z-e.walkPos.z);if(d<2.5||d>14)continue;samples++;
      const hx=(p.x-e.walkPos.x)/d,hz=(p.z-e.walkPos.z)/d;
      if(horde.some(o=>{if(o===e)return false;const ox=o.walkPos.x-e.walkPos.x,oz=o.walkPos.z-e.walkPos.z,od=Math.hypot(ox,oz);return od>.3&&od<1.7&&(ox*hx+oz*hz)/od>Math.cos(.35);}))conga++;
    }
    const near=horde.filter(e=>Math.hypot(p.x-e.walkPos.x,p.z-e.walkPos.z)<2.4);
    sectors=Math.max(sectors,new Set(near.map(e=>Math.floor((Math.atan2(e.walkPos.x-p.x,e.walkPos.z-p.z)+Math.PI)/(Math.PI/4))%8)).size);
  }
  const share=conga/samples;
  assert(share<.5,`Enemies rarely walk nose-to-tail (${(share*100).toFixed(0)}% of samples; was 69%)`);
  assert(sectors>=7,`The crowd surrounds the player (${sectors}/8 directions; was 4)`);
  assert(arrived.size>=15,`Nearly everyone reaches the fight instead of queuing (${arrived.size}/16; was 11)`);
  console.log(`PASS: crowd spreading — followers take their own arc, ${(share*100).toFixed(0)}% nose-to-tail (was 69%), ${sectors}/8 directions around the player (was 4), ${arrived.size}/16 reach the fight (was 11), no compressed bodies.`);
}
