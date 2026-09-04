# 台灣公司／法院裁判書查詢網站

## 功能
1. 輸入 8 碼統一編號查詢公司資料。
2. 顯示公司名稱、代表人、資本額、地址、登記機關、設立日期、最後變更日期等。
3. 顯示所營事業資料。
4. 取得公司名稱與代表人後，查詢法院裁判書。
5. 顯示裁判書列表與詳細內容。
6. GitHub Pages 可部署前端；API 憑證留在後端環境變數。

## 重要
GitHub Pages 是純前端靜態網站，不能安全保存司法院 API 帳密。
本專案預設：
- 前端：GitHub Pages
- 後端：Vercel Functions
- 公司資料：經濟部商業發展署公開資料 API
- 裁判書：司法院裁判書開放 API（需依官方規定申請/設定）

## 1. GitHub 建立 Repository
建立一個新的 GitHub repository，例如：
`company-judgment-search`

把本專案內容上傳到 repository。

## 2. 部署前端 GitHub Pages
GitHub：
Settings → Pages → Build and deployment

選：
`GitHub Actions`

本專案已附 `.github/workflows/deploy.yml`。

部署完成後會得到：
`https://你的GitHub帳號.github.io/company-judgment-search/`

## 3. 部署 API
推薦使用 Vercel。

將整個 repository 匯入 Vercel。

Environment Variables：
- `JUDICIAL_API_BASE`
- `JUDICIAL_API_USERNAME`
- `JUDICIAL_API_PASSWORD`

請依司法院最新 API 文件填入實際值。

## 4. 設定前端 API 網址
在 `js/config.js`：

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://你的-vercel-api.vercel.app"
};
```

如果前端與 API 使用相同網域，也可以留空。

## 5. 本機測試

```bash
npm install
npm run dev
```

## API
`/api/company?taxId=統一編號`

例如：

`/api/company?taxId=12345678`

回傳公司資料與裁判書資料。

## 注意事項
- 公司資料與裁判書均應以官方公開資料為準。
- 「查無裁判書」不代表公司或個人沒有任何司法事件，只代表目前查詢條件/公開資料沒有取得結果。
- 出現在裁判書中不代表當事人有違法或有罪。
- 正式上線前請確認各官方 API 的最新服務規範、頻率限制與使用條款。
