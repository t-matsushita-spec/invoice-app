'use client'

// Supabase Auth による新規登録画面
// メール・パスワードで新しいアカウントを作成

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // バリデーション
  const validate = (): boolean => {
    const newErrors: {
      email?: string
      password?: string
      confirmPassword?: string
    } = {}

    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!email.includes('@')) {
      newErrors.email = '正しいメールアドレスを入力してください'
    }

    if (!password) {
      newErrors.password = 'パスワードを入力してください'
    } else if (password.length < 6) {
      newErrors.password = 'パスワードは6文字以上です'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'パスワードを確認してください'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 登録処理
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('このメールアドレスは既に登録されています')
        } else {
          toast.error('登録に失敗しました')
        }
        return
      }

      toast.success('登録しました。ログインしてください。')
      // 登録成功後、ログインページへリダイレクト
      router.push('/auth/login')
    } catch (err) {
      console.error('登録エラー:', err)
      toast.error('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* ロゴ・タイトル */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">請求書管理アプリ</h1>
          <p className="mt-2 text-gray-600">新しいアカウントを作成</p>
        </div>

        {/* 登録フォーム */}
        <form onSubmit={handleSignup} className="space-y-6">
          {/* メールアドレス */}
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              className="mt-2"
              placeholder="example@example.com"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* パスワード */}
          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
              パスワード
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
              }}
              className="mt-2"
              placeholder="••••••"
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* パスワード確認 */}
          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              パスワード（確認）
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: undefined })
              }}
              className="mt-2"
              placeholder="••••••"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* 登録ボタン */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '登録中...' : '新規登録'}
          </Button>
        </form>

        {/* ログインリンク */}
        <p className="text-center text-sm text-gray-600">
          既にアカウントをお持ちですか？{' '}
          <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            ログイン
          </a>
        </p>
      </div>
    </div>
  )
}
