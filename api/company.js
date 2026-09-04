// Vercel Serverless Function
// 這裡負責保護後端 API 設定，前端不放司法院帳密。

export default async function handler(req, res) {
  const taxId = String(req.query.taxId || "").trim();

  if (!/^\d{8}$/.test(taxId)) {
    return res.status(400).json({ success:false, message:"統一編號必須為 8 位數。" });
  }

  try {
    const company = await getCompany(taxId);

    if (!company) {
      return res.status(404).json({
        success:false,
        message:"查無此統一編號的公開公司資料。"
      });
    }

    const businessItems = await getBusinessItems(taxId);
    const judgments = await searchJudgments(
      company.name,
      company.representative
    );

    return res.status(200).json({
      success:true,
      company,
      businessItems,
      judgments
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success:false,
      message:"後端查詢發生錯誤，請稍後再試。"
    });
  }
}

async function getCompany(taxId) {
  // 經濟部 API 的實際 endpoint / 欄位可能依官方最新規格調整。
  // 將 endpoint 集中在此處，方便日後更新。
  const url =
    `https://data.gcis.nat.gov.tw/od/data/api/` +
    `5F64D864-61CB-4D0D-8AD9-492047CC1EA6?$format=json&` +
    `$filter=Business_Accounting_NO eq ${taxId}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error("公司資料 API 無法連線");

  const data = await r.json();
  const x = Array.isArray(data) ? data[0] : data;

  if (!x) return null;

  return {
    taxId: x.Business_Accounting_NO || taxId,
    status: x.Company_Status_Desc || "",
    name: x.Company_Name || "",
    foreignName: x.Company_Name_En || x.Company_Name_English || "",
    capital: x.Capital_Stock_Amount || "",
    representative: x.Responsible_Name || "",
    address: x.Company_Location || "",
    registrationAuthority: x.Register_Organization_Desc || "",
    establishedDate: x.Company_Setup_Date || "",
    lastChangeDate: x.Change_Of_Approval_Data || "",
    laborRightsTraining: x.Labor_Rights_Training || ""
  };
}

async function getBusinessItems(taxId) {
  // 官方營業項目資料集若採不同 endpoint，可只修改此函式。
  // 預設安全回傳空陣列，不影響公司基本資料查詢。
  try {
    const url =
      `https://data.gcis.nat.gov.tw/od/data/api/` +
      `5F64D864-61CB-4D0D-8AD9-492047CC1EA6?$format=json&` +
      `$filter=Business_Accounting_NO eq ${taxId}`;

    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    const x = Array.isArray(data) ? data[0] : data;
    if (!x) return [];

    const raw = x.Business_Scope || x.Business_Items || x.Business_Scope_Desc || "";
    if (Array.isArray(raw)) return raw;
    return raw ? String(raw).split(/[,；;]/).map(s=>s.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function searchJudgments(companyName, representative) {
  // 司法院 API 需要依最新官方規格取得 Token 與查詢。
  // 為避免偽造/猜測官方 endpoint，本函式在尚未設定 API 後端時回傳空結果。
  //
  // 請在這裡依司法院最新 API 文件接上：
  // 1. Auth
  // 2. 裁判書查詢
  // 3. Token
  //
  // 帳密只從 process.env 取得。

  if (!process.env.JUDICIAL_API_BASE ||
      !process.env.JUDICIAL_API_USERNAME ||
      !process.env.JUDICIAL_API_PASSWORD) {
    return [];
  }

  // TODO: 依司法院目前 API 文件實作。
  // 這裡不硬寫未驗證的 endpoint，避免正式環境送出錯誤請求。
  return [];
}
