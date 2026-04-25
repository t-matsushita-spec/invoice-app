// 取引先 新規作成ページ
// フォームコンポーネントをそのまま使う（clientプロップなし＝新規作成モード）

import ClientForm from '@/components/ClientForm'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">取引先 新規作成</h1>
        <p className="text-gray-500 text-sm mt-1">
          請求書の送付先となる取引先を登録します
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <ClientForm />
      </div>
    </div>
  )
}
