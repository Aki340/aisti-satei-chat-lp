// ============================================================
// Google Apps Script: アイスティ査定 リード通知
// 
// 機能:
//   1. スプレッドシートに回答データを1行ずつ自動記録
//   2. info@aisti.jp にリアルタイムでメール通知
//
// セットアップ手順:
//   1. Google Drive → 新規 → Google スプレッドシート → 名前:「アイスティ査定リード」
//   2. 1行目にヘッダーを入力（下記参照）
//   3. 拡張機能 → Apps Script を開く
//   4. このコードを貼り付けて保存
//   5. デプロイ → 新しいデプロイ → 種類: ウェブアプリ
//      - 実行ユーザー: 自分
//      - アクセス: 全員
//   6. デプロイ → URLをコピー
//   7. Cloudflare Pages → Settings → Environment variables に追加:
//      変数名: GAS_WEBHOOK_URL
//      値: コピーしたURL
//
// スプレッドシート1行目のヘッダー:
//   A: 日時 | B: セッションID | C: 物件種別 | D: 都道府県 | E: 市区町村
//   F: 状況 | G: 売却時期 | H: 目的 | I: 推定価格(下限) | J: 推定価格(上限)
//   K: utm_source | L: utm_medium | M: utm_campaign | N: utm_term | O: ttclid
// ============================================================

// 通知先メールアドレス
const NOTIFY_EMAIL = 'info@aisti.jp';

// スプレッドシートID（URLの /d/ と /edit の間の文字列）
// 例: https://docs.google.com/spreadsheets/d/XXXXXX/edit
// → 'XXXXXX' を設定
const SHEET_ID = 'YOUR_SPREADSHEET_ID';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // スプレッドシートに記録
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    sheet.appendRow([
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      data.session_id || '',
      data.property_type || '',
      data.prefecture || '',
      data.city || '',
      data.situation || '',
      data.timing || '',
      data.reason || '',
      data.est_low || '',
      data.est_high || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.utm_term || '',
      data.ttclid || '',
    ]);
    
    // メール通知
    const subject = `【査定リード】${data.property_type || '物件'} - ${data.prefecture || ''} ${data.city || ''}`;
    const body = [
      '新しい査定リードが入りました。',
      '',
      `日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
      `物件種別: ${data.property_type || '-'}`,
      `所在地: ${data.prefecture || ''} ${data.city || ''}`,
      `状況: ${data.situation || '-'}`,
      `売却時期: ${data.timing || '-'}`,
      `目的: ${data.reason || '-'}`,
      `推定価格: ${data.est_low || '?'}〜${data.est_high || '?'}万円`,
      '',
      `セッションID: ${data.session_id || '-'}`,
      `流入元: ${data.utm_source || '-'} / ${data.utm_medium || '-'} / ${data.utm_campaign || '-'}`,
      '',
      '※ このメールはアイスティ査定LPから自動送信されています。',
    ].join('\n');
    
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
