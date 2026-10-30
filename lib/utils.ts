import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not specified';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not specified';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return 'Not specified';
  }
}

export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  try {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return null;
    const diff = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function getDeadlineUrgency(deadline: string | null | undefined): 'critical' | 'soon' | 'normal' | 'expired' | null {
  const days = getDaysUntilDeadline(deadline);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= 1) return 'critical';
  if (days <= 3) return 'soon';
  return 'normal';
}

export function getDeadlineLabel(deadline: string | null | undefined): string {
  const days = getDaysUntilDeadline(deadline);
  if (days === null) return 'No deadline';
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return 'Closes today!';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 3) return `Closes in ${days} days`;
  if (days <= 7) return 'Closing this week';
  if (days <= 30) return 'Closing this month';
  return `${days} days remaining`;
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-50';
  if (score >= 60) return 'text-blue-700 bg-blue-50';
  if (score >= 40) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export function getMatchScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
}

export function getEligibilityColor(status: string): string {
  switch (status) {
    case 'eligible': return 'text-green-700 bg-green-50 border-green-200';
    case 'potentially_eligible': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'not_eligible': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getEligibilityLabel(status: string): string {
  switch (status) {
    case 'eligible': return 'Eligible';
    case 'potentially_eligible': return 'Potentially Eligible';
    case 'not_eligible': return 'Not Eligible';
    default: return 'Needs Review';
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getOpportunityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    internship: 'Internship',
    research_internship: 'Research Internship',
    scholarship: 'Scholarship',
    fellowship: 'Fellowship',
    hackathon: 'Hackathon',
    job: 'Job',
    competition: 'Competition',
    workshop: 'Workshop',
    conference: 'Conference',
    program: 'Program',
    other: 'Other',
  };
  return labels[type] || type;
}

export function getOpportunityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    internship: 'bg-blue-100 text-blue-700',
    research_internship: 'bg-purple-100 text-purple-700',
    scholarship: 'bg-amber-100 text-amber-700',
    fellowship: 'bg-pink-100 text-pink-700',
    hackathon: 'bg-orange-100 text-orange-700',
    job: 'bg-green-100 text-green-700',
    competition: 'bg-red-100 text-red-700',
    workshop: 'bg-teal-100 text-teal-700',
    conference: 'bg-indigo-100 text-indigo-700',
    program: 'bg-cyan-100 text-cyan-700',
    other: 'bg-slate-100 text-slate-600',
  };
  return colors[type] || 'bg-slate-100 text-slate-600';
}

export function getWorkModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    remote: 'Remote',
    onsite: 'On-site',
    hybrid: 'Hybrid',
    not_specified: 'Not specified',
  };
  return labels[mode] || mode;
}

export function getApplicationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    interested: 'Interested',
    preparing: 'Preparing',
    applied: 'Applied',
    assessment: 'Assessment',
    interview: 'Interview',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] || status;
}

export function getApplicationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    interested: 'bg-indigo-100 text-indigo-700',
    preparing: 'bg-amber-100 text-amber-700',
    applied: 'bg-blue-100 text-blue-700',
    assessment: 'bg-purple-100 text-purple-700',
    interview: 'bg-cyan-100 text-cyan-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-slate-100 text-slate-600',
  };
  return colors[status] || 'bg-slate-100 text-slate-600';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your_supabase')
  );
}
