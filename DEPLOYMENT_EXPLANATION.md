# デプロイ解説：環境変数・自動デプロイ・今後のフロー

---

## 1. 本番・ローカル環境変数を分ける理由と仕組み

### なぜ分ける？

#### 理由 1：データの独立性

**ローカル環境（開発中）**
```
↓ .env.local から開発用 Supabase を読み込み
↓ localhost:3000 で開発
↓ テスト用のダミーデータを使用
↓ 実データに一切影響しない
```

**本番環境（Vercel）**
```
↓ Vercel のダッシュボードに設定した環境変数を使用
↓ 本番 Supabase と接続
↓ 実際のクライアント・請求書データを管理
↓ 実データなので細心の注意が必要
```

**メリット：**
- 開発中にテストデータで試行錯誤できる
- 本番データが破壊される心配がない
- チームメンバー各自が別々の開発環境を持てる

#### 理由 2：セキュリティ

**重大な問題：環境変数を Git に含めた場合**
```
❌ GitHub にpush
  ↓ API キーが公開される
  ↓ 悪用される危険（課金、データ削除など）
  ↓ GitHub は削除しても履歴に残る
```

**正しい方法：.gitignore で保護**
```
✅ .env.local は Git に含めない（.gitignore）
  ↓ GitHub には環境変数は含まれない
  ↓ Vercel で環境変数を別途設定
  ↓ 安全に本番デプロイできる
```

#### 理由 3：チーム開発での環境の統一

複数人で開発する場合：
```
A さん（開発機 1）
  ├─ .env.local に自分の Supabase キー
  └─ ローカルでテスト

B さん（開発機 2）
  ├─ .env.local に自分の Supabase キー
  └─ ローカルでテスト

本番環境（Vercel）
  ├─ 本番用 Supabase キー（統一）
  └─ 全ユーザーがこのデータを使用
```

各開発者が独立した開発環境を持ちながら、本番環境は統一できる。

---

### 仕組み：どのように分離されているのか？

#### ステップ 1：ローカル開発時

```bash
npm run dev  ← .env.local を自動読み込み
```

**処理:**
1. Next.js が起動
2. `.env.local` から `NEXT_PUBLIC_SUPABASE_URL` を読み込み
3. フロントエンドコードが開発用 Supabase に接続
4. `http://localhost:3000` で実行

**ファイル構成:**
```
invoice-app/
├─ .env.local          ← ローカルのみ（Git には含まれない）
│  ├─ NEXT_PUBLIC_SUPABASE_URL=https://xxx-dev.supabase.co
│  └─ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
├─ .gitignore          ← .env* を除外
└─ src/
```

#### ステップ 2：GitHub へのpush

```bash
git add .
git commit -m "feat: 新機能"
git push origin master  ← .env.local は送られない！
```

**処理:**
1. `.gitignore` が `*.env*` を除外
2. GitHub に送られるのはソースコードだけ
3. 環境変数は送られない（セキュア）

**GitHub に含まれるもの**
```
✅ ソースコード（.ts, .tsx, .json など）
❌ .env.local（除外）
❌ node_modules（除外）
❌ .next（除外）
```

#### ステップ 3：Vercel デプロイ

```
GitHub から pull
  ↓
Vercel が自動ビルド
  ↓
Vercel ダッシュボードの環境変数を使用
  ↓
本番 Supabase と接続
```

**Vercel ダッシュボール → Settings → Environment Variables**
```
NEXT_PUBLIC_SUPABASE_URL = https://euyxxjszmfizlxhotnxv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...（本番用 key）
```

**結果:**
```
https://invoice-app-seven-tau.vercel.app で実行
  ↓
本番 Supabase と接続
  ↓
実ユーザーのデータを管理
```

---

### 図で理解する環境の分離

```
┌─────────────────────────────────────────────────────┐
│                     開発フロー                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 開発者 A                      開発者 B               │
│ ┌──────────────┐             ┌──────────────┐      │
│ │ .env.local   │             │ .env.local   │      │
│ │ (dev-key-A)  │             │ (dev-key-B)  │      │
│ └────────┬─────┘             └────────┬─────┘      │
│          │ npm run dev                 │ npm run dev│
│          │                             │           │
│ ┌────────▼──────────┐      ┌──────────▼────────┐  │
│ │ Supabase Project A│      │ Supabase Project B│  │
│ │  (Dev DB)         │      │  (Dev DB)         │  │
│ └───────────────────┘      └───────────────────┘  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    本番フロー                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  GitHub                   Vercel                   │
│  ┌─────────────────┐     ┌──────────────────────┐ │
│  │ ソースコード    │────▶│ Environment Variables│ │
│  │ （env除く）     │     │ (prod-key)           │ │
│  └─────────────────┘     └──────────┬───────────┘ │
│                                      │            │
│                          ┌───────────▼──────────┐ │
│                          │ Supabase Project     │ │
│                          │  (Production DB)    │ │
│                          └─────────────────────┘ │
│                                   ▲             │
│                          users access from      │
│                   invoice-app-seven-tau.vercel.app│
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 2. Vercel の自動デプロイ（GitHub Webhook）の仕組み

### トリガー：何がデプロイを開始するのか？

```
開発者が GitHub にpush
  ↓
GitHub Webhook が発火
  ↓
Vercel が即座に通知を受け取る
  ↓
Vercel がビルド・デプロイを開始
  ↓
本番環境が更新される（自動）
```

### ステップバイステップ

#### Step 1：ローカルで開発

```bash
# invoice-app で機能開発
touch app/new-feature/page.tsx
# ファイル編集...

# テストして commit
git add .
git commit -m "feat: 新しい機能"
```

#### Step 2：GitHub にpush

```bash
git push origin master
```

**処理:**
```
ローカルの変更が GitHub.com に送信
  ↓
GitHub が変更を受け取る
  ↓
GitHub から Vercel への Webhook が発火
  ↓
Vercel API にリクエスト：「デプロイしてください」
```

#### Step 3：Vercel がビルド開始

```
Vercel が GitHub からコードを pull
  ↓
npm install（依存関係をインストール）
  ↓
npm run build（Next.js をビルド）
  ↓
TypeScript チェック
  ↓
静的生成 / プリレンダリング
```

**Vercel ダッシュボール → Deployments で進捗確認可能**

#### Step 4：本番環境を更新

```
ビルド成功
  ↓
Vercel の CDN に新バージョンをデプロイ
  ↓
invoice-app-seven-tau.vercel.app で新バージョンが公開
  ↓
ユーザーがアクセスすると新バージョンが表示される
```

### 自動デプロイの流れ（図解）

```
git push origin master（開発者）
         ↓
    GitHub.com
         ↓
  Webhook Event
         ↓
   Vercel API
         ↓
┌──────────────────────────────────┐
│ Vercel Build Process             │
├──────────────────────────────────┤
│ 1. Code pull from GitHub          │
│ 2. npm install                    │
│ 3. npm run build                  │
│ 4. TypeScript check               │
│ 5. Static generation              │
│ 6. Deploy to CDN                  │
└──────────────────────────────────┘
         ↓
   本番環境が更新
         ↓
invoice-app-seven-tau.vercel.app
（ユーザーが新バージョンを使用）
```

---

### ビルドが失敗した場合

```
ビルド失敗
  ↓
Vercel が前のバージョンを保持（ロールバック）
  ↓
ユーザーには影響なし（古いバージョンが表示）
  ↓
開発者に通知メール
  ↓
開発者が修正 → 再度push
```

**確認方法:**
- Vercel ダッシュボール → Deployments で赤い ❌ マーク
- Build logs を確認して原因を特定

---

## 3. 今後の機能追加時のデプロイフロー

### 標準的な開発フロー

```
┌─────────────────────────────────────────────────┐
│ Phase 1：機能実装（ローカル）                    │
└─────────────────────────────────────────────────┘

1. ブランチ作成（オプション）
   git checkout -b feature/新機能

2. 機能を実装
   app/new-feature/page.tsx を編集
   コンポーネント追加
   Supabase クエリ追加

3. ローカルテスト
   npm run dev
   http://localhost:3000 でテスト

4. TypeScript チェック
   npx tsc --noEmit
   エラーがあれば修正

5. ビルドテスト
   npm run build
   ビルドが通るか確認

┌─────────────────────────────────────────────────┐
│ Phase 2：GitHub へのpush                        │
└─────────────────────────────────────────────────┘

6. 変更をステージング
   git add .

7. コミット（わかりやすいメッセージ）
   git commit -m "feat: クライアント管理画面を追加"
   git commit -m "fix: PDF出力のバグを修正"
   git commit -m "perf: 請求書一覧の読み込み高速化"

8. push
   git push origin master （または feature ブランチ）

┌─────────────────────────────────────────────────┐
│ Phase 3：Vercel が自動デプロイ                   │
└─────────────────────────────────────────────────┘

9. Vercel が自動ビルド
   ビルドログを確認：
   https://vercel.com/t-matsushita-specs-projects/invoice-app/deployments

10. 本番環境が更新
    https://invoice-app-seven-tau.vercel.app で新バージョン公開

┌─────────────────────────────────────────────────┐
│ Phase 4：本番環境で検証                          │
└─────────────────────────────────────────────────┘

11. 本番環境で動作確認
    ブラウザで新機能をテスト
    エラーがないか確認

12. 問題があれば修正
    ローカルで修正 → push → 自動デプロイ
```

---

### データベーススキーマ変更が必要な場合

```
1. Supabase SQL Editor で変更
   新しいテーブル作成
   カラム追加
   RLS ポリシー設定

2. ローカル .env.local でテスト
   npm run dev で新スキーマをテスト

3. 本番環境で変更実施
   Supabase ダッシュボール → Production
   同じ SQL を実行

4. アプリコードを更新
   Supabase クエリを修正
   型定義を更新

5. GitHub にpush
   git push origin master

6. Vercel が自動デプロイ
```

---

### 緊急で本番を修正したい場合

```
状況：本番で急にバグが発生

1. ローカルで原因特定
   開発環境で同じ現象を再現
   ソースコードのバグを特定

2. 修正を実装
   app/xxx/page.tsx を修正
   ローカルで動作確認

3. すぐに GitHub へpush
   git add .
   git commit -m "fix: 緊急修正 - XXXバグを解決"
   git push origin master

4. Vercel が自動デプロイ
   数秒で本番環境が更新される

5. 本番環境で再度確認
   バグが解決されたか確認
```

---

### デプロイ時に気をつけることチェックリスト

デプロイ前に以下を確認：

- [ ] TypeScript エラーがない（`npx tsc --noEmit`）
- [ ] ビルドが通る（`npm run build`）
- [ ] .env.local が含まれていない（確認：`git status`）
- [ ] 機密情報がコード内にハードコードされていない
- [ ] ローカルで機能テストが完了した
- [ ] コミットメッセージがわかりやすい
- [ ] 関連する複数の変更は 1つのコミットにまとめた

---

## 4. トラブル対応の流れ

### 本番環境でエラーが発生した場合

```
Step 1：原因を特定
  ├─ Vercel ダッシュボール → Deployments → Build Logs で確認
  ├─ ブラウザの DevTools で JavaScript エラーを確認
  └─ Supabase のログを確認

Step 2：修正コードをローカルで実装
  ├─ npm run dev で同じエラーを再現
  └─ ソースコードを修正

Step 3：修正を本番にpush
  ├─ git push origin master
  ├─ Vercel が自動デプロイ
  └─ 本番環境が自動で更新

Step 4：本番で再度確認
  └─ エラーが解決されたか確認
```

### ビルドが失敗した場合

```bash
# ローカルでビルドテスト
npm run build

# エラーが出た場合、修正
# 修正後、再度push
git push origin master
```

### 環境変数が間違っている場合

```bash
# Vercel で環境変数を確認・修正
# Vercel ダッシュボール → Settings → Environment Variables

# 環境変数を修正後、再度デプロイ
vercel deploy --prod
```

---

## まとめ：本番環境を安全に管理するために

| 項目 | ローカル | 本番（Vercel） |
|---|---|---|
| **環境変数の保存場所** | `.env.local` | Vercel ダッシュボード |
| **Git に含める？** | ❌ いいえ（.gitignore） | ✅ 設定済み |
| **データベース** | 開発用（テスト OK） | 本番（実データ） |
| **SSL** | HTTP（localhost） | HTTPS（安全） |
| **アクセス権限** | 開発者のみ | 全ユーザー |
| **バックアップ** | 不要（テスト用） | 重要（実データ） |

---

## リソース

- **Vercel ドキュメント（環境変数）:** https://vercel.com/docs/projects/environment-variables
- **Next.js ドキュメント（環境変数）:** https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- **Supabase ドキュメント（本番運用）:** https://supabase.com/docs/guides/deployment
