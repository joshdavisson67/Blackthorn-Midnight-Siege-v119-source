// Small, shared profiles: firing only changes numbers and existing transforms.
export const COMBAT=Object.freeze(Object.fromEntries(Object.entries({
  glock:{kick:.022,yaw:.0035,back:.047,lift:.14,recovery:15,ads:.62,stagger:24,force:.85},
  rifle:{kick:.010,yaw:.0025,back:.026,lift:.070,recovery:17,ads:.55,stagger:16,force:.75},
  smg:{kick:.0065,yaw:.004,back:.020,lift:.050,recovery:21,ads:.58,stagger:9,force:.55},
  lmg:{kick:.017,yaw:.003,back:.042,lift:.110,recovery:11,ads:.55,stagger:34,force:1.15},
  shotgun:{kick:.047,yaw:.006,back:.086,lift:.240,recovery:8.5,ads:.60,stagger:54,force:2},
  bushmaster:{kick:.038,yaw:.003,back:.066,lift:.180,recovery:10,ads:.30,stagger:48,force:1.65},
}).map(([key,value])=>[key,Object.freeze(value)])));

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const SWAY=[-.8,.45,.9,-.35,.6,-.7];
const RECOIL_COMPONENTS=['pitch','yaw','back','lift'];
const STAGGER={
  brute:Object.freeze({threshold:220,duration:.28,cooldown:1.9}),
  feral:Object.freeze({threshold:85,duration:.22,cooldown:1.5}),
  rareDog:Object.freeze({threshold:65,duration:.24,cooldown:1.5}),
  dog:Object.freeze({threshold:50,duration:.24,cooldown:1.3}),
  zombie:Object.freeze({threshold:60,duration:.32,cooldown:1.4}),
};
export function createWeaponRecoil(){
  const state={pitch:0,yaw:0,back:0,lift:0,recovery:15,sequence:0};
  return Object.assign(state,{
    fire(weapon,ads=false){
      const p=COMBAT[weapon],scale=ads?p.ads:1;
      state.recovery=p.recovery;
      state.pitch=clamp(state.pitch+p.kick*scale,0,.14);
      state.yaw=clamp(state.yaw+p.yaw*SWAY[state.sequence++%SWAY.length]*scale,-.035,.035);
      state.back=clamp(state.back+p.back,0,.13);state.lift=clamp(state.lift+p.lift,0,.32);
    },
    update(dt){
      const decay=Math.exp(-dt*state.recovery);
      for(const key of RECOIL_COMPONENTS){
        state[key]*=decay;if(Math.abs(state[key])<.00001)state[key]=0;
      }
    },
    reset(){state.pitch=state.yaw=state.back=state.lift=state.sequence=0;},
  });
}

export function staggerLimits(enemy){
  return STAGGER[enemy.brute?'brute':enemy.feral?'feral':enemy.rareDog?'rareDog':enemy.dog?'dog':'zombie'];
}

export function advanceStagger(enemy,dt){
  enemy.staggerLeft=Math.max(0,(enemy.staggerLeft||0)-dt);
  enemy.staggerCooldown=Math.max(0,(enemy.staggerCooldown||0)-dt);
  enemy.staggerMeter=Math.max(0,(enemy.staggerMeter||0)-dt*14);
}

export function registerStagger(enemy,impact={}){
  const strength=COMBAT[impact.source]?.stagger??(impact.source==='grenade'?95:0);
  if(!strength||enemy.dead||enemy.hp<=0||enemy.staggerCooldown>0)return false;
  const weight=impact.part==='head'?2.5:impact.part==='leg'?1.2:impact.part==='arm'?.85:1;
  const amount=strength*weight;
  let contribution=amount;
  // A shotgun shell has one stagger budget, even if all eight pellets connect.
  // A later head pellet can increase that budget, rather than adding it again.
  if(impact.shotId!==undefined){
    if(enemy.staggerShotId===impact.shotId)contribution=Math.max(0,amount-enemy.staggerShotStrength);
    else{enemy.staggerShotId=impact.shotId;enemy.staggerShotStrength=0;}
    enemy.staggerShotStrength=Math.max(enemy.staggerShotStrength,amount);
  }
  enemy.staggerMeter=(enemy.staggerMeter||0)+contribution;
  const limits=enemy.staggerProfile||staggerLimits(enemy);
  if(enemy.staggerMeter<limits.threshold)return false;
  enemy.staggerMeter=0;enemy.staggerLeft=limits.duration;enemy.staggerCooldown=limits.duration+limits.cooldown;enemy.staggerPart=impact.part||'torso';
  enemy.attackTime=-1;enemy.attack=Math.max(enemy.attack||0,limits.duration+.35);
  return true;
}

export function damageBearing(player,source,yaw){
  const angle=Math.atan2(source.x-player.x,player.z-source.z)+yaw;
  return Math.atan2(Math.sin(angle),Math.cos(angle));
}

export function createCombatHud({hit,headshot,directions,toggle}){
  let enabled=true,headTime=0,soundLock=0,hitShot,hitHead=false;
  try{enabled=localStorage.getItem('blackthorn-headshot-indicator')!=='off';}catch{}
  const markers=Array.from({length:4},()=>{
    const node=directions.ownerDocument.createElement('i');node.className='damageIndicator';node.setAttribute('aria-hidden','true');
    node.style.opacity='0';directions.append(node);
    return {node,x:0,z:0,left:0,angle:0,opacity:0};
  });
  function setting(){
    toggle.setAttribute('aria-checked',String(enabled));toggle.querySelector('[data-headshot-setting]').textContent=enabled?'ON':'OFF';
    headshot.style.opacity=enabled&&headTime>0?'1':'0';
  }
  toggle.onclick=()=>{enabled=!enabled;setting();try{localStorage.setItem('blackthorn-headshot-indicator',enabled?'on':'off');}catch{}};
  setting();
  return {
    markers,
    hit(head,shotId){
      if(shotId===undefined||shotId!==hitShot){hitShot=shotId;hitHead=!!head;}else hitHead=hitHead||!!head;
      if(head)headTime=.38;
      hit.setAttribute('data-headshot',String(hitHead));hit.style.color=hitHead?'#f2c879':'#eee';
      headshot.style.opacity=enabled&&headTime>0?'1':'0';
      if(!head||soundLock>0)return false;soundLock=.055;return true;
    },
    hurt(player,source,yaw,shielded=false){
      if(!source||!Number.isFinite(source.x)||!Number.isFinite(source.z)||Math.hypot(source.x-player.x,source.z-player.z)<.01)return;
      const angle=damageBearing(player,source,yaw);
      const same=markers.find(m=>m.left>0&&Math.abs(Math.atan2(Math.sin(m.angle-angle),Math.cos(m.angle-angle)))<.3);
      const marker=same||markers.reduce((a,b)=>a.left<b.left?a:b);
      marker.x=source.x;marker.z=source.z;marker.left=.85;marker.angle=angle;
      marker.node.setAttribute('data-shielded',String(shielded));
    },
    update(dt,player,yaw){
      headTime=Math.max(0,headTime-dt);soundLock=Math.max(0,soundLock-dt);
      headshot.style.opacity=enabled?String(Math.min(1,headTime/.12)):'0';
      if(headTime===0)hit.setAttribute('data-headshot','false');
      for(const m of markers){
        if(m.left<=0)continue;m.left=Math.max(0,m.left-dt);
        m.angle=damageBearing(player,m,yaw);m.node.style.transform=`translate(-50%,-50%) rotate(${m.angle*180/Math.PI}deg)`;
        const opacity=Math.min(1,m.left/.22);
        if(opacity!==m.opacity){m.node.style.opacity=String(opacity);m.opacity=opacity;}
      }
    },
    reset(){
      headTime=soundLock=0;hitShot=undefined;hitHead=false;hit.setAttribute('data-headshot','false');headshot.style.opacity='0';
      for(const m of markers){m.left=m.opacity=0;m.node.style.opacity='0';}
    },
  };
}
