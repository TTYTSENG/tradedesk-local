(function(root){
'use strict';
const kinds=['research','literature','experiment','paper','patent','product','supplier','funding','social','cold','warm','website','validation','validation_item'];
const common=['id','title','kind','status','priority','date','next','link','channel','visibility','source','published','body','checks','updatedAt'];
const extra=['project_id','sample_id','product_id','batch_id','part_number','revision','lot','sample_qty','sampling_plan','production_info','sample_type','category','specification','method','instrument','unit','lower','upper','actual','result','reviewer','review_date','report_reference','correction','retest_of','waiver'];
const fields={records:[...common,...extra],tasks:['id','title','status','priority','date','next','link','area','connection','updatedAt']};
const status=['待整理','可執行','進行中','待外部回覆','暫停','已完成','素材','草稿','待核對','可發布','已發布','可寄出','已手動寄出'];
const idok=s=>/^[A-Za-z0-9_-]{1,80}$/.test(s);
function empty(){return {version:1,revision:0,records:[],tasks:[]};}
function validate(input,trade){
 if(!input||!Array.isArray(input.records)||!Array.isArray(input.tasks))throw Error('資料格式錯誤。');
 const out=empty();out.revision=Number(input.revision)||0;
 for(const group of ['records','tasks']){if(input[group].length>10000)throw Error('每類最多 10,000 筆。');out[group]=input[group].map(raw=>{const r={};for(const k of Object.keys(raw))if(!fields[group].includes(k))throw Error('不支援的欄位：'+k);for(const k of fields[group]){if(k==='checks'){r[k]=Array.isArray(raw[k])?raw[k].map(String):String(raw[k]||'').split(';').filter(Boolean);continue;}r[k]=String(raw[k]??'').trim();if(r[k].length>20000)throw Error('欄位太長：'+k);}if(!idok(r.id)||!r.title)throw Error('ID 須為英文、數字、底線、短橫線，且名稱必填。');if(!status.includes(r.status))throw Error('狀態無效：'+r.id);if(!['高','中','低'].includes(r.priority))throw Error('優先順序無效。');for(const k of ['date','review_date'])if(r[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(r[k])||new Date(r[k]+'T00:00:00Z').toISOString().slice(0,10)!==r[k]))throw Error('日期須為有效 YYYY-MM-DD。');if(group==='records'&&!kinds.includes(r.kind))throw Error('資料種類无效。');return r;});const ids=new Set(out[group].map(r=>r.id));if(ids.size!==out[group].length)throw Error('ID 重複。');}
 const all=[...out.records,...out.tasks];if(new Set(all.map(r=>r.id)).size!==all.length)throw Error('紀錄與待辦 ID 不可重複。');
 const map=new Map(out.records.map(r=>[r.id,r]));for(const r of all)if(r.link&&!map.has(r.link))throw Error('相關紀錄不存在：'+r.link);
 for(const r of out.records){
 if(['social','website','cold'].includes(r.kind)&&['可發布','已發布','可寄出','已手動寄出'].includes(r.status)){const n=r.kind==='cold'?7:4;if(r.checks.length!==n||new Set(r.checks).size!==n||!Array.from({length:n},(_,i)=>String(i)).every(i=>r.checks.includes(i))||r.visibility!=='可公開')throw Error('對外草稿须完成 Checklist 與公開範圍確認。');if(['已發布','已手動寄出'].includes(r.status)&&!r.published)throw Error('請填寫實際完成紀錄。');}
 if(r.kind==='validation'){
 for(const [key,group] of [['project_id','ppap_projects'],['sample_id','samples'],['product_id','products']])if(!r[key]||!trade?.[group]?.some(x=>x.id===r[key]))throw Error('樣品驗證须連結已存在的 PPAP 專案、樣品與產品。');
 const p=trade.ppap_projects.find(p=>p.id===r.project_id),s=trade.samples.find(s=>s.id===r.sample_id);if(p.product_id!==r.product_id||s.product_id!==r.product_id||s.company_id!==p.company_id)throw Error('專案、樣品與產品／客戶不一致。');
 if(!r.sample_type||!r.lot||!r.revision||!Number.isInteger(Number(r.sample_qty))||Number(r.sample_qty)<=0||!r.sampling_plan)throw Error('驗證批次须填樣品型態、批號、版本、正整數樣品數與抽樣／驗證計畫。');
 }
 if(r.kind==='validation_item'){
 if(map.get(r.batch_id)?.kind!=='validation')throw Error('驗證項目須連結驗證批次。');if(!['待驗證','通過','不通過','不適用'].includes(r.result))throw Error('驗證判定無效。');
 if(r.retest_of&&(map.get(r.retest_of)?.kind!=='validation_item'||map.get(r.retest_of).batch_id!==r.batch_id||r.retest_of===r.id))throw Error('複驗須連結同批次的原驗證項目。');
 for(const k of ['lower','upper'])if(r[k]!==''&&!Number.isFinite(Number(r[k])))throw Error('上下限須為數字。');if(r.lower!==''&&r.upper!==''&&Number(r.lower)>Number(r.upper))throw Error('下限不可大於上限。');
 if(r.result==='不適用'&&(!r.waiver||!r.reviewer||!r.review_date))throw Error('不適用須填理由／客戶依據與審核人、日期。');
 if(['通過','不通過'].includes(r.result)){if(!r.specification||!r.method||!r.actual||!r.report_reference||!r.reviewer||!r.review_date)throw Error('完成判定须填規格、方法、實測、報告編號與審核資訊。');if(r.lower!==''||r.upper!==''){const n=Number(r.actual);if(!Number.isFinite(n))throw Error('有數值上下限時，實測值須為數字。');const inside=(r.lower===''||n>=Number(r.lower))&&(r.upper===''||n<=Number(r.upper));if(r.result==='通過'&&!inside)throw Error('實測值超出規格，不能判定通過。');}}
 }
 }
 for(const batch of out.records.filter(r=>r.kind==='validation'&&r.status==='已完成')){const rows=out.records.filter(r=>r.kind==='validation_item'&&r.batch_id===batch.id);if(!rows.length||!batch.reviewer||!batch.review_date||!batch.report_reference)throw Error('完成批次須有項目、審核人、日期與報告編號。');const latest=rows.filter(r=>!rows.some(x=>x.retest_of===r.id));if(latest.some(r=>!['通過','不適用'].includes(r.result)))throw Error('仍有未驗證或不通過項目，批次不能完成。');for(const row of rows){const seen=new Set();let x=row;while(x?.retest_of){if(seen.has(x.id))throw Error('複驗關聯不可形成循環。');seen.add(x.id);x=map.get(x.retest_of);}}}
 return out;
}
const api={kinds,fields,empty,validate};if(typeof module!=='undefined')module.exports=api;else root.WorkbenchSchema=api;
})(typeof window!=='undefined'?window:globalThis);
