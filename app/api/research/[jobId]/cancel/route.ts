import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  try {
    const adminSupabase = createAdminSupabaseClient();
    
    await adminSupabase.from('research_jobs').update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId).in('status', ['pending', 'searching', 'browsing', 'extracting', 'validating', 'saving']);

    await adminSupabase.from('research_events').insert({
      job_id: jobId,
      event_type: 'cancelled',
      message: 'Research job cancelled by user',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}
