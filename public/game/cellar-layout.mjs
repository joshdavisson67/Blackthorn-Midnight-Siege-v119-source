export const CELLAR={y:-4.2,x:-24,z:-75,w:18,d:20,topZ:-100,bottomZ:-92,entryZ:-85,stairWidth:3.4,unlockWave:10};
let open=false;
export function setCellarOpen(value){open=!!value;}
export function isCellarOpen(){return open;}
export function inCellar(x,z,r=0){
  const dx=Math.abs(x-CELLAR.x);
  const room=dx+r<=CELLAR.w/2&&z-r>=CELLAR.entryZ&&z+r<=CELLAR.z+CELLAR.d/2;
  // The stair landing feeds a level tunnel beneath the clear rear forecourt.
  const tunnel=dx+r<=CELLAR.stairWidth/2&&z-r>=CELLAR.bottomZ&&z+r<=CELLAR.entryZ+1;
  return room||tunnel;
}
export function cellarStairHeight(x,z){if(!open||Math.abs(x-CELLAR.x)>CELLAR.stairWidth/2||z<CELLAR.topZ||z>CELLAR.bottomZ)return null;return CELLAR.y*(z-CELLAR.topZ)/(CELLAR.bottomZ-CELLAR.topZ);}
export function cellarSupport(x,z,y,step=0){const ramp=cellarStairHeight(x,z);if(ramp!==null)return ramp<=y+step+.000001?ramp:CELLAR.y;if(open&&y<-.3&&inCellar(x,z))return CELLAR.y;return null;}
