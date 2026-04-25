// アプリ全体で使う型定義
// Supabaseのテーブル構造に対応させる

// ==============================
// settings テーブルの型
// ==============================
export type Settings = {
  id: string
  company_name: string | null       // 屋号・事業者名
  owner_name: string | null         // 代表者名
  postal_code: string | null        // 郵便番号
  address: string | null            // 住所
  phone: string | null              // 電話番号
  email: string | null              // メールアドレス
  invoice_number: string | null     // インボイス登録番号（T+13桁）
  bank_info: string | null          // 振込先銀行口座
  next_invoice_seq: number          // 請求書番号の連番カウンタ
  created_at: string
  updated_at: string
}

// 保存時に送る更新データ（idとタイムスタンプは除く）
export type SettingsUpdate = Omit<Settings, 'id' | 'created_at' | 'updated_at' | 'next_invoice_seq'>

// ==============================
// clients テーブルの型
// ==============================
export type Client = {
  id: string
  user_id: string                   // RLS対応：ユーザーID
  name: string                      // 取引先名（必須）
  postal_code: string | null
  address: string | null
  contact_name: string | null       // 担当者名
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

// ==============================
// invoices テーブルの型
// ==============================
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export type Invoice = {
  id: string
  user_id: string                   // RLS対応：ユーザーID
  invoice_number: string            // 請求書番号（例: INV-2024-001）
  client_id: string | null
  issue_date: string                // 発行日（ISO文字列）
  due_date: string                  // 支払期限
  status: InvoiceStatus
  subtotal: number                  // 小計（税抜）
  tax_rate: number                  // 税率（0.10 = 10%）
  tax_amount: number                // 消費税額
  total_amount: number              // 合計金額
  bank_info: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // JOINで取得するクライアント情報（オプション）
  clients?: Pick<Client, 'id' | 'name'> | null
}

// ==============================
// invoice_items テーブルの型
// ==============================
export type InvoiceItem = {
  id: string
  invoice_id: string
  sort_order: number
  description: string               // 品目・内容
  quantity: number
  unit: string                      // 式・個・時間など
  unit_price: number
  amount: number                    // quantity × unit_price
}
