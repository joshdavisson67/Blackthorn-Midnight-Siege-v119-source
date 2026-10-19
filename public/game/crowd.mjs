import {BRUTE} from './brute.mjs?v=30';
// Living actors use upright collision cylinders. Corpses immediately free a lane.
export const PLAYER_RADIUS=.32;
export function enemyBody({brute=false,dog=false,rareDog=false}={}){
  return {radius:brute?BRUTE.radius:rareDog?.34:dog?.30:.38,height:brute?BRUTE.height:dog?(rareDog?1:.85):1.8};
}
// Crowd spreading (v123). Close to the player, enemies with a clear path
// share out approach angles, so a follower fans around the one ahead and the
// group arrives as a ring rather than a queue. On routes, neighbours on either
// side push apart, so open rooms carry two or three abreast. A small personal
// sway and lateral shoulder-shoving make the press feel alive. Bodies still
// never overlap, the player never pushes, and stairs still jam.
export const SPREAD=Object.freeze({
  engage:12,          // metres; matches the clear-path check radius
  ring:1.15,          // closest slot radius (attack contact is ~1.03)
  gap:.16,            // shoulder room between neighbours on an arc
  lookahead:2.4,      // slot target sits this far inward of the enemy
  maxShift:1.25,      // radians an enemy may be steered around the player
  flank:.38,          // personal left/right approach bias, radians
  depth:1.8,          // distance difference over which two enemies compete for an arc
  relax:4,            // relaxation passes per plan
  sideways:.85,       // lateral push from neighbours beside or ahead on routes
  sway:.10,           // personal sway amplitude
  shove:.8            // m/s a blocked enemy can shoulder a neighbour sideways
});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
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
    // Share out approach angles among enemies that can see the player.
    plan(playerY){
      const engaged=[];
      for(const e of enemies){
        e.engaged=false;
        if(e.dead||!e.clearPath||Math.abs(e.walkPos.y-playerY)>.55)continue;
        const ox=e.walkPos.x-player.x,oz=e.walkPos.z-player.z,d=Math.hypot(ox,oz);
        if(d>SPREAD.engage||d<.05)continue;
        const bearing=Math.atan2(ox,oz),bias=(e.flank??0)*SPREAD.flank*Math.max(0,Math.min(1,(d-2.5)/4));
        engaged.push({e,d,bearing,angle:bearing+bias,bias});
      }
      for(let pass=0;pass<SPREAD.relax;pass++)for(let i=0;i<engaged.length;i++)for(let j=i+1;j<engaged.length;j++){
        const a=engaged[i],b=engaged[j],near=Math.min(a.d,b.d),overlapDepth=1-Math.abs(a.d-b.d)/SPREAD.depth;
        if(overlapDepth<=0)continue;
        const radius=Math.max(SPREAD.ring,near),need=(a.e.radius+b.e.radius+SPREAD.gap)/radius,diff=wrap(b.angle-a.angle);
        if(Math.abs(diff)>=need)continue;
        // The enemy further out yields most of the arc; ties split by route side.
        const dir=Math.abs(diff)>1e-4?Math.sign(diff):(b.e.routeSide||1),push=(need-Math.abs(diff))*overlapDepth,share=a.d<b.d-.25?.85:b.d<a.d-.25?.15:.5;
        a.angle-=dir*push*(1-share);b.angle+=dir*push*share;
      }
      for(const s of engaged){
        const shift=Math.max(-SPREAD.maxShift,Math.min(SPREAD.maxShift,wrap(s.angle-s.bearing)));
        s.e.engaged=true;s.e.slotShift=shift;s.e.slotBearing=s.bearing;
      }
      return engaged.length;
    },
    // Target point for an engaged enemy: inward along its shared-out angle.
    slotTarget(e,scale=1){
      const ox=e.walkPos.x-player.x,oz=e.walkPos.z-player.z,d=Math.hypot(ox,oz),angle=Math.atan2(ox,oz)+e.slotShift*scale;
      const r=Math.max(SPREAD.ring,d-SPREAD.lookahead);
      // Already on its own arc and close: walk straight in to contact range.
      if(r<=SPREAD.ring+.01&&Math.abs(e.slotShift*scale)<.08)return {x:player.x,z:player.z};
      return {x:player.x+Math.sin(angle)*r,z:player.z+Math.cos(angle)*r};
    },
    steer(e,dx,dz,time=0){
      let lateral=0,ahead=0,company=0;
      for(const other of enemies){
        if(other===e||other.dead||!overlapsHeight(e.walkPos.y,e.bodyHeight,other.walkPos,other.bodyHeight))continue;
        const ox=other.walkPos.x-e.walkPos.x,oz=other.walkPos.z-e.walkPos.z;
        const distance=Math.hypot(ox,oz),comfort=e.radius+other.radius+.6;
        if(distance<=.001||distance>=comfort)continue;
        company++;
        const forward=(ox*dx+oz*dz)/distance,side=ox*(-dz)+oz*dx,weight=1-distance/comfort;
        if(forward>0){
          lateral+=(Math.abs(side)<.04?e.routeSide:-Math.sign(side))*weight*1.25;ahead=Math.max(ahead,forward*weight);
        }else if(forward>-.5){
          // Shoulder to shoulder: drift apart rather than walking in lockstep.
          lateral-=Math.sign(side||e.routeSide)*weight*SPREAD.sideways*.5;
        }
      }
      // Crowded ahead: prefer this enemy's own side, so groups go two abreast.
      if(ahead>.15)lateral+=(e.routeSide||1)*ahead*SPREAD.sideways*.4;
      // Sway only in company: a lone enemy on a narrow landing walks its line.
      if(company)lateral+=SPREAD.sway*Math.sin(time*1.9+(e.phase??0)*6.283);
      lateral=Math.max(-.9,Math.min(.9,lateral));
      const length=Math.hypot(1,lateral);
      e.steerX=(dx-dz*lateral)/length;e.steerZ=(dz+dx*lateral)/length;
    },
  };
}
