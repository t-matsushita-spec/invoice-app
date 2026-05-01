'use client'

// 請求書フォーム共通コンポーネント
// 新規作成・編集の両方で使う。明細の追加・削除・リアルタイム計算を管理する。

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Invoice, InvoiceItem, Client, Settings } from '@/types'

// ==============================
// 型定義
// ==============================

// フォームヘッダーの状態
type InvoiceFormData = {
  invoice_number: string
  client_id: string | null  // shadcn/ui SelectのonValueChangeがstring|nullを返すため
  issue_date: string
  due_date: string
  bank_info: string
  notes: string
}

// 明細1行分の状態（UIのkey用にローカルIDを持つ）
type ItemRow = {
  localId: string       // Reactのkey用（DBのidとは別物）
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number        // quantity × unit_price（自動計算・読み取り専用）
  taxIncluded: boolean
  taxIncludedInput: number
}

// コピー作成時に引き継ぐデータの型
export type CopyData = {
  client_id: string | null
  bank_info: string | null
  notes: string | null
  items: Omit<ItemRow, 'localId'>[]
}

// コンポーネントのprops型
type InvoiceFormProps = {
  // 編集時は既存データを渡す（新規作成時はundefined）
  invoice?: Invoice
  existingItems?: InvoiceItem[]
  // Server Componentで取得した参照データ
  clients: Client[]
  settings: Settings
  // 自動採番された請求書番号（Server Componentで生成）
  defaultInvoiceNumber: string
  // コピー作成時の初期データ（新規作成時のみ使用）
  copyData?: CopyData
}

// ==============================
// ユーティリティ関数
// ==============================

// 数値を3桁カンマ区切りにフォーマット
const formatCurrency = (value: number): string =>
  Math.floor(value).toLocaleString('ja-JP')

// 今日の日付をYYYY-MM-DD形式で返す
const today = (): string => new Date().toISOString().split('T')[0]

// 翌月末の日付をYYYY-MM-DD形式で返す
const nextMonthEnd = (): string => {
  const now = new Date()
  // 翌月の0日 = 今月の末日
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  return end.toISOString().split('T')[0]
}

// ユニークなローカルIDを生成（React keyに使用）
const generateLocalId = (): string =>
  Math.random().toString(36).slice(2)

// 空の明細行を生成
const emptyRow = (): ItemRow => ({
  localId: generateLocalId(),
  description: '',
  quantity: 1,
  unit: '式',
  unit_price: 0,
  amount: 0,
  taxIncluded: false,
  taxIncludedInput: 0,
})

// ==============================
// メインコンポーネント
// ==============================

export default function InvoiceForm({
  invoice,
  existingItems,
  clients,
  settings,
  defaultInvoiceNumber,
  copyData,
}: InvoiceFormProps) {
  const router = useRouter()
  const isEdit = !!invoice  // invoiceがあれば編集モード

  // ヘッダー情報のstate
  // 優先順位：編集データ > コピーデータ > デフォルト値
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: invoice?.invoice_number ?? defaultInvoiceNumber,
    client_id: invoice?.client_id ?? copyData?.client_id ?? '',
    issue_date: invoice?.issue_date ?? today(),                       // コピー時は本日に
    due_date: invoice?.due_date ?? nextMonthEnd(),                    // コピー時は翌月末に
    bank_info: invoice?.bank_info ?? copyData?.bank_info ?? settings.bank_info ?? '',
    notes: invoice?.notes ?? copyData?.notes ?? 'お振込手数料は御社ご負担にてお願い致します。',
  })

  // 明細行のstate（配列）
  // 優先順位：既存明細（編集） > コピーデータの明細 > 空行1つ
  const [items, setItems] = useState<ItemRow[]>(() => {
    if (existingItems && existingItems.length > 0) {
      return existingItems
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          localId: generateLocalId(),
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          amount: item.amount,
          taxIncluded: item.tax_included ?? false,
          taxIncludedInput: item.tax_included
            ? Math.round(item.unit_price * 1.1)
            : item.unit_price,
        }))
    }
    if (copyData?.items && copyData.items.length > 0) {
      // コピー時は明細をそのまま引き継ぐ
      return copyData.items.map((item) => ({
        localId: generateLocalId(),
        ...item,
        taxIncluded: false,
        taxIncludedInput: item.unit_price,
      }))
    }
    return [emptyRow()]
  })

  // 合計金額のstate
  const [subtotal, setSubtotal] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // 保存中フラグ
  const [isSaving, setIsSaving] = useState(false)

  // 請求書番号の重複エラー
  const [invoiceNumberError, setInvoiceNumberError] = useState('')

  // ==============================
  // 合計計算（useEffect）
  // ==============================
  // なぜuseEffectを使うか：
  // itemsが変わるたびに合計を再計算する副作用として定義することで、
  // 「明細を変えたら合計も変わる」という依存関係を明示できる。
  // useEffectの依存配列[items]が重要で、itemsが変わるたびだけ実行される。
  useEffect(() => {
    let newSubtotal = 0
    let newTax = 0

    items.forEach((item) => {
      if (item.taxIncluded) {
        // 税込入力モード：掛け算してから逆算
        const taxIncludedAmount = item.taxIncludedInput * item.quantity
        const taxExcludedAmount = Math.round(taxIncludedAmount / 1.1)
        const itemTax = taxIncludedAmount - taxExcludedAmount
        newSubtotal += taxExcludedAmount
        newTax += itemTax
      } else {
        // 税抜入力モード：既存ロジック
        newSubtotal += item.amount
        newTax += Math.round(item.amount * 0.1)
      }
    })

    setSubtotal(newSubtotal)
    setTaxAmount(newTax)
    setTotalAmount(newSubtotal + newTax)
  }, [items])

  // ==============================
  // ヘッダーフィールドの変更ハンドラー
  // ==============================
  const handleHeaderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === 'invoice_number') setInvoiceNumberError('')
  }

  // ==============================
  // 明細行の操作
  // ==============================

  // 明細フィールドの変更
  // なぜmap()で新配列を返すか（イミュータブル更新）：
  // Reactはstateの参照が変わったかどうかで再レンダリングを判断する。
  // items[index].field = value のような直接変更は参照が変わらないため
  // Reactが変化を検知できず画面が更新されない。
  // map()で「変更済みの新しい配列」を返すことで参照が変わり、
  // Reactが正しく再レンダリングする。
  const handleItemChange = useCallback(
    (
      index: number,
      field: keyof Omit<ItemRow, 'localId' | 'amount' | 'taxIncludedInput'>,
      value: string | number | boolean
    ) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item
          const updated = { ...item, [field]: value }

          // taxIncluded が切り替わった場合の処理
          if (field === 'taxIncluded') {
            if (value === true) {
              updated.taxIncludedInput = Math.round(updated.unit_price * 1.1)
            } else {
              updated.taxIncludedInput = updated.unit_price
            }
          }

          // 数量または単価が変わったら金額を再計算
          updated.amount = updated.quantity * updated.unit_price
          return updated
        })
      )
    },
    []
  )

  // 税込入力欄専用のハンドラー（taxIncludedInput を更新、計算は useEffect で行う）
  const handleTaxIncludedPriceChange = useCallback(
    (index: number, taxIncludedValue: number) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item
          return {
            ...item,
            taxIncludedInput: taxIncludedValue,
            // amountはuseEffectで計算するため、ここでは更新しない
          }
        })
      )
    },
    []
  )

  // 明細行を追加
  const addItem = () => {
    setItems((prev) => [...prev, emptyRow()])
  }

  // 明細行を削除（最低1行は残す）
  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('明細は最低1行必要です')
      return
    }
    // filterで該当インデックスを除いた新配列を作成（イミュータブル更新）
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // ==============================
  // 保存処理
  // ==============================
  const handleSave = async (redirectTo: 'list' | 'detail') => {
    // 最低限のバリデーション
    if (!formData.invoice_number.trim()) {
      setInvoiceNumberError('請求書番号は必須です')
      return
    }
    if (!formData.client_id || formData.client_id === '') {
      toast.error('取引先を選択してください')
      return
    }
    if (items.some((item) => !item.description.trim())) {
      toast.error('品目・内容を入力してください')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      // 保存するinvoiceデータ
      const invoicePayload = {
        invoice_number: formData.invoice_number.trim(),
        client_id: formData.client_id || null,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        status: invoice?.status ?? 'draft',
        subtotal,
        tax_rate: 0.10,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        bank_info: formData.bank_info || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      }

      let savedInvoiceId: string

      if (isEdit && invoice) {
        // ===== 編集モード =====
        const { error: updateError } = await supabase
          .from('invoices')
          .update(invoicePayload)
          .eq('id', invoice.id)
        if (updateError) {
          // 重複エラーの判定
          if (updateError.code === '23505') {
            setInvoiceNumberError('この請求書番号は既に使われています')
            return
          }
          throw updateError
        }

        // 明細を全削除→再INSERT
        // なぜ全削除→再INSERTにするか：
        // 行の追加・削除・並び替えが混在すると差分管理が複雑になる。
        // 全削除→再INSERTはシンプルで確実。小規模アプリでは十分な方法。
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id)
        if (deleteError) throw deleteError

        savedInvoiceId = invoice.id
      } else {
        // ===== 新規作成モード =====
        // user_id を取得して payload に追加（RLS対応）
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          toast.error('ユーザー認証が必要です。ログインしてください。')
          return
        }

        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({ ...invoicePayload, user_id: user.id })
          .select('id')
          .single()
        if (insertError) {
          if (insertError.code === '23505') {
            setInvoiceNumberError('この請求書番号は既に使われています')
            return
          }
          throw insertError
        }
        savedInvoiceId = newInvoice.id

        // 新規作成時のみ連番をインクリメント
        const { error: seqError } = await supabase
          .from('settings')
          .update({ next_invoice_seq: settings.next_invoice_seq + 1 })
          .eq('id', settings.id)
        if (seqError) throw seqError
      }

      // 明細をINSERT
      const itemsPayload = items.map((item, index) => ({
        invoice_id: savedInvoiceId,
        sort_order: index,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_included: item.taxIncluded,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload)
      if (itemsError) throw itemsError

      toast.success(isEdit ? '請求書を更新しました' : '請求書を作成しました')

      // リダイレクト先を切り替え
      if (redirectTo === 'list') {
        router.push('/invoices')
      } else {
        router.push(`/invoices/${savedInvoiceId}`)
      }
      router.refresh()
    } catch (err) {
      console.error('請求書の保存に失敗しました:', err)
      toast.error('保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  // ==============================
  // レンダリング
  // ==============================
  return (
    <div className="space-y-8">

      {/* ===== ヘッダー情報 ===== */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#1e3a5f] mb-5">基本情報</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">

          {/* 請求書番号 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              請求書番号 <span className="text-red-500">*</span>
            </Label>
            <Input
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleHeaderChange}
              placeholder="例：INV-2024-001"
              className={invoiceNumberError ? 'border-red-500' : ''}
            />
            {invoiceNumberError && (
              <p className="text-xs text-red-500">{invoiceNumberError}</p>
            )}
          </div>

          {/* 取引先 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              取引先 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, client_id: value }))
              }
            >
              {/* Base UIのSelectValueはvalue（UUID）を表示してしまうため、
                  client_idに対応する取引先名をclients配列から検索して直接表示する */}
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formData.client_id
                    ? (clients.find((c) => c.id === formData.client_id)?.name ?? '取引先を選択してください')
                    : '取引先を選択してください'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 発行日 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">発行日</Label>
            <Input
              type="date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleHeaderChange}
            />
          </div>

          {/* 支払期限 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">支払期限</Label>
            <Input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleHeaderChange}
            />
          </div>
        </div>
      </section>

      {/* ===== 明細テーブル ===== */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#1e3a5f] mb-5">明細</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-3 py-2 font-medium w-[35%]">品目・内容</th>
                <th className="text-right px-3 py-2 font-medium w-[10%]">数量</th>
                <th className="text-left px-3 py-2 font-medium w-[10%]">単位</th>
                <th className="text-right px-3 py-2 font-medium w-[18%]">単価</th>
                <th className="text-right px-3 py-2 font-medium w-[18%]">金額</th>
                <th className="px-3 py-2 w-[9%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={item.localId}>
                  {/* 品目・内容 */}
                  <td className="px-3 py-2">
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                      placeholder="例：Webサイト制作"
                      className="h-8 text-sm"
                    />
                  </td>
                  {/* 数量 */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-sm text-right"
                    />
                  </td>
                  {/* 単位 */}
                  <td className="px-3 py-2">
                    <Input
                      value={item.unit}
                      onChange={(e) =>
                        handleItemChange(index, 'unit', e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </td>
                  {/* 単価（税込入力モード対応） */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <Input
                        type="number"
                        min="0"
                        value={item.taxIncluded ? item.taxIncludedInput : item.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          if (item.taxIncluded) {
                            handleTaxIncludedPriceChange(index, val)
                          } else {
                            handleItemChange(index, 'unit_price', val)
                          }
                        }}
                        className={cn(
                          'h-8 text-sm text-right',
                          item.taxIncluded && 'bg-amber-50 border-amber-300'
                        )}
                      />
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`tax-included-${item.localId}`}
                          checked={item.taxIncluded}
                          onCheckedChange={(checked) =>
                            handleItemChange(index, 'taxIncluded', checked === true)
                          }
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`tax-included-${item.localId}`}
                          className="text-xs text-gray-500 cursor-pointer select-none"
                        >
                          税込入力
                        </label>
                      </div>
                      {item.taxIncluded && (
                        <p className="text-xs text-amber-600">
                          （税抜小計: ¥{formatCurrency(
                            Math.round((item.taxIncludedInput * item.quantity) / 1.1)
                          )}）
                        </p>
                      )}
                    </div>
                  </td>
                  {/* 金額（自動計算・読み取り専用） */}
                  <td className="px-3 py-2 text-right font-medium text-gray-700">
                    ¥
                    {formatCurrency(
                      item.taxIncluded
                        ? item.taxIncludedInput * item.quantity
                        : item.amount
                    )}
                  </td>
                  {/* 削除ボタン */}
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                      title="この行を削除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 明細追加ボタン */}
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm text-[#1e3a5f] hover:underline font-medium"
        >
          ＋ 明細を追加
        </button>

        {/* 合計欄 */}
        <div className="mt-6 border-t border-gray-200 pt-4 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm text-gray-600">
            <span>小計（税抜）</span>
            <span>¥{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>消費税（10%）</span>
            <span>¥{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#1e3a5f] border-t border-gray-300 pt-2">
            <span>合計金額</span>
            <span>¥{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </section>

      {/* ===== その他フィールド ===== */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#1e3a5f] mb-5">振込先・備考</h2>
        <div className="space-y-5">
          {/* 振込先 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">振込先</Label>
            <Textarea
              name="bank_info"
              value={formData.bank_info}
              onChange={handleHeaderChange}
              rows={3}
              placeholder="設定から自動挿入されます"
            />
          </div>
          {/* 備考 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">備考</Label>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleHeaderChange}
              rows={3}
              placeholder="例：請求書発行より30日以内にお振込みをお願いいたします。"
            />
          </div>
        </div>
      </section>

      {/* ===== 保存ボタン ===== */}
      <div className="flex gap-3 pb-8">
        <Button
          type="button"
          onClick={() => handleSave('list')}
          disabled={isSaving}
          variant="outline"
          className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white px-6"
        >
          {isSaving ? '保存中...' : '保存（下書き）'}
        </Button>
        <Button
          type="button"
          onClick={() => handleSave('detail')}
          disabled={isSaving}
          className="bg-[#1e3a5f] hover:bg-[#16304f] text-white px-6"
        >
          {isSaving ? '保存中...' : '保存して確認へ →'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/invoices')}
          disabled={isSaving}
        >
          キャンセル
        </Button>
      </div>
    </div>
  )
}
