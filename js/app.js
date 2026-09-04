const $ = id => document.getElementById(id);

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function apiUrl(path) {
  const base = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

$("taxId").addEventListener("keydown", e => {
  if (e.key === "Enter") searchCompany();
});
$("searchBtn").addEventListener("click", searchCompany);
$("closeModal").addEventListener("click", () => $("modal").classList.add("hidden"));
$("modal").addEventListener("click", e => {
  if (e.target === $("modal")) $("modal").classList.add("hidden");
});

async function searchCompany() {
  const taxId = $("taxId").value.trim();
  $("message").textContent = "";
  if (!/^\d{8}$/.test(taxId)) {
    $("message").textContent = "請輸入正確的 8 位數統一編號。";
    return;
  }

  $("searchBtn").disabled = true;
  $("searchBtn").textContent = "查詢中…";
  ["companySection","businessSection","judgmentSection"].forEach(id => $(id).classList.add("hidden"));

  try {
    const res = await fetch(apiUrl(`/api/company?taxId=${encodeURIComponent(taxId)}`));
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "查詢失敗");

    renderCompany(data.company);
    renderBusiness(data.businessItems || []);
    renderJudgments(data.judgments || [], data.company);
  } catch (err) {
    $("message").textContent = err.message || "系統發生錯誤";
  } finally {
    $("searchBtn").disabled = false;
    $("searchBtn").textContent = "查找";
  }
}

function renderCompany(c) {
  $("companySection").classList.remove("hidden");
  $("statusBadge").textContent = c.status || "";
  const rows = [
    ["統一編號", c.taxId],
    ["登記現況", c.status],
    ["公司名稱", c.name],
    ["章程所訂外文公司名稱", c.foreignName],
    ["資本總額(元)", c.capital],
    ["代表人姓名", c.representative],
    ["公司所在地", c.address],
    ["登記機關", c.registrationAuthority],
    ["核准設立日期", c.establishedDate],
    ["最後核准變更日期", c.lastChangeDate],
    ["完成勞動權益講習", c.laborRightsTraining || "查無資料"]
  ];
  $("companyGrid").innerHTML = rows.map(r =>
    `<div class="label">${esc(r[0])}</div><div class="value">${esc(r[1] || "—")}</div>`
  ).join("");
}

function renderBusiness(items) {
  $("businessSection").classList.remove("hidden");
  $("businessItems").innerHTML = items.length
    ? items.map((x,i)=>`<div class="business-item">${i+1}. ${esc(x)}</div>`).join("")
    : `<p class="hint">查無公開所營事業資料。</p>`;
}

function renderJudgments(items, c) {
  $("judgmentSection").classList.remove("hidden");
  $("judgmentCount").textContent = `共 ${items.length} 筆`;
  $("judgmentSearchInfo").textContent =
    `搜尋條件：${c.name || "公司名稱"} ／ ${c.representative || "代表人姓名"}`;

  $("judgments").innerHTML = items.length ? items.map((j,i) => `
    <article class="judgment">
      <div class="judgment-title">${esc(j.title || j.caseNumber || "裁判書")}</div>
      <div class="meta">
        ${esc(j.court || "")}
        ${j.caseNumber ? "｜" + esc(j.caseNumber) : ""}
        ${j.date ? "｜" + esc(j.date) : ""}
        ${j.type ? "｜" + esc(j.type) : ""}
      </div>
      ${j.issue ? `<div>案由：${esc(j.issue)}</div>` : ""}
      <button class="view-btn" onclick="showJudgment(${i})">查看詳細裁判內容</button>
    </article>
  `).join("") : `<p class="hint">目前沒有取得相關裁判書結果。</p>`;

  window.currentJudgments = items;
}

function showJudgment(i) {
  const j = window.currentJudgments[i] || {};
  $("modalTitle").textContent = j.title || j.caseNumber || "裁判書";
  $("modalContent").innerHTML = `
    <p><b>法院：</b>${esc(j.court)}</p>
    <p><b>案號：</b>${esc(j.caseNumber)}</p>
    <p><b>裁判日期：</b>${esc(j.date)}</p>
    <p><b>案由：</b>${esc(j.issue)}</p>
    ${j.parties ? `<p><b>當事人：</b>${esc(j.parties)}</p>` : ""}
    <div class="modal-body">${esc(j.content || "目前沒有取得全文。")}</div>
    ${j.url ? `<p><a href="${esc(j.url)}" target="_blank" rel="noopener">前往原始裁判資料</a></p>` : ""}
  `;
  $("modal").classList.remove("hidden");
}
