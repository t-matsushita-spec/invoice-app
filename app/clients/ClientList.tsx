'use client'

// 取引先一覧のClient Component
// 削除処理（ユーザーインタラクション）があるためClient Componentにする

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Client } from '@/types'

type ClientListProps = {
  initialClients: Client[]
}

export default function ClientList({ initialClients }: ClientListProps) {
  const router = useRouter()

  // ローカルで表示リストを管理（削除後にUI即時反映するため）
  // なぜstateで管理するか：
  // 削除後にrouter.refresh()するとServer Componentが再取得するが、
  // ネットワークラグで一瞬古いデータが見えることがある。
  // ローカルstateから即座に該当行を除くことでUXをスムーズにする。
  const [clients, setClients] = useState<Client[]>(initialClients)

  // 削除処理
  const handleDelete = async (client: Client) => {
    // window.confirmで確認ダイアログを表示
    // なぜconfirmを使うか：
    // 削除は取り消しができない操作のため、必ず意図確認が必要。
    // shadcn/uiのDialogでも実装できるが、confirmの方が実装がシンプルで
    // 誤操作防止という目的は十分に果たせる。
    const confirmed = window.confirm(
      `「${client.name}」を削除してよいですか？\nこの操作は取り消せません。`
    )
    if (!confirmed) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (error) throw error

      // ローカルのリストから即座に除外してUIを更新
      setClients((prev) => prev.filter((c) => c.id !== client.id))
      toast.success(`「${client.name}」を削除しました`)
      router.refresh() // Server Componentのキャッシュも更新
    } catch (err) {
      console.error('取引先の削除に失敗しました:', err)
      toast.error('削除に失敗しました。もう一度お試しください。')
    }
  }

  // 取引先が0件の場合の表示
  if (clients.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-4">🏢</p>
        <p className="text-lg font-medium mb-2">取引先がまだ登録されていません</p>
        <p className="text-sm">右上の「新規作成」から登録してください</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#1e3a5f] text-white">
            <th className="text-left px-4 py-3 font-medium">取引先名</th>
            <th className="text-left px-4 py-3 font-medium">担当者名</th>
            <th className="text-left px-4 py-3 font-medium">メールアドレス</th>
            <th className="text-left px-4 py-3 font-medium">電話番号</th>
            <th className="px-4 py-3 font-medium w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr
              key={client.id}
              // ゼブラストライプ：偶数行に薄いグレー背景
              className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-800">
                {client.name}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {client.contact_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {client.email ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {client.phone ?? '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 justify-center">
                  {/* 編集ボタン */}
                  <Link href={`/clients/${client.id}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-3"
                    >
                      編集
                    </Button>
                  </Link>
                  {/* 削除ボタン */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(client)}
                    className="text-xs h-7 px-3 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    削除
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
