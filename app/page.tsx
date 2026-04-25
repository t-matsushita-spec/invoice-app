// トップページ = 請求書一覧（Server Component）
// Supabaseから請求書を取引先JOINで全件取得してClient Componentに渡す

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import InvoiceListClient from './InvoiceListClient'

export default async function HomePage() {
  const supabase = await createClient()

  // 請求書を取引先名JOINで全件取得
  // select内の 'clients(name)' がSupabaseの外部キーJOIN記法
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-700 font-bold mb-2">データ取得エラー</h2>
        <pre className="text-xs text-red-400">{error.message}</pre>
      </div>
    )
  }

  const invoices = data ?? []

  // ===== 統計サマリーの計算（サーバー側で算出） =====
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // 今月の請求合計（issued_dateが今月のもの）
  const thisMonthTotal = invoices
    .filter((inv) => new Date(inv.issue_date) >= thisMonthStart)
    .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  // 未収金額（sentステータスの合計）
  const pendingTotal = invoices
    .filter((inv) => inv.status === 'sent')
    .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const totalCount = invoices.length

  const formatCurrency = (v: number) => `¥${Math.floor(v).toLocaleString('ja-JP')}`

  return (
    <div>
      {/* ===== ページヘッダー ===== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">請求書一覧</h1>
          <p className="text-gray-500 text-sm mt-1">{totalCount}件の請求書</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#16304f] text-white">
            ＋ 新規作成
          </Button>
        </Link>
      </div>

      {/* ===== 統計サマリー ===== */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard
          label="今月の請求合計"
          value={formatCurrency(thisMonthTotal)}
          icon="📊"
        />
        <SummaryCard
          label="未収金額（送付済）"
          value={formatCurrency(pendingTotal)}
          icon="⏳"
          highlight={pendingTotal > 0}
        />
        <SummaryCard
          label="請求書総数"
          value={`${totalCount}件`}
          icon="📄"
        />
      </div>

      {/* ===== 請求書テーブル（Client Component） ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <InvoiceListClient initialInvoices={invoices} />
      </div>
    </div>
  )
}

// ===== サマリーカードコンポーネント =====
type SummaryCardProps = {
  label: string
  value: string
  icon: string
  highlight?: boolean
}

function SummaryCard({ label, value, icon, highlight }: SummaryCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${
      highlight ? 'border-orange-200 bg-orange-50' : 'border-gray-100'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${
        highlight ? 'text-orange-600' : 'text-[#1e3a5f]'
      }`}>
        {value}
      </p>
    </div>
  )
}
