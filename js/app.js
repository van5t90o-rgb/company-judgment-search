const $ = id => document.getElementById(id);

const fields = [
  ["統一編號","Business_Accounting_NO"],
  ["登記現況","Company_Status_Desc"],
  ["公司名稱","Company_Name"],
  ["章程所訂外文公司名稱","Company_Name_En"],
  ["資本總額(元)","Capital_Stock_Amount"],
  ["代表人姓名","Responsible_Name"],
  ["公司所在地","Company_Location"],
  ["登記機關","Register_Organization_Desc"],
  ["核准設立日期","Company_Setup_Date"],
  ["最後核准變更日期","Change_Of_Approval_Data"],
  ["完成勞動權益講習","Labor_Rights_Training"]
];

function valueOf(o,key){
  const v=o?.[key];
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function renderCompany(company){
  $("companySection").classList.remove("hidden");
  const grid=$("companyGrid");
  grid.innerHTML="";
  for(const [label,key] of fields){
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<b>${label}</b><span>${escapeHtml(valueOf(company,key))}</span>`;
    grid.appendChild(div);
  }
  renderBusiness(company.__business || []);
  renderJudicialLinks(company);
}

function renderBusiness(items){
  const box=$("businessItems");
  box.innerHTML="";
  if(!items.length){
    box.textContent="查無所營事業資料，或官方 API 暫時未提供。";
    return;
  }
  for(const x of items){
    const div=document.createElement("div");
    div.className="business-item";
    const item=x.Business_Item || x.Business_Item_Desc || "";
    const desc=x.Business_Item_Desc || "";
    div.innerHTML=`<b>${escapeHtml(item)}</b><div>${escapeHtml(desc)}</div>`;
    box.appendChild(div);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

async function doSearch(){
  const taxId=$("taxId").value.trim();
  const status=$("status");
  status.className="status";

  if(!/^\d{8}$/.test(taxId)){
    status.textContent="請輸入正確的 8 碼統一編號。";
    status.classList.add("error");
    return;
  }

  status.textContent="正在查詢經濟部官方資料……";
  status.classList.add("loading");
  $("companySection").classList.add("hidden");

  try{
    const result=await fetchCompany(taxId);
    if(!result){
      status.textContent="查無此統一編號。";
      status.classList.add("error");
      return;
    }
    result.company.__business=result.business;
    renderCompany(result.company);
    status.textContent="查詢完成。";
    status.className="status success";
  }catch(e){
    console.error(e);
    status.textContent=e.message || "查詢失敗。";
    status.classList.add("error");
  }
}

$("searchBtn").addEventListener("click",doSearch);
$("taxId").addEventListener("keydown",e=>{if(e.key==="Enter")doSearch();});
