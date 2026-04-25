'use client'

// Supabase Auth によるログイン画面
// メール・パスワードでログイン、または新規登録へのリンク

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // バリデーション
  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('メールアドレスまたはパスワードが正しくありません')
        } else {
          toast.error('ログインに失敗しました')
        }
        return
      }

      toast.success('ログインしました')
      // ログイン成功後、トップページへリダイレクト
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('ログインエラー:', err)
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
          <p className="mt-2 text-gray-600">ログインしてください</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-6">
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

          {/* ログインボタン */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        {/* 登録リンク */}
        <p className="text-center text-sm text-gray-600">
          アカウントをお持ちでないですか？{' '}
          <a href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            新規登録
          </a>
        </p>
      </div>
    </div>
  )
}
