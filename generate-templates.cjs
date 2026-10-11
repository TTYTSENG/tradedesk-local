const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),S=require('./public/schema.js'),Papa=require('./public/vendor/papaparse.min.js');
// Sample records are shared with the UI. Evaluate only this project's trusted static object.
const source=fs.readFileSync(path.join(__dirname,'public/app.js'),'utf8');
const object=source.slice(source.indexOf('const examples=')+'const examples='.length,source.indexOf('\nfunction csv(')).replace(/;\s*$/,'');
const examples=vm.runInNewContext('('+object+')');
let guide='# CSV 欄位說明\n\n使用英文欄名；* 表示必填。所有示例資料均為虛構。\n\n';
for(const [kind,defs] of Object.entries(S.fields)){
  const keys=defs.map(f=>f[0]);
  for(const [name,rows] of [['template',[]],['example',examples[kind]]]){
    const text='\uFEFF'+Papa.unparse({fields:keys,data:rows.map(r=>keys.map(k=>r[k]??(k.startsWith('check_')?'否':'')))},{newline:'\r\n'})+'\r\n';
    fs.writeFileSync(path.join(__dirname,'templates',kind+'_'+name+'.csv'),text,'utf8');
  }
  guide+='## '+kind+'\n\n| 欄名 | 中文說明 | 格式 |\n|---|---|---|\n'+defs.map(([key,label,type,required])=>'| '+key+' | '+label+(required?' *':'')+' | '+(S.choices[type]?S.choices[type].join('／'):type==='date'?'YYYY-MM-DD':type==='hs'?'2–12 位數字，文字格式':type==='amount'?'USD 非負數字，不含逗號':type==='integer'?'正整數':type==='positive'?'正數，可填小數':type==='decimal'?'非負數字，可留白':type==='currency'?'三位英文字母，如 USD／TWD；有單價必填':type==='refProduct'?'既有產品ID':type==='refCompany'?'既有公司ID':type)+' |').join('\n')+'\n\n';
}
fs.writeFileSync(path.join(__dirname,'templates','欄位說明.md'),guide,'utf8');
console.log('Generated 6 blank templates, 6 fictional examples and field guide.');
