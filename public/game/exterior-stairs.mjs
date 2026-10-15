import * as T from './three.module.js';

// Static steelwork uses the estate's existing metal map and batching. Walking
// heights come from the same flight layout as the visible steps and rails.
export function buildExteriorStairs({world,M,box,colliders,solidMeshes,stairs,y,slab}){
  const group=new T.Group();group.name='Exterior steel stairways';world.add(group);
  const steel=M.dark.clone();steel.name='Weathered stair steel';steel.color.set(0x75838a);steel.roughness=.57;steel.metalness=.7;
  const meshes=[],rails=[],handrails=[],landings=[],aprons=[],flights=[],railHeight=.72,midRailHeight=.34,beam=.065,guardPosts=new Set();
  function block(x,yy,z,w,h,d,material=steel,solid=true){
    const o=box(x,yy,z,w,h,d,material,group);o.userData.exteriorStairs=true;meshes.push(o);
    if(solid)solidMeshes.push(o);return o;
  }
  function guard(x,z,w,d){
    handrails.push(block(x,y+railHeight-beam/2,z,w,beam,d));
    block(x,y+midRailHeight,z,w,.04,d,M.dark);
    const alongX=w>d,length=alongX?w:d,count=Math.ceil(length/.9);
    for(let i=0;i<=count;i++){const off=(i/count-.5)*length,xx=x+(alongX?off:0),zz=z+(alongX?0:off),key=xx.toFixed(4)+':'+zz.toFixed(4);if(!guardPosts.has(key)){guardPosts.add(key);block(xx,y+(railHeight-beam)/2,zz,.045,railHeight-beam,.045);}}
    const c={x,z,w,d,minY:y,maxY:y+railHeight,railing:true,exteriorStairs:true};colliders.push(c);rails.push(c);
  }
  for(const s of stairs){
    const l=s.landing,outer=s.side*(Math.abs(l.x)+l.w/2);
    const deck=block(l.x,y-slab/2,l.z,l.w,slab,l.d);deck.userData.upperFloor=true;landings.push(deck);
    // Steel edge channels and welded deck ribs stay above/below the surface,
    // with no competing coplanar faces at the mansion's floor junction.
    for(const z of [-l.d/2,l.d/2])block(l.x,y-.18,z,l.w,.22,.09,M.dark);
    for(const x of [s.side*43.0,s.side*46.5])for(const z of [-1.68,1.68]){
      block(x,(y-slab)/2,z,.12,y-slab,.12,M.dark);
      colliders.push({x,z,w:.12,d:.12,minY:0,maxY:y-slab,exteriorStairs:true});
      block(x,.025,z,.32,.05,.32,M.dark);
      block(x,y+.012,z,.09,.024,.09,M.dark);
    }
    for(const z of [-.9,0,.9])block(l.x,y+.008,z,l.w-.12,.016,.025,M.dark);
    guard(l.x,-l.d/2,l.w,beam);guard(outer,0,beam,l.d);
    // Leave the full width of the flight open at the front of each landing.
    const inner=42.24,flightInner=Math.abs(s.x)-s.w/2,flightOuter=Math.abs(s.x)+s.w/2;
    guard(s.side*(inner+flightInner)/2,s.topZ,flightInner-inner,beam);
    guard(s.side*(flightOuter+Math.abs(outer))/2,s.topZ,Math.abs(outer)-flightOuter,beam);
    const run=s.bottomZ-s.topZ,step=run/s.steps,angle=Math.atan2(y,run),length=Math.hypot(y,run),midZ=(s.topZ+s.bottomZ)/2,slope=-y/run;
    const treads=[];
    for(let i=0;i<s.steps;i++){
      const top=y*(i+1)/s.steps,z=s.bottomZ-(i+.5)*step;
      const tread=block(s.x,top-.04,z,s.w,.08,step);treads.push(tread);
      for(const offset of [-.10,.10])block(s.x,top+.008,z+offset,s.w-.14,.016,.026,M.dark);
      const rise=y/s.steps;block(s.x,top-(rise+.08)/2,z+step/2-.025,s.w,rise-.08,.035,M.dark);
    }
    for(const side of [-1,1]){
      const x=s.x+side*(s.w/2+.045);
      for(const height of [railHeight,midRailHeight]){
        const rail=block(x,y/2+height-beam/(2*Math.cos(angle)),midZ,beam,beam,length,height===railHeight?steel:M.dark);rail.rotation.x=angle;
        if(height===railHeight)handrails.push(rail);
      }
      for(let i=0;i<=12;i++){
        const z=s.topZ+run*i/12,base=y*(s.bottomZ-z)/run,h=railHeight-beam/Math.cos(angle);
        block(x,base+h/2,z,.045,h,.045);
      }
      const stringer=block(s.x+side*(s.w/2-.06),y/2-.06,midZ,.12,.24,length,M.dark);stringer.rotation.x=angle;
      const c={x,z:midZ,w:.09,d:run,minY:-.25,maxY:y+railHeight,railing:true,slope,baseY:y/2,topY:y/2+railHeight,exteriorStairs:true};colliders.push(c);rails.push(c);
    }
    // The paving is cut around this shared footprint instead of running through
    // the steel. Its top meets the stone path, with a clear turning area at the toe.
    const a=s.apron;
    aprons.push(block(a.x,a.topY-.04,a.z,a.w,.08,a.d,M.dark));
    flights.push({layout:s,treads});
  }
  return {group,steel,meshes,rails,handrails,landings,aprons,flights};
}
