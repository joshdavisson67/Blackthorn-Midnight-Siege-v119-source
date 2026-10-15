import {RELEASES,CURRENT_VERSION} from './changelog-data.mjs?v=95';

export function createChangelog({document,onOpen=()=>{}}){
  const $=id=>document.getElementById(id);
  const panel=$('changelog'),body=$('changelogBody'),search=$('changelogSearch');
  const filter=$('changelogFilter'),sort=$('changelogSort'),count=$('changelogCount');
  let returnFocus=null;
  const create=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const normalize=text=>text.normalize('NFKC').toLocaleLowerCase();
  const dates=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  $('menuVersion').textContent=`v${CURRENT_VERSION}`;
  $('changelogRange').textContent=`${RELEASES.length} releases · v1–v${CURRENT_VERSION}`;
  const tags=[...new Set(RELEASES.flatMap(r=>r.tags))].sort();
  for(const tag of tags){const option=create('option','',tag);option.value=tag;filter.appendChild(option);}

  function render(){
    const query=normalize(search.value.trim()),exact=/^v?(\d+)$/.exec(query);
    let matches=RELEASES.filter(r=>(!filter.value||r.tags.includes(filter.value))&&(!query||(exact?r.version===Number(exact[1]):normalize([r.title,...r.tags,...r.changes].join(' ')).includes(query))));
    if(sort.value==='oldest')matches=[...matches].reverse();
    body.innerHTML='';
    count.textContent=`${matches.length} of ${RELEASES.length} releases`;
    if(!matches.length){body.appendChild(create('p','changelogEmpty','No matching updates. Try another term or category.'));return;}
    const fragment=document.createDocumentFragment();
    for(const release of matches){
      const details=create('details','releaseEntry');details.id=`release-v${release.version}`;
      details.open=!!query||release.version===CURRENT_VERSION;
      const summary=create('summary','releaseHeading');
      summary.appendChild(create('span','releaseVersion',`v${release.version}`));
      const heading=create('span','releaseSummary');heading.appendChild(create('strong','',release.title));
      const metadata=create('span','releaseMeta',release.tags.join(' · '));
      if(release.version===CURRENT_VERSION)metadata.appendChild(create('b','releaseCurrent','CURRENT'));
      heading.appendChild(metadata);summary.appendChild(heading);
      const date=create('time','',dates.format(new Date(release.date+'T12:00:00Z')));date.setAttribute('datetime',release.date);summary.appendChild(date);
      details.appendChild(summary);
      const list=create('ul','releaseChanges');for(const change of release.changes)list.appendChild(create('li','',change));details.appendChild(list);
      fragment.appendChild(details);
    }
    body.appendChild(fragment);body.scrollTop=0;
  }
  function open(trigger=$('changelogMenu')){
    onOpen();returnFocus=trigger;search.value='';filter.value='';sort.value='newest';
    render();body.scrollTop=0;panel.classList.remove('hidden');search.focus({preventScroll:true});
  }
  function close(){panel.classList.add('hidden');returnFocus?.focus({preventScroll:true});returnFocus=null;}
  function keydown(e){
    if(e.code==='Escape'){e.preventDefault?.();close();return;}
    if(e.code==='Tab'){
      const items=[...panel.querySelectorAll('button,input,select,summary,[tabindex="0"]')];
      const current=items.indexOf(document.activeElement),next=e.shiftKey?(current<=0?items.length-1:current-1):(current+1)%items.length;
      e.preventDefault();items[next]?.focus();
    }
  }
  search.oninput=render;filter.onchange=render;sort.onchange=render;
  $('changelogMenu').onclick=()=>open($('changelogMenu'));
  $('closeChangelog').onclick=close;$('changelogDone').onclick=close;
  return {open,close,keydown,get visible(){return !panel.classList.contains('hidden');}};
}
