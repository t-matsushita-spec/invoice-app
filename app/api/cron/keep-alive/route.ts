import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Vercel Cron Jobs のセキュリティ検証
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // RLSをバイパスしてDBに確実にアクセスするためサービスロールキーを優先使用
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseKey

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { success: false, error: 'Supabase credentials not configured' },
      { status: 500 }
    )
  }

  const results: Array<{ endpoint: string; status?: number; ok?: boolean; error?: string; body?: string }> = []

  // 1. REST API ping（service role keyでRLSをバイパス → 確実にDBアクセス）
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=id&limit=1`,
      {
        headers: {
          apikey: serviceKey!,
          Authorization: `Bearer ${serviceKey}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    const body = !response.ok ? await response.text() : undefined
    results.push({ endpoint: 'REST API', status: response.status, ok: response.ok, body })
  } catch (e) {
    results.push({ endpoint: 'REST API', error: e instanceof Error ? e.message : String(e) })
  }

  // 2. Auth ヘルスチェック（プロジェクトが起動しているか確認）
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey },
      signal: AbortSignal.timeout(10000),
    })
    results.push({ endpoint: 'Auth health', status: response.status, ok: response.ok })
  } catch (e) {
    results.push({ endpoint: 'Auth health', error: e instanceof Error ? e.message : String(e) })
  }

  const hasError = results.some(r => r.error || !r.ok)

  console.log('[keep-alive]', JSON.stringify({ results, timestamp: new Date().toISOString() }))

  return Response.json(
    {
      success: !hasError,
      timestamp: new Date().toISOString(),
      usingServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      message: hasError ? 'One or more pings failed' : 'Supabase keep-alive executed successfully',
      results,
    },
    { status: hasError ? 500 : 200 }
  )
}

export const runtime = 'nodejs'
