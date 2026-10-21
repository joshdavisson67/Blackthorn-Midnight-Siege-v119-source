import * as T from './three.module.js';
import {BRUTE} from './brute.mjs?v=30';
import {makeRedEyeMaterial,makeEyeGeometry} from './enemy-faces.mjs?v=133';
import {ENEMY_SURFACE,markEnemySurface} from './enemy-surfaces.mjs?v=133';
import {paint,tube,sweep,shard,uvWindow,pooledLump} from './enemy-sculpt.mjs?v=133';

const UP=new T.Vector3(0,1,0), clamp=T.MathUtils.clamp;
// Four estate archetypes (v133). Each has its own build, head, clothing and
// damage, rather than one rounded mannequin in four colours.
const styles=[
  {name:'groundskeeper',coat:0x434936,pants:0x2f3129,shirt:0x6b6452,skin:0x76745f,build:'stocky',hair:'cap',nose:'broken',jaw:1.08,ears:[1,0]},
  {name:'footman',coat:0x20252b,pants:0x202328,shirt:0x75726a,skin:0x80857e,build:'gaunt',hair:'slick',nose:'rotted',jaw:.94,ears:[1,1],slack:.22},
  {name:'fallen guest',coat:0x4d3936,pants:0x2f2a29,shirt:0x7a705f,skin:0x8a8270,build:'starved',hair:'strands',nose:'thin',jaw:.88,ears:[0,1],torn:true},
  {name:'caretaker',coat:0x5f5b50,pants:0x3a3932,shirt:0x70695a,skin:0x7b6d65,build:'bloated',hair:'sparse',nose:'broken',jaw:1.12,ears:[1,1]},
];
const BRUTE_STYLE={name:'estate brute',coat:0x3f3128,pants:0x2a2c26,shirt:0x6e6656,skin:0x6e6a57,build:'brute',hair:'none',nose:'flat',jaw:1.22,ears:[1,0]};
const FERAL_STYLE={name:'feral stalker',coat:0x52432f,pants:0x2a2723,shirt:0x6f6555,skin:0x8c8170,build:'feral',hair:'none',nose:'rotted',jaw:.9,ears:[0,0],torn:true,lipless:true,slack:.08};
// Body builds: chest/waist/depth/neck multipliers, limb thickness, exposed
// rib relief, belly, back hump and a resting slump the walk cycle adds.
const BUILDS={
  stocky: {chest:1.05,waist:1.05,depth:1.06,neck:1.18,limb:1.06,ribs:0,  belly:.05, hump:.02,slump:.05,head:{w:1.05,h:.96,d:1.02,brow:1.25,hollow:.9,cheek:1.1,square:.82}},
  gaunt:  {chest:.9, waist:.8,  depth:.86, neck:.84, limb:.86, ribs:.05,belly:-.1, hump:.06,slump:.11,head:{w:.9,h:1.08,d:1.04,brow:1.05,hollow:1.6,cheek:1.35}},
  starved:{chest:.86,waist:.7,  depth:.8,  neck:.8,  limb:.8,  ribs:.09,belly:-.22,hump:.08,slump:.08,head:{w:.92,h:1.02,d:.98,brow:.95,hollow:1.8,cheek:1.5}},
  bloated:{chest:1.07,waist:1.2,depth:1.12,neck:1.28,limb:1.14,ribs:0,  belly:.5,  hump:.1, slump:.13,head:{w:1.08,h:.94,d:1.04,brow:1.1,hollow:.45,cheek:.7,square:.86}},
  brute:  {chest:1.12,waist:1.04,depth:1.1, neck:1.45,limb:1.2, ribs:0,  belly:.1,  hump:.4, slump:.07,head:{w:1.04,h:.94,d:1.0,brow:1.6,hollow:1.1,cheek:1.2,square:.76}},
  feral:  {chest:.82,waist:.64,depth:.78, neck:.78, limb:.78, ribs:.13,belly:-.3, hump:.12,slump:0,  head:{w:.94,h:1.0,d:1.02,brow:1.3,hollow:2,cheek:1.6}},
};

// Each enemy owns its small geometry/material palette. Meshes are merged per joint
// by the game, retaining articulation, vertex colors, and precise hit regions.
// Gait personality (v124). Every walker rolls its own drag leg, sway, hunch,
// arm carriage, bob and limb timing, so a crowd moves differently without
// extra assets. Arms and hips run slightly out of step with the legs.
export const ARM_POSES=Object.freeze(['reach','dangle','mixed','clutch']);
export function rollGait(rng=Math.random,{feral=false,brute=false}={}){
  const pick=rng();
  return {
    dragLeg:rng()<.5?0:1,
    sway:.6+rng()*.9,
    hunch:feral?rng()*.06:brute?.05+rng()*.1:rng()*.24,
    arms:feral?'clutch':brute?(pick<.5?'dangle':'clutch'):pick<.3?'reach':pick<.55?'dangle':pick<.75?'mixed':'clutch',
    reachArm:rng()<.5?0:1,
    armLag:.15+rng()*.55,
    hipLag:-.25+rng()*.5,
    bob:.6+rng()*.8,
    scuff:.35+rng()*.6
  };
}
const DEFAULT_GAIT=Object.freeze({dragLeg:0,sway:1,hunch:0,arms:'clutch',reachArm:0,armLag:0,hipLag:0,bob:1,scuff:0});
// Arm carriage: base pitch, swing, forearm bend.
const ARM_CARRIAGE={reach:[-1.12,.10,-.12],dangle:[-.10,.30,-.06],clutch:[-.30,.22,-.23]};

// Crawlers (v124): enough leg damage drops walkers and ferals to the floor.
export const CRAWL=Object.freeze({legShare:.4,speed:.42,height:.8,drop:.55,hip:.22,pitch:1.42});
export function noteLegDamage(e,amount){
  if(e.dog||e.brute||e.dead||e.crawling)return false;
  e.legDamage=(e.legDamage||0)+amount;
  if(e.hp>0&&e.legDamage>=e.maxHp*CRAWL.legShare){e.crawling=true;e.crawlDrop=CRAWL.drop;e.crawl=e.crawl||0;return true;}
  return false;
}

// The skull is one continuous sculpted surface: overhanging brow, sunken
// sockets and temples, hard cheekbones over hollow cheeks, a long jawline,
// and per-archetype dents and asymmetry.
function sculptSkull(rng,h){
  const g=new T.SphereGeometry(1,34,26),p=g.attributes.position,gaussian=(x,y,cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
  const dent=[(rng()-.5)*.12,.08+rng()*.08,rng()<.5?-1:1],tilt=(rng()-.5)*.006;
  for(let i=0;i<p.count;i++){
    const e=h.square||.9,sq=v=>Math.sign(v)*Math.abs(v)**e,uy=p.getY(i);
    let x=sq(p.getX(i))*.143*h.w,y=(uy>0?sq(uy)*.94:uy)*.194*h.h,z=sq(p.getZ(i))*.136*h.d;
    const taper=y<-.012?1-.27*T.MathUtils.smoothstep(-y,.012,.185):1;x*=taper;
    // A long, flattened back of the skull rather than a ball.
    if(z<0){z*=1.08;x*=1-.06*Math.max(0,-z/.14);}
    if(z>0){
      const front=T.MathUtils.smoothstep(z,0,.07),ax=Math.abs(x);
      let s=gaussian(ax,y,.07,.05,.05,.014)*.026*h.brow;           // brow ridge
      s+=gaussian(x,y,0,.045,.03,.012)*.012*h.brow;
      s-=gaussian(ax,y,.077,.022,.03,.022)*.008*h.hollow;           // sunken sockets
      s+=gaussian(ax,y,.098,-.032,.026,.016)*.026*h.cheek;          // cheekbones
      s-=gaussian(ax,y,.09,-.08,.032,.028)*.02*h.hollow;            // hollow cheeks
      s-=gaussian(ax,y,.128,.03,.022,.05)*.016*h.hollow;            // temples
      s+=gaussian(x,y,0,-.095,.05,.03)*.02;                         // muzzle
      s-=gaussian(x,y,0,-.16,.07,.04)*.026;                         // lower face sits behind the jaw
      s+=gaussian(ax,y,.1,-.13,.03,.04)*.012;                       // jaw corners
      z+=s*front;
    }
    // A caved-in fracture somewhere on the crown.
    const dd=gaussian(x*dent[2],y,dent[0]+.04,dent[1],.04,.035);z-=dd*.012*Math.sign(z);x-=dd*.01*Math.sign(x);
    x+=tilt*Math.sin(y*30)+.0022*Math.sin(y*41+z*23)*Math.max(0,z/.14);
    p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals();return g;
}

export function createZombieRig({rng=Math.random,brute=false,feral=false}={}){
  const rand=(a,b)=>a+(b-a)*rng(),style=feral?FERAL_STYLE:brute?BRUTE_STYLE:styles[Math.floor(rng()*styles.length)],B=BUILDS[style.build];
  const group=new T.Group(),root=new T.Group();group.add(root);root.position.y=.92;
  const resources={geometries:new Set(),materials:new Set()};
  function material(color,roughness=.87,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness,vertexColors:true});resources.materials.add(m);return m;}
  const skin=markEnemySurface(material(style.skin,.74),ENEMY_SURFACE.skin),cloth=markEnemySurface(material(style.coat,.92),ENEMY_SURFACE.cloth),pants=markEnemySurface(material(style.pants,.9),ENEMY_SURFACE.leather),boot=markEnemySurface(material(0x221f1b,.62),ENEMY_SURFACE.leather),wound=markEnemySurface(material(0x5c1a20,.42),ENEMY_SURFACE.wound),flesh=markEnemySurface(material(0x7a3b38,.5),ENEMY_SURFACE.wound),bone=markEnemySurface(material(0xa89c7c,.6),ENEMY_SURFACE.bone),hair=markEnemySurface(material(0x2a2a24,.95),ENEMY_SURFACE.fur),lining=markEnemySurface(material(style.shirt,.9),ENEMY_SURFACE.cloth),metal=material(0x6e604a,.55,.55),recess=material(0x0c0708,1),gum=markEnemySurface(material(0x4a2228,.45),ENEMY_SURFACE.wound);
  const eyes=makeRedEyeMaterial(resources);
  function own(g,opts){resources.geometries.add(g);if(!g.attributes.color)paint(g,opts);return g;}
  const eyeGeo=own(makeEyeGeometry(),{amount:.03,ao:0}),bead=own(new T.SphereGeometry(1,8,6),{amount:.08});
  function shape(parent,geo,mat,pos=[0,0,0],scale=[1,1,1],rot){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);if(rot)m.rotation.set(...rot);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  // Irregular lumps replace the old shared ellipsoid.
  const L=(parent,mat,pos,scale,opts={},rot)=>shape(parent,own(pooledLump(rng,opts,opts.uv??.3)),mat,pos,scale,rot);
  const dot=(parent,mat,pos,scale,rot)=>shape(parent,bead,mat,pos,scale,rot);
  const S=(parent,mat,points,radius,opts={},paintOpts={})=>shape(parent,own(uvWindow(sweep(rng,points,radius,opts),rng,opts.uv??.22),{amount:.12,ao:.2,...paintOpts}),mat);
  function wear(parent,mat,rings,opts={},paintOpts={}){
    const g=own(tube(rng,rings,{sides:14,...opts}),{amount:.2,ao:.35,...paintOpts}),m=shape(parent,g,mat);
    if(g.userData.inner)shape(parent,own(g.userData.inner,{amount:.1,ao:0}),opts.innerMat||lining);
    return m;
  }
  const joint=(parent,pos,name)=>{const j=new T.Group();j.name=name;j.position.set(...pos);parent.add(j);return j;};
  const clothed=!feral&&style.build!=='brute',W=B.chest,Wa=B.waist,D=B.depth,N=B.neck,lim=B.limb;

  // ---- Pelvis and torso ------------------------------------------------------------------------
  const spine=joint(root,[0,.09,0],'spine');
  wear(root,pants,[[-.14,.166*Wa,.121*D],[-.05,.176*Wa,.13*D],[.03,.172*Wa,.128*D],[.11,.16*Wa,.118*D]],{folds:.05,rough:.02},{grime:.3,top:.11,bottom:-.14});
  const belt=wear(root,feral?pants:boot,[[.075,.168*Wa,.124*D],[.105,.164*Wa,.121*D]],{sides:16,rough:.03,ragged:feral?.02:0},{amount:.25});
  if(!feral)L(root,metal,[.02,.09,.125*D+.005],[.032,.025,.01],{rough:.1});
  // Living layer: a gaunt or swollen body with rib relief and a back hump.
  const torsoRings=[[-.1,.165*Wa,.118*D],[.02,.152*Wa,.11*D],[.15,.168*W,.122*D],[.28,.196*W,.13*D],[.38,.226*W,.122*D,{z:-.008}],[.45,.185*W,.1*D,{z:-.012}],[.5,.072*N,.066*N,{z:.004}],[.61,.056*N,.054*N,{z:.022}]];
  const torso=wear(spine,skin,torsoRings,{sides:16,rough:.05,freq:9,ribs:B.ribs,ribRange:[.25,.55],belly:B.belly,back:-B.hump*.35},{amount:.22,grime:.15,top:.6,bottom:-.1});
  // Sinewy neck and collarbones on the gaunt.
  for(const s of [-1,1]){
    S(spine,skin,[[s*.05,.6,-.01],[s*.045,.53,.035],[s*.028,.47,.075*D]],.011*N,{sides:5});
    if(B.ribs)S(spine,skin,[[s*.025,.45,.09*D],[s*.11,.455,.082*D],[s*.19*W,.44,.03]],.008,{sides:5,rough:.15});
  }
  if(B.hump>.1)for(const s of [-1,1])L(spine,skin,[s*.09*W,.43,-.06],[.12*W*(.8+B.hump*.4),.07+B.hump*.05,.09*(1+B.hump*.5)],{rough:.2},[0,0,s*.35]);
  // Back: knotted spine through the skin on the starved, feral and brute.
  if(!clothed||B.ribs>.06)for(let i=0;i<7;i++)L(spine,feral?bone:skin,[0,.02+i*.068,-(torsoRings[Math.min(5,1+Math.floor(i/1.5))][2])*.98],[.022,.02,.02],{rough:.25});

  // Garments per archetype.
  const coatRings=(scale,top=.47)=>[[-.13,.172*Wa*scale,.124*D*scale],[.0,.162*Wa*scale,.118*D*scale],[.15,.176*W*scale,.128*D*scale],[.28,.205*W*scale,.137*D*scale],[.385,.236*W*scale,.13*D*scale,{z:-.008}],[top,.17*W*scale,.1*D*scale,{z:-.01}]];
  const hole=(cu,cv,ru,rv)=>(u,v)=>((u-cu)/ru)**2+((v-cv)/rv)**2<1;
  const any=(...cuts)=>(u,v)=>cuts.some(c=>c(u,v));
  if(style.name==='groundskeeper'){
    wear(spine,lining,coatRings(1.03,.46),{folds:.05,ragged:.02,cut:any(hole(.27,.45,.04,.16),hole(.82,.3,.05,.12)),inner:.05},{grime:.25,top:.46,bottom:-.13});
    wear(spine,cloth,coatRings(1.1,.48),{folds:.09,foldFreq:6,ragged:.045,cut:any((u,v)=>Math.abs(u-.25)<.055&&v>.05,hole(.6,.2,.05,.1),hole(.95,.6,.04,.08)),inner:.06,innerMat:cloth},{grime:.35,top:.48,bottom:-.13});
    // Turned-up collar points rather than round lapels.
    for(const s of [-1,1])shape(spine,own(uvWindow(shard(rng,{bend:.3}),rng,.3),{amount:.2}),cloth,[s*.06,.44,.1*D],[.05,.09,.012],[.25,0,s*2.5]);
    for(const s of [-1,1])L(spine,cloth,[s*.12,.19,.135*D],[.055,.025,.015],{rough:.15,flat:-.2});
  }else if(style.name==='footman'){
    wear(spine,lining,coatRings(1.025,.47),{folds:.03,cut:hole(.25,.35,.035,.12)},{grime:.15});
    wear(spine,cloth,coatRings(1.06,.4),{folds:.04,ragged:.015,cut:any((u,v)=>Math.abs(u-.25)<.04+v*.03,hole(.4,.55,.03,.08)),inner:.05,innerMat:cloth},{grime:.2,top:.4,bottom:-.13});
    wear(spine,cloth,coatRings(1.11,.47),{folds:.07,foldFreq:4,ragged:.06,cut:any((u,v)=>Math.abs(u-.25)<.075+v*.05,hole(.12,.6,.04,.1)),inner:.06,innerMat:lining},{grime:.3,top:.47,bottom:-.13});
    // Long split tailcoat tails hang behind the legs.
    for(const s of [-1,1])wear(spine,cloth,[[-.56,.12,.06,{x:s*.06,z:-.1}],[-.35,.13,.07,{x:s*.065,z:-.11}],[-.15,.15,.09,{x:s*.07,z:-.1}],[-.05,.15,.1,{x:s*.065,z:-.08}]],{sides:12,ragged:.07,folds:.06,cut:(u)=>s<0?!(u>.5&&u<.74):!(u>.76&&u<1),inner:.08,innerMat:cloth},{grime:.4,top:-.05,bottom:-.56});
    for(const s of [-1,1])shape(spine,own(uvWindow(shard(rng,{bend:.1}),rng,.2),{amount:.15}),boot,[s*.004,.47,.098*D],[.03,.045,.01],[0,0,s*1.75]);
  }else if(style.name==='fallen guest'){
    wear(spine,lining,coatRings(1.03,.47),{folds:.05,ragged:.06,cut:any(hole(.25,.42,.08,.22),hole(.08,.62,.05,.1),hole(.55,.3,.04,.12)),inner:.04},{grime:.3});
    wear(spine,cloth,coatRings(1.09,.44),{folds:.06,ragged:.04,cut:any((u,v)=>Math.abs(u-.25)<.09,hole(.75,.5,.06,.12)),inner:.05,innerMat:cloth},{grime:.3,top:.44,bottom:-.13});
    // Tattered long skirt of a ruined evening coat, open at the front.
    wear(root,cloth,[[-.58,.21,.17],[-.38,.2,.16],[-.18,.185,.145],[.0,.172*Wa*1.08,.13*D*1.08],[.08,.168*Wa*1.08,.126*D*1.08]],{sides:16,folds:.1,foldFreq:7,ragged:.09,cut:any((u,v)=>Math.abs(u-.25)<.11,hole(.62,.25,.05,.15),hole(.9,.4,.04,.1)),inner:.06,innerMat:cloth},{grime:.45,top:.08,bottom:-.58});
    for(let i=0;i<11;i++){const a=-.95+i*.19;dot(spine,i%4?bone:metal,[Math.sin(a)*.085,.47-Math.cos(a)*.04+.035,.07*D+Math.cos(a)*.03],[.0095,.0095,.0095]);}
  }else if(style.name==='caretaker'){
    wear(spine,lining,coatRings(1.04,.47),{folds:.06,ragged:.03,belly:B.belly,cut:any(hole(.33,.5,.035,.08),hole(.7,.4,.04,.1)),inner:.04},{grime:.3});
    for(const s of [-1,1])S(spine,boot,[[s*.08,.0,.15*D*1.25],[s*.09,.25,.155*D],[s*.1,.43,.1],[s*.06,.45,-.08],[s*.05,.1,-.13]],.009,{sides:4});
    // Long, stained work apron with a torn hem.
    wear(spine,cloth,[[-.66,.17,.07,{z:.2}],[-.4,.18,.08,{z:.19}],[-.15,.18,.09,{z:.16}],[.1,.17,.08,{z:.12*D+.06*B.belly}],[.32,.13,.05,{z:.08}]],{sides:12,ragged:.08,folds:.06,cut:(u)=>!(u>.04&&u<.46),inner:.06,innerMat:cloth},{grime:.5,top:.32,bottom:-.66});
    for(let i=0;i<4;i++)L(spine,wound,[rand(-.12,.12),rand(.05,.35),.125*D*1.04+.03*B.belly],[.014,.012,.008],{rough:.3});
  }else if(style.name==='estate brute'){
    // Bare, scarred barrel chest under a butcher's leather apron.
    wear(spine,boot,[[-.68,.2,.08,{z:.2}],[-.42,.21,.09,{z:.2}],[-.15,.2,.1,{z:.17}],[.1,.19,.09,{z:.15}],[.3,.15,.06,{z:.14}]],{sides:12,ragged:.06,folds:.04,cut:(u)=>!(u>.05&&u<.45),inner:.05,innerMat:boot},{grime:.45,top:.3,bottom:-.68});
    for(const s of [-1,1])S(spine,boot,[[s*.12,.3,.15],[s*.14,.42,.1],[s*.08,.5,-.05],[s*.1,.3,-.14]],.011,{sides:4});
    // Stitched gashes and bone spurs breaking through the back.
    S(spine,wound,[[-.15,.2,.135],[-.05,.27,.142],[.08,.25,.142],[.16,.32,.13]],.006,{sides:4});
    for(let i=0;i<6;i++){const x=-.13+i*.055;S(spine,boot,[[x-.005,.21+i*.012,.15],[x+.006,.25+i*.012,.15]],.002,{sides:3,segments:2});}
    for(let i=0;i<4;i++){const spur=shape(spine,own(shard(rng,{bend:.25}),{amount:.2}),bone,[rand(-.06,.06),.18+i*.08,-.14],[.035,.07+rng()*.05,.035],[-1.3,rand(-.3,.3),0]);void spur;}
  }else{
    // Feral: torn-open belly with ribs and dark cavity behind them.
    const ribs=joint(spine,[0,0,0],'feral ribcage');
    L(spine,recess,[0,.15,.07],[.1,.11,.06],{rough:.2});
    L(spine,flesh,[0,.14,.085],[.115,.13,.05],{rough:.35});
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const y=.31-i*.048,x0=.012,x1=.15-i*.004;
      S(ribs,bone,[[side*x0,y+.012,.118],[side*(x0+x1)*.45,y,.126],[side*x1*.92,y-.03,.09],[side*(x1+.01),y-.055,.01]],t=>.0062-.002*t,{sides:5,rough:.15});
    }
    S(ribs,bone,[[0,.33,.12],[0,.24,.13],[0,.16,.124]],.008,{sides:5,rough:.2});
    for(let i=0;i<4;i++)S(spine,flesh,[[rand(-.1,.1),rand(.05,.3),.12],[rand(-.1,.1),rand(0,.2),.125]],.005,{sides:4,rough:.3});
    // Shredded trousers held by a rope belt.
  }
  if(clothed&&style.name!=='footman'&&style.name!=='fallen guest'){
    for(const s of [-1,1]){const collar=L(spine,style.name==='groundskeeper'?cloth:lining,[s*.07,.47,.05],[.065,.035,.045],{rough:.25});collar.rotation.z=s*.55;}
  }

  // ---- Head -----------------------------------------------------------------------------------
  const head=joint(spine,[0,.65,.03],'head');head.scale.setScalar(brute?.84:.8);
  const skullGeo=own(sculptSkull(rng,B.head),{amount:.18,ao:.25});skullGeo.userData.enemySurfaceTile=ENEMY_SURFACE.face;shape(head,skullGeo,skin);
  // Features are seated on the sculpted surface, found by casting at the skull.
  const probe=new T.Mesh(skullGeo),ray=new T.Raycaster(),hitAt=(o,d)=>{ray.set(o,d);return ray.intersectObject(probe)[0]?.point;};
  const surf=(x,y)=>hitAt(new T.Vector3(x,y,.5),new T.Vector3(0,0,-1))?.z??.1;
  const side$=(s,y,z)=>hitAt(new T.Vector3(s*.5,y,z),new T.Vector3(-s,0,0))?.x??s*.13;
  // Scalp shells follow the skull exactly: hair, a cap, or a torn patch.
  function scalp(offset,keep,mat,paintOpts={}){
    const src=skullGeo.toNonIndexed(),p=src.attributes.position,n=src.attributes.normal,uv=src.attributes.uv,pos=[],nor=[],uvs=[];
    for(let i=0;i<p.count;i+=3){
      const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,cy=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
      if(!keep(cx,cy,cz))continue;
      for(let k=i;k<i+3;k++){pos.push(p.getX(k)+n.getX(k)*offset,p.getY(k)+n.getY(k)*offset,p.getZ(k)+n.getZ(k)*offset);nor.push(n.getX(k),n.getY(k),n.getZ(k));uvs.push(uv.getX(k),uv.getY(k));}
    }
    src.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    return shape(head,own(g,{amount:.2,ao:.2,...paintOpts}),mat);
  }
  const browWeight=B.head.brow,faceSnarl=(feral?.2:brute?.16:.11)+(style.slack||0);
  for(const side of [-1,1]){
    const ex=side*.077,ey=.022,ez=surf(ex,ey);
    dot(head,recess,[ex,ey,ez-.003],[.03,.018,.012],[0,0,-side*.1]);
    const eye=shape(head,eyeGeo,eyes,[ex,ey,ez+.006],[.0125,.0085,.008]);eye.rotation.z=-side*.1;eye.name='Red eye';
    const brow=L(head,skin,[side*.072,.05,surf(side*.072,.05)+.002],[.04,.0065*browWeight,.012],{rough:.2});brow.rotation.z=side*.22;brow.name='Scowling brow';
    // Ears: whole, chewed or torn away to a raw hole.
    const earX=side$(side,-.012,-.01);
    if(style.ears[side<0?0:1])L(head,skin,[earX+side*.004,-.012,-.01],[.011,.034,.024],{rough:.2},[0,side*.45,0]);
    else{dot(head,recess,[earX,-.012,-.005],[.01,.015,.011]);L(head,wound,[earX-side*.002,-.01,-.008],[.012,.022,.017],{rough:.4});}
  }
  // Noses: broken and crooked, pinched thin, flattened, or rotted to a cavity.
  if(style.nose==='rotted'){
    const nz=surf(0,-.034);L(head,wound,[0,-.034,nz-.002],[.022,.022,.007],{rough:.4});
    for(const s of [-1,1])dot(head,recess,[s*.009,-.036,nz+.001],[.008,.015,.006],[0,0,-s*.35]);
    S(head,bone,[[0,-.006,surf(0,-.006)+.002],[0,-.02,nz+.006],[0,-.038,nz+.004]],.0035,{sides:4});
  }else{
    const bend=style.nose==='broken'?(rng()<.5?-1:1)*.011:0,w=style.nose==='flat'?1.5:style.nose==='thin'?.75:1,z0=surf(0,.01),z1=surf(0,-.04);
    S(head,skin,[[0,.016,z0-.004],[bend*.4,-.004,z0+.008],[bend,-.03,z1+.02],[bend*.8,-.046,z1+.016]],t=>(.008+t*.01)*w,{sides:7,flat:.8,rough:.1});
    for(const s of [-1,1])dot(head,recess,[bend*.8+s*.01,-.05,z1+.012],[.005,.003,.004]);
  }
  const mz=surf(0,-.1);dot(head,recess,[0,-.106,mz-.004],[.046,.009,.01]);
  const jaw=joint(head,[0,-.09,.016],'jaw'),J=(x,y,z)=>[x,y+.09,z-.016];
  // The mandible: a hard U of bone under the skin and a pointed chin.
  const jw=style.jaw,chinZ=surf(0,-.15)+.012;
  S(jaw,skin,[J(-.1*jw,-.07,-.01),J(-.08*jw,-.125,surf(.08,-.125)-.006),J(-.035,-.155,surf(.035,-.15)+.004),J(0,-.16,chinZ),J(.035,-.155,surf(.035,-.15)+.004),J(.08*jw,-.125,surf(.08,-.125)-.006),J(.1*jw,-.07,-.01)],t=>.022-.006*Math.sin(t*Math.PI),{sides:7,flat:.75,rough:.1,segments:18});
  L(jaw,skin,J(0,-.152,chinZ-.006),[.034,.024,.022],{rough:.15});
  // Lips peel back from the teeth; the lipless show bare gums.
  if(style.lipless){
    L(head,gum,[0,-.092,mz+.002],[.056,.01,.01],{rough:.25});
    L(jaw,gum,J(0,-.126,surf(0,-.125)+.004),[.054,.009,.01],{rough:.25});
  }else{
    const lip=[-.056,-.04,-.02,0,.02,.04,.056].map((x,i)=>[x,-.093-Math.abs(x)*.22+(i===2||i===4?.003:0),surf(x,-.094)+.004]);
    S(head,skin,lip,.0026,{sides:5,rough:.35}).name='Curled upper lip';
    L(head,gum,[0,-.094,mz-.001],[.05,.006,.008],{rough:.3});
    S(jaw,skin,[-.05,-.025,0,.025,.05].map(x=>J(x,-.126+Math.abs(x)*.12,surf(x,-.126)+.004)),.0024,{sides:5,rough:.35});
  }
  if(style.torn){
    // One cheek ripped open to the molars.
    const s=feral?1:-1,cx=s*.072,cz=surf(cx,-.086);
    L(head,recess,[cx,-.086,cz-.005],[.024,.016,.01],{rough:.3});L(head,flesh,[cx+s*.004,-.082,cz-.004],[.03,.025,.01],{rough:.5});
    for(let i=0;i<4;i++){const x=s*(.056+i*.008);L(head,bone,[x,-.096,surf(x,-.096)-.003],[.005,.008,.005],{rough:.2,uv:.15});}
  }
  // Irregular, rotten teeth with gaps: blunt, chipped, missing, long canines.
  const toothCount=feral?9:7,spacing=feral?.0125:.0135,tooth=(parent,pos,s,canine,down)=>canine||feral?shape(parent,own(uvWindow(shard(rng,{bend:rand(-.15,.15),rough:.2}),rng,.15),{amount:.3,ao:.1}),bone,pos,[s[0],s[1]*1.25,s[2]],[down?Math.PI+rand(-.12,.12):rand(-.12,.12),0,rand(-.12,.12)]):L(parent,bone,[pos[0],pos[1]+(down?-1:1)*s[1]*.5,pos[2]],[s[0]*.85,s[1]*.6,s[2]*.8],{rough:.18,uv:.15},[rand(-.1,.1),0,rand(-.15,.15)]);
  for(let i=0;i<toothCount;i++){
    const x=(i-(toothCount-1)/2)*spacing,canine=i===1||i===toothCount-2;
    if(rng()>.84&&!canine)continue;
    tooth(head,[x,-.098,surf(x,-.1)-.002],[.0085,(rand(.013,.018)+(canine?(feral?.012:.005):0))*(feral?1.2:1),.006],canine,true);
    if(rng()>.2)tooth(jaw,J(x,-.12,surf(x,-.12)-.003),[.0075,rand(.011,.015)*(feral?1.3:1)+(canine&&brute?.012:0),.0055],canine,false);
  }
  // Hair: a flat cap, slicked and balding, long lank strands, a few wisps, or none.
  const hairline=(x,y,z)=>y>.075+Math.max(0,z)*.55-Math.max(0,-z)*.5;
  if(style.hair==='cap'){
    scalp(.012,(x,y,z)=>y>.08+Math.max(0,z)*.15-Math.max(0,-z)*.25,cloth,{grime:.2,top:.2,bottom:.08});
    L(head,cloth,[0,.118,surf(0,.11)+.035],[.12,.011,.06],{rough:.2},[-.25,0,0]);
    scalp(.004,(x,y,z)=>y>-.02&&y<.1&&z<-.02&&Math.abs(x)>.04,hair);
  }else if(style.hair==='slick'){
    scalp(.005,(x,y,z)=>hairline(x,y,z)&&!((x-.03)**2+(z+.02)**2<.004&&y>.15),hair);
    // A torn scalp flap over bare, cracked skull.
    scalp(.0035,(x,y,z)=>(x+.1)**2+(y-.09)**2<.0024&&x<0,wound);scalp(.0055,(x,y,z)=>(x+.1)**2+(y-.09)**2<.0013&&x<0,bone);
    for(let i=0;i<6;i++){const x=rand(-.11,.11);S(head,hair,[[x,.17,.03],[x*1.1,.18,-.05],[x*1.15,.11,-.13],[x*1.1,.03,-.15]],.006,{sides:3,rough:.2,taper:.6});}
  }else if(style.hair==='strands'){
    scalp(.005,(x,y,z)=>hairline(x,y,z)&&Math.sin(x*60)*Math.cos(z*50)>-.6,hair);
    for(let i=0;i<16;i++){
      const a=Math.PI*.2+i/15*Math.PI*1.6,x=Math.cos(a)*.13,z=-Math.abs(Math.sin(a))*.11+(i%2)*.01-.01,len=.17+rng()*.18;
      if(z>.02&&Math.abs(x)<.11)continue;
      S(head,hair,[[x*.8,.17,z*.8],[x*1.05,.1,z],[x*1.12+rand(-.02,.02),.1-len*.5,z*1.05],[x*1.1+rand(-.03,.03),.1-len,z*1.05-.01]],.009,{sides:4,rough:.2,taper:.75});
    }
  }else if(style.hair==='sparse'){
    scalp(.004,(x,y,z)=>y>.02&&Math.abs(x)>.09&&z<.04,hair);
    for(let i=0;i<6;i++){const x=rand(-.11,.11),z=rand(-.12,0);S(head,hair,[[x,.17,z],[x*1.2,.15,z-.04],[x*1.35,.08,z-.06]],.004,{sides:3,taper:.7});}
    for(let i=0;i<4;i++){const s=i%2?1:-1,x=s*rand(.07,.1),y=rand(.12,.16),z=surf(x,y)-.004;L(head,i%2?wound:skin,[x,y,z],[.012,.01,.008],{rough:.3});}
  }else{
    // Bald scalp: scars, stitches and a split in the crown.
    scalp(.003,(x,y,z)=>Math.abs(x-.02+z*.25)<.007&&y>.08,wound);
    for(let i=0;i<6;i++){const z=.06-i*.035,x=.02-z*.25;S(head,boot,[[x-.012,.176-Math.abs(z)*.12,z],[x+.012,.178-Math.abs(z)*.12,z+.004]],.0016,{sides:3,segments:2});}
  }

  // ---- Limbs ----------------------------------------------------------------------------------
  const legs=[],arms=[],pieces=[{node:root,a:'pelvis',b:'chest',frame:true},{node:spine,a:'pelvis',b:'chest',frame:true},{node:head,a:'chest',b:'skull'}];
  const barefoot=[feral||style.name==='fallen guest',feral];
  const sleeve=feral||brute?['none','none']:style.name==='caretaker'?['rolled','rolled']:style.name==='fallen guest'?['elbow','torn']:style.name==='groundskeeper'?['full','elbow']:['full','full'];
  for(const [index,side] of [-1,1].entries()){
    const tag=index?'R':'L';
    const leg=joint(root,[side*.123,-.035,0],tag+' hip');
    if(feral){
      wear(leg,skin,[[-.42,.05,.056],[-.3,.062,.068],[-.15,.08,.085],[.02,.1,.105]],{rough:.08,ridge:.06},{grime:.2,top:.02,bottom:-.42});
      wear(leg,pants,[[-.3,.08,.087],[-.17,.092,.098],[.02,.112,.118]],{folds:.1,ragged:.05,cut:hole(index?.3:.7,.4,.06,.3)},{grime:.5,top:.02,bottom:-.3});
    }else wear(leg,pants,[[-.44,.066*lim,.074*lim],[-.36,.072*lim,.08*lim],[-.24,.083*lim,.09*lim],[-.1,.096*lim,.102*lim],[.04,.108*Wa,.112*D]],{folds:.09,foldFreq:5,cut:rng()<.5?hole(rand(.1,.9),rand(.3,.7),.05,.1):null,inner:.05,innerMat:pants},{grime:.35,top:.04,bottom:-.44});
    const calf=joint(leg,[0,-.415,0],tag+' knee');
    L(calf,feral?bone:pants,[0,-.01,.035],[.05*lim,.05,.04],{rough:.2});
    const shin=wear(calf,skin,[[-.35,.03*lim,.032*lim],[-.25,.042*lim,.046*lim],[-.12,.052*lim,.058*lim],[.0,.05*lim,.054*lim]],{rough:.08,ridge:.12,back:-.1},{grime:.35,top:0,bottom:-.35});void shin;
    if(!feral){
      const hem=index===0&&style.name!=='footman'?-.24:-.33;
      wear(calf,pants,[[hem,.064*lim,.068*lim],[-.2,.066*lim,.071*lim],[-.08,.072*lim,.077*lim],[.03,.075*lim,.08*lim]],{folds:.1,ragged:index===0?.05:.025,cut:rng()<.4?hole(rand(.1,.9),.5,.06,.18):null,inner:.06,innerMat:pants},{grime:.5,top:.03,bottom:-.33});
    }
    const foot=joint(calf,[0,-.345,0],tag+' ankle');
    if(barefoot[index]){
      L(foot,skin,[0,-.058,.045],[.048,.032,.105],{rough:.12,flat:-.6});
      L(foot,skin,[0,-.035,-.01],[.038,.04,.04],{rough:.15});
      for(let t=0;t<5;t++){
        const x=(t-2)*.018*side,len=feral?.05:.03;
        S(foot,skin,[[x*1.05,-.07,.12],[x*1.12,-.075,.135+len*.4],[x*1.15,-.082,.14+len]],.0085-t*.0008,{sides:4,taper:.3});
        if(feral)shape(foot,own(shard(rng,{bend:.4}),{amount:.2}),bone,[x*1.15,-.083,.14+len],[.007,.025,.007],[Math.PI/2+.3,0,0]);
      }
    }else{
      wear(foot,boot,[[-.05,.052,.058],[.02,.05,.055],[.07,.055,.06]],{rough:.06,folds:.06},{grime:.4,top:.07,bottom:-.05});
      L(foot,boot,[0,-.045,.058],[.062,.05,.13],{rough:.08,flat:-.55,pull:[0,.25,1]});
      L(foot,boot,[0,-.082,.055],[.066,.012,.14],{rough:.05});
      for(let i=0;i<3;i++)S(foot,lining,[[-.03,.0+i*.02,.06-i*.004],[0,.004+i*.02,.064-i*.004],[.03,.0+i*.02,.06-i*.004]],.0025,{sides:3,segments:3});
      if(rng()<.35)L(foot,skin,[side*.03,-.05,.15],[.018,.016,.02],{rough:.2});
    }
    legs.push({pivot:leg,calf,foot});pieces.push({node:leg,a:tag+'hip',b:tag+'knee'},{node:calf,a:tag+'knee',b:tag+'ankle'},{node:foot,a:tag+'ankle',b:tag+'toe'});

    const arm=joint(spine,[side*.238*Math.max(.92,W),.411,-.004],tag+' shoulder');
    wear(arm,skin,[[-.33,.041*lim,.041*lim],[-.22,.047*lim,.047*lim],[-.1,.058*lim,.055*lim],[.0,.07*lim,.066*lim],[.06,.074*lim,.07*lim],[.085,.03,.03]],{rough:B.ribs?.13:.07,freq:11,ridge:.04,ridgeAngle:Math.PI*1.5},{grime:.15,top:.08,bottom:-.33});
    if(!clothed)L(arm,skin,[side*.012,-.01,0],[.075*lim,.085,.07*lim],{rough:.15});
    const sl=sleeve[index];
    if(sl!=='none'){
      const bottom=sl==='rolled'?-.15:sl==='torn'?-.08:-.34,rings=[[bottom,.062*lim,.06*lim],[-.2,.066*lim,.064*lim],[-.1,.078*lim,.074*lim],[0,.09*lim,.085*lim],[.06,.092*lim,.088*lim],[.088,.035,.035]].filter(r=>r[0]>=bottom);
      wear(arm,style.name==='caretaker'?lining:cloth,rings,{folds:.1,foldFreq:5,ragged:sl==='torn'?.05:.03,inner:.06,innerMat:lining},{grime:.3,top:.09,bottom});
      if(sl==='rolled')L(arm,lining,[0,-.15,0],[.07*lim,.022,.067*lim],{rough:.2});
    }
    const forearm=joint(arm,[0,-.32,0],tag+' elbow');
    L(forearm,skin,[0,-.005,-.012],[.05*lim,.047,.05*lim],{rough:.15});
    const exposed=style.name==='groundskeeper'&&index===1;
    wear(forearm,exposed?flesh:skin,[[-.305,.03*lim,.024*lim],[-.27,.028*lim,.024*lim],[-.17,.037*lim,.034*lim],[-.07,.048*lim,.044*lim],[.03,.046*lim,.046*lim]],{rough:.08,ridge:.1,ridgeAngle:Math.PI*1.5,cut:exposed?hole(.25,.55,.12,.3):null},{grime:.2,top:.03,bottom:-.3});
    if(exposed){S(forearm,bone,[[0,.0,.0],[.004,-.12,.012],[0,-.27,.006]],.011,{sides:6,rough:.15});S(forearm,bone,[[.012,-.03,-.01],[.016,-.15,0],[.012,-.27,-.004]],.008,{sides:5,rough:.15});}
    if(sl==='full'){const r=[[-.25,.05*lim,.047*lim],[-.15,.056*lim,.054*lim],[-.05,.064*lim,.062*lim],[.03,.066*lim,.064*lim]];wear(forearm,cloth,r,{folds:.12,ragged:.045,inner:.06,innerMat:lining},{grime:.4,top:.03,bottom:-.25});}
    else for(let i=0;i<2;i++)S(forearm,skin,[[(i?.012:-.012),-.04,.034*lim],[(i?.014:-.01),-.16,.03*lim],[(i?.01:-.008),-.26,.022*lim]],.005,{sides:4});
    if(brute){
      // Iron shackle and a length of broken chain.
      wear(forearm,metal,[[-.27,.042*lim,.04*lim],[-.23,.042*lim,.04*lim]],{sides:10,rough:.04});
      for(let c=0;c<3;c++){const link=shape(forearm,own(new T.TorusGeometry(.016,.0045,4,8)),metal,[.03*side,-.27-c*.026,.025],[1,1,1],[0,c%2?Math.PI/2:0,0]);void link;}
    }
    const hand=joint(forearm,[0,-.29,.014],tag+' wrist');
    L(hand,skin,[0,-.044,.002],[.038*lim,.05,.018*lim],{rough:.12,flat:null});
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.02*lim,c=rand(.3,1.1),len=(f===0||f===3?.85:1)*(feral?1.25:1);
      S(hand,skin,[[x,-.082,.004],[x*1.05,-.082-.032*len,.01+c*.008],[x*1.1,-.082-.06*len,.022+c*.024],[x*1.12,-.082-.08*len,.04+c*.048]],t=>(.0082-.002*t+.0012*Math.sin(t*Math.PI*2.4))*lim,{sides:5,segments:8});
      dot(hand,skin,[x,-.08,.012],[.01,.008,.009]);
      const tip=[x*1.12,-.082-.08*len,.04+c*.048];
      if(feral)shape(hand,own(shard(rng,{bend:.5}),{amount:.25}),bone,tip,[.009,.045,.009],[Math.PI+.4+c*.4,0,0]);
      else dot(hand,boot,tip,[.006,.004,.006]);
    }
    S(hand,skin,[[side*.03,-.03,.012],[side*.045,-.06,.026],[side*.045,-.09,.04]],.0095*lim,{sides:5,taper:.3});
    arms.push({pivot:arm,forearm,hand});pieces.push({node:arm,a:tag+'shoulder',b:tag+'elbow'},{node:forearm,a:tag+'elbow',b:tag+'wrist'},{node:hand,a:tag+'wrist',b:tag+'palm'});
  }
  void belt;
  const rig={group,root,spine,torso,head,jaw,legs,arms,pieces,resources,style:style.name,faceSnarl,slump:B.slump,phase:rand(0,6.28),limp:rand(.12,.4),lean:rand(-.12,.12),stride:rand(.85,1.15),gait:rollGait(rng,{feral,brute}),attackHand:Math.floor(rng()*2),attackTime:-1,flinch:0,flinchDirection:1,brute,feral};
  // Uniform global scale keeps joint matrices free of shear when a ragdoll detaches.
  group.scale.setScalar(brute?BRUTE.scale:rand(.97,1.06));
  return rig;
}

export function tagZombie(rig,enemy){
  rig.group.traverse(o=>{if(o.isMesh){o.userData.enemy=enemy;o.userData.part='torso';o.userData.side=0;}});
  for(const [i,leg] of rig.legs.entries())leg.pivot.traverse(o=>{if(o.isMesh){o.userData.part='leg';o.userData.side=i?1:-1;o.userData.limb='rear';}});
  for(const [i,arm] of rig.arms.entries())arm.pivot.traverse(o=>{if(o.isMesh){o.userData.part=rig.dog?'leg':'arm';o.userData.side=i?1:-1;o.userData.limb='front';}});
  rig.head.traverse(o=>{if(o.isMesh){o.userData.head=true;o.userData.part='head';}});
  // Original geometries that were merged are no longer needed.
  if(rig.sharedAssets)return;
  const retained=new Set();rig.group.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});
  for(const geo of rig.resources.geometries)if(!retained.has(geo)){geo.dispose();rig.resources.geometries.delete(geo);}
}

export function reactToHit(e,impact={}){
  const yaw=e.group.rotation.y,dx=impact.direction?.x??0,dz=impact.direction?.z??-1;
  e.flinchDirection=clamp(dx*Math.cos(yaw)-dz*Math.sin(yaw),-1,1);
  e.flinchForward=clamp(dx*Math.sin(yaw)+dz*Math.cos(yaw),-1,1);
  e.flinchPart=impact.part||'torso';e.flinchSide=impact.side||((e.flinchDirection||1)>0?1:-1);e.flinchLimb=impact.limb;
  e.flinchDuration=e.flinchPart==='head'?.30:e.flinchPart==='leg'?.22:.25;e.flinch=e.flinchDuration;
  e.flinchStrength=clamp(impact.force??.8,.45,2)*(e.brute?.65:1);
  if(e.flinchPart==='head'&&e.staggerLeft>0)e.staggerPart='head';
  e.legHit=impact.part==='leg'?.32:(e.legHit||0);
}

// Additive reactions reuse the existing head, spine and limb joints. They never
// alter navigation or create a second animated/transparent copy of the enemy.
export function applyHitReaction(e,dt){
  e.flinch=Math.max(0,(e.flinch||0)-dt);e.legHit=Math.max(0,(e.legHit||0)-dt);
  if(e.flinch>0){
    const duration=e.flinchDuration||.25,age=duration-e.flinch;
    const f=(e.flinch/duration)*Math.min(1,age/.025)*(e.flinchStrength||.8),x=e.flinchDirection||0,z=e.flinchForward??-1;
    if(e.flinchPart==='head'){
      // A small neck snap lifts the chin without folding or lowering the body.
      e.head.rotation.x-=Math.min(f,.9)*(e.dog?.26:.30)*1.15;e.head.rotation.y-=x*f*.16;e.head.rotation.z-=x*f*.12;
      e.jaw.rotation.x+=f*.09;
    }else if(e.flinchPart==='arm'){
      const arm=e.arms[e.flinchSide>0?1:0];arm.pivot.rotation.x+=f*.42;arm.pivot.rotation.z+=e.flinchSide*f*.28;arm.forearm.rotation.x-=f*.35;
      e.spine.rotation.z-=e.flinchSide*f*.10;
    }else if(e.flinchPart==='leg'){
      const leg=(e.dog&&e.flinchLimb==='front'?e.arms:e.legs)[e.flinchSide>0?1:0];
      leg.pivot.rotation.x-=f*.20;(leg.calf||leg.forearm).rotation.x+=f*(e.dog?-.38:.46);
      (leg.foot||leg.hand).rotation.x-=f*.14;e.root.position.y-=f*(e.dog?.045:.055);
    }else{
      e.spine.rotation.x+=z*f*(e.dog?.15:.20);e.spine.rotation.z-=x*f*.20;e.head.rotation.x-=z*f*.10;
    }
  }
  if(e.staggerLeft>0&&e.staggerPart!=='head'){
    const f=Math.min(1,e.staggerLeft/.08);e.root.position.y-=f*(e.dog?.07:.10);e.spine.rotation.x+=f*(e.dog?.13:.22);
    if(!e.dog)for(const arm of e.arms)arm.forearm.rotation.x-=f*.18;
  }
}

// Distance-driven stride stays still against walls. Each individual has a limp,
// off-axis head pose, wrist drag, breathing and a wind-up/contact/recovery attack.
export function animateZombie(e,dt,distance,moved){
  const moving=clamp(moved/Math.max(dt*e.speed,.0001),0,1),blend=1-Math.exp(-dt*12);
  e.motion=T.MathUtils.lerp(e.motion||0,moving,blend);e.phase+=moved*6.4/e.stride;e.idle=(e.idle||0)+dt;
  const p=e.phase,w=e.motion,run=clamp((e.speed-1.1)/1.8,0,1),g=e.gait||DEFAULT_GAIT,hip=p+g.hipLag;
  // The dragged leg's stance dips the hips; the other leg recovers it.
  const dragStance=Math.max(0,Math.sin(p+g.dragLeg*Math.PI)),dragSign=g.dragLeg?-1:1;
  e.root.position.y=.92-Math.abs(Math.sin(p))*.025*g.bob*w-dragStance*e.limp*.06*w-(e.legHit>0?.055:0);
  e.root.rotation.set(.055+run*.08+(e.feral?.14:0)+g.hunch*.4+(e.slump||0)*.3,Math.sin(hip)*.055*g.sway*w,dragSign*Math.sin(hip)*e.limp*.1*w);
  e.spine.rotation.set(.1+run*.07+(e.feral?.12:0)+g.hunch+(e.slump||0),Math.sin(hip)*.095*g.sway*w,e.lean*.3);
  e.head.rotation.set((e.feral?-.24:-.07)-g.hunch*.7-(e.slump||0)*1.1+Math.sin(e.idle*1.1)*.055,Math.sin(p*.5)*.065,e.lean+Math.sin(e.idle*.8)*.035);
  e.jaw.rotation.x=(e.faceSnarl??.14)+Math.sin(e.idle*2.3)*.025;
  let contact=false;
  if(e.staggerLeft>0||e.crawlDrop>0)e.attackTime=-1;
  if(!(e.staggerLeft>0)&&!(e.crawlDrop>0)&&e.attackTime<0&&distance<1.65&&e.attack<=0){e.attackTime=0;e.attackHand=1-e.attackHand;e.attack=.95+(e.brute?.25:0);}
  let strike=0,windup=0;
  if(e.attackTime>=0){const prev=e.attackTime;e.attackTime+=dt;const hit=e.brute?.46:.34;windup=clamp(e.attackTime/hit,0,1);strike=clamp((e.attackTime-hit)/.17,0,1);contact=prev<hit&&e.attackTime>=hit;
    e.spine.rotation.y+=(e.attackHand?1:-1)*Math.sin(Math.min(1,e.attackTime/.85)*Math.PI)*.33;
    e.spine.rotation.x+=Math.sin(strike*Math.PI)*.17;e.jaw.rotation.x+=.16*Math.sin(windup*Math.PI/2);
    if(e.attackTime>.85){e.attackTime=-1;strike=windup=0;}
  }
  for(let j=0;j<2;j++){
    const v=Math.sin(p+j*Math.PI),a=Math.sin(p+j*Math.PI-g.armLag),side=j?1:-1,drag=j===g.dragLeg,limp=drag?1-e.limp:1,leg=e.legs[j],arm=e.arms[j];
    leg.pivot.rotation.set(v*(.42+run*.16+(e.feral?.14:0))*w*limp,0,side*.025);
    // The dragged foot barely lifts and scuffs toe-down.
    leg.calf.rotation.x=Math.max(0,-v)*(.62+run*.25)*w*(drag?1-g.scuff*.6:1)+.04;leg.foot.rotation.x=-leg.calf.rotation.x*.35+(drag?g.scuff*.22*w:0);
    const pose=g.arms==='mixed'?(j===g.reachArm?'reach':'dangle'):g.arms,[base,swing,bend]=ARM_CARRIAGE[pose];
    arm.pivot.rotation.set(base-a*swing*w-run*.14,side*(pose==='reach'?.04:.09),side*(.10+Math.sin(p*.5)*.035));
    arm.forearm.rotation.set((e.feral?-.7:bend)-Math.max(0,a)*.18*w,0,side*.055);arm.hand.rotation.set(pose==='reach'?-.05:-.17,0,side*.13);
    if(e.attackTime>=0&&(j===e.attackHand||e.brute)){
      const recover=1-clamp((e.attackTime-.54)/.31,0,1);
      arm.pivot.rotation.x+=(-.55*windup-1.05*Math.sin(strike*Math.PI/2))*recover;
      arm.pivot.rotation.z+=side*.3*windup*recover;arm.forearm.rotation.x-=.8*windup*(1-strike)*recover;arm.hand.rotation.x-=.3*recover;
    }
  }
  if(e.brute&&e.crouch>0){
    const crouch=clamp(e.crouch,0,1);
    e.root.position.y-=.39*crouch;e.spine.rotation.x+=.6*crouch;
    for(const leg of e.legs){leg.pivot.rotation.x-=crouch;leg.calf.rotation.x+=2*crouch;leg.foot.rotation.x-=crouch;}
  }
  if(e.crawling)applyCrawl(e,dt,w);
  applyHitReaction(e,dt);return contact;
}

// Drop to the floor over CRAWL.drop seconds, then haul along on the arms with
// the legs trailing. Blending from the walk pose keeps the fall continuous.
const lerp=T.MathUtils.lerp;
function applyCrawl(e,dt,w){
  e.crawlDrop=Math.max(0,(e.crawlDrop||0)-dt);e.crawl=Math.min(1,(e.crawl||0)+dt/CRAWL.drop);
  const c=e.crawl*e.crawl*(3-2*e.crawl),p=e.phase;
  // Centre the long, low body over its collision cylinder.
  e.root.position.y=lerp(e.root.position.y,CRAWL.hip,c);e.root.position.z=.15*c;e.root.rotation.x=lerp(e.root.rotation.x,CRAWL.pitch,c);e.root.rotation.z*=1-c;
  e.spine.rotation.x=lerp(e.spine.rotation.x,.06,c);e.head.rotation.x=lerp(e.head.rotation.x,-1.2,c);
  for(let j=0;j<2;j++){
    const v=Math.sin(p+j*Math.PI),side=j?1:-1,arm=e.arms[j],leg=e.legs[j];
    // Alternating reach and pull; an attacking arm keeps its strike on top.
    arm.pivot.rotation.x=lerp(arm.pivot.rotation.x,-2.5+v*.5*w,c);arm.pivot.rotation.z=lerp(arm.pivot.rotation.z,side*.28,c);
    arm.forearm.rotation.x=lerp(arm.forearm.rotation.x,-.3-Math.max(0,v)*.6*w,c);
    leg.pivot.rotation.x=lerp(leg.pivot.rotation.x,-.18+v*.14*w,c);leg.calf.rotation.x=lerp(leg.calf.rotation.x,.55+Math.max(0,-v)*.35*w,c);leg.foot.rotation.x=lerp(leg.foot.rotation.x,.5,c);
  }
}

const forceScale=force=>clamp(force??1,.5,4)*1.5;
const pointWorld=(node,offset=new T.Vector3())=>node.localToWorld(offset.clone());
const basisX=new T.Vector3(),basisY=new T.Vector3(),basisZ=new T.Vector3(),basisMatrix=new T.Matrix4(),bodyRotation=new T.Quaternion(),limbRotation=new T.Quaternion(),limbDirection=new T.Vector3();
function bodyBasis(points,target=new T.Quaternion()){
  basisX.copy(points.Rshoulder.p).sub(points.Lshoulder.p).normalize();basisY.copy(points.chest.p).sub(points.pelvis.p).normalize();basisZ.crossVectors(basisX,basisY).normalize();basisY.crossVectors(basisZ,basisX).normalize();
  return target.setFromRotationMatrix(basisMatrix.makeBasis(basisX,basisY,basisZ));
}

// Position-based ragdoll: fixed-step Verlet integration, distance constraints,
// limb extension limits, ground friction and the game's wall collision.
export function beginZombieDeath(e,impact={},rng=Math.random){
  e.group.updateMatrixWorld(true);
  const points={},constraints=[],scale=e.group.scale.y,origin=e.group.getWorldPosition(new T.Vector3());
  function add(name,p,r,mass=1){points[name]={p:p.clone(),prev:p.clone(),radius:r*scale,invMass:1/mass};}
  add('pelvis',pointWorld(e.root),.15,2.5);add('chest',pointWorld(e.spine,new T.Vector3(0,e.dog?.04:.36,e.dog?.08:0)),.18,3);add('skull',pointWorld(e.head,new T.Vector3(0,.04,0)),.16,1.2);
  add('back',pointWorld(e.spine,new T.Vector3(0,e.dog?.17:.26,-.13)),.1,1.5);
  for(let i=0;i<2;i++){const t=i?'R':'L',l=e.legs[i],a=e.arms[i];add(t+'hip',pointWorld(l.pivot),.09,1.5);add(t+'knee',pointWorld(l.calf),.085);add(t+'ankle',pointWorld(l.foot),.10);add(t+'toe',pointWorld(l.foot,new T.Vector3(0,0,e.dog?.10:.17)),e.dog?.045:.09);add(t+'shoulder',pointWorld(a.pivot),.11,1.5);add(t+'elbow',pointWorld(a.forearm),.075);add(t+'wrist',pointWorld(a.hand),.045,.65);add(t+'palm',pointWorld(a.hand,new T.Vector3(0,e.dog?0:-.12,e.dog?.10:.025)),.045,.45);}
  function link(a,b,stiffness=1,minRatio=1){constraints.push({a,b,length:points[a].p.distanceTo(points[b].p),stiffness,minRatio});}
  const body=['pelvis','chest','Lhip','Rhip','Lshoulder','Rshoulder','back'];for(let i=0;i<body.length;i++)for(let j=i+1;j<body.length;j++)link(body[i],body[j]);
  link('chest','skull');link('back','skull',.65);link('Lshoulder','skull',.65,.82);link('Rshoulder','skull',.65,.82);
  for(const t of ['L','R']){link(t+'hip',t+'knee');link(t+'knee',t+'ankle');link(t+'ankle',t+'toe');link(t+'shoulder',t+'elbow');link(t+'elbow',t+'wrist');link(t+'wrist',t+'palm');link(t+'hip',t+'ankle',.65,.50);link(t+'shoulder',t+'wrist',.55,.35);link(t+'knee',t+'toe',.8,.85);}
  const direction=impact.direction?.clone()||new T.Vector3(0,0,-1).applyQuaternion(e.group.quaternion);direction.y=0;if(direction.lengthSq()<.001)direction.set(.1,0,-1);direction.normalize();
  const side=new T.Vector3(direction.z,0,-direction.x);
  let type=impact.source==='grenade'?'blast':impact.part==='leg'?'buckle':['recoil','stumble','left shoulder','right shoulder','twist'][Math.floor(rng()*5)];
  if(impact.part==='arm'&&impact.side&&rng()<.7)type=impact.side<0?'left shoulder':'right shoulder';
  if(impact.part==='head'&&impact.source!=='grenade')type=['recoil','left shoulder','right shoulder','twist'][Math.floor(rng()*4)];
  if(impact.source==='shotgun'&&impact.part==='torso'&&rng()<.65)type='recoil';
  const torque=impact.point?new T.Vector3().subVectors(impact.point,points.chest.p).cross(direction).multiplyScalar(forceScale(impact.force)):new T.Vector3();torque.clampLength(0,2.4);
  const sign=type==='left shoulder'?-1:type==='right shoulder'?1:rng()<.5?-1:1,force=clamp(impact.force??1,0.5,4),lateral=type.includes('shoulder')?1.05:.32;
  // Different momentum at the hips, shoulders and extremities creates torque;
  // the constraints resolve it into a fall instead of rotating one rigid model.
  for(const [name,p] of Object.entries(points)){
    const height=clamp((p.p.y-origin.y)/scale,0,2),velocity=direction.clone().multiplyScalar((.4+height*.85)*force);
    velocity.addScaledVector(side,sign*lateral*height);velocity.add(new T.Vector3().crossVectors(torque,p.p.clone().sub(points.chest.p)));
    if(type==='stumble')velocity.multiplyScalar(-.65);
    if(type==='buckle'){velocity.multiplyScalar(.35);velocity.y=-1.3;}
    if(type==='twist'){velocity.addScaledVector(direction,name.startsWith('L')?1.4:name.startsWith('R')?-1.0:0);}
    if(type==='blast'){velocity.y=2.4+height*.7;velocity.addScaledVector(side,(rng()-.5)*1.2);}
    if(name==='skull'&&impact.part==='head')velocity.addScaledVector(direction,2.1);
    if(name.includes('wrist')||name.includes('palm'))velocity.addScaledVector(side,sign*.6);
    p.prev.copy(p.p).addScaledVector(velocity,-1/120);
  }
  const initialBasis=bodyBasis(points),pieces=e.pieces.map(({node,a,b,frame})=>({node,a,b,frame,offset:node.getWorldPosition(new T.Vector3()).sub(points[a].p),direction:points[b].p.clone().sub(points[a].p).normalize(),rotation:node.getWorldQuaternion(new T.Quaternion()),scale:node.getWorldScale(new T.Vector3())}));
  // Detach only articulated segment roots; fingers and jaw stay with their segment.
  for(const piece of pieces)piece.node.removeFromParent();e.group.clear();e.group.position.set(0,0,0);e.group.rotation.set(0,0,0);e.group.scale.set(1,1,1);
  for(const piece of pieces)e.group.add(piece.node);
  e.ragdoll={points,pointList:Object.values(points),constraints,pieces,initialBasis,inverseBasis:initialBasis.clone().invert(),type,accumulator:0,age:0,life:8+rng()*2,asleep:false,restTime:0,scale};
  renderRagdoll(e.ragdoll);return e.ragdoll;
}

function renderRagdoll(r){
  const bodyDelta=bodyBasis(r.points,bodyRotation).multiply(r.inverseBasis);
  for(const piece of r.pieces){limbDirection.copy(r.points[piece.b].p).sub(r.points[piece.a].p).normalize();const q=piece.frame?bodyDelta:limbRotation.setFromUnitVectors(piece.direction,limbDirection);piece.node.position.copy(piece.offset).applyQuaternion(q).add(r.points[piece.a].p);piece.node.quaternion.copy(q).multiply(piece.rotation);piece.node.scale.copy(piece.scale);}
}

export function updateZombieDeath(e,dt,isBlocked=()=>false,floorHeight=()=>.11){
  const r=e.ragdoll;r.age+=dt;e.death=r.age;if(r.age>r.life)return true;
  if(!r.asleep){r.accumulator+=Math.min(dt,.05);const h=1/120;while(r.accumulator>=h){r.accumulator-=h;let motion=0;
    for(const p of r.pointList){const x=p.p.x,y=p.p.y,z=p.p.z;p.p.x+=(x-p.prev.x)*.993;p.p.y+=(y-p.prev.y)*.993-12*h*h;p.p.z+=(z-p.prev.z)*.993;p.prev.set(x,y,z);}
    for(let iteration=0;iteration<10;iteration++){
      for(const c of r.constraints){const a=r.points[c.a],b=r.points[c.b],dx=b.p.x-a.p.x,dy=b.p.y-a.p.y,dz=b.p.z-a.p.z,len=Math.sqrt(dx*dx+dy*dy+dz*dz);if(len<1e-6)continue;const target=clamp(len,c.length*c.minRatio,c.length),correction=(len-target)/len*c.stiffness/(a.invMass+b.invMass),wa=correction*a.invMass,wb=correction*b.invMass;a.p.x+=dx*wa;a.p.y+=dy*wa;a.p.z+=dz*wa;b.p.x-=dx*wb;b.p.y-=dy*wb;b.p.z-=dz*wb;}
      for(const p of r.pointList){
        const ground=floorHeight(p.p.x,p.p.z,p.p.y)+p.radius,onGround=p.p.y<ground;if(onGround){p.p.y=ground;p.prev.y=Math.min(p.prev.y,p.p.y);}
        if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y)){const x=p.p.x;p.p.x=p.prev.x;if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y)){p.p.x=x;p.p.z=p.prev.z;if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y))p.p.x=p.prev.x;}p.prev.x=p.p.x;p.prev.z=p.p.z;}
        // Apply floor friction after wall correction, so a constraint cannot
        // drag the previous contact point a little farther into a nearby wall.
        if(onGround){p.prev.x=T.MathUtils.lerp(p.prev.x,p.p.x,.22);p.prev.z=T.MathUtils.lerp(p.prev.z,p.p.z,.22);}
      }
    }
    for(const p of r.pointList)motion=Math.max(motion,p.p.distanceToSquared(p.prev)/(h*h));
    r.restTime=motion<.008?r.restTime+h:0;if(r.restTime>.45||r.age>4.5){r.asleep=true;break;}
  }renderRagdoll(r);}
  // Opaque corpses disappear only after settling; no transparent ghost trails.
  if(r.age>r.life-.65)e.group.position.y=-((r.age-(r.life-.65))/.65)*.6;
  return r.age>r.life;
}
