import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RELEASES,CURRENT_VERSION} from '../public/game/changelog-data.mjs';
import {CURRENT_VERSION as GAME_RELEASE_VERSION} from '../public/game/version.mjs';
import {GAME_VERSION} from '../public/game/leaderboard.mjs';
import {validateReleaseHistory,releaseFingerprint} from '../scripts/check-release-notes.mjs';

export function verifyChangelog(qa,frames,listeners,elements){
  assert.equal(RELEASES.at(-1).version,1);assert.equal(CURRENT_VERSION,RELEASES.length);
  assert.equal(GAME_VERSION,String(GAME_RELEASE_VERSION),'Score metadata uses the active game version independently of the archived history');
  assert(GAME_RELEASE_VERSION>CURRENT_VERSION,'Game updates continue after the last archived release');
  const menu=elements.get('changelogMenu');assert(menu.hasAttribute('hidden')&&menu.classList.contains('hidden'),'The Change Log button is hidden on the title screen');
  validateReleaseHistory(RELEASES);
  assert.throws(()=>validateReleaseHistory(RELEASES.slice(0,-1)),/every version/);
  const altered=structuredClone(RELEASES);altered.at(-1).title='Rewritten original';
  assert.throws(()=>validateReleaseHistory(altered,RELEASES),/preserve previously/);
  const empty=structuredClone(RELEASES);empty[0].changes=[];assert.throws(()=>validateReleaseHistory(empty),/meaningful/);
  const next={...RELEASES[0],version:CURRENT_VERSION+1,title:'Next release',changes:['A new player-facing change.']};validateReleaseHistory([next,...RELEASES],RELEASES);

  const directory=mkdtempSync(join(tmpdir(),'blackthorn-release-'));
  try{
    mkdirSync(join(directory,'public/game'),{recursive:true});writeFileSync(join(directory,'public/game/game.js'),'const x=1;');
    const first=releaseFingerprint(directory);writeFileSync(join(directory,'public/game/game.js'),'const x=2;');assert.notEqual(releaseFingerprint(directory),first,'Game edits change the release fingerprint');
    const second=releaseFingerprint(directory);writeFileSync(join(directory,'public/game/model.svg'),'<svg/>');assert.notEqual(releaseFingerprint(directory),second,'Asset edits also require re-sealing');
  }finally{rmSync(directory,{recursive:true,force:true});}

  const panel=elements.get('changelog'),body=elements.get('changelogBody'),search=elements.get('changelogSearch');
  const filter=elements.get('changelogFilter'),sort=elements.get('changelogSort');
  const allText=RELEASES.flatMap(r=>r.changes).join(' ');
  for(const name of ['Ironheart','Ashfang','Feral','Warden','mausoleum','Soul Forge','Bushmaster','Nano Shield'])assert(allText.includes(name),`History includes ${name}`);
  const doc=globalThis.document,active=Object.getOwnPropertyDescriptor(doc,'activeElement');let focused=null;
  Object.defineProperty(doc,'activeElement',{configurable:true,get:()=>focused});
  const originalFocus=new Map();
  function track(el){if(!originalFocus.has(el))originalFocus.set(el,el.focus);el.focus=()=>{focused=el;};}
  [search,elements.get('changelogMenu')].forEach(track);
  const press=(code,shiftKey=false)=>{let prevented=false;listeners.keydown({code,shiftKey,repeat:false,preventDefault(){prevented=true;}});return prevented;};
  try{
    const mode=qa.get().mode;body.scrollTop=900;elements.get('changelogMenu').onclick();
    assert(!panel.classList.contains('hidden'));assert.equal(qa.get().mode,mode);assert.equal(body.scrollTop,0);assert.equal(focused,search);
    assert.equal(body.querySelectorAll('.releaseEntry').length,RELEASES.length);assert.equal(body.querySelector('.releaseEntry').id,`release-v${CURRENT_VERSION}`);
    assert.equal(elements.get('menuVersion').textContent,`v${CURRENT_VERSION}`);assert(body.querySelector('.releaseCurrent'));
    assert.equal(press('KeyM'),false);assert(elements.get('estateMap').classList.contains('hidden'),'Changelog shortcuts never open the game map');
    for(const key of ['ArrowDown','PageDown','Home','End','Space'])assert.equal(press(key),false,'Native reading and input keys remain available');
    search.value='v1';search.oninput();assert.equal(body.querySelectorAll('.releaseEntry').length,1);assert.equal(body.querySelector('.releaseEntry').id,'release-v1');assert(body.textContent.includes('The first night'));
    search.value='nano shield';search.oninput();assert(body.querySelector('#release-v54'));assert(!body.querySelector('#release-v1'));
    search.value='absolutely-no-such-update';search.oninput();assert(body.querySelector('.changelogEmpty'));assert(elements.get('changelogCount').textContent.startsWith('0 of'));
    search.value='';search.oninput();filter.value='Weapons';filter.onchange();
    const weaponReleases=RELEASES.filter(r=>r.tags.includes('Weapons'));assert.equal(body.querySelectorAll('.releaseEntry').length,weaponReleases.length);assert(body.querySelector('#release-v52'));
    filter.value='';filter.onchange();sort.value='oldest';sort.onchange();assert.equal(body.querySelector('.releaseEntry').id,'release-v1');
    const controls=[...panel.querySelectorAll('button,input,select,summary,[tabindex="0"]')];controls.forEach(track);
    focused=controls.at(-1);assert(press('Tab'));assert.equal(focused,controls[0]);assert(press('Tab',true));assert.equal(focused,controls.at(-1));
    assert(press('Escape'));assert(panel.classList.contains('hidden'));assert.equal(focused,elements.get('changelogMenu'));
    elements.get('changelogMenu').onclick();assert.equal(search.value,'');assert.equal(filter.value,'');assert.equal(sort.value,'newest');assert.equal(body.scrollTop,0);
    elements.get('changelogDone').onclick();assert(panel.classList.contains('hidden'));

    qa.start();qa.get().changelog.open(elements.get('changelogMenu'));assert.equal(qa.get().mode,'paused');assert.equal(doc.pointerLockElement,null);
    const before=qa.get();frames(120);assert.equal(qa.get().wave,before.wave);assert.equal(qa.get().health,before.health);
    elements.get('closeChangelog').onclick();assert.equal(qa.get().mode,'paused');assert.equal(doc.pointerLockElement,null);
  }finally{
    qa.get().changelog.close();for(const [el,fn] of originalFocus)el.focus=fn;
    if(active)Object.defineProperty(doc,'activeElement',active);else delete doc.activeElement;
  }
  console.log(`PASS: hidden title-screen Change Log, preserved v1–v${CURRENT_VERSION} archive, independent game version and retained archive reader controls.`);
}
