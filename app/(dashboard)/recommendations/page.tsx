'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, RefreshCw, User, ExternalLink, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, getMatchScoreColor, getMatchScoreLabel, getEligibilityColor, getEligibilityLabel, getOpportunityTypeColor, getOpportunityTypeLabel, getDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/utils';

interface Recommendation {
  id: string;
  match_score: number;
  eligibility_status: string;
  matching_skills: string[];
  missing_skills: string[];
  match_reasons: string;
  ai_analysis: string;
  opportunities: {
    id: string;
    title: string;
    organization: string;
    type: string;
    location: string | null;
    deadline: string | null;
    work_mode: string;
    is_paid: boolean;
    stipend: string | null;
    application_url: string | null;
    is_demo: boolean;
  };
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => { fetchRecommendations(); }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Check if user has a profile set up
      const { data: profile } = await supabase.from('profiles').select('id, branch').eq('user_id', user.id).single();
      setHasProfile(!!profile?.branch);

      const { data } = await supabase
        .from('recommendations')
        .select('*, opportunities(id, title, organization, type, location, deadline, work_mode, is_paid, stipend, application_url, is_demo)')
        .eq('user_id', user.id)
        .order('match_score', { ascending: false })
        .limit(20);
      setRecommendations((data as Recommendation[]) || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const generateRecommendations = async () => {
    if (!isSupabaseConfigured()) { toast.error('Configure Supabase to generate recommendations'); return; }
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in'); return; }

      // Get all opportunities and run analysis
      const { data: opportunities } = await supabase.from('opportunities').select('id').limit(20);
      if (!opportunities || opportunities.length === 0) {
        toast.error('No opportunities to analyze. Run the Research Agent first.');
        return;
      }

      let successCount = 0;
      for (const opp of opportunities.slice(0, 10)) {
        try {
          const res = await fetch(`/api/recommendations/${opp.id}/analyze`, { method: 'POST' });
          if (res.ok) successCount++;
        } catch { /* skip */ }
      }

      toast.success(`Generated ${successCount} recommendations!`);
      fetchRecommendations();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" /> AI Recommendations
          </h1>
          <p className="text-slate-500 text-sm">Opportunities ranked by AI match score based on your profile</p>
        </div>
        <button onClick={generateRecommendations} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {/* Profile completeness notice */}
      {!hasProfile && (
        <div className="card p-4 border-l-4 border-blue-400 bg-blue-50 flex items-start gap-3">
          <User className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Complete your profile for better matches</p>
            <p className="text-blue-700 text-xs mt-0.5">Add your skills, education, and interests to get personalized AI recommendations.</p>
            <Link href="/profile" className="inline-block mt-2 text-xs text-blue-700 hover:underline font-medium">
              Set up profile →
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-32 w-full" /></div>)}</div>
      ) : recommendations.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-900">No recommendations yet</h3>
          <p className="text-slate-500 text-sm mt-1">First discover some opportunities with the Research Agent, then generate recommendations.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/agent" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Run Research Agent</Link>
            <button onClick={generateRecommendations} disabled={generating} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">
              Generate Recommendations
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => {
            const opp = rec.opportunities;
            const days = getDaysUntilDeadline(opp?.deadline);
            return (
              <div key={rec.id} className="card p-5 card-hover">
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('px-3 py-1 rounded-xl text-sm font-bold', getMatchScoreColor(rec.match_score))}>
                        {rec.match_score}% — {getMatchScoreLabel(rec.match_score)}
                      </span>
                      <span className={cn('text-xs px-2.5 py-1 rounded-full border', getEligibilityColor(rec.eligibility_status))}>
                        {getEligibilityLabel(rec.eligibility_status)}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getOpportunityTypeColor(opp?.type || ''))}>
                        {getOpportunityTypeLabel(opp?.type || '')}
                      </span>
                      {opp?.is_demo && <span className="demo-badge">Demo</span>}
                    </div>

                    <Link href={`/opportunities/${opp?.id}`} className="block">
                      <h3 className="font-semibold text-slate-900 hover:text-blue-600 transition">{opp?.title}</h3>
                    </Link>
                    <p className="text-sm text-slate-500">{opp?.organization}</p>

                    {opp?.deadline && (
                      <p className={cn('text-xs mt-1', (days ?? 999) <= 3 ? 'text-red-600 font-medium' : 'text-slate-400')}>
                        Deadline: {getDeadlineLabel(opp.deadline)}
                      </p>
                    )}

                    {rec.match_reasons && (
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{rec.match_reasons}</p>
                    )}

                    {/* Skills */}
                    {(rec.matching_skills.length > 0 || rec.missing_skills.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rec.matching_skills.slice(0, 4).map(s => (
                          <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">✓ {s}</span>
                        ))}
                        {rec.missing_skills.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">⚡ {s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Link href={`/opportunities/${opp?.id}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                    {opp?.application_url && (
                      <a href={opp.application_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium">
                        Apply <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
