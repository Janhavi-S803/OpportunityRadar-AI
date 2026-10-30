'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Trash2, StickyNote, ExternalLink, Calendar, MapPin, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, getOpportunityTypeColor, getOpportunityTypeLabel, getDeadlineLabel, getDaysUntilDeadline, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface SavedOpp {
  id: string;
  opportunity_id: string;
  notes: string | null;
  created_at: string;
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

export default function SavedPage() {
  const [items, setItems] = useState<SavedOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('saved_opportunities')
        .select('*, opportunities(id, title, organization, type, location, deadline, work_mode, is_paid, stipend, application_url, is_demo)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setItems((data as SavedOpp[]) || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const handleRemove = async (savedId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('saved_opportunities').delete().eq('id', savedId).eq('user_id', user.id);
    setItems(prev => prev.filter(i => i.id !== savedId));
    toast.success('Removed from saved');
  };

  const handleSaveNote = async (savedId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('saved_opportunities').update({ notes: noteText }).eq('id', savedId).eq('user_id', user.id);
    setItems(prev => prev.map(i => i.id === savedId ? { ...i, notes: noteText } : i));
    setEditingNote(null);
    toast.success('Note saved');
  };

  const handleMoveToTracker = async (oppId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('applications').upsert({ user_id: user.id, opportunity_id: oppId, status: 'interested' }, { onConflict: 'user_id,opportunity_id' });
    if (!error) toast.success('Added to Application Tracker as "Interested"');
    else toast.error('Failed to add to tracker');
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Bookmark className="w-6 h-6 text-blue-600" /> Saved Opportunities</h1>
          <p className="text-slate-500 text-sm">{items.length} saved{items.length !== 1 ? '' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-24 w-full" /></div>)}</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-900">No saved opportunities yet</h3>
          <p className="text-slate-500 text-sm mt-1">Browse opportunities and click the bookmark icon to save them.</p>
          <Link href="/opportunities" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Search className="w-4 h-4" /> Browse Opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const opp = item.opportunities;
            const days = getDaysUntilDeadline(opp?.deadline);
            return (
              <div key={item.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getOpportunityTypeColor(opp?.type || ''))}>
                        {getOpportunityTypeLabel(opp?.type || '')}
                      </span>
                      {opp?.is_demo && <span className="demo-badge">Demo</span>}
                    </div>
                    <Link href={`/opportunities/${opp?.id}`} className="block">
                      <h3 className="font-semibold text-slate-900 hover:text-blue-600 transition">{opp?.title}</h3>
                    </Link>
                    <p className="text-sm text-slate-500">{opp?.organization}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {opp?.location && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3 h-3" />{opp.location}</span>}
                      {opp?.deadline && <span className={cn('flex items-center gap-1 text-xs', (days ?? 999) <= 3 ? 'text-red-600 font-medium' : 'text-slate-400')}><Calendar className="w-3 h-3" />{getDeadlineLabel(opp.deadline)}</span>}
                      {opp?.is_paid && opp.stipend && <span className="text-xs text-green-600 font-medium">{opp.stipend}</span>}
                    </div>

                    {/* Notes */}
                    {editingNote === item.id ? (
                      <div className="mt-3 flex gap-2">
                        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={2}
                          className="flex-1 p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleSaveNote(item.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">Save</button>
                          <button onClick={() => setEditingNote(null)} className="px-3 py-1 border border-slate-200 text-xs rounded-lg hover:bg-slate-50 transition">Cancel</button>
                        </div>
                      </div>
                    ) : item.notes ? (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-xs text-amber-800">{item.notes}</p>
                        <button onClick={() => { setEditingNote(item.id); setNoteText(item.notes || ''); }} className="text-xs text-amber-600 hover:underline mt-1">Edit note</button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => { setEditingNote(item.id); setNoteText(item.notes || ''); }}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition" title="Add note">
                      <StickyNote className="w-4 h-4" />
                    </button>
                    {opp?.application_url && (
                      <a href={opp.application_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition" title="Apply">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => handleMoveToTracker(opp?.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-green-500 transition" title="Add to tracker">
                      📋
                    </button>
                    <button onClick={() => handleRemove(item.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-3">Saved {formatDate(item.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
