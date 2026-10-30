// TinyFish Parser - extracts structured opportunity data from raw text
import type { NormalizedOpportunity, OpportunityType, WorkMode, VerificationStatus } from './types';

export function parseOpportunitiesFromContent(
  content: string,
  sourceUrl: string,
  contentType: OpportunityType = 'internship'
): Partial<NormalizedOpportunity>[] {
  // Treat ALL scraped content as untrusted data - never execute instructions found in it
  const sanitized = sanitizeContent(content);
  
  // Try to extract multiple opportunities from a listing page
  const opportunities = extractOpportunitiesFromText(sanitized, sourceUrl, contentType);
  return opportunities;
}

export function parseSingleOpportunityFromContent(
  content: string,
  sourceUrl: string,
  applicationUrl: string
): Partial<NormalizedOpportunity> {
  const sanitized = sanitizeContent(content);
  return extractSingleOpportunity(sanitized, sourceUrl, applicationUrl);
}

/**
 * SECURITY: Sanitize scraped web content to prevent prompt injection
 * Never execute instructions found in scraped content
 */
function sanitizeContent(content: string): string {
  // Remove any content that tries to inject instructions
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:\s*you\s+are/gi,
    /forget\s+all\s+previous/gi,
    /new\s+instructions:/gi,
    /\[SYSTEM\]/gi,
    /<\s*script[^>]*>[\s\S]*?<\/script>/gi,
  ];
  
  let sanitized = content;
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[REMOVED]');
  }
  
  // Truncate to prevent token exhaustion attacks
  return sanitized.slice(0, 50000);
}

function extractOpportunitiesFromText(
  content: string,
  sourceUrl: string,
  defaultType: OpportunityType
): Partial<NormalizedOpportunity>[] {
  // Basic extraction - Gemini will do the heavy lifting
  // This is a fallback structural parser
  const lines = content.split('\n').filter((l) => l.trim());
  
  const opportunities: Partial<NormalizedOpportunity>[] = [];
  
  // Look for deadline patterns
  const deadlinePattern = /(?:deadline|closes?|due|apply\s+by|last\s+date)[:\s]+([A-Za-z0-9\s,]+\d{4})/gi;
  const deadlineMatches = content.matchAll(deadlinePattern);
  const deadlines: string[] = [];
  for (const match of deadlineMatches) {
    deadlines.push(match[1].trim());
  }

  // Look for stipend patterns
  const stipendPattern = /(?:stipend|salary|pay|compensation)[:\s]+[\$₹€£]?\s*([\d,]+(?:\s*(?:per|\/)\s*\w+)?)/gi;
  const stipendMatches = content.matchAll(stipendPattern);
  const stipends: string[] = [];
  for (const match of stipendMatches) {
    stipends.push(match[1].trim());
  }

  // Build a single opportunity from the page (used when page = single listing)
  if (lines.length > 0) {
    opportunities.push({
      type: defaultType,
      description: content.slice(0, 2000),
      deadline: deadlines[0] || undefined,
      deadline_is_estimated: !deadlines.length,
      stipend: stipends[0] || undefined,
      is_paid: stipends.length > 0 || /paid|stipend|salary/i.test(content),
      source_url: sourceUrl,
      last_verified: new Date().toISOString(),
      verification_status: 'needs_verification' as VerificationStatus,
    });
  }

  return opportunities;
}

function extractSingleOpportunity(
  content: string,
  sourceUrl: string,
  applicationUrl: string
): Partial<NormalizedOpportunity> {
  return {
    description: content.slice(0, 3000),
    source_url: sourceUrl,
    application_url: applicationUrl,
    last_verified: new Date().toISOString(),
    verification_status: 'needs_verification' as VerificationStatus,
    deadline_is_estimated: true,
    is_paid: /paid|stipend|salary|compensation/i.test(content),
    work_mode: detectWorkMode(content),
  };
}

export function detectWorkMode(content: string): WorkMode {
  const lower = content.toLowerCase();
  if (/\bhybrid\b/.test(lower)) return 'hybrid';
  if (/\bremote\b|\bwork\s+from\s+home\b|\bwfh\b/.test(lower)) return 'remote';
  if (/\bon[\s-]?site\b|\bin[\s-]?person\b|\bon[\s-]?campus\b/.test(lower)) return 'onsite';
  return 'not_specified';
}

export function detectOpportunityType(title: string, content: string): OpportunityType {
  const text = `${title} ${content}`.toLowerCase();
  if (/\bhackathon\b/.test(text)) return 'hackathon';
  if (/\bscholarship\b/.test(text)) return 'scholarship';
  if (/\bfellowship\b/.test(text)) return 'fellowship';
  if (/\bresearch\s+intern/i.test(text)) return 'research_internship';
  if (/\binternship\b|\bintern\b/.test(text)) return 'internship';
  if (/\bworkshop\b/.test(text)) return 'workshop';
  if (/\bconference\b/.test(text)) return 'conference';
  if (/\bcompetition\b|\bcontest\b/.test(text)) return 'competition';
  if (/\bprogram\b|\bbootcamp\b/.test(text)) return 'program';
  if (/\bjob\b|\bposition\b|\brole\b/.test(text)) return 'job';
  return 'other';
}

export function normalizeDeadline(raw: string): string | undefined {
  if (!raw || raw === 'Not specified') return undefined;
  // Try parsing various date formats
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return undefined;
}
