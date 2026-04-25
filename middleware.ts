import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /auth で始まるパス（ログイン・登録ページ）は常に許可
  if (pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // その他のパス：クッキーに認証トークンがあるか確認
  const authToken = request.cookies.get('sb-auth-token') ||
                    request.cookies.get('sb-refresh-token')

  // トークンがない場合はログイン画面へリダイレクト
  if (!authToken) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 認証チェックが必要なすべてのパス
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
// Force redeploy
