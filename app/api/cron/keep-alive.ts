export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    // Supabase REST API に簡単なクエリを実行（keep-alive）
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.statusText}`);
    }

    return Response.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Supabase keep-alive executed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Keep-alive error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
