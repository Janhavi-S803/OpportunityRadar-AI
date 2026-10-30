'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Sparkles, Clock, Bell, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/utils';

interface Stats {
  total_opportunities: number;
  matched_opportunities: number;
  applications_in_progress: number;
  upcoming_deadlines: number;
  new_this_week: number;
}

const DEMO_STATS: Stats = {
  total_opportunities: 3,
  matched_opportunities: 3,
  applications_in_progress: 0,
  upcoming_deadlines: 3,
  new_this_week: 3,
};

export function QuickStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStats(DEMO_STATS);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const [oppCount, appCount, deadlineCount] = await Promise.all([
          supabase.from('opportunities').select('id', { count: 'exact', head: true }),
          supabase.from('applications').select('id', { count: 'exact', head: true })
            .eq('user_id', user?.id || '').in('status', ['preparing', 'applied', 'assessment', 'interview']),
          supabase.from('opportunities').select('id', { count: 'exact', head: true })
            .gt('deadline', new Date().toISOString())
            .lt('deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: newCount } = await supabase.from('opportunities').select('id', { count: 'exact', head: true }).gt('created_at', weekAgo);

        setStats({
          total_opportunities: oppCount.count || 0,
          matched_opportunities: oppCount.count || 0,
          applications_in_progress: appCount.count || 0,
          upcoming_deadlines: deadlineCount.count || 0,
          new_this_week: newCount || 0,
        });
      } catch {
        setStats(DEMO_STATS);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Opportunities', value: stats?.total_opportunities ?? 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'AI Matches', value: stats?.matched_opportunities ?? 0, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'In Progress', value: stats?.applications_in_progress ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Deadlines Soon', value: stats?.upcoming_deadlines ?? 0, icon: Bell, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'New This Week', value: stats?.new_this_week ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <div key={stat.label} className="card p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="skeleton h-7 w-12" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">{stat.value.toLocaleString()}</div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
