// ブラウザ（クライアントサイド）からSupabaseに接続するためのクライアント
// 'use client' コンポーネントやブラウザ上で動くコードから使用する

import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアントを生成する関数
 *
 * なぜ createBrowserClient を使うか：
 * @supabase/ssr の createBrowserClient は、クッキーを使って
 * セッション管理を行うため、サーバー側との認証状態を同期できる。
 * 通常の createClient（@supabase/supabase-js）はローカルストレージを
 * 使うため、サーバーコンポーネントでは動作しない。
 */
export function createClient() {
  return createBrowserClient(
    // 環境変数が未設定の場合は早期エラーを出す
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
