const $=id=>document.getElementById(id);
let allJudgments=[];
let activeFilter="all";

function esc(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function api(path){
  const base=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  return base+path;
}
function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}

$("taxId").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
$("searchBtn").addEventListener("click",search);
$("closeModal").addEventListener("click",()=>hide("modal"));
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))hide("modal")});

document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");activeFilter=b.dataset.filter;renderJudgments();
}));

async function search(){
  const tax=$("taxId").value.trim();
  $("message").textContent="";
  if(!/^\d{8}$/.test(tax)){ $("message").textContent="請輸入 8 位數統一編號。";return; }

  $("searchBtn").disabled=true;$("searchBtn").textContent="查詢中…";show("loading");
  ["companySection","businessSection","judgmentSection"].forEach(hide);

  try{
    const r=await fetch(api("/api/company?taxId="+encodeURIComponent(tax)));
    const d=await r.json();
    if(!r.ok||!d.success)throw new Error(d.message||"查詢失敗");
    renderCompany(d.company);renderBusiness(d.businessItems||[]);
    allJudgments=d.judgments||[];
    $("judgmentSearchInfo").textContent=d.judgmentSearch||"";
    renderJudgments();show("judgmentSection");
  }catch(e){$("message").textContent=e.message||"查詢失敗";}
  finally{$("searchBtn").disabled=false;$("searchBtn").textContent="查找";hide("loading")}
}

function renderCompany(c){
  show("companySection");$("statusBadge").textContent=c.status||"";
  const rows=[
    ["統一編號",c.taxId],["登記現況",c.status],["公司名稱",c.name],
    ["章程所訂外文公司名稱",c.foreignName],["資本總額(元)",c.capital],
    ["代表人姓名",c.representative],["公司所在地",c.address],
    ["登記機關",c.registrationAuthority],["核准設立日期",c.establishedDate],
    ["最後核准變更日期",c.lastChangeDate],["完成勞動權益講習",c.laborRightsTraining]
  ];
  $("companyGrid").innerHTML=rows.map(([k,v])=>`<div class="label">${esc(k)}</div><div class="value">${esc(v||"查無資料")}</div>`).join("");
}
function renderBusiness(items){
  show("businessSection");
  $("businessItems").innerHTML=items.length?items.map((x,i)=>`<div class="business">${i+1}. ${esc(x)}</div>`).join(""):`<p class="muted">查無公開所營事業資料。</p>`;
}
function typeOf(j){
  const s=(j.type||j.caseNumber||"").toString();
  if(/民|訴|上訴|簡字|重訴|小上|抗字/.test(s))return s.includes("刑")?"刑事":"民事";
  if(/刑|訴|易|交訴|簡上/.test(s))return "刑事";
  if(/行|訴願|簡易行政/.test(s))return "行政";
  return "其他";
}
function renderJudgments(){
  const list=activeFilter==="all"?allJudgments:allJudgments.filter(j=>typeOf(j)===activeFilter);
  $("judgmentCount").textContent=`共 ${list.length} 筆`;
  $("judgments").innerHTML=list.length?list.map((j,i)=>`
    <article class="judgment">
      <div class="j-title">${esc(j.title||j.issue||"裁判書")}</div>
      <div class="meta">${esc(j.court)}　｜　${esc(j.caseNumber)}　｜　${esc(j.date)}　｜　${esc(typeOf(j))}</div>
      <div class="people">${j.parties?`<b>當事人：</b>${esc(j.parties)}`:""}</div>
      ${j.mainText?`<div class="meta"><b>主文：</b>${esc(j.mainText.slice(0,180))}${j.mainText.length>180?"…":""}</div>`:""}
      <div class="actions">
        <button class="detail" onclick="openDetail(${allJudgments.indexOf(j)})">查看詳細裁判內容</button>
        ${j.url?`<a class="official" style="padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700" href="${esc(j.url)}" target="_blank" rel="noopener">官方裁判書</a>`:""}
      </div>
    </article>`).join(""):`<p class="muted">查無相關裁判書。</p>`;
}
window.openDetail=i=>{
  const j=allJudgments[i]||{};
  $("modalContent").innerHTML=`
    <h2>${esc(j.title||"裁判書")}</h2>
    <div class="detail-grid">
      <div class="k">法院</div><div>${esc(j.court)}</div>
      <div class="k">案號</div><div>${esc(j.caseNumber)}</div>
      <div class="k">裁判日期</div><div>${esc(j.date)}</div>
      <div class="k">案由</div><div>${esc(j.issue||j.title)}</div>
      <div class="k">當事人</div><div>${esc(j.parties)}</div>
      <div class="k">主文</div><div>${esc(j.mainText||"查無主文欄位")}</div>
      <div class="k">理由</div><div>${esc(j.reason||"查無理由欄位")}</div>
    </div>
    <h3>完整裁判內容</h3>
    <div class="fulltext">${esc(j.content||"目前沒有取得全文。")}</div>
    ${j.url?`<p><a href="${esc(j.url)}" target="_blank" rel="noopener">開啟司法院官方裁判書</a></p>`:""}`;
  show("modal");
}
