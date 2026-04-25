import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase クライアントを作成（MiddleWare用）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions)
          })
        },
      },
    }
  )

  // 認証済みユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 保護されたパス（認証が必要）
  const protectedPaths = ['/', '/invoices', '/clients', '/settings']
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))

  // 認証なしで保護されたパスにアクセス → ログイン画面へリダイレクト
  if (!user && isProtectedPath) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みユーザーがログイン画面にアクセス → トップページへリダイレクト
  if (user && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/signup')) {
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    // 認証チェックが必要なパス
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
