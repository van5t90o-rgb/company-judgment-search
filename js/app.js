const $ = id => document.getElementById(id);
const FIELDS = [
  ["統一編號","Business_Accounting_NO"],["登記現況","Company_Status_Desc"],["公司名稱","Company_Name"],
  ["章程所訂外文公司名稱","Company_Name_En"],["資本總額(元)","Capital_Stock_Amount"],["實收資本額(元)","Paid_In_Capital_Amount"],
  ["代表人姓名","Responsible_Name"],["公司所在地","Company_Location"],["登記機關","Register_Organization_Desc"],
  ["核准設立日期","Company_Setup_Date"],["最後核准變更日期","Change_Of_Approval_Data"],["完成勞動權益講習","Labor_Rights_Training"]
];
function esc(v){return String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatDate(v){const s=String(v??"").trim();if(!s)return"—";if(/^\d{7}$/.test(s))return `${Number(s.slice(0,3))+1911}/${s.slice(3,5)}/${s.slice(5,7)}`;return s;}
function buildApiUrl(base,taxId){const p=new URLSearchParams();p.set("$format","json");p.set("$filter",`Business_Accounting_NO eq ${taxId}`);p.set("$skip","0");p.set("$top","1000");return `${base}?${p}`;}
async function fetchJson(url){const r=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
async function loadCompany(taxId){
  const rows=await fetchJson(buildApiUrl(APP_CONFIG.GCIS_API,taxId));
  const company=Array.isArray(rows)?rows[0]:null;
  if(!company)return null;
  let business=[];
  try{const br=await fetchJson(buildApiUrl(APP_CONFIG.GCIS_BUSINESS_API,taxId));if(Array.isArray(br))business=br.map(x=>({Business_Item:x.Business_Item,Business_Item_Desc:x.Business_Item_Desc}));}catch(e){console.warn(e);}
  return {company,business};
}
function renderCompany(data){
  $("companySection").classList.remove("hidden");const c=data.company||data;const grid=$("companyGrid");grid.innerHTML="";
  for(const [label,key] of FIELDS){let v=c[key];if(key.includes("Date"))v=formatDate(v);const d=document.createElement("div");d.className="item";d.innerHTML=`<b>${esc(label)}</b><span>${esc(v??"—")}</span>`;grid.appendChild(d);}
  $("officialCompanyLink").href=APP_CONFIG.FIND_BIZ_BASE+encodeURIComponent(c.Business_Accounting_NO||"");
  const b=$("businessItems");b.innerHTML="";const items=data.business||[];
  if(!items.length)b.innerHTML="<div class='business-item'>目前查無所營事業資料。</div>";
  else items.forEach(x=>{const d=document.createElement("div");d.className="business-item";d.innerHTML=`<b>${esc(x.Business_Item||"")}</b>${esc(x.Business_Item_Desc||"")}`;b.appendChild(d);});
  const j=$("judicialLinks");j.innerHTML="";const name=(c.Company_Name||"").trim(),rep=(c.Responsible_Name||"").trim();
  const cu=APP_CONFIG.JUDGMENT_BASE+encodeURIComponent(name),ru=APP_CONFIG.JUDGMENT_BASE+encodeURIComponent(rep);
  const box=document.createElement("div");box.className="judicial-flow";box.innerHTML=`
  <div class="judicial-step active"><div class="step-no">1</div><div class="step-body"><b>先查公司名稱</b><small>${esc(name||"—")}</small><a class="judicial-btn primary" target="_blank" rel="noopener" href="${cu}">查詢公司名稱相關裁判書</a></div></div>
  <div class="judicial-arrow">↓ 公司名稱查無結果，再查代表人</div>
  <div class="judicial-step fallback"><div class="step-no">2</div><div class="step-body"><b>再查代表人</b><small>${esc(rep||"—")}</small><a class="judicial-btn secondary" target="_blank" rel="noopener" href="${ru}">查詢代表人相關裁判書</a></div></div>`;j.appendChild(box);
}
async function search(){
  const taxId=$("taxId").value.trim();$("companySection").classList.add("hidden");$("status").className="status";
  if(!/^\d{8}$/.test(taxId)){ $("status").textContent="請輸入正確的 8 碼統一編號。";$("status").classList.add("error");return; }
  $("status").textContent=`正在查詢統編 ${taxId} ……`;$("status").classList.add("loading");
  try{const data=await loadCompany(taxId);if(!data){$("status").textContent=`查無統一編號 ${taxId} 的公司登記資料。`;$("status").className="status error";return;}renderCompany(data);$("status").textContent=`查詢完成：${taxId}`;$("status").className="status success";}
  catch(e){console.error(e);$("status").innerHTML="<b>官方資料 API 無法由 GitHub Pages 瀏覽器直接讀取。</b><br>這不是統編不存在；純 GitHub Pages 需要改成「官方 CSV → GitHub Actions 背景同步 → 靜態分片資料」才能讓任何統編直接查詢。";$("status").className="status error";}
}
$("searchBtn").addEventListener("click",search);$("taxId").addEventListener("keydown",e=>{if(e.key==="Enter")search();});
