import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {createLeaderboard,GAME_VERSION} from '../public/game/leaderboard.mjs';
import {usesSupabase,supabaseFetcher,SUPABASE_LEADERBOARD} from '../public/game/leaderboard-supabase.mjs';
const html=readFileSync(new URL('../public/game/index.html',import.meta.url),'utf8');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const config={url:'https://project.supabase.co',key:'sb_publishable_test'};
// A stand-in for Supabase's RPC endpoint with the same response shapes as supabase/leaderboard.sql.
function fakeSupabase({fail}={}){
  const rows=[],calls=[];
  const fetcher=async(url,options)=>{
    const headers=new Headers(options.headers),body=JSON.parse(options.body);calls.push({url,headers,body});
    assert.equal(options.method,'POST');assert.equal(headers.get('apikey'),config.key);assert(!headers.has('Authorization'),'Publishable keys go only in the apikey header');
    if(fail)return fail(url,body);
    if(url===`${config.url}/rest/v1/rpc/get_leaderboard`)return Response.json(rows.map((r,i)=>({...r,rank:i+1})));
    assert.equal(url,`${config.url}/rest/v1/rpc/submit_score`);
    const run=body.run;let saved=rows.find(r=>r.id===run.id);
    if(!saved){saved={id:run.id,name:run.name,score:run.score,wave:run.wave,kills:run.kills,duration:run.duration,version:run.version,curse_rank:run.curseRank??0,curse_title:'Uncursed',created_at:new Date().toISOString()};rows.push(saved);rows.sort((a,b)=>b.score-a.score);}
    return Response.json({saved:true,entry:{...saved,rank:rows.indexOf(saved)+1}});
  };
  return {rows,calls,fetcher};
}
function fixture(fetcher){const {document}=parseHTML(html);const board=createLeaderboard({document,storage:storage(),fetcher:supabaseFetcher(config,fetcher),setTimer:()=>0,clearTimer:()=>{}});return {board,document};}
test('only GitHub Pages hosts use the Supabase leaderboard',()=>{
  assert.equal(usesSupabase({hostname:'joshdavisson67.github.io'}),true);
  assert.equal(usesSupabase({hostname:'blackthorn.example'}),false);
  assert.equal(usesSupabase(undefined),false);
  assert.match(SUPABASE_LEADERBOARD.url,/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.match(SUPABASE_LEADERBOARD.key,/^sb_publishable_/,'Never ship a secret or service_role key in the game');
});
test('a finished run saves through submit_score and appears on the shared board',async()=>{
  const supabase=fakeSupabase(),a=fixture(supabase.fetcher);
  a.board.startRun();a.board.endRun({score:15000,wave:12,kills:110,duration:700,curseRank:1});await settle();
  a.document.getElementById('leaderboardName').value='  Pages   player ';await a.board.save();await settle();
  const submit=supabase.calls.find(c=>c.url.endsWith('/submit_score'));
  assert.equal(submit.body.run.name,'Pages player');assert.equal(submit.body.run.version,GAME_VERSION);assert.equal(submit.body.run.curseRank,1);
  assert.match(a.document.getElementById('scoreSaveStatus').textContent,/Saved! Pages player is ranked #1/);
  assert(a.document.getElementById('leaderboardRows').textContent.includes('15,000'));
  const b=fixture(supabase.fetcher);b.board.open();await settle();
  assert(b.document.getElementById('leaderboardRows').textContent.includes('Pages player'),'A second visitor reads the same scores');
  a.board.close();b.board.close();
});
test('validation errors are shown as written; other failures keep the run for retry',async()=>{
  const rejected=fakeSupabase({fail:(url)=>url.endsWith('/submit_score')?Response.json({code:'PT400',message:'Use a name of 1–24 characters and a valid completed run.'},{status:400}):Response.json([])}),a=fixture(rejected.fetcher);
  a.board.startRun();a.board.endRun({score:10,wave:1,kills:1,duration:30});await settle();a.document.getElementById('leaderboardName').value='Ok';await a.board.save();
  assert.match(a.document.getElementById('scoreSaveStatus').textContent,/Use a name of 1–24 characters/);
  assert.equal(a.document.getElementById('leaderboardName').readOnly,false,'A rejected run can be renamed');
  const broken=fakeSupabase({fail:(url)=>url.endsWith('/submit_score')?Response.json({code:'PGRST202',message:'Could not find the function public.submit_score'},{status:404}):new Response('gateway down',{status:502})}),b=fixture(broken.fetcher);
  b.board.startRun();b.board.endRun({score:10,wave:1,kills:1,duration:30});await settle();
  assert.equal(b.document.getElementById('leaderboardStatus').textContent,'The leaderboard could not load. Please try again.');
  b.document.getElementById('leaderboardName').value='Ok';await b.board.save();
  const status=b.document.getElementById('scoreSaveStatus').textContent;
  assert.match(status,/The score could not be saved/);assert(!status.includes('PGRST'),'Database internals are not shown to players');
  assert.equal(b.document.getElementById('leaderboardSubmit').textContent,'RETRY SAVING SCORE');
  a.board.close();b.board.close();
});
