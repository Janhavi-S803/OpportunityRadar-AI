import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardOverview } from '@/components/dashboard/overview';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';
import { ClosingSoon } from '@/components/dashboard/closing-soon';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ConfigBanner } from '@/components/dashboard/config-banner';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="space-y-6 fade-in">
      {/* Config banner if services not set up */}
      <ConfigBanner />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back. Here&apos;s your opportunity overview.</p>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<StatsLoading />}>
        <QuickStats />
      </Suspense>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<CardLoading />}>
            <DashboardOverview />
          </Suspense>
          <Suspense fallback={<CardLoading />}>
            <RecentOpportunities />
          </Suspense>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          <Suspense fallback={<CardLoading />}>
            <ClosingSoon />
          </Suspense>
          <Suspense fallback={<CardLoading />}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="skeleton h-4 w-24 mb-2" />
          <div className="skeleton h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function CardLoading() {
  return (
    <div className="card p-6">
      <div className="skeleton h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
