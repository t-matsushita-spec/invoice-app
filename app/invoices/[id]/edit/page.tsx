// 請求書 編集ページ（Server Component）
// URLのidで請求書・明細・取引先・設定を取得してフォームに渡す

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceForm from '@/components/InvoiceForm'
import type { Invoice, InvoiceItem, Client, Settings } from '@/types'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 請求書・明細・取引先・設定を並行取得
  const [invoiceResult, itemsResult, clientsResult, settingsResult] =
    await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).single(),
      supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('settings').select('*').single(),
    ])

  // 請求書が見つからない場合は404
  if (invoiceResult.error || !invoiceResult.data) {
    notFound()
  }
  if (settingsResult.error || !settingsResult.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-700 font-bold mb-2">設定データが取得できません</h2>
      </div>
    )
  }

  const invoice = invoiceResult.data as Invoice
  const existingItems = (itemsResult.data ?? []) as InvoiceItem[]
  const clients = (clientsResult.data ?? []) as Client[]
  const settings = settingsResult.data as Settings

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">請求書 編集</h1>
        <p className="text-gray-500 text-sm mt-1">
          {invoice.invoice_number} を編集しています
        </p>
      </div>

      <InvoiceForm
        invoice={invoice}
        existingItems={existingItems}
        clients={clients}
        settings={settings}
        defaultInvoiceNumber={invoice.invoice_number}
      />
    </div>
  )
}
