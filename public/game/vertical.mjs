import {MAUSOLEUM,inMausoleum,sarcophagusSupport} from './graveyard-layout.mjs?v=28';
import {CELLAR,isCellarOpen,inCellar,cellarStairHeight,cellarSupport} from './cellar-layout.mjs?v=28';
import {isBlocked,buildNavigation,colliderTop,COLLISION_SKIN} from './core.mjs?v=116';
import {ESTATE_BOUNDS} from './estate-layout.mjs?v=28';
export const UPPER_Y=4.3;
export const PREVIOUS_UPPER_HEIGHT=2.32;
export const UPPER_HEIGHT=PREVIOUS_UPPER_HEIGHT*1.25;
export const UPPER_CEILING=UPPER_Y+UPPER_HEIGHT;
export const STAIR={x:-3.9,w:2.35,bottomZ:-2.2,topZ:-9,steps:20};
export const EXTERIOR_STAIRS=[-1,1].map(side=>({
  side,x:side*45,w:2.4,topZ:1.8,bottomZ:10.6,steps:24,
  doorX:side*42,doorWidth:2.6,doorHeight:2.6,
  landing:{x:side*44.35,z:0,w:4.7,d:3.6},
  apron:{x:side*45,z:11.1,w:2.75,d:2.2,topY:.04},
}));
// Olivia's attic (v131): a small garret on the west wing roof above Bella's
// bedchamber. Its pull-down stairs drop through the bedchamber ceiling once
// 25 bone chips are collected. Closed, none of it is reachable.
export const OLIVIA_ATTIC=Object.freeze({
  x:-32,z:-7.8,w:4.8,d:7.2,            // interior footprint
  y:UPPER_CEILING+.55,height:2.45,     // floor sits on the wing roof slab
  stair:Object.freeze({x:-32.4,w:1.3,bottomZ:-3.6,topZ:-7.6,baseY:UPPER_Y,topY:UPPER_CEILING+.55,steps:13,attic:true}),
  hole:Object.freeze({x:-32.4,z:-6.1,w:1.3,d:3.0})
});
let atticOpen=false;
export function isAtticOpen(){return atticOpen;}
export function setAtticOpen(open){atticOpen=!!open;}
export function inAttic(x,z,r=0){const a=OLIVIA_ATTIC;return Math.abs(x-a.x)<=a.w/2-r&&Math.abs(z-a.z)<=a.d/2-r;}
export function inAtticHole(x,z){const h=OLIVIA_ATTIC.hole;return Math.abs(x-h.x)<=h.w/2&&Math.abs(z-h.z)<=h.d/2;}
const stairs=[STAIR,...EXTERIOR_STAIRS];
export const UPPER_TILES=[
  {x:-28,z:0,w:28,d:24},{x:28,z:0,w:28,d:24},
  {x:-9.8,z:0,w:8.4,d:24},{x:9.8,z:0,w:8.4,d:24},
  {x:0,z:-10.5,w:11.2,d:3},{x:0,z:10.5,w:11.2,d:3},
  {x:4.4,z:0,w:2.4,d:18},{x:-4.35,z:3.4,w:2.5,d:11.2},
];
export const UPPER_ROOMS=[
  {name:'WEST BEDCHAMBER',x:-33,z:-6},{name:'DRESSING ROOM',x:-21,z:-7},
  {name:'FAMILY GALLERY',x:-28,z:7},{name:'READING ROOM',x:-10,z:2.5},
  {name:'EAST STUDY',x:21,z:-7},{name:'NURSERY',x:33,z:-6},
  {name:'RELIQUARY',x:28,z:7},{name:'PRIVATE SALON',x:10,z:2.5},
  {name:'UPPER LANDING',x:0,z:-10.5},{name:'FRONT GALLERY',x:0,z:10.5},
];
export const UPPER_SPAWNS=UPPER_ROOMS.flatMap(({x,z})=>[[x,z,UPPER_Y],[x-3,z,UPPER_Y],[x+3,z,UPPER_Y]]);
const inside=(x,z,t)=>Math.abs(x-t.x)<=t.w/2+1e-6&&Math.abs(z-t.z)<=t.d/2+1e-6;
export function hasUpperFloor(x,z,r=0){for(let corner=0;corner<(r?4:1);corner++){const xx=x+(corner&1?r:-r),zz=z+(corner&2?r:-r);let supported=false;for(const t of UPPER_TILES)if(inside(xx,zz,t)){supported=true;break;}if(!supported)for(const s of EXTERIOR_STAIRS)if(inside(xx,zz,s.landing)){supported=true;break;}if(!supported)return false;}return true;}
export function stairAt(x,z){for(const s of stairs)if(Math.abs(x-s.x)<=s.w/2&&z>=s.topZ&&z<=s.bottomZ)return s;const a=OLIVIA_ATTIC.stair;if(atticOpen&&Math.abs(x-a.x)<=a.w/2&&z>=a.topZ&&z<=a.bottomZ)return a;return null;}
export function stairHeight(x,z){const s=stairAt(x,z);if(!s)return null;const f=(s.bottomZ-z)/(s.bottomZ-s.topZ);return s.attic?s.baseY+(s.topY-s.baseY)*f:UPPER_Y*f;}
export function supportBelow(x,z,y=0,step=0,radius=0,colliders=null){
  const cellar=cellarSupport(x,z,y,step);if(cellar!==null)return cellar;
  let h=sarcophagusSupport(x,z,y,step,radius)??0;
  for(const {apron} of EXTERIOR_STAIRS)if(inside(x,z,apron)&&apron.topY<=y+step+1e-6)h=Math.max(h,apron.topY);
  const s=stairHeight(x,z);
  if(s!==null&&s<=y+step+1e-6)h=Math.max(h,s);
  // max(): the attic stairs rise above the second floor (v131).
  if(UPPER_Y<=y+step+1e-6&&hasUpperFloor(x,z))h=Math.max(h,UPPER_Y);
  if(atticOpen&&OLIVIA_ATTIC.y<=y+step+1e-6&&inAttic(x,z)&&!inAtticHole(x,z))h=OLIVIA_ATTIC.y;
  // Rails and low furniture support the whole foot radius so jumps land on
  // their tops and players can step off instead of sinking into the box.
  if(colliders)for(const c of colliders.query?.(x,z,radius)??colliders){
    if((!c.railing&&!c.furnishing)||c.disabled)continue;
    // Horizontal clearance permits this small overlap at a rail's upper edge.
    // Catch it here too, including diagonal entry onto an uphill banister.
    const top=colliderTop(c,z);if(top>y+Math.max(step,COLLISION_SKIN)+1e-6||top<=h)continue;
    const nx=Math.max(c.x-c.w/2,Math.min(x,c.x+c.w/2)),nz=Math.max(c.z-c.d/2,Math.min(z,c.z+c.d/2));
    if((nx-x)**2+(nz-z)**2<radius*radius)h=top;
  }
  return h;
}
export function upperLocation(x,z){for(const s of EXTERIOR_STAIRS)if(inside(x,z,s.landing)||stairAt(x,z)===s)return (s.side<0?'WEST':'EAST')+' EXTERIOR STAIRS';return UPPER_ROOMS.reduce((a,b)=>Math.hypot(a.x-x,a.z-z)<Math.hypot(b.x-x,b.z-z)?a:b).name;}
export function ceilingAt(x,z,y){
  // Up through the open hatch and inside the garret, the attic roof is the limit.
  if(atticOpen&&y>UPPER_Y-.01&&(inAtticHole(x,z)||y>UPPER_CEILING-.3&&inAttic(x,z))){let top=OLIVIA_ATTIC.y+OLIVIA_ATTIC.height;const ramp=stairHeight(x,z);if(ramp!==null&&ramp>y+.31)top=Math.min(top,ramp-.22);return top;}
  if(inMausoleum(x,z))return MAUSOLEUM.ceiling;if(y<-.3&&inCellar(x,z))return -.50;let ceiling=Math.abs(x)<=42&&z>=-12&&z<=12?UPPER_CEILING:Infinity;if(hasUpperFloor(x,z)&&y<UPPER_Y-.01)ceiling=Math.min(ceiling,UPPER_Y-.24);const ramp=stairHeight(x,z);if(ramp!==null&&ramp>y+.31)ceiling=Math.min(ceiling,ramp-.22);return ceiling;}

// Walk the treads as a continuous slope. Height checks reject sideways entry
// onto a tall step, while allowing passage underneath the high end of the flight.
export function moveActor(pos,dx,dz,colliders,{radius=.32,grounded=true,allowFall=true,height=1.8,canOccupy=null}={}){
  function move(x,z){const surface=supportBelow(x,z,pos.y,.30,radius,allowFall?colliders:null),ramp=cellarStairHeight(x,z)??stairHeight(x,z),drop=pos.y-surface;
    if(!grounded&&ramp!==null&&ramp>pos.y+.005)return;
    if(ramp!==null&&ramp>pos.y+.30&&pos.y+height>ramp-.20)return;
    if(grounded&&!allowFall&&drop>.31)return;
    const y=grounded&&Math.abs(surface-pos.y)<=.31?surface:pos.y;
    if(isBlocked(x,z,radius,colliders,ESTATE_BOUNDS,y,height))return;
    if(y+height>ceilingAt(x,z,y))return;
    if(canOccupy&&!canOccupy(x,z,y))return;
    pos.x=x;pos.z=z;if(grounded&&Math.abs(surface-pos.y)<=.31)pos.y=surface;
  }
  // Substeps keep sprinting and diagonal movement from skipping the stair entrance.
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.10));for(let i=0;i<n;i++){move(pos.x+dx/n,pos.z);move(pos.x,pos.z+dz/n);}return pos;
}
export function updateActorHeight(pos,velocity,dt,grounded,height=1.8,radius=.32,colliders=null){
  const support=supportBelow(pos.x,pos.z,pos.y,.02,radius,colliders);
  if(grounded&&Math.abs(pos.y-support)<.031&&velocity<=0){pos.y=support;return {velocity:0,grounded:true};}
  velocity-=11*dt;const previous=pos.y;pos.y+=velocity*dt;
  const floor=supportBelow(pos.x,pos.z,previous,.01,radius,colliders);
  if(pos.y<=floor&&velocity<=0){pos.y=floor;return {velocity:0,grounded:true};}
  const top=ceilingAt(pos.x,pos.z,pos.y)-height;if(pos.y>top){pos.y=top;velocity=Math.min(0,velocity);}
  return {velocity,grounded:false};
}

export function buildVerticalNavigation(colliders,{radius=.44,groundHeight=1.8,upperHeight=1.8}={}){
  const ground=buildNavigation(colliders,ESTATE_BOUNDS,0,radius,groundHeight),upper=buildNavigation(colliders,ESTATE_BOUNDS,UPPER_Y,radius,upperHeight),cellar=buildNavigation(colliders,ESTATE_BOUNDS,CELLAR.y,radius,groundHeight),{w,h,minX,minZ}=ground,n=w*h;
  for(let i=0;i<n;i++)if(!hasUpperFloor(i%w+minX,Math.floor(i/w)+minZ,radius))upper.blocked[i]=1;
  // The flight is a portal between levels, not a flat shortcut underneath it.
  for(let i=0;i<n;i++){const s=stairAt(i%w+minX,Math.floor(i/w)+minZ);if(s)(s.attic?upper:ground).blocked[i]=1;}
  for(let i=0;i<n;i++){const x=i%w+minX,z=Math.floor(i/w)+minZ;if(!isCellarOpen()||!inCellar(x,z,radius))cellar.blocked[i]=1;if(cellarStairHeight(x,z)!==null)ground.blocked[i]=1;}
  const blocked=new Uint8Array(n*3);blocked.set(ground.blocked);blocked.set(upper.blocked,n);blocked.set(cellar.blocked,n*2);
  const distance=new Int32Array(n*3),queue=new Int32Array(n*3);distance.fill(99999);
  const bottom=ground.index(STAIR.x,-2),top=ground.index(STAIR.x,-10)+n;
  const exteriorPortals=EXTERIOR_STAIRS.map(stair=>({stair,bottom:ground.index(stair.x,Math.ceil(stair.bottomZ)),top:ground.index(stair.x,Math.floor(stair.topZ))+n}));
  const cellarTop=ground.index(CELLAR.x,CELLAR.topZ-1),cellarBottom=ground.index(CELLAR.x,CELLAR.bottomZ+1)+n*2;
  function index(x,z,y=0){const i=ground.index(x,z);return i<0?-1:i+(y<-.5?n*2:y>UPPER_Y/2?n:0);}
  function neighbors(i){const layer=Math.floor(i/n)*n,k=i-layer,ix=k%w,iz=Math.floor(k/w),a=[];if(ix>0)a.push(i-1);if(ix<w-1)a.push(i+1);if(iz>0)a.push(i-w);if(iz<h-1)a.push(i+w);if(i===bottom)a.push(top);if(i===top)a.push(bottom);for(const p of exteriorPortals){if(i===p.bottom)a.push(p.top);if(i===p.top)a.push(p.bottom);}if(isCellarOpen()){if(i===cellarTop)a.push(cellarBottom);if(i===cellarBottom)a.push(cellarTop);}return a;}
  const edges=new Int32Array(n*3*5);edges.fill(-1);const degree=new Uint8Array(n*3);
  for(let i=0;i<n*3;i++){const adjacent=neighbors(i);degree[i]=adjacent.length;for(let j=0;j<adjacent.length;j++)edges[i*5+j]=adjacent[j];}
  let previousTarget=-2;
  const point=i=>({x:(i%n)%w+minX,z:Math.floor((i%n)/w)+minZ,y:i>=n*2?CELLAR.y:i>=n?UPPER_Y:0});
  return {w,h,minX,minZ,blocked,distance,index,bottom,top,exteriorPortals,cellarTop,cellarBottom,
    rebuild(x,z,y=0){let target=index(x,z,y);if(target<0){distance.fill(99999);previousTarget=-2;return;}
      if(blocked[target]){let best=Infinity,layer=y<-.5?n*2:y>UPPER_Y/2?n:0;for(let i=layer;i<layer+n;i++)if(!blocked[i]){const p=point(i),d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;target=i;}}}
      if(target===previousTarget)return;previousTarget=target;distance.fill(99999);
      let head=0,tail=0;queue[tail++]=target;distance[target]=0;while(head<tail){const i=queue[head++];for(let edge=0;edge<degree[i];edge++){const j=edges[i*5+edge];if(!blocked[j]&&distance[j]>distance[i]+1){distance[j]=distance[i]+1;queue[tail++]=j;}}}
    },
    direction(x,z,y=0,preference=null){
      if(isCellarOpen()&&(cellarStairHeight(x,z)!==null||(Math.abs(x-CELLAR.x)<CELLAR.stairWidth/2&&z>=CELLAR.topZ-1.5&&z<CELLAR.topZ&&y>-.31&&distance[cellarBottom]<distance[cellarTop])||(Math.abs(x-CELLAR.x)<CELLAR.stairWidth/2&&z>CELLAR.bottomZ&&z<=CELLAR.bottomZ+1.5&&y<-.5&&distance[cellarTop]<distance[cellarBottom]))){const i=distance[cellarBottom]<distance[cellarTop]?cellarBottom:cellarTop;return {...point(i),x:CELLAR.x,reachable:distance[i]<99999,distance:distance[i]+Math.abs((i===cellarTop?CELLAR.topZ:CELLAR.bottomZ)-z)};}
      for(const p of exteriorPortals){const s=p.stair;
        if(stairAt(x,z)===s||(Math.abs(x-s.x)<s.w/2&&y>UPPER_Y-.31&&z>=s.topZ-1.5&&z<s.topZ&&distance[p.bottom]<distance[p.top])){const i=distance[p.top]<distance[p.bottom]?p.top:p.bottom;return {...point(i),x:s.x,reachable:distance[i]<99999,distance:distance[i]+Math.abs((i===p.top?s.topZ:s.bottomZ)-z)};}
      }
      if(stairAt(x,z)===STAIR||(Math.abs(x-STAIR.x)<STAIR.w/2&&y>UPPER_Y-.31&&z>=STAIR.topZ-1.5&&z<STAIR.topZ&&distance[bottom]<distance[top])){const i=distance[top]<distance[bottom]?top:bottom;return {...point(i),x:STAIR.x,reachable:distance[i]<99999,distance:distance[i]+Math.abs((i===top?STAIR.topZ:STAIR.bottomZ)-z)};}
      const i=index(x,z,y);if(i<0)return null;let best=i,bestCost=Infinity;
      for(let edge=0;edge<degree[i];edge++){
        const j=edges[i*5+edge];if(blocked[j]||distance[j]>=distance[i])continue;
        if(!preference){if(distance[j]<distance[best])best=j;continue;}
        const p=point(j);
        // Stable per-enemy tie breaks vary routes without ever walking uphill
        // in the distance field. Occupied lanes lose out to clear alternatives.
        let hash=Math.imul(j^preference.seed,0x45d9f3b);hash^=hash>>>16;
        const cost=distance[j]+(hash>>>0)/4294967296*.65+preference.crowding(p.x,p.z,p.y)*2;
        if(cost<bestCost){bestCost=cost;best=j;}
      }
      return {...point(best),reachable:distance[best]<99999,distance:distance[best]};
    },
  };
}
