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

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { success: false, error: 'Supabase credentials not configured' },
      { status: 500 }
    )
  }

  const results: Array<{ endpoint: string; status?: number; ok?: boolean; error?: string }> = []

  // 1. REST API ping（invoicesテーブル）
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    results.push({ endpoint: 'REST API', status: response.status, ok: response.ok })
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

  return Response.json(
    {
      success: !hasError,
      timestamp: new Date().toISOString(),
      message: hasError ? 'One or more pings failed' : 'Supabase keep-alive executed successfully',
      results,
    },
    { status: hasError ? 500 : 200 }
  )
}

export const runtime = 'nodejs'
