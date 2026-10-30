import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateMatchScore, assessEligibility, generateAIAnalysis } from '@/lib/recommendations/scorer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ opportunityId: string }> }
) {
  const { opportunityId } = await params;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminSupabase = createAdminSupabaseClient();

    // Get opportunity
    const { data: opp } = await adminSupabase
      .from('opportunities')
      .select('*, opportunity_skills(skill)')
      .eq('id', opportunityId)
      .single();

    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    // Get user profile (use defaults if not authenticated)
    let userProfile = {
      skills: [] as string[],
      education: { degree: null as string | null, branch: null as string | null, current_year: null as number | null, graduation_year: null as number | null, cgpa: null as number | null },
      interests: [] as string[],
      preferences: { opportunity_types: [] as string[], preferred_countries: [] as string[], work_mode_preference: [] as string[], paid_preference: 'both', min_stipend: null as number | null },
    };

    if (user) {
      const [profile, skills, prefs] = await Promise.all([
        adminSupabase.from('profiles').select('*').eq('user_id', user.id).single(),
        adminSupabase.from('user_skills').select('skill').eq('user_id', user.id),
        adminSupabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
      ]);

      userProfile = {
        skills: skills.data?.map(s => s.skill) || [],
        education: {
          degree: profile.data?.degree || null,
          branch: profile.data?.branch || null,
          current_year: profile.data?.current_year || null,
          graduation_year: profile.data?.graduation_year || null,
          cgpa: profile.data?.cgpa || null,
        },
        interests: prefs.data?.preferred_domains || [],
        preferences: {
          opportunity_types: prefs.data?.opportunity_types || [],
          preferred_countries: prefs.data?.preferred_countries || [],
          work_mode_preference: prefs.data?.work_mode_preference?.map((m: string) => m) || [],
          paid_preference: prefs.data?.paid_preference || 'both',
          min_stipend: prefs.data?.min_stipend || null,
        },
      };
    }

    const oppProfile = {
      id: opp.id,
      title: opp.title,
      organization: opp.organization,
      type: opp.type,
      description: opp.description || '',
      eligibility: opp.eligibility || '',
      required_skills: opp.opportunity_skills?.map((s: { skill: string }) => s.skill) || [],
      location: opp.location || '',
      work_mode: opp.work_mode,
      is_paid: opp.is_paid,
      stipend: opp.stipend || '',
      deadline: opp.deadline,
    };

    // Calculate deterministic score
    const { score, breakdown, matchingSkills, missingSkills } = calculateMatchScore(userProfile, oppProfile);
    const eligibilityStatus = assessEligibility(userProfile, oppProfile);

    // Get AI analysis
    const aiResult = await generateAIAnalysis(userProfile, oppProfile, {
      match_score: score,
      eligibility_status: eligibilityStatus,
      matching_skills: matchingSkills,
      missing_skills: missingSkills,
      score_breakdown: breakdown,
    });

    const result = {
      match_score: score,
      eligibility_status: eligibilityStatus,
      matching_skills: matchingSkills,
      missing_skills: missingSkills,
      score_breakdown: breakdown,
      ...aiResult,
    };

    // Save recommendation if user is authenticated
    if (user) {
      await adminSupabase.from('recommendations').upsert({
        user_id: user.id,
        opportunity_id: opportunityId,
        match_score: score,
        eligibility_status: eligibilityStatus,
        matching_skills: matchingSkills,
        missing_skills: missingSkills,
        match_reasons: aiResult.match_reasons,
        concerns: aiResult.concerns,
        next_steps: aiResult.next_steps,
        ai_analysis: aiResult.ai_analysis,
      }, { onConflict: 'user_id,opportunity_id' });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Recommendations API]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
