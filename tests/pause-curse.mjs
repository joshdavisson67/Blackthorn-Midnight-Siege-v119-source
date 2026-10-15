import assert from 'node:assert/strict';

export function verifyPauseCurse(qa,frames,listeners,elements,gameCanvas){
  const pause=elements.get('pause'),panel=elements.get('pauseCurse');
  const nodes=[...panel.querySelectorAll('[data-curse-stat]')];
  const expected=new Map([
    [0,['0%','0%','0%','0%','0%']],
    [1,['+15%','+25%','+10%','0%','0%']],
    [3,['+45%','+75%','+30%','+20%','0%']],
    [4,['+60%','+100%','+40%','+40%','+15%']],
    [7,['+100%','+175%','+70%','+100%','+60%']],
    [10,['+100%','+250%','+100%','+160%','+105%']],
    [11,['+100%','+275%','+100%','+180%','+120%']],
  ]);
  function readout(rank){
    assert(!pause.classList.contains('hidden'));
    assert.equal(panel.closest('#pause'),pause,'Readout belongs to the pause overlay');
    assert.equal(elements.get('pauseCurseRank').textContent,`RANK ${rank}`);
    assert.equal(elements.get('pauseCurseTitle').textContent,qa.get().curse.title);
    assert.equal(panel.dataset.rank,String(rank));
    assert.deepEqual([...panel.querySelectorAll('[data-curse-stat]')],nodes,'Pause reuses the same five stat nodes');
    if(expected.has(rank))assert.deepEqual(nodes.map(node=>node.textContent),expected.get(rank),'Display current totals, including delayed health/population penalties and capped speed/special frequency');
    for(const node of nodes)assert.equal(node.dataset.modified,String(node.textContent!=='0%'));
  }
  const pauseWithEsc=()=>listeners.keydown({code:'Escape',preventDefault(){}});
  const resume=()=>{elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');assert(pause.classList.contains('hidden'));assert.equal(document.pointerLockElement,gameCanvas);};
  qa.start({capture:false});readout(0);assert.equal(elements.get('pauseCurseTitle').textContent,'Uncursed');resume();
  qa.setHealth(100000);
  const bell=qa.get().rotundaBell.station;
  function choose(milestone,choice){
    for(let wave=qa.get().wave;wave<milestone;wave++)qa.startWave();
    qa.holdSpawns();qa.clearQueuedSpawns();frames(1);
    assert(qa.get().curse.pending);qa.setPlayer(bell.x,bell.z+.65);qa.interact();
    assert.equal(qa.get().mode,'curse');
    elements.get(choice==='embrace'?'curseEmbrace':'curseResist').onclick();
    pauseWithEsc();assert.equal(qa.get().mode,'paused');
  }
  choose(4,'embrace');readout(1);assert.equal(elements.get('pauseCurseTitle').textContent,'The Whispered');
  const state=qa.get(),frozenDelay=state.waveDelay,frozenTime=state.runTime,ammo=state.inventory.glock.ammo;
  frames(1,65000);assert.equal(qa.get().waveDelay,frozenDelay);assert.equal(qa.get().runTime,frozenTime);
  assert.equal(qa.get().inventory.glock.ammo,ammo,'Reading stats cannot advance combat');readout(1);
  const acquire=gameCanvas.requestPointerLock;
  gameCanvas.requestPointerLock=()=>{throw new Error('Capture denied in pause stats test');};
  elements.get('resume').onclick();assert.equal(qa.get().mode,'paused');readout(1);
  gameCanvas.requestPointerLock=acquire;resume();
  choose(9,'resist');readout(1);resume();
  for(let rank=2;rank<=11;rank++){
    choose(4+rank*5,'embrace');readout(rank);
    if(rank===3)assert.equal(elements.get('pauseCurseTitle').textContent,'The Forsaken');
    if(rank>=6)assert.equal(elements.get('pauseCurseTitle').textContent,'Endless Corruption');
    resume();
  }
  qa.hurtPlayer(200000,qa.get().player);assert.equal(qa.get().mode,'dead');readout(11);
  qa.start({capture:false});readout(0);resume();qa.start();
  console.log('PASS: pause curse rank/title and five current modifiers from Uncursed through Rank 11, real bell choices, resist, speed/special caps, reset/death/capture retry, unchanged paused timers, cached stat nodes and restored mouse lock.');
}
