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

function renderJudicial(data){
  const c = data.company || data;
  const name = (c.Company_Name || "").trim();
  const rep = (c.Responsible_Name || "").trim();
  const area = $("judicialLinks");
  area.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "judicial-panel";
  panel.innerHTML = `
    <div class="judicial-toolbar">
      <div>
        <div class="judicial-query-title" id="judicialQueryTitle">公司名稱相關案件</div>
        <div class="judicial-query-keyword" id="judicialQueryKeyword">${esc(name || "—")}</div>
      </div>
      <div class="judicial-actions">
        <button type="button" class="judicial-tab active" id="searchCompanyJudgment">查公司名稱</button>
        <button type="button" class="judicial-tab" id="searchRepJudgment">查代表人</button>
      </div>
    </div>

    <div class="judicial-status" id="judicialStatus">
      正在載入司法院裁判書查詢結果……
    </div>

    <div class="judicial-frame-wrap">
      <iframe
        id="judicialFrame"
        title="司法院裁判書查詢結果"
        loading="eager"
        referrerpolicy="no-referrer"
        src="about:blank"></iframe>
    </div>

    <div class="judicial-fallback">
      <span>如果司法院網站禁止嵌入顯示：</span>
      <a id="judicialOpenExternal" target="_blank" rel="noopener">在新視窗開啟司法院結果</a>
    </div>
  `;
  area.appendChild(panel);

  const frame = $("judicialFrame");
  const title = $("judicialQueryTitle");
  const keyword = $("judicialQueryKeyword");
  const status = $("judicialStatus");
  const external = $("judicialOpenExternal");
  const companyBtn = $("searchCompanyJudgment");
  const repBtn = $("searchRepJudgment");

  // 使用司法院公開查詢頁；結果直接嵌入目前網站，不再只顯示「開啟查詢」。
  function makeUrl(q){
    return APP_CONFIG.JUDGMENT_MOBILE_BASE + encodeURIComponent(q || "");
  }

  function loadJudgment(type){
    const isCompany = type === "company";
    const q = isCompany ? name : rep;
    const label = isCompany ? "公司名稱" : "代表人";

    title.textContent = `${label}相關案件`;
    keyword.textContent = q || "—";
    status.textContent = q
      ? `正在載入司法院：${label}「${q}」……`
      : `沒有可用的${label}查詢關鍵字。`;

    companyBtn.classList.toggle("active", isCompany);
    repBtn.classList.toggle("active", !isCompany);

    const url = makeUrl(q);
    external.href = url;
    frame.src = url;
  }

  frame.addEventListener("load", () => {
    status.textContent = "司法院裁判書查詢結果已載入。若畫面被司法院瀏覽器安全政策阻擋，請使用下方「在新視窗開啟司法院結果」。";
  });

  companyBtn.addEventListener("click", () => loadJudgment("company"));
  repBtn.addEventListener("click", () => loadJudgment("representative"));

  // 第一順位永遠先查公司名稱；只有使用者確認公司名稱無結果時，再切換代表人。
  loadJudgment("company");
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

  renderJudicial(data);
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
