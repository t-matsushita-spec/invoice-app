// 取引先 編集ページ（Server Component）
// URLの[id]パラメータで取引先を取得してフォームに渡す

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientForm from '@/components/ClientForm'
import type { Client } from '@/types'

// なぜparamsをawaitするか：
// Next.js 15以降、動的ルートのparamsはPromiseとして渡されるため
// awaitで解決してから使う必要がある
type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // URLのidで取引先を1件取得
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  // 取引先が見つからない場合は404ページを表示
  if (error || !data) {
    notFound()
  }

  const client = data as Client

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">取引先 編集</h1>
        <p className="text-gray-500 text-sm mt-1">
          {client.name} の情報を編集します
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {/* clientを渡すと編集モードで動作する */}
        <ClientForm client={client} />
      </div>
    </div>
  )
}
