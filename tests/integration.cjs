require('./bom.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const S=require('../public/workflow-schema.js'),Papa=require('../public/vendor/papaparse.min.js');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'tradedesk-test-')),port=18766,url='http://127.0.0.1:'+port;
let proc,token;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){proc=spawn(process.execPath,[path.join(root,'server.js')],{env:{...process.env,TRADEDESK_PORT:String(port),TRADEDESK_DATA_DIR:dir},stdio:'pipe',windowsHide:true});let errors='';proc.stderr.on('data',x=>errors+=x);for(let i=0;i<50;i++){try{if((await fetch(url+'/api/health')).ok){token=fs.readFileSync(path.join(dir,'server-info.json'),'utf8');token=JSON.parse(token).token;return;}}catch{}await wait(100);}throw Error(errors||'Server did not start');}
async function save(state,extra={}){return fetch(url+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Tradedesk-Token':token,...extra},body:JSON.stringify(state)});}
async function stop(){const done=new Promise(r=>proc.once('exit',r));await fetch(url+'/api/shutdown',{method:'POST',headers:{'X-Tradedesk-Token':token}});await done;}
async function run(){
  await require('./workflows.cjs')();
  await start();let initial=await (await fetch(url+'/api/state')).json();assert.equal(initial.products.length,0);
  let input=S.empty();input.products.push({id:'P001',name:'中文產品',hs_code:'090121'});
  input.bom.push({id:'B001',product_id:'P001',line_no:1,component_code:'M001',component_name:'材料',quantity:0.1,unit:'kg',unit_cost:10,currency:'USD'});
  input.markets.push({id:'M001',product_id:'P001',country:'市場 A',year:'2024',import_usd:'1000000'},{id:'M002',product_id:'P001',country:'市場 A',year:'2025',import_usd:'1200000'});
  input.companies.push({id:'C001',product_id:'P001',name:'Buyer "A", Ltd.',country:'市場 A',email:'buyer@example.com',stage:'待開發',next_followup:'2026-10-20'});
  input.drafts.push({id:'D001',company_id:'C001',language:'en',subject:'Test',body:'Line one, "quote"\n第二行',status:'草稿',created_at:'2026-10-12'});
  input.activities.push({id:'A001',company_id:'C001',date:'2026-10-12',type:'回覆',summary:'需要規格',reply:'Please send specs.\nAnd quotation.',requests:'規格與報價',commitments:'準備資料',action_items:'確認數量'});
  let resp=await save(input);assert.equal(resp.status,200);let saved=await resp.json();assert.equal(saved.products[0].hs_code,'090121');assert.equal(saved.markets[1].import_usd,1200000);assert.equal(saved.drafts[0].check_review,'否');assert.equal(saved.revision,1);assert.equal(saved.bom[0].quantity,0.1);assert.equal(S.bomLineCost(saved.bom[0]),1);
  assert.equal((saved.markets[1].import_usd-saved.markets[0].import_usd)/saved.markets[0].import_usd,0.2);
  // Real CSV parser round trip: Unicode, embedded commas/quotes/newlines, text IDs and leading zero.
  const csv=Papa.unparse(saved.drafts),parsed=Papa.parse('\uFEFF'+csv,{header:true});assert.equal(parsed.errors.length,0);assert.equal(parsed.data[0].body,saved.drafts[0].body);
  const pCSV=Papa.parse(Papa.unparse(saved.products),{header:true});assert.equal(pCSV.data[0].hs_code,'090121');
  resp=await save(input);assert.equal(resp.status,409);assert.equal((await(await fetch(url+'/api/state')).json()).revision,1);
  let bad=structuredClone(saved);bad.companies[0].product_id='missing';assert.equal((await save(bad)).status,400);
  bad=structuredClone(saved);bad.markets.push({...bad.markets[0],id:'M003'});assert.equal((await save(bad)).status,400);
  bad=structuredClone(saved);bad.activities[0].date='2026-02-30';assert.equal((await save(bad)).status,400);
  bad=structuredClone(saved);bad.drafts[0].status='已手動寄出';assert.equal((await save(bad)).status,400);
  assert.equal((await save(saved,{'X-Tradedesk-Token':'wrong'})).status,403);
  assert.equal((await save(saved,{'Origin':'https://example.com'})).status,403);
  assert.equal((await fetch(url+'/data/state.json')).status,404);
  saved.companies[0].notes='Restart persistence check';resp=await save(saved);assert.equal(resp.status,200);saved=await resp.json();assert.equal(saved.revision,2);
  const previous=JSON.parse(fs.readFileSync(path.join(dir,'state.previous.json'),'utf8'));assert.equal(previous.revision,1);
  await stop();await start();const restarted=await(await fetch(url+'/api/state')).json();assert.equal(restarted.companies[0].notes,'Restart persistence check');assert.equal(restarted.revision,2);
  // Restoring an empty backup is validated and takes one new revision.
  const backup=S.empty();backup.revision=restarted.revision;resp=await save(backup);assert.equal(resp.status,200);assert.equal((await resp.json()).products.length,0);
  // Preserve arbitrary Excel/CSV reports locally and prevent accidental record removal.
  const current=await(await fetch(url+'/api/state')).json();current.products.push({id:'P001',name:'Test',hs_code:'090121'});current.companies.push({id:'C001',product_id:'P001',name:'Buyer',country:'Test',stage:'待開發'});current.samples.push({id:'S001',company_id:'C001',product_id:'P001',request_date:'2026-10-12',requirements:'Sample report',requested_qty:1,unit:'件',status:'需求已記錄'});assert.equal((await save(current)).status,200);
  const owner='kind=samples&record_id=S001',original='id,summary\nS001,"Original report, keep unchanged"';
  assert.equal((await fetch(url+'/api/reports?'+owner+'&filename=report.csv',{method:'POST',headers:{'X-Tradedesk-Token':'wrong'},body:original})).status,403);
  assert.equal((await fetch(url+'/api/reports?'+owner+'&filename=report.html',{method:'POST',headers:{'X-Tradedesk-Token':token},body:original})).status,400);
  const upload=await fetch(url+'/api/reports?'+owner+'&filename='+encodeURIComponent('樣品報告.csv'),{method:'POST',headers:{'X-Tradedesk-Token':token},body:original});assert.equal(upload.status,201);const report=await upload.json();assert.equal((await(await fetch(url+'/api/reports/'+report.id)).text()),original);assert.equal((await(await fetch(url+'/api/reports?'+owner)).json()).length,1);
  const remove=await(await fetch(url+'/api/state')).json();remove.samples=[];assert.equal((await save(remove)).status,400);
  await stop();await start();assert.equal((await(await fetch(url+'/api/reports/'+report.id)).text()),original);assert.equal((await fetch(url+'/data/reports/index.json')).status,404);
  await stop();console.log('PASS: CRUD persistence, CSV round-trip, leading zeros, trade calculation, references, duplicates, dates, checklist, stale writes, origin checks, backups, restart and restore.');
}
run().catch(e=>{console.error(e);if(proc)proc.kill();process.exitCode=1;});
