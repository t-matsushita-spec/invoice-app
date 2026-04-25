-- invoice-app: RLS（Row Level Security）設定スクリプト
-- Supabase SQL Editor で実行してください
-- 実行順序：このスクリプト全体を SQL Editor にコピペして実行

-- ============================================================
-- Step 1: invoices テーブルの RLS を有効化
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SELECT ポリシー：ユーザーは自分の請信書のみ表示
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT ポリシー：ユーザーは自分の user_id で請信書を作成
CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE ポリシー：ユーザーは自分の請信書のみ更新
CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE ポリシー：ユーザーは自分の請信書のみ削除
CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Step 2: clients テーブルの RLS を有効化
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- SELECT ポリシー：ユーザーは自分のクライアントのみ表示
CREATE POLICY "Users can view their own clients"
  ON clients
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT ポリシー：ユーザーは自分の user_id でクライアントを作成
CREATE POLICY "Users can insert their own clients"
  ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE ポリシー：ユーザーは自分のクライアントのみ更新
CREATE POLICY "Users can update their own clients"
  ON clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE ポリシー：ユーザーは自分のクライアントのみ削除
CREATE POLICY "Users can delete their own clients"
  ON clients
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Step 3: settings テーブルの RLS を有効化
-- ============================================================

-- settings は全ユーザーで共有するため、特別なポリシー
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT ポリシー：全ユーザーが settings を読み取り可能
CREATE POLICY "All users can view settings"
  ON settings
  FOR SELECT
  USING (true);

-- UPDATE ポリシー：全ユーザーが settings を更新可能（共有設定）
CREATE POLICY "All users can update settings"
  ON settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 確認クエリ：RLS が有効になっているか確認
-- ============================================================

-- 以下のクエリを実行して、RLS が有効になっているか確認
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 期待される結果：
-- tablename | rowsecurity
-- -----------+-------------
-- invoices  | t（true = RLS有効）
-- clients   | t
-- settings  | t
