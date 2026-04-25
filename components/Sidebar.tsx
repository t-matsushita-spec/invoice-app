// サイドバーナビゲーションコンポーネント
// アプリ全体のナビゲーションメニューを提供する

'use client' // usePathnameはクライアント側のフックなので必要

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// ナビゲーションメニューの項目の型定義
type NavItem = {
  label: string   // 表示テキスト
  href: string    // リンク先のパス
  icon: string    // アイコン（絵文字を使用してシンプルに）
}

// メニュー項目の定義（仕様書の画面一覧に対応）
const navItems: NavItem[] = [
  { label: '請求書一覧', href: '/', icon: '📄' },
  { label: '請求書作成', href: '/invoices/new', icon: '✏️' },
  { label: '取引先一覧', href: '/clients', icon: '🏢' },
  { label: '設定', href: '/settings', icon: '⚙️' },
]

/**
 * サイドバーコンポーネント
 *
 * なぜ usePathname でアクティブ判定するか：
 * 現在のURLパスと各メニューのhrefを比較することで、
 * 「今どのページにいるか」をユーザーに視覚的に伝える。
 * これはUXの基本であり、ナビゲーションの迷子防止になる。
 */
export default function Sidebar() {
  // 現在のURLパスを取得（アクティブメニューの強調表示に使用）
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ログアウト処理
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success('ログアウトしました')
      router.push('/auth/login')
      router.refresh()
    } catch (err) {
      console.error('ログアウトエラー:', err)
      toast.error('ログアウトに失敗しました')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: '#1e3a5f' }} // メインカラー：ネイビー
    >
      {/* ロゴ・タイトル領域 */}
      <div className="p-6 border-b border-white/20">
        <h1 className="text-white text-xl font-bold">yudegital</h1>
        <p className="text-white/60 text-sm mt-1">請求書管理</p>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            // 現在のパスがメニュー項目のhrefと一致するかを判定
            // '/'（トップ）は完全一致、それ以外はstartsWith で判定
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    text-sm font-medium transition-colors duration-150
                    ${isActive
                      ? 'bg-white text-[#1e3a5f]'          // アクティブ：白背景にネイビー文字
                      : 'text-white/80 hover:bg-white/10'  // 非アクティブ：透過ホバー
                    }
                  `}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* フッター：ログアウトボタン */}
      <div className="p-4 border-t border-white/20 space-y-3">
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          size="sm"
        >
          {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
        </Button>
        <p className="text-white/40 text-xs text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
