import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function open(path=':memory:'){
  const sqlite=new DatabaseSync(path);
  return {sqlite,prepare(sql){return {bind(...args){return {run:async()=>sqlite.prepare(sql).run(...args),first:async()=>sqlite.prepare(sql).get(...args),all:async()=>({results:sqlite.prepare(sql).all(...args)})};},all:async()=>({results:sqlite.prepare(sql).all()})};}};
}
export function migrate(db){for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));}
