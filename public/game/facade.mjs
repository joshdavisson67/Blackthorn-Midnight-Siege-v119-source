import * as T from './three.module.js';
import {tiledBox} from './graphics.mjs?v=129';
import {UPPER_CEILING} from './vertical.mjs?v=131';
import {columnSurfaceGeometry} from './column-surfaces.mjs?v=93';

const FRONT=12,BACK=-84,SIDE=42;
const uvScale=material=>{
  const map=material.map,tile=map?.userData.tileMeters??1.8;
  return [tile*(map?.repeat.x??1),tile*(map?.repeat.y??1)];
};
function surfaceBuilder(material){
  const positions=[],uvs=[],[su,sv]=uvScale(material);
  function triangle(a,b,c,uv){positions.push(...a,...b,...c);uvs.push(...uv);}
  function quad(a,b,c,d){
    const u=Math.hypot(...a.map((v,i)=>b[i]-v))/su,v=Math.hypot(...a.map((n,i)=>d[i]-n))/sv;
    triangle(a,b,c,[0,0,u,0,u,v]);triangle(a,c,d,[0,0,u,v,0,v]);
  }
  function finish(){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
  return {triangle,quad,finish,su,sv};
}

// Keep the original mansion silhouette, with outward normals and metric UVs.
export function mansionRoofGeometry(material){
  const s=surfaceBuilder(material),w=14.8,d=12.8,base=7,top=12;
  const lf=[-w,base,d],rf=[w,base,d],tf=[0,top,d],lb=[-w,base,-d],rb=[w,base,-d],tb=[0,top,-d];
  s.triangle(lf,rf,tf,[-w/s.su,0,w/s.su,0,0,(top-base)/s.sv]);
  s.triangle(lb,tb,rb,[-w/s.su,0,0,(top-base)/s.sv,w/s.su,0]);
  s.quad(lf,tf,tb,lb);s.quad(tf,rf,rb,tb);return s.finish();
}

// A closed, mitered pair of slopes: no rotated cone, floating corners or
// overlapping panels along the ridge. UVs follow the actual sloped distances.
export function dormerRoofGeometry(material,w=2.72,d=2.24,rise=.88,thickness=.12){
  const s=surfaceBuilder(material),h=w/2,z=d/2;
  const a=[-h,0,z],b=[0,rise,z],c=[h,0,z],aa=[-h,0,-z],bb=[0,rise,-z],cc=[h,0,-z];
  const p=[-h,-thickness,z],q=[0,rise-thickness,z],r=[h,-thickness,z],pp=[-h,-thickness,-z],qq=[0,rise-thickness,-z],rr=[h,-thickness,-z];
  s.quad(a,b,bb,aa);s.quad(b,c,cc,bb);
  s.quad(p,pp,qq,q);s.quad(q,qq,rr,r);
  s.quad(a,aa,pp,p);s.quad(c,r,rr,cc);
  s.quad(a,p,q,b);s.quad(b,q,r,c);
  s.quad(aa,bb,qq,pp);s.quad(bb,cc,rr,qq);
  return s.finish();
}

function gableGeometry(material,w,rise,d){
  const s=surfaceBuilder(material),h=w/2,z=d/2;
  const a=[-h,0,z],b=[h,0,z],c=[0,rise,z],aa=[-h,0,-z],bb=[h,0,-z],cc=[0,rise,-z];
  s.triangle(a,b,c,[-h/s.su,0,h/s.su,0,0,rise/s.sv]);s.triangle(aa,cc,bb,[-h/s.su,0,0,rise/s.sv,h/s.su,0]);
  s.quad(a,c,cc,aa);s.quad(c,b,bb,cc);s.quad(a,aa,bb,b);return s.finish();
}

// Palladian front (v122): a giant-order portico of paired Ionic columns with
// a full entablature and pediment, a rusticated ground storey, pilastered
// wings, a balustraded roofline and a raised central attic tower with
// statues. Everything above the ground is out of reach; only the column
// pedestals gain collision, clear of every door, window and station.
export const PORTICO=Object.freeze({
  columns:[-14.55,-13.45,-5.45,-4.35,4.35,5.45,13.45,14.55],
  axisZ:FRONT+.24+.5,radius:.32,pedestal:.84,
  capitalTop:7.0,entablature:[7.0,8.3],half:15.25,slope:.28,
  pilasters:[-40.3,-32,-24,-17,17,24,32,40.3]
});
export const ATTIC=Object.freeze({x:0,z:.5,w:15.2,d:13,base:7.25,top:18.2});
export const PARAPET=Object.freeze({high:7.72,low:7.46,height:.94,spacing:.38});

// Profiles are (radius, height) pairs for LatheGeometry.
const lathe=(points,segments)=>new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments);
export function columnShaftGeometry(){
  // Attic base (torus, scotia, torus) then a straight-entasis shaft and astragal.
  return lathe([[0,0],[.40,0],[.40,.05],[.37,.09],[.35,.12],[.36,.15],[.335,.18],[.32,.20],[.318,1.0],[.31,2.7],[.296,4.2],[.28,5.58],[.30,5.60],[.30,5.66],[.278,5.68],[.278,5.72],[0,5.72]],18);
}
export function capitalGeometry(){
  // Echinus flaring into the volute band; the abacus is a separate block.
  return lathe([[0,0],[.278,0],[.31,.06],[.345,.14],[.37,.22],[0,.22]],18);
}
export function balusterGeometry(){
  return lathe([[0,0],[.07,0],[.07,.06],[.045,.11],[.088,.28],[.045,.48],[.07,.58],[0,.58]],6);
}
export function urnGeometry(){
  return lathe([[0,0],[.16,0],[.16,.05],[.08,.09],[.07,.14],[.20,.26],[.23,.36],[.19,.46],[.12,.50],[.15,.53],[.15,.56],[.05,.60],[.05,.66],[.08,.69],[0,.72]],12);
}
// A draped classical figure, built from a handful of shared lathes.
export function statueParts(){
  return {
    robe:lathe([[0,0],[.34,0],[.36,.06],[.30,.30],[.24,.70],[.20,.98],[0,.98]],12),
    torso:lathe([[0,0],[.20,0],[.23,.20],[.24,.36],[.18,.50],[.09,.56],[0,.56]],12),
    head:new T.SphereGeometry(.13,10,6),
    arm:new T.CylinderGeometry(.05,.06,.62,6),
    staff:new T.CylinderGeometry(.028,.028,2.3,6),
    plinth:new T.BoxGeometry(1,1,1)
  };
}

export function buildFacade({world,M,secondFloor,colliders=[],solidMeshes=[]}){
  const group=new T.Group();group.name='Blackthorn exterior stonework';world.add(group);
  const parts=[],windows=[],dormers=[],drains=[],faces=[],columns=[],statues=[],urns=[],geometryCache=new Map(),unit=new T.BoxGeometry(1,1,1);
  function add(geometry,material,x,y,z,w=1,h=1,d=1,name='detail',parent=group){
    const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;o.name='facade-'+name;o.userData.facade=true;parent.add(o);parts.push(o);return o;
  }
  function block(x,y,z,w,h,d,material=M.stone,name='stonework',parent=group){
    const key=material.uuid+':'+[w,h,d].join(':');if(!geometryCache.has(key))geometryCache.set(key,tiledBox(unit,material,w,h,d));
    return add(geometryCache.get(key),material,x,y,z,w,h,d,name,parent);
  }
  function beam(a,b,width,depth,material=M.stone,name='bargeboard',parent=group){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start),mid=start.add(end).multiplyScalar(.5);
    const o=block(mid.x,mid.y,mid.z,width,direction.length(),depth,material,name,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return o;
  }
  function face(axis,fixed,a,b,outward,doors=[],upper=false){
    const f={axis,fixed,a,b,outward,doors,upper};faces.push(f);return f;
  }
  const front=face('x',FRONT,-SIDE,SIDE,1,[{at:-28,width:6},{at:0,width:6.4},{at:28,width:6}],true);
  const back=face('x',BACK,-SIDE,SIDE,-1,[{at:0,width:6}]);
  const sides=[-1,1].map(side=>face('z',side*SIDE,BACK,FRONT,side,[{at:-48,width:6}],true));
  function onFace(f,at,y,w,h,projection,depth,material=M.stone,name='trim'){
    return block(f.axis==='x'?at:f.fixed+f.outward*projection,y,f.axis==='x'?f.fixed+f.outward*projection:at,f.axis==='x'?w:depth,h,f.axis==='x'?depth:w,material,name);
  }
  function spans(f,openings=f.doors,margin=.12){
    let cursor=f.a+.10;const out=[];
    for(const {at,width} of openings){const lo=at-width/2-margin,hi=at+width/2+margin;if(lo>cursor)out.push([cursor,lo]);cursor=Math.max(cursor,hi);}
    if(cursor<f.b-.10)out.push([cursor,f.b-.10]);return out;
  }
  function band(f,a,b,y,h,p,d,material,name){if(b>a)onFace(f,(a+b)/2,y,b-a,h,p,d,material,name);}

  for(const f of faces){
    // Keep the foundation split at every ground-floor entrance.
    for(const [a,b] of spans(f)){
      band(f,a,b,.33,.68,.31,.13,M.stone,'plinth');band(f,a,b,.71,.08,.355,.18,M.trim,'plinth-cap');
    }
    const ranges=f===front?[[f.a+.1,-PORTICO.half-.05,true],[PORTICO.half+.05,f.b-.1,true]]:f===back?[[f.a+.1,f.b-.1,false]]:[[f.a+.1,-12.35,false],[-11.9,f.b-.1,true]];
    for(const [a,b,high] of ranges){
      const base=high?UPPER_CEILING+.06:7.10;
      band(f,a,b,base,.10,.29,.10,M.trim,'cornice-bed');
      band(f,a,b,base+.12,.14,.35,.18,M.stone,'cornice');
      band(f,a,b,base+.245,.09,.405,.25,M.stone,'cornice-crown');
      band(f,a,b,high?7.67:7.41,.09,.36,.13,M.dark,'gutter');
      if(high)band(f,a,b,4.22,.12,.325,.15,M.stone,'floor-course');
    }
    if(f.axis==='z')onFace(f,-12.125,7.40,.45,.40,.35,.18,M.stone,'cornice-step');
  }
  band(front,-PORTICO.half-.05,PORTICO.half+.05,4.22,.12,.325,.15,M.stone,'floor-course');

  // Alternating long/short corner stones read as bonded masonry. Thin joints
  // and shallow relief stay inside the wall's existing player clearance.
  for(const xSide of [-1,1])for(const zSide of [-1,1]){
    const z=zSide>0?FRONT:BACK;
    for(let i=0;i<14;i++){
      const length=i%2?.68:.98,other=i%2?.98:.68,y=.36+i*.48;
      block(xSide*(SIDE+.32),y,z-zSide*(length/2-.235),.17,.44,length,M.stone,'corner-quoin');
      block(xSide*(SIDE-other/2+.405),y,z+zSide*.325,other,.44,.18,M.stone,'corner-quoin');
    }
    block(xSide*(SIDE+.15),zSide>0?7.43:7.26,z+zSide*.15,.81,.30,.81,M.stone,'cornice-corner');
  }
  // Finish the original front pilasters above the clipped first-floor shell.
  // Wing pilasters frame each upper bay, standing on the floor course.
  for(const x of PORTICO.pilasters){
    onFace(front,x,5.74,.50,2.92,.33,.12,M.stone,'wing-pilaster');
    onFace(front,x,4.39,.62,.10,.35,.16,M.stone,'pilaster-base');
    onFace(front,x,7.12,.64,.14,.36,.18,M.stone,'pilaster-cap');
    onFace(front,x,5.74,.16,2.50,.395,.03,M.trim,'pilaster-inset');
  }
  for(const f of sides)for(const at of [-72,-36,-18]){
    onFace(f,at,3.63,.46,5.60,.31,.14,M.stone,'pier');onFace(f,at,6.52,.65,.18,.34,.19,M.stone,'pier-cap');
    onFace(f,at,3.63,.12,5.20,.399,.035,M.trim,'pier-inset');
  }
  for(const at of [-28,28]){onFace(back,at,3.63,.48,5.60,.31,.14,M.stone,'pier');onFace(back,at,6.52,.66,.18,.34,.19,M.stone,'pier-cap');}

  function surround(f,at,sill,head,width,{pane=false,upper=false,headless=false}={}){
    const center=(sill+head)/2,height=head-sill;
    if(pane){
      onFace(f,at,center,width+.09,height+.09,.285,.05,M.dark,'window-recess');
      onFace(f,at,center,width,height,.320,.018,M.glass,'window-pane');
      onFace(f,at,center,.045,height-.06,.340,.02,M.gold,'window-mullion');
      for(const side of [-1,1])onFace(f,at+side*(width+.045)/4,center,(width-.045)/2,.045,.340,.02,M.gold,'window-transom');
    }
    for(const side of [-1,1]){
      onFace(f,at+side*(width/2+.13),center,.17,height+.13,.345,.16,M.stone,'window-jamb');
      onFace(f,at+side*(width/2+.25),center,.055,height+.25,.329,.10,M.trim,'window-reveal');
    }
    onFace(f,at,sill-.075,width+.46,.15,.39,.29,M.stone,'window-sill');
    onFace(f,at,sill-.18,width+.25,.065,.33,.12,M.trim,'sill-apron');
    if(!headless){
      onFace(f,at,head+.08,width+.46,.16,.34,.16,M.stone,'window-lintel');
      onFace(f,at,head+.205,width+.57,.065,.38,.23,M.trim,'window-hood');
      onFace(f,at,head+.12,.17,.25,.445,.07,M.stone,'window-keystone');
    }
    windows.push({face:f,at,sill,head,width,upper,pane});
  }
  for(const w of secondFloor.windowOpenings){const f=w.axis==='x'?front:sides.find(f=>f.outward===w.outward);surround(f,w.axis==='x'?w.x:w.z,w.sill,w.head,w.width,{upper:true,headless:f===front&&Math.abs(w.x)<PORTICO.half});}
  for(const x of [-10,-7,7,10])surround(front,x,1.92,4.00,1.50);
  for(const x of [-37,-33,-23,-19,19,23,33,37])surround(front,x,2.05,4.00,1.90);
  for(const f of sides)for(const row of [0,-24,-48,-72])for(const offset of [-8,-4,4,8]){
    if(row===-48&&Math.abs(offset)===4)continue;
    surround(f,row+offset,row===0?1.45:2.22,row===0?3.80:5.08,1.68,{pane:true});
  }
  for(const x of [-37,-33,-23,-19,-9,-5,5,9,19,23,33,37])surround(back,x,2.22,5.08,1.68,{pane:true});

  // Door entablatures stop above the openings, leaving sightlines, interaction
  // reach and every playable doorway unchanged.
  for(const f of faces)for(const {at,width} of f.doors){
    const head=f===front&&at===0?4.02:4.34;
    onFace(f,at,head+.22,width+.35,.18,.335,.18,M.stone,'door-lintel');
    onFace(f,at,head+.36,width+.62,.09,.38,.25,M.trim,'door-hood');
    onFace(f,at,head+.20,.26,.32,.46,.10,M.stone,'door-keystone');
  }

  const pipeGeometry=new T.CylinderGeometry(.057,.057,1,8);
  function drain(f,at,top){
    const x=f.axis==='x'?at:f.fixed+f.outward*.42,z=f.axis==='x'?f.fixed+f.outward*.42:at;
    const o=add(pipeGeometry,M.dark,x,(top+.25)/2,z,1,top-.25,1,'downspout');drains.push({face:f,at,top,mesh:o});
    for(const y of [.8,3.05,top-.5])onFace(f,at,y,.18,.045,.42,.13,M.dark,'pipe-bracket');
  }
  for(const f of sides)for(const at of [-81,-58,-26,10])drain(f,at,at>-12?7.63:7.37);
  for(const at of [-39,39]){drain(front,at,7.63);drain(back,at,7.37);}

  // The rear rake still outlines the slate roof; the front is the pediment.
  for(const side of [-1,1])beam([side*14.78,7.73,-12.90],[0,12.73,-12.90],.13,.12,M.stone);
  beam([0,12.77,-12.82],[0,12.77,10.4],.12,.16,M.dark,'main-ridge');

  // ---- Rusticated ground storey ------------------------------------------
  // Channelled courses with open joints, stopping short of every opening,
  // pier and corner quoin. Relief stays within the player's wall clearance.
  const RUSTIC={first:.80,course:.40,pitch:.47,count:7,projection:.27,depth:.06},ASHLAR={course:.465,pitch:.485,projection:.255,depth:.03};
  function rustication(f){
    const limit=f.axis==='x'?[-40.85,40.85]:[BACK+1.15,FRONT-1.15],gaps=[];
    for(const w of windows)if(w.face===f&&w.sill<4)gaps.push([w.at-w.width/2-.32,w.at+w.width/2+.32,w.sill-.3,w.head+.3]);
    for(const {at,width} of f.doors)gaps.push([at-width/2-.5,at+width/2+.5,0,5]);
    const piers=f.axis==='z'?[-72,-36,-18]:f===back?[-28,28]:[];
    for(const at of piers)gaps.push([at-.3,at+.3,0,7]);
    for(let i=0;i<RUSTIC.count;i++){
      const y0=RUSTIC.first+i*RUSTIC.pitch,y1=y0+RUSTIC.course,cuts=gaps.filter(g=>g[2]<y1&&g[3]>y0).sort((a,b)=>a[0]-b[0]);
      let cursor=limit[0];
      for(const [lo,hi] of cuts){if(lo>cursor+.25)band(f,cursor,Math.min(lo,limit[1]),(y0+y1)/2,RUSTIC.course,RUSTIC.projection,RUSTIC.depth,M.stone,'rustication');cursor=Math.max(cursor,hi);}
      if(limit[1]>cursor+.25)band(f,cursor,limit[1],(y0+y1)/2,RUSTIC.course,RUSTIC.projection,RUSTIC.depth,M.stone,'rustication');
    }
    // Smooth ashlar above: fine joints, flush with the window trims.
    const upperGaps=[];
    for(const w of windows)if(w.face===f&&w.head>4.3)upperGaps.push([w.at-w.width/2-.30,w.at+w.width/2+.30,w.sill-.25,w.head+.32]);
    for(const at of piers)upperGaps.push([at-.3,at+.3,0,8]);
    // Keep the cornice step and the upper exits to the steel stairs open.
    if(f.axis==='z')upperGaps.push([-12.6,-11.65,0,8],[-1.62,1.62,4.0,7.3]);
    for(const [lo,hi,top] of f===front||f===back?[[limit[0],limit[1],f===front?UPPER_CEILING-.02:7.06]]:[[limit[0],-12.6,7.06],[-11.65,limit[1],UPPER_CEILING-.02]]){
      for(let y0=4.30;y0<top-.1;y0+=ASHLAR.pitch){
        const y1=Math.min(top,y0+ASHLAR.course),cuts=upperGaps.filter(g=>g[2]<y1&&g[3]>y0&&g[1]>lo&&g[0]<hi).sort((a,b)=>a[0]-b[0]);
        let cursor=lo;
        for(const [a,b] of cuts){if(a>cursor+.2)band(f,cursor,a,(y0+y1)/2,y1-y0,ASHLAR.projection,ASHLAR.depth,M.stone,'ashlar');cursor=Math.max(cursor,b);}
        if(hi>cursor+.2)band(f,cursor,hi,(y0+y1)/2,y1-y0,ASHLAR.projection,ASHLAR.depth,M.stone,'ashlar');
      }
    }
  }
  for(const f of faces)rustication(f);

  // ---- Shared carved pieces ------------------------------------------------
  const carved=(geometry,material,scale=[1,1,1])=>columnSurfaceGeometry(geometry,material,scale);
  const shaftGeo=carved(columnShaftGeometry(),M.stone),capitalGeo=carved(capitalGeometry(),M.stone);
  const voluteGeo=carved(new T.CylinderGeometry(.115,.115,.76,12),M.stone),urnGeo=carved(urnGeometry(),M.stone);
  const statue=statueParts();for(const key of ['robe','torso','arm','staff'])statue[key]=carved(statue[key],M.stone);
  function figure(x,y,z,rotation=0,scale=1.15,parent=group){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(scale);g.name='Estate statue';parent.add(g);
    block(0,.18,0,.62,.36,.62,M.stone,'statue-plinth',g);
    add(statue.robe,M.stone,0,.36,0,1,1,1,'statue-robe',g);
    add(statue.torso,M.stone,0,1.30,0,1,1,1,'statue-torso',g);
    add(statue.head,M.stone,0,1.80,0,2.0,.9,1.25,'statue-shoulders',g);
    add(statue.head,M.stone,0,2.02,.02,1.1,1.2,1.1,'statue-head',g);
    const lower=add(statue.arm,M.stone,-.28,1.52,.02,1,1,1,'statue-arm',g);lower.rotation.z=-.18;
    const holding=add(statue.arm,M.stone,.27,1.60,.12,1,1,1,'statue-arm',g);holding.rotation.set(-.55,0,.22);
    add(statue.staff,M.stone,.36,1.52,.30,1,1,1,'statue-staff',g);
    add(statue.head,M.stone,.36,2.70,.30,.38,.55,.38,'statue-finial',g);
    statues.push(g);return g;
  }
  function urn(x,y,z,parent=group){const o=add(urnGeo,M.stone,x,y,z,1,1,1,'urn',parent);urns.push(o);return o;}

  // ---- Giant-order portico --------------------------------------------------
  const {axisZ,pedestal,half,slope}=PORTICO,[entBase,entTop]=PORTICO.entablature,wallFace=FRONT+.24;
  for(const x of PORTICO.columns){
    const base=block(x,.375,axisZ,pedestal,.75,pedestal,M.stone,'column-pedestal');
    block(x,.79,axisZ,pedestal+.10,.08,pedestal+.10,M.stone,'pedestal-cap');
    const shaft=add(shaftGeo,M.stone,x,.83,axisZ,1,1,1,'column-shaft');
    add(capitalGeo,M.stone,x,6.55,axisZ,1,1,1,'column-capital');
    for(const side of [-1,1]){const v=add(voluteGeo,M.stone,x+side*.33,6.79,axisZ,1,1,1,'column-volute');v.rotation.x=Math.PI/2;}
    block(x,6.94,axisZ,.86,.12,.86,M.stone,'column-abacus');
    colliders.push({x,z:axisZ,w:pedestal,d:pedestal,minY:0,maxY:entBase,portico:true});solidMeshes.push(base,shaft);
    columns.push({x,z:axisZ,radius:PORTICO.radius,pedestal:base,shaft});
  }
  // Responds: flat pilasters on the wall behind each pair.
  for(const x of [-14,-4.9,4.9,14])block(x,(.8+entBase)/2,wallFace+.05,1.0,entBase-.8,.10,M.stone,'portico-respond');
  // Entablature: architrave, frieze, bed moulding, dentils, corona, cyma.
  const deep=(d,y,h,w,name)=>block(0,y,wallFace+d/2,w,h,d,M.stone,name);
  deep(.90,entBase+.2,.40,30.0,'architrave');deep(.94,entBase+.37,.06,30.04,'architrave-fillet');
  deep(.86,entBase+.59,.38,29.9,'frieze');deep(.98,entBase+.82,.08,30.2,'bed-moulding');
  for(let x=-15.04;x<=15.05;x+=.24)block(x,entBase+.92,wallFace+.92,.11,.12,.12,M.stone,'dentil');
  deep(1.22,entBase+1.09,.22,30.5,'corona');deep(1.28,entTop-.05,.10,30.6,'cyma');
  // Pediment: tympanum, raking cornices, roundel and acroteria.
  const rise=15.0*slope,apex=entTop+rise+.05;
  add(gableGeometry(M.stone,30.0,rise,.86),M.stone,0,entTop,wallFace+.43,1,1,1,'tympanum');
  const len=Math.hypot(1,slope),nx=-slope/len,ny=1/len;
  for(const side of [-1,1]){
    const a=[side*15.35,entTop+.06],b=[0,entTop+.06+15.35*slope];
    beam([a[0],a[1],wallFace+.64],[b[0],b[1],wallFace+.64],.30,1.28,M.stone,'raking-cornice');
    beam([a[0]+side*nx*.2,a[1]+ny*.2,wallFace+.67],[side*nx*.2,b[1]+ny*.2,wallFace+.67],.10,1.34,M.stone,'raking-cyma');
  }
  const roundel=add(new T.CylinderGeometry(1.32,1.32,.06,40),M.stone,0,entTop+rise*.42,wallFace+.89,1,1,1,'pediment-roundel');roundel.rotation.x=Math.PI/2;
  const ring=add(new T.TorusGeometry(1.32,.08,8,40),M.trim,0,entTop+rise*.42,wallFace+.92,1,1,1,'pediment-ring');
  block(0,apex+.3,wallFace+.62,1.0,.5,.9,M.stone,'acroterion');figure(0,apex+.55,wallFace+.62);
  for(const side of [-1,1]){block(side*14.9,entTop+.25,wallFace+.62,.9,.5,.9,M.stone,'acroterion');figure(side*14.9,entTop+.5,wallFace+.62,-side*.25);}

  // ---- Balustraded parapet -------------------------------------------------
  const balusterSpots=[],dies=[];
  function parapet(f,a,b,high,{urns:withUrns=false,endA=true,endB=true}={}){
    const crown=high?UPPER_CEILING+.06+.29:7.10+.29,gutterTop=(high?7.67:7.41)+.045,plinthTop=gutterTop+.145,plinthBottom=crown-.05;
    const railBase=plinthTop+.58,top=railBase+.18,depth=.50,offset=.11;
    const place=(at,y,h,w,d,name)=>onFace(f,at,y,w,h,offset,d,M.stone,name);
    place((a+b)/2,(plinthTop+plinthBottom)/2,plinthTop-plinthBottom,b-a,depth,'parapet-plinth');
    place((a+b)/2,railBase+.07,.14,b-a,depth-.04,'parapet-rail');place((a+b)/2,railBase+.155,.05,b-a+.02,depth+.02,'parapet-coping');
    const spanCount=Math.max(1,Math.round((b-a)/4.6)),step=(b-a)/spanCount;
    for(let i=0;i<=spanCount;i++){
      const at=a+i*step;if((i===0&&!endA)||(i===spanCount&&!endB))continue;
      place(at,(plinthBottom+top)/2,top-plinthBottom,.52,depth+.08,'parapet-die');place(at,top+.04,.08,.62,depth+.16,'die-cap');
      dies.push({face:f,at,top:top+.08});
      if(withUrns&&i%2===1){const x=f.axis==='x'?at:f.fixed+f.outward*offset,z=f.axis==='x'?f.fixed+f.outward*offset:at;urn(x,top+.08,z);}
    }
    for(let i=0;i<spanCount;i++){
      const lo=a+i*step+.36,hi=a+(i+1)*step-.36,count=Math.max(1,Math.round((hi-lo)/PARAPET.spacing));
      for(let j=0;j<=count;j++){const at=lo+(hi-lo)*j/count;balusterSpots.push(f.axis==='x'?[at,plinthTop,f.fixed+f.outward*offset]:[f.fixed+f.outward*offset,plinthTop,at]);}
    }
    return {top:top+.08};
  }
  for(const side of [-1,1]){
    const [a,b]=side<0?[-42.11,-PORTICO.half-.4]:[PORTICO.half+.4,42.11];parapet(front,a,b,true,{urns:true});
  }
  parapet(back,-42.11,42.11,false);
  for(const f of sides){parapet(f,-11.9,FRONT+.11,true,{endB:false});parapet(f,BACK-.11,-12.35,false,{endB:false});}
  const corners=[[-42.11,FRONT+.11,PARAPET.high],[42.11,FRONT+.11,PARAPET.high],[-42.11,BACK-.11,PARAPET.low],[42.11,BACK-.11,PARAPET.low]];
  for(const [x,z,base] of corners){block(x,base+.62,z,.9,1.2,.9,M.stone,'corner-pedestal');figure(x,base+1.22,z,Math.atan2(x,z)+Math.PI);}
  const balusterGeo=carved(balusterGeometry(),M.stone),balusters=new T.InstancedMesh(balusterGeo,M.stone,balusterSpots.length);
  balusters.name='Parapet balusters';balusters.castShadow=false;balusters.receiveShadow=true;balusters.userData.facade=true;
  const m4=new T.Matrix4();balusterSpots.forEach(([x,y,z],i)=>balusters.setMatrixAt(i,m4.makeTranslation(x,y,z)));
  balusters.instanceMatrix.needsUpdate=true;balusters.computeBoundingBox?.();balusters.computeBoundingSphere?.();group.add(balusters);

  // ---- Raised central attic tower ------------------------------------------
  const tower=new T.Group();tower.name='Blackthorn attic tower';tower.position.set(ATTIC.x,0,ATTIC.z);group.add(tower);
  const {w:tw,d:td,base:tb}=ATTIC,bodyTop=ATTIC.top-.8;
  block(0,(tb+bodyTop)/2,0,tw,bodyTop-tb,td,M.stone,'attic-body',tower);
  block(0,bodyTop+.12,0,tw+.36,.24,td+.36,M.stone,'attic-cornice',tower);
  block(0,bodyTop+.30,0,tw+.56,.12,td+.56,M.stone,'attic-crown',tower);
  for(const xs of [-1,1])for(const zs of [-1,1])for(let i=0;i<13;i++){
    const y=tb+.5+i*.72,long=i%2?.6:.9;
    block(xs*(tw/2+.06),y,zs*(td/2-long/2+.12),.12,.62,long,M.stone,'attic-quoin',tower);
    block(xs*(tw/2-(i%2?.9:.6)/2+.12),y,zs*(td/2+.06),i%2?.9:.6,.62,.12,M.stone,'attic-quoin',tower);
  }
  function atticWindow(axis,sign,at,sill,head,width=1.3){
    const along=(o,y,w,h,out,d,mat,name)=>axis==='x'?block(at+o,y,sign*(td/2+out),w,h,d,mat,name,tower):block(sign*(tw/2+out),y,at+o,d,h,w,mat,name,tower);
    const mid=(sill+head)/2,h=head-sill;
    along(0,mid,width,h,.01,.04,M.dark,'attic-window-recess');along(0,mid,width-.16,h-.16,.03,.02,M.glass,'attic-window-pane');
    along(0,mid,.05,h-.16,.05,.03,M.gold,'attic-window-mullion');
    for(const side of [-1,1])along(side*(width/2+.08),mid,.16,h+.16,.06,.14,M.stone,'attic-window-jamb');
    along(0,sill-.06,width+.42,.12,.10,.24,M.stone,'attic-window-sill');along(0,head+.12,width+.42,.2,.08,.2,M.stone,'attic-window-head');
  }
  for(const sign of [-1,1]){for(const at of [-4.6,0,4.6])atticWindow('x',sign,at,13.9,16.5,1.4);for(const at of [-4.2,0,4.2])atticWindow('z',sign,at,13.9,16.5,1.3);}
  // A string course ties the window sills together on all four faces.
  block(0,13.62,0,tw+.16,.16,td+.16,M.stone,'attic-string-course',tower);
  // Attic balustrade with statues on the corners and front centre.
  const atticTop=bodyTop+.36,rail=atticTop+.72;
  for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1]]){
    const length=axis==='x'?tw:td,fixed=axis==='x'?td/2+.05:tw/2+.05;
    const put=(o,y,w,h,d,name)=>axis==='x'?block(o,y,sign*fixed,w,h,d,M.stone,name,tower):block(sign*fixed,y,o,d,h,w,M.stone,name,tower);
    put(0,atticTop+.09,length,.18,.42,'attic-plinth');put(0,rail+.06,length,.12,.40,'attic-rail');
    const count=Math.round((length-1.2)/PARAPET.spacing);
    for(let j=0;j<=count;j++){const o=-length/2+.6+(length-1.2)*j/count;balusterSpots.push(axis==='x'?[ATTIC.x+o,atticTop+.18-.04,ATTIC.z+sign*fixed]:[ATTIC.x+sign*fixed,atticTop+.18-.04,ATTIC.z+o]);}
  }
  for(const xs of [-1,1])for(const zs of [-1,1]){block(xs*(tw/2+.05),atticTop+.45,zs*(td/2+.05),.8,.9,.8,M.stone,'attic-pedestal',tower);figure(xs*(tw/2+.05),atticTop+.9,zs*(td/2+.05),Math.atan2(xs,zs)+Math.PI,1.1,tower);}
  block(0,atticTop+.45,td/2+.05,.8,.9,.8,M.stone,'attic-pedestal',tower);figure(0,atticTop+.9,td/2+.05,0,1.2,tower);
  // Rebuild the instanced balusters now that the attic rows are known.
  const allBalusters=new T.InstancedMesh(balusterGeo,M.stone,balusterSpots.length);
  allBalusters.name=balusters.name;allBalusters.castShadow=false;allBalusters.receiveShadow=true;allBalusters.userData.facade=true;
  balusterSpots.forEach(([x,y,z],i)=>allBalusters.setMatrixAt(i,m4.makeTranslation(x,y,z)));allBalusters.instanceMatrix.needsUpdate=true;
  allBalusters.computeBoundingSphere();group.remove(balusters);balusters.dispose();group.add(allBalusters);

  group.updateWorldMatrix(true,true);
  // Retain finished part transforms for layout checks after static batching.
  for(const o of parts)o.userData.facadeMatrix=o.matrixWorld.clone();
  return {group,parts,windows,dormers,drains,faces,columns,statues,urns,dies,balusters:allBalusters,balusterSpots,tower,geometryCache};
}
