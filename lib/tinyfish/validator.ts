// TinyFish validator - validates extracted opportunity data
import type { NormalizedOpportunity, VerificationStatus } from './types';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  verificationStatus: VerificationStatus;
}

export function validateOpportunity(
  opp: Partial<NormalizedOpportunity>
): ValidationResult {
  const issues: string[] = [];

  // Required fields
  if (!opp.title || opp.title.trim().length < 3) {
    issues.push('Missing or too-short title');
  }
  if (!opp.organization || opp.organization.trim().length < 2) {
    issues.push('Missing organization name');
  }
  if (!opp.source_url) {
    issues.push('Missing source URL');
  } else if (!isValidUrl(opp.source_url)) {
    issues.push('Invalid source URL');
  }
  if (!opp.application_url) {
    issues.push('Missing application URL');
  } else if (!isValidUrl(opp.application_url)) {
    issues.push('Invalid application URL');
  }

  // Validate deadline if present
  if (opp.deadline) {
    const deadlineDate = new Date(opp.deadline);
    if (isNaN(deadlineDate.getTime())) {
      issues.push('Invalid deadline date format');
    } else if (deadlineDate < new Date()) {
      issues.push('Deadline appears to be in the past');
    }
  }

  // Determine verification status
  let verificationStatus: VerificationStatus = 'verified';
  if (issues.length > 0) {
    verificationStatus = 'needs_verification';
  }
  if (!opp.deadline && !opp.application_url) {
    verificationStatus = 'unverified';
  }

  return {
    isValid: issues.filter((i) => i.includes('Missing title') || i.includes('Missing organization')).length === 0,
    issues,
    verificationStatus,
  };
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isGenuineOpportunity(
  title: string,
  description: string,
  sourceUrl: string
): boolean {
  // Basic checks to filter obvious non-opportunities
  const text = `${title} ${description}`.toLowerCase();
  
  // Check for spam/scam indicators
  const spamIndicators = [
    'earn \$\$\$',
    'work from home easy money',
    'guaranteed income',
    'no experience needed earn',
    'mlm',
    'multi-level marketing',
  ];
  
  for (const indicator of spamIndicators) {
    if (text.includes(indicator)) return false;
  }

  // Must have a real domain
  if (!isValidUrl(sourceUrl)) return false;

  // Title must look like an opportunity
  const opportunityKeywords = [
    'intern', 'internship', 'fellowship', 'scholarship', 'hackathon',
    'program', 'job', 'position', 'role', 'research', 'grant', 'award',
    'competition', 'workshop', 'conference', 'opportunity', 'apply'
  ];
  
  const hasOpportunityKeyword = opportunityKeywords.some((kw) => text.includes(kw));
  return hasOpportunityKeyword;
}

export function deduplicateOpportunities<T extends { title: string; organization: string; application_url?: string }>(
  opportunities: T[]
): T[] {
  const seen = new Map<string, T>();
  
  for (const opp of opportunities) {
    // Create a dedup key from normalized title + org + URL
    const key = `${normalizeForDedup(opp.organization)}_${normalizeForDedup(opp.title)}`;
    const urlKey = opp.application_url ? normalizeUrl(opp.application_url) : key;
    
    if (!seen.has(key) && !seen.has(urlKey)) {
      seen.set(key, opp);
      if (urlKey !== key) seen.set(urlKey, opp);
    }
  }
  
  // Return unique values
  const unique = new Set(seen.values());
  return Array.from(unique);
}

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 50);
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
