import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // クッキーから認証トークンの有無をチェック（簡略化版）
  const authToken = request.cookies.get('sb-auth-token') ||
                    request.cookies.get('sb-refresh-token') ||
                    (request.cookies.get('sb-')?.value ? request.cookies.get('sb-') : null)

  const hasAuth = !!authToken

  const pathname = request.nextUrl.pathname

  // 保護されたパス（認証が必要）
  const protectedPaths = ['/', '/invoices', '/clients', '/settings']
  const isProtectedPath = protectedPaths.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // 認証なしで保護されたパスにアクセス → ログイン画面へリダイレクト
  if (!hasAuth && isProtectedPath) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みユーザーがログイン画面にアクセス → トップページへリダイレクト
  if (hasAuth && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 認証チェックが必要なパス
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
