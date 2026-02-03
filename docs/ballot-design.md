# 我的選票設計

本專案目前使用的是「完整排序票」：每張票對所有候選人給出完整排名（無並列）。

## 兩種呈現方式

### 1) 矩陣票（Matrix ballot）

在互動工具中，使用「矩陣」把所有排列選項列出：

- 每一欄是一種完整排序（例如：A → B → C → D）
- 每一欄對應一個可輸入的票數
- 所有格子都會顯示該候選人在該排序中的名次（1~N）

**第一偏好高亮**：
- 所有名次為 1 的格子會被高亮，讓「第一志願分布」更直觀。

### 2) 單排設計（Single-row design）

在「直接選舉」或人工查找情境下，單排（把所有選項排成一列）更容易：

- 快速掃描
- 快速對照選項編號
- 適合紙本/人工查票

> 本專案的互動工具在 4 人、24 選項時，為避免螢幕橫向超出，會分兩排顯示（每排 12 選項）。

## 範例（視覺示意）

**範例 1：單排 24 選項（左右側 + 中間有候選人姓名）**

<div class="tableWrap">
  <table class="matrixTable exampleTable">
    <thead>
      <tr>
        <th class="matrixLeft matrixHeadLeft">勾選（只能勾 1 格）</th>
        <th class="matrixHeadOpt">①</th>
        <th class="matrixHeadOpt">②</th>
        <th class="matrixHeadOpt">③</th>
        <th class="matrixHeadOpt">④</th>
        <th class="matrixHeadOpt">⑤</th>
        <th class="matrixHeadOpt">⑥</th>
        <th class="matrixHeadOpt">⑦</th>
        <th class="matrixHeadOpt">⑧</th>
        <th class="matrixHeadOpt">⑨</th>
        <th class="matrixHeadOpt">⑩</th>
        <th class="matrixHeadOpt">⑪</th>
        <th class="matrixHeadOpt">⑫</th>
        <th class="matrixMid matrixHeadOpt matrixMidPlain">勾選（只能勾 1 格）</th>
        <th class="matrixHeadOpt">⑬</th>
        <th class="matrixHeadOpt">⑭</th>
        <th class="matrixHeadOpt">⑮</th>
        <th class="matrixHeadOpt">⑯</th>
        <th class="matrixHeadOpt">⑰</th>
        <th class="matrixHeadOpt">⑱</th>
        <th class="matrixHeadOpt">⑲</th>
        <th class="matrixHeadOpt">⑳</th>
        <th class="matrixHeadOpt">㉑</th>
        <th class="matrixHeadOpt">㉒</th>
        <th class="matrixHeadOpt">㉓</th>
        <th class="matrixHeadOpt">㉔</th>
        <th class="matrixRight matrixHeadRight">勾選（只能勾 1 格）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="matrixLeft"></td>
        <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
        <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
        <td class="matrixMid"></td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
        <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
        <td class="matrixRight"></td>
      </tr>
      <tr>
        <td class="matrixLeft">王小明</td>
        <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
        <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
        <td class="matrixMid matrixMidName">王小明</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
        <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
        <td class="matrixRight">王小明</td>
      </tr>
      <tr>
        <td class="matrixLeft">李小華</td>
        <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
        <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
        <td class="matrixMid matrixMidName">李小華</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
        <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
        <td class="matrixRight">李小華</td>
      </tr>
      <tr>
        <td class="matrixLeft">陳小傑</td>
        <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
        <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
        <td class="matrixMid matrixMidName">陳小傑</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
        <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
        <td class="matrixRight">陳小傑</td>
      </tr>
      <tr>
        <td class="matrixLeft">林小美</td>
        <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
        <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
        <td class="matrixMid matrixMidName">林小美</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
        <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
        <td class="matrixRight">林小美</td>
      </tr>
    </tbody>
  </table>
</div>

**範例 2：雙排 12 選項（左右側有候選人姓名）**

<div class="matrixTables">
  <div class="tableWrap">
    <table class="matrixTable exampleTable">
      <thead>
        <tr>
          <th class="matrixLeft matrixHeadLeft">勾選（只能勾 1 格）</th>
          <th class="matrixHeadOpt">①</th>
          <th class="matrixHeadOpt">②</th>
          <th class="matrixHeadOpt">③</th>
          <th class="matrixHeadOpt">④</th>
          <th class="matrixHeadOpt">⑤</th>
          <th class="matrixHeadOpt">⑥</th>
          <th class="matrixHeadOpt">⑦</th>
          <th class="matrixHeadOpt">⑧</th>
          <th class="matrixHeadOpt">⑨</th>
          <th class="matrixHeadOpt">⑩</th>
          <th class="matrixHeadOpt">⑪</th>
          <th class="matrixHeadOpt">⑫</th>
          <th class="matrixRight matrixHeadRight">勾選（只能勾 1 格）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="matrixLeft"></td>
          <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
          <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
          <td class="matrixRight"></td>
        </tr>
        <tr>
          <td class="matrixLeft">王小明</td>
          <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
          <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
          <td class="matrixRight">王小明</td>
        </tr>
        <tr>
          <td class="matrixLeft">李小華</td>
          <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
          <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
          <td class="matrixRight">李小華</td>
        </tr>
        <tr>
          <td class="matrixLeft">陳小傑</td>
          <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
          <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
          <td class="matrixRight">陳小傑</td>
        </tr>
        <tr>
          <td class="matrixLeft">林小美</td>
          <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
          <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
          <td class="matrixRight">林小美</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="tableWrap">
    <table class="matrixTable exampleTable">
      <thead>
        <tr>
          <th class="matrixLeft matrixHeadLeft">勾選（只能勾 1 格）</th>
          <th class="matrixHeadOpt">⑬</th>
          <th class="matrixHeadOpt">⑭</th>
          <th class="matrixHeadOpt">⑮</th>
          <th class="matrixHeadOpt">⑯</th>
          <th class="matrixHeadOpt">⑰</th>
          <th class="matrixHeadOpt">⑱</th>
          <th class="matrixHeadOpt">⑲</th>
          <th class="matrixHeadOpt">⑳</th>
          <th class="matrixHeadOpt">㉑</th>
          <th class="matrixHeadOpt">㉒</th>
          <th class="matrixHeadOpt">㉓</th>
          <th class="matrixHeadOpt">㉔</th>
          <th class="matrixRight matrixHeadRight">勾選（只能勾 1 格）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="matrixLeft"></td>
          <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
          <td>□</td><td>□</td><td>□</td><td>□</td><td>□</td><td>□</td>
          <td class="matrixRight"></td>
        </tr>
        <tr>
          <td class="matrixLeft">王小明</td>
          <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
          <td class="rank2">2</td><td class="rank2">2</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td>
          <td class="matrixRight">王小明</td>
        </tr>
        <tr>
          <td class="matrixLeft">李小華</td>
          <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
          <td class="rank3">3</td><td class="rank4">4</td><td class="rank2">2</td><td class="rank2">2</td><td class="rank4">4</td><td class="rank3">3</td>
          <td class="matrixRight">李小華</td>
        </tr>
        <tr>
          <td class="matrixLeft">陳小傑</td>
          <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
          <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
          <td class="matrixRight">陳小傑</td>
        </tr>
        <tr>
          <td class="matrixLeft">林小美</td>
          <td class="rank4">4</td><td class="rank3">3</td><td class="rank4">4</td><td class="rank3">3</td><td class="rank2">2</td><td class="rank2">2</td>
          <td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td><td class="rank1">1</td>
          <td class="matrixRight">林小美</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

## 為什麼用「完整排序」

- 能支援多種排序選制（IRV、Ranked Pairs、Borda、Benham、Minimax…）
- 可在同一份資料上切換選制，做可重現的比較

## 你可能會在意的限制

- 一次將所有選票列好，跟選民自行填寫序數比，降低了計票成本，但會增加選民的辨識選項成本。
  故用於單排的直接選舉選票，我高亮第一偏好，並在中間插入候選人姓名，降低選民辨識選項成本。
- 在真實大選規模下，會需要更好的介面與更清楚的教育（本專案的「選制說明」子站就是為此存在）
