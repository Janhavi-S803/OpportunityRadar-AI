import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { isTinyFishConfigured } from '@/lib/tinyfish/client';
import { runResearchAgent } from '@/lib/agents/research-agent';
import type { NormalizedOpportunity } from '@/lib/tinyfish/types';

const StartResearchSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters').max(1000),
  category: z.enum(['internship', 'research_internship', 'scholarship', 'fellowship', 'hackathon', 'job', 'competition', 'workshop', 'conference', 'program', 'other']).optional(),
  location: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const parsed = StartResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check TinyFish config
    if (!isTinyFishConfigured()) {
      return NextResponse.json(
        { error: 'TinyFish API key not configured. Add TINYFISH_API_KEY to your .env.local file.' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // For demo mode without auth, use a placeholder user ID
    const userId = user?.id || 'demo-user';

    const adminSupabase = createAdminSupabaseClient();

    // Create research job
    const { data: job, error: jobError } = await adminSupabase
      .from('research_jobs')
      .insert({
        user_id: userId,
        objective: parsed.data.objective,
        status: 'pending',
        category: parsed.data.category || null,
        location_filter: parsed.data.location || null,
        search_queries: [],
        opportunities_found: 0,
        opportunities_saved: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[Research API] Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create research job' }, { status: 500 });
    }

    // Start the research agent asynchronously
    runResearchInBackground(job.id, userId, parsed.data, adminSupabase);

    return NextResponse.json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    console.error('[Research API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function runResearchInBackground(
  jobId: string,
  userId: string,
  params: z.infer<typeof StartResearchSchema>,
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>
) {
  const addEvent = async (type: string, message: string, data?: Record<string, unknown>) => {
    await adminSupabase.from('research_events').insert({
      job_id: jobId,
      event_type: type,
      message,
      data: data || null,
    });
  };

  const updateStatus = async (status: string, extra?: Record<string, unknown>) => {
    await adminSupabase.from('research_jobs').update({
      status,
      ...extra,
      ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
      ...(status === 'searching' ? { started_at: new Date().toISOString() } : {}),
    }).eq('id', jobId);
  };

  try {
    await updateStatus('searching');

    const opportunities = await runResearchAgent(
      {
        text: params.objective,
        category: params.category,
        location: params.location,
      },
      jobId,
      async (progress) => {
        await updateStatus(progress.status, {});
        await addEvent(progress.status, progress.message, progress.data as Record<string, unknown>);
      }
    );

    // Save opportunities to database
    await updateStatus('saving');
    await addEvent('saving', `Saving ${opportunities.length} validated opportunities...`);

    let savedCount = 0;
    for (const opp of opportunities) {
      try {
        const { data: savedOpp } = await adminSupabase
          .from('opportunities')
          .upsert({
            title: opp.title || 'Untitled',
            organization: opp.organization || 'Unknown',
            type: opp.type || 'other',
            description: opp.description || null,
            eligibility: opp.eligibility || null,
            deadline: opp.deadline || null,
            deadline_is_estimated: opp.deadline_is_estimated ?? true,
            start_date: opp.start_date || null,
            duration: opp.duration || null,
            location: opp.location || null,
            work_mode: opp.work_mode || 'not_specified',
            stipend: opp.stipend || null,
            is_paid: opp.is_paid || false,
            benefits: opp.benefits || null,
            required_documents: opp.required_documents || null,
            application_procedure: opp.application_procedure || null,
            application_url: opp.application_url || null,
            source_url: opp.source_url,
            verification_status: opp.verification_status || 'needs_verification',
            last_verified: opp.last_verified || new Date().toISOString(),
            is_demo: false,
          }, {
            onConflict: 'organization,title,source_url',
            ignoreDuplicates: true,
          })
          .select('id')
          .single();

        if (savedOpp) {
          // Save opportunity skills
          if (opp.required_skills && opp.required_skills.length > 0) {
            await adminSupabase.from('opportunity_skills').upsert(
              opp.required_skills.map((skill) => ({
                opportunity_id: savedOpp.id,
                skill,
                is_required: true,
              })),
              { onConflict: 'opportunity_id,skill', ignoreDuplicates: true }
            );
          }
          savedCount++;
        }
      } catch (err) {
        console.error('[Research] Error saving opportunity:', err);
      }
    }

    await addEvent('completed', `Research complete! Found ${opportunities.length}, saved ${savedCount} unique opportunities.`, {
      total_found: opportunities.length,
      saved: savedCount,
    });

    await updateStatus('completed', {
      opportunities_found: opportunities.length,
      opportunities_saved: savedCount,
    });
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('[Research Agent] Background error:', err);
    await addEvent('error', errorMessage, {});
    await updateStatus('failed', { error_message: errorMessage });
  }
}
