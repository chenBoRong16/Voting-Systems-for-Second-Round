# Top4 專案網站們（多子站）

## 使用方式

1. 在專案根目錄（`~/research/top4/`）啟動本機 HTTP server（推薦）：

   - Python：`python3 -m http.server 8000`
   - 然後開啟：http://localhost:8000/web/

   註：因為本專案使用 ES Modules（`<script type="module">`），直接用 `file://` 打開在部分瀏覽器會被擋。
2. 入口頁會列出各子站：
   - `/web/purpose/`：網站目的
   - `/web/ballot-design/`：我的選票設計
   - `/web/methods/`：選制說明
   - `/web/round2/`：第二輪測試網站（互動工具）

## 說明

- `docs/` 放的是共用 Markdown 說明文件，各子站會連到這些文件。
- 第二輪測試網站目前支援：IRV、Ranked Pairs、Plurality、Borda、Benham、Minimax。

## 依賴

- 使用 CDN 載入 `d3` 與 `d3-sankey`，因此需要網路。

若要離線使用，我也可以把 d3/marked bundle 進來（不走 CDN）。
