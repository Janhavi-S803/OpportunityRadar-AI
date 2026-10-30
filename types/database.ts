// Database type definitions matching Supabase schema

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

export type VerificationStatus = 'verified' | 'needs_verification' | 'unverified' | 'expired';

export type EligibilityStatus = 'eligible' | 'potentially_eligible' | 'not_eligible' | 'insufficient_info';

export type ApplicationStatus =
  | 'interested'
  | 'preparing'
  | 'applied'
  | 'assessment'
  | 'interview'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export type ResearchJobStatus =
  | 'pending'
  | 'searching'
  | 'browsing'
  | 'extracting'
  | 'validating'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          email: string;
          country: string | null;
          city: string | null;
          location: string | null;
          university: string | null;
          institution: string | null;
          degree: string | null;
          branch: string | null;
          current_year: number | null;
          graduation_year: number | null;
          cgpa: number | null;
          bio: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill: string;
          level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          skill: string;
          level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
        };
        Update: Partial<Database['public']['Tables']['user_skills']['Insert']>;
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          opportunity_types: OpportunityType[];
          preferred_domains: string[];
          preferred_countries: string[];
          work_mode_preference: WorkMode[];
          paid_preference: 'paid' | 'unpaid' | 'both';
          min_stipend: number | null;
          preferred_duration: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          title: string;
          organization: string;
          type: OpportunityType;
          description: string | null;
          eligibility: string | null;
          deadline: string | null;
          deadline_is_estimated: boolean;
          start_date: string | null;
          duration: string | null;
          location: string | null;
          work_mode: WorkMode;
          stipend: string | null;
          is_paid: boolean;
          benefits: string | null;
          required_documents: string | null;
          application_procedure: string | null;
          application_url: string | null;
          source_url: string;
          verification_status: VerificationStatus;
          last_verified: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['opportunities']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>;
      };
      opportunity_skills: {
        Row: {
          id: string;
          opportunity_id: string;
          skill: string;
          is_required: boolean;
        };
        Insert: Omit<Database['public']['Tables']['opportunity_skills']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['opportunity_skills']['Insert']>;
      };
      recommendations: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          match_score: number;
          eligibility_status: EligibilityStatus;
          matching_skills: string[];
          missing_skills: string[];
          match_reasons: string | null;
          concerns: string | null;
          next_steps: string | null;
          ai_analysis: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['recommendations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['recommendations']['Insert']>;
      };
      saved_opportunities: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          notes: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_opportunities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['saved_opportunities']['Insert']>;
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          status: ApplicationStatus;
          applied_date: string | null;
          deadline: string | null;
          interview_date: string | null;
          notes: string | null;
          external_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
      };
      application_history: {
        Row: {
          id: string;
          application_id: string;
          user_id: string;
          from_status: ApplicationStatus | null;
          to_status: ApplicationStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['application_history']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      research_jobs: {
        Row: {
          id: string;
          user_id: string;
          objective: string;
          status: ResearchJobStatus;
          category: OpportunityType | null;
          location_filter: string | null;
          search_queries: string[];
          opportunities_found: number;
          opportunities_saved: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['research_jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['research_jobs']['Insert']>;
      };
      research_events: {
        Row: {
          id: string;
          job_id: string;
          event_type: string;
          message: string;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['research_events']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_url: string;
          file_name: string;
          parsed_data: Record<string, unknown> | null;
          parse_status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resumes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['resumes']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      opportunity_type: OpportunityType;
      work_mode: WorkMode;
      verification_status: VerificationStatus;
      eligibility_status: EligibilityStatus;
      application_status: ApplicationStatus;
      research_job_status: ResearchJobStatus;
    };
  };
}
