import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  try {
    const adminSupabase = createAdminSupabaseClient();

    const [jobResult, eventsResult] = await Promise.all([
      adminSupabase.from('research_jobs').select('*').eq('id', jobId).single(),
      adminSupabase.from('research_events').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
    ]);

    if (jobResult.error || !jobResult.data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      job: jobResult.data,
      events: eventsResult.data || [],
    });
  } catch (err) {
    console.error('[Research Status API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
