(function(root){
  const fields = {
    products: [['id','產品ID','id',true],['name','產品名稱','text',true],['hs_code','HS Code','hs',true],['description','產品說明','text'],['advantage','主要優勢','text'],['moq','最低訂購量','text'],['lead_time','交期','text'],['incoterm','貿易條件','text']],
    markets: [['id','市場紀錄ID','id',true],['product_id','產品ID','refProduct',true],['country','國家／市場','text',true],['year','年度','year',true],['import_usd','進口額 USD','amount',true],['source_url','資料來源網址','url'],['notes','備註','text']],
    companies: [['id','公司ID','id',true],['product_id','產品ID','refProduct',true],['name','公司名稱','text',true],['country','國家／市場','text',true],['website','公司網站','url'],['contact_name','主要聯絡人','text'],['contact_role','聯絡人職稱','text'],['email','公開商務 Email','email'],['linkedin','LinkedIn 網址','url'],['source_url','聯絡資料來源網址','url'],['stage','業務階段','stage',true],['next_followup','下次跟進日期','date'],['notes','備註','text']],
    drafts: [['id','草稿ID','id',true],['company_id','公司ID','refCompany',true],['language','語言','language',true],['subject','主旨','text',true],['body','內文','text',true],['status','信件狀態','draftStatus',true],['created_at','建立日期','date',true],['check_audience','已確認對象與職務','check'],['check_product','已確認產品與市場適配','check'],['check_benefit','已說明具體利益','check'],['check_proof','已核實規格與佐證','check'],['check_cta','已有明確行動邀請','check'],['check_contact','已填妥寄件聯絡資訊','check'],['check_review','已人工檢查語言與附件','check']],
    activities: [['id','紀錄ID','id',true],['company_id','公司ID','refCompany',true],['date','紀錄日期','date',true],['type','紀錄類型','activityType',true],['subject','信件／會議主旨','text'],['summary','往來內容摘要','text',true],['reply','對方信件原文','text'],['body','我方信件原文','text'],['requests','客戶需求／問題','text'],['commitments','我方承諾','text'],['action_items','下一步／待辦','text'],['next_followup','建議跟進日期','date']]
  };
  fields.products.push(['sku','成品料號／SKU','text'],['model','型號／版本','text'],['specification','成品規格','text'],['material','主要材質','text'],['unit','成品計量單位','text'],['net_weight_kg','單件淨重 kg','decimal'],['packaging_type','包裝方式','text'],['packaging_notes','內包裝／外箱說明','text'],['units_per_carton','每箱成品數量','integer'],['carton_length_cm','外箱長 cm','positive'],['carton_width_cm','外箱寬 cm','positive'],['carton_height_cm','外箱高 cm','positive'],['carton_count','出貨箱數','integer'],['gross_weight_per_carton_kg','每箱毛重 kg','decimal']);
  fields.bom=[['id','BOM 明細ID','id',true],['product_id','成品產品ID','refProduct',true],['line_no','項次','integer',true],['component_code','材料／零件料號','text',true],['component_name','材料／零件名稱','text',true],['specification','材料規格／尺寸','text'],['material','材質','text'],['quantity','每一成品用量','positive',true],['unit','材料計量單位','text',true],['waste_pct','額外耗損率 %','decimal'],['unit_cost','材料單價','decimal'],['currency','單價幣別 ISO 代碼','currency'],['supplier','供應商','text'],['notes','備註','text']];
  const choices={stage:['待開發','已聯繫','已回覆','洽談中','已成交','暫停'],language:['en','zh'],draftStatus:['草稿','已手動寄出'],activityType:['開發信','回覆','電話','會議','跟進','備註'],check:['是','否']};
  function empty(){return {schema_version:1,revision:0,products:[],markets:[],companies:[],drafts:[],activities:[],bom:[]};}
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
  function validate(input){
    if(!input||input.schema_version!==1)throw Error('資料格式版本不支援。');
    const out=empty(); out.revision=Number.isSafeInteger(input.revision)?input.revision:0;
    for(const [kind,defs] of Object.entries(fields)){
      if(kind==='bom'&&input[kind]===undefined)input={...input,bom:[]};
      if(!Array.isArray(input[kind])||input[kind].length>20000)throw Error(kind+' 必須為陣列，最多 20,000 筆。');
      const seen=new Set();
      out[kind]=input[kind].map((row,index)=>{
        if(!row||typeof row!=='object'||Array.isArray(row))throw Error(kind+' 第 '+(index+1)+' 筆不是有效紀錄。');
        const result={};
        for(const [key,label,type,required] of defs){
          if(row[key]!==undefined&&typeof row[key]!=='string'&&typeof row[key]!=='number')throw Error(label+' 格式錯誤。');
          let v=String(row[key]??'').trim(); if(type==='check'&&!v)v='否'; const context=kind+' 第 '+(index+1)+' 筆：'+label;
          if(required&&!v)throw Error(context+' 不可空白。');
          if(v.length>20000)throw Error(context+' 超過 20,000 字。');
          if(v&&type==='id'&&!/^[A-Za-z0-9_-]{1,80}$/.test(v))throw Error(context+' 只可使用英文、數字、底線或短橫線。');
          if(v&&type==='hs'&&!/^\d{2,12}$/.test(v))throw Error(context+' 須為 2–12 位數字，保留前導零。');
          if(v&&type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error(context+' 格式不正確。');
          if(v&&type==='url'){try{if(!['http:','https:'].includes(new URL(v).protocol))throw Error();}catch{throw Error(context+' 須以 http:// 或 https:// 開頭。');}}
          if(v&&type==='date'&&!validDate(v))throw Error(context+' 須為有效 YYYY-MM-DD 日期。');
          if(v&&choices[type]&&!choices[type].includes(v))throw Error(context+' 須為 '+choices[type].join('／')+'。');
          if(type==='year'){if(!/^\d{4}$/.test(v)||+v<1900||+v>2100)throw Error(context+' 須為 1900–2100 年。');v=Number(v);}
          if(type==='amount'){if(!/^\d+(\.\d+)?$/.test(v)||!Number.isFinite(Number(v)))throw Error(context+' 須為非負數字，不含千位逗號。');v=Number(v);}
          if(v&&['decimal','positive','integer'].includes(type)){if(!/^\d+(\.\d+)?$/.test(v)||!Number.isFinite(+v)||(type==='positive'&&+v<=0)||(type==='integer'&&(!Number.isSafeInteger(+v)||+v<=0)))throw Error(context+' 須為'+(type==='integer'?'正整數':type==='positive'?'正數':'非負數字')+'，不含逗號。');v=Number(v);}
          if(v&&type==='currency'){v=v.toUpperCase();if(!/^[A-Z]{3}$/.test(v))throw Error(context+' 須為三位英文字母，例如 USD／TWD。');}
          result[key]=v;
        }
        if(seen.has(result.id))throw Error(kind+' 有重複 ID：'+result.id);seen.add(result.id);return result;
      });
    }
    const products=new Set(out.products.map(x=>x.id)),companies=new Set(out.companies.map(x=>x.id));
    for(const kind of ['markets','companies','bom'])for(const row of out[kind])if(!products.has(row.product_id))throw Error(kind+' 的產品ID不存在：'+row.product_id);
    for(const kind of ['drafts','activities'])for(const row of out[kind])if(!companies.has(row.company_id))throw Error(kind+' 的公司ID不存在：'+row.company_id);
    const bomKeys=new Set();for(const row of out.bom){const key=JSON.stringify([row.product_id,row.line_no]);if(bomKeys.has(key))throw Error('同一成品的 BOM 項次不可重複：'+row.product_id+' '+row.line_no);bomKeys.add(key);if(row.unit_cost!==''&&!row.currency)throw Error('BOM 有單價時必須填幣別：'+row.id);if(!Number.isFinite(bomLineCost(row)??0))throw Error('BOM 延伸成本超過可計算範圍：'+row.id);}
    for(const p of out.products){const v=packageMetrics(p);if(Object.values(v).some(n=>n!==null&&!Number.isFinite(n)))throw Error('包裝計算超過可計算範圍：'+p.id);}
    const marketKeys=new Set(); for(const row of out.markets){const key=JSON.stringify([row.product_id,row.country,row.year]);if(marketKeys.has(key))throw Error('同一產品／國家／年度不可重複：'+row.product_id+' '+row.country+' '+row.year);marketKeys.add(key);}
    for(const row of out.drafts)if(row.status==='已手動寄出'&&fields.drafts.filter(f=>f[2]==='check').some(f=>row[f[0]]!=='是'))throw Error('已手動寄出的草稿必須完成七項 Checklist：'+row.id);
    return out;
  }
  function packageMetrics(p){
    const number=k=>p[k]!==''&&p[k]!=null&&Number.isFinite(+p[k])?+p[k]:null;
    const [l,w,h,c,q,g,n]=['carton_length_cm','carton_width_cm','carton_height_cm','carton_count','units_per_carton','gross_weight_per_carton_kg','net_weight_kg'].map(number);
    const perCartonCbm=l!==null&&w!==null&&h!==null?l*w*h/1000000:null;
    const totalCbm=perCartonCbm!==null&&c!==null?perCartonCbm*c:null;
    return {perCartonCbm,totalCbm,totalCuft:totalCbm===null?null:totalCbm/0.028316846592,totalUnits:c!==null&&q!==null?c*q:null,totalGrossKg:c!==null&&g!==null?c*g:null,totalNetKg:c!==null&&q!==null&&n!==null?c*q*n:null};
  }
  function bomLineCost(row){return row.unit_cost===''||row.unit_cost==null?null:Number(row.quantity)*(1+Number(row.waste_pct||0)/100)*Number(row.unit_cost);}
  function bomTotals(rows){const totals={};for(const r of rows){if(!totals[r.currency||'未填幣別'])totals[r.currency||'未填幣別']={cost:0,missing:0};const t=totals[r.currency||'未填幣別'],v=bomLineCost(r);if(v===null)t.missing++;else t.cost+=v;}return totals;}
  const api={fields,choices,empty,validate,validDate,packageMetrics,bomLineCost,bomTotals};
  if(typeof module!=='undefined')module.exports=api;else root.TradeSchema=api;
})(typeof window!=='undefined'?window:globalThis);
