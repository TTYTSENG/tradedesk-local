const fs=require('node:fs'),path=require('node:path'),S=require('./public/workbench-schema.js');
for(const [kind,fields] of Object.entries(S.fields))fs.writeFileSync(path.join(__dirname,'templates',kind+'_template.csv'),'\ufeff'+fields.join(',')+'\r\n');
fs.writeFileSync(path.join(__dirname,'templates','欄位說明.md'),'# 工作台欄位\n\nrecords 共用紀錄與 tasks 待辦分開匯入。id、title、status、priority 必填，id 使用英文、數字、底線或短橫線。\n\nrecords 的 kind 決定作業種類；其餘通用欄位可留空。validation、validation_item 的專用必填欄位與作業順序請見 README。checks 為 0 起算的檢查項次，以分號分隔。\n\n先匯入父紀錄再匯入子紀錄，前導零與日期欄用文字格式。Excel 空白範本可在工具中下載。\n');
console.log('CSV templates generated.');
