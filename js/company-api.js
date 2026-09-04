function encodeOData(v){ return encodeURIComponent(v); }

async function fetchJson(url){
  const r = await fetch(url, {headers:{Accept:"application/json"}});
  const text = await r.text();
  if(!r.ok) throw new Error("官方資料 API 回應錯誤 HTTP " + r.status);
  try { return JSON.parse(text); }
  catch(e){ throw new Error("官方資料 API 沒有回傳 JSON，可能是官方 API 暫時無法連線。"); }
}

async function fetchCompany(taxId){
  const cfg = window.APP_CONFIG;
  const filter = encodeOData(`Business_Accounting_NO eq ${taxId}`);
  const url = `${cfg.GCIS_API_BASE}/${cfg.COMPANY_API_ID}?$format=json&$filter=${filter}`;
  const data = await fetchJson(url);
  const rows = Array.isArray(data) ? data : (data.value || []);
  if(!rows.length) return null;

  const company = rows[0];
  const bFilter = encodeOData(`Cmp_Business eq ${taxId}`);
  const bUrl = `${cfg.GCIS_API_BASE}/${cfg.BUSINESS_API_ID}?$format=json&$filter=${bFilter}`;
  let business = [];
  try {
    const bData = await fetchJson(bUrl);
    business = Array.isArray(bData) ? bData : (bData.value || []);
  } catch(e) {
    console.warn("所營事業資料取得失敗", e);
  }
  return {company,business};
}
