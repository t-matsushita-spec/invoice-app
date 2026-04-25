// アプリ全体に適用される共通レイアウト
// サイドバー付きの2カラム構成を定義する

import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/sonner'

// 日本語フォントの設定
// なぜNoto Sans JPを使うか：
// 請求書などのビジネス文書は日本語表示の品質が重要。
// Noto Sans JPはGoogleが提供する高品質な日本語フォントで、
// PDF出力時も安定して動作する。
// なぜpreload: false にするか：
// 日本語は文字数が膨大なため、全文字をpreloadすると
// パフォーマンスが大幅に低下する。swap + preload:false が定石。
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
})

// ブラウザタブやSEOに使われるメタデータ
export const metadata: Metadata = {
  title: '請求書管理 | yudegital',
  description: 'yudegital 請求書作成・管理システム',
}

// RootLayoutはすべてのページを包むコンポーネント
// childrenには各ページのコンテンツが入る
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        {/* サイドバー + メインコンテンツの2カラムレイアウト */}
        <div className="flex h-full">
          {/* 左：固定サイドバー */}
          <Sidebar />

          {/* 右：スクロール可能なメインエリア */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* トースト通知のコンテナ（画面右下に表示） */}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
