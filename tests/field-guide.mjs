import assert from 'node:assert/strict';

export function verifyFieldGuide(qa,frames,listeners,elements){
  const guide=elements.get('guide'),body=elements.get('guideBody');
  const controls=[...guide.querySelectorAll('button,a[href],[tabindex="0"]')];
  const tracked=[...controls,elements.get('howBtn'),elements.get('guidePause')];
  const originalFocus=tracked.map(el=>el.focus);
  const originalActive=Object.getOwnPropertyDescriptor(document,'activeElement');
  let focused=null;
  Object.defineProperty(document,'activeElement',{configurable:true,get:()=>focused});
  tracked.forEach(el=>{el.focus=()=>{focused=el;};});
  const press=(code,shiftKey=false)=>{
    let prevented=false;
    listeners.keydown({code,shiftKey,repeat:false,preventDefault(){prevented=true;}});
    return prevented;
  };
  try{
    // The landing guide starts at the top and closes back to its opener.
    const mode=qa.get().mode;
    body.scrollTop=500;
    elements.get('howBtn').onclick();
    assert(!guide.classList.contains('hidden'));
    assert.equal(qa.get().mode,mode);
    assert.equal(body.scrollTop,0);
    assert.equal(focused,body);
    for(const code of ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Space']){
      assert.equal(press(code),false,`${code} must retain native scrolling`);
    }
    assert.equal(press('KeyM'),false);
    assert(elements.get('estateMap').classList.contains('hidden'),'Guide input must not open a map behind it');
    assert.equal(press('Escape'),true);
    assert(guide.classList.contains('hidden'));
    assert.equal(focused,elements.get('howBtn'));

    // Every jump link has a real, readable destination in the scrolling region.
    for(const link of guide.querySelectorAll('.guideNav a')){
      const target=guide.querySelector(link.getAttribute('href'));
      assert(target&&body.contains(target));
      assert(target.querySelector('h3')?.textContent.trim());
    }

    // A guide opened during a run pauses it; closing does not recapture the mouse.
    qa.start();document.exitPointerLock();
    elements.get('guidePause').onclick();
    const before=qa.get();frames(120);
    assert.equal(qa.get().mode,'paused');
    assert.equal(qa.get().wave,before.wave);
    assert.equal(qa.get().health,before.health);
    focused=controls.at(-1);assert(press('Tab'));assert.equal(focused,controls[0]);
    assert(press('Tab',true));assert.equal(focused,controls.at(-1));
    elements.get('closeGuide').onclick();
    assert(guide.classList.contains('hidden'));
    assert.equal(focused,elements.get('guidePause'));
    assert.equal(document.pointerLockElement,null);
    elements.get('guidePause').onclick();body.scrollTop=999;
    elements.get('guideDone').onclick();
    elements.get('guidePause').onclick();assert.equal(body.scrollTop,0);
    press('Escape');assert.equal(qa.get().mode,'paused');
    assert.equal(document.pointerLockElement,null);
  }finally{
    tracked.forEach((el,i)=>{el.focus=originalFocus[i];});
    if(originalActive)Object.defineProperty(document,'activeElement',originalActive);
    else delete document.activeElement;
  }
  console.log('PASS: field guide resets scroll, preserves keyboard scrolling, contains focus, links to all sections, and closes safely from menu/pause.');
}
