// Original Excel/CSV reports stay on this computer, outside the public directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function(dataDir,getState,token,port){
  const dir=path.join(dataDir,'reports'),indexPath=path.join(dir,'index.json');fs.mkdirSync(dir,{recursive:true});
  let index=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath,'utf8')):[];
  const kinds=['samples','ppap_projects','ppap_items'];
  const exists=(kind,id,state=getState())=>kinds.includes(kind)&&state[kind]?.some(r=>r.id===id);
  const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  function guardState(next){for(const r of index)if(!exists(r.kind,r.record_id,next))throw Error('此紀錄有 Excel／CSV 報告附件，不能刪除或以備份移除：'+r.record_id);}
  async function handle(req,res,url){
    if(!url.pathname.startsWith('/api/reports'))return false;
    const kind=url.searchParams.get('kind'),recordId=url.searchParams.get('record_id');
    if(req.method==='GET'&&url.pathname==='/api/reports'){if(!exists(kind,recordId)){json(res,404,{error:'紀錄不存在。'});return true;}json(res,200,index.filter(r=>r.kind===kind&&r.record_id===recordId).map(({stored_name,...r})=>r));return true;}
    if(req.method==='GET'&&/^\/api\/reports\/[a-f0-9]{32}$/.test(url.pathname)){
      const r=index.find(r=>r.id===url.pathname.split('/').at(-1));if(!r||!exists(r.kind,r.record_id)){json(res,404,{error:'報告不存在。'});return true;}
      try{const bytes=fs.readFileSync(path.join(dir,r.stored_name));res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(r.filename),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{json(res,404,{error:'報告檔案不存在，請檢查本機備份。'});}return true;
    }
    if(req.method==='POST'&&url.pathname==='/api/reports'){
      const origin=req.headers.origin;if(req.headers['x-tradedesk-token']!==token||(origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(origin))){json(res,403,{error:'請重新整理後再上傳。'});return true;}
      try{
        if(!exists(kind,recordId))throw Error('請先儲存樣品或 PPAP 紀錄。');if(index.length>=2000)throw Error('最多保存 2,000 份報告。');
        const filename=url.searchParams.get('filename')||'',ext=path.extname(filename).toLowerCase();if(!['.xlsx','.csv'].includes(ext)||filename.length>240||/[\x00-\x1f]/.test(filename))throw Error('只接受 .xlsx／.csv 報告，檔名最多 240 字元。');
        let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>10*1024*1024)throw Error('報告超過 10MB。');chunks.push(c);}
        if(!size)throw Error('檔案為空白。');const bytes=Buffer.concat(chunks);if(ext==='.xlsx'&&bytes.subarray(0,2).toString()!=='PK')throw Error('不是有效的 XLSX 檔案。');if(!exists(kind,recordId))throw Error('紀錄已變更，請重新開啟報告視窗。');
        const id=crypto.randomBytes(16).toString('hex'),stored_name=id+ext;
        const r={id,kind,record_id:recordId,filename,size,uploaded_at:new Date().toISOString(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),stored_name};
        fs.writeFileSync(path.join(dir,stored_name),bytes);const next=[...index,r];fs.writeFileSync(indexPath+'.tmp',JSON.stringify(next,null,2));fs.renameSync(indexPath+'.tmp',indexPath);index=next;const {stored_name:omit,...publicRecord}=r;json(res,201,publicRecord);
      }catch(e){json(res,400,{error:e.message});}return true;
    }
    json(res,405,{error:'Unsupported report operation'});return true;
  }
  return {handle,guardState};
};
