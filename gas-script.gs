/**
 * 観念診断 — GAS（スプレッドシート集計 + Googleドキュメントレポート生成）
 */

var CATEGORIES = {
  A:{name:'存在価値系',typeName:'「条件付きの自分」',color:'#E74C3C',
    desc:'「何かができる自分」「何かを持っている自分」でないと価値がない、と無意識に信じている傾向があります。ありのままの自分に存在価値を感じにくく、常に「自分は足りているか？」という問いが心の中で回っています。',
    kannen:['人に役に立たないといけない','価値を生み出さないといけない','そのままではいけない','成果を出さないと認めてもらえない','特別な能力がないといけない']},
  B:{name:'対人関係系',typeName:'「透明な自分」',color:'#3498DB',
    desc:'他者との関係の中で、自分を消すことで安全を守ろうとする傾向があります。「嫌われたくない」「迷惑をかけたくない」が行動の基準になり、自分の意志よりも周囲の空気を優先してしまいます。',
    kannen:['迷惑をかけちゃいけない','人に嫌われてはいけない','空気を読まないといけない','相手の期待に応えないといけない','自分の意見を主張してはいけない']},
  C:{name:'努力・行動系',typeName:'「止まれない自分」',color:'#F39C12',
    desc:'「頑張り続けること」で自分の居場所を確保しようとする傾向があります。休むこと、楽をすることに強い罪悪感を感じ、常に「もっとやらなきゃ」というエンジンが回り続けています。',
    kannen:['頑張らないといけない','完璧にやらないといけない','責任を果たさないといけない','休んではいけない','楽をしてはいけない']},
  D:{name:'感情・自己表現系',typeName:'「仮面の自分」',color:'#9B59B6',
    desc:'本当の感情を表に出すことに強い抵抗を持っています。弱さ、怒り、悲しみ、喜びさえも「見せてはいけないもの」として抑え込み、常に「大丈夫な自分」を演じ続ける傾向があります。',
    kannen:['弱さを見せてはいけない','本音を言ってはいけない','助けを求めてはいけない','泣いてはいけない','怒ってはいけない']},
  E:{name:'可能性・変化系',typeName:'「檻の中の自分」',color:'#1ABC9C',
    desc:'自分の可能性に天井を設けてしまう傾向があります。「どうせ自分には無理」「変わりたくても変われない」という思い込みが、新しい挑戦や変化へのブレーキになっています。',
    kannen:['自分にはできない','自分には才能がない','失敗してはいけない','自分が変わるのは難しい','幸せになってはいけない']}
};

function getReportFolder() {
  var folders = DriveApp.getFoldersByName('観念診断レポート');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('観念診断レポート');
}

function createReport(data) {
  var name = data.fullName || '回答者';
  var doc = DocumentApp.create('観念診断レポート — ' + name);
  var body = doc.getBody();
  body.clear();

  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(45);
  body.setMarginRight(45);

  var title = body.appendParagraph('観念診断レポート');
  title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.setForegroundColor('#5B4FBE');

  var sub = body.appendParagraph(name + ' さんの診断結果');
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.setForegroundColor('#6B6B80');
  sub.setFontSize(14);

  var dateStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年M月d日');
  body.appendParagraph('診断日: ' + dateStr)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setForegroundColor('#999999')
    .setFontSize(10);

  body.appendHorizontalRule();
  body.appendParagraph('');

  var scores = {A:data.scoreA||0, B:data.scoreB||0, C:data.scoreC||0, D:data.scoreD||0, E:data.scoreE||0};
  var total = scores.A + scores.B + scores.C + scores.D + scores.E;
  var sorted = Object.entries(scores).sort(function(a,b){return b[1]-a[1]});
  var topCat = CATEGORIES[sorted[0][0]];

  body.appendParagraph('あなたの主要な観念パターン')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setForegroundColor('#2C2C3E');

  body.appendParagraph(topCat.name + ' ' + topCat.typeName)
    .setFontSize(18)
    .setBold(true)
    .setForegroundColor(topCat.color);

  body.appendParagraph('');
  body.appendParagraph(topCat.desc).setForegroundColor('#333333');
  body.appendParagraph('');

  body.appendParagraph('この観念パターンが持ちやすい思い込み:').setBold(true);
  topCat.kannen.forEach(function(k){
    body.appendParagraph('・' + k).setForegroundColor('#555555');
  });

  body.appendParagraph('');
  body.appendHorizontalRule();
  body.appendParagraph('');

  body.appendParagraph('カテゴリ別スコア')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setForegroundColor('#2C2C3E');
  body.appendParagraph('');

  sorted.forEach(function(item, i){
    var catId = item[0];
    var score = item[1];
    var cat = CATEGORIES[catId];
    var prefix = i === 0 ? '★ ' : '';
    body.appendParagraph(prefix + cat.name + ' ' + cat.typeName + '  —  ' + score + ' / ' + total)
      .setHeading(DocumentApp.ParagraphHeading.HEADING3)
      .setForegroundColor(cat.color);
    body.appendParagraph(cat.desc).setForegroundColor('#666666').setFontSize(10);
    body.appendParagraph('');
  });

  body.appendHorizontalRule();
  body.appendParagraph('');

  var answerDetails = [];
  try { if (data.answerDetails) answerDetails = JSON.parse(data.answerDetails); } catch(e){}

  if (answerDetails.length > 0) {
    body.appendParagraph('深層マップ — 無意識の反応速度')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setForegroundColor('#2C2C3E');
    body.appendParagraph('');

    var sortedByTime = answerDetails.slice().sort(function(a,b){return a.time - b.time});
    var fastest = sortedByTime[0];
    var slowest = sortedByTime[sortedByTime.length - 1];
    var fCat = CATEGORIES[fastest.cat];
    var sCat = CATEGORIES[slowest.cat];

    body.appendParagraph('最も速く反応した場面 — ' + fastest.time.toFixed(1) + '秒')
      .setBold(true).setForegroundColor('#E74C3C');
    if (fastest.scene) body.appendParagraph(fastest.scene).setForegroundColor('#666666').setFontSize(10);
    body.appendParagraph('→ ' + fCat.name + 'の観念が最も深く内面化されている可能性があります')
      .setItalic(true).setForegroundColor('#888888').setFontSize(10);
    body.appendParagraph('');

    body.appendParagraph('最も迷った場面 — ' + slowest.time.toFixed(1) + '秒')
      .setBold(true).setForegroundColor('#3498DB');
    if (slowest.scene) body.appendParagraph(slowest.scene).setForegroundColor('#666666').setFontSize(10);
    body.appendParagraph('→ ' + sCat.name + 'の観念を意識化し始めている段階かもしれません')
      .setItalic(true).setForegroundColor('#888888').setFontSize(10);

    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');

    body.appendParagraph('全問の反応速度')
      .setHeading(DocumentApp.ParagraphHeading.HEADING3)
      .setForegroundColor('#2C2C3E');
    answerDetails.forEach(function(a){
      var ac = CATEGORIES[a.cat];
      body.appendParagraph('Q' + a.q + ': ' + ac.name + ' — ' + a.time.toFixed(1) + '秒')
        .setForegroundColor('#777777').setFontSize(9);
    });
    body.appendParagraph('');
  }

  body.appendHorizontalRule();
  body.appendParagraph('');
  body.appendParagraph('この診断結果は、あなたの無意識的な思考パターンの傾向を示すものです。「良い・悪い」ではなく、自分を理解するための「気づき」のきっかけとしてご活用ください。')
    .setForegroundColor('#666666').setFontSize(10);
  body.appendParagraph('');
  body.appendParagraph('観念は変えられます。まずは「自分がこういうパターンを持っている」と認識すること。それが変化の第一歩です。')
    .setForegroundColor('#666666').setFontSize(10);
  body.appendParagraph('');
  body.appendParagraph('観念診断 by Keisuke')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setForegroundColor('#CCCCCC').setFontSize(8);

  doc.saveAndClose();

  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(getReportFolder());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return doc.getUrl();
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('回答データ');

    if (sheet && sheet.getLastColumn() < 14) {
      sheet.setName('回答データ_旧_' + Date.now());
      sheet = null;
    }

    if (!sheet) {
      sheet = ss.insertSheet('回答データ');
      var headers = ['タイムスタンプ','LINE名','氏名','回答詳細','A:存在価値','B:対人関係','C:努力行動','D:感情表現','E:可能性変化','主要パターン','反応速度','スキップ回数','レポートURL','UA'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var docUrl = '';
    try {
      docUrl = createReport(data);
    } catch (docErr) {
      docUrl = 'ERROR: ' + docErr.toString();
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.lineName || '',
      data.fullName || '',
      data.answers || '',
      data.scoreA || 0, data.scoreB || 0, data.scoreC || 0, data.scoreD || 0, data.scoreE || 0,
      data.mainPattern || '',
      data.reactionTimes || '',
      data.skips || 0,
      docUrl,
      data.ua || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', docUrl: docUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Spreadsheet: ' + ss.getName());
  var doc = DocumentApp.create('観念診断_権限テスト');
  Logger.log('DocumentApp: OK');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  Logger.log('DriveApp: OK — 全権限取得完了');
}

function doGet() {
  return ContentService
    .createTextOutput('観念診断 API is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
