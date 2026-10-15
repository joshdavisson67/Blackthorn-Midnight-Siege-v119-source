import * as T from './three.module.js';
import {tiledBox} from './graphics.mjs?v=116';
import {UPPER_CEILING} from './vertical.mjs?v=116';

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

export function buildFacade({world,M,secondFloor}){
  const group=new T.Group();group.name='Blackthorn exterior stonework';world.add(group);
  const parts=[],windows=[],dormers=[],drains=[],faces=[],geometryCache=new Map(),unit=new T.BoxGeometry(1,1,1);
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
    const ranges=f===front?[[f.a+.1,f.b-.1,true]]:f===back?[[f.a+.1,f.b-.1,false]]:[[f.a+.1,-12.35,false],[-11.9,f.b-.1,true]];
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
  for(const x of [-12,-5,5,12]){
    onFace(front,x,5.66,.48,2.98,.36,.18,M.stone,'upper-pilaster');
    onFace(front,x,4.13,.66,.12,.395,.24,M.stone,'pilaster-cap');
    onFace(front,x,7.16,.64,.12,.385,.23,M.stone,'pilaster-cap');
    onFace(front,x,5.66,.16,2.54,.466,.045,M.trim,'pilaster-inset');
  }
  for(const f of sides)for(const at of [-72,-36,-18]){
    onFace(f,at,3.63,.46,5.60,.31,.14,M.stone,'pier');onFace(f,at,6.52,.65,.18,.34,.19,M.stone,'pier-cap');
    onFace(f,at,3.63,.12,5.20,.399,.035,M.trim,'pier-inset');
  }
  for(const at of [-28,28]){onFace(back,at,3.63,.48,5.60,.31,.14,M.stone,'pier');onFace(back,at,6.52,.66,.18,.34,.19,M.stone,'pier-cap');}

  function surround(f,at,sill,head,width,{pane=false,upper=false}={}){
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
    onFace(f,at,head+.08,width+.46,.16,.34,.16,M.stone,'window-lintel');
    onFace(f,at,head+.205,width+.57,.065,.38,.23,M.trim,'window-hood');
    onFace(f,at,head+.12,.17,.25,.445,.07,M.stone,'window-keystone');
    windows.push({face:f,at,sill,head,width,upper,pane});
  }
  for(const w of secondFloor.windowOpenings){const f=w.axis==='x'?front:sides.find(f=>f.outward===w.outward);surround(f,w.axis==='x'?w.x:w.z,w.sill,w.head,w.width,{upper:true});}
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

  // Stone rakes outline the main slate roof without replacing its dark gable.
  for(const z of [-12.90,12.90])for(const side of [-1,1])beam([side*14.78,7.73,z],[0,12.73,z],.13,.12,M.stone);
  beam([0,12.77,-12.82],[0,12.77,12.82],.12,.16,M.dark,'main-ridge');

  const roofGeometry=dormerRoofGeometry(M.roof),eave=10.16,rise=.88,thickness=.12,bodyHalf=1.12;
  const bodyTop=eave+rise*(1-bodyHalf/1.36)-thickness+.01,base=7.76;
  const gable=gableGeometry(M.stone,bodyHalf*2,rise*bodyHalf/1.36,.12);
  for(const x of [-8,8]){
    const parent=new T.Group();parent.name='Fitted slate dormer';parent.position.set(x,0,12.6);group.add(parent);
    const body=block(0,(bodyTop+base)/2,0,bodyHalf*2,bodyTop-base,1.80,M.stone,'dormer-body',parent);
    block(0,base+.05,0,2.38,.16,1.96,M.trim,'dormer-foot',parent);
    add(gable,M.stone,0,bodyTop,.96,1,1,1,'dormer-gable',parent);
    const roof=add(roofGeometry,M.roof,0,eave,0,1,1,1,'dormer-roof',parent);
    block(0,9.11,.92,1.40,1.84,.04,M.dark,'dormer-recess',parent);
    const pane=block(0,9.11,.95,1.22,1.66,.025,M.glass,'dormer-pane',parent);
    block(0,9.11,.977,.045,1.65,.025,M.gold,'dormer-mullion',parent);
    for(const side of [-1,1]){block(side*.755,9.11,1.005,.13,1.94,.12,M.stone,'dormer-jamb',parent);block(side*.325,9.14,.977,.605,.04,.025,M.gold,'dormer-transom',parent);}
    for(const y of [8.17,10.05])block(0,y,1.025,1.68,.13,.19,M.trim,'dormer-frame',parent);
    for(const side of [-1,1])beam([side*1.36,eave,1.16],[0,eave+rise,1.16],.08,.08,M.dark,'dormer-rake',parent);
    beam([0,eave+rise+.025,-1.10],[0,eave+rise+.025,1.12],.075,.09,M.dark,'dormer-ridge',parent);
    dormers.push({x,parent,body,roof,pane,eave,rise,bodyTop,width:2.72,depth:2.24});
  }
  group.updateWorldMatrix(true,true);
  // Retain finished part transforms for layout checks after static batching.
  for(const o of parts)o.userData.facadeMatrix=o.matrixWorld.clone();
  return {group,parts,windows,dormers,drains,faces,geometryCache};
}
