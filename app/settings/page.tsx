// 設定ページ（Server Component）
// Supabaseからデータを取得してフォームコンポーネントに渡す

import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'
import type { Settings } from '@/types'

/**
 * 設定ページ
 *
 * なぜServer Componentにするか：
 * 初期データの取得はサーバー側で行うほうが
 * ・ページ表示時のローディングが不要（データ込みでHTMLが返ってくる）
 * ・APIキーをブラウザに露出しない
 * フォーム操作はClient ComponentのSettingsFormに委ねる
 */
export default async function SettingsPage() {
  const supabase = await createClient()

  // settingsテーブルから1件取得（このアプリは常に1レコード）
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()  // 1件のみ取得。0件・複数件の場合はerrorになる

  // DBエラーまたはレコードが存在しない場合
  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
        <h2 className="text-red-700 font-bold mb-2">データ取得エラー</h2>
        <p className="text-red-600 text-sm">
          設定データを取得できませんでした。<br />
          Supabaseの接続情報と、settingsテーブルに初期レコードがあるか確認してください。
        </p>
        {error && (
          <pre className="mt-2 text-xs text-red-400 bg-red-100 p-2 rounded">
            {error.message}
          </pre>
        )}
      </div>
    )
  }

  const settings = data as Settings

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">設定</h1>
        <p className="text-gray-500 text-sm mt-1">
          請求書に印刷される自社情報を入力してください
        </p>
      </div>

      {/* 設定フォーム（Client Component） */}
      <SettingsForm settings={settings} />
    </div>
  )
}
