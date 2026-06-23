// 請求書 新規作成ページ（Server Component）
// copy_from パラメータがある場合はコピー元データを取得してフォームに渡す

import { createClient } from '@/lib/supabase/server'
import InvoiceForm from '@/components/InvoiceForm'
import type { Client, Settings, InvoiceItem } from '@/types'
import type { CopyData } from '@/components/InvoiceForm'

// 請求書番号の自動採番
function generateInvoiceNumber(seq: number): string {
  const year = new Date().getFullYear()
  return `INV-${year}-${String(seq).padStart(3, '0')}`
}

type PageProps = {
  // Next.js 15以降、searchParamsもPromiseになる
  searchParams: Promise<{ copy_from?: string }>
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const { copy_from } = await searchParams
  const supabase = await createClient()

  // 取引先と設定を並行取得
  const [clientsResult, settingsResult] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('settings').select('*').single(),
  ])

  if (settingsResult.error || !settingsResult.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-700 font-bold mb-2">設定データが取得できません</h2>
        <p className="text-red-600 text-sm">
          先に「設定」ページから自社情報を登録してください。
        </p>
      </div>
    )
  }

  const clients = (clientsResult.data ?? []) as Client[]
  const settings = settingsResult.data as Settings
  const defaultInvoiceNumber = generateInvoiceNumber(settings.next_invoice_seq)

  // ===== コピー作成処理 =====
  // copy_fromパラメータがある場合はコピー元データを取得する
  let copyData: CopyData | undefined = undefined

  if (copy_from) {
    const [invoiceResult, itemsResult] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', copy_from).single(),
      supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', copy_from)
        .order('sort_order'),
    ])

    if (!invoiceResult.error && invoiceResult.data) {
      const srcInvoice = invoiceResult.data
      const srcItems = (itemsResult.data ?? []) as InvoiceItem[]

      copyData = {
        client_id: srcInvoice.client_id,
        bank_info: srcInvoice.bank_info,
        notes: srcInvoice.notes,
        items: srcItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          amount: item.amount,
          taxIncluded: item.tax_included ?? false,
          taxIncludedInput: item.unit_price,
        })),
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">
          {copyData ? '請求書 コピー作成' : '請求書 新規作成'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {copyData
            ? '元の請求書から内容をコピーしました。必要に応じて修正してください。'
            : '明細を入力して保存してください'}
        </p>
      </div>

      <InvoiceForm
        clients={clients}
        settings={settings}
        defaultInvoiceNumber={defaultInvoiceNumber}
        copyData={copyData}
      />
    </div>
  )
}
