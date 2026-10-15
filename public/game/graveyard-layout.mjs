export const GRAVEYARD={minX:54,maxX:80,minZ:-24,maxZ:18,entryX:54,entryZ:6,entryWidth:7};
export const MAUSOLEUM={x:70,z:-14,w:8,d:9,frontZ:-9.5,doorWidth:2.8,ceiling:3.7,unlockAfterWave:20};
export const SARCOPHAGUS={x:MAUSOLEUM.x,z:MAUSOLEUM.z-.8,w:2.43,d:3.28,top:1};
export function sarcophagusSupport(x,z,y,step=0,radius=0){
  if(SARCOPHAGUS.top>y+step+1e-6)return null;
  const dx=Math.max(0,Math.abs(x-SARCOPHAGUS.x)-SARCOPHAGUS.w/2),dz=Math.max(0,Math.abs(z-SARCOPHAGUS.z)-SARCOPHAGUS.d/2);
  // Hold an actor on the lid until its whole footprint clears the edge, so it
  // cannot fall into the expanded body collider while stepping off.
  return dx*dx+dz*dz<=radius*radius+1e-9?SARCOPHAGUS.top:null;
}
export const GRAVE_PLOTS=[59,64,76].flatMap((x,column)=>[-19,-12,-5,1,12].flatMap((z,row)=>column===1&&z===-12?[]:[{x,z,column,row}]));
export function inMausoleum(x,z,r=0){return Math.abs(x-MAUSOLEUM.x)+r<MAUSOLEUM.w/2&&Math.abs(z-MAUSOLEUM.z)+r<MAUSOLEUM.d/2;}
export function inGraveyard(x,z){return x>=GRAVEYARD.minX&&x<=GRAVEYARD.maxX&&z>=GRAVEYARD.minZ&&z<=GRAVEYARD.maxZ;}
export const GRAVEYARD_SPAWNS=[[58,14],[76,14],[58,-2],[77,-5],[59,-21],[77,-21]];
