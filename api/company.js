import * as cheerio from "cheerio";

const COMPANY_API_1="https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";
const COMPANY_API_3="https://data.gcis.nat.gov.tw/od/data/api/236EE382-4942-41A9-BD03-CA0709025E7C";
const JUDICIAL_SEARCH="https://judgment.judicial.gov.tw/FJUD/qryresult.aspx?judtype=JUDBOOK&kw=";
const JUDICIAL_AUTH="https://data.judicial.gov.tw/jdg/api/Auth";
const JUDICIAL_DOC="https://data.judicial.gov.tw/jdg/api/JDoc";

export default async function handler(req,res){
  setCors(res);
  if(req.method!=="GET")return res.status(405).json({success:false,message:"Method Not Allowed"});
  const taxId=String(req.query.taxId||"").trim();
  if(!/^\d{8}$/.test(taxId))return res.status(400).json({success:false,message:"統一編號必須為 8 位數"});

  try{
    const company=await getCompany(taxId);
    if(!company)return res.status(404).json({success:false,message:"查無公司資料"});

    const businessItems=await getBusinessItems(taxId);
    const names=[company.name,company.representative].filter(Boolean);
    const searches=[];
    for(const name of names){
      const rows=await searchJudicialPublic(name);
      searches.push(...rows.map(x=>({...x,searchName:name})));
    }

    const unique=new Map();
    for(const x of searches){
      const key=x.jid||x.url||`${x.court}|${x.caseNumber}|${x.date}|${x.title}`;
      if(!unique.has(key))unique.set(key,x);
    }

    let judgments=[...unique.values()].slice(0,100);
    // 有司法院 Open API 帳密時，對找到的 JID 取正式全文。
    const token=await getJudicialToken();
    if(token){
      judgments=await enrichWithJDoc(judgments,token);
    }else{
      judgments=await enrichPublicDetails(judgments);
    }

    return res.status(200).json({
      success:true,
      company,
      businessItems,
      judgments,
      judgmentSearch:`搜尋：${company.name||"公司名稱"} + ${company.representative||"代表人姓名"}；公司名稱與代表人分別搜尋後合併去重。`
    });
  }catch(e){
    console.error(e);
    return res.status(500).json({success:false,message:"後端查詢錯誤："+e.message});
  }
}

function setCors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
}

async function fetchJson(url){
  const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 company-judgment-search"}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function getCompany(taxId){
  const u=`${COMPANY_API_1}?$format=json&$filter=Business_Accounting_NO%20eq%20${taxId}&$skip=0&$top=50`;
  const data=await fetchJson(u); const x=Array.isArray(data)?data[0]:data;
  if(!x)return null;
  return {
    taxId:x.Business_Accounting_NO||taxId,
    status:x.Company_Status_Desc||"",
    name:x.Company_Name||"",
    foreignName:x.Company_Name_En||x.Company_Name_English||x.Foreign_Company_Name||"",
    capital:x.Capital_Stock_Amount||"",
    representative:x.Responsible_Name||"",
    address:x.Company_Location||"",
    registrationAuthority:x.Register_Organization_Desc||"",
    establishedDate:formatROCDate(x.Company_Setup_Date),
    lastChangeDate:formatROCDate(x.Change_Of_Approval_Data),
    laborRightsTraining:x.Labor_Rights_Training||"查無公開資料"
  };
}
async function getBusinessItems(taxId){
  const u=`${COMPANY_API_3}?$format=json&$filter=Business_Accounting_NO%20eq%20${taxId}&$skip=0&$top=1000`;
  try{
    const data=await fetchJson(u);
    const rows=Array.isArray(data)?data:[data];
    return rows.map(x=>x.Cmp_Business||x.Business_Item_Desc).filter(Boolean);
  }catch{return []}
}
function formatROCDate(v){
  if(!v)return "";
  const s=String(v).trim();
  if(/^\d{7}$/.test(s))return `${Number(s.slice(0,3))+1911}/${s.slice(3,5)}/${s.slice(5,7)}`;
  if(/^\d{8}$/.test(s))return `${s.slice(0,4)}/${s.slice(4,6)}/${s.slice(6,8)}`;
  return s;
}

async function searchJudicialPublic(keyword){
  const url=JUDICIAL_SEARCH+encodeURIComponent(keyword);
  const r=await fetch(url,{headers:{
    "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    "Accept-Language":"zh-TW,zh;q=0.9"
  }});
  if(!r.ok)throw new Error(`司法院查詢 HTTP ${r.status}`);
  const html=await r.text();
  const $=cheerio.load(html);
  const out=[];
  $("a").each((_,a)=>{
    const href=$(a).attr("href")||"";
    if(!/printData\.aspx/i.test(href))return;
    const text=$(a).text(" ").replace(/\s+/g," ").trim();
    const id=decodeId(href);
    const parent=$(a).closest("tr");
    const row=parent.text(" ").replace(/\s+/g," ").trim()||text;
    const parsed=parseSearchRow(row,text);
    out.push({
      jid:id,
      url:href.startsWith("http")?href:"https://judgment.judicial.gov.tw"+(href.startsWith("/")?href:"/"+href),
      ...parsed
    });
  });
  return dedupe(out);
}
function decodeId(href){
  const m=href.match(/[?&]id=([^&]+)/i);
  return m?decodeURIComponent(m[1]):"";
}
function parseSearchRow(row,anchor){
  const s=(row||anchor).replace(/\s+/g," ").trim();
  const date=(s.match(/(19|20)\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}/)||s.match(/(19|20)\d{2}\d{2}\d{2}/)||[])[0]||"";
  const caseNo=(s.match(/\d{2,3}\s*年度?\s*[^\s]{1,8}\s*字?第?\s*\d+\s*號?/i)||[])[0]||"";
  return {court:"",caseNumber:caseNo,title:anchor||s,date,issue:anchor||""};
}
function dedupe(a){
  const m=new Map(); for(const x of a){const k=x.jid||x.url;if(k&&!m.has(k))m.set(k,x)} return [...m.values()];
}

async function getJudicialToken(){
  if(!process.env.JUDICIAL_API_USER||!process.env.JUDICIAL_API_PASSWORD)return "";
  try{
    const r=await fetch(JUDICIAL_AUTH,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      user:process.env.JUDICIAL_API_USER,password:process.env.JUDICIAL_API_PASSWORD
    })});
    if(!r.ok)return "";
    const x=await r.json();
    return x.Token||x.token||"";
  }catch{return ""}
}
async function enrichWithJDoc(rows,token){
  const result=[];
  for(const x of rows.slice(0,100)){
    if(!x.jid){result.push(x);continue}
    try{
      const r=await fetch(JUDICIAL_DOC,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,j:x.jid})});
      const d=await r.json();
      const full=d.JFULLX||{};
      const content=full.JFULLCONTENT||"";
      result.push({...x,
        date:formatJudicialDate(d.JDATE)||x.date,
        caseNumber:buildCaseNumber(d)||x.caseNumber,
        issue:d.JTITLE||x.issue,
        title:d.JTITLE||x.title,
        content,
        parties:extractSection(content,["原告","上訴人","抗告人","被告","被上訴人","相對人"]),
        mainText:extractMain(content),
        reason:extractReason(content)
      });
    }catch{result.push(x)}
  }
  return result;
}
async function enrichPublicDetails(rows){
  const result=[];
  for(const x of rows.slice(0,100)){
    try{
      const r=await fetch(x.url,{headers:{"User-Agent":"Mozilla/5.0"}});
      const html=await r.text();
      const $=cheerio.load(html);
      const content=$("body").text().replace(/\r/g,"").replace(/\n[ \t]+/g,"\n").replace(/[ \t]+/g," ").trim();
      const court=(content.match(/臺灣.{0,15}(?:地方法院|高等法院|最高法院|高等行政法院|地方行政法院)/)||[])[0]||"";
      result.push({...x,
        court,
        content,
        mainText:extractMain(content),
        reason:extractReason(content),
        parties:extractParties(content)
      });
    }catch{result.push(x)}
  }
  return result;
}
function formatJudicialDate(s){
  if(!s)return ""; const x=String(s); if(/^\d{8}$/.test(x))return `${Number(x.slice(0,4))}/${x.slice(4,6)}/${x.slice(6,8)}`; return x;
}
function buildCaseNumber(d){
  if(!d)return ""; return `${d.JYEAR||""}年度${d.JCASE||""}字第${d.JNO||""}號`.replace(/^年度/,"").replace(/字第號$/,"");
}
function extractMain(t){
  const m=t.match(/主\s*文([\s\S]*?)(?:事實|事實及理由|理\s*由|中華民國)/i);
  return m?m[1].trim().slice(0,5000):"";
}
function extractReason(t){
  const m=t.match(/(?:事實及理由|理\s*由)([\s\S]*?)(?:中華民國\s*\d{2,4}\s*年|$)/i);
  return m?m[1].trim().slice(0,10000):"";
}
function extractParties(t){
  const m=t.match(/(?:原告|上訴人|抗告人)[\s\S]{0,500}?(?:被告|被上訴人|相對人)[\s\S]{0,500}/);
  return m?m[0].trim().slice(0,1500):"";
}
function extractSection(t,labels){
  return extractParties(t);
}
