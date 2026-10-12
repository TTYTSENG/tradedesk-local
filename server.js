// TradeDesk local server. Node.js built-in modules only; no package install needed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const schema=require('./public/workflow-schema.js');
const base=__dirname,publicDir=path.join(base,'public'),dataDir=process.env.TRADEDESK_DATA_DIR||path.join(base,'data');
const port=Number(process.env.TRADEDESK_PORT||8765),token=crypto.randomBytes(32).toString('hex');
fs.mkdirSync(dataDir,{recursive:true});
const dbPath=path.join(dataDir,'state.json');
let state=fs.existsSync(dbPath)?schema.validate(JSON.parse(fs.readFileSync(dbPath,'utf8'))):schema.empty();
const reports=require('./reports.js')(dataDir,()=>state,token,port);
function persist(next){
  const temp=path.join(dataDir,'state.tmp');
  fs.writeFileSync(temp,JSON.stringify(next,null,2),'utf8');
  if(fs.existsSync(dbPath))fs.copyFileSync(dbPath,path.join(dataDir,'state.previous.json'));
  fs.renameSync(temp,dbPath); state=next;
}
function send(res,code,data,type='application/json; charset=utf-8'){
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  res.end(typeof data==='string'?data:JSON.stringify(data));
}
const server=http.createServer(async(req,res)=>{
  // Localhost only; do not accept DNS-rebinding hostnames or cross-origin writes.
  if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host))return send(res,403,{error:'Local access only'});
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  if(await reports.handle(req,res,url))return;
  if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{app:'TradeDesk',version:1});
  if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,state);
  if(req.method==='POST'&&url.pathname==='/api/shutdown'){
    if(req.headers['x-tradedesk-token']!==token)return send(res,403,{error:'Invalid token'});
    send(res,200,{ok:true});server.close();setTimeout(()=>process.exit(0),200);return;
  }
  if(req.method==='PUT'&&url.pathname==='/api/state'){
    const origin=req.headers.origin;
    if(req.headers['x-tradedesk-token']!==token||(origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(origin)))return send(res,403,{error:'請重新整理頁面後再試。'});
    try{
      let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>10*1024*1024)return send(res,413,{error:'資料超過 10MB。'});chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(body.revision!==state.revision)return send(res,409,{error:'資料已在其他視窗更新，請重新整理後再操作。'});
      const next=schema.validate(body);reports.guardState(next);next.revision=state.revision+1;persist(next);return send(res,200,next);
    }catch(e){return send(res,400,{error:e.message});}
  }
  if(req.method!=='GET')return send(res,405,{error:'Unsupported method'});
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,'Bad URL','text/plain');}
  const filename=path.resolve(publicDir,'.'+(pathname==='/'?'/index.html':pathname));
  if(!filename.startsWith(publicDir+path.sep))return send(res,403,'Forbidden','text/plain');
  try{
    let data=fs.readFileSync(filename);
    const ext=path.extname(filename),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
    if(ext==='.html')data=data.toString().replace('"__APP_TOKEN__"',JSON.stringify(token));
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch{return send(res,404,'Not found','text/plain');}
});
server.on('error',e=>{console.error('無法啟動 TradeDesk：'+e.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{fs.writeFileSync(path.join(dataDir,'server-info.json'),JSON.stringify({port,token,pid:process.pid}));console.log('TradeDesk ready: http://127.0.0.1:'+port);});
