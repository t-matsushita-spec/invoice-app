// サーバーサイド（Server Components・Route Handlers・Server Actions）から
// Supabaseに接続するためのクライアント

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * サーバー用Supabaseクライアントを生成する非同期関数
 *
 * なぜ非同期（async）にするか：
 * Next.js 15からcookies()がPromiseを返すようになったため、
 * awaitが必要。また、cookiesはリクエストごとに異なるため、
 * 毎回新しいクライアントを生成する必要がある。
 *
 * なぜ getCookie/setCookie を明示的に実装するか：
 * サーバーコンポーネントはHTTPのリクエスト/レスポンスヘッダーを
 * 直接操作できないため、Next.jsのcookiesヘルパーを橋渡しとして使う。
 */
export async function createClient() {
  // Next.jsのcookieストアを取得（認証トークンの読み書きに使用）
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabaseがクッキーを読み取る際に呼ばれる
        getAll() {
          return cookieStore.getAll()
        },
        // Supabaseがクッキーを書き込む際に呼ばれる
        // Server Componentでは書き込みは実際には無視される（読み取り専用）
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentからの呼び出しではset操作が失敗することがある
            // Route HandlerやServer Actionでは正常に動作する
          }
        },
      },
    }
  )
}
