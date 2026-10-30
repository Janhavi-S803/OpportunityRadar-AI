'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, formatDate, getDeadlineLabel, getOpportunityTypeColor, getOpportunityTypeLabel, getDaysUntilDeadline } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  deadline: string | null;
  application_url: string | null;
  is_demo: boolean;
}

export function ClosingSoon() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        // Will show demo data from DB
        setLoading(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('opportunities')
          .select('id, title, organization, type, deadline, application_url, is_demo')
          .not('deadline', 'is', null)
          .gt('deadline', new Date().toISOString())
          .order('deadline', { ascending: true })
          .limit(5);
        setOpportunities(data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-red-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Closing Soon</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 w-full" />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => {
            const days = getDaysUntilDeadline(opp.deadline);
            const urgency = days !== null && days <= 1 ? 'critical' : days !== null && days <= 3 ? 'soon' : 'normal';
            return (
              <Link key={opp.id} href={`/opportunities/${opp.id}`} className="block">
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition group">
                  <div className={cn(
                    'w-1.5 h-full min-h-[36px] rounded-full flex-shrink-0 mt-0.5',
                    urgency === 'critical' ? 'bg-red-500' : urgency === 'soon' ? 'bg-amber-500' : 'bg-green-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition">{opp.title}</p>
                      {opp.is_demo && <span className="demo-badge flex-shrink-0">Demo</span>}
                    </div>
                    <p className="text-xs text-slate-500">{opp.organization}</p>
                    <p className={cn(
                      'text-xs font-medium mt-0.5',
                      urgency === 'critical' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {opp.deadline ? getDeadlineLabel(opp.deadline) : 'No deadline'}
                    </p>
                  </div>
                  {opp.application_url && (
                    <a href={opp.application_url} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 p-1 rounded text-slate-300 hover:text-blue-500"
                      onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/calendar" className="block mt-4 text-center text-xs text-blue-600 hover:underline">
        View deadline calendar →
      </Link>
    </div>
  );
}
