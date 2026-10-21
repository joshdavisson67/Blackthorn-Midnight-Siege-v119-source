import assert from 'node:assert/strict';
import {beamProfile,BEAM,OAK_FINISH,WET_STONE_FINISH} from '../public/game/graphics.mjs';
import {roomAt} from '../public/game/estate-layout.mjs';
import {LAMP_FLOOR_LIGHT} from '../public/game/environment-lights.mjs';

// Natural floor lighting: a soft, graded torch beam and grain-following finishes.
// Ground-floor rooms under the second floor have a lower ceiling.
const roomCeiling=src=>src.position.z>-12?4.3:6.7;
export function verifyFloorLighting(qa){
  const samples=Array.from({length:201},(_,i)=>i/200),beam=samples.map(beamProfile);
  assert.equal(beam[0],1,'The beam core is full strength');assert.equal(beamProfile(1),0,'The beam fades to nothing at the cone edge');
  for(let i=1;i<beam.length;i++){const nearRing=Math.abs(samples[i]-BEAM.ring)<.08;assert(beam[i]<=beam[i-1]+(nearRing?.03:1e-9),'Brightness only rises at the faint reflector ring');assert(beam[i-1]-beam[i]<.06,`No hard edge at r=${samples[i]}`);}
  assert(beamProfile(.3)>.3&&beamProfile(.3)<.6,'A softer corona surrounds the core');
  assert(beamProfile(.7)>.05&&beamProfile(.7)<.2,'A dim spill fills the outer cone');
  assert(beamProfile(BEAM.fadeStart+.15)<beamProfile(BEAM.fadeStart)*.5,'The spill fades smoothly at the rim');
  for(const dark of [0,.5,1])for(const wear of [0,.5,1]){
    const [r]=OAK_FINISH(dark,wear);assert(r>=.6&&r<=.98,'Oak stays satin, never lacquered or chalky');
    const [wet,rough]=WET_STONE_FINISH(dark,wear);assert(wet>=.1&&wet<=1&&rough>=.5&&rough<=1);
  }
  assert(OAK_FINISH(1,.5)[0]>OAK_FINISH(0,.5)[0],'Grain and board gaps are rougher than board faces');
  assert(WET_STONE_FINISH(1,.5)[0]>3*WET_STONE_FINISH(0,.5)[0],'Water gathers in joints and pits, not on faces');
  const {flashlight}=qa.get();assert(flashlight.angle>.45&&flashlight.penumbra>0,'A wider, soft-edged cone');
  // Wing lamps are sized by mounting height: the floor beneath every one gets
  // the same gentle light, whether it hangs low (ground-floor wings) or high.
  const wing=qa.get().environmentLights.sources.filter(src=>!src.light&&!src.cellar&&!src.upper&&src.position.y>2&&roomAt(src.position.x,src.position.z));
  const low=wing.filter(src=>src.position.y<3),high=wing.filter(src=>src.position.y>4);
  assert(low.length>=8&&high.length>=24,`Both low and high wing lamps are present (${low.length}/${high.length})`);
  for(const src of wing){const floorLight=src.intensity/src.position.y**src.decay;assert(Math.abs(floorLight-LAMP_FLOOR_LIGHT)<1e-6,'Every wing lamp lights the floor beneath it equally');}
  assert(Math.max(...low.map(s=>s.intensity))<12,'Low-hung lamps are far gentler than the old 26');
  for(const src of wing)assert(src.position.y<roomCeiling(src),'Wing lamps sit inside their rooms');
  console.log('PASS: natural floor lighting — graded torch beam (full core, corona, spill, smooth rim), soft-sheen oak that follows the grain, rain gathering in stone joints, wing lamps sized by mounting height.');
}
