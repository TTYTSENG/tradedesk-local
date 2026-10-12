(function(root){
  const Excel=typeof module!=='undefined'?require('./vendor/exceljs.min.js'):root.ExcelJS;
  function cellValue(cell){const v=cell.value;if(v==null)return '';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;if(v instanceof Date)return v.toISOString().slice(0,10);if(v.formula||v.sharedFormula)throw Error('資料匯入不接受 Excel 公式，請貼上為值。');if(v.richText)return v.richText.map(t=>t.text).join('');if(v.text!=null)return v.text;throw Error('Excel 儲存格有不支援的內容。');}
  async function read(buffer,kind,sheetName=''){
    const book=new Excel.Workbook();await book.xlsx.load(buffer);
    const sheet=sheetName?book.getWorksheet(sheetName):book.getWorksheet(kind)||(book.worksheets.length===1?book.worksheets[0]:null);
    if(!sheet)throw Error('請填要匯入的工作表名稱，或將工作表命名為 '+kind+'。');
    if(sheet.rowCount>5001||sheet.columnCount>100)throw Error('工作表超過 5,000 筆或 100 欄。');
    const headers=Array.from({length:sheet.columnCount},(_,i)=>String(cellValue(sheet.getRow(1).getCell(i+1))).trim());
    while(headers.length&&headers.at(-1)==='')headers.pop();
    if(!headers.length||new Set(headers).size!==headers.length||headers.some(h=>!h))throw Error('首列欄名不可空白或重複。');
    const rows=[];for(let r=2;r<=sheet.rowCount;r++){const cells=headers.map((h,c)=>cellValue(sheet.getRow(r).getCell(c+1)));if(cells.some(v=>String(v).trim()))rows.push(Object.fromEntries(headers.map((h,i)=>[h,cells[i]])));}
    return {headers,rows};
  }
  async function write(kind,defs,rows){const book=new Excel.Workbook(),sheet=book.addWorksheet(kind);sheet.columns=defs.map(([key,label,type])=>({header:key,key,width:Math.max(18,Math.min(36,label.length*2)),style:{numFmt:['integer','decimal','positive','amount','year'].includes(type)?'0.########':'@'}}));sheet.addRows(rows);sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true};sheet.autoFilter={from:'A1',to:{row:Math.max(1,rows.length+1),column:defs.length}};return book.xlsx.writeBuffer();}
  const api={read,write};if(typeof module!=='undefined')module.exports=api;else root.WorkbookIO=api;
})(typeof window!=='undefined'?window:globalThis);
