import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createZombieRig,animateZombie,rollGait,noteLegDamage,CRAWL,ARM_POSES} from '../public/game/zombies.mjs';

// Seeded generator so every rig and gait is reproducible.
function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function walker(seed,gait={}){
  const rig=createZombieRig({rng:seeded(seed)});
  const e={...rig,speed:1.2,attack:100,attackTime:-1,motion:0,legHit:0,staggerLeft:0,hp:100,maxHp:100,dead:false,dog:false,brute:false};
  e.gait={...e.gait,...gait};e.phase=0;return e;
}
// One full stride at walking speed; record the given joint angle each frame.
function cycle(e,read,frames=120){const out=[];for(let i=0;i<frames;i++){animateZombie(e,1/60,6,e.speed/60);out.push(read(e));}return out;}
const range=v=>Math.max(...v)-Math.min(...v),mean=v=>v.reduce((a,b)=>a+b,0)/v.length;

export function verifyZombieMotion(qa,frames){
  // ---- Variety: twenty walkers roll twenty distinct gaits -------------------
  const gaits=Array.from({length:20},(_,i)=>rollGait(seeded(1000+i)));
  assert.equal(new Set(gaits.map(g=>JSON.stringify(g))).size,20,'Every walker rolls its own gait');
  assert(gaits.some(g=>g.dragLeg===0)&&gaits.some(g=>g.dragLeg===1),'Either leg can be the dragged one');
  assert(new Set(gaits.map(g=>g.arms)).size>=3,'Arm carriage varies across a crowd');
  for(const key of ['sway','hunch','armLag','bob','scuff'])assert(range(gaits.map(g=>g[key]))>.15,`${key} varies across a crowd`);
  for(const g of gaits)assert(ARM_POSES.includes(g.arms));

  // ---- Drag leg: the chosen leg takes the shorter, scuffing stride -----------
  for(const dragLeg of [0,1]){
    const e=walker(7,{dragLeg,scuff:.9});e.limp=.38;
    const legs=[0,1].map(j=>cycle(walker(7,{dragLeg,scuff:.9}),r=>(r.limp=.38,r.legs[j].pivot.rotation.x)));
    const calves=[0,1].map(j=>cycle(walker(7,{dragLeg,scuff:.9}),r=>(r.limp=.38,r.legs[j].calf.rotation.x)));
    assert(range(legs[dragLeg])<range(legs[1-dragLeg])*.8,`Leg ${dragLeg} drags with a shorter stride`);
    assert(Math.max(...calves[dragLeg])<Math.max(...calves[1-dragLeg])*.75,`Leg ${dragLeg} barely lifts its foot`);
    void e;
  }

  // ---- Out of step: arms lag the legs by the rolled amount -----------------
  {
    // Fit each joint's phase at the known stride frequency (frames 60-119, full motion).
    const phaseOf=(e,read)=>{const v=cycle(e,read).slice(60),m=mean(v),w=e.speed/60*6.4/e.stride;let c=0,sn=0;v.forEach((x,i)=>{const t=(i+60)*w;c+=(x-m)*Math.cos(t);sn+=(x-m)*Math.sin(t);});return Math.atan2(c,sn);};
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    const arm=lag=>phaseOf(walker(11,{armLag:lag,arms:'clutch'}),r=>r.arms[0].pivot.rotation.x),leg=lag=>phaseOf(walker(11,{armLag:lag,arms:'clutch'}),r=>r.legs[0].pivot.rotation.x);
    const shift=wrap(arm(.7)-arm(0));
    assert(Math.abs(Math.abs(shift)-.7)<.12,`Arms swing behind the legs by the rolled lag (${shift.toFixed(2)} rad)`);
    assert(Math.abs(wrap(leg(.7)-leg(0)))<.02,'Arm lag leaves the legs untouched');
    const hipsSynced=cycle(walker(12,{hipLag:0}),r=>r.spine.rotation.y),hipsLate=cycle(walker(12,{hipLag:.24}),r=>r.spine.rotation.y);
    assert(Math.abs(hipsSynced[90]-hipsLate[90])>.005,'Hip sway runs on its own timing');
  }

  // ---- Arm carriage and hunch -----------------------------------------------
  {
    const reach=mean(cycle(walker(21,{arms:'reach'}),r=>r.arms[0].pivot.rotation.x)),dangle=mean(cycle(walker(21,{arms:'dangle'}),r=>r.arms[0].pivot.rotation.x));
    assert(reach<-.9&&dangle>-.35,'Reaching arms rise forward; dangling arms hang');
    const mixed=walker(21,{arms:'mixed',reachArm:1});cycle(mixed,()=>0);assert(mixed.arms[1].pivot.rotation.x<mixed.arms[0].pivot.rotation.x-.6,'Mixed carriage raises one arm only');
    const upright=mean(cycle(walker(22,{hunch:0}),r=>r.spine.rotation.x)),hunched=mean(cycle(walker(22,{hunch:.22}),r=>r.spine.rotation.x));
    assert(hunched>upright+.18,'Hunch folds the spine forward');
  }

  // ---- Crawlers: leg damage, the drop, and the crawl pose -------------------
  {
    const e=walker(31);
    assert.equal(noteLegDamage(e,30),false,'Light leg damage keeps a walker upright');
    assert.equal(noteLegDamage(e,12),true,'Enough leg damage drops a walker');assert(e.crawling&&e.crawlDrop===CRAWL.drop);
    assert.equal(noteLegDamage(e,50),false,'A crawler only drops once');
    for(const kind of [{dog:true},{brute:true}]){const other={...walker(32),...kind};assert.equal(noteLegDamage(other,1000),false,'Dogs and brutes keep their feet');}
    const dead={...walker(33),hp:0};assert.equal(noteLegDamage(dead,1000),false,'The killing shot is a death, not a crawl');
    // The drop blends from the walk pose without a snap, and no attack starts mid-fall.
    e.attack=0;let previous=e.root.rotation.x,biggest=0,contacts=0;animateZombie(e,1/60,1.2,0);previous=e.root.rotation.x;
    for(let i=0;i<Math.ceil(CRAWL.drop*60);i++){contacts+=+animateZombie(e,1/60,1.2,0);biggest=Math.max(biggest,Math.abs(e.root.rotation.x-previous));previous=e.root.rotation.x;assert.equal(e.attackTime,-1,'No attack while dropping');}
    assert(biggest<.12,`The drop is continuous (${biggest.toFixed(3)} rad/frame)`);assert.equal(contacts,0);
    for(let i=0;i<30;i++)animateZombie(e,1/60,6,.01);
    assert(Math.abs(e.root.position.y-CRAWL.hip)<.02&&Math.abs(e.root.rotation.x-CRAWL.pitch)<.06,'Crawlers lie low and pitched forward');
    assert(e.arms.every(a=>a.pivot.rotation.x<-1.8),'Both arms reach ahead to haul');
    const swing=range(cycle(e,r=>r.arms[0].pivot.rotation.x));assert(swing>.5,'Arms alternate reach and pull while crawling');
  }

  // ---- In play: shoot the legs, watch it crawl, fight and fall --------------
  qa.start();qa.holdSpawns();for(const z of qa.get().zombies)z.dead=true;frames(400);
  qa.setPlayer(-34,16);qa.setHealth(1e9);
  const target=qa.makeZombie(-28,24);target.speed=2;frames(30);
  const leg={part:'leg',side:1,direction:new T.Vector3(0,0,-1),force:1,source:'glock'};
  for(let i=0;i<20&&!target.crawling;i++)qa.damageEnemy(target,target.maxHp*.06,false,leg);
  assert(target.crawling&&!target.dead,'Leg shots drop a living walker to a crawl');
  assert.equal(target.bodyHeight,CRAWL.height,'Crawlers have a low collision body');
  frames(Math.ceil(CRAWL.drop*60)+2);
  const start=target.walkPos.clone();frames(120);const crawled=target.walkPos.distanceTo(start)/2;
  assert(crawled>.4*2*CRAWL.speed&&crawled<1.3*2*CRAWL.speed,`Crawlers move at reduced speed (${crawled.toFixed(2)} m/s)`);
  const health=1e9;qa.setHealth(health);let hurt=false;
  for(let i=0;i<60*25&&!hurt;i++){frames(1);hurt=qa.get().health<health;}
  assert(hurt,'A crawler that reaches the player still bites');
  // Death from the floor uses the same physical ragdoll.
  qa.damageEnemy(target,1e6,false,{part:'torso',direction:new T.Vector3(1,0,0),force:2,source:'shotgun'});
  assert(target.dead);frames(240);
  const pts=Object.values(target.ragdoll.points);assert(pts.every(p=>[p.p.x,p.p.y,p.p.z].every(Number.isFinite)&&p.p.y>-.3),'Crawler deaths settle on the floor');
  const brute=qa.makeZombie(-30,22,true);for(let i=0;i<8;i++)qa.damageEnemy(brute,brute.maxHp*.09,false,leg);
  assert(!brute.crawling&&!brute.dead,'Brutes shrug off leg damage');
  console.log('PASS: zombie motion — 20 distinct rolled gaits, either leg dragging and scuffing, arms and hips out of step, reach/dangle/mixed carriage and hunch, continuous drop to a crawl with no mid-fall attacks, reduced-speed crawlers that still bite and die as ragdolls; brutes and dogs stay upright.');
}
