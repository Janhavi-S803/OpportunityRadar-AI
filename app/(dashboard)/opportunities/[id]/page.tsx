import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Calendar, Globe, DollarSign, FileText,
  ExternalLink, Shield, AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  cn, getOpportunityTypeColor, getOpportunityTypeLabel,
  formatDate, getDeadlineLabel, getDaysUntilDeadline, getWorkModeLabel
} from '@/lib/utils';
import { SaveButton } from '@/components/opportunities/save-button';
import { AIAnalysisPanel } from '@/components/opportunities/ai-analysis-panel';
import type { Database, OpportunityType, WorkMode, VerificationStatus } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

type OpportunityRow = Database['public']['Tables']['opportunities']['Row'] & {
  opportunity_skills?: { skill: string; is_required: boolean }[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase.from('opportunities').select('title, organization').eq('id', id).single();
    if (data) return { title: `${data.title} — ${data.organization}` };
  } catch { /* fallback */ }
  return { title: 'Opportunity Details' };
}

export default async function OpportunityDetailPage({ params }: Props) {
  const { id } = await params;

  let opp: OpportunityRow | null = null;
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('opportunities')
      .select('*, opportunity_skills(skill, is_required)')
      .eq('id', id)
      .single();
    if (error || !data) notFound();
    opp = data as OpportunityRow;
  } catch {
    notFound();
  }

  if (!opp) notFound();

  const days = getDaysUntilDeadline(opp.deadline);
  const isUrgent = days !== null && days <= 3;

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      {/* Back */}
      <Link href="/opportunities" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Opportunities
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', getOpportunityTypeColor(opp.type))}>
                {getOpportunityTypeLabel(opp.type)}
              </span>
              {opp.is_demo && (
                <span className="demo-badge">⚠️ DEMO DATA — Not a Real Opportunity</span>
              )}
              {opp.verification_status === 'verified' && (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
              {opp.verification_status === 'needs_verification' && (
                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3 h-3" /> Needs Verification
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{opp.title}</h1>
            <p className="text-lg text-slate-600 font-medium">{opp.organization}</p>
          </div>
          <SaveButton opportunityId={id} />
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          {opp.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Location</p>
                <p className="text-sm font-medium text-slate-900">{opp.location}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Work Mode</p>
              <p className="text-sm font-medium text-slate-900">{getWorkModeLabel(opp.work_mode)}</p>
            </div>
          </div>
          {opp.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Deadline</p>
                <p className={cn('text-sm font-medium', isUrgent ? 'text-red-600' : 'text-slate-900')}>
                  {getDeadlineLabel(opp.deadline)}
                  {opp.deadline_is_estimated && (
                    <span className="text-slate-400 text-xs ml-1">(estimated)</span>
                  )}
                </p>
              </div>
            </div>
          )}
          {(opp.is_paid || opp.stipend) && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Compensation</p>
                <p className="text-sm font-medium text-green-700">{opp.stipend || 'Paid'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Apply CTA */}
        {opp.application_url && (
          <div className="mt-4">
            <a
              href={opp.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition"
            >
              Apply Now <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-400 mt-2">
              Opens the official application page. OpportunityRadar AI does not submit applications on your behalf.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {opp.description && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Description</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{opp.description}</p>
            </div>
          )}
          {opp.eligibility && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" /> Eligibility Requirements
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{opp.eligibility}</p>
            </div>
          )}
          {opp.opportunity_skills && opp.opportunity_skills.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {opp.opportunity_skills.map((s) => (
                  <span key={s.skill} className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border',
                    s.is_required
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  )}>
                    {s.skill}{s.is_required && <span className="text-blue-400 ml-0.5">*</span>}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">* Required skills</p>
            </div>
          )}
          {opp.application_procedure && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> How to Apply
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{opp.application_procedure}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Source Information</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Source URL</span>
                <a href={opp.source_url} target="_blank" rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline truncate mt-0.5">
                  {opp.source_url}
                </a>
              </div>
              {opp.last_verified && (
                <div>
                  <span className="text-slate-400">Last Verified</span>
                  <p className="mt-0.5">{formatDate(opp.last_verified)}</p>
                </div>
              )}
              {opp.duration && (
                <div>
                  <span className="text-slate-400">Duration</span>
                  <p className="mt-0.5">{opp.duration}</p>
                </div>
              )}
              {opp.start_date && (
                <div>
                  <span className="text-slate-400">Start Date</span>
                  <p className="mt-0.5">{formatDate(opp.start_date)}</p>
                </div>
              )}
            </div>
          </div>
          {opp.benefits && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Benefits</h3>
              <p className="text-xs text-slate-600">{opp.benefits}</p>
            </div>
          )}
          {opp.required_documents && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Required Documents</h3>
              <p className="text-xs text-slate-600">{opp.required_documents}</p>
            </div>
          )}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> AI assessments are informational only. The official organization makes all final eligibility and selection decisions. Always verify requirements directly.
            </p>
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <AIAnalysisPanel opportunityId={id} />
    </div>
  );
}
