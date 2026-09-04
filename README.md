# 企業資料 × 法院裁判書查詢平台 V2

## 你要的完整流程

統一編號
→ 公司基本資料
→ 所營事業資料
→ 自動以「公司名稱」與「代表人姓名」搜尋司法院裁判書
→ 合併去重
→ 顯示法院、案號、日期、案由、當事人、主文、理由、完整裁判內容
→ 可開啟官方裁判書來源

## 架構

- GitHub Pages：前端 HTML/CSS/JavaScript
- Vercel Functions：後端 API
- 經濟部商業發展署：公司登記 API
- 司法院裁判書系統：裁判書公開查詢
- 司法院裁判書 Open API：如果設定會員帳號密碼，詳細全文優先使用官方 JDoc API

## GitHub Pages

Repository → Settings → Pages → Source = GitHub Actions。

本專案已包含：
`.github/workflows/pages.yml`

## Vercel

1. 在 Vercel Import Git Repository。
2. Framework Preset 選 Other。
3. 不需要 Build Command。
4. Deploy。
5. 如果 Vercel 網址不是與 GitHub Pages 同網域，修改 `js/config.js`：

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://你的-project.vercel.app"
};
```

## Vercel Environment Variables（司法院 Open API）

可設定：

- `JUDICIAL_API_USER`
- `JUDICIAL_API_PASSWORD`

這兩個值不要放 GitHub。

司法院 114.08.22 API 規格：
- Auth: POST https://data.judicial.gov.tw/jdg/api/Auth
- JDoc: POST https://data.judicial.gov.tw/jdg/api/JDoc

若未設定會員帳密，網站仍會使用司法院公開裁判書查詢頁搜尋案件；詳細內容從官方公開裁判書頁面取得。

## 本機

```bash
npm install
npm run dev
```

## API

GET `/api/company?taxId=20828393`

回傳：
- company
- businessItems
- judgments
- judgmentSearch

## 注意

1. 公司資料以經濟部商業發展署公開資料為準。
2. 裁判書結果以司法院公開系統為準。
3. 裁判書中出現某公司或某人，不代表該公司/人違法或有罪。
4. 公開裁判書可能因司法院資料更新、移除、遮蔽或系統限制而變動。
5. 不要將司法院帳號密碼提交到 GitHub。
