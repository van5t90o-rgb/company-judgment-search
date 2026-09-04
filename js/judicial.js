function judicialUrl(keyword){
  return window.APP_CONFIG.JUDICIAL_SEARCH_BASE + "?judtype=JUDBOOK&kw=" + encodeURIComponent(keyword);
}

function renderJudicialLinks(company){
  const name = company.Company_Name || "";
  const rep = company.Responsible_Name || "";
  const box = document.getElementById("judicialLinks");
  box.innerHTML = "";

  const items = [
    {title:"公司名稱相關案件", keyword:name},
    {title:"代表人姓名相關案件", keyword:rep}
  ];

  for(const item of items){
    const div = document.createElement("div");
    div.className = "judicial-box";
    const a = document.createElement("a");
    a.href = judicialUrl(item.keyword);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = item.title + "：" + item.keyword;
    div.appendChild(a);
    box.appendChild(div);
  }
}
