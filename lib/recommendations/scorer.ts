// AI Recommendation Engine - Deterministic scoring + Gemini semantic analysis
import { generateJsonWithGemini, isGeminiConfigured } from '@/lib/gemini/client';
import type { EligibilityStatus } from '@/types/database';

export interface UserProfile {
  skills: string[];
  education: {
    degree: string | null;
    branch: string | null;
    current_year: number | null;
    graduation_year: number | null;
    cgpa: number | null;
  };
  interests: string[];
  preferences: {
    opportunity_types: string[];
    preferred_countries: string[];
    work_mode_preference: string[];
    paid_preference: string;
    min_stipend: number | null;
  };
}

export interface OpportunityProfile {
  id: string;
  title: string;
  organization: string;
  type: string;
  description: string;
  eligibility: string;
  required_skills: string[];
  location: string;
  work_mode: string;
  is_paid: boolean;
  stipend: string;
  deadline: string | null;
}

export interface MatchResult {
  match_score: number;
  eligibility_status: EligibilityStatus;
  matching_skills: string[];
  missing_skills: string[];
  match_reasons: string;
  concerns: string;
  next_steps: string;
  ai_analysis: string;
  score_breakdown: {
    skills_score: number;
    education_score: number;
    domain_score: number;
    location_score: number;
    experience_score: number;
    compensation_score: number;
  };
}

/**
 * Calculate deterministic match score (0-100)
 * Scoring weights:
 * - Skills match: 30 points
 * - Education & eligibility match: 25 points
 * - Domain interest match: 20 points
 * - Location & work mode preference: 10 points
 * - Experience relevance: 10 points
 * - Compensation preference: 5 points
 */
export function calculateMatchScore(
  user: UserProfile,
  opportunity: OpportunityProfile
): {
  score: number;
  breakdown: MatchResult['score_breakdown'];
  matchingSkills: string[];
  missingSkills: string[];
} {
  const userSkillsLower = user.skills.map((s) => s.toLowerCase());
  const oppSkillsLower = opportunity.required_skills.map((s) => s.toLowerCase());

  // 1. Skills score (30 pts)
  const matchingSkills = user.skills.filter((skill) =>
    oppSkillsLower.some((os) => os.includes(skill.toLowerCase()) || skill.toLowerCase().includes(os))
  );
  const missingSkills = opportunity.required_skills.filter(
    (skill) => !userSkillsLower.some((us) => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
  );

  const skillsScore = oppSkillsLower.length > 0
    ? Math.round((matchingSkills.length / oppSkillsLower.length) * 30)
    : 15; // If no skills listed, give partial credit

  // 2. Education score (25 pts)
  let educationScore = 10; // Base
  const oppTextLower = `${opportunity.description} ${opportunity.eligibility}`.toLowerCase();
  
  if (user.education.degree && oppTextLower.includes(user.education.degree.toLowerCase())) {
    educationScore += 8;
  }
  if (user.education.branch && oppTextLower.includes(user.education.branch.toLowerCase())) {
    educationScore += 7;
  }
  // Check year eligibility
  if (user.education.current_year) {
    if (oppTextLower.includes('undergraduate') || oppTextLower.includes('bachelor')) {
      if (user.education.degree?.toLowerCase().includes('bachelor') || !user.education.degree) {
        educationScore = Math.min(25, educationScore + 5);
      }
    }
    if (oppTextLower.includes('graduate') || oppTextLower.includes('master') || oppTextLower.includes('phd')) {
      if (user.education.degree?.toLowerCase().includes('master') || user.education.degree?.toLowerCase().includes('phd')) {
        educationScore = Math.min(25, educationScore + 5);
      }
    }
  }
  educationScore = Math.min(25, educationScore);

  // 3. Domain interest score (20 pts)
  const interestsLower = user.interests.map((i) => i.toLowerCase());
  const domainMatches = interestsLower.filter((interest) =>
    oppTextLower.includes(interest) || 
    opportunity.title.toLowerCase().includes(interest)
  );
  const domainScore = interestsLower.length > 0
    ? Math.min(20, Math.round((domainMatches.length / Math.max(interestsLower.length, 1)) * 20) + (domainMatches.length > 0 ? 8 : 0))
    : 10;

  // 4. Location & work mode (10 pts)
  let locationScore = 0;
  const userWorkModes = user.preferences.work_mode_preference.map((m) => m.toLowerCase());
  if (userWorkModes.includes(opportunity.work_mode.toLowerCase())) {
    locationScore += 5;
  }
  const userCountries = user.preferences.preferred_countries.map((c) => c.toLowerCase());
  if (
    userCountries.length === 0 ||
    userCountries.some((c) => opportunity.location?.toLowerCase().includes(c)) ||
    opportunity.work_mode === 'remote'
  ) {
    locationScore += 5;
  }

  // 5. Experience relevance (10 pts) - approximated from opportunity type match
  let experienceScore = 5;
  if (user.preferences.opportunity_types.includes(opportunity.type)) {
    experienceScore = 10;
  }

  // 6. Compensation preference (5 pts)
  let compensationScore = 0;
  if (user.preferences.paid_preference === 'both') {
    compensationScore = 5;
  } else if (user.preferences.paid_preference === 'paid' && opportunity.is_paid) {
    compensationScore = 5;
  } else if (user.preferences.paid_preference === 'unpaid' && !opportunity.is_paid) {
    compensationScore = 5;
  } else if (opportunity.is_paid) {
    compensationScore = 3; // Still valuable even if preference was unpaid
  }

  const totalScore = skillsScore + educationScore + domainScore + locationScore + experienceScore + compensationScore;

  return {
    score: Math.min(100, totalScore),
    breakdown: {
      skills_score: skillsScore,
      education_score: educationScore,
      domain_score: domainScore,
      location_score: locationScore,
      experience_score: experienceScore,
      compensation_score: compensationScore,
    },
    matchingSkills,
    missingSkills,
  };
}

/**
 * Assess eligibility - NEVER inventinformation not present
 */
export function assessEligibility(
  user: UserProfile,
  opportunity: OpportunityProfile
): EligibilityStatus {
  const eligibilityText = opportunity.eligibility?.toLowerCase() || '';
  
  if (!eligibilityText || eligibilityText.length < 10) {
    return 'insufficient_info';
  }

  let eligibilityScore = 0;
  let totalChecks = 0;

  // Check degree requirement
  if (eligibilityText.includes('phd') || eligibilityText.includes('doctorate')) {
    totalChecks++;
    if (user.education.degree?.toLowerCase().includes('phd')) eligibilityScore++;
    else return 'not_eligible'; // Hard requirement
  }

  if (eligibilityText.includes('undergraduate') || eligibilityText.includes('bachelor')) {
    totalChecks++;
    if (!user.education.degree || user.education.degree.toLowerCase().includes('bachelor')) {
      eligibilityScore++;
    }
  }

  // Check graduation year
  const gradYearMatch = eligibilityText.match(/(?:graduating|graduate)\s+(?:in|by)\s+(\d{4})/i);
  if (gradYearMatch && user.education.graduation_year) {
    totalChecks++;
    if (user.education.graduation_year <= parseInt(gradYearMatch[1])) {
      eligibilityScore++;
    }
  }

  // Check minimum GPA
  const gpaMatch = eligibilityText.match(/(?:gpa|cgpa)\s*(?:of\s*)?(\d+\.?\d*)\+?/i);
  if (gpaMatch && user.education.cgpa) {
    totalChecks++;
    if (user.education.cgpa >= parseFloat(gpaMatch[1])) {
      eligibilityScore++;
    } else {
      return 'not_eligible'; // Hard GPA requirement
    }
  }

  if (totalChecks === 0) return 'potentially_eligible';
  if (eligibilityScore === totalChecks) return 'eligible';
  if (eligibilityScore >= totalChecks * 0.5) return 'potentially_eligible';
  return 'not_eligible';
}

/**
 * Generate AI analysis using Gemini
 * IMPORTANT: Gemini is used for semantic explanation only, NOT for scoring
 */
export async function generateAIAnalysis(
  user: UserProfile,
  opportunity: OpportunityProfile,
  matchResult: Omit<MatchResult, 'ai_analysis' | 'match_reasons' | 'concerns' | 'next_steps'>
): Promise<{ match_reasons: string; concerns: string; next_steps: string; ai_analysis: string }> {
  if (!isGeminiConfigured()) {
    return {
      match_reasons: `Matched ${matchResult.matching_skills.length} of your skills with this opportunity. Score: ${matchResult.match_score}/100.`,
      concerns: matchResult.missing_skills.length > 0 ? `Missing skills: ${matchResult.missing_skills.slice(0, 3).join(', ')}` : 'No major concerns identified.',
      next_steps: 'Review the opportunity requirements and prepare your application materials.',
      ai_analysis: 'AI analysis unavailable (Gemini not configured)',
    };
  }

  const prompt = `You are an opportunity matching advisor. Analyze this match between a user profile and an opportunity.

USER PROFILE:
- Skills: ${user.skills.join(', ')}
- Education: ${user.education.degree || 'Not specified'} in ${user.education.branch || 'Not specified'}
- Year: ${user.education.current_year || 'Not specified'}, Graduation: ${user.education.graduation_year || 'Not specified'}
- Interests: ${user.interests.join(', ')}

OPPORTUNITY:
- Title: ${opportunity.title}
- Organization: ${opportunity.organization}
- Type: ${opportunity.type}
- Description: ${opportunity.description?.slice(0, 500) || 'Not available'}
- Eligibility: ${opportunity.eligibility || 'Not specified'}
- Required Skills: ${opportunity.required_skills.join(', ')}
- Location: ${opportunity.location}, Mode: ${opportunity.work_mode}

MATCH DATA (calculated deterministically - do NOT change these numbers):
- Match Score: ${matchResult.match_score}/100
- Eligibility: ${matchResult.eligibility_status}
- Matching Skills: ${matchResult.matching_skills.join(', ')}
- Missing Skills: ${matchResult.missing_skills.join(', ')}

Generate a concise analysis. Return JSON with these exact keys:
{
  "match_reasons": "2-3 sentence explanation of why this matches the user's profile",
  "concerns": "1-2 sentences on potential concerns or gaps (or 'No major concerns' if none)",
  "next_steps": "2-3 actionable preparation steps",
  "ai_analysis": "One paragraph comprehensive analysis"
}

IMPORTANT RULES:
- Never invent eligibility requirements not in the data
- Never change the match score
- Base all statements on the data provided
- Keep responses concise and professional`;

  try {
    const result = await generateJsonWithGemini<{
      match_reasons: string;
      concerns: string;
      next_steps: string;
      ai_analysis: string;
    }>(prompt);
    return result;
  } catch (err) {
    console.error('[Recommendation] Gemini analysis failed:', err);
    return {
      match_reasons: `This opportunity matches ${matchResult.matching_skills.length} of your skills and aligns with your ${opportunity.type} preference.`,
      concerns: matchResult.missing_skills.length > 0 
        ? `Consider developing: ${matchResult.missing_skills.slice(0, 3).join(', ')}`
        : 'Profile aligns well with this opportunity.',
      next_steps: '1. Review full eligibility requirements. 2. Prepare required documents. 3. Apply before the deadline.',
      ai_analysis: `Your profile has a ${matchResult.match_score}% match with this ${opportunity.type}. ${matchResult.matching_skills.length > 0 ? `You have relevant skills including ${matchResult.matching_skills.slice(0, 3).join(', ')}.` : ''}`,
    };
  }
}
