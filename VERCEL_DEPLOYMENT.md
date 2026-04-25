# Vercel デプロイ完全ガイド

## デプロイ状態

✅ **本番環境：デプロイ完了**
- URL: https://invoice-app-seven-tau.vercel.app
- GitHub 連携: ✅ 自動
- 環境変数: ✅ 設定済み

---

## 1. デプロイ前チェック（確認済み）

| 項目 | 状態 | 詳細 |
|---|---|---|
| .env.local 保護 | ✅ | `.env*` が .gitignore に含まれている |
| next.config.ts | ✅ | turbopack 設定あり |
| TypeScript | ✅ | エラーなし |
| ビルド | ✅ | `npm run build` 成功 |

---

## 2. Vercel 環境変数設定

### 設定済み環境変数

| 変数名 | 値 | 備考 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://euyxxjszmfizlxhotnxv.supabase.co` | Public（フロントエンドで使用） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Public な認証キー |

### 設定方法（参考）

```bash
# CLI で設定する場合
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

**Vercel ダッシュボード:** https://vercel.com/t-matsushita-specs-projects/invoice-app/settings/environment-variables

---

## 3. Supabase 本番設定

### 3.1 RLS（Row Level Security）設定

請求書アプリでは認証ユーザー限定なので、以下の RLS を設定してください：

```sql
-- テーブル作成時に RLS を有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ポリシー：ユーザーは自分のデータのみ表示・編集
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id);

-- clients テーブルも同様に設定
CREATE POLICY "Users can view their own clients"
  ON clients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 3.2 Site URL 設定

Supabase ダッシュボール → **Settings** → **Authentication** → **URL Configuration**

| 設定項目 | 値 |
|---|---|
| Site URL | `https://invoice-app-seven-tau.vercel.app` |
| Redirect URLs | `https://invoice-app-seven-tau.vercel.app/auth/callback` |

---

## 4. カスタムドメイン設定（invoice.yudegital.com）

### 4.1 Vercel でドメインを追加

1. Vercel ダッシュボール → **Settings** → **Domains**
2. **Add Domain** をクリック
3. `invoice.yudegital.com` を入力

### 4.2 DNS レコード設定

Vercel が指示する DNS レコードをドメインプロバイダー（ロリポップなど）で設定：

```
Type: CNAME
Name: invoice
Value: cname.vercel-dns.com. または Vercel が指示した値
```

**設定後、Vercel が自動検証**（5〜30分で反映）

---

## 5. デプロイ後の動作確認チェックリスト

### 基本機能確認

- [ ] **トップページ** — ページが正常に表示される
- [ ] **請求書一覧** — データが Supabase から読み込まれている
- [ ] **請求書作成** — フォーム送信が可能
- [ ] **PDF 出力** — html2canvas で PDF が生成される
- [ ] **クライアント管理** — CRUD 操作が動作する
- [ ] **エラーハンドリング** — エラー時に toast が表示される

### パフォーマンス確認

- [ ] **初回読み込み** — 3秒以内に表示
- [ ] **ページ遷移** — スムーズに動作
- [ ] **PDF 生成** — 5秒以内に完了

### セキュリティ確認

- [ ] **認証** — ログインしていないと機能しない
- [ ] **HTTPS** — SSL 証明書が有効
- [ ] **CORS** — Supabase との通信が正常

---

## 6. 本番・ローカル環境変数の分離

### なぜ分ける？

**ローカル（開発環境）:**
- 開発用 Supabase プロジェクト（テスト用）
- デバッグモード有効
- 実データに影響なし

**本番（Vercel）:**
- 本番用 Supabase プロジェクト（実データ）
- 安定性・セキュリティを優先
- エラーは本番環境のみ記録

### 仕組み

```
ローカル実行
  ├─ .env.local を読み込み（開発環境用）
  └─ localhost:3000 で実行

GitHub push
  ├─ .env.local は送らない（.gitignore）
  └─ Vercel が自動デプロイ

Vercel デプロイ
  ├─ Vercel ダッシュボールの環境変数を使用
  └─ 本番 Supabase と接続
```

**重要:** .env.local は **絶対に Git に含めない**（.gitignore で保護済み）

---

## 7. Vercel 自動デプロイの仕組み

### トリガー

```
GitHub にpush
  ↓
GitHub Webhook を Vercel に通知
  ↓
Vercel が自動ビルド・デプロイ
  ↓
本番環境が更新される
```

### デプロイフロー

1. **ローカルで開発**
   ```bash
   git add .
   git commit -m "feature: XXX"
   git push origin master
   ```

2. **Vercel が自動検知** → ビルド開始
   - `npm run build` を実行
   - TypeScript チェック
   - ビルド成果物をサーバーにデプロイ

3. **本番環境が更新**
   - `https://invoice-app-seven-tau.vercel.app` で新バージョンが公開

### 確認方法

Vercel ダッシュボール → **Deployments** で履歴確認可能

---

## 8. 今後の機能追加時のデプロイフロー

### 標準フロー

```
1. ローカルで機能実装
   - コード編集
   - ローカルテスト（npm run dev）
   - TypeScript チェック（npx tsc --noEmit）

2. Supabase スキーマ更新が必要な場合
   - Supabase ダッシュボールで SQL を実行
   - 開発環境で動作確認

3. GitHub にpush
   ```bash
   git add .
   git commit -m "feat: 新機能の説明"
   git push origin master
   ```

4. Vercel が自動デプロイ
   - ビルドが失敗した場合は通知
   - 本番環境で再度テスト

5. 本番環境で確認
   - 新機能が動作するか確認
   - エラーログがないか確認
```

### 本番環境でのトラブル対応

```bash
# 本番環境で環境変数を確認
vercel env ls

# 本番環境のログを確認
vercel logs

# ビルドを再実行
vercel deploy --prod
```

---

## 9. ユーザー認証フロー（Supabase Auth）

現在のアプリはまだ認証実装がない場合、以下を追加してください：

```typescript
// lib/supabase/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ログイン
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// ログアウト
export const logout = async () => {
  await supabase.auth.signOut();
};

// 現在のユーザーを取得
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};
```

---

## 10. トラブルシューティング

### デプロイが失敗する場合

```bash
# ローカルでビルドテスト
npm run build

# TypeScript エラーを確認
npx tsc --noEmit

# ビルド キャッシュをクリア
vercel deploy --prod --skip-build
```

### 本番で 500 エラーが出る場合

1. **Supabase URL が正しいか確認**
   ```bash
   vercel env ls
   ```

2. **Supabase が稼働しているか確認**
   - https://supabase.com/dashboard で確認

3. **RLS ポリシーが正しいか確認**
   - Supabase ダッシュボール → SQL Editor で確認

### ページが表示されない場合

1. **キャッシュをクリア**
   - Ctrl + Shift + Delete でキャッシュ削除
   - ページをリロード

2. **Vercel ビルドログを確認**
   - Vercel ダッシュボール → Deployments → Build Logs

---

## リソース

- **Vercel ダッシュボール:** https://vercel.com/dashboard
- **Supabase ダッシュボール:** https://supabase.com/dashboard
- **本番環境:** https://invoice-app-seven-tau.vercel.app
- **GitHub リポジトリ:** https://github.com/t-matsushita-spec/invoice-app
