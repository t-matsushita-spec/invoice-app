// 取引先一覧ページ（Server Component）
// Supabaseから取引先を全件取得してClient Componentに渡す

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import ClientList from './ClientList'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = await createClient()

  // 作成日時の降順で全件取得
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-700 font-bold mb-2">データ取得エラー</h2>
        <pre className="text-xs text-red-400">{error.message}</pre>
      </div>
    )
  }

  const clients = (data ?? []) as Client[]

  return (
    <div>
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">取引先一覧</h1>
          <p className="text-gray-500 text-sm mt-1">
            {clients.length}件登録されています
          </p>
        </div>
        {/* 新規作成ボタン */}
        <Link href="/clients/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#16304f] text-white">
            ＋ 新規作成
          </Button>
        </Link>
      </div>

      {/* 取引先テーブル（Client Component） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <ClientList initialClients={clients} />
      </div>
    </div>
  )
}
