'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, getOpportunityTypeLabel } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

const DEMO_CATEGORY_DATA = [
  { name: 'Internship', value: 1, color: '#3B82F6' },
  { name: 'Hackathon', value: 1, color: '#F59E0B' },
  { name: 'Scholarship', value: 1, color: '#10B981' },
];

export function DashboardOverview() {
  const [categoryData, setCategoryData] = useState(DEMO_CATEGORY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('opportunities').select('type');
        
        if (data && data.length > 0) {
          const counts: Record<string, number> = {};
          data.forEach(({ type }) => { counts[type] = (counts[type] || 0) + 1; });
          
          const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E', '#06B6D4', '#64748B'];
          const chartData = Object.entries(counts).map(([key, value], i) => ({
            name: getOpportunityTypeLabel(key),
            value,
            color: colors[i % colors.length],
          }));
          setCategoryData(chartData);
        }
      } catch { /* use demo data */ } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Opportunity Distribution</h3>
        </div>
        <Link href="/analytics" className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>

      {loading ? (
        <div className="skeleton h-48 w-full" />
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
