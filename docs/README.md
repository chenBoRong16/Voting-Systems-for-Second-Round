# Top4 專案說明文件（Docs）

這個資料夾存放本專案網站所使用的 Markdown 內容（方便長期維護與版本追蹤）。

- [網站目的](site-purpose.md)
- [我的選票設計](ballot-design.md)
- [Top4 兩輪構想（方法論）](methodology-top4-two-round.md)
- [選制說明總覽](systems/overview.md)

## 更新日誌

更新日誌以天為單位，放在 `/updates/`。

網站上也有「更新內容」頁：`/web/updates/`，會直接顯示最近兩筆更新日誌。

## 如何開啟網站

1. 在專案根目錄啟動本機 HTTP server：

   - Python：`python3 -m http.server 8000`

2. 用瀏覽器開啟入口：

   - `http://localhost:8000/web/`（若你用不同 port，請把 `8000` 換成你啟動的 port）

> 註：本專案使用 ES Modules（`<script type="module">`），直接用 `file://` 開啟在部分瀏覽器會被擋。
