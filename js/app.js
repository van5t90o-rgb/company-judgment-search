const $ = id => document.getElementById(id);

const FIELDS = [
  ["統一編號","Business_Accounting_NO"],
  ["登記現況","Company_Status_Desc"],
  ["公司名稱","Company_Name"],
  ["章程所訂外文公司名稱","Company_Name_En"],
  ["資本總額(元)","Capital_Stock_Amount"],
  ["實收資本額(元)","Paid_In_Capital_Amount"],
  ["代表人姓名","Responsible_Name"],
  ["公司所在地","Company_Location"],
  ["登記機關","Register_Organization_Desc"],
  ["核准設立日期","Company_Setup_Date"],
  ["最後核准變更日期","Change_Of_Approval_Data"],
  ["完成勞動權益講習","Labor_Rights_Training"]
];

function esc(v){
  return String(v ?? "—").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function companyPath(taxId){
  return `${APP_CONFIG.DATA_BASE}${taxId.slice(0,2)}/${taxId}.json`;
}

async function loadCompany(taxId){
  const r = await fetch(companyPath(taxId), {cache:"no-store"});
  if(r.status === 404) return null;
  if(!r.ok) throw new Error(`GitHub 資料讀取失敗 HTTP ${r.status}`);
  return await r.json();
}

function formatDate(v){
  if(!v) return "—";
  const s=String(v);
  if(/^\d{7}$/.test(s)){
    const y=Number(s.slice(0,3))+1911;
    return `${y}/${s.slice(3,5)}/${s.slice(5,7)}`;
  }
  return s;
}

function renderCompany(data){
  $("companySection").classList.remove("hidden");
  const c=data.company || data;
  const grid=$("companyGrid");
  grid.innerHTML="";
  for(const [label,key] of FIELDS){
    let v=c[key];
    if(key.includes("Date")) v=formatDate(v);
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<b>${esc(label)}</b><span>${esc(v ?? "—")}</span>`;
    grid.appendChild(div);
  }

  $("officialCompanyLink").href=APP_CONFIG.FIND_BIZ_BASE+encodeURIComponent(c.Business_Accounting_NO || "");

  const business=data.business || [];
  const b=$("businessItems");
  b.innerHTML="";
  if(!business.length){
    b.innerHTML="<div class='business-item'>目前沒有同步到所營事業資料。</div>";
  }else{
    for(const x of business){
      const div=document.createElement("div");
      div.className="business-item";
      div.innerHTML=`<b>${esc(x.Business_Item || "")}</b>${esc(x.Business_Item_Desc || "")}`;
      b.appendChild(div);
    }
  }

  // 裁判書查詢規則：
  // 1. 第一順位只查公司名稱。
  // 2. 公司名稱查不到後，才查代表人。
  // 注意：司法院官方查詢頁屬於不同網域，GitHub Pages 無法讀取其結果頁內容，
  // 因此瀏覽器不能安全地自動判斷「0 筆結果」；本頁會先開公司名稱查詢，
  // 並在本頁提供「查代表人」作為第二順位，不會一開始混合兩個關鍵字。
  const j=$("judicialLinks");
  j.innerHTML="";

  const name=(c.Company_Name || "").trim();
  const rep=(c.Responsible_Name || "").trim();
  const companyUrl=APP_CONFIG.JUDGMENT_BASE+encodeURIComponent(name);
  const repUrl=APP_CONFIG.JUDGMENT_BASE+encodeURIComponent(rep);

  const box=document.createElement("div");
  box.className="judicial-flow";
  box.innerHTML=`
    <div class="judicial-step active">
      <div class="step-no">1</div>
      <div class="step-body">
        <b>先查公司名稱</b>
        <small>${esc(name || "—")}</small>
        <a class="judicial-btn primary" target="_blank" rel="noopener" href="${companyUrl}">查詢公司名稱相關裁判書</a>
      </div>
    </div>
    <div class="judicial-arrow">↓ 公司名稱查無結果，再進行下一步</div>
    <div class="judicial-step fallback">
      <div class="step-no">2</div>
      <div class="step-body">
        <b>再查代表人</b>
        <small>${esc(rep || "—")}</small>
        <a class="judicial-btn secondary" target="_blank" rel="noopener" href="${repUrl}">查詢代表人相關裁判書</a>
      </div>
    </div>`;
  j.appendChild(box);
}

function repoInfo(){
  // GitHub Pages 標準網址：https://OWNER.github.io/REPOSITORY/
  const host=location.hostname;
  const path=location.pathname.split("/").filter(Boolean);
  if(host.endsWith(".github.io")){
    const owner=host.split(".")[0];
    const repo=path[0] || "";
    return {owner,repo};
  }
  return null;
}

function showSync(taxId){
  const box=$("syncBox");
  box.classList.remove("hidden");
  box.innerHTML=`目前 GitHub 資料庫沒有統一編號 <b>${esc(taxId)}</b> 的公司資料。請確認背景資料同步後再查詢。`;
}

async function search(){
  const taxId=$("taxId").value.trim();
  $("syncBox").classList.add("hidden");
  $("companySection").classList.add("hidden");
  $("status").className="status";

  if(!/^\d{8}$/.test(taxId)){
    $("status").textContent="請輸入正確的 8 碼統一編號。";
    $("status").classList.add("error"); return;
  }

  $("status").textContent="正在讀取 GitHub 公司資料……";
  $("status").classList.add("loading");

  try{
    const data=await loadCompany(taxId);
    if(!data){
      $("status").textContent="此統編尚未同步到 GitHub 資料庫。";
      $("status").className="status error";
      showSync(taxId);
      return;
    }
    renderCompany(data);
    $("status").textContent="查詢完成。資料由 GitHub Pages 本地 JSON 提供。";
    $("status").className="status success";
  }catch(e){
    console.error(e);
    $("status").textContent=e.message || "查詢失敗。";
    $("status").className="status error";
  }
}

$("searchBtn").addEventListener("click",search);
$("taxId").addEventListener("keydown",e=>{if(e.key==="Enter")search();});
