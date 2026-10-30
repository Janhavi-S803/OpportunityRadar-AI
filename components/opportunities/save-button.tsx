'use client';

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function SaveButton({ opportunityId }: { opportunityId: string }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from('saved_opportunities')
          .select('id').eq('user_id', user.id).eq('opportunity_id', opportunityId).single();
        setSaved(!!data);
      } catch { /* not saved */ }
      finally { setLoading(false); }
    };
    check();
  }, [opportunityId]);

  const toggle = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in to save opportunities'); return; }

    if (saved) {
      await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', opportunityId);
      setSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: opportunityId });
      setSaved(true);
      toast.success('Saved to your collection!');
    }
  };

  return (
    <button onClick={toggle} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
        saved ? <BookmarkCheck className="w-4 h-4 text-blue-500" /> : <Bookmark className="w-4 h-4" />}
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
