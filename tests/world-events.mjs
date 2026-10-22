import assert from 'node:assert/strict';
import {createWorldEvents,EVENT_RULES} from '../public/game/world-events.mjs';
import {EVENT_VISUAL_BUDGET} from '../public/game/world-event-visuals.mjs';
import {isBlocked} from '../public/game/core.mjs';
import {enrageNearby} from '../public/game/enrage.mjs';

export function verifyWorldEvents(qa,frames,listeners,elements){
  const graves=Array.from({length:14},(_,i)=>({x:59+i,z:1}));
  let rolls=0;const calls=[],event=createWorldEvents({graves,random:()=>{rolls++;return 0;},onWarning:id=>calls.push('warning:'+id),onStart:id=>calls.push('start:'+id),onEnd:(id,reason)=>calls.push(reason+':'+id)});
  for(let w=1;w<3;w++)assert(!event.beginWave(w));assert.equal(rolls,0);
  assert(event.beginWave(3));assert.equal(event.phase,'scheduled');assert.equal(event.lastEventWave,3);assert.equal(event.killReward(50),50);
  assert(!event.beginWave(3),'Repeated wave calls cannot roll twice');assert.equal(rolls,3);
  event.update(6.999);assert.equal(event.phase,'scheduled');event.update(.001);assert.equal(event.phase,'warning');assert.deepEqual(calls,['warning:shroud']);
  assert.equal(event.killReward(50),50,'Warnings do not grant the kill bonus');
  event.update(3);assert(event.active('shroud'));assert.equal(event.timeLeft,30);assert.equal(event.fogStrength(),0);assert.equal(event.killReward(50),60);
  event.update(2);assert.equal(event.fogStrength(),1);event.update(27);assert.equal(event.fogStrength(),.5);event.update(1);assert.equal(event.phase,'idle');assert.equal(event.fogStrength(),0);
  assert.equal(event.killReward(50),50,'Shroud expiry removes the kill bonus');
  const count=rolls;assert(!event.beginWave(4));assert.equal(rolls,count,'The wave after an event must not roll');assert(event.beginWave(5));event.endWave();assert(!event.beginWave(6),'Early cancellation still respects consecutive-wave exclusion');
  let successful=0;
  for(let i=0;i<100;i++){const e=createWorldEvents({graves,random:()=>i/100});if(e.beginWave(3))successful++;}
  assert.equal(successful,40);assert(!createWorldEvents({random:()=>.4}).beginWave(3));
  const resettable=createWorldEvents({random:()=>.2});assert(resettable.beginWave(3));resettable.update(11.6);assert(resettable.active('shroud'));resettable.reset();assert.equal(resettable.lastEventWave,-2);assert.equal(resettable.killReward(50),50);
  const sequence=values=>{let i=0;return ()=>values[i++]??.5;};
  const pulse=createWorldEvents({random:sequence([.3999,.3,0])});pulse.beginWave(3);pulse.update(10);assert(pulse.active('surge'));assert.equal(pulse.timeLeft,30);
  assert.equal(pulse.speedMultiplier({}),1.2);assert.equal(pulse.attackRate({}),1.2);
  for(const key of ['brute','dog','rareDog','feral']){assert.equal(pulse.speedMultiplier({[key]:true}),1);assert.equal(pulse.attackRate({[key]:true}),1);}
  for(const [base,boost] of [[50,60],[75,90],[110,132],[200,240]])assert.equal(pulse.killReward(base),boost);
  pulse.update(29.999);assert(pulse.active('surge'));pulse.update(.001);assert.equal(pulse.killReward(50),50);assert.equal(pulse.speedMultiplier({}),1);
  const awakened=[],graveEvent=createWorldEvents({graves,random:sequence([0,.6,0,0,.5,.99]),spawn:task=>{awakened.push(task);return true;}});
  graveEvent.beginWave(3);graveEvent.update(7);assert.equal(graveEvent.phase,'warning');assert.equal(graveEvent.pendingSpawns,6);assert.equal(new Set(graveEvent.marked).size,3);assert.equal(graveEvent.killReward(50),50);
  graveEvent.update(3.999);assert.equal(awakened.length,0);graveEvent.update(.001);assert.equal(graveEvent.phase,'active');assert.equal(graveEvent.killReward(50),60);
  for(let i=0;i<7;i++)graveEvent.update(.8);assert.equal(awakened.length,6);assert(graveEvent.active('awakening'),'The kill bonus outlasts the last reinforcement');assert(graveEvent.badge().includes('s</b>'));
  graveEvent.update(30-5.6-.001);assert(graveEvent.active('awakening'));graveEvent.update(.002);assert.equal(graveEvent.phase,'idle');assert(awakened.every(task=>graves.includes(task.grave)));assert.equal(graveEvent.killReward(50),50,'Awakening completion removes the kill bonus');
  assert.equal(EVENT_RULES.aliveLimit,32);
  console.log('PASS: wave-3 / exact 40% eligibility, one roll per wave, no consecutive events, advance warnings, full 30s durations for every event, all-event active-only kill bonuses and exactly six marked-grave reinforcements.');

  function ready(kind){
    qa.setEventRandom(()=>1);qa.start();qa.setHealth(100000);qa.setPlayer(0,23);
    for(let i=0;i<2;i++)qa.startWave();qa.setEventRandom(sequence([0,{shroud:0,surge:.3,awakening:.6,blackout:.9}[kind],0,0,.4,.8]));qa.startWave();assert.equal(qa.get().wave,3);qa.holdSpawns();return qa.get().worldEvents;
  }
  const lightIds=()=>{const ids=[];qa.get().scene.traverse(o=>{if(o.isLight)ids.push(o.uuid);});return ids.sort();};
  const quiet=fn=>{const old=Math.random;try{Math.random=()=>.99;return fn();}finally{Math.random=old;}};
  const lights=lightIds(),shroud=ready('shroud'),fog=qa.get().scene.fog;
  shroud.update(7);frames(1);assert(elements.get('eventStatus').textContent.includes('THE SHROUD'));assert(elements.get('eventStatus').textContent.includes('BEGINS IN'));
  shroud.update(3);shroud.update(2);frames(1);assert(fog.density>.05);
  qa.setPlayer(59,1);frames(1);assert(fog.density>.06,'Cemetery gets the densest fog');
  for(const [x,z,y] of [[0,0,0],[16,-5,4.25],[70,-12,0]]){qa.setPlayer(x,z,y);frames(1);assert.equal(fog.density,.014,'Indoor rooms and mausoleum stay clear');}
  qa.setPlayer(0,23);frames(1);const frozen=shroud.timeLeft;
  listeners.keydown({code:'Escape'});frames(90);assert.equal(shroud.timeLeft,frozen,'Pause freezes event time');elements.get('resume').onclick();frames(1);assert(shroud.timeLeft<frozen);
  shroud.update(40);frames(1);assert.equal(fog.density,.014);assert.equal(elements.get('eventStatus').innerHTML,'');assert.deepEqual(lightIds(),lights);

  function travel({boost=false,rage=false,frenzy=false}={}){
    const ev=ready('surge');if(boost)ev.update(10);const e=qa.makeZombie(0,17);e.speed=2;e.flank=0;
    if(rage)enrageNearby({dead:true,walkPos:e.walkPos},[e],()=>0,qa.get().enemyAssets.enrage);
    if(frenzy){qa.triggerFrenzy();qa.holdSpawns();}frames(12);return {distance:e.walkPos.z-17,storedSpeed:e.speed};
  }
  const ordinary=travel(),boosted=travel({boost:true}),combined=travel({boost:true,rage:true,frenzy:true});
  assert(Math.abs(boosted.distance/ordinary.distance-1.2)<.01);assert.equal(boosted.storedSpeed,2);
  assert(Math.abs(combined.distance/ordinary.distance-3.36)<.02);assert.equal(combined.storedSpeed,4,'Only persistent enrage modifies stored speed');
  for(const kind of ['shroud','surge','awakening','blackout']){
    const rewards=ready(kind);rewards.update(kind==='awakening'?11:10);assert(rewards.active(kind));
    assert(rewards.badge().includes('+20% KILL ESSENCE'),'Every active event advertises the kill bonus');
    const survivor=qa.makeZombie(10,20),hitBefore=qa.get().totalScore;quiet(()=>qa.damageEnemy(survivor,1));assert.equal(qa.get().totalScore-hitBefore,10,'The event never increases hit essence');
    for(const [args,head,expected] of [[[],false,60],[[],true,90],[[true],false,132],[[true],true,240],[[false,true],false,60],[[false,true,true],false,60],[[false,false,false,0,true],false,60]]){
      const s=qa.get(),e=qa.makeZombie(10,20,...args),before=s.totalScore,points=s.points;quiet(()=>qa.damageEnemy(e,100000,head));assert.equal(qa.get().totalScore-before,expected+10,`Hit reward stays ten; ${kind} adds 20% only to the kill`);assert.equal(qa.get().points-points,expected+10,'Spendable essence and earned score receive the same bonus');
    }
    rewards.endWave();const plain=qa.makeZombie(10,20),before=qa.get().totalScore;quiet(()=>qa.damageEnemy(plain,100000));assert.equal(qa.get().totalScore-before,60,'Ending an event removes its kill bonus');
  }
  // ---- Blackout: every estate light dies; the flashlight and enemy eyes stay ----------------------
  {
    const unit=createWorldEvents({random:sequence([0,.9,0])});assert(unit.beginWave(3));unit.update(7);assert.equal(unit.id,'blackout');assert.equal(unit.phase,'warning');
    let flicker=0;for(let i=0;i<30;i++){unit.update(.1);flicker=Math.max(flicker,unit.darkness());assert(unit.darkness()<=.45,'Warnings only flicker the lamps');}
    assert(flicker>.1,'The lamps visibly gutter during the warning');assert(unit.active('blackout'));assert.equal(unit.timeLeft,30);assert.equal(unit.killReward(50),60);
    assert(unit.darkness()<.05,'The lights stutter out rather than vanish in one frame');unit.update(1.4);assert.equal(unit.darkness(),1);
    unit.update(26.5);assert.equal(unit.darkness(),1);unit.update(1);assert(unit.darkness()<1,'They sputter back near the end');unit.update(1.1);assert.equal(unit.phase,'idle');assert.equal(unit.darkness(),0);
    assert(unit.badge()==='');
    const s=()=>qa.get(),ev=ready('blackout'),eyesOn=qa.makeZombie(6,14);let eyes=null;eyesOn.group.traverse(o=>{if(o.isMesh&&o.material.userData.enemyEyes)eyes=o.material;});
    const base={moon:s().moonlight.intensity,hemi:s().hemisphere.intensity,env:s().scene.environmentIntensity,flash:s().flashlight.intensity,eyes:eyes.emissiveIntensity,fog:s().scene.fog.color.getHex()};
    frames(1);assert(s().environmentLights.lights.some(l=>l.intensity>0),'Lamps light the grounds before the blackout');
    ev.update(7);frames(1);assert(elements.get('eventStatus').textContent.includes('BLACKOUT'));ev.update(3);ev.update(2);frames(1);
    assert(ev.active('blackout')&&ev.darkness()===1);
    assert.equal(s().moonlight.intensity,0,'Moonlight is out');assert(Math.abs(s().hemisphere.intensity-base.hemi*.04)<1e-9,'Only a trace of ambient remains');
    assert(s().scene.environmentIntensity<base.env*.05);assert(s().environmentLights.lights.every(l=>l.intensity===0),'Every lamp, candle and fire light is dark');
    assert.equal(s().skyMat.uniforms.skyLight.value,.22);assert.notEqual(s().scene.fog.color.getHex(),base.fog);
    const reg=s().blackout.registry;assert(reg.emissive.size>=5,'Lamp bulbs, windows and glowing fixtures are dimmed');for(const m of reg.emissive.keys())assert.equal(m.emissiveIntensity,0);
    for(const [m] of reg.glows)assert.equal(m.color.getHex(),0,'Candle and lamp glows go dark');
    assert(reg.particles.size>0&&[...reg.particles].every(([m,o])=>Math.abs(m.opacity-o*.15)<1e-9),'Rain and dust stop glowing in the dark');
    assert.equal(s().flashlight.intensity,base.flash,'The flashlight is untouched');assert.equal(eyes.emissiveIntensity,base.eyes,'Enemy eyes still glow');
    for(const p of s().eventVisuals.coins)assert(!reg.emissive.has(p.mesh.material),'Event essence keeps its glow');
    assert.deepEqual(lightIds(),lights,'No lights are added or removed');
    const killScore=s().totalScore;quiet(()=>qa.damageEnemy(eyesOn,1e6));assert.equal(s().totalScore-killScore,70,'Blackout kills earn 20% more essence');
    // Pause freezes it; expiry restores every light exactly.
    listeners.keydown({code:'Escape'});const frozen=ev.timeLeft;frames(60);assert.equal(ev.timeLeft,frozen);elements.get('resume').onclick();frames(1);
    ev.update(40);frames(1);assert.equal(ev.phase,'idle');
    assert.equal(s().moonlight.intensity,base.moon);assert.equal(s().hemisphere.intensity,base.hemi);assert.equal(s().scene.environmentIntensity,base.env);assert.equal(s().scene.fog.color.getHex(),base.fog);assert.equal(s().skyMat.uniforms.skyLight.value,1);
    for(const [m,r] of reg.emissive)assert.equal(m.emissiveIntensity,r.base);for(const [m,c] of reg.glows)assert(m.color.equals(c));for(const [m,o] of reg.particles)assert.equal(m.opacity,o);
    assert(s().environmentLights.lights.some(l=>l.intensity>0),'The lamps come back on');
    // A new run during a blackout restores the lights too.
    const again=ready('blackout');again.update(12);frames(1);assert.equal(s().moonlight.intensity,0);qa.start();frames(1);assert.equal(s().moonlight.intensity,base.moon);assert.equal(s().blackout.level,0);
  }
  console.log('PASS: Blackout warning flicker, stuttering 30s blackout of moon/sky/ambient/lamps/glows with flashlight and enemy eyes untouched, +20% kill essence, pause, exact restoration on expiry and on restart, fixed light signature.');
  console.log('PASS: real wave-3 events, outdoor-only fog and restoration, paused countdown, 20% walker movement, 3.36x rage/frenzy combination, and all-event body/headshot essence for every enemy type without changing hit rewards.');

  const awakening=ready('awakening');awakening.update(7);qa.clearQueuedSpawns();frames(1);assert.equal(qa.get().waveDelay,0,'Marked grave reinforcements keep an otherwise empty wave open');assert.equal(awakening.pendingSpawns,6);assert(qa.get().eventVisuals.markers.every(m=>m.group.visible));
  const blockers=Array.from({length:32},(_,i)=>{const e=qa.makeZombie(-25+i%8*2,22+Math.floor(i/8)*2);e.speed=0;return e;});
  awakening.update(4);awakening.update(.01);assert.equal(awakening.pendingSpawns,6,'Crowded world must hold every queued reinforcement');
  const activeScore=qa.get().totalScore;quiet(()=>qa.damageEnemy(blockers[0],100000));assert.equal(qa.get().totalScore-activeScore,70,'A kill during active Grave Awakening earns 60 kill essence plus the usual 10 hit essence');awakening.update(.8);assert.equal(awakening.pendingSpawns,5);assert.equal(qa.get().zombies.filter(e=>!e.dead).length,32);
  listeners.keydown({code:'Escape'});const pending=awakening.pendingSpawns;frames(90);assert.equal(awakening.pendingSpawns,pending);elements.get('resume').onclick();
  for(const e of blockers.slice(1))quiet(()=>qa.damageEnemy(e,100000));
  for(let i=0;i<12&&awakening.pendingSpawns;i++)awakening.update(.81);
  assert.equal(awakening.pendingSpawns,0);const born=qa.get().zombies.filter(e=>e.graveBorn);assert.equal(born.length,6);
  for(const e of born){assert(e.emergeLeft>0);assert(e.group.position.y<-1);assert(!isBlocked(e.walkPos.x,e.walkPos.z,e.radius,qa.get().colliders,undefined,0,1.8));assert(qa.get().nav.direction(e.walkPos.x,e.walkPos.z,0)?.reachable);assert(e.walkPos.x>=54&&e.walkPos.x<=80);e.speed=0;}
  frames(80);assert(born.every(e=>e.emergeLeft===0&&e.group.position.y>-.1),'Grave zombies actually rise out of the ground');
  assert(awakening.active('awakening'),'The 30-second bonus outlasts the rising');
  for(const e of born){const score=qa.get().totalScore;quiet(()=>qa.damageEnemy(e,100000));assert.equal(qa.get().totalScore-score,70,'Risen dead killed inside the 30s window still earn the event bonus');const count=qa.get().pickups.length;qa.damageEnemy(e,100000);assert.equal(qa.get().pickups.length,count,'A repeated death cannot drop essence twice');}
  assert.equal(qa.get().pickups.filter(p=>p.type==='essence').length,6);frames(1);assert(qa.get().waveDelay>0,'The wave clears after the final grave zombie is killed');assert.equal(awakening.phase,'idle');
  const bonusBefore=qa.get().totalScore;for(const p of [...qa.get().pickups]){qa.setPlayer(p.mesh.position.x,p.mesh.position.z);frames(1);}
  assert.equal(qa.get().totalScore-bonusBefore,150);assert.equal(qa.get().pickups.length,0);assert(qa.get().eventVisuals.coins.every(p=>!p.mesh.visible));assert.deepEqual(lightIds(),lights);
  const visuals=qa.get().eventVisuals;
  for(let i=0;i<30;i++)visuals.dropEssence(30+i,25,0,qa.get().pickups);
  assert.equal(qa.get().pickups.length,EVENT_VISUAL_BUDGET.essence);assert.equal(new Set(qa.get().pickups).size,EVENT_VISUAL_BUDGET.essence);
  assert.equal(visuals.geometries.length,3);visuals.root.traverse(o=>{if(o.isMesh){assert(!o.castShadow);assert(!o.material.map);assert(o.matrixAutoUpdate,'Reusable event meshes stay unfrozen');}});
  qa.start();assert.equal(qa.get().pickups.length,0);assert.equal(qa.get().worldEvents.phase,'idle');assert.equal(qa.get().worldEvents.lastEventWave,-2);assert(visuals.coins.every(p=>!p.mesh.visible));
  const canceled=ready('awakening');canceled.update(7);qa.setHealth(1);qa.hurtPlayer(100);assert.equal(qa.get().mode,'dead');assert.equal(canceled.pendingSpawns,0);assert.equal(canceled.phase,'idle');frames(60);assert(!qa.get().zombies.some(e=>e.graveBorn));
  assert(elements.get('guideSurvival').textContent.includes('40%'));assert(elements.get('guideSurvival').textContent.includes('From wave 3'));assert(elements.get('guideSurvival').textContent.includes('All four events last 30 seconds'));assert(elements.get('guideSurvival').textContent.includes('Blackout · 30 seconds'));assert(elements.get('guideSurvival').textContent.includes('Grave Awakening'));
  qa.setEventRandom(()=>1);qa.start();
  console.log('PASS: warned grave emergence, safe cemetery routes, 32-enemy cap, queued pause, six single-use gold drops / 150 collected bonus, bounded reuse, no new lights/textures/shadows, and death/restart cleanup.');
}
