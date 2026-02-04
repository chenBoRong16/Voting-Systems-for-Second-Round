# Top4 專案網站（多頁面）

## 使用方式

1. 在專案根目錄（`~/research/top4/`）啟動本機 HTTP server（推薦）：

   - Python：`python3 -m http.server 8000`
   - 然後開啟：`http://localhost:8000/web/`（若你用不同 port，請把 `8000` 換成你啟動的 port）

   註：因為本專案使用 ES Modules（`<script type="module">`），直接用 `file://` 打開在部分瀏覽器會被擋。
2. 入口頁會列出各頁面：
   - `/web/purpose/`：網站目的
   - `/web/methodology/`：Top4 方法論（延伸）
   - `/web/ballot-design/`：我的選票設計
   - `/web/methods/`：選制說明
   - `/web/round2/`：第二輪測試網站（互動工具）
   - `/web/updates/`：更新內容（最近兩筆更新日誌）

## 專案結構

- `docs/`：共用 Markdown 說明文件（各頁面會載入這些文件）
- `updates/`：更新日誌（以天為單位；`/web/updates/` 會顯示最近兩筆）
- 第二輪測試網站目前支援：IRV、Ranked Pairs、簡單多數（只看第一名）、Borda、Benham、Minimax。

## 依賴

- 使用 CDN 載入 `d3` 與 `d3-sankey`，因此需要網路。

若要離線使用，我也可以把 d3/marked bundle 進來（不走 CDN）。

## Markdown 體驗（長期維護友善）

- 多數內容以 `docs/` 下的 Markdown 管理，頁面會動態載入
- Markdown 檢視頁支援「目錄（TOC）」與段落錨點連結，方便長文閱讀與引用
