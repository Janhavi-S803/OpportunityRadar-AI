// TinyFish API Types
export interface TinyFishSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
}

export interface TinyFishSearchResponse {
  results: TinyFishSearchResult[];
  query: string;
  total?: number;
}

export interface TinyFishFetchRequest {
  urls: string[];
  format?: 'markdown' | 'html' | 'json';
  purpose?: string;
  links?: boolean;
  image_links?: boolean;
  iframe_links?: boolean;
}

export interface TinyFishFetchResult {
  url: string;
  content: string;
  format: string;
  title?: string;
  links?: string[];
  error?: string;
}

export interface TinyFishFetchResponse {
  results: TinyFishFetchResult[];
}

export interface TinyFishAgentRequest {
  url: string;
  goal: string;
}

export interface TinyFishAgentSSEEvent {
  type: 'progress' | 'completed' | 'error' | 'log';
  message?: string;
  result?: string;
  run_id?: string;
  error?: string;
  data?: unknown;
}

export interface TinyFishAgentResult {
  run_id: string;
  status: 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface NormalizedOpportunity {
  title: string;
  organization: string;
  type: OpportunityType;
  description: string;
  eligibility: string;
  required_skills: string[];
  deadline?: string;
  deadline_is_estimated: boolean;
  start_date?: string;
  duration?: string;
  location: string;
  work_mode: WorkMode;
  stipend?: string;
  is_paid: boolean;
  benefits: string;
  required_documents: string;
  application_procedure: string;
  application_url: string;
  source_url: string;
  last_verified: string;
  verification_status: VerificationStatus;
}

export type OpportunityType =
  | 'internship'
  | 'research_internship'
  | 'scholarship'
  | 'fellowship'
  | 'hackathon'
  | 'job'
  | 'competition'
  | 'workshop'
  | 'conference'
  | 'program'
  | 'other';

export type WorkMode = 'remote' | 'onsite' | 'hybrid' | 'not_specified';

export type VerificationStatus =
  | 'verified'
  | 'needs_verification'
  | 'unverified'
  | 'expired';

export interface TinyFishError {
  code: string;
  message: string;
  status?: number;
  retryable: boolean;
}
