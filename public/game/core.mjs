import {GRAVEYARD} from './graveyard-layout.mjs?v=28';
import {ESTATE_BOUNDS} from './estate-layout.mjs?v=28';
export const COLLISION_SKIN=.06;
export const weapons={
  glock:{name:'GLOCK 21 / .45 PISTOL',mag:13,reserve:78,damage:32,rate:.24,reload:1.8,pellets:1,spread:.018,aimSpread:.002,semiAuto:true},
  lmg:{name:'WARDEN / BELT-FED LMG',mag:100,reserve:500,damage:62,rate:.09,reload:5.2,pellets:1,spread:.021,zoom:3},
  rifle:{name:'M4 / ASSAULT RIFLE',mag:30,reserve:180,damage:36,rate:.12,reload:2.3,pellets:1,spread:.013},
  shotgun:{name:'M12 / COMBAT SHOTGUN',mag:8,reserve:56,damage:25,rate:.72,reload:2.8,pellets:8,spread:.072},
  smg:{name:'RAVEN / SUBMACHINE GUN',mag:40,reserve:240,damage:29,rate:.075,reload:2.0,pellets:1,spread:.02},
  bushmaster:{name:'AR-15 / .450 BUSHMASTER',mag:15,reserve:90,damage:72,rate:.25,reload:2.8,pellets:1,spread:.009,aimSpread:.0005,semiAuto:true,zoom:10}
};
export function weaponAimFov(type,baseFov=75){
  const zoom=weapons[type].zoom;
  // Magnification scales the perspective projection, not the angle itself.
  return zoom?2*Math.atan(Math.tan(baseFov*Math.PI/360)/zoom)*180/Math.PI:type==='rifle'?48:56;
}
export function waveConfig(wave){return {count:6+wave*3,health:78+wave*15+Math.max(0,wave-8)*10,speed:Math.min(1.05+wave*.095,2.65),damage:Math.min(18+wave*1.5,40),interval:Math.max(.6,2.1-wave*.08)};}
// Preserve brute priority. From wave 6, one in twenty spawn slots is a rare
// Ashfang, replacing a normal dog slot; ordinary dogs remain more common.
export function enemyKind(wave,spawned){if(wave>=5&&spawned%7===6)return 'brute';if(wave>5&&spawned%20===19)return 'ashfang';return spawned%5===4?'dog':'walker';}
// Static broad phase keeps the larger estate inexpensive to navigate.
export function indexColliders(colliders, cellSize=4){
  const bins=new Map();
  // Estate grid coordinates fit in signed 16-bit cells. Numeric keys avoid
  // creating strings for thousands of repeated ragdoll and AI collision probes.
  const key=(x,z)=>(x<<16)|(z&0xffff);
  for(const c of colliders){
    for(let z=Math.floor((c.z-c.d/2)/cellSize);z<=Math.floor((c.z+c.d/2)/cellSize);z++)
      for(let x=Math.floor((c.x-c.w/2)/cellSize);x<=Math.floor((c.x+c.w/2)/cellSize);x++){
        const k=key(x,z);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(c);
      }
  }
  // Allocation-free hot path. Rechecking a boundary collider in an adjacent
  // bin is cheaper than constructing a Set for every particle and AI sample.
  colliders.blockedAt=(x,z,r,y,height)=>{
    for(let zz=Math.floor((z-r)/cellSize);zz<=Math.floor((z+r)/cellSize);zz++)
      for(let xx=Math.floor((x-r)/cellSize);xx<=Math.floor((x+r)/cellSize);xx++){
        const list=bins.get(key(xx,zz));if(!list)continue;
        for(const c of list)if(overlaps(c,x,z,r,y,height))return true;
      }
    return false;
  };
  colliders.query=(x,z,r)=>{
    const found=new Set();
    for(let zz=Math.floor((z-r)/cellSize);zz<=Math.floor((z+r)/cellSize);zz++)
      for(let xx=Math.floor((x-r)/cellSize);xx<=Math.floor((x+r)/cellSize);xx++)
        for(const c of bins.get(key(xx,zz))||[])found.add(c);
    return found;
  };
  return colliders;
}
// Stair rails follow the walking slope instead of stacking rectangular barriers.
// Use the same local top for horizontal clearance and vertical landings.
export function colliderTop(c,z){return c.slope===undefined?(c.maxY??3.8):c.topY+c.slope*(Math.max(c.z-c.d/2,Math.min(z,c.z+c.d/2))-c.z);}
function overlaps(c,x,z,r,y,height){
  if(c.disabled)return false;
  const top=colliderTop(c,z),bottom=c.slope===undefined?(c.minY??0):top-c.topY+c.baseY-.25;
  if(y+COLLISION_SKIN>=top||y+height<=bottom)return false;
  const nx=Math.max(c.x-c.w/2,Math.min(x,c.x+c.w/2)),nz=Math.max(c.z-c.d/2,Math.min(z,c.z+c.d/2));
  return (nx-x)**2+(nz-z)**2<r*r;
}
export function isBlocked(x,z,r,colliders,bounds=ESTATE_BOUNDS,y=0,height=1.8){
  if(x-r<bounds.minX||x+r>bounds.maxX||z-r<bounds.minZ||z+r>bounds.maxZ)return true;
  if(bounds===ESTATE_BOUNDS&&x+r>54&&(z-r<GRAVEYARD.minZ||z+r>GRAVEYARD.maxZ))return true;
  if(colliders.blockedAt)return colliders.blockedAt(x,z,r,y,height);
  for(const c of colliders)if(overlaps(c,x,z,r,y,height))return true;
  return false;
}
export function buildNavigation(colliders,bounds=ESTATE_BOUNDS,y=0,radius=.44,height=1.8){
  const minX=Math.ceil(bounds.minX),minZ=Math.ceil(bounds.minZ);
  const w=Math.floor(bounds.maxX)-minX+1,h=Math.floor(bounds.maxZ)-minZ+1;
  const blocked=new Uint8Array(w*h),distance=new Int32Array(w*h),queue=new Int32Array(w*h);
  for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++)blocked[iz*w+ix]=isBlocked(minX+ix,minZ+iz,radius,colliders,bounds,y,height)?1:0;
  function index(x,z){const ix=Math.round(x-minX),iz=Math.round(z-minZ);return ix<0||ix>=w||iz<0||iz>=h?-1:iz*w+ix;}
  function neighbors(i){const ix=i%w,iz=Math.floor(i/w);return [ix>0?i-1:-1,ix<w-1?i+1:-1,iz>0?i-w:-1,iz<h-1?i+w:-1];}
  return {w,h,minX,minZ,blocked,distance,index,
    rebuild(x,z){
      distance.fill(99999);let target=index(x,z);if(target<0)return;
      if(blocked[target]){let best=Infinity;for(let i=0;i<blocked.length;i++)if(!blocked[i]){
        const d=(i%w+minX-x)**2+(Math.floor(i/w)+minZ-z)**2;if(d<best){best=d;target=i;}
      }}
      let head=0,tail=0;queue[tail++]=target;distance[target]=0;
      while(head<tail){const i=queue[head++];for(const j of neighbors(i))if(j>=0&&!blocked[j]&&distance[j]>distance[i]+1){distance[j]=distance[i]+1;queue[tail++]=j;}}
    },
    direction(x,z){const i=index(x,z);if(i<0)return null;let best=i;
      for(const j of neighbors(i))if(j>=0&&!blocked[j]&&distance[j]<distance[best])best=j;
      return {x:best%w+minX,z:Math.floor(best/w)+minZ,reachable:distance[best]<99999,distance:distance[best]};
    }
  };
}
