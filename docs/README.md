# Top4 專案說明文件（Docs）

這個資料夾放的是「該專案的網站們」共用的文字說明（Markdown），方便長期維護。

- [網站目的](site-purpose.md)
- [我的選票設計](ballot-design.md)
- [Top4 兩輪構想（方法論）](methodology-top4-two-round.md)
- [選制說明總覽](systems/overview.md)

> 本專案也提供互動工具：見 `/web/`。

## 如何開啟網站

1. 在專案根目錄啟動本機 HTTP server：

   - Python：`python3 -m http.server 8000`

2. 用瀏覽器開啟入口：

   - `http://localhost:8000/web/`

> 註：本專案使用 ES Modules（`<script type="module">`），直接用 `file://` 開啟在部分瀏覽器會被擋。
