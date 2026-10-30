'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Target, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getOpportunityTypeLabel } from '@/lib/utils';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#64748B'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    totalSaved: 0,
    totalApplications: 0,
    applicationsByStatus: [] as { name: string; value: number }[],
    opportunitiesByType: [] as { name: string; value: number }[],
    researchJobs: 0,
    upcomingDeadlines: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const [opps, saved, apps, byType, jobs] = await Promise.all([
          supabase.from('opportunities').select('id', { count: 'exact', head: true }),
          user ? supabase.from('saved_opportunities').select('id', { count: 'exact', head: true }).eq('user_id', user.id) : { count: 0 },
          user ? supabase.from('applications').select('status').eq('user_id', user.id) : { data: [] },
          supabase.from('opportunities').select('type'),
          user ? supabase.from('research_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id) : { count: 0 },
        ]);

        // Applications by status
        const statusCounts: Record<string, number> = {};
        ((apps as { data: { status: string }[] | null }).data || []).forEach(a => {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        });
        const applicationsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

        // Opportunities by type
        const typeCounts: Record<string, number> = {};
        ((byType.data as { type: string }[]) || []).forEach(o => {
          typeCounts[o.type] = (typeCounts[o.type] || 0) + 1;
        });
        const opportunitiesByType = Object.entries(typeCounts).map(([key, value]) => ({
          name: getOpportunityTypeLabel(key),
          value,
        })).sort((a, b) => b.value - a.value);

        // Upcoming deadlines
        const { count: upcomingCount } = await supabase.from('opportunities')
          .select('id', { count: 'exact', head: true })
          .not('deadline', 'is', null)
          .gt('deadline', new Date().toISOString())
          .lt('deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

        setStats({
          totalOpportunities: opps.count || 0,
          totalSaved: (saved as { count: number | null }).count || 0,
          totalApplications: applicationsByStatus.reduce((s, a) => s + a.value, 0),
          applicationsByStatus,
          opportunitiesByType,
          researchJobs: (jobs as { count: number | null }).count || 0,
          upcomingDeadlines: upcomingCount || 0,
        });
      } catch { /* empty */ } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const summaryCards = [
    { label: 'Total Opportunities', value: stats.totalOpportunities, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Saved', value: stats.totalSaved, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Applications', value: stats.totalApplications, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Deadlines This Week', value: stats.upcomingDeadlines, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" /> Analytics
        </h1>
        <p className="text-slate-500 text-sm">Your opportunity discovery and application metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            {loading ? <div className="skeleton h-7 w-16" /> : (
              <div className="text-2xl font-bold text-slate-900">{c.value.toLocaleString()}</div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunities by Type */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Opportunities by Category</h3>
          {loading ? <div className="skeleton h-56 w-full" /> : stats.opportunitiesByType.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.opportunitiesByType} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                  {stats.opportunitiesByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Applications by Status */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Applications by Status</h3>
          {loading ? <div className="skeleton h-56 w-full" /> : stats.applicationsByStatus.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">No applications tracked yet</p>
              <a href="/applications" className="text-xs text-blue-600 hover:underline mt-1 block">Start tracking →</a>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={stats.applicationsByStatus} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {stats.applicationsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {stats.applicationsByStatus.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 capitalize">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Research Jobs */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Research Activity</h3>
        <p className="text-sm text-slate-500">You have run <span className="font-bold text-blue-600">{stats.researchJobs}</span> research jobs total.</p>
      </div>
    </div>
  );
}
