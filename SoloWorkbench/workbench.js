const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./public/workbench-schema.js');
module.exports=function(dir,getTrade,token,port){
const file=path.join(dir,'workbench.json'),attachments=path.join(dir,'attachments'),indexFile=path.join(attachments,'index.json');fs.mkdirSync(attachments,{recursive:true});
let state=fs.existsSync(file)?S.validate(JSON.parse(fs.readFileSync(file,'utf8')),getTrade()):S.empty();let index=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')):[];
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const authorized=req=>req.headers['x-tradedesk-token']===token&&(!req.headers.origin||['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin));
function write(target,data){fs.writeFileSync(target+'.tmp',JSON.stringify(data,null,2));fs.renameSync(target+'.tmp',target);}
async function body(req,max=12*1024*1024){let len=0,chunks=[];for await(const c of req){len+=c.length;if(len>max)throw Error('超過上傳大小限制。');chunks.push(c);}return Buffer.concat(chunks);}
function guardTrade(next){S.validate(state,next);}
function guard(next){for(const r of index)if(!next.records.some(x=>x.id===r.record_id)&&!next.tasks.some(x=>x.id===r.record_id))throw Error('有附件的紀錄不可移除：'+r.record_id);}
function backup(){const files=[];const take=(rel)=>{const p=path.join(dir,rel);if(fs.existsSync(p)){const bytes=fs.readFileSync(p);files.push({path:rel,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')});}};take('state.json');take('workbench.json');take('reports/index.json');take('attachments/index.json');for(const folder of ['reports','attachments']){const idx=path.join(dir,folder,'index.json');if(fs.existsSync(idx))for(const r of JSON.parse(fs.readFileSync(idx,'utf8')))take(folder+'/'+r.stored_name);}if(files.reduce((s,r)=>s+r.data.length,0)>128*1024*1024)throw Error('備份超過 128MB，請停機後複製整個 data 資料夾。');return {app:'SoloWorkbench',format:1,createdAt:new Date().toISOString(),files};}
async function handle(req,res,url){if(!url.pathname.startsWith('/api/workbench'))return false;try{
if(req.method!=='GET'&&!authorized(req)){json(res,403,{error:'請重新整理後再操作。'});return true;}
if(url.pathname==='/api/workbench/state'&&req.method==='GET'){json(res,200,state);return true;}
if(url.pathname==='/api/workbench/state'&&req.method==='PUT'){const data=JSON.parse((await body(req)).toString());if(data.revision!==state.revision){json(res,409,{error:'資料已在其他視窗更新，請先重新整理。'});return true;}const next=S.validate(data,getTrade());guard(next);next.revision=state.revision+1;if(fs.existsSync(file))fs.copyFileSync(file,file+'.previous');write(file,next);state=next;json(res,200,state);return true;}
if(url.pathname==='/api/workbench/backup'&&req.method==='POST'){json(res,200,backup());return true;}
if(url.pathname==='/api/workbench/files'&&req.method==='GET'){json(res,200,index.filter(r=>r.record_id===url.searchParams.get('record_id')).map(({stored_name,...r})=>r));return true;}
if(url.pathname==='/api/workbench/files'&&req.method==='POST'){const record_id=url.searchParams.get('record_id'),filename=url.searchParams.get('filename')||'',ext=path.extname(filename).toLowerCase();const exists=()=>[...state.records,...state.tasks].some(r=>r.id===record_id);if(!exists())throw Error('請先儲存紀錄。');if(index.length>=2000)throw Error('最多 2,000 份附件。');if(!['.pdf','.docx','.pptx','.xlsx','.csv','.txt','.png','.jpg','.jpeg','.json','.zip'].includes(ext)||filename.length>240||/[\x00-\x1f\/\\]/.test(filename))throw Error('附件格式或檔名不支援。');const bytes=await body(req,10*1024*1024);if(!bytes.length||!exists())throw Error('檔案空白或紀錄已變更。');const id=crypto.randomBytes(16).toString('hex'),stored_name=id+ext,r={id,record_id,filename,stored_name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),uploaded_at:new Date().toISOString()};fs.writeFileSync(path.join(attachments,stored_name),bytes);write(indexFile,[...index,r]);index.push(r);json(res,201,{id,filename});return true;}
if(req.method==='GET'&&/^\/api\/workbench\/files\/[a-f0-9]{32}$/.test(url.pathname)){const r=index.find(r=>r.id===url.pathname.split('/').at(-1));if(!r)throw Error('附件不存在。');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(r.filename),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(attachments,r.stored_name)));return true;}
json(res,405,{error:'不支援的操作。'});
}catch(e){json(res,400,{error:e.message});}return true;}
return {handle,guardTrade};
};
