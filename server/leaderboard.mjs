import {curseTitle,MAX_CURSE_RANK} from '../public/game/curse.mjs';
const columns='id,name,score,wave,kills,duration,version,curse_rank,curse_title,created_at';
const ordering='score DESC,wave DESC,kills DESC,created_at ASC,id ASC';
function json(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function logFailure(request,operation,stage,error){
  console.error('Blackthorn leaderboard database failure',{
    operation,stage,requestId:request.headers.get('cf-ray')||null,
    detail:error instanceof Error?error.message.slice(0,300):'Unknown database error'
  });
}
function validRun(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {id,score,wave,kills,duration,version}=value;
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return null;
  if(typeof value.name!=='string')return null;
  const name=value.name.normalize('NFKC').trim().replace(/\s+/gu,' ');
  if(!name||[...name].length>24||/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(name))return null;
  for(const [number,max] of [[score,1000000000],[wave,10000],[kills,10000000],[duration,604800]])if(!Number.isSafeInteger(number)||number<0||number>max)return null;
  if(typeof version!=='string'||!/^\d{1,5}$/.test(version))return null;
  // Older releases and locally retained retries have no curse data. Titles are
  // canonical server values; a client cannot submit a different rank title.
  const curseRank=value.curseRank??0;
  if(!Number.isSafeInteger(curseRank)||curseRank<0||curseRank>MAX_CURSE_RANK)return null;
  return {id:id.toLowerCase(),name,score,wave,kills,duration,version,curseRank,curseTitle:curseTitle(curseRank)};
}
export async function getLeaderboard(request,db){
  if(!db)return json({error:'The leaderboard is temporarily unavailable. Please try again.'},503);
  try{const result=await db.prepare(`SELECT ${columns},ROW_NUMBER() OVER (ORDER BY ${ordering}) AS rank FROM leaderboard_scores ORDER BY ${ordering} LIMIT 50`).all();return json({entries:result.results??[]});}
  catch(error){logFailure(request,'load','select',error);return json({error:'The leaderboard could not load. Please try again.'},503);}
}
export async function submitScore(request,db){
  const origin=request.headers.get('Origin');
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Submit scores from the game page.'},403);
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({error:'Expected a score submission.'},415);
  if(Number(request.headers.get('Content-Length')||0)>2048)return json({error:'Score submission is too large.'},413);
  let value;
  try{const body=await request.text();if(new TextEncoder().encode(body).length>2048)return json({error:'Score submission is too large.'},413);value=JSON.parse(body);}catch{return json({error:'The score submission is invalid.'},400);}
  const run=validRun(value);if(!run)return json({error:'Use a name of 1–24 characters and a valid completed run.'},400);
  if(!db)return json({error:'Score saving is temporarily unavailable. Your run can be retried.'},503);
  let stage='insert';
  try{
    await db.prepare('INSERT INTO leaderboard_scores (id,name,score,wave,kills,duration,version,curse_rank,curse_title,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(run.id,run.name,run.score,run.wave,run.kills,run.duration,run.version,run.curseRank,run.curseTitle,Date.now()).run();
    stage='confirm';
    const saved=await db.prepare(`SELECT ${columns} FROM leaderboard_scores WHERE id=?`).bind(run.id).first();
    if(!saved)throw new Error('Missing score after insert');
    if(['name','score','wave','kills','duration','version'].some(key=>saved[key]!==run[key])||saved.curse_rank!==run.curseRank||saved.curse_title!==run.curseTitle)return json({error:'This run was already submitted with different details.'},409);
    stage='rank';const placement=await db.prepare(`SELECT rank FROM (SELECT id,ROW_NUMBER() OVER (ORDER BY ${ordering}) AS rank FROM leaderboard_scores) WHERE id=?`).bind(run.id).first();
    return json({entry:{...saved,rank:placement.rank},saved:true});
  }catch(error){logFailure(request,'save',stage,error);return json({error:'The score could not be saved. Please retry; this run will only be counted once.'},503);}
}
