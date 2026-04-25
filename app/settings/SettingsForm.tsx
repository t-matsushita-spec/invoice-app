'use client'

// 設定フォームコンポーネント（クライアントサイド）
// フォームの状態管理・バリデーション・保存処理を担当する

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Settings, SettingsUpdate } from '@/types'

// フォームコンポーネントのprops型
type SettingsFormProps = {
  settings: Settings  // 初期値はServer Componentで取得してpropsとして受け取る
}

// インボイス登録番号のバリデーション用正規表現
// 「T」+ 13桁の数字 という形式
const INVOICE_NUMBER_REGEX = /^T\d{13}$/

export default function SettingsForm({ settings }: SettingsFormProps) {
  // フォームの値をstateで管理
  // なぜuseStateで個別管理せずオブジェクトにするか：
  // 項目が多いため、1つのオブジェクトにまとめることで
  // ハンドラーを汎用化でき、コードの重複を防げる
  const [formData, setFormData] = useState<SettingsUpdate>({
    company_name: settings.company_name ?? '',
    owner_name: settings.owner_name ?? '',
    postal_code: settings.postal_code ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    invoice_number: settings.invoice_number ?? '',
    bank_info: settings.bank_info ?? '',
  })

  // バリデーションエラーを管理するstate
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsUpdate, string>>>({})

  // 保存中フラグ（二重送信防止）
  const [isSaving, setIsSaving] = useState(false)

  // 汎用的なフィールド変更ハンドラー
  // なぜComputed Property Names（[name]）を使うか：
  // フィールドごとにhandleChange関数を作ると重複が多くなるため、
  // name属性をキーにして1つのハンドラーで全フィールドに対応する
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // 入力されたらそのフィールドのエラーをクリア
    if (errors[name as keyof SettingsUpdate]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // フォームのバリデーション
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SettingsUpdate, string>> = {}

    // インボイス登録番号は入力された場合のみバリデーション（任意項目）
    if (formData.invoice_number && !INVOICE_NUMBER_REGEX.test(formData.invoice_number)) {
      newErrors.invoice_number = 'T＋13桁の数字で入力してください（例：T1234567890123）'
    }

    setErrors(newErrors)
    // エラーがなければtrue
    return Object.keys(newErrors).length === 0
  }

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション失敗時は保存しない
    if (!validate()) return

    setIsSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('settings')
        .update({
          ...formData,
          // 空文字はnullに変換して保存（DBの一貫性を保つため）
          company_name: formData.company_name || null,
          owner_name: formData.owner_name || null,
          postal_code: formData.postal_code || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          invoice_number: formData.invoice_number || null,
          bank_info: formData.bank_info || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)  // 固定の1レコードをIDで指定してupdate

      if (error) throw error

      toast.success('設定を保存しました')
    } catch (err) {
      console.error('設定の保存に失敗しました:', err)
      toast.error('保存に失敗しました。もう一度お試しください。')
    } finally {
      // 成功・失敗どちらでもローディング状態を解除
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* 屋号・事業者名 */}
      <FormField
        label="屋号・事業者名"
        htmlFor="company_name"
      >
        <Input
          id="company_name"
          name="company_name"
          value={formData.company_name ?? ''}
          onChange={handleChange}
          placeholder="例：yudegital"
        />
      </FormField>

      {/* 代表者名 */}
      <FormField label="代表者名" htmlFor="owner_name">
        <Input
          id="owner_name"
          name="owner_name"
          value={formData.owner_name ?? ''}
          onChange={handleChange}
          placeholder="例：松下 朋弘"
        />
      </FormField>

      {/* 郵便番号 */}
      <FormField label="郵便番号" htmlFor="postal_code">
        <Input
          id="postal_code"
          name="postal_code"
          value={formData.postal_code ?? ''}
          onChange={handleChange}
          placeholder="例：253-0061"
          className="max-w-xs"
        />
      </FormField>

      {/* 住所 */}
      <FormField label="住所" htmlFor="address">
        <Input
          id="address"
          name="address"
          value={formData.address ?? ''}
          onChange={handleChange}
          placeholder="例：神奈川県茅ヶ崎市..."
        />
      </FormField>

      {/* 電話番号 */}
      <FormField label="電話番号" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          value={formData.phone ?? ''}
          onChange={handleChange}
          placeholder="例：0467-XX-XXXX"
          className="max-w-xs"
        />
      </FormField>

      {/* メールアドレス */}
      <FormField label="メールアドレス" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email ?? ''}
          onChange={handleChange}
          placeholder="例：t-matsushita@yudegital.com"
        />
      </FormField>

      {/* インボイス登録番号（バリデーションあり） */}
      <FormField
        label="インボイス登録番号"
        htmlFor="invoice_number"
        error={errors.invoice_number}
        hint="適格請求書発行事業者の登録番号（T＋13桁）"
      >
        <Input
          id="invoice_number"
          name="invoice_number"
          value={formData.invoice_number ?? ''}
          onChange={handleChange}
          placeholder="例：T1234567890123"
          className={`max-w-xs ${errors.invoice_number ? 'border-red-500' : ''}`}
        />
      </FormField>

      {/* 振込先銀行口座 */}
      <FormField
        label="振込先銀行口座"
        htmlFor="bank_info"
        hint="請求書に記載される振込先情報"
      >
        <Textarea
          id="bank_info"
          name="bank_info"
          value={formData.bank_info ?? ''}
          onChange={handleChange}
          placeholder={'例：湘南信用金庫 茅ヶ崎支店\n普通 1234567\n口座名義：マツシタ トモヒロ'}
          rows={4}
        />
      </FormField>

      {/* 保存ボタン */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-[#1e3a5f] hover:bg-[#16304f] text-white px-8"
        >
          {isSaving ? '保存中...' : '保存する'}
        </Button>
      </div>
    </form>
  )
}

// ==============================
// 再利用可能なフォームフィールドラッパー
// ==============================

// なぜFormFieldを分けるか：
// Label・エラー表示・ヒントテキストの組み合わせは毎フィールドで共通。
// コンポーネントに切り出すことで、各フィールドのJSXがスッキリする。

type FormFieldProps = {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}

function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
