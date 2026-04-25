// /invoices へのアクセスはトップページ（請求書一覧）へリダイレクト
// 仕様では / がメインの一覧画面のため

import { redirect } from 'next/navigation'

export default function InvoicesRedirectPage() {
  redirect('/')
}
