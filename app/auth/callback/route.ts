// Supabase のメール確認リンク処理用 Route Handler
// ユーザーがメール内のリンクをクリックすると、ここにリダイレクトされる

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()

    // Supabase のコード交換（OTP検証）
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // メール確認成功 → ホームページにリダイレクト
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
