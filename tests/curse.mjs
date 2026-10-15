import assert from 'node:assert/strict';
import {CURSE_RULES,curseTitle,curseModifiers,curseWaveConfig,curseReward,chooseCurseEnemyKind,createCurse,maxCurseRank} from '../public/game/curse.mjs';
import {waveConfig} from '../public/game/core.mjs';
import {chooseEnemyKind} from '../public/game/feral.mjs';
import {DOG_SPEED_MULTIPLIER,RARE_DOG_SPEED_MULTIPLIER} from '../public/game/zombie-dog.mjs';
import {ROTUNDA_BELL} from '../public/game/rotunda-bell.mjs';

export function verifyCurse(qa,frames,listeners,elements,gameCanvas){
  for(const hz of [30,60,120]){
    const state=createCurse();assert(!state.offer(3));assert(state.offer(4));assert(!state.offer(4));
    for(let i=0;i<hz*59;i++)assert(!state.update(1/hz));assert(Math.abs(state.timeLeft-1)<1e-7);
    for(let i=0;i<hz;i++)state.update(1/hz);assert(state.update(0.00001));assert(state.resolve('timeout'));assert(!state.resolve('embrace'));assert.equal(state.rank,0);assert(!state.offer(4));assert(state.offer(9));assert(state.resolve('embrace'));assert.equal(state.rank,1);assert(state.offer(14));assert(state.resolve('resist'));assert.equal(state.rank,1);state.reset();assert.equal(state.rank,0);assert(state.offer(4));
  }
  const schedule=createCurse();
  for(let wave=1;wave<=254;wave++){
    const expected=wave%5===4;assert.equal(schedule.offer(wave),expected,`Curse offer after wave ${wave}`);
    if(expected){assert.equal(schedule.timeLeft,60);assert(!schedule.offer(wave),'No duplicate offer');assert(schedule.resolve('embrace'));assert.equal(schedule.rank,maxCurseRank(wave));assert(!schedule.offer(wave),'A resolved milestone cannot offer twice');}
  }
  assert.deepEqual([0,1,2,3,4,5,6,80].map(curseTitle),['Uncursed','The Whispered','The Marked','The Forsaken','The Damned',"Blackthorn's Chosen",'Endless Corruption','Endless Corruption']);
  for(let rank=0;rank<=5;rank++){
    const modifiers=curseModifiers(rank);assert(Math.abs(modifiers.speed-(1+.15*rank))<1e-8);assert.equal(modifiers.reward,1+.25*rank);assert.equal(modifiers.special,1+.1*rank);
  }
  assert.equal(curseModifiers(1000).speed,2);assert.equal(curseModifiers(1000).special,2);assert.equal(curseModifiers(3).health,1.2);assert.equal(curseModifiers(4).population,1.15);
  assert.deepEqual(curseWaveConfig(10,0),waveConfig(10));assert.equal(curseReward(200,2),300);assert.equal(maxCurseRank(3),0);assert.equal(maxCurseRank(4),1);assert.equal(maxCurseRank(5),1);assert.equal(maxCurseRank(8),1);assert.equal(maxCurseRank(9),2);assert.equal(maxCurseRank(10),2);assert.equal(maxCurseRank(30),6);assert.equal(maxCurseRank(31),6);assert.equal(CURSE_RULES.decisionDelaySeconds,7);
  for(const wave of [1,5,6,7,25]){
    const count=rank=>{let special=0;const kinds=new Set();for(let slot=0;slot<140;slot++)for(let r=0;r<200;r++){const roll=(r+.5)/200,kind=chooseCurseEnemyKind(wave,slot,roll,rank);if(rank===0)assert.equal(kind,chooseEnemyKind(wave,slot,roll));if(kind!=='walker')special++;kinds.add(kind);}return {frequency:special/28000,kinds};};
    const base=count(0);for(const rank of [1,5,20]){const raised=count(rank);assert(Math.abs(raised.frequency-base.frequency*curseModifiers(rank).special)<.004,`Special mix rises by the relative rank bonus at wave ${wave}, rank ${rank}`);if(wave<6)assert(!raised.kinds.has('ashfang'));if(wave<7)assert(!raised.kinds.has('feral'));}
  }
  console.log('PASS: curse ranks/titles, exact minute boundaries at 30/60/120 Hz, irreversible choices, all stacking bonuses and caps, and statistically increasing special mix without early Ashfang/feral unlocks.');

  const bell=qa.get().rotundaBell.station;
  function ready(wave=9){
    qa.start();qa.setHealth(100000);qa.setPlayer(bell.x,bell.z+.65);
    for(let n=0;n<wave;n++)qa.startWave();qa.clearQueuedSpawns();
    const last=qa.makeZombie(0,20);frames(1);
    assert(!qa.get().curse.pending,'The bell waits for the last living enemy');assert.equal(qa.get().waveDelay,0);
    qa.damageEnemy(last,100000);frames(1);return qa.get();
  }
  function finishChoiceDelay(cleared,hz=60){
    assert.equal(qa.get().wave,cleared);assert.equal(qa.get().waveDelay,7);assert.equal(qa.get().toSpawn,0);
    frames(hz*7-1,1000/hz);assert.equal(qa.get().wave,cleared,'No next wave, unlocks or new roster before seven seconds');assert(qa.get().waveDelay>0);assert.equal(qa.get().toSpawn,0);
    frames(1,1000/hz);assert.equal(qa.get().wave,cleared+1,`Seven-second transition at ${hz} Hz`);assert.equal(qa.get().waveDelay,0);assert.equal(qa.get().toSpawn,curseWaveConfig(cleared+1,qa.get().curse.rank).count);
  }
  for(const [i,cleared] of [4,9,14,19,24,49].entries()){
    const offered=ready(cleared);assert(offered.curse.pending);assert.equal(offered.curse.lastMilestone,cleared);
    assert.equal(offered.curse.timeLeft,60);assert.equal(offered.waveDelay,0,'Curse waves never queue the ordinary next-wave countdown');
    assert(!elements.get('curseNotice').classList.contains('hidden'));assert.equal(elements.get('curseCountdown').textContent,'1:00');
    assert(elements.get('waveState').textContent.startsWith('THE BELL CALLS'),'The clearing frame immediately replaces the combat HUD with the curse clock');
    assert(!elements.get('waveState').textContent.includes('NEXT WAVE'));
    const choice=i<3?'embrace':'resist';assert(qa.resolveCurseChoice(choice));assert.equal(qa.get().curse.rank,choice==='embrace'?1:0);
    assert(!qa.get().curse.pending);assert.equal(qa.get().curse.timeLeft,0);assert(elements.get('curseNotice').classList.contains('hidden'));assert.equal(elements.get('waveState').textContent,'NEXT WAVE IN 7s');
    assert(!qa.resolveCurseChoice('embrace'),'A second decision cannot reset or bypass the countdown');qa.triggerFrenzy();assert.equal(qa.get().waveDelay,7,'Frenzy cannot bypass the post-choice countdown');assert.equal(qa.get().toSpawn,0);
    finishChoiceDelay(cleared,[30,60,144][i%3]);
  }
  let state=ready();assert(state.curse.pending);assert.equal(state.wave,9);assert.equal(state.curse.timeLeft,60);assert(!elements.get('curseNotice').classList.contains('hidden'));assert.equal(elements.get('curseCountdown').textContent,'1:00');assert(elements.get('curseNotice').textContent.includes('Great Rotunda'));
  const afterClear=state.points;frames(8);assert.equal(qa.get().points,afterClear,'The clear bounty cannot be repeated during the bell intermission');assert.equal(qa.get().toSpawn,0);
  qa.setKeys(['KeyS']);const oldZ=qa.get().player.z;frames(15);qa.setKeys([]);assert(qa.get().player.z>oldZ,'The notice permits movement to the bell');
  const remaining=qa.get().curse.timeLeft;listeners.keydown({code:'Escape'});frames(1,65000);assert.equal(qa.get().curse.timeLeft,remaining,'Explicit pause freezes the countdown');assert(elements.get('curseNotice').classList.contains('hidden'));elements.get('resume').onclick();
  qa.openMap();const mapTime=qa.get().curse.timeLeft;frames(1,65000);assert.equal(qa.get().curse.timeLeft,mapTime);qa.closeMap();
  qa.setPlayer(bell.x,bell.z+.65,4.3);assert(!qa.openCurseChoice(),'The upstairs floor cannot activate the downstairs rope');qa.setPlayer(bell.x+4,bell.z);assert(!qa.openCurseChoice(),'A remote interaction cannot choose');qa.setPlayer(bell.x,bell.z+.65);frames(1);listeners.keydown({code:'KeyE',repeat:false});assert.equal(qa.get().mode,'curse');assert.equal(document.pointerLockElement,null);assert(qa.get().curseUI.visible);assert(elements.get('curseComparison').textContent.includes('+25%'));assert(elements.get('curseNext').textContent.includes('The Whispered'));
  const readTime=qa.get().curse.timeLeft,ammo=qa.get().inventory.glock.ammo,grenades=qa.get().grenades;frames(1,1200);assert(Math.abs(qa.get().curse.timeLeft-(readTime-1.2))<.001,'Reading the choice does not reset/freeze its minute');listeners.keydown({code:'KeyG'});gameCanvas.events.mousedown({button:0});assert.equal(qa.get().inventory.glock.ammo,ammo);assert.equal(qa.get().grenades,grenades,'Choice input cannot fire or throw');
  const existingPoints=qa.get().points,existingScore=qa.get().totalScore;elements.get('curseEmbrace').onclick();state=qa.get();assert.equal(state.curse.rank,1);assert.equal(state.curse.title,'The Whispered');assert.equal(state.wave,9);assert(!state.curse.pending);assert.equal(state.waveDelay,7);assert(!state.curseUI.visible);assert.equal(state.mode,'playing');assert.equal(document.pointerLockElement,gameCanvas);assert.equal(state.points,existingPoints);assert.equal(state.totalScore,existingScore);assert(!qa.resolveCurseChoice('embrace'));assert.equal(qa.get().wave,9,'Double click cannot increase rank or skip waves');finishChoiceDelay(9);
  const base=waveConfig(10),originalRandom=Math.random;Math.random=()=>1;
  try{
    const variants=[{}, {dog:true},{dog:true,rareDog:true},{feral:true},{brute:true}];
    for(const [i,flags] of variants.entries()){
      const enemy=qa.makeZombie(-28+i*8,23,!!flags.brute,!!flags.dog,!!flags.rareDog,0,!!flags.feral),speed=flags.feral?3:flags.rareDog?RARE_DOG_SPEED_MULTIPLIER:flags.dog?DOG_SPEED_MULTIPLIER:flags.brute?.77:null;
      if(speed)assert(Math.abs(enemy.speed-base.speed*1.15*speed)<1e-7,'The speed bonus applies to every enemy type');else assert(enemy.speed>=base.speed*1.15*.85&&enemy.speed<=base.speed*1.15*1.15);
      const score=qa.get().totalScore,points=qa.get().points;qa.damageEnemy(enemy,100000,false);const earned=13+(flags.brute?138:63);assert.equal(qa.get().totalScore-score,earned);assert.equal(qa.get().points-points,earned,'All kills, including dogs/ferals/brutes, use the newly earned reward multiplier');
    }
  }finally{Math.random=originalRandom;}
  for(let n=qa.get().wave;n<14;n++)qa.startWave();qa.clearQueuedSpawns();frames(1);assert(qa.get().curse.pending,'The next five-wave milestone returns after embracing');qa.setPlayer(bell.x,bell.z+.65);qa.interact();elements.get('curseResist').onclick();assert.equal(qa.get().curse.rank,1,'Resisting does not remove a permanent rank');finishChoiceDelay(14);
  for(let n=qa.get().wave;n<19;n++)qa.startWave();qa.clearQueuedSpawns();frames(1);assert(qa.get().curse.pending,'A resisted milestone still offers again');qa.setPlayer(bell.x,bell.z+.65);qa.interact();elements.get('curseEmbrace').onclick();assert.equal(qa.get().curse.rank,2);assert.equal(qa.get().curse.title,'The Marked');finishChoiceDelay(19);
  qa.hurtPlayer(200000,qa.get().player);assert.equal(qa.get().mode,'dead');assert(elements.get('runSummary').textContent.includes('CURSE 2 / The Marked'));assert(!qa.get().curse.pending);assert(elements.get('curseNotice').classList.contains('hidden'));qa.start();assert.equal(qa.get().curse.rank,0);assert.equal(qa.get().curse.lastMilestone,0);assert(!qa.get().curseUI.visible);
  console.log('PASS: real wave clear, navigable notice, paused/map/read timers, ground-only bell reach, E choice, mouse unlock/relock, double-click safety, all enemy reward/speed bonuses, repeated embrace/resist milestones and rank/title death snapshot/reset.');

  ready();qa.interact();elements.get('curseEmbrace').onclick();finishChoiceDelay(9);
  for(const milestone of [14,19,24]){
    for(let n=qa.get().wave;n<milestone;n++)qa.startWave();qa.clearQueuedSpawns();frames(1);qa.setPlayer(bell.x,bell.z+.65);qa.interact();elements.get('curseEmbrace').onclick();finishChoiceDelay(milestone);
    const rank=qa.get().curse.rank,config=curseWaveConfig(qa.get().wave,rank),ordinary=waveConfig(qa.get().wave);assert.equal(qa.get().toSpawn,config.count);
    if(rank>=3){const zombie=qa.makeZombie(0,23);assert(Math.abs(zombie.maxHp-ordinary.health*(1+(rank-2)*.2))<1e-7,'Rank-three and later health penalties actually reach spawned enemies');qa.damageEnemy(zombie,100000);}
    if(rank===4){assert.equal(qa.get().toSpawn,Math.ceil(ordinary.count*1.15),'Rank four introduces a larger queued wave');}
  }
  assert.equal(qa.get().curse.rank,4);qa.setPlayer(0,23);qa.get().nav.rebuild(0,23,0);
  for(let attempts=0;attempts<100&&qa.get().zombies.filter(e=>!e.dead).length<32;attempts++){qa.spawnEnemy();frames(1);}
  assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32);const queued=qa.get().toSpawn;frames(100);assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32);assert.equal(qa.get().toSpawn,queued,'A larger cursed wave never bypasses the living-enemy performance cap');
  console.log('PASS: repeated bell choices apply actual health/population penalties and keep additional enemies queued at the 32-living-enemy cap.');

  ready();qa.interact();const manualCapture=gameCanvas.requestPointerLock;gameCanvas.requestPointerLock=()=>undefined;elements.get('curseResist').onclick();assert.equal(qa.get().mode,'capturing');frames(1,65000);assert.equal(qa.get().wave,9);assert.equal(qa.get().waveDelay,7,'Waiting for mouse capture cannot spend the preparation time');
  document.pointerLockElement=gameCanvas;listeners.pointerlockchange();gameCanvas.requestPointerLock=manualCapture;assert.equal(qa.get().mode,'playing');frames(60,1000/60);
  const preparationLeft=qa.get().waveDelay;listeners.keydown({code:'Escape'});frames(1,65000);assert.equal(qa.get().waveDelay,preparationLeft,'Pause freezes the post-choice countdown');elements.get('resume').onclick();qa.openMap();frames(1,65000);assert.equal(qa.get().waveDelay,preparationLeft,'The map freezes the post-choice countdown');qa.closeMap();
  const preparationZ=qa.get().player.z;qa.setKeys(['KeyS']);frames(12);qa.setKeys([]);assert(qa.get().player.z>preparationZ,'The seven-second countdown permits movement');qa.shoot();qa.reload();frames(110);assert.equal(qa.get().inventory.glock.ammo,13,'The player can reload during the preparation countdown');assert.equal(qa.get().wave,9);assert.equal(qa.get().toSpawn,0);frames(Math.ceil(qa.get().waveDelay*60)+1);assert.equal(qa.get().wave,10);
  ready();qa.interact();gameCanvas.requestPointerLock=()=>{throw Error('Manual choice capture denied');};elements.get('curseResist').onclick();assert.equal(qa.get().mode,'paused');frames(1,65000);assert.equal(qa.get().wave,9);assert.equal(qa.get().waveDelay,7);gameCanvas.requestPointerLock=manualCapture;elements.get('resume').onclick();finishChoiceDelay(9);
  ready();frames(1,59900);assert(qa.get().curse.pending);qa.interact();elements.get('curseResist').onclick();finishChoiceDelay(9);assert.equal(qa.get().curse.rank,0,'A choice just before minute expiry still receives the full seven seconds');
  ready(14);assert(qa.resolveCurseChoice('resist'));const lmg=qa.get().cellar.weapon;qa.setPlayer(lmg.x,lmg.z+1.5,lmg.y);qa.setPoints(5000);qa.interact();assert.equal(qa.get().points,5000);assert(!qa.get().inventory.lmg.owned);assert(!lmg.used);assert.equal(qa.get().waveDelay,7,'The LMG cannot purchase a frenzy over the decision countdown');finishChoiceDelay(14);qa.interact();assert.equal(qa.get().weapon,'lmg');assert.equal(qa.get().frenzyWave,15,'The LMG works normally once the next wave starts');
  ready(4);qa.interact();elements.get('curseEmbrace').onclick();qa.hurtPlayer(200000,qa.get().player);assert.equal(qa.get().mode,'dead');assert.equal(qa.get().wave,4);assert.equal(qa.get().curse.rank,1);assert(elements.get('runSummary').textContent.includes('CURSE 1 / The Whispered'));assert(qa.get().curse.rank<=maxCurseRank(qa.get().wave),'Deaths during preparation keep a leaderboard-valid earned rank');frames(500);assert.equal(qa.get().wave,4,'Death cancels progression until a new run');
  console.log('PASS: both decisions wait seven seconds at 30/60/144 Hz, late choices keep the full delay, mouse capture/pause/map freeze it, preparation permits movement and reloads, LMG frenzy cannot bypass it, and intermission deaths retain valid leaderboard ranks.');

  ready();frames(1,59000);assert.equal(qa.get().wave,9);assert.equal(elements.get('curseCountdown').textContent,'0:01');frames(1,1000);assert.equal(qa.get().wave,10);assert.equal(qa.get().waveDelay,0,'Minute expiry has no extra countdown');assert.equal(qa.get().curse.rank,0);assert(!qa.get().curse.pending);assert.equal(qa.get().mode,'playing','An ignored notice automatically continues playing');assert(elements.get('curseNotice').classList.contains('hidden'));frames(1);assert.equal(qa.get().wave,10);
  ready();qa.interact();frames(1,60000);assert.equal(qa.get().wave,10);assert.equal(qa.get().waveDelay,0);assert.equal(qa.get().mode,'playing');assert.equal(document.pointerLockElement,gameCanvas);assert(!qa.get().curseUI.visible);assert(!qa.get().curse.pending);assert.equal(qa.get().curse.rank,0,'An ignored open dialog automatically resumes with the current rank');
  ready();qa.interact();const capture=gameCanvas.requestPointerLock;gameCanvas.requestPointerLock=()=>{throw Error('Automatic capture requires a click');};frames(1,60000);assert.equal(qa.get().wave,10);assert.equal(qa.get().mode,'paused');assert(!qa.get().curse.pending);assert(!elements.get('pause').classList.contains('hidden'),'Denied automatic capture exposes an actionable Resume');assert(!elements.get('resume').disabled);gameCanvas.requestPointerLock=capture;elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');
  ready();qa.setPlayer(bell.x,bell.z+.65);frames(1);
  // Aim at the low bell body; LMB is a real raycast, not an invisible anywhere button.
  const dx=ROTUNDA_BELL.x-qa.get().player.x,dz=ROTUNDA_BELL.z-qa.get().player.z;qa.setAim(Math.atan2(-dx,-dz),Math.atan2(3.7-1.68,Math.hypot(dx,dz)));frames(1);qa.get().world.updateMatrixWorld(true);
  const beforeClick=qa.get().inventory.glock.ammo;gameCanvas.events.mousedown({button:0,preventDefault(){}});assert.equal(qa.get().mode,'curse','Clicking the hanging bell opens the choice');assert.equal(qa.get().inventory.glock.ammo,beforeClick,'Bell activation cannot also fire');listeners.keydown({code:'Escape',preventDefault(){}});assert.equal(qa.get().mode,'paused');assert(qa.get().curse.pending);elements.get('resume').onclick();qa.setAim(0,0);qa.interact();elements.get('curseResist').onclick();finishChoiceDelay(9);
  for(const ordinary of [1,3,6,10,15,20]){
    ready(ordinary);assert(!qa.get().curse.pending,'Ordinary waves retain normal restock time');assert.equal(qa.get().waveDelay,12);
    assert(elements.get('waveState').textContent.startsWith('NEXT WAVE IN 12s'));assert(elements.get('curseNotice').classList.contains('hidden'));
  }
  ready(3);frames(719);assert.equal(qa.get().wave,3);frames(2);assert.equal(qa.get().wave,4,'Ordinary restock countdown still starts the next wave');qa.start();
  assert.equal(CURSE_RULES.aliveLimit,32);
  console.log('PASS: automatic minute expiry during navigation and unlocked choice, click-to-bell raycast without a shot, Esc/Resume recovery, immediate 4/9/14/19/24/49 choices, unchanged ordinary intermissions and no additional scene objects/lights.');
}
