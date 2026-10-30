'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, getDaysUntilDeadline, getOpportunityTypeColor, getOpportunityTypeLabel } from '@/lib/utils';

interface DeadlineItem {
  id: string;
  title: string;
  organization: string;
  type: string;
  deadline: string;
  application_url: string | null;
  is_demo: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [opportunities, setOpportunities] = useState<DeadlineItem[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDeadlines(); }, []);

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, organization, type, deadline, application_url, is_demo')
        .not('deadline', 'is', null)
        .gt('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });
      setOpportunities((data as DeadlineItem[]) || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getDeadlinesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return opportunities.filter(o => o.deadline?.startsWith(dateStr));
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const upcomingDeadlines = opportunities.filter(o => {
    const days = getDaysUntilDeadline(o.deadline);
    return days !== null && days <= 30;
  }).slice(0, 10);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" /> Deadline Calendar
        </h1>
        <p className="text-slate-500 text-sm">Track application deadlines across all opportunities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">{MONTHS[month]} {year}</h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setViewDate(new Date())} className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition font-medium">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const deadlines = getDeadlinesForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div key={day}
                  className={cn(
                    'min-h-[70px] p-1.5 rounded-lg border text-xs transition',
                    isCurrentDay ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:border-slate-200',
                    deadlines.length > 0 && 'border-red-200 bg-red-50/50'
                  )}>
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full mb-1 font-medium text-sm',
                    isCurrentDay ? 'bg-blue-600 text-white' : 'text-slate-700'
                  )}>
                    {day}
                  </div>
                  {deadlines.slice(0, 2).map(d => (
                    <Link key={d.id} href={`/opportunities/${d.id}`}
                      className="block truncate text-xs leading-4 mb-0.5 text-red-700 bg-red-100 rounded px-1 hover:bg-red-200 transition"
                      title={d.title}>
                      {d.title.slice(0, 15)}...
                    </Link>
                  ))}
                  {deadlines.length > 2 && (
                    <span className="text-xs text-red-500 font-medium">+{deadlines.length - 2} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming deadlines sidebar */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Upcoming (30 days)
          </h3>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
          ) : upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map(opp => {
                const days = getDaysUntilDeadline(opp.deadline);
                return (
                  <Link key={opp.id} href={`/opportunities/${opp.id}`}
                    className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition group">
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                        (days ?? 999) <= 1 ? 'bg-red-100 text-red-700' :
                        (days ?? 999) <= 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      )}>
                        {days}d
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">{opp.title}</p>
                        <p className="text-xs text-slate-500 truncate">{opp.organization}</p>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block', getOpportunityTypeColor(opp.type))}>
                          {getOpportunityTypeLabel(opp.type)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
