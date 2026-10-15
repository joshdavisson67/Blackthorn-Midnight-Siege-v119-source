import {BRUTE} from './brute.mjs?v=30';
// Living actors use upright collision cylinders. Corpses immediately free a lane.
export const PLAYER_RADIUS=.32;
export function enemyBody({brute=false,dog=false,rareDog=false}={}){
  return {radius:brute?BRUTE.radius:rareDog?.34:dog?.30:.38,height:brute?BRUTE.height:dog?(rareDog?1:.85):1.8};
}
export function createCrowd(enemies,player){
  const overlapsHeight=(y,height,p,h)=>y<p.y+h-.01&&y+height>p.y+.01;
  function intersects(x,z,y,radius,height,other,origin){
    const p=other.walkPos;if(!overlapsHeight(y,height,p,other.bodyHeight))return false;
    const r=radius+other.radius,d2=(x-p.x)**2+(z-p.z)**2;
    if(d2>=r*r-1e-8)return false;
    // A teleported/debug actor may start overlapped; allow only outward movement.
    return !origin||d2<(origin.x-p.x)**2+(origin.z-p.z)**2-1e-10;
  }
  const playerBody={walkPos:player,radius:PLAYER_RADIUS,bodyHeight:1.8};
  return {
    canOccupy(x,z,y,radius,height,ignore=null,origin=null){
      for(const other of enemies)if(other!==ignore&&!other.dead&&intersects(x,z,y,radius,height,other,origin))return false;
      if(ignore&&intersects(x,z,y,radius,height,playerBody,origin))return false;
      return true;
    },
    density(x,z,y,ignore){
      let cost=0;
      for(const other of enemies){
        if(other===ignore||other.dead||Math.abs(other.walkPos.y-y)>.8)continue;
        const d2=(x-other.walkPos.x)**2+(z-other.walkPos.z)**2;
        if(d2<2.25)cost+=(2.25-d2)/2.25;
      }
      return cost;
    },
    steer(e,dx,dz){
      let lateral=0;
      for(const other of enemies){
        if(other===e||other.dead||!overlapsHeight(e.walkPos.y,e.bodyHeight,other.walkPos,other.bodyHeight))continue;
        const ox=other.walkPos.x-e.walkPos.x,oz=other.walkPos.z-e.walkPos.z;
        const distance=Math.hypot(ox,oz),comfort=e.radius+other.radius+.6;
        if(distance>.001&&distance<comfort&&ox*dx+oz*dz>0){
          const side=ox*(-dz)+oz*dx;
          lateral+=(Math.abs(side)<.04?e.routeSide:-Math.sign(side))*(1-distance/comfort)*1.25;
        }
      }
      lateral=Math.max(-.9,Math.min(.9,lateral));
      const length=Math.hypot(1,lateral);
      e.steerX=(dx-dz*lateral)/length;e.steerZ=(dz+dx*lateral)/length;
    },
  };
}
