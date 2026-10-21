import assert from 'node:assert/strict';
import {waveConfig,isBlocked} from '../public/game/core.mjs';
import {UPPER_Y,supportBelow} from '../public/game/vertical.mjs';

export function verifyWaveFiveFinale(qa,frames,listeners,elements){
  const living=()=>qa.get().zombies.filter(e=>!e.dead);
  function prepare(wave=5,y=0){
    qa.start();qa.setHealth(10000);qa.setPlayer(0,y?-10.4:23,y);qa.setSeed(7521);
    for(let i=0;i<wave;i++)qa.startWave();
    qa.get().nav.rebuild(qa.get().player.x,qa.get().player.z,y);
    const count=qa.get().toSpawn;
    for(let i=0;i<count;i++)assert(qa.spawnEnemy(),'Regular wave spawns remain available');
    assert.equal(qa.get().toSpawn,0);assert.equal(living().length,count);
    return living();
  }
  const ordinary=prepare();
  for(const e of ordinary.slice(0,-1))qa.damageEnemy(e,100000);
  frames(1);assert.equal(qa.get().waveFiveFinale,null,'Finale waits for the last ordinary enemy');
  assert.equal(qa.get().frenzyWave,0);assert.equal(qa.get().waveDelay,0);
  qa.damageEnemy(ordinary.at(-1),100000);const beforeFinale=qa.get().points;
  frames(8);let s=qa.get();
  assert.equal(s.wave,5);assert.equal(s.frenzyWave,5);assert.equal(s.waveDelay,0);
  assert.equal(s.toSpawn+living().length,17);assert.equal(s.points,beforeFinale,'No wave bonus before the finale');
  assert(elements.get('banner').textContent.includes('FRENZIED FINALE'));
  assert(!elements.get('frenzyHud').classList.contains('hidden'));
  assert(elements.get('frenzyHud').textContent.includes('17 UNDEAD · 4 BRUTES'));
  const frozen=s.waveFiveFinale.enemies.map(e=>e.walkPos.clone()),queued=s.toSpawn;
  listeners.keydown({code:'Escape',preventDefault(){}});frames(120);
  assert.equal(qa.get().mode,'paused');assert.equal(qa.get().toSpawn,queued);
  qa.get().waveFiveFinale.enemies.forEach((e,i)=>assert(e.walkPos.equals(frozen[i])));
  elements.get('resume').onclick();
  const firstCount=qa.get().waveFiveFinale.enemies.length;
  frames(45);assert(qa.get().waveFiveFinale.enemies.length>firstCount,'Frenzy spawns faster than the regular 1.7-second interval');
  for(let ticks=0;ticks<1100&&qa.get().toSpawn>0;ticks++)frames(1);
  s=qa.get();const finale=s.waveFiveFinale.enemies,brutes=finale.filter(e=>e.brute),walkers=finale.filter(e=>!e.brute);
  assert.equal(s.toSpawn,0);assert.equal(finale.length,17);assert.equal(living().length,17);
  assert.equal(brutes.length,4);assert.equal(walkers.length,13);
  assert(finale.every(e=>!e.dog&&!e.rareDog&&!e.feral&&!e.enraged),'The fixed roster contains normal walkers and brutes; rage is not forced');
  for(const e of brutes){assert.equal(e.speed,waveConfig(5).speed*.77);assert.equal(e.maxHp,waveConfig(5).health*2.4*1.33);}
  for(const e of finale){
    assert.equal(supportBelow(e.walkPos.x,e.walkPos.z,e.floorY),e.floorY);
    assert(!isBlocked(e.walkPos.x,e.walkPos.z,e.radius,s.colliders,undefined,e.floorY,e.bodyHeight));
    assert(s.nav.direction(e.walkPos.x,e.walkPos.z,e.floorY).reachable);
  }
  qa.triggerFrenzy();assert.equal(qa.get().toSpawn,0,'A frenzy retrigger cannot add enemies to the fixed finale');
  assert(!qa.spawnEnemy(),'The roster cannot spawn an eighteenth enemy');
  for(const e of brutes)qa.damageEnemy(e,100000);
  frames(8);assert.equal(qa.get().waveDelay,0,'Killing all four brutes does not finish the finale');
  assert(elements.get('frenzyHud').textContent.includes('13 UNDEAD · 0 BRUTES'));
  for(const e of walkers.slice(0,-1))qa.damageEnemy(e,100000);
  const afterSixteen=qa.get().points;frames(150);
  assert.equal(qa.get().wave,5);assert.equal(qa.get().waveDelay,0);assert.equal(qa.get().points,afterSixteen);
  assert.equal(qa.get().waveFiveFinale.enemies.length,17,'The finale is not repeated while its last walker lives');
  qa.damageEnemy(walkers.at(-1),100000);const beforeClear=qa.get().points;frames(1);
  assert.equal(qa.get().points,beforeClear+550);assert.equal(qa.get().frenzyWave,0);assert(qa.get().waveDelay>0);
  assert.equal(qa.get().waveDelay,12);assert(elements.get('waveState').textContent.startsWith('NEXT WAVE IN 12s'));
  frames(8);assert.equal(qa.get().points,beforeClear+550,'Wave-clear reward is paid once');
  assert(elements.get('frenzyHud').classList.contains('hidden'));assert(elements.get('banner').textContent.includes('FINALE CLEARED'));
  frames(Math.ceil(qa.get().waveDelay*60)+1);assert.equal(qa.get().wave,6);assert.equal(qa.get().waveFiveFinale,null);assert.equal(qa.get().frenzyWave,0);
  console.log('PASS: wave-five finale triggers only after the ordinary wave, spawns exactly 13 walkers and four brutes at frenzy pace, pauses queued/live enemies, updates counters and clears only after all 17 die with one bonus.');

  const blocked=prepare(5,UPPER_Y);for(const e of blocked)qa.damageEnemy(e,100000);
  const nav=qa.get().nav,direction=nav.direction;nav.direction=()=>({reachable:false});
  const beforeQueued=qa.get().points;frames(150);
  assert.equal(qa.get().waveFiveFinale.enemies.length,0);assert.equal(qa.get().toSpawn,17);
  assert.equal(qa.get().waveDelay,0);assert.equal(qa.get().points,beforeQueued);
  frames(8);assert(elements.get('frenzyHud').textContent.includes('17 UNDEAD · 4 BRUTES'),'Queued brutes are included in the counter');
  nav.direction=direction;
  for(let ticks=0;ticks<1100&&qa.get().toSpawn>0;ticks++){qa.spawnEnemy();frames(1);}
  const retried=qa.get().waveFiveFinale.enemies;
  assert.equal(retried.length,17);assert.equal(retried.filter(e=>e.brute).length,4);
  assert(retried.every(e=>nav.direction(e.walkPos.x,e.walkPos.z,e.floorY).reachable),'The finale can reach an upstairs player');
  qa.start();assert.equal(qa.get().waveFiveFinale,null);assert.equal(qa.get().frenzyWave,0);assert.equal(living().length,0);
  assert(elements.get('frenzyHud').classList.contains('hidden'));
  const nextRun=prepare();for(const e of nextRun)qa.damageEnemy(e,100000);frames(1);
  assert.equal(qa.get().toSpawn+living().length,17,'A new run has its own complete finale');
  const otherWave=prepare(4);for(const e of otherWave)qa.damageEnemy(e,100000);frames(1);
  assert.equal(qa.get().waveFiveFinale,null);assert.equal(qa.get().frenzyWave,0);assert.equal(qa.get().waveDelay,12,'Wave four clears into the normal restock');
  frames(719);assert.equal(qa.get().wave,4);frames(2);assert.equal(qa.get().wave,5);
  qa.clearQueuedSpawns();frames(1);assert.equal(qa.get().toSpawn+living().length,17,'Wave four always leads into the full wave-five finale');qa.start();
  console.log('PASS: blocked finale spawns retain all 17 slots and four brute slots, retry on restored upstairs routes, reset with new runs, and the normal wave-four restock leads into the full finale.');
}
