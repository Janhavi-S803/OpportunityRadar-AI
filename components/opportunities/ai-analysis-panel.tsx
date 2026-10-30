'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn, getEligibilityColor, getEligibilityLabel, getMatchScoreColor } from '@/lib/utils';

interface AIAnalysis {
  match_score: number;
  eligibility_status: string;
  matching_skills: string[];
  missing_skills: string[];
  match_reasons: string;
  concerns: string;
  next_steps: string;
  ai_analysis: string;
}

export function AIAnalysisPanel({ opportunityId }: { opportunityId: string }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/recommendations/${opportunityId}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data);
      setExpanded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold text-slate-900">AI Match Analysis</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Powered by Gemini</span>
        </div>
        {analysis && (
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!analysis && !loading && (
        <div className="mt-4">
          <p className="text-sm text-slate-500 mb-4">
            Get a personalized AI analysis of how this opportunity matches your profile, including skill gaps and preparation tips.
          </p>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}
          <button onClick={runAnalysis}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition">
            <Sparkles className="w-4 h-4" /> Analyze Match
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          Analyzing your profile against this opportunity...
        </div>
      )}

      {analysis && expanded && (
        <div className="mt-5 space-y-5">
          {/* Score & Eligibility */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className={cn('px-4 py-2 rounded-xl text-sm font-bold', getMatchScoreColor(analysis.match_score))}>
              {analysis.match_score}% Match
            </div>
            <div className={cn('px-4 py-2 rounded-xl text-sm font-medium border', getEligibilityColor(analysis.eligibility_status))}>
              {getEligibilityLabel(analysis.eligibility_status)}
            </div>
          </div>

          {/* Why this matches */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">Why this matches your profile</h4>
            <p className="text-sm text-slate-600">{analysis.match_reasons}</p>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-2 gap-4">
            {analysis.matching_skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-green-700 mb-2">✓ Skills you have</h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matching_skills.map(s => (
                    <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {analysis.missing_skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-amber-700 mb-2">⚡ Skills to develop</h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missing_skills.map(s => (
                    <span key={s} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Concerns */}
          {analysis.concerns && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Potential Concerns</h4>
              <p className="text-sm text-slate-600">{analysis.concerns}</p>
            </div>
          )}

          {/* Next Steps */}
          {analysis.next_steps && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Recommended Next Steps</h4>
              <p className="text-sm text-blue-800">{analysis.next_steps}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 italic">
            AI analysis is for informational purposes only. The organization makes all final eligibility and selection decisions. Always verify requirements directly with the official source.
          </p>
        </div>
      )}
    </div>
  );
}
