-- OpportunityRadar AI Database Migration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE opportunity_type AS ENUM (
  'internship', 'research_internship', 'scholarship', 'fellowship',
  'hackathon', 'job', 'competition', 'workshop', 'conference', 'program', 'other'
);

CREATE TYPE work_mode AS ENUM ('remote', 'onsite', 'hybrid', 'not_specified');

CREATE TYPE verification_status AS ENUM ('verified', 'needs_verification', 'unverified', 'expired');

CREATE TYPE eligibility_status AS ENUM (
  'eligible', 'potentially_eligible', 'not_eligible', 'insufficient_info'
);

CREATE TYPE application_status AS ENUM (
  'interested', 'preparing', 'applied', 'assessment',
  'interview', 'selected', 'rejected', 'withdrawn'
);

CREATE TYPE research_job_status AS ENUM (
  'pending', 'searching', 'browsing', 'extracting',
  'validating', 'saving', 'completed', 'failed', 'cancelled'
);

CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  country TEXT,
  location TEXT,
  university TEXT,
  degree TEXT,
  branch TEXT,
  current_year INTEGER,
  graduation_year INTEGER,
  cgpa DECIMAL(3, 2),
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ============================================
-- USER SKILLS
-- ============================================
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  level skill_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill)
);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_types opportunity_type[] DEFAULT '{}',
  preferred_domains TEXT[] DEFAULT '{}',
  preferred_countries TEXT[] DEFAULT '{}',
  work_mode_preference work_mode[] DEFAULT '{}',
  paid_preference TEXT NOT NULL DEFAULT 'both',
  min_stipend INTEGER,
  preferred_duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- OPPORTUNITIES (shared, public-ish)
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  type opportunity_type NOT NULL DEFAULT 'other',
  description TEXT,
  eligibility TEXT,
  deadline TIMESTAMPTZ,
  deadline_is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  duration TEXT,
  location TEXT,
  work_mode work_mode NOT NULL DEFAULT 'not_specified',
  stipend TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  benefits TEXT,
  required_documents TEXT,
  application_procedure TEXT,
  application_url TEXT,
  source_url TEXT NOT NULL,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  last_verified TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization, title, source_url)
);

CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX idx_opportunities_verification ON opportunities(verification_status);
CREATE INDEX idx_opportunities_created ON opportunities(created_at DESC);
CREATE INDEX idx_opportunities_is_demo ON opportunities(is_demo);

-- ============================================
-- OPPORTUNITY SKILLS
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(opportunity_id, skill)
);

CREATE INDEX idx_opportunity_skills_opp_id ON opportunity_skills(opportunity_id);

-- ============================================
-- RECOMMENDATIONS (per user)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  eligibility_status eligibility_status NOT NULL DEFAULT 'insufficient_info',
  matching_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  match_reasons TEXT,
  concerns TEXT,
  next_steps TEXT,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_match_score ON recommendations(match_score DESC);

-- ============================================
-- SAVED OPPORTUNITIES
-- ============================================
CREATE TABLE IF NOT EXISTS saved_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  notes TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_saved_opportunities_user_id ON saved_opportunities(user_id);

-- ============================================
-- APPLICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'interested',
  applied_date DATE,
  deadline DATE,
  interview_date TIMESTAMPTZ,
  notes TEXT,
  external_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_deadline ON applications(deadline);

-- ============================================
-- APPLICATION HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS application_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status application_status,
  to_status application_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_history_app_id ON application_history(application_id);

-- ============================================
-- RESEARCH JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  status research_job_status NOT NULL DEFAULT 'pending',
  category opportunity_type,
  location_filter TEXT,
  search_queries TEXT[] DEFAULT '{}',
  opportunities_found INTEGER NOT NULL DEFAULT 0,
  opportunities_saved INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_jobs_user_id ON research_jobs(user_id);
CREATE INDEX idx_research_jobs_status ON research_jobs(status);

-- ============================================
-- RESEARCH EVENTS (job activity log)
-- ============================================
CREATE TABLE IF NOT EXISTS research_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_events_job_id ON research_events(job_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- RESUMES
-- ============================================
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_data JSONB,
  parse_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_jobs_updated_at BEFORE UPDATE ON research_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- User skills: own data only
CREATE POLICY "Users manage own skills" ON user_skills FOR ALL USING (auth.uid() = user_id);

-- User preferences: own data only
CREATE POLICY "Users manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- Opportunities: publicly readable, service role can insert/update
CREATE POLICY "Opportunities are publicly readable" ON opportunities FOR SELECT USING (TRUE);
CREATE POLICY "Service role manages opportunities" ON opportunities FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Opportunity skills: publicly readable
CREATE POLICY "Opportunity skills are publicly readable" ON opportunity_skills FOR SELECT USING (TRUE);
CREATE POLICY "Service role manages opportunity skills" ON opportunity_skills FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Recommendations: own data only
CREATE POLICY "Users view own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages recommendations" ON recommendations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Saved opportunities: own data only
CREATE POLICY "Users manage own saved opportunities" ON saved_opportunities FOR ALL USING (auth.uid() = user_id);

-- Applications: own data only
CREATE POLICY "Users manage own applications" ON applications FOR ALL USING (auth.uid() = user_id);

-- Application history: own data only
CREATE POLICY "Users view own application history" ON application_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages application history" ON application_history FOR INSERT USING (auth.jwt() ->> 'role' = 'service_role');

-- Research jobs: own data only
CREATE POLICY "Users manage own research jobs" ON research_jobs FOR ALL USING (auth.uid() = user_id);

-- Research events: own job events only
CREATE POLICY "Users view own research events" ON research_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM research_jobs WHERE research_jobs.id = research_events.job_id AND research_jobs.user_id = auth.uid()));
CREATE POLICY "Service role manages research events" ON research_events FOR INSERT USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications: own data only
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Resumes: own data only
CREATE POLICY "Users manage own resumes" ON resumes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DEMO DATA (clearly labeled)
-- ============================================
INSERT INTO opportunities (title, organization, type, description, eligibility, deadline, work_mode, stipend, is_paid, application_url, source_url, verification_status, is_demo)
VALUES
(
  '[DEMO] AI Research Internship - Summer 2026',
  'Demo University AI Lab',
  'research_internship',
  'DEMO DATA: This is a sample opportunity for demonstration purposes. This is NOT a real opportunity. A 12-week summer research internship in artificial intelligence and machine learning. Work with faculty on cutting-edge research projects in NLP, computer vision, or reinforcement learning.',
  'Undergraduate or graduate students in CS, EE, or related fields. GPA 3.0+ preferred. Programming experience required.',
  (NOW() + INTERVAL '60 days'),
  'onsite',
  '$25/hour',
  TRUE,
  'https://example.com/demo-apply',
  'https://example.com/demo',
  'verified',
  TRUE
),
(
  '[DEMO] Global Hackathon - AI for Social Good',
  'Demo Tech Foundation',
  'hackathon',
  'DEMO DATA: This is a sample opportunity. A 48-hour hackathon focused on building AI solutions to address social challenges. Open to students worldwide. Prize pool of $10,000.',
  'Open to all university students and recent graduates (within 1 year). Teams of 2-5.',
  (NOW() + INTERVAL '30 days'),
  'remote',
  '$10,000 prize pool',
  TRUE,
  'https://example.com/demo-hackathon',
  'https://example.com/demo-hackathon',
  'verified',
  TRUE
),
(
  '[DEMO] Graduate Scholarship in Computer Science',
  'Demo Global Foundation',
  'scholarship',
  'DEMO DATA: Sample opportunity. Full scholarship for graduate studies in computer science at top universities worldwide. Covers tuition, living expenses, and travel.',
  'Bachelors degree in CS or related field. Minimum 3.5 GPA. Under 30 years of age.',
  (NOW() + INTERVAL '45 days'),
  'onsite',
  'Full funding',
  TRUE,
  'https://example.com/demo-scholarship',
  'https://example.com/demo-scholarship',
  'verified',
  TRUE
);
