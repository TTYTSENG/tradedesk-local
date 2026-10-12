# TradeDesk LAN 2.0 — 辦公室區域網路多人版

MIT 開源。本版另存為 TradeDesk-LAN，與 TradeDesk v1.2 單機版使用不同資料夾、資料庫及連線埠；不覆蓋舊版。產品／BOM／包裝材積、市場比較、CRM、開發信 Checklist、往來摘要、樣品需求與 PPAP 18 項、Excel／CSV 匯入匯出及原始 Excel 報告均保留。

## 開始使用（Windows 主機）

1. 使用 Node.js **24 或更新版本**（支援內建 SQLite）；本機啟動工具也會尋找已安裝的 Codex Node runtime。不需要 npm install。正式環境請安裝 Node.js 24 LTS，或放入 `runtime/node.exe`。
2. 雙擊 `start.cmd`，Chrome 開啟 **http://127.0.0.1:8767**。首次由這台主機建立管理員：自行設定帳號、姓名及至少 12 字元密碼。本程式沒有預設帳密。
3. 到「帳號／管理」新增同事個人帳號，選擇管理員、可編輯或僅檢視。初始密碼由管理員個別提供，同事登入後可自行改密碼。
4. 主機與同事電腦連接同一個辦公室私有網路。以系統管理員身分執行 `enable-office-firewall.ps1`，只開放 **Private 設定檔／LocalSubnet／TCP 8767**。若公司政策由 IT 控管，請由 IT 設定；此工具不更改網路設定檔，不建立公網規則。
5. 啟動工具會顯示 `Office URL`，例如 `http://192.168.1.20:8767`。同事用 Chrome 開啟該網址並登入，無需安裝程式。主機要保持開機；建議由 IT 固定主機 IP 或設定 DHCP 保留。
6. 停止用 `stop.cmd`。舊版 `http://127.0.0.1:8765` 可繼續獨立使用。

命令列：`node server.js`。預設監聽 `0.0.0.0:8767`，僅接受 loopback 與 RFC1918 私有 IPv4 來源，不讀取 X-Forwarded-For。首次管理員設定與停止服務僅接受主機 loopback。主機名稱及目前 IPv4 自動加入 Host 白名單。

`config.example.json` 可另存為 `config.local.json`，指定連線埠、bind、額外 allowedHosts；TLS 憑證與私鑰檔案路徑可填 tlsCert／tlsKey。兩者都有填時啟用 HTTPS 與 Secure cookie。憑證必須受使用者的 Chrome 信任，且涵蓋使用網址；不略過憑證錯誤。HTTPS 的主機啟動／停止網址需使用憑證包含的 loopback 名稱，或以 CLI Ctrl+C 管理服務。只用 HTTP 時，LAN 傳輸不加密；請用於受信任辦公室網路，若需加密交由 IT 安裝受信任 TLS 憑證。此版本不供直接公網部署。

## 權限與多人編輯

| 角色 | 能力 |
|---|---|
| 僅檢視 | 讀取所有共用業務資料、匯出 CSV／Excel、下載原始報告與業務 JSON |
| 可編輯 | 上述能力，加上新增／編輯／刪除業務紀錄、Excel／CSV 匯入、原始報告上傳 |
| 管理員 | 上述能力，加上帳號管理、停用／重設密碼、操作紀錄、完整備份與業務 JSON 還原 |

所有帳號共用同一份公司資料，目前沒有按部門／個人隔離資料或分開 PPAP 審核權限。停用、重設密碼或更改成員權限會立即撤銷該成員所有 session。至少保留一位啟用管理員。密碼使用 salted scrypt 雜湊，不以明文保存；登入 session 最長 8 小時，HTTP-only／SameSite cookie，寫入需同源及 session CSRF token。失敗登入達 8 次會暫停相同 IP／帳號組合 15 分鐘。

資料存於主機 `data/tradedesk.sqlite`。SQLite 交易一次驗證整批資料與關聯並寫入；不同紀錄的並行修改可合併，同一筆資料修改／刪除衝突回傳 409。衝突時表單不會關閉，你可先複製修改內容，再取消表單，按「取得最新資料」後重編。每 15 秒檢查更新並提示，**不自動覆蓋正在編輯的畫面**。不支援即時共同編輯同一個欄位。多步驟批次操作若其中一筆衝突，整批不寫入。

SQLite 與附件只放在主機本機磁碟；不要放在網路分享磁碟／OneDrive 同步資料夾，也不要多台主機同時操作同一份資料庫。

## Excel、BOM 與 PPAP

`templates/` 提供 9 類資料的空白 CSV 與虛構示例。界面可下載 XLSX 範本與匯出 XLSX。先產品，再公司／BOM／市場，接著樣品與 PPAP 專案，最後 PPAP 項目。欄名、ID 保留文字與 HS 前導零；日期 YYYY-MM-DD；一次 5,000 筆，最大 10MB；Excel 公式須貼上為值。PPAP 專案新建／匯入會建立 18 項，依客戶要求逐項指定適用性與文件審核，不自動核准。原始報告支援任意 XLSX／CSV 版型，存主機 `data/reports/`，由已登入成員下載。

BOM 延伸成本為用量 × (1+耗損率/100) × 單價，各幣別分開；外箱 cm 長寬高 ÷ 1,000,000 得 CBM，乘箱數得總材積。PPAP 追蹤參考 [AIAG Core Tools](https://www.aiag.org/expertise-areas/quality/quality-core-tools)，技術審核與客戶核准由人員實際完成。

## 備份與還原

管理員到「帳號／管理」下載 **完整備份 `.backup.json`**，包含一致的 SQLite 快照（帳號、業務資料、操作紀錄、報告索引）及所有 Excel／CSV 附件，每檔附 SHA-256。建議每日下班前下載，另存至公司指定備份位置。檔案含業務資料與密碼雜湊，應限制存取。此版沒有自動排程或備份加密。

完整還原採另存新資料夾，避免覆蓋：

```powershell
node restore-backup.cjs "D:\Backup\TradeDesk-LAN.backup.json" "D:\Restore\TradeDesk-LAN-data"
```

工具拒絕已存在的目標，驗證路徑、雜湊及 SQLite 完整性；還原後撤銷舊登入 session。驗證後停止服務，保留原 `data` 的另存副本，再由管理員將還原資料夾放到新安裝的 `data`。不必修改舊安裝。

「Excel／CSV 與備份」的業務 JSON 僅含業務資料，不含帳號／操作紀錄／附件；只適合資料交換。管理員還原此 JSON 會取代業務資料，需最新版本，已有附件的紀錄不可被移除。

## 從 v1.2 搬移（保留原版）

先停止 v1.2，指定舊版 `data` 與 **不存在的** 新版目標資料夾：

```powershell
node migrate-v1.cjs "D:\全球展會\outputs\TradeDesk\data" "D:\全球展會\outputs\TradeDesk-LAN\data"
```

僅讀取舊資料，將產品、BOM、CRM、樣品、PPAP 等業務資料與原始報告／索引搬入 SQLite；來源不會變更。新版 data 已存在時，改指定另一個新資料夾，在全新安裝使用。搬移後首次啟動建立管理員與同事帳號。也可於空白新版用「業務 JSON 還原」匯入，但報告不會隨 JSON 搬移。

## 驗證與授權

`npm test` 或 `node tests/lan.cjs`：角色、CSRF、帳號撤銷、逐筆合併／衝突、報告存取、備份還原、SQLite 重啟、舊版另存搬移，以及原有 BOM／PPAP／Excel 測試。測試使用隔離暫存資料，不影響正式資料。尚須由使用者在實際辦公室網路做第二台電腦的連線驗收；防火牆、AP 隔離與公司網路政策可能影響連線。

自寫原始碼 MIT；PapaParse 與 ExcelJS 的 MIT 授權保留於 `public/vendor`。SQLite 使用 [Node.js 內建模組](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)，不需額外資料库套件。發布請排除 data、帳號、報告、config.local.json、憑證與私鑰。
