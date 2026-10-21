import assert from 'node:assert/strict';
import {CURSE_RULES,MAX_CURSE_RANK,CURSE_LADDER_KEYS,curseTitle,curseModifiers,curseWaveConfig,curseReward,chooseCurseEnemyKind,createCurse,createCurseLadder,clampCurseRank} from '../public/game/curse.mjs';
import {curseSummary} from '../public/game/curse-ui.mjs';
import {waveConfig} from '../public/game/core.mjs';
import {chooseEnemyKind} from '../public/game/feral.mjs';
import {DOG_SPEED_MULTIPLIER,RARE_DOG_SPEED_MULTIPLIER} from '../public/game/zombie-dog.mjs';

function memory(initial={}){const data={...initial};return {data,getItem:k=>k in data?data[k]:null,setItem:(k,v)=>{data[k]=String(v);}};}

// The curse ladder (v130): one rank per run, chosen on the title screen, and a
// new rank unlocked by defeating Sir Blackthorn at the highest unlocked rank.
export function verifyCurse(qa,frames,listeners,elements,gameCanvas){
  // ---- Rank arithmetic ----------------------------------------------------------
  assert.deepEqual([0,1,2,3,4,5,6,80].map(curseTitle),['Uncursed','The Whispered','The Marked','The Forsaken','The Damned',"Blackthorn's Chosen",'Endless Corruption','Endless Corruption']);
  for(let rank=0;rank<=5;rank++){
    const modifiers=curseModifiers(rank);assert(Math.abs(modifiers.speed-(1+.15*rank))<1e-8);assert.equal(modifiers.reward,1+.25*rank);assert.equal(modifiers.special,1+.1*rank);
  }
  assert.equal(curseModifiers(1000).speed,2);assert.equal(curseModifiers(1000).special,2);assert.equal(curseModifiers(3).health,1.2);assert.equal(curseModifiers(4).population,1.15);
  assert.deepEqual(curseWaveConfig(10,0),waveConfig(10));assert.equal(curseReward(200,2),300);
  assert.deepEqual([-3,0,4,MAX_CURSE_RANK,MAX_CURSE_RANK+9,1.5,'2'].map(clampCurseRank),[0,0,4,MAX_CURSE_RANK,MAX_CURSE_RANK,0,0]);
  const fixed=createCurse(3);assert.equal(fixed.rank,3);assert.equal(fixed.title,'The Forsaken');assert.equal(fixed.setRank(99),MAX_CURSE_RANK);assert.equal(fixed.setRank(-1),0);
  assert(!('offer' in fixed)&&!('pending' in fixed),'There are no mid-run curse choices');
  assert.equal(curseSummary(0),'No curse. Standard undead, standard rewards.');
  assert.equal(curseSummary(1),'+15% enemy speed · +25% essence & score earned · +10% special enemy frequency');
  assert(curseSummary(4).includes('+40% enemy health')&&curseSummary(4).includes('+15% enemies per wave'));
  for(const wave of [1,5,6,7,25]){
    const count=rank=>{let special=0;const kinds=new Set();for(let slot=0;slot<140;slot++)for(let r=0;r<200;r++){const roll=(r+.5)/200,kind=chooseCurseEnemyKind(wave,slot,roll,rank);if(rank===0)assert.equal(kind,chooseEnemyKind(wave,slot,roll));if(kind!=='walker')special++;kinds.add(kind);}return {frequency:special/28000,kinds};};
    const base=count(0);for(const rank of [1,5,20]){const raised=count(rank);assert(Math.abs(raised.frequency-base.frequency*curseModifiers(rank).special)<.004,`Special mix rises by the relative rank bonus at wave ${wave}, rank ${rank}`);if(wave<6)assert(!raised.kinds.has('ashfang'));if(wave<7)assert(!raised.kinds.has('feral'));}
  }
  console.log('PASS: curse ranks/titles, all stacking bonuses and caps, clamped ranks, title-screen summaries, and statistically increasing special mix without early Ashfang/feral unlocks.');

  // ---- The ladder -------------------------------------------------------------------
  {
    const store=memory(),ladder=createCurseLadder({storage:store});
    assert.equal(ladder.unlocked,0);assert.equal(ladder.selected,0);
    assert.equal(ladder.select(3),0,'Locked ranks cannot be chosen');
    assert.equal(ladder.victory(0),1,'Beating Sir Blackthorn uncursed unlocks rank 1');assert.equal(ladder.victory(0),null,'Beating him again at a lower rank unlocks nothing new');
    assert.equal(ladder.select(1),1);assert.equal(ladder.victory(1),2);assert.equal(ladder.victory(1),null);
    assert.equal(store.data[CURSE_LADDER_KEYS.unlocked],'2');assert.equal(store.data[CURSE_LADDER_KEYS.selected],'1');
    const reload=createCurseLadder({storage:store});assert.equal(reload.unlocked,2);assert.equal(reload.selected,1,'Unlocks and the chosen rank survive a reload');
    const forged=createCurseLadder({storage:memory({[CURSE_LADDER_KEYS.unlocked]:'9999',[CURSE_LADDER_KEYS.selected]:'abc'})});assert.equal(forged.unlocked,MAX_CURSE_RANK);assert.equal(forged.selected,0);
    const top=createCurseLadder({storage:memory({[CURSE_LADDER_KEYS.unlocked]:String(MAX_CURSE_RANK)})});assert.equal(top.victory(MAX_CURSE_RANK),null,'The ladder tops out');
    const blocked=createCurseLadder({storage:{getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}}});assert.equal(blocked.unlocked,0);assert.equal(blocked.victory(0),1,'Blocked storage still works for the session');
  }

  // ---- Title screen ---------------------------------------------------------------
  const ladder=qa.get().curseLadder,select=elements.get('curseRank');
  const optionsText=()=>[...select.querySelectorAll('option')].map(o=>[o.textContent,o.hasAttribute('disabled')||o.disabled===true]);
  assert.deepEqual(optionsText(),[['RANK 0 · UNCURSED',false],['RANK 1 · LOCKED',true]],'A new player sees rank 0 and the next rank locked');
  assert(elements.get('curseRankInfo').textContent.includes('Defeat Sir Blackthorn on this rank to unlock rank 1.'));
  while(ladder.unlocked<5)ladder.victory(ladder.unlocked);qa.renderCurseMenu();
  assert.deepEqual(optionsText().map(([t])=>t),['RANK 0 · UNCURSED','RANK 1 · THE WHISPERED','RANK 2 · THE MARKED','RANK 3 · THE FORSAKEN','RANK 4 · THE DAMNED','RANK 5 · BLACKTHORN’S CHOSEN'.replace('’',"'"),'RANK 6 · LOCKED']);
  select.value='2';select.onchange();assert.equal(ladder.selected,2);
  assert.equal(elements.get('menuCurse').dataset.rank,'2');assert(!elements.get('curseRankInfo').textContent.includes('unlock'),'Lower ranks do not promise an unlock');
  select.value='5';select.onchange();assert(elements.get('curseRankInfo').textContent.endsWith('Defeat Sir Blackthorn on this rank to unlock rank 6.'));

  // ---- A run is played entirely at the chosen rank ----------------------------------
  select.value='1';select.onchange();
  qa.start();qa.holdSpawns();qa.setHealth(1e6);frames(2);
  assert.equal(qa.get().curse.rank,1,'The chosen rank applies from the first wave');
  assert.equal(elements.get('curseHud').textContent,'CURSE 1 · THE WHISPERED');assert(!elements.get('curseHud').classList.contains('hidden'));
  assert(!elements.get('curseNotice')&&!elements.get('curseChoice'),'The bell choice UI is gone');
  assert.equal(qa.get().interactables.filter(s=>s.type==='bell').length,0,'The bell is no longer an interaction');
  for(let n=qa.get().wave;n<9;n++)qa.startWave();qa.clearQueuedSpawns();
  const last=qa.makeZombie(0,20);frames(1);qa.damageEnemy(last,1e6);frames(1);
  assert.equal(qa.get().waveDelay,12,'Every wave clear keeps the normal restock countdown');assert(elements.get('waveState').textContent.startsWith('NEXT WAVE IN 12s'));
  assert.equal(qa.get().curse.rank,1,'Clearing waves never changes the rank');
  const base=waveConfig(10),originalRandom=Math.random;frames(60*12+2);assert.equal(qa.get().wave,10);qa.clearQueuedSpawns();Math.random=()=>1;
  try{
    const variants=[{}, {dog:true},{dog:true,rareDog:true},{feral:true},{brute:true}];
    for(const [i,flags] of variants.entries()){
      const enemy=qa.makeZombie(-28+i*8,23,!!flags.brute,!!flags.dog,!!flags.rareDog,0,!!flags.feral),speed=flags.feral?3:flags.rareDog?RARE_DOG_SPEED_MULTIPLIER:flags.dog?DOG_SPEED_MULTIPLIER:flags.brute?.77:null;
      if(speed)assert(Math.abs(enemy.speed-base.speed*1.15*speed)<1e-7,'The speed bonus applies to every enemy type');else assert(enemy.speed>=base.speed*1.15*.85&&enemy.speed<=base.speed*1.15*1.15);
      const score=qa.get().totalScore,points=qa.get().points;qa.damageEnemy(enemy,100000,false);const earned=13+(flags.brute?138:63);assert.equal(qa.get().totalScore-score,earned);assert.equal(qa.get().points-points,earned,'All kills, including dogs/ferals/brutes, use the newly earned reward multiplier');
    }
  }finally{Math.random=originalRandom;}
  qa.hurtPlayer(2e6,qa.get().player);assert.equal(qa.get().mode,'dead');assert(elements.get('runSummary').textContent.includes('CURSE 1 / The Whispered'),'The chosen rank is recorded with the run');

  // Higher ranks raise health and population for the whole run.
  for(const rank of [3,4]){
    select.value=String(rank);select.onchange();qa.start();qa.holdSpawns();
    for(let n=0;n<14;n++)qa.startWave();
    const ordinary=waveConfig(14),config=curseWaveConfig(14,rank);assert.equal(qa.get().toSpawn,config.count);
    const zombie=qa.makeZombie(0,23);assert(Math.abs(zombie.maxHp-ordinary.health*(1+(rank-2)*.2))<1e-7,'Rank-three and later health penalties reach spawned enemies');qa.damageEnemy(zombie,1e6);
    if(rank===4)assert.equal(qa.get().toSpawn,Math.ceil(ordinary.count*1.15),'Rank four queues a larger wave');
  }
  qa.setPlayer(0,23);qa.get().nav.rebuild(0,23,0);
  for(let attempts=0;attempts<100&&qa.get().zombies.filter(e=>!e.dead).length<32;attempts++){qa.spawnEnemy();frames(1);}
  assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32);const queued=qa.get().toSpawn;frames(100);assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32);assert.equal(qa.get().toSpawn,queued,'A larger cursed wave never bypasses the living-enemy cap');
  assert.equal(CURSE_RULES.aliveLimit,32);
  select.value='0';select.onchange();qa.start();assert.equal(qa.get().curse.rank,0);
  console.log('PASS: curse ladder — saved unlocks and choice, locked ranks, title-screen options and summaries, whole-run rank from wave 1, no bell choices, normal restock after every clear, reward/speed/health/population penalties, 32-enemy cap and rank on the death record.');
}
