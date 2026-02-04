# Top4 專案

這是一個用「說明 + 互動工具」來理解選制的專案。

- 第一輪：每張票只選 1 位（不排序），用簡單多數把候選人縮到 4 人（Top4）
- 第二輪：在這 4 人中，用排序選制決定勝者（IRV / Borda / Ranked Pairs / Benham / Minimax）

> 若總候選人數 ≤ 4：第一輪不會淘汰任何人，因此可直接跳過第一輪，從第二輪開始。

## 開啟網站

1. 在專案根目錄啟動本機 HTTP server：

   - `python3 -m http.server 8000`
   - 或使用快捷腳本：`./scripts/serve.sh 8000`

2. 用瀏覽器開啟入口：

   - `http://localhost:8000/web/`（若你用不同 port，請把 `8000` 換成你啟動的 port）

> 因為本專案使用 ES Modules（`<script type="module">`），直接用 `file://` 可能會被瀏覽器限制。

## 專案結構



## 開發

### 內部連結檢查（建議）

用來抓常見的相對路徑錯誤、`?doc=/docs/...` 指到不存在檔案等問題（預設會略過 `requirement/`）：

- `python3 scripts/check_internal_links.py`
## 更新日誌清單

`/web/updates/` 會讀取 `updates/manifest.json`。

本機更新流程：

- `python3 scripts/gen_updates_manifest.py`

GitHub Pages 部署流程也會自動產生該清單（避免漏更新）。
