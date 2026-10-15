import assert from 'node:assert/strict';
import {POWERUPS,choosePowerup,powerupIcon} from '../public/game/powerups.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';
export function verifyPowerups(qa,frames,listeners,elements){
  assert.deepEqual([choosePowerup(0),choosePowerup(.59),choosePowerup(.6),choosePowerup(.79),choosePowerup(.8),choosePowerup(.99)],['ammo','ammo','double','double','grenades','grenades']);
  const icons=Object.keys(POWERUPS).map(powerupIcon);assert.equal(new Set(icons).size,3);assert(icons[1].includes('×2'));assert(icons[0].includes('<rect'));assert(icons[2].includes('<ellipse')&&icons[2].includes('<circle'));
  qa.start();qa.setHealth(10000);qa.setPlayer(0,20);qa.setGrenades(2);
  const textures=new Set();for(const type of Object.keys(POWERUPS)){const a=qa.get().powerupAssets.create(type),b=qa.get().powerupAssets.create(type);assert(a.userData.icon.isSprite,'Pickup icons must always face the camera');assert(a.userData.model.children.some(c=>c.isMesh),'Pickups have real 3D power models');assert.equal(a.userData.icon.material,b.userData.icon.material,'Repeated drops reuse warmed materials');textures.add(a.userData.icon.material.map);assert(a.userData.icon.material.depthTest&&!a.userData.icon.material.depthWrite);}
  assert.equal(textures.size,3,'Each pickup must use its own distinctive icon texture');
  qa.dropPickup(0,20,'grenades');frames(1);assert(qa.get().grenadeTime>11.9&&qa.get().grenadeTime<=12);
  const thrown=new Set();for(let i=0;i<6;i++){
    assert(qa.grenade());frames(26);thrown.add(qa.get().effects.filter(e=>e.type==='grenade').at(-1));frames(25);
    assert(!qa.get().grenadeThrow.active,'The arm has finished retracting');
    assert(!qa.grenade(),'Infinite throws must wait after the animation finishes');
    if(i===0){
      document.exitPointerLock();const pausedCooldown=qa.get().grenadeCooldown;frames(120);
      assert.equal(qa.get().grenadeCooldown,pausedCooldown,'Pause freezes recovery as well as the buff');elements.get('resume').onclick();
      qa.dropPickup(0,20,'grenades');frames(1);assert(!qa.grenade(),'Refreshing the buff cannot bypass recovery');frames(28);
    }else frames(29);
    assert(!qa.grenade(),'A throw is still blocked immediately before the half-second recovery ends');
    frames(1);
  }assert.equal(thrown.size,6);assert.equal(qa.get().grenades,2,'Unlimited animated throws preserve the stored grenade count');
  qa.setGrenades(0);assert(qa.grenade());frames(26);thrown.add(qa.get().effects.filter(e=>e.type==='grenade').at(-1));frames(55);assert.equal(thrown.size,7,'The bonus works with an empty reserve');
  frames(8);assert(elements.get('reloadStatus').textContent.includes('∞'));assert(elements.get('powerups').textContent.includes('INFINITE GRENADES'));
  document.exitPointerLock();const paused=qa.get().grenadeTime;frames(120);assert.equal(qa.get().grenadeTime,paused,'Pause must freeze the bonus timer');elements.get('resume').onclick();
  frames(360);assert(qa.get().grenadeTime<6);qa.dropPickup(0,20,'grenades');frames(1);assert(qa.get().grenadeTime>11.9&&qa.get().grenadeTime<=12,'Another pickup refreshes, rather than stacks, the 12-second duration');
  qa.dropPickup(0,20,'double');frames(8);assert(qa.get().doubleTime>19.8);assert(elements.get('powerups').textContent.includes('DOUBLE DAMAGE')&&elements.get('powerups').textContent.includes('INFINITE GRENADES'),'Both active bonuses remain visible');
  qa.get().inventory.glock.ammo=0;qa.get().inventory.glock.reserve=0;qa.dropPickup(0,20,'ammo');frames(1);assert.equal(qa.get().inventory.glock.ammo,0);assert.equal(qa.get().inventory.glock.reserve,91);assert.equal(qa.get().reloadLeft,0);assert(qa.get().grenadeTime>11,'Max Ammo must not cancel the grenade bonus');
  qa.setGrenades(0);while(qa.get().grenadeTime>.08)frames(1);assert(qa.get().grenadeTime>0);const before=qa.get().effects.filter(e=>e.type==='grenade').length;assert(qa.grenade());frames(26);assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,before+1,'A free throw begun during the bonus still releases after it expires');frames(25);assert.equal(qa.get().grenadeTime,0);const after=qa.get().effects.filter(e=>e.type==='grenade').length;assert(!qa.grenade());assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,after,'Empty reserves block throws immediately after expiration');
  qa.setGrenades(2);qa.grenade();assert.equal(qa.get().grenades,1,'Normal grenade consumption resumes');frames(7);assert(!elements.get('powerups').textContent.includes('INFINITE GRENADES'));assert(elements.get('powerups').textContent.includes('DOUBLE DAMAGE'));
  qa.start();assert.equal(qa.get().grenadeTime,0);assert.equal(qa.get().grenadeCooldown,0);assert.equal(qa.get().doubleTime,0);assert.equal(elements.get('powerups').textContent,'');
  qa.setPlayer(-21,-7,0);qa.dropPickup(-21,-7,'grenades',UPPER_Y);frames(1);assert.equal(qa.get().grenadeTime,0,'No pickups through floors');qa.setPlayer(-21,-7,UPPER_Y);frames(1);assert(qa.get().grenadeTime>11.9);
  assert(qa.grenade());frames(51);assert(qa.get().grenadeCooldown>0);qa.start();assert.equal(qa.get().grenadeCooldown,0,'Restart clears an unfinished recovery');
  const victim=qa.makeZombie(6,20),random=Math.random,rolls=[.05,.95];try{Math.random=()=>rolls.shift()??.95;qa.damageEnemy(victim,10000);}finally{Math.random=random;}assert(qa.get().pickups.some(p=>p.type==='grenades'),'Enemy kills can award the new grenade pickup');
  console.log('PASS: distinct pickup icons, free throws at zero reserve, 0.5-second recovery after each infinite throw, refresh cannot bypass recovery, paused timers, 12-second expiry, overlapping badges, Max Ammo, reset and floor separation.');
}
