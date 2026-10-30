import { NextResponse } from 'next/server';
import { isTinyFishConfigured } from '@/lib/tinyfish/client';
import { isGeminiConfigured } from '@/lib/gemini/client';
import { isSupabaseConfigured } from '@/lib/utils';

export async function GET() {
  // Check Supabase
  let supabaseOk = false;
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from('opportunities').select('id', { count: 'exact', head: true }).limit(1);
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  // Check TinyFish by pinging search endpoint
  let tinyfishOk = false;
  try {
    if (isTinyFishConfigured()) {
      const res = await fetch('https://api.search.tinyfish.ai?q=test&limit=1', {
        headers: { 'X-API-Key': process.env.TINYFISH_API_KEY! },
        signal: AbortSignal.timeout(5000),
      });
      tinyfishOk = res.ok || res.status === 400; // 400 is valid (bad query) — key is still valid
    }
  } catch {
    tinyfishOk = false;
  }

  const geminiOk = isGeminiConfigured();

  return NextResponse.json({
    ok: supabaseOk && tinyfishOk && geminiOk,
    supabase: supabaseOk,
    tinyfish: tinyfishOk,
    gemini: geminiOk,
    timestamp: new Date().toISOString(),
  });
}
