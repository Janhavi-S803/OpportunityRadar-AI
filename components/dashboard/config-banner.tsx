'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle, Info, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/utils';

export function ConfigBanner() {
  const [dismissed, setDismissed] = useState(false);
  const supabaseOk = isSupabaseConfigured();
  const tinyfishOk = Boolean(process.env.NEXT_PUBLIC_APP_URL); // Proxy check - real check is server-side

  if (dismissed) return null;

  // All good
  if (supabaseOk) return null;

  return (
    <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-900 text-sm">Setup Required — Demo Mode Active</p>
        <p className="text-amber-700 text-xs mt-1">
          You&apos;re viewing demo data with sample opportunities (clearly labeled). Configure your API keys to unlock real AI-powered discovery.
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs">
            {supabaseOk 
              ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              : <X className="w-3.5 h-3.5 text-red-400" />
            }
            <span className={supabaseOk ? 'text-green-700' : 'text-red-700'}>Supabase {supabaseOk ? 'Connected' : 'Not configured'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700">TinyFish (server-side check)</span>
          </div>
        </div>
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium mt-2">
          Go to Settings <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
