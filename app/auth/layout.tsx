// 認証ページ用レイアウト
// 動的レンダリングを強制する（async関数でノンキャッシュ化）
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // async化してNext.jsに動的ページであることを明示
  // headersを読むことで、リクエストごとに異なる値を取得
  await headers()

  return children
}
