'use client'

// 請求書一覧のClient Component
// 検索・ステータスフィルタ・削除・コピー作成などのインタラクションを担当

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Invoice, InvoiceStatus } from '@/types'

// JOINで取得した取引先名を含む請求書の型
type InvoiceWithClient = Invoice & {
  clients: { name: string } | null
}

type InvoiceListClientProps = {
  initialInvoices: InvoiceWithClient[]
}

// ステータスのフィルタータブ定義
const STATUS_TABS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済' },
  { value: 'paid', label: '入金済' },
]

// ステータスバッジの設定
const STATUS_BADGE: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: '下書き', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  sent:  { label: '送付済', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid:  { label: '入金済', className: 'bg-green-100 text-green-700 border-green-200' },
}

// 数値を3桁カンマ区切り・円表示にフォーマット
const formatCurrency = (value: number): string =>
  `¥${Math.floor(value).toLocaleString('ja-JP')}`

// 日付文字列（YYYY-MM-DD）を日本語表示に変換
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function InvoiceListClient({ initialInvoices }: InvoiceListClientProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>(initialInvoices)
  const [searchText, setSearchText] = useState('')
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | 'all'>('all')

  // ==============================
  // フィルタリング（クライアント側）
  // なぜクライアント側で行うか：
  // 請求書の件数は個人事業主規模では数十〜数百件が上限。
  // サーバーに都度問い合わせるより、全件取得してブラウザでフィルタする方が
  // レスポンスが速く、実装もシンプルになる。
  // ==============================
  const filtered = invoices.filter((inv) => {
    const matchStatus = activeStatus === 'all' || inv.status === activeStatus
    const keyword = searchText.trim().toLowerCase()
    const matchSearch =
      !keyword ||
      inv.invoice_number.toLowerCase().includes(keyword) ||
      (inv.clients?.name ?? '').toLowerCase().includes(keyword)
    return matchStatus && matchSearch
  })

  // ==============================
  // 削除処理
  // ==============================
  const handleDelete = async (inv: InvoiceWithClient) => {
    const confirmed = window.confirm(
      `請求書「${inv.invoice_number}」を削除してよいですか？\nこの操作は取り消せません。`
    )
    if (!confirmed) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('invoices').delete().eq('id', inv.id)
      if (error) throw error

      // ローカルから即座に除外
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id))
      toast.success(`「${inv.invoice_number}」を削除しました`)
      router.refresh()
    } catch (err) {
      console.error('請求書の削除に失敗しました:', err)
      toast.error('削除に失敗しました。もう一度お試しください。')
    }
  }

  // ==============================
  // コピー作成
  // URLパラメータでcopy元IDを渡し、new/page.tsxでデータを取得する。
  // なぜURLパラメータを使うか：
  // ContextやZustandはページをまたいだデータ保持に状態管理ライブラリが必要。
  // URLパラメータなら追加ライブラリ不要で、ブラウザ戻る/リロードにも強い。
  // ==============================
  const handleCopy = (inv: InvoiceWithClient) => {
    router.push(`/invoices/new?copy_from=${inv.id}`)
  }

  return (
    <div>
      {/* ===== 検索・フィルタバー ===== */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* テキスト検索 */}
        <Input
          placeholder="請求書番号・取引先名で検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />

        {/* ステータスタブ */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== テーブル ===== */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">📄</p>
          <p className="text-lg font-medium mb-2">
            {searchText || activeStatus !== 'all'
              ? '条件に一致する請求書がありません'
              : '請求書がまだ作成されていません'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="text-left px-4 py-3 font-medium">請求書番号</th>
                <th className="text-left px-4 py-3 font-medium">取引先</th>
                <th className="text-left px-4 py-3 font-medium">発行日</th>
                <th className="text-left px-4 py-3 font-medium">支払期限</th>
                <th className="text-right px-4 py-3 font-medium">合計金額</th>
                <th className="text-center px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium w-44">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, index) => {
                const badge = STATUS_BADGE[inv.status as InvoiceStatus] ?? STATUS_BADGE.draft
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                      index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[#1e3a5f]">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {inv.clients?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* 確認 */}
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                            確認
                          </Button>
                        </Link>
                        {/* 編集 */}
                        <Link href={`/invoices/${inv.id}/edit`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                            編集
                          </Button>
                        </Link>
                        {/* コピー作成 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(inv)}
                          className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          コピー
                        </Button>
                        {/* 削除 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(inv)}
                          className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
