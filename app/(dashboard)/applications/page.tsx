'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KanbanSquare, Plus, ExternalLink, Calendar, ChevronDown, GripVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, getApplicationStatusColor, getApplicationStatusLabel, getDaysUntilDeadline, getDeadlineLabel } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApplicationStatus } from '@/types/database';

interface Application {
  id: string;
  status: string;
  notes: string | null;
  applied_date: string | null;
  opportunities: {
    id: string;
    title: string;
    organization: string;
    deadline: string | null;
    application_url: string | null;
    is_demo: boolean;
  };
}

const COLUMNS = [
  { status: 'interested', label: 'Interested', color: 'border-indigo-400' },
  { status: 'preparing', label: 'Preparing', color: 'border-amber-400' },
  { status: 'applied', label: 'Applied', color: 'border-blue-400' },
  { status: 'assessment', label: 'Assessment', color: 'border-purple-400' },
  { status: 'interview', label: 'Interview', color: 'border-cyan-400' },
  { status: 'selected', label: 'Selected ✓', color: 'border-green-400' },
  { status: 'rejected', label: 'Rejected', color: 'border-red-400' },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('applications')
        .select('*, opportunities(id, title, organization, deadline, application_url, is_demo)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setApplications((data as Application[]) || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const moveCard = async (appId: string, newStatus: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    
    const updateData: { status: ApplicationStatus; applied_date?: string } = { 
      status: newStatus as ApplicationStatus,
    };
    if (newStatus === 'applied') updateData.applied_date = new Date().toISOString();
    
    await supabase.from('applications').update(updateData).eq('id', appId).eq('user_id', user.id);
    toast.success(`Moved to ${getApplicationStatusLabel(newStatus)}`);
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('appId', appId);
    setDragging(appId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    if (appId) await moveCard(appId, newStatus);
    setDragging(null);
  };

  const byStatus = (status: string) => applications.filter(a => a.status === status);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-blue-600" /> Application Tracker
          </h1>
          <p className="text-slate-500 text-sm">{applications.length} applications tracked</p>
        </div>
        <Link href="/opportunities" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Add from Opportunities
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => <div key={col.status} className="flex-shrink-0 w-64"><div className="skeleton h-64 w-full rounded-xl" /></div>)}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <div key={col.status}
                className="flex-shrink-0 w-64"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.status)}>
                <div className={cn('card border-t-4 h-full', col.color)}>
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">{col.label}</h3>
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-medium">
                        {byStatus(col.status).length}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 space-y-2 min-h-[120px]">
                    {byStatus(col.status).map(app => {
                      const opp = app.opportunities;
                      const days = getDaysUntilDeadline(opp?.deadline);
                      return (
                        <div key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          className={cn(
                            'bg-white border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition shadow-sm hover:shadow-md',
                            dragging === app.id && 'opacity-50'
                          )}>
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <Link href={`/opportunities/${opp?.id}`} className="block">
                                <p className="text-xs font-semibold text-slate-900 hover:text-blue-600 transition leading-snug truncate">{opp?.title}</p>
                              </Link>
                              <p className="text-xs text-slate-500 truncate">{opp?.organization}</p>
                              {opp?.deadline && (
                                <p className={cn('text-xs mt-1', (days ?? 999) <= 3 ? 'text-red-600 font-medium' : 'text-slate-400')}>
                                  <Calendar className="w-3 h-3 inline mr-0.5" />{getDeadlineLabel(opp.deadline)}
                                </p>
                              )}
                              {opp?.is_demo && <span className="demo-badge mt-1">Demo</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <select
                              value={col.status}
                              onChange={(e) => moveCard(app.id, e.target.value)}
                              className="text-xs border-0 p-0 text-slate-400 focus:outline-none bg-transparent cursor-pointer"
                              onClick={(e) => e.stopPropagation()}>
                              {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                            </select>
                            {opp?.application_url && (
                              <a href={opp.application_url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500 transition">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {byStatus(col.status).length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-300">
                        Drop cards here
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 text-xs text-slate-400">
        <p>💡 Drag and drop cards between columns to update application status. Click on an opportunity title to view details.</p>
      </div>
    </div>
  );
}
