import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createZombieRig,animateZombie,rollGait,noteLegDamage,CRAWL,ARM_POSES,ATTACK_STYLES} from '../public/game/zombies.mjs';

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
    assert(Math.max(...hipsSynced.slice(60).map((v,i)=>Math.abs(v-hipsLate[60+i])))>.005,'Hip sway runs on its own timing');
  }

  // ---- Arm carriage and hunch -----------------------------------------------
  {
    const reach=mean(cycle(walker(21,{arms:'reach'}),r=>r.arms[0].pivot.rotation.x)),dangle=mean(cycle(walker(21,{arms:'dangle'}),r=>r.arms[0].pivot.rotation.x));
    assert(reach<-.9&&dangle>-.35,'Reaching arms rise forward; dangling arms hang');
    const mixed=walker(21,{arms:'mixed',reachArm:1});cycle(mixed,()=>0);assert(mixed.arms[1].pivot.rotation.x<mixed.arms[0].pivot.rotation.x-.6,'Mixed carriage raises one arm only');
    const upright=mean(cycle(walker(22,{hunch:0}),r=>r.spine.rotation.x)),hunched=mean(cycle(walker(22,{hunch:.22}),r=>r.spine.rotation.x));
    assert(hunched>upright+.18,'Hunch folds the spine forward');
  }

  // ---- Smooth gait: no snapping as weight changes legs or a foot lifts --------
  {
    const reads={pelvisSway:r=>r.root.position.x,pelvisHeight:r=>r.root.position.y,pelvisRoll:r=>r.root.rotation.z,spineTilt:r=>r.spine.rotation.z,
      hip:r=>r.legs[0].pivot.rotation.x,knee:r=>r.legs[0].calf.rotation.x,ankle:r=>r.legs[0].foot.rotation.x,dragAnkle:r=>r.legs[1].foot.rotation.x};
    const limits={pelvisSway:.004,pelvisHeight:.008,pelvisRoll:.008,spineTilt:.012,hip:.05,knee:.1,ankle:.1,dragAnkle:.1};
    for(const limp of [.12,.25,.4]){
      const e=walker(60+Math.round(limp*100),{dragLeg:1,scuff:.9});e.limp=limp;const hist={};
      for(let i=0;i<360;i++){animateZombie(e,1/60,6,e.speed/60);if(i<90)continue;
        for(const [k,f] of Object.entries(reads)){const h=hist[k]??=[];h.push(f(e));if(h.length>3)h.shift();
          if(h.length===3)assert(Math.abs(h[2]-2*h[1]+h[0])<limits[k],`${k} snaps mid-stride (limp ${limp})`);}
      }
    }
  }
  console.log('PASS: smooth gait: weight shift, pelvis, spine and every leg joint stay continuous through lift-off, touch-down and limping strides.');

  // ---- Attack styles: varied body language, identical hit timing --------------
  {
    const crowd=Array.from({length:60},(_,i)=>rollGait(seeded(500+i)));
    assert(new Set(crowd.map(g=>g.attack)).size>=4,'A crowd attacks in several different ways');
    assert(new Set(crowd.map(g=>g.arms)).size>=5,'A crowd carries its arms in several ways, including broken and clawing arms');
    for(const g of crowd)assert(['grabber','swiper','biter','flailer'].includes(g.attack),'Walkers grab, swipe, bite or flail');
    for(let i=0;i<20;i++){assert(['pouncer','swiper'].includes(rollGait(seeded(900+i),{feral:true}).attack));assert(['slammer','grabber'].includes(rollGait(seeded(950+i),{brute:true}).attack));}
    const signatures=new Set();
    for(const style of ATTACK_STYLES){
      const e=walker(41,{attack:style});e.attack=0;let contacts=0,first=-1;const leadArm=[];
      for(let i=0;i<60;i++){const c=animateZombie(e,1/60,1.1,0);if(c){contacts++;if(first<0)first=i;}if(i===26)leadArm.push(...e.arms.map(a=>+a.pivot.rotation.x.toFixed(2)),+e.head.rotation.x.toFixed(2),+e.spine.rotation.x.toFixed(2));}
      assert.equal(contacts,1,`${style}: one strike, one contact`);assert.equal(first,20,`${style}: lands on the shared contact frame`);
      signatures.add(leadArm.join(','));
      assert(e.arms.every(a=>a.pivot.rotation.x>-3.3&&a.pivot.rotation.x<1),`${style}: arms stay in a plausible range`);
    }
    assert.equal(signatures.size,ATTACK_STYLES.length,'Every attack style strikes in a visibly different pose');
    // A reaching zombie's grab blends to the grab pose rather than stacking above its head.
    const reacher=walker(43,{arms:'reach',attack:'grabber'});reacher.attack=0;for(let i=0;i<20;i++)animateZombie(reacher,1/60,1.1,0);assert(reacher.arms.every(a=>a.pivot.rotation.x>-2.1),'Attacks take over the arms instead of adding to the carriage');
    const broken=walker(44,{arms:'broken',reachArm:0});for(let i=0;i<90;i++)animateZombie(broken,1/60,6,broken.speed/60);
    assert(broken.arms[0].pivot.rotation.x>-.6&&broken.arms[1].pivot.rotation.x>-.6,'A broken arm hangs instead of reaching');
    const claw=walker(45,{arms:'claw'});const swings=cycle(claw,r=>r.arms[0].pivot.rotation.x);assert(mean(swings)<-.8&&range(swings)>.3,'Clawing arms stay raised and grasp at the air');
  }
  console.log('PASS: six attack styles (grab, swipe, bite, flail, slam, pounce) with distinct poses and the same single contact frame; broken and clawing arm carriages; type-appropriate styles for ferals and brutes.');

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
