'use strict';
const {DatabaseSync}=require('node:sqlite'),fs=require('node:fs'),path=require('node:path'),{isDeepStrictEqual}=require('node:util');
const S=require('./public/workflow-schema.js'),kinds=Object.keys(S.fields);
module.exports=function(dir){
 fs.mkdirSync(dir,{recursive:true});const db=new DatabaseSync(path.join(dir,'tradedesk.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,json TEXT NOT NULL,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT); INSERT OR IGNORE INTO meta VALUES('revision','0');
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,name TEXT,role TEXT,password TEXT,enabled INTEGER);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT,csrf TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,time TEXT,user TEXT,action TEXT,kind TEXT,record_id TEXT,detail TEXT);
 CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,kind TEXT,record_id TEXT,filename TEXT,size INTEGER,uploaded_at TEXT,sha256 TEXT,stored_name TEXT);
 CREATE TABLE IF NOT EXISTS failures(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}};
 const state=()=>{const s=S.empty();s.revision=Number(db.prepare("SELECT value FROM meta WHERE key='revision'").get().value);for(const r of db.prepare('SELECT * FROM records ORDER BY rowid').all())if(kinds.includes(r.kind))s[r.kind].push(JSON.parse(r.json));return s;};
 const audit=(user,action,kind='',id='',detail='')=>db.prepare('INSERT INTO audit(time,user,action,kind,record_id,detail) VALUES(?,?,?,?,?,?)').run(new Date().toISOString(),user,action,kind,id,detail);
 function update(changes,user){return transaction(()=>{const current=state(),next=structuredClone(current),conflicts=[];
  if(!Array.isArray(changes)||changes.length>50000)throw Error('變更清單格式不正確。');const seen=new Set();
  for(const c of changes){if(!kinds.includes(c.kind)||typeof c.id!=='string'||!c.id||seen.has(c.kind+'\0'+c.id))throw Error('變更紀錄不正確或重複。');seen.add(c.kind+'\0'+c.id);const old=current[c.kind].find(r=>r.id===c.id)||null;
   if(!isDeepStrictEqual(old,c.before))conflicts.push({kind:c.kind,id:c.id});
   if(c.after!==null&&(!c.after||c.after.id!==c.id))throw Error('紀錄 ID 不一致。');next[c.kind]=next[c.kind].filter(r=>r.id!==c.id);if(c.after!==null)next[c.kind].push(c.after);
  }
  if(conflicts.length){const e=Error('這些紀錄已被其他人修改。請保留內容、取得最新資料後再重新編輯。');e.status=409;e.conflicts=conflicts;throw e;}
  const checked=S.validate(next);for(const r of db.prepare('SELECT kind,record_id FROM reports').all())if(!checked[r.kind].some(x=>x.id===r.record_id))throw Error('有報告附件的紀錄不能移除：'+r.record_id);
  for(const c of changes){if(c.after===null)db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(c.kind,c.id);else db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json').run(c.kind,c.id,JSON.stringify(checked[c.kind].find(x=>x.id===c.id)));audit(user,c.after===null?'delete':c.before===null?'create':'update',c.kind,c.id);}
  if(changes.length)db.prepare("UPDATE meta SET value=CAST(value AS INTEGER)+1 WHERE key='revision'").run();return state();
 });}
 return {db,state,update,audit,transaction,kinds,dir};
};
