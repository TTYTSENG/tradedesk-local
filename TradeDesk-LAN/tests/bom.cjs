const assert=require('node:assert/strict'),S=require('../public/schema.js'),Papa=require('../public/vendor/papaparse.min.js'),fs=require('node:fs'),vm=require('node:vm');
const legacy=S.empty();delete legacy.bom;assert.deepEqual(S.validate(legacy).bom,[]);
const metrics=S.packageMetrics({carton_length_cm:40,carton_width_cm:30,carton_height_cm:25,carton_count:20,units_per_carton:10,gross_weight_per_carton_kg:11,net_weight_kg:1});
assert.equal(metrics.perCartonCbm,0.03);assert.equal(metrics.totalCbm,0.6);assert.equal(metrics.totalUnits,200);assert.equal(metrics.totalGrossKg,220);assert.equal(metrics.totalNetKg,200);assert.ok(Math.abs(metrics.totalCuft-21.1888000329)<1e-8);
assert.equal(S.packageMetrics({carton_length_cm:40}).totalCbm,null);
assert.equal(S.bomLineCost({quantity:2,waste_pct:5,unit_cost:10}),21);assert.equal(S.bomLineCost({quantity:2,unit_cost:''}),null);
const totals=S.bomTotals([{quantity:2,unit_cost:10,currency:'USD'},{quantity:1,unit_cost:3,currency:'TWD'},{quantity:1,unit_cost:'',currency:'USD'}]);assert.equal(totals.USD.cost,20);assert.equal(totals.USD.missing,1);assert.equal(totals.TWD.cost,3);
const data=S.empty();data.products.push({id:'P001',name:'Test',hs_code:'090121'});data.bom.push({id:'B001',product_id:'P001',line_no:1,component_code:'M001',component_name:'Material',quantity:0.1,unit:'kg',unit_cost:10,currency:'usd'});
assert.equal(S.validate(data).bom[0].currency,'USD');
for(const change of [{product_id:'missing'},{quantity:0},{quantity:-1},{line_no:1.5},{unit_cost:10,currency:''},{waste_pct:-1}]){const bad=structuredClone(data);Object.assign(bad.bom[0],change);assert.throws(()=>S.validate(bad));}
const duplicate=structuredClone(data);duplicate.bom.push({...duplicate.bom[0],id:'B002'});assert.throws(()=>S.validate(duplicate));
const badProduct=structuredClone(data);badProduct.products[0].carton_count=1.5;assert.throws(()=>S.validate(badProduct));
const app=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
const parser=app.slice(app.indexOf('function parseCSV('),app.indexOf('\nfunction applyImport('));const parse=vm.runInNewContext(parser+';parseCSV',{Papa,S});
const oldKeys=S.fields.products.slice(0,8).map(f=>f[0]);assert.equal(parse(Papa.unparse({fields:oldKeys,data:[oldKeys.map(k=>data.products[0][k]||'')]}),'products')[0].hs_code,'090121');
for(const kind of ['products','bom']){const text=fs.readFileSync(require('node:path').join(__dirname,'../templates/'+kind+'_example.csv'),'utf8');const rows=parse(text,kind);const next=structuredClone(data);next[kind]=rows;assert.doesNotThrow(()=>S.validate(next));}
console.log('PASS: BOM costs, mixed currencies, missing prices, packaging volume/weights, legacy data and CSV templates.');
