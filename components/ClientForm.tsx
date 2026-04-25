'use client'

// 取引先フォーム共通コンポーネント
// 新規作成・編集の両方で使い回せるように設計する

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Client } from '@/types'

// 編集時は既存データを受け取る（新規作成時はundefined）
type ClientFormProps = {
  client?: Client
}

// フォームの入力値の型（idとタイムスタンプは除く）
type ClientFormData = {
  name: string
  postal_code: string
  address: string
  contact_name: string
  email: string
  phone: string
}

// 郵便番号の正規表現（000-0000形式）
const POSTAL_CODE_REGEX = /^\d{3}-\d{4}$/

// メールアドレスの簡易正規表現
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()

  // 編集時は既存データで初期化、新規作成時は空文字で初期化
  const [formData, setFormData] = useState<ClientFormData>({
    name: client?.name ?? '',
    postal_code: client?.postal_code ?? '',
    address: client?.address ?? '',
    contact_name: client?.contact_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
  })

  // バリデーションエラーの管理
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({})

  // 保存中フラグ（二重送信防止）
  const [isSaving, setIsSaving] = useState(false)

  // 汎用フィールド変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // 入力されたらそのフィールドのエラーをクリア
    if (errors[name as keyof ClientFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // バリデーション処理
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {}

    // 取引先名は必須
    if (!formData.name.trim()) {
      newErrors.name = '取引先名は必須です'
    }

    // 郵便番号は入力された場合のみ形式チェック
    if (formData.postal_code && !POSTAL_CODE_REGEX.test(formData.postal_code)) {
      newErrors.postal_code = '000-0000の形式で入力してください'
    }

    // メールは入力された場合のみ形式チェック
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 保存処理（新規作成・編集を自動判別）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const supabase = createClient()

      // 空文字はnullとして保存（DBの一貫性を保つため）
      const payload = {
        name: formData.name.trim(),
        postal_code: formData.postal_code || null,
        address: formData.address || null,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        updated_at: new Date().toISOString(),
      }

      if (client) {
        // 編集モード：既存レコードをUPDATE
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id)
        if (error) throw error
        toast.success('取引先を更新しました')
      } else {
        // 新規作成モード：INSERT
        const { error } = await supabase
          .from('clients')
          .insert(payload)
        if (error) throw error
        toast.success('取引先を登録しました')
      }

      // 保存後は一覧へ戻る
      // なぜrouter.pushを使うか：
      // トースト通知を表示してからリダイレクトするため、
      // サーバーサイドのredirect()ではなくクライアント側のrouter.pushを使う。
      // redirect()は即時にページを変えるためトーストが見えなくなる。
      router.push('/clients')
      router.refresh() // Server Componentのキャッシュを更新して最新データを表示
    } catch (err) {
      console.error('取引先の保存に失敗しました:', err)
      toast.error('保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* 取引先名（必須） */}
      <FormField label="取引先名" htmlFor="name" required error={errors.name}>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="例：株式会社〇〇"
          className={errors.name ? 'border-red-500' : ''}
        />
      </FormField>

      {/* 担当者名 */}
      <FormField label="担当者名" htmlFor="contact_name">
        <Input
          id="contact_name"
          name="contact_name"
          value={formData.contact_name}
          onChange={handleChange}
          placeholder="例：山田 太郎"
        />
      </FormField>

      {/* メールアドレス */}
      <FormField label="メールアドレス" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="例：yamada@example.com"
          className={errors.email ? 'border-red-500' : ''}
        />
      </FormField>

      {/* 電話番号 */}
      <FormField label="電話番号" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="例：03-XXXX-XXXX"
          className="max-w-xs"
        />
      </FormField>

      {/* 郵便番号 */}
      <FormField label="郵便番号" htmlFor="postal_code" error={errors.postal_code}>
        <Input
          id="postal_code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleChange}
          placeholder="例：100-0001"
          className={`max-w-xs ${errors.postal_code ? 'border-red-500' : ''}`}
        />
      </FormField>

      {/* 住所 */}
      <FormField label="住所" htmlFor="address">
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="例：東京都千代田区..."
        />
      </FormField>

      {/* ボタン群 */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-[#1e3a5f] hover:bg-[#16304f] text-white px-8"
        >
          {isSaving ? '保存中...' : client ? '更新する' : '登録する'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/clients')}
          disabled={isSaving}
        >
          キャンセル
        </Button>
      </div>
    </form>
  )
}

// ==============================
// フォームフィールドラッパー（再利用コンポーネント）
// ==============================
type FormFieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ label, htmlFor, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {/* 必須マークを赤で表示 */}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
