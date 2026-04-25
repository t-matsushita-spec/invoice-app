'use client'

// ステータス変更・操作ボタンのClient Component
// PDFダウンロード・ステータス変更などのインタラクションを担当する

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { InvoiceStatus } from '@/types'

type StatusActionsProps = {
  invoiceId: string
  currentStatus: InvoiceStatus
  invoiceNumber: string
  clientName: string
}

// ステータス遷移の定義（draft → sent → paid の一方向のみ）
const NEXT_STATUS: Partial<Record<InvoiceStatus, { next: InvoiceStatus; label: string }>> = {
  draft: { next: 'sent', label: '送付済にする' },
  sent:  { next: 'paid', label: '入金済にする' },
}

export default function StatusActions({
  invoiceId,
  currentStatus,
  invoiceNumber,
  clientName,
}: StatusActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // ==============================
  // PDFダウンロード（html2canvas-pro + jsPDF を直接使用）
  // ==============================
  // html2pdf.js は html2canvas を CJS require() で受け取るため、
  // ESM default export である html2canvas-pro と互換しない。
  // 回避策：html2pdf.js を介さず、ESM import で html2canvas-pro と jsPDF を
  // 直接使用することで正しくデフォルトエクスポートが解決される。
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const element = document.getElementById('invoice-preview')
      if (!element) throw new Error('invoice-preview が見つかりません')

      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const margin = 10
      const contentW = pageW - margin * 2
      const contentH = (canvas.height * contentW) / canvas.width

      pdf.addImage(imgData, 'JPEG', margin, margin, contentW, contentH)
      pdf.save(`請求書_${clientName}_${invoiceNumber}.pdf`)
    } catch (err) {
      console.error('PDF生成に失敗しました:', err)
      toast.error('PDF生成に失敗しました。もう一度お試しください。')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // ==============================
  // ステータス変更処理
  // ==============================
  const handleStatusChange = async () => {
    const transition = NEXT_STATUS[currentStatus]
    if (!transition) return

    const confirmed = window.confirm(
      `ステータスを「${transition.label.replace('にする', '')}」に変更してよいですか？`
    )
    if (!confirmed) return

    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('invoices')
        .update({
          status: transition.next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success(`ステータスを「${transition.label.replace('にする', '')}」に変更しました`)
      router.refresh()
    } catch (err) {
      console.error('ステータス変更に失敗しました:', err)
      toast.error('ステータス変更に失敗しました。もう一度お試しください。')
    } finally {
      setIsUpdating(false)
    }
  }

  const transition = NEXT_STATUS[currentStatus]

  return (
    // print:hidden で印刷・PDF出力時にボタンエリアを非表示にする
    <div className="flex gap-3 mb-8 print:hidden">

      {/* PDFダウンロードボタン（html2canvas-pro で oklch() に対応） */}
      <Button
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
      >
        {isGeneratingPdf ? '生成中...' : '📥 PDFダウンロード'}
      </Button>

      {/* 編集ボタン */}
      <Link href={`/invoices/${invoiceId}/edit`}>
        <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
          ✏️ 編集する
        </Button>
      </Link>

      {/* ステータス変更ボタン（paidの場合は非表示） */}
      {transition && (
        <Button
          onClick={handleStatusChange}
          disabled={isUpdating}
          className="bg-[#1e3a5f] hover:bg-[#16304f] text-white"
        >
          {isUpdating ? '変更中...' : transition.label}
        </Button>
      )}

      {/* 一覧へ戻る */}
      <Link href="/" className="ml-auto">
        <Button variant="ghost" className="text-gray-500">
          ← 一覧へ
        </Button>
      </Link>
    </div>
  )
}
