-- invoice-app: user_id 追加 + RLS 設定スクリプト
-- Supabase SQL Editor で実行してください

-- ============================================================
-- Step 1: invoices テーブルに user_id カラムを追加
-- ============================================================

ALTER TABLE invoices
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 既存データに user_id を設定（一時的に NULL を許可）
-- 注：現在のデータはユーザー紐付けなしなので、このまま進める
-- 本来は、既存データに正しい user_id を設定する必要があります

-- user_id に NOT NULL 制約を追加（新規レコード用）
ALTER TABLE invoices
ALTER COLUMN user_id SET NOT NULL;

-- インデックスを作成（user_id でクエリが高速化）
CREATE INDEX idx_invoices_user_id ON invoices(user_id);

-- ============================================================
-- Step 2: clients テーブルに user_id カラムを追加
-- ============================================================

ALTER TABLE clients
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- NOT NULL 制約を追加
ALTER TABLE clients
ALTER COLUMN user_id SET NOT NULL;

-- インデックスを作成
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- ============================================================
-- Step 3: invoices テーブルの RLS を有効化・ポリシーを作成
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SELECT：ユーザーは自分の請信書のみ表示
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT：ユーザーは自分の user_id で請信書を作成
CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE：ユーザーは自分の請信書のみ更新
CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE：ユーザーは自分の請信書のみ削除
CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Step 4: clients テーブルの RLS を有効化・ポリシーを作成
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- SELECT：ユーザーは自分のクライアントのみ表示
CREATE POLICY "Users can view their own clients"
  ON clients
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT：ユーザーは自分の user_id でクライアントを作成
CREATE POLICY "Users can insert their own clients"
  ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE：ユーザーは自分のクライアントのみ更新
CREATE POLICY "Users can update their own clients"
  ON clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE：ユーザーは自分のクライアントのみ削除
CREATE POLICY "Users can delete their own clients"
  ON clients
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Step 5: settings テーブルの RLS を有効化
-- ============================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT：全ユーザーが settings を読み取り可能
CREATE POLICY "All authenticated users can view settings"
  ON settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- UPDATE：全ユーザーが settings を更新可能
CREATE POLICY "All authenticated users can update settings"
  ON settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 確認クエリ
-- ============================================================

-- RLS が有効になっているか確認
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('invoices', 'clients', 'settings');

-- ポリシーが作成されているか確認
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('invoices', 'clients', 'settings');
