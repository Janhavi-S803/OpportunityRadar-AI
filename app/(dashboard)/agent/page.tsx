'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Bot, Play, Square, Loader2, Search, Globe, FileText,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchEvent {
  id: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
}

interface ResearchJob {
  id: string;
  status: string;
  objective: string;
  opportunities_found: number;
  opportunities_saved: number;
}

const SUGGESTED_PROMPTS = [
  'Find 10 AI/ML internships for undergraduate students in 2026',
  'Find fully funded international research internships',
  'Find upcoming AI hackathons with open registration',
  'Find NLP and Computer Vision research opportunities',
  'Find scholarships for engineering students',
  'Find entry-level AI engineer jobs remote-friendly',
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Loader2 className="w-4 h-4 animate-spin text-slate-400" />,
  searching: <Search className="w-4 h-4 text-blue-500" />,
  browsing: <Globe className="w-4 h-4 text-purple-500" />,
  extracting: <FileText className="w-4 h-4 text-cyan-500" />,
  validating: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
  saving: <Loader2 className="w-4 h-4 animate-spin text-green-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <AlertCircle className="w-4 h-4 text-red-500" />,
  cancelled: <Square className="w-4 h-4 text-slate-400" />,
};

export default function AgentPage() {
  const [currentJob, setCurrentJob] = useState<ResearchJob | null>(null);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showLog, setShowLog] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch } = useForm({ defaultValues: { objective: '' } });
  const objectiveValue = watch('objective');

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const onSubmit = async (data: { objective: string }) => {
    if (!data.objective.trim()) return;
    
    setIsRunning(true);
    setEvents([]);
    setCurrentJob(null);

    // Add initial event
    addEvent('start', 'Starting research agent...', {});

    try {
      const response = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: data.objective,
          category: selectedCategory || undefined,
          location: locationFilter || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start research');
      }

      const { jobId } = await response.json();
      setCurrentJob({ id: jobId, status: 'pending', objective: data.objective, opportunities_found: 0, opportunities_saved: 0 });
      addEvent('info', `Research job created: ${jobId}`, { jobId });

      // Poll for status
      pollJobStatus(jobId);
    } catch (err) {
      const message = (err as Error).message;
      addEvent('error', message, {});
      toast.error(message);
      setIsRunning(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    const poll = async () => {
      if (attempts >= maxAttempts) {
        addEvent('error', 'Research timed out after 10 minutes', {});
        setIsRunning(false);
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/research/${jobId}/status`);
        const data = await res.json();
        
        setCurrentJob(data.job);
        
        // Update events with new ones
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }

        if (['completed', 'failed', 'cancelled'].includes(data.job.status)) {
          setIsRunning(false);
          if (data.job.status === 'completed') {
            toast.success(`Research complete! Found ${data.job.opportunities_found} opportunities, saved ${data.job.opportunities_saved}.`);
          } else if (data.job.status === 'failed') {
            toast.error('Research failed. Check the log for details.');
          }
          return;
        }

        // Continue polling
        setTimeout(poll, 3000);
      } catch {
        setTimeout(poll, 5000); // Retry after error
      }
    };

    setTimeout(poll, 2000);
  };

  const handleCancel = async () => {
    if (!currentJob) return;
    try {
      await fetch(`/api/research/${currentJob.id}/cancel`, { method: 'POST' });
      addEvent('info', 'Cancellation requested', {});
      setIsRunning(false);
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const addEvent = (type: string, message: string, data: Record<string, unknown>) => {
    setEvents(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      data,
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <div className="space-y-6 fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" /> AI Research Agent
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Autonomous web research powered by TinyFish + Gemini AI. Discovers and extracts real opportunities.
          </p>
        </div>
        {currentJob && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            currentJob.status === 'completed' ? 'bg-green-50 text-green-700' :
            currentJob.status === 'failed' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          )}>
            {STATUS_ICONS[currentJob.status]}
            {currentJob.status.charAt(0).toUpperCase() + currentJob.status.slice(1)}
          </div>
        )}
      </div>

      {/* Research Input */}
      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Research Objective</label>
            <textarea
              {...register('objective')}
              placeholder="Describe what opportunities you're looking for... e.g., 'Find currently open AI and Machine Learning internships for undergraduate computer engineering students in India and internationally.'"
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isRunning}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All categories</option>
                <option value="internship">Internship</option>
                <option value="research_internship">Research Internship</option>
                <option value="scholarship">Scholarship</option>
                <option value="fellowship">Fellowship</option>
                <option value="hackathon">Hackathon</option>
                <option value="job">Job</option>
                <option value="competition">Competition</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Location filter (e.g., India, USA)"
                disabled={isRunning}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isRunning || !objectiveValue?.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Researching...' : 'Start Research'}
            </button>
            {isRunning && (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition"
              >
                <Square className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        </form>

        {/* Suggested Prompts */}
        {!isRunning && !currentJob && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Suggested prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setValue('objective', prompt)}
                  className="text-xs px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full text-slate-600 transition"
                >
                  {prompt.slice(0, 50)}...
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress & Results */}
      {currentJob && (
        <div className="space-y-4">
          {/* Stats */}
          {(currentJob.opportunities_found > 0 || currentJob.status === 'completed') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{currentJob.opportunities_found}</div>
                <div className="text-xs text-slate-500 mt-1">Opportunities Found</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{currentJob.opportunities_saved}</div>
                <div className="text-xs text-slate-500 mt-1">Saved to Database</div>
              </div>
            </div>
          )}

          {/* Event Log */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowLog(!showLog)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
            >
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-500" /> Research Activity Log
              </span>
              {showLog ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showLog && (
              <div className="border-t border-slate-100 p-4 max-h-80 overflow-y-auto bg-slate-900 rounded-b-xl">
                <div className="space-y-1 font-mono text-xs">
                  {events.map((event) => (
                    <div key={event.id} className={cn(
                      'flex items-start gap-2',
                      event.type === 'error' ? 'text-red-400' :
                      event.type === 'completed' ? 'text-green-400' :
                      'text-slate-300'
                    )}>
                      <span className="text-slate-500 flex-shrink-0 mt-0.5">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                      <span className={cn(
                        'flex-shrink-0',
                        event.type === 'error' ? 'text-red-400' :
                        event.type === 'searching' ? 'text-blue-400' :
                        event.type === 'extracting' ? 'text-cyan-400' :
                        'text-green-400'
                      )}>
                        [{event.type?.toUpperCase() || 'INFO'}]
                      </span>
                      <span>{event.message}</span>
                    </div>
                  ))}
                  <div ref={eventsEndRef} />
                  {events.length === 0 && (
                    <span className="text-slate-500">Waiting for agent output...</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* View Results */}
          {currentJob.status === 'completed' && currentJob.opportunities_saved > 0 && (
            <div className="card p-4 bg-green-50 border-green-200">
              <p className="text-green-800 font-semibold text-sm">✅ Research complete!</p>
              <p className="text-green-700 text-xs mt-1">
                {currentJob.opportunities_saved} opportunities saved to the database.
              </p>
              <a href="/opportunities" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline font-medium">
                View discovered opportunities <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
