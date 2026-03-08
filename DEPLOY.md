# Manus指示書：アイスティ査定LP デプロイ

## ミッション

添付ファイル一式を GitHub → Cloudflare Pages にデプロイし、プレースホルダーを実IDに置換せよ。
コードは完成済み。新規コーディングは不要。

---

## 添付ファイル構成

```
aisti-satei-chat-lp/
├── index.html              # 本番用LP（完成済み）
├── privacy.html            # プライバシーポリシー
├── tokushoho.html          # 特定商取引法に基づく表記
├── _headers                # セキュリティヘッダー
├── _redirects              # SPA fallback
├── gas-webhook.js          # GASコード（スプレッドシート＋メール通知）※GASに貼り付ける用
├── assets/
│   ├── logo.png            # ★ Phase 1で取得
│   └── favicon.ico         # ★ Phase 1で取得
└── functions/api/
    ├── session.js           # 回答データKV保存 + GAS Webhook通知
    └── cities.js            # 市区町村取得プロキシ（HeartRails GeoAPI中継）
```

---

## Phase 1: プレースホルダー置換 + アセット取得

### 1-1. index.html 内の3箇所を置換

| 検索文字列 | 置換先 | 取得方法 |
|-----------|--------|---------|
| `GTM-XXXXXXX` （2箇所） | 実GTMコンテナID | Google Tag Manager → 管理 → コンテナID |
| `TIKTOK_PIXEL_ID` （1箇所） | 実TikTok Pixel ID | TikTok Ads Manager → アセット → イベント → ピクセルID |
| `https://lin.ee/XXXXXXX` （1箇所） | 実LINE友だち追加URL | LINE Official Account → 友だち追加 → URL |

### 1-2. ロゴ・ファビコン取得

```bash
curl -o assets/logo.png "https://www.aisti.jp/images/logo2.png"
curl -o assets/favicon.ico "https://www.aisti.jp/favicon.ico"
```

---

## Phase 2: GAS Webhook セットアップ（スプレッドシート＋メール通知）

### 2-1. スプレッドシート作成

1. Google Drive → 新規 → Google スプレッドシート
2. 名前: 「アイスティ査定リード」
3. **1行目（A〜O列）にヘッダーを入力:**

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 日時 | セッションID | 物件種別 | 都道府県 | 市区町村 | 状況 | 売却時期 | 目的 | 推定価格(下限) | 推定価格(上限) | utm_source | utm_medium | utm_campaign | utm_term | ttclid |

4. URLバーからスプレッドシートIDをコピー
   - URL例: `https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit`
   - ID: `1aBcDeFgHiJkLmN`

### 2-2. GASデプロイ

1. スプレッドシート → 拡張機能 → Apps Script
2. `gas-webhook.js` の中身を全てコピーして貼り付け
3. `SHEET_ID` を上でコピーしたスプレッドシートIDに置換
4. 保存（Ctrl+S）
5. デプロイ → 新しいデプロイ
   - 種類: **ウェブアプリ**
   - 実行ユーザー: **自分**
   - アクセス: **全員**
6. 「デプロイ」をクリック → Google認証を許可
7. 表示された **ウェブアプリURL** をコピー

### 2-3. テスト

```bash
curl -X POST "（コピーしたGAS URL）" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test_001","property_type":"マンション","prefecture":"東京都","city":"渋谷区","situation":"居住中","timing":"3ヶ月以内","reason":"売却検討中","est_low":3500,"est_high":5800}'
```

確認:
- [ ] スプレッドシートに1行追加されている
- [ ] info@aisti.jp にメールが届いている

---

## Phase 3: GitHubリポジトリ作成 & Push

```bash
cd aisti-satei-chat-lp
git init
git add -A
git commit -m "初回デプロイ: アイスティ査定チャットLP"
gh repo create aisti-satei-chat-lp --private --source=. --push
```

※ `gas-webhook.js` はGASに貼り付ける用なのでGitHubに含めてもデプロイに影響なし

---

## Phase 4: Cloudflare Pages セットアップ

### 4-1. プロジェクト作成

Cloudflare Dashboard → Pages → 「Create a project」→ 「Connect to Git」→ `aisti-satei-chat-lp` を選択。

ビルド設定：
| 項目 | 値 |
|------|---|
| Framework preset | None |
| Build command | （空欄） |
| Build output directory | `/` |

### 4-2. KVネームスペース作成

```
Cloudflare Dashboard → Workers & Pages → KV → Create a namespace
名前: SESSIONS_KV
```

### 4-3. 環境変数 + KVバインディング設定

```
Pages → aisti-satei-chat-lp → Settings → Functions
```

**KV namespace bindings:**
| 変数名 | 値 |
|--------|---|
| `SESSIONS_KV` | 上で作成したネームスペースを選択 |

**Environment variables:**
| 変数名 | 値 |
|--------|---|
| `GAS_WEBHOOK_URL` | Phase 2でコピーしたGAS ウェブアプリURL |

### 4-4. カスタムドメイン設定

```
Pages → aisti-satei-chat-lp → Custom domains → Add → satei.aisti.jp
```

aisti.jp の DNS管理画面で以下を追加：
```
CNAME  satei  aisti-satei-chat-lp.pages.dev
```

---

## Phase 5: デプロイ確認チェックリスト

```
動作確認:
  □ https://satei.aisti.jp でチャットLPが表示される
  □ ロゴ画像が左上に表示される
  □ 価格比較チャートがボット吹き出し内に表示される
  □ 物件種別6択がSVGアイコン付き3列レイアウトで表示
  □ 都道府県リストがエリア別ヘッダー付きで表示
  □ 都道府県選択後、市区町村がAPIから動的取得される
  □ 6ステップ完了後に推定価格（ぼかし表示）が出る
  □ LINE CTAボタンがパルスアニメーション付きで表示
  □ LINE CTAクリックで友だち追加URLに遷移する
  □ プログレスバーが各ステップで正しく更新される
  □ 戻るボタンで前のステップに正しく戻れる
  □ プライバシーポリシー/特商法ページが表示される

リード通知:
  □ 6ステップ完了 → スプレッドシートに1行追加される
  □ 6ステップ完了 → info@aisti.jp にメール通知が届く
  □ メール件名: 「【査定リード】マンション - 東京都 渋谷区」形式
  □ スプレッドシートに物件種別・都道府県・推定価格が正しく記録される

トラッキング:
  □ ブラウザDevTools → Network で gtm.js が読み込まれている
  □ ブラウザDevTools → Network で tiktok events.js が読み込まれている
  □ LINE CTAクリック時にCompleteRegistrationが発火する

API:
  □ GET /api/cities?prefecture=東京都 が市区町村一覧を返す
  □ POST /api/session が session_id を返す
  □ GET /api/session?id=（上のID） がデータを返す

モバイル:
  □ iPhone Safari でチャットLPが正常に動作する
  □ 画面下部がノッチ/ホームバーに重ならない
  □ LINE CTAクリックでLINEアプリが開く
```

---

## 注意事項

1. コードの改変は不要。プレースホルダーの置換のみ行うこと
2. sell.yeay.jp へのアクセスやスクレイピングは行わないこと
3. HeartRails GeoAPIはCORSヘッダーを返さないため、必ず `functions/api/cities.js` 経由で中継すること
4. `_redirects` の `/* /index.html 200` は Cloudflare Functions（/api/*）より優先度が低いため共存する
5. GAS Webhook は session.js 内で非同期・非ブロッキングで呼び出しているため、GAS障害時もユーザーへのレスポンスには影響しない
