'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Save, Loader2, Plus, X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/utils';

interface ProfileForm {
  full_name: string;
  bio: string;
  degree: string;
  branch: string;
  institution: string;
  current_year: number | '';
  graduation_year: number | '';
  cgpa: number | '';
  city: string;
  country: string;
}

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'Data Analysis', 'SQL', 'TensorFlow', 'PyTorch', 'Research',
  'UI/UX Design', 'Product Management', 'Agile', 'Git',
];

const POPULAR_DOMAINS = [
  'Artificial Intelligence', 'Machine Learning', 'Web Development', 'Mobile Development',
  'Data Science', 'Cybersecurity', 'Blockchain', 'Cloud Computing',
  'Research', 'Embedded Systems', 'IoT', 'Robotics', 'Bioinformatics',
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileForm>();

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Use sequential queries with explicit types to avoid TypeScript inference issues
        const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).single() as { data: Record<string, unknown> | null };
        const { data: skillsData } = await supabase.from('user_skills').select('skill').eq('user_id', user.id) as { data: Array<{ skill: string }> | null };
        const { data: prefsData } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single() as { data: Record<string, unknown> | null };

        if (profileData) {
          reset({
            full_name: (profileData.full_name as string) || '',
            bio: (profileData.bio as string) || '',
            degree: (profileData.degree as string) || '',
            branch: (profileData.branch as string) || '',
            institution: (profileData.institution as string) || '',
            current_year: (profileData.current_year as number) || '',
            graduation_year: (profileData.graduation_year as number) || '',
            cgpa: (profileData.cgpa as number) || '',
            city: (profileData.city as string) || '',
            country: (profileData.country as string) || '',
          });
        }

        setSkills((skillsData || []).map(s => s.skill));
        setInterests(((prefsData?.preferred_domains as string[]) || []));
      } catch { /* empty */ } finally { setLoading(false); };
    };
    load();
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    if (!isSupabaseConfigured()) { toast.error('Configure Supabase to save profile'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in'); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      const profilePayload = {
        user_id: user.id,
        email: user.email || '',
        full_name: data.full_name,
        bio: data.bio || null,
        degree: data.degree || null,
        branch: data.branch || null,
        institution: data.institution || null,
        current_year: data.current_year || null,
        graduation_year: data.graduation_year || null,
        cgpa: data.cgpa || null,
        city: data.city || null,
        country: data.country || null,
        onboarding_completed: true,
      };
      const { error: profileError } = await sb.from('profiles').upsert(profilePayload, { onConflict: 'user_id' });
      if (profileError) throw profileError;

      // Save skills
      await sb.from('user_skills').delete().eq('user_id', user.id);
      if (skills.length > 0) {
        await sb.from('user_skills').insert(skills.map((skill: string) => ({ user_id: user.id, skill })));
      }

      // Save preferences
      await sb.from('user_preferences').upsert({
        user_id: user.id,
        preferred_domains: interests,
      }, { onConflict: 'user_id' });

      toast.success('Profile saved successfully!');
    } catch (err) {
      toast.error('Failed to save profile: ' + (err as Error).message);
    } finally { setSaving(false); }

  };

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (clean && !skills.includes(clean)) setSkills(prev => [...prev, clean]);
  };

  const toggleInterest = (domain: string) => {
    setInterests(prev => prev.includes(domain) ? prev.filter(i => i !== domain) : [...prev, domain]);
  };

  if (loading) return <div className="card p-8"><div className="skeleton h-96 w-full" /></div>;

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" /> My Profile
        </h1>
        <p className="text-slate-500 text-sm">Your profile powers AI matching. Keep it up to date for better recommendations.</p>
      </div>

      {!isSupabaseConfigured() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠️ Demo mode — configure Supabase to save your profile and get personalized AI recommendations.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input {...register('full_name')} placeholder="Jane Smith"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input {...register('city')} placeholder="Mumbai"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
              <input {...register('country')} placeholder="India"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio / About Me</label>
            <textarea {...register('bio')} rows={3} placeholder="A brief description of yourself, your goals and areas of interest..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Education */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Education</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Degree</label>
              <select {...register('degree')} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select degree</option>
                <option>Bachelor's</option>
                <option>Master's</option>
                <option>PhD</option>
                <option>Diploma</option>
                <option>High School</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch / Major</label>
              <input {...register('branch')} placeholder="Computer Engineering"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution</label>
              <input {...register('institution')} placeholder="IIT Bombay"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Year</label>
              <select {...register('current_year', { valueAsNumber: true })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select year</option>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
                <option value={0}>Graduated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Graduation Year</label>
              <input {...register('graduation_year', { valueAsNumber: true })} type="number" placeholder="2026" min={2020} max={2035}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CGPA / GPA</label>
              <input {...register('cgpa', { valueAsNumber: true })} type="number" step="0.01" placeholder="8.5" min={0} max={10}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Skills</h2>
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Used for AI matching
            </span>
          </div>

          <div className="flex gap-2">
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); setSkillInput(''); } }}
              placeholder="Type a skill and press Enter"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => { addSkill(skillInput); setSkillInput(''); }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm">
                {s}
                <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="text-blue-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter(s => !skills.includes(s)).map(s => (
                <button key={s} type="button" onClick={() => addSkill(s)}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-slate-600 transition">
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Research Interests</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_DOMAINS.map(domain => (
              <button key={domain} type="button" onClick={() => toggleInterest(domain)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${
                  interests.includes(domain) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {domain}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
