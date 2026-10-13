# MIT 來源與授權

本工具的介面、資料結構與本機服務為本次編寫，採 MIT 授權；不是 Atomic CRM 或 Krayin 的完整分支。

實際使用的第三方程式：

- PapaParse：<https://github.com/mholt/PapaParse>，MIT，作者 Matthew Holt。用於 CSV 解析與輸出。完整授權位於 `public/trade/vendor/PAPAPARSE-LICENSE.txt`。程式下載自官方 master 分支的 `papaparse.min.js`（2026-10-12），檔案已存本機，執行時不需 CDN。

搜尋並參考的 MIT 專案：

- Atomic CRM：<https://github.com/marmelab/atomic-crm>。參考聯絡人、商機、任務與往來紀錄的功能範圍，未複製其 React／Supabase 程式碼。
- Krayin CRM：<https://github.com/krayin/laravel-crm>。參考客戶與潛在商機的管理範圍，未複製其 PHP／Laravel 程式碼。

本工具使用 Node.js 執行環境的內建模組。交付檔不包含 Node.js 執行檔，啟動程式會尋找本機既有 Node.js。

- ExcelJS 4.4.0：<https://github.com/exceljs/exceljs>，MIT，Guyon Roche。來源為官方 npm 套件 exceljs@4.4.0 的 dist/exceljs.min.js，用於本機 XLSX 讀取與輸出；完整授權位於 public/trade/vendor/EXCELJS-LICENSE.txt。執行時不需 CDN。捆綁程式保留第三方授權註記，各第三方程式依原授權使用。
