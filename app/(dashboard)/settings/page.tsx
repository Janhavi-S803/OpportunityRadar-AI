'use client';

import { useState } from 'react';
import { Settings, CheckCircle, AlertCircle, Loader2, ExternalLink, Key, Database, Brain, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface StatusItem {
  name: string;
  status: 'ok' | 'error' | 'checking' | 'unknown';
  message: string;
}

export default function SettingsPage() {
  const [checking, setChecking] = useState(false);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);

  const checkConnections = async () => {
    setChecking(true);
    setStatuses([
      { name: 'Supabase Database', status: 'checking', message: 'Checking...' },
      { name: 'TinyFish Web Research', status: 'checking', message: 'Checking...' },
      { name: 'Google Gemini AI', status: 'checking', message: 'Checking...' },
    ]);

    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setStatuses([
        { name: 'Supabase Database', status: data.supabase ? 'ok' : 'error', message: data.supabase ? 'Connected' : 'Not configured — add credentials to .env.local' },
        { name: 'TinyFish Web Research', status: data.tinyfish ? 'ok' : 'error', message: data.tinyfish ? 'API key valid' : 'Not configured — add TINYFISH_API_KEY to .env.local' },
        { name: 'Google Gemini AI', status: data.gemini ? 'ok' : 'error', message: data.gemini ? 'API key valid' : 'Not configured — add GEMINI_API_KEY to .env.local' },
      ]);
    } catch {
      setStatuses(prev => prev.map(s => ({ ...s, status: 'error', message: 'Failed to check' })));
    } finally {
      setChecking(false);
    }
  };

  const statusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'checking': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Settings
        </h1>
        <p className="text-slate-500 text-sm">Configure your OpportunityRadar AI environment</p>
      </div>

      {/* API Configuration */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-900">API Configuration</h2>
        </div>
        <p className="text-sm text-slate-500">
          All API keys are configured server-side in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code>.
          They are never exposed to the browser. Add your keys and restart the dev server.
        </p>

        <div className="space-y-4">
          {[
            {
              icon: Database,
              name: 'Supabase',
              vars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
              docs: 'https://supabase.com/dashboard',
              desc: 'Database, authentication, and real-time features',
            },
            {
              icon: Globe,
              name: 'TinyFish Web Research',
              vars: ['TINYFISH_API_KEY'],
              docs: 'https://tinyfish.ai',
              desc: 'AI-powered web search, fetch, and browser automation (key already configured)',
            },
            {
              icon: Brain,
              name: 'Google Gemini AI',
              vars: ['GEMINI_API_KEY'],
              docs: 'https://aistudio.google.com/app/apikey',
              desc: 'AI recommendations, semantic analysis, and content extraction',
            },
          ].map(service => (
            <div key={service.name} className="p-4 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <service.icon className="w-4 h-4 text-slate-400" />
                  <h3 className="font-medium text-slate-900 text-sm">{service.name}</h3>
                </div>
                <a href={service.docs} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  Get API key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">{service.desc}</p>
              <div className="flex flex-wrap gap-2">
                {service.vars.map(v => (
                  <code key={v} className="text-xs bg-slate-900 text-green-400 px-2 py-0.5 rounded font-mono">{v}</code>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900 rounded-xl">
          <p className="text-xs text-green-400 font-mono mb-2"># .env.local</p>
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TINYFISH_API_KEY=sk-tinyfish-...  # Already set ✓
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
        </div>
      </div>

      {/* Connection Health Check */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Connection Health</h2>
          <button onClick={checkConnections} disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Check All
          </button>
        </div>

        {statuses.length > 0 ? (
          <div className="space-y-3">
            {statuses.map(s => (
              <div key={s.name} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
                {statusIcon(s.status)}
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className={`text-xs ${s.status === 'ok' ? 'text-green-600' : s.status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                    {s.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Click "Check All" to verify your API connections.</p>
        )}
      </div>

      {/* Database Setup */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Database Setup</h2>
        <p className="text-sm text-slate-600">
          Run the migration file in your Supabase SQL editor to create all necessary tables, policies, and demo data.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">Migration file location:</p>
          <code className="text-xs text-amber-700 font-mono">supabase/migrations/001_initial_schema.sql</code>
        </div>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          Open Supabase Dashboard <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
