const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),S=require('../public/workflow-schema.js'),IO=require('../public/workbook-io.js');
async function run(){
 const data=S.empty();data.products.push({id:'P001',name:'Product',hs_code:'090121'});data.companies.push({id:'C001',product_id:'P001',name:'Buyer',country:'Test',stage:'待開發'});
 data.samples.push({id:'S001',company_id:'C001',product_id:'P001',request_date:'2026-10-12',requirements:'Request',requested_qty:2,unit:'件',status:'需求已記錄'});
 data.ppap_projects.push({id:'N001',company_id:'C001',product_id:'P001',name:'New part',submission_level:'3',stage:'需求確認'});S.seedPpap(data);assert.equal(data.ppap_items.length,18);S.seedPpap(data);assert.equal(data.ppap_items.length,18);const normalized=S.validate(data);assert.equal(S.ppapProgress(normalized.ppap_items).ready,0);
 for(const change of [{element_no:19},{project_id:'missing'},{requirement:'不適用',waiver_reason:''},{status:'已完成'}]){const bad=structuredClone(data);Object.assign(bad.ppap_items[0],change);assert.throws(()=>S.validate(bad));}
 const bad=structuredClone(data);bad.ppap_projects[0].stage='客戶核准';assert.throws(()=>S.validate(bad));
 for(const r of data.ppap_items){r.requirement='需提交';r.status='已完成';r.review_result='通過';r.document_reference='DOC-'+r.element_no;r.reviewed_by='Reviewer';r.review_date='2026-10-12';}
 Object.assign(data.ppap_projects[0],{stage:'客戶核准',approval_date:'2026-10-12',approved_by:'Customer',approval_reference:'PSW-001'});assert.equal(S.ppapProgress(S.validate(data).ppap_items).ready,18);
 const waiver=structuredClone(data);waiver.ppap_items[0].requirement='不適用';waiver.ppap_items[0].waiver_reason='Customer written waiver W001';assert.doesNotThrow(()=>S.validate(waiver));
 const incomplete=structuredClone(data);incomplete.samples[0].status='已提供';assert.throws(()=>S.validate(incomplete));
 for(const kind of ['products','samples','ppap_projects','ppap_items']){const bytes=await IO.write(kind,S.fields[kind],S.validate(data)[kind]);const restored=await IO.read(bytes,kind);assert.equal(restored.rows.length,data[kind].length);assert.deepEqual(restored.headers,S.fields[kind].map(f=>f[0]));if(kind==='products')assert.equal(restored.rows[0].hs_code,'090121');}
 // Formula-bearing structured imports must not depend on cached Excel results.
 const Excel=require('../public/vendor/exceljs.min.js'),book=new Excel.Workbook(),sheet=book.addWorksheet('samples');sheet.getCell('A1').value='id';sheet.getCell('A2').value={formula:'1+1',result:2};
 await assert.rejects(async()=>IO.read(await book.xlsx.writeBuffer(),'samples'),/公式/);
 const examples=require('../public/workflows.js').examples;for(const k of Object.keys(examples))assert.ok(fs.readFileSync(path.join(__dirname,'../templates/'+k+'_example.csv'),'utf8').includes(examples[k][0].id));
 console.log('PASS: sample validation, PPAP 18-item gates, customer approval evidence, Excel round trips and formula rejection.');
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
