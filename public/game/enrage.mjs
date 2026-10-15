export const ENRAGE=Object.freeze({radius:6,chance:.15,speedMultiplier:2,damageMultiplier:1.25});

export function enrageEnemy(enemy,onEnrage=()=>{}){
  if(enemy.dead||enemy.enraged)return false;
  enemy.enraged=true;enemy.speed*=ENRAGE.speedMultiplier;onEnrage(enemy);return true;
}

// Each death rolls once for each nearby living, not-yet-enraged enemy.
// This permanent state never stacks, and keeps the existing wave/type speed.
export function enrageNearby(casualty,enemies,random=Math.random,onEnrage=()=>{}){
  if(!casualty.dead||casualty.enrageTriggered)return 0;
  casualty.enrageTriggered=true;
  const origin=casualty.walkPos;let count=0;
  for(const enemy of enemies){
    if(enemy===casualty||enemy.dead||enemy.enraged)continue;
    const p=enemy.walkPos,dx=p.x-origin.x,dy=p.y-origin.y,dz=p.z-origin.z;
    if(dx*dx+dy*dy+dz*dz>ENRAGE.radius*ENRAGE.radius||random()>=ENRAGE.chance)continue;
    if(enrageEnemy(enemy,onEnrage))count++;
  }
  return count;
}
