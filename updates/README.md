# 更新日誌（以天為單位）

- 每一天一份：`updates/YYYY-MM-DD.md`
- 檔名使用 ISO 日期（例如：`2026-02-04.md`），方便排序與查找

## 更新內容頁

網站的「更新內容」頁：`/web/updates/`，會直接顯示最近兩筆更新日誌。

## 新增一筆更新的流程

1. 新增或編輯：`updates/YYYY-MM-DD.md`
2. 重新產生清單：

   - `python3 scripts/gen_updates_manifest.py`

3. 檢查 `updates/manifest.json` 已更新（最新在最上面）

> 註：GitHub Pages 的部署流程也會自動產生 `updates/manifest.json`，避免漏更新。
