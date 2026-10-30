'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Filter, SlidersHorizontal, MapPin, Calendar,
  Bookmark, BookmarkCheck, ExternalLink, ChevronDown, X, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  cn, getOpportunityTypeColor, getOpportunityTypeLabel,
  formatDate, getDeadlineLabel, getDaysUntilDeadline,
  getMatchScoreColor, getMatchScoreLabel
} from '@/lib/utils';
import { toast } from 'sonner';

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  location: string | null;
  work_mode: string;
  deadline: string | null;
  is_paid: boolean;
  stipend: string | null;
  is_demo: boolean;
  verification_status: string;
  description: string | null;
  eligibility: string | null;
  application_url: string | null;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently Discovered' },
  { value: 'deadline', label: 'Deadline Soonest' },
  { value: 'verified', label: 'Recently Verified' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'internship', label: 'Internship' },
  { value: 'research_internship', label: 'Research Internship' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'job', label: 'Job' },
  { value: 'competition', label: 'Competition' },
  { value: 'workshop', label: 'Workshop' },
];

export default function OpportunitiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [paidOnly, setPaidOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 12;

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('opportunities')
        .select('id, title, organization, type, location, work_mode, deadline, is_paid, stipend, is_demo, verification_status, description, eligibility, application_url', { count: 'exact' });

      if (search) {
        query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (category) query = query.eq('type', category);
      if (workMode) query = query.eq('work_mode', workMode);
      if (paidOnly) query = query.eq('is_paid', true);

      switch (sortBy) {
        case 'deadline': query = query.not('deadline', 'is', null).order('deadline', { ascending: true }); break;
        case 'verified': query = query.order('last_verified', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!error) {
        setOpportunities(data || []);
        setTotal(count || 0);
      }

      // Get saved status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedData } = await supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id);
        const savedIds = (savedData as Array<{ opportunity_id: string }> | null) || [];
        setSaved(new Set(savedIds.map(s => s.opportunity_id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, category, workMode, paidOnly, sortBy, page]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  const handleSave = async (oppId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in to save opportunities'); return; }
    
    if (saved.has(oppId)) {
      await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', oppId);
      setSaved(prev => { const s = new Set(prev); s.delete(oppId); return s; });
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: oppId });
      setSaved(prev => new Set([...prev, oppId]));
      toast.success('Saved!');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discover Opportunities</h1>
          <p className="text-slate-500 text-sm">{total.toLocaleString()} opportunities found</p>
        </div>
        <Link href="/agent" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          <Search className="w-4 h-4" /> Run Research Agent
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, organization, or keyword..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition', showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={workMode} onChange={(e) => { setWorkMode(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Work Modes</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={paidOnly} onChange={(e) => { setPaidOnly(e.target.checked); setPage(1); }} className="rounded" />
              Paid only
            </label>
          </div>
        )}
      </div>

      {/* Opportunity Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5"><div className="skeleton h-40 w-full" /></div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="card p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-900">No opportunities found</h3>
          <p className="text-slate-500 text-sm mt-1">Try different filters or run the Research Agent to discover new ones.</p>
          <Link href="/agent" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            Run Research Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opportunities.map((opp) => {
            const days = getDaysUntilDeadline(opp.deadline);
            const isUrgent = days !== null && days <= 3;
            return (
              <Link key={opp.id} href={`/opportunities/${opp.id}`} className="card p-5 card-hover block group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getOpportunityTypeColor(opp.type))}>
                      {getOpportunityTypeLabel(opp.type)}
                    </span>
                    {opp.is_demo && <span className="demo-badge">Demo</span>}
                    {opp.work_mode === 'remote' && (
                      <span className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">Remote</span>
                    )}
                  </div>
                  <button onClick={(e) => handleSave(opp.id, e)} className="flex-shrink-0 p-1 rounded text-slate-300 hover:text-blue-500 transition">
                    {saved.has(opp.id) ? <BookmarkCheck className="w-4 h-4 text-blue-500" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>

                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition text-sm leading-snug mb-1 line-clamp-2">
                  {opp.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">{opp.organization}</p>

                {opp.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{opp.description}</p>
                )}

                <div className="space-y-1.5">
                  {opp.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {opp.location}
                    </div>
                  )}
                  {opp.deadline && (
                    <div className={cn('flex items-center gap-1.5 text-xs', isUrgent ? 'text-red-600 font-medium' : 'text-slate-500')}>
                      <Calendar className="w-3 h-3 flex-shrink-0" /> {getDeadlineLabel(opp.deadline)}
                    </div>
                  )}
                  {opp.is_paid && opp.stipend && (
                    <div className="text-xs text-green-600 font-medium">{opp.stipend}</div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full',
                    opp.verification_status === 'verified' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {opp.verification_status === 'verified' ? '✓ Verified' : 'Needs review'}
                  </span>
                  {opp.application_url && (
                    <a href={opp.application_url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                      Apply <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50 transition">
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50 transition">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
