/**
 * 観念診断 — Google Apps Script（スプレッドシート集計用）
 *
 * 設定手順:
 * 1. Google スプレッドシートを新規作成
 * 2. 拡張機能 → Apps Script を開く
 * 3. このコードを貼り付けて保存
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行者: 自分
 *    - アクセス: 全員
 * 5. 生成されたURLを index.html の GAS_URL に設定
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("回答データ");

    if (!sheet) {
      sheet = ss.insertSheet("回答データ");
      sheet.appendRow([
        "タイムスタンプ",
        "回答詳細",
        "A:存在価値", "B:対人関係", "C:努力行動", "D:感情表現", "E:可能性変化",
        "主要パターン",
        "反応速度",
        "スキップ回数",
        "UA"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.answers || "",
      data.scoreA || 0,
      data.scoreB || 0,
      data.scoreC || 0,
      data.scoreD || 0,
      data.scoreE || 0,
      data.mainPattern || "",
      data.reactionTimes || "",
      data.skips || 0,
      data.ua || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput("観念診断 API is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}
