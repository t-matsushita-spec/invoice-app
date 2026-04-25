// 認証ページ用レイアウト
// Middleware でリダイレクトするため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
