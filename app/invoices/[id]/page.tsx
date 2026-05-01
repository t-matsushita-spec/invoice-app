// 請求書確認画面（Server Component）
// 請求書・明細・取引先・自社情報を取得して印刷対応レイアウトで表示する

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusActions from './StatusActions'
import type { Invoice, InvoiceItem, Client, Settings, InvoiceStatus } from '@/types'

type PageProps = {
  params: Promise<{ id: string }>
}

// 数値を3桁カンマ区切り・円表示にフォーマット
const formatCurrency = (v: number) => `¥${Math.floor(v).toLocaleString('ja-JP')}`

// 日付を和風表示（例：2026年4月24日）に変換
const formatDateJP = (dateStr: string): string => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 必要なデータを並行取得
  const [invoiceResult, itemsResult, settingsResult] = await Promise.all([
    // 取引先をJOINして取得
    supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order'),
    supabase.from('settings').select('*').single(),
  ])

  if (invoiceResult.error || !invoiceResult.data) notFound()

  const invoice = invoiceResult.data as Invoice & { clients: Client | null }
  const items = (itemsResult.data ?? []) as InvoiceItem[]
  const settings = settingsResult.data as Settings | null

  return (
    <div>
      {/* ===== 操作ボタン（印刷時は非表示） ===== */}
      <StatusActions
        invoiceId={invoice.id}
        currentStatus={invoice.status as InvoiceStatus}
        invoiceNumber={invoice.invoice_number}
        clientName={invoice.clients?.name ?? '不明'}
      />

      {/* ===== 請求書カード =====
          id="invoice-preview" をPDF出力の対象要素として指定する。
          max-w-3xl でA4相当の横幅を再現。
          print:shadow-none で印刷時はシャドウを消してクリーンに印字する。 */}
      <div id="invoice-preview" className="max-w-3xl mx-auto bg-white rounded-xl shadow-md print:shadow-none p-10 print:p-0">

        {/* ===== ヘッダー部分 ===== */}
        <div className="flex justify-between items-start mb-10">

          {/* 左：請求先情報 */}
          <div>
            <p className="text-xs text-gray-400 mb-1">請求先</p>
            <p className="text-2xl font-bold text-gray-800 mb-1">
              {invoice.clients?.name ?? '（取引先未設定）'}
              <span className="text-xl"> 御中</span>
            </p>
            {invoice.clients?.postal_code && (
              <p className="text-sm text-gray-500">〒{invoice.clients.postal_code}</p>
            )}
            {invoice.clients?.address && (
              <p className="text-sm text-gray-500">{invoice.clients.address}</p>
            )}
            {invoice.clients?.contact_name && (
              <p className="text-sm text-gray-500">
                担当：{invoice.clients.contact_name} 様
              </p>
            )}
          </div>

          {/* 右：請求書メタ情報 */}
          <div className="text-right">
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-3">請求書</h1>
            <table className="text-sm text-gray-600 ml-auto">
              <tbody>
                <tr>
                  <td className="pr-4 text-gray-400">請求書番号</td>
                  <td className="font-medium text-gray-800">{invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-gray-400">発行日</td>
                  <td>{formatDateJP(invoice.issue_date)}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-gray-400">支払期限</td>
                  <td className="font-semibold text-red-600">{formatDateJP(invoice.due_date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== 発行者情報 ===== */}
        <div className="flex justify-end mb-10">
          <div className="text-right text-sm text-gray-600 space-y-0.5">
            <p className="text-base font-bold text-gray-800">{settings?.company_name ?? ''}</p>
            <p>{settings?.owner_name ?? ''}</p>
            {settings?.postal_code && <p>〒{settings.postal_code}</p>}
            {settings?.address && <p>{settings.address}</p>}
            {settings?.phone && <p>TEL：{settings.phone}</p>}
            {settings?.email && <p>{settings.email}</p>}
            {settings?.invoice_number && (
              <p className="text-xs text-gray-400 mt-1">
                登録番号：{settings.invoice_number}（適格請求書発行事業者）
              </p>
            )}
          </div>
        </div>

        {/* ===== 合計金額ハイライト ===== */}
        <div className="bg-[#1e3a5f] text-white rounded-lg px-6 py-4 mb-8 flex justify-between items-center">
          <span className="text-sm font-medium opacity-80">ご請求金額（税込）</span>
          <span className="text-3xl font-bold">{formatCurrency(invoice.total_amount)}</span>
        </div>

        {/* ===== 明細テーブル ===== */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="text-left px-4 py-2.5 font-medium">品目・内容</th>
              <th className="text-right px-4 py-2.5 font-medium w-16">数量</th>
              <th className="text-left px-4 py-2.5 font-medium w-12">単位</th>
              <th className="text-right px-4 py-2.5 font-medium w-28">単価</th>
              <th className="text-right px-4 py-2.5 font-medium w-28">金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
              >
                <td className="px-4 py-2.5 text-gray-800">{item.description}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-2.5 text-gray-600">{item.unit}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {item.tax_included && <span className="text-xs text-amber-600">税込 </span>}
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== 合計欄（右寄せ） ===== */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>小計（税抜）</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>消費税（10%）</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#1e3a5f] border-t border-gray-300 pt-2">
              <span>合計金額</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* ===== 振込先 ===== */}
        {invoice.bank_info && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              お振込先
            </p>
            <div className="border border-gray-200 rounded-lg px-5 py-3 bg-gray-50 text-sm text-gray-700 whitespace-pre-line">
              {invoice.bank_info}
            </div>
          </div>
        )}

        {/* ===== 備考 ===== */}
        {invoice.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              備考
            </p>
            <div className="border border-gray-200 rounded-lg px-5 py-3 bg-gray-50 text-sm text-gray-700 whitespace-pre-line">
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
