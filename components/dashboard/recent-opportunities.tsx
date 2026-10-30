'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Bookmark, BookmarkCheck, MapPin, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, getOpportunityTypeColor, getOpportunityTypeLabel, formatDate, getDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  location: string | null;
  deadline: string | null;
  work_mode: string;
  is_paid: boolean;
  stipend: string | null;
  is_demo: boolean;
  verification_status: string;
}

export function RecentOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('opportunities')
          .select('id, title, organization, type, location, deadline, work_mode, is_paid, stipend, is_demo, verification_status')
          .order('created_at', { ascending: false })
          .limit(6);
        setOpportunities(data || []);

        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: savedData } = await supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id);
            setSaved(new Set(savedData?.map(s => s.opportunity_id) || []));
          }
        }
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleSave = async (oppId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) { toast.error('Configure Supabase to save opportunities'); return; }
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in to save opportunities'); return; }
    
    if (saved.has(oppId)) {
      await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', oppId);
      setSaved(prev => { const next = new Set(prev); next.delete(oppId); return next; });
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: oppId });
      setSaved(prev => new Set([...prev, oppId]));
      toast.success('Saved!');
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-900">Recently Discovered</h3>
        <Link href="/opportunities" className="text-xs text-blue-600 hover:underline">View all →</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          <p>No opportunities yet.</p>
          <Link href="/agent" className="text-blue-600 hover:underline mt-1 block">Run the Research Agent to discover some →</Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {opportunities.map((opp) => (
            <div key={opp.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getOpportunityTypeColor(opp.type))}>
                      {getOpportunityTypeLabel(opp.type)}
                    </span>
                    {opp.is_demo && <span className="demo-badge">Demo</span>}
                    {opp.verification_status === 'verified' && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Verified</span>
                    )}
                  </div>
                  <Link href={`/opportunities/${opp.id}`} className="block mt-1">
                    <h4 className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition truncate">{opp.title}</h4>
                  </Link>
                  <p className="text-xs text-slate-500">{opp.organization}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {opp.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" /> {opp.location}
                      </span>
                    )}
                    {opp.deadline && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span className={cn(
                          'font-medium',
                          (getDaysUntilDeadline(opp.deadline) ?? 999) <= 3 ? 'text-red-600' : 'text-slate-400'
                        )}>
                          {getDeadlineLabel(opp.deadline)}
                        </span>
                      </span>
                    )}
                    {opp.is_paid && opp.stipend && (
                      <span className="text-xs text-green-600 font-medium">{opp.stipend}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={(e) => handleSave(opp.id, e)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-blue-500">
                    {saved.has(opp.id) ? <BookmarkCheck className="w-4 h-4 text-blue-500" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                  {opp.id && (
                    <Link href={`/opportunities/${opp.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-blue-500">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
