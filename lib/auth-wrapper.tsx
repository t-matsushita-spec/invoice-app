import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// 保護されたページ用ラッパー
// 認証していないユーザーをログイン画面にリダイレクト
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return user
}
