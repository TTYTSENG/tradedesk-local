# 個人工作台 SoloWorkbench v0.2.1

提供個人工作者、自由工作者與小型工作室使用的開源本機工作台。適合由一位操作者整理研究、產品、客戶、供應商、內容與募資作業；這是第一期基本功能版，可依自己的工作方式修改。

程式碼採 MIT 授權。沒有付費 API、雲端帳號或 npm 套件安裝需求，執行時不需連線下載字型或程式庫。社群、郵件與網站功能用來準備及記錄人工對外工作，不會自動寄送或發布。

## 下載與開始使用

在 GitHub 的 SoloWorkbench 目錄取得原始碼，或下載獨立 ZIP，解壓縮後再啟動。不要直接開 public/index.html。Windows 主機需先有 Node.js 20 或更新版本（本版本以 Node.js 24 驗證）。

首次資料為空白，不包含作者的研究文件、待辦、客戶、帳號或附件。先新增一筆待辦與研究紀錄，再依需求加入產品及客戶。

一人、一台電腦、Chrome 操作。四個操作區塊與研究、文獻、實驗、論文、專利、商品、供應商、競賽募資共用資料，另含 PPAP 樣品驗證。資料保存於本機 data，不使用瀏覽器快取作正式保存。

## 啟動

需要 Node.js 20 或更新版本，無需 npm install。Windows 雙擊 start.cmd，Chrome 開啟 http://127.0.0.1:8768。停止用 stop.cmd；關閉瀏覽器不等於停止服務。本版只接受本機連線，不供區網或公網使用。原 TradeDesk 及區網版不受影響。

## 業務資料

左側「產品／CRM／樣品／PPAP」進入整合的 TradeDesk，保留產品、BOM 包裝材積、市場、公司、開發信 Checklist、往來摘要、樣品、PPAP 18 項、Excel／CSV 與原始報告。右下「回 SoloWorkbench 工作台」返回。新安裝預設空白，不自動搬移舊資料。

其他共用作業第一期使用基本紀錄：名稱、狀態、優先順序、期限、下一步、相關紀錄、來源、內容、公開範圍及原始附件。文獻詳細索引、實驗自動執行、完整投稿系統、競賽自動搜尋與正式報價計算仍屬後續階段。關閉程式時沒有自動提醒或對外操作。

## PPAP 樣品驗證

1. 先在業務頁建立產品、公司、樣品需求與 PPAP 開發專案，產品與客戶需一致。
2. 在「PPAP 樣品驗證」或「共用資料」選「樣品驗證批次」，填專案、樣品、產品、料號版本、批號、樣品型態、數量與抽樣／驗證計畫。新開另一頁建立業務資料後，按「更新業務關聯」。
3. 選「樣品驗證項目」，一項記錄一個樣品／特性的實際結果。填類別、規格、方法／條件、設備／校正、單位、上下限、實測與判定。
4. 通過／不通過須有報告編號、審核人與日期。若設定數值上下限，超出上下限不能標通過。不適用須理由／客戶依據與審核。
5. 不合格保留原項目，新增複驗項目並連結原項目；不要覆蓋第一次結果。改善措施填入 correction。
6. 最新項目皆通過或有不適用依據，且填批次審核與總報告，才可把批次設為已完成。完成不會自動核准 PPAP 或將 18 項改為完成。

原型樣品、試產樣品與生產樣品需明確區別；抽樣量與客戶要求由人員確認。本工具不是官方 PPAP 表格、實驗室認證或技術核准。流程目的參考 AIAG PPAP：https://www.aiag.org/training-and-resources/manuals/details/PPAP-4 。

## 附件與資料交換

儲存紀錄後重新開啟，可上傳 PDF、DOCX、PPTX、XLSX、CSV、TXT、PNG、JPG、JSON、ZIP；單檔 10MB，最多 2,000 份。原始附件只保存與下載，不自動解析。有附件的紀錄受到刪除／還原保護。

「匯入、範本與備份」提供 records 與 tasks 的 CSV／Excel 空白範本與匯出。records 為共用格式，kind 決定資料種類：research、literature、experiment、paper、patent、product、supplier、funding、social、cold、warm、website、validation、validation_item。未用欄位留空；status、priority、id、title 必填。checks 為 0 起算的檢查項次，以分號隔開。樣品驗證另依上述必填欄位填寫。

一次最多 5,000 筆／10MB。英文欄名不增減，ID／HS Code 設文字、日期 YYYY-MM-DD、公式貼上為值。先匯入父紀錄，後匯入關聯／驗證項目。依 ID 更新是整筆取代，空白會清除舊值，操作前先備份。CSV 匯出對可能的公式文字加單引號；無損搬移用完整備份。

業務頁與工作台的匯入格式不同，請各自下載對應範本。

## 完整備份與還原

按「下載含附件的完整備份」，包含工作台、業務資料及兩者的附件。備份 JSON 不加密。總編碼大小上限 128MB，超過時停止服務後複製整個 data 到備份位置。

另存還原命令：node restore-backup.cjs "D:\Backup\SoloWorkbench.backup.json" "D:\Restore\SoloWorkbench-data"

目標資料夾必須不存在。工具驗證路徑、雜湊、紀錄關聯及附件完整性。準備新安裝，保持停止，將還原資料夾命名 data 放入新安裝；核對後切換使用，保留原安裝。不要直接覆蓋現有 data。

資料主檔 data/workbench.json 與 data/state.json；附件 data/attachments 與 data/reports。不要在運作時以同步資料夾／網路分享磁碟直接共用。

## 驗證與授權

node tests/integration.cjs 執行隔離暫存測試。自寫程式碼及沿用元件授權見 LICENSE、THIRD-PARTY-NOTICES.md 與 public/trade/vendor 的授權檔。發布排除 data、私人資料與本機執行環境。
