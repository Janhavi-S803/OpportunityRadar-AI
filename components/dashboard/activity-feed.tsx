'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Bot, Bookmark, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'research' | 'save' | 'apply';
  message: string;
  time: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setActivities([
          { id: '1', type: 'research', message: 'Demo mode — configure APIs to start research', time: 'Now' },
        ]);
        setLoading(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const [jobs, saved, apps] = await Promise.all([
          supabase.from('research_jobs').select('id, objective, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('saved_opportunities').select('id, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('applications').select('id, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        ]);

        const items: ActivityItem[] = [
          ...(jobs.data || []).map(j => ({
            id: j.id, type: 'research' as const,
            message: `Research: ${j.objective.slice(0, 50)}...`,
            time: formatRelativeTime(j.created_at),
          })),
          ...(saved.data || []).map(s => ({
            id: s.id, type: 'save' as const,
            message: 'Saved an opportunity',
            time: formatRelativeTime(s.created_at),
          })),
          ...(apps.data || []).map(a => ({
            id: a.id, type: 'apply' as const,
            message: `Application: ${a.status}`,
            time: formatRelativeTime(a.created_at),
          })),
        ].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);

        setActivities(items);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const iconMap = {
    research: <Bot className="w-3.5 h-3.5 text-blue-500" />,
    save: <Bookmark className="w-3.5 h-3.5 text-purple-500" />,
    apply: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-900 text-sm">Recent Activity</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>No recent activity</p>
          <Link href="/agent" className="text-xs text-blue-600 hover:underline block mt-1">
            Start your first research →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {iconMap[item.type]}
              </div>
              <div>
                <p className="text-xs text-slate-700">{item.message}</p>
                <p className="text-xs text-slate-400">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
