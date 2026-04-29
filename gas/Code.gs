/**
 * 観念診断 — GAS（スプレッドシート集計 + HTMLレポート配信）
 * DocumentApp/DriveApp不使用 → SpreadsheetApp + HtmlServiceのみ
 */

var CATEGORIES = {
  A:{name:'存在価値系',typeName:'「条件付きの自分」',color:'#E74C3C',
    desc:'「何かができる自分」「何かを持っている自分」でないと価値がない、と無意識に信じている傾向があります。ありのままの自分に存在価値を感じにくく、常に「自分は足りているか？」という問いが心の中で回っています。',
    kannen:['人に役に立たないといけない','価値を生み出さないといけない','そのままではいけない','成果を出さないと認めてもらえない','特別な能力がないといけない','そのままでは愛されない','そのままでは受け入れられない']},
  B:{name:'対人関係系',typeName:'「透明な自分」',color:'#3498DB',
    desc:'他者との関係の中で、自分を消すことで安全を守ろうとする傾向があります。「嫌われたくない」「迷惑をかけたくない」が行動の基準になり、自分の意志よりも周囲の空気を優先してしまいます。',
    kannen:['迷惑をかけちゃいけない','人に嫌われてはいけない','空気を読まないといけない','相手の期待に応えないといけない','自分の意見を主張してはいけない','気遣いがないといけない','自分勝手に行動してはいけない']},
  C:{name:'努力・行動系',typeName:'「止まれない自分」',color:'#F39C12',
    desc:'「頑張り続けること」で自分の居場所を確保しようとする傾向があります。休むこと、楽をすることに強い罪悪感を感じ、常に「もっとやらなきゃ」というエンジンが回り続けています。',
    kannen:['頑張らないといけない','完璧にやらないといけない','責任を果たさないといけない','休んではいけない','楽をしてはいけない']},
  D:{name:'感情・自己表現系',typeName:'「仮面の自分」',color:'#9B59B6',
    desc:'本当の感情を表に出すことに強い抵抗を持っています。弱さ、怒り、悲しみ、喜びさえも「見せてはいけないもの」として抑え込み、常に「大丈夫な自分」を演じ続ける傾向があります。',
    kannen:['弱さを見せてはいけない','本音を言ってはいけない','助けを求めてはいけない','泣いてはいけない','怒ってはいけない','本音を出してはいけない']},
  E:{name:'可能性・変化系',typeName:'「檻の中の自分」',color:'#1ABC9C',
    desc:'自分の可能性に天井を設けてしまう傾向があります。「どうせ自分には無理」「変わりたくても変われない」という思い込みが、新しい挑戦や変化へのブレーキになっています。',
    kannen:['自分にはできない','自分には才能がない','失敗してはいけない','自分が変わるのは難しい','幸せになってはいけない']}
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('回答データ');

    if (!sheet) {
      sheet = ss.insertSheet('回答データ');
      sheet.appendRow(['タイムスタンプ','LINE名','氏名','メールアドレス','レポートURL','モード']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var reportUrl = data.reportUrl || '';

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.lineName || '',
      data.fullName || '',
      data.email || '',
      reportUrl,
      data.quizMode || 'quick'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var id = e && e.parameter && e.parameter.id;
  if (!id) {
    return ContentService.createTextOutput('観念診断 API is running.').setMimeType(ContentService.MimeType.TEXT);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('回答データ');
  if (!sheet) {
    return HtmlService.createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>レポートが見つかりません</h2></body></html>')
      .setTitle('観念診断レポート');
  }

  var data = sheet.getDataRange().getValues();
  var row = null;
  for (var i = 1; i < data.length; i++) {
    if (data[i][14] === id) {
      row = data[i];
      break;
    }
  }

  if (!row) {
    return HtmlService.createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>レポートが見つかりません</h2><p>リンクが無効か、レポートが削除された可能性があります。</p></body></html>')
      .setTitle('観念診断レポート');
  }

  var name = row[2] || '回答者';
  var scores = {A:Number(row[4])||0, B:Number(row[5])||0, C:Number(row[6])||0, D:Number(row[7])||0, E:Number(row[8])||0};
  var answerDetails = [];
  try { answerDetails = JSON.parse(row[3]); } catch(ex) {}
  var dateStr = '';
  try { dateStr = Utilities.formatDate(new Date(row[0]), 'Asia/Tokyo', 'yyyy年M月d日'); } catch(ex) { dateStr = String(row[0]).split('T')[0]; }

  var html = generateReportHTML(name, scores, answerDetails, dateStr);
  return HtmlService.createHtmlOutput(html)
    .setTitle('観念診断レポート — ' + name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function generateReportHTML(name, scores, answerDetails, dateStr) {
  var total = scores.A + scores.B + scores.C + scores.D + scores.E;
  var sorted = Object.keys(scores).map(function(k) { return {id:k, score:scores[k]}; })
    .sort(function(a,b) { return b.score - a.score; });
  var topCat = CATEGORIES[sorted[0].id];

  var catCardsHTML = '';
  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i];
    var cat = CATEGORIES[item.id];
    var pct = total > 0 ? Math.round((item.score / total) * 100) : 0;
    var barW = Math.max(pct, 8);
    catCardsHTML += '<div style="background:#fff;border-radius:16px;padding:1.2rem 1.3rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem;border-left:4px solid ' + cat.color + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">' +
      '<span style="font-weight:700;color:' + cat.color + ';font-size:.95rem">' + (i===0?'★ ':'') + cat.name + ' ' + cat.typeName + '</span>' +
      '<span style="font-size:.78rem;background:#f0f0f5;padding:.15rem .6rem;border-radius:10px;font-weight:600">' + item.score + ' / ' + total + '</span>' +
      '</div>' +
      '<div style="height:8px;background:#e8e6f0;border-radius:4px;overflow:hidden;margin-bottom:.8rem">' +
      '<div style="height:100%;width:' + barW + '%;background:' + cat.color + ';border-radius:4px"></div></div>' +
      '<p style="font-size:.88rem;color:#555;line-height:1.7;margin-bottom:.6rem">' + cat.desc + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.35rem">' +
      cat.kannen.map(function(k) { return '<span style="font-size:.75rem;background:#f3f1ff;color:#3d2f8c;padding:.2rem .6rem;border-radius:8px">・' + k + '</span>'; }).join('') +
      '</div></div>';
  }

  var depthHTML = '';
  if (answerDetails && answerDetails.length > 0) {
    var sortedByTime = answerDetails.slice().sort(function(a,b) { return a.time - b.time; });
    var fastest = sortedByTime[0];
    var slowest = sortedByTime[sortedByTime.length - 1];
    var fCat = CATEGORIES[fastest.cat];
    var sCat = CATEGORIES[slowest.cat];
    var maxTime = slowest.time;

    depthHTML = '<div style="margin:2rem 0 1rem;font-size:1.05rem;font-weight:700;color:#2c2c3e">深層マップ — 無意識の反応速度</div>' +
      '<div style="background:#fff;border-radius:16px;padding:1.2rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem;border-left:4px solid #E74C3C">' +
      '<div style="font-size:.78rem;font-weight:700;color:#E74C3C;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">最も速く反応した場面</div>' +
      '<div style="font-size:.88rem;font-weight:600;margin-bottom:.2rem;line-height:1.6">' + (fastest.scene || 'Q' + fastest.q) + '</div>' +
      '<div style="font-size:.82rem;color:#888">' + fCat.name + ' ' + fCat.typeName + '</div>' +
      '<div style="font-size:1.6rem;font-weight:800;color:' + fCat.color + ';margin-top:.3rem">' + fastest.time.toFixed(1) + '秒</div>' +
      '<div style="font-size:.78rem;color:#999;font-style:italic;margin-top:.3rem">→ この観念が最も深く内面化されている可能性があります</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:16px;padding:1.2rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem;border-left:4px solid #3498DB">' +
      '<div style="font-size:.78rem;font-weight:700;color:#3498DB;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">最も迷った場面</div>' +
      '<div style="font-size:.88rem;font-weight:600;margin-bottom:.2rem;line-height:1.6">' + (slowest.scene || 'Q' + slowest.q) + '</div>' +
      '<div style="font-size:.82rem;color:#888">' + sCat.name + ' ' + sCat.typeName + '</div>' +
      '<div style="font-size:1.6rem;font-weight:800;color:' + sCat.color + ';margin-top:.3rem">' + slowest.time.toFixed(1) + '秒</div>' +
      '<div style="font-size:.78rem;color:#999;font-style:italic;margin-top:.3rem">→ この観念を意識化し始めている段階かもしれません</div>' +
      '</div>';

    depthHTML += '<div style="background:#fff;border-radius:16px;padding:1.2rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem">' +
      '<div style="font-size:.85rem;font-weight:600;color:#6b6b80;margin-bottom:.8rem">全問の反応速度</div>';
    for (var j = 0; j < answerDetails.length; j++) {
      var a = answerDetails[j];
      var ac = CATEGORIES[a.cat];
      var rtPct = Math.max((a.time / maxTime) * 100, 5);
      depthHTML += '<div style="margin-bottom:.5rem">' +
        '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:#888;margin-bottom:.15rem"><span>Q' + a.q + ' ' + ac.name + '</span><span>' + a.time.toFixed(1) + '秒</span></div>' +
        '<div style="height:6px;background:#e8e6f0;border-radius:3px;overflow:hidden"><div style="height:100%;width:' + rtPct + '%;background:' + ac.color + ';border-radius:3px"></div></div>' +
        '</div>';
    }
    depthHTML += '</div>';
  }

  return '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;background:#f8f7ff;color:#2c2c3e;line-height:1.7}' +
    '.hero{background:linear-gradient(135deg,#3d2f8c 0%,#5b4fbe 50%,#8b7bd4 100%);color:#fff;padding:2.5rem 1.5rem 3rem;text-align:center}' +
    '.hero .tag{display:inline-block;background:rgba(255,255,255,.2);padding:.3rem 1rem;border-radius:20px;font-size:.8rem;margin-bottom:1rem}' +
    '.hero h1{font-size:clamp(1.4rem,4.5vw,2rem);font-weight:800;margin-bottom:.3rem}' +
    '.hero .type{font-size:clamp(1rem,3vw,1.3rem);opacity:.9}' +
    '.hero .meta{font-size:.82rem;opacity:.7;margin-top:.8rem}' +
    '.body{padding:1.5rem;max-width:640px;margin:0 auto}' +
    '.section-title{font-size:1.05rem;font-weight:700;margin:2rem 0 1rem;color:#2c2c3e}' +
    '.msg{background:#fff;border-radius:16px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin:1.5rem 0;font-size:.88rem;color:#555;line-height:1.8}' +
    '.footer{text-align:center;padding:1.5rem;font-size:.75rem;color:#aaa}' +
    '@media print{.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    '</style></head><body>' +
    '<div class="hero">' +
    '<div class="tag">観念診断レポート</div>' +
    '<h1>' + escapeHtml(name) + ' さんの診断結果</h1>' +
    '<div class="type">' + topCat.name + ' ' + topCat.typeName + '</div>' +
    '<div class="meta">診断日: ' + dateStr + '</div>' +
    '</div>' +
    '<div class="body">' +
    '<div class="section-title">あなたの主要な観念パターン</div>' +
    '<div style="background:#fff;border-radius:16px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1rem;border-left:5px solid ' + topCat.color + '">' +
    '<div style="font-size:1.1rem;font-weight:700;color:' + topCat.color + ';margin-bottom:.5rem">' + topCat.name + ' ' + topCat.typeName + '</div>' +
    '<p style="font-size:.9rem;color:#444;line-height:1.8">' + topCat.desc + '</p>' +
    '</div>' +
    '<div class="section-title">カテゴリ別スコア</div>' +
    catCardsHTML +
    depthHTML +
    '<div class="msg">' +
    '<p>この診断結果は、あなたの無意識的な思考パターンの傾向を示すものです。</p><br>' +
    '<p>「良い・悪い」ではなく、自分を理解するための「気づき」のきっかけとしてご活用ください。</p><br>' +
    '<p><strong>観念は変えられます。</strong>まずは「自分がこういうパターンを持っている」と認識すること。それが変化の第一歩です。</p>' +
    '</div>' +
    '</div>' +
    '<div class="footer">観念診断 by Keisuke</div>' +
    '</body></html>';
}

function authorize() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('OK: ' + ss.getName());
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
