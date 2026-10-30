import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #102A43 0%, #0F172A 50%, #1E3A5F 100%)' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 opacity-40 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-cyan-400 opacity-60" />
              <div className="absolute inset-4 rounded-full border-2 border-cyan-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">OpportunityRadar</div>
              <div className="text-cyan-400 text-sm font-semibold tracking-widest uppercase">AI</div>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Your Next Opportunity Is Out There.
            <span className="block text-cyan-400">We&#39;ll Find It.</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            AI-powered opportunity discovery for students and early-career professionals. 
            Internships, scholarships, hackathons, research programs — all matched to your profile.
          </p>

          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '🎯', label: 'Smart Matching', desc: 'AI scores opportunities based on your profile' },
              { icon: '🔍', label: 'Real Research', desc: 'Live web discovery via TinyFish AI engine' },
              { icon: '📅', label: 'Deadline Tracking', desc: 'Never miss an application deadline' },
              { icon: '📊', label: 'Application Board', desc: 'Kanban tracker for all your applications' },
            ].map((feature) => (
              <div key={feature.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <div className="font-semibold text-sm">{feature.label}</div>
                <div className="text-slate-400 text-xs mt-1">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-gray-950">
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-40" />
            <div className="absolute inset-1 rounded-full border-2 border-blue-500 opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900">OpportunityRadar AI</span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>

        <p className="mt-8 text-xs text-slate-400 text-center">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-blue-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="#" className="text-blue-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
