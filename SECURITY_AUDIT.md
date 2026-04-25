# 本番環境セキュリティ監査レポート

**監査日時:** 2026-04-25  
**本番環境:** https://invoice-app-seven-tau.vercel.app  
**総合リスク評価:** 🔴 **HIGH** — 即座の対応が必要

---

## 📊 セキュリティリスク一覧

| # | リスク項目 | 深刻度 | 現状 | 対策 |
|---|---|---|---|---|
| 1 | RLS（Row Level Security）なし | 🔴 CRITICAL | 未設定 | SQL ポリシー実装 |
| 2 | 認証機能がない | 🔴 CRITICAL | 未実装 | Supabase Auth 実装 |
| 3 | すべてのデータが公開状態 | 🔴 CRITICAL | public read | RLS + 認証 |
| 4 | API レート制限設定 | 🟠 HIGH | 未確認 | Supabase で設定 |
| 5 | 監査ログ（audit log）がない | 🟡 MEDIUM | なし | Supabase audit 有効化 |
| 6 | バックアップ戦略がない | 🟡 MEDIUM | なし | 自動バックアップ設定 |
| 7 | CORS 設定の確認 | 🟢 LOW | 問題なし | 定期確認 |

---

## 🔴 CRITICAL リスク：詳細分析

### リスク 1️⃣：RLS（Row Level Security）が設定されていない

**現状：**
```
Supabase テーブル（invoices, clients）
  ├─ RLS ポリシー：設定なし
  └─ 結果：誰でもすべてのデータにアクセス可能
```

**影響：**
- ✗ ユーザー A が作成した請信書を、ユーザー B も見られる
- ✗ 誰でもすべての請信書データを削除できる
- ✗ 他社の顧客情報が見えてしまう（プライバシー違反）

**例：悪意のある操作**
```javascript
// Supabase anon key を使って直接データを削除
const { error } = await supabase
  .from('invoices')
  .delete()
  .gt('id', '0');  // すべての請信書を削除可能
```

**対策：** RLS ポリシーを即座に設定
```sql
-- invoices テーブルに RLS ポリシーを追加
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- DELETE も同様に制限
CREATE POLICY "Users can only delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id);
```

**対策後の効果：**
```
✅ auth.uid() != user_id のユーザーはアクセス不可
✅ 自分のデータのみ操作可能
✅ 他ユーザーのデータは見えない
```

---

### リスク 2️⃣：認証機能がない

**現状：**
```
アプリケーション
  ├─ ログイン画面：なし
  ├─ 認証チェック：なし
  └─ 誰でも直接アクセス可能
```

**影響：**
- ✗ `https://invoice-app-seven-tau.vercel.app` にアクセスすれば、すべての請信書が見える
- ✗ 本番データが完全に public
- ✗ クライアント・顧客情報が漏洩の危険性

**例：アクセス可能な内容**
```
請信書一覧 → すべての請信書が表示
  ├─ クライアント名
  ├─ 請信額
  ├─ 支払い期限
  └─ 銀行情報

クライアント一覧 → すべての顧客情報が表示
  ├─ 会社名
  ├─ 住所
  ├─ 電話番号
  └─ メールアドレス
```

**対策：** Supabase Auth でログイン機能を実装

```typescript
// app/auth/login/page.tsx（実装例）
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data.user;
}

// MiddleWare で未認証ユーザーをブロック
// 認証済みユーザーのみ /invoices にアクセス可能
```

**対策後の効果：**
```
✅ ログイン画面が表示される
✅ メール・パスワードで認証
✅ 未認証ユーザーはアプリにアクセス不可
✅ auth.uid が user_id と結紐付け
```

---

### リスク 3️⃣：NEXT_PUBLIC_SUPABASE_ANON_KEY が公開されている

**現状：**
```
フロントエンドコード
  ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY（環境変数）
  └─ DevTools → Application → で確認可能
```

**なぜ危険？**
- ANON_KEY は「anonymous（匿名）」ユーザー用
- RLS なしなら、このキーですべてのデータにアクセス可能
- 外部の人でもキーを知れば、API を直接呼び出し可能

**例：悪意のある外部からのアクセス**
```bash
# 他人が curl でデータを削除
curl -X DELETE \
  'https://euyxxjszmfizlxhotnxv.supabase.co/rest/v1/invoices?id=gt.0' \
  -H 'apikey: eyJ...' \
  -H 'Authorization: Bearer eyJ...'
```

**対策：** RLS + 認証で защita
```
RLS ポリシー有効化
  ↓
auth.uid() を必須にする
  ↓
anonymous キーでは auth.uid() は NULL
  ↓
すべてのクエリが DENIED
```

---

## 🟠 HIGH リスク：詳細分析

### リスク 4️⃣：API レート制限が設定されていない

**現状：**
```
Supabase API
  ├─ レート制限：デフォルト設定不明
  └─ DOS 攻撃に対する防御：未確認
```

**影響：**
- 攻撃者が大量の API リクエストを送信
- Supabase がダウンする可能性
- 本番環境が利用不可になる

**対策：** Supabase ダッシュボールで設定

```
Settings → Rate Limiting
  ├─ Requests per second：制限値を設定（例：100）
  └─ Enable anonymous requests limiting
```

---

## 🟡 MEDIUM リスク

### リスク 5️⃣：監査ログがない

**現状：**
```
誰がいつ何をしたか：記録がない
```

**影響：**
- データ削除の犯人特定ができない
- コンプライアンス違反（監査証跡がない）
- インシデント対応に時間がかかる

**対策：**

```sql
-- Supabase で audit logging を有効化
-- Settings → Audit Logs を確認

-- または、アプリケーション側で audit table を作成
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action TEXT,
  table_name TEXT,
  record_id uuid,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

-- トリガーで自動記録
CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION audit_log_function();
```

---

### リスク 6️⃣：バックアップ戦略がない

**現状：**
```
本番 Supabase データベース
  ├─ 自動バックアップ：未設定
  └─ 復旧手段：なし
```

**影響：**
- データ損失時に復旧不可能
- 本番データが破壊されたら終わり

**対策：**

```
Supabase ダッシュボール
  ├─ Settings → Backups
  ├─ Automated backups：有効化
  └─ Backup frequency：毎日 / 毎週
```

---

## ✅ 安全な項目

### 🟢 HTTPS / SSL 証明書
```
✅ https://invoice-app-seven-tau.vercel.app
✅ Vercel による自動 SSL 発行・更新
✅ 通信は暗号化されている
```

### 🟢 環境変数の管理
```
✅ .env.local は Git に含まれていない
✅ Vercel で環境変数は安全に管理
✅ API キーが GitHub に露出していない
```

### 🟢 フレームワークセキュリティ
```
✅ Next.js の セキュリティヘッダー設定
✅ CORS は Supabase が管理
✅ XSS 対策：Next.js が自動で行う
```

---

## 🚨 緊急対応チェックリスト

本番環境を安全にするため、以下を**今すぐ実施**してください：

### Phase 1：RLS 設定（必須・即座）

- [ ] Supabase ダッシュボール → SQL Editor を開く
- [ ] 以下の SQL を実行：

```sql
-- invoices テーブルの RLS を有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SELECT ポリシー：自分のデータのみ表示
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT ポリシー：自分の user_id に設定
CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE / DELETE も同様
-- ... （詳細は VERCEL_DEPLOYMENT.md Section 3 を参照）
```

- [ ] clients テーブルにも同じ RLS を設定
- [ ] 本番環境でテスト（自分のデータだけが表示されるか確認）

### Phase 2：認証機能の実装（必須・1週間以内）

- [ ] Supabase Auth でユーザー登録画面を実装
- [ ] ログイン画面を追加
- [ ] MiddleWare で未認証ユーザーをブロック
- [ ] DEPLOYMENT_EXPLANATION.md を参照して実装

### Phase 3：監査ログの有効化（推奨・2週間以内）

- [ ] Supabase Audit Logs を Settings で有効化
- [ ] または、アプリケーション側で audit table を作成

### Phase 4：バックアップ設定（重要・今週中）

- [ ] Supabase Settings → Backups で自動バックアップ有効化
- [ ] 復旧テストを実施

---

## 📋 セキュリティスコア

**現状：** 🔴 **20/100** （非常に危険）

```
RLS：0/20 ❌ 未設定
認証：0/20 ❌ なし
レート制限：5/10 ⚠️ デフォルト
監査ログ：5/10 ⚠️ なし
バックアップ：0/10 ❌ なし
暗号化通信：10/10 ✅ OK
環境変数管理：10/10 ✅ OK
```

**RLS + 認証実装後：** 🟡 **70/100** （基本的には安全）

```
RLS：20/20 ✅ 設定済み
認証：20/20 ✅ 実装済み
レート制限：10/10 ✅ 設定済み
監査ログ：10/10 ✅ 有効化
バックアップ：10/10 ✅ 設定済み
暗号化通信：10/10 ✅ OK
環境変数管理：10/10 ✅ OK
```

---

## 🎯 推奨アクション

### 🔴 **即座にやるべきこと（今日中）**
1. **RLS ポリシーを Supabase に設定**
   - 最小 30 分で完了
   - `VERCEL_DEPLOYMENT.md` の SQL をコピペ実行

### 🟠 **1週間以内にやるべきこと**
2. **認証機能（ログイン）を実装**
   - 開発時間：3〜5 時間
   - `DEPLOYMENT_EXPLANATION.md` を参照

### 🟡 **2週間以内にやるべきこと**
3. **監査ログ・バックアップ設定**
   - 各 15 分程度で完了

---

## リソース

- **Supabase RLS ドキュメント:** https://supabase.com/docs/guides/auth/row-level-security
- **Supabase Auth 実装:** https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- **VERCEL_DEPLOYMENT.md → Section 3** — RLS SQL
- **DEPLOYMENT_EXPLANATION.md → Section 1** — 認証実装例

---

## 最後に

**現在の本番環境は「誰でもすべてのデータにアクセス可能」な状態です。**

これはテスト環境では許容できますが、**本番運用では非常に危険です。**

特に以下の理由から、**RLS と認証の実装は優先度 CRITICAL です：**

1. **顧客情報が public に晒されている**
   - 住所、電話番号、メールアドレス
   - GDPR・個人情報保護法違反の可能性

2. **請信書データが削除できる**
   - 誰でもデータ削除可能
   - 財務データ喪失の危険

3. **法的責任**
   - データ漏洩時の責任は企業が負う
   - コンプライアンス違反

**RLS 設定は本日中に実施することを強く推奨します。**

---

**セキュリティ監査：完了**  
**次のステップ：RLS 実装（必須）→ 認証機能（必須）**
