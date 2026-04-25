import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euyxxjszmfizlxhotnxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eXh4anN6bWZpemx4aG90bnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTM4NzMsImV4cCI6MjA5MjU4OTg3M30.aDY5OT-tRGWY78uhCGZi4yEgxV2UL7EuTRmXBH0G5SY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('⏳ Supabase RLS SQL を実行中...\n');

// SQL スクリプトを実行（複数のステートメント）
const sqlStatements = [
  // Step 1: invoices テーブルに user_id カラムを追加
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;`,
  
  // Step 2: clients テーブルに user_id カラムを追加
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;`,
  
  // Step 3: user_id に NOT NULL 制約を追加
  `ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;`,
  `ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;`,
  
  // Step 4: インデックスを作成
  `CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);`,
  
  // Step 5: RLS を有効化
  `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE settings ENABLE ROW LEVEL SECURITY;`,
];

async function executeSQL() {
  try {
    // Supabase RPC で SQL を実行
    // ただし、anon key では DDL (ALTER, CREATE) を実行できないため、
    // 別の方法を使う必要があります
    
    console.log('⚠️  注意: anon キーでは DDL ステートメントを実行できません。');
    console.log('以下の方法で SQL を実行してください：\n');
    console.log('方法 1: Supabase ダッシュボール (推奨)');
    console.log('  1. https://supabase.com/dashboard に開く');
    console.log('  2. プロジェクト選択 → SQL Editor');
    console.log('  3. 以下の SQL をコピペして実行\n');
    
    console.log('='.repeat(60));
    console.log('SQL スクリプト:');
    console.log('='.repeat(60));
    console.log(`
-- Step 1: invoices テーブルに user_id カラムを追加
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: clients テーブルに user_id カラムを追加
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: user_id に NOT NULL 制約を追加
ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;

-- Step 4: インデックスを作成
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Step 5: RLS を有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Step 6: invoices テーブルの RLS ポリシーを作成
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
CREATE POLICY "Users can insert their own invoices"
  ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Step 7: clients テーブルの RLS ポリシーを作成
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;
CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE USING (auth.uid() = user_id);

-- Step 8: settings テーブルの RLS ポリシー（全ユーザーアクセス可）
DROP POLICY IF EXISTS "All authenticated users can view settings" ON settings;
CREATE POLICY "All authenticated users can view settings"
  ON settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update settings" ON settings;
CREATE POLICY "All authenticated users can update settings"
  ON settings FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 確認クエリ
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('invoices', 'clients', 'settings');
    `);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

executeSQL();
