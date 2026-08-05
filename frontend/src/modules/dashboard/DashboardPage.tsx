import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../shared/services/api.js';
import {
  Target,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Activity as ActivityIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-red-500 bg-red-50 border border-red-200 p-4 rounded-xl">
        Error loading dashboard statistics. Please check your backend connection.
      </div>
    );
  }

  const cardStats = [
    { name: 'Total Leads', value: stats.totalLeads, icon: Target, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { name: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { name: 'Pending Follow-ups', value: stats.pendingFollowups, icon: Clock, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { name: 'Revenue Generated', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'bg-violet-50 text-violet-600 border-violet-100' },
  ];

  const activityChartData = [
    { day: 'Mon', activities: 4 },
    { day: 'Tue', activities: 7 },
    { day: 'Wed', activities: 5 },
    { day: 'Thu', activities: 12 },
    { day: 'Fri', activities: stats.recentActivities?.length || 8 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cardStats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-400">{card.name}</p>
                <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
              </div>
              <div className={`p-4 rounded-xl border ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Activity Volume
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              Last 5 Days
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="activities" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAct)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-6 flex flex-col h-[352px]">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 flex-shrink-0">
            <ActivityIcon className="w-5 h-5 text-blue-600" />
            Recent Activities
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((act: any) => (
                <div key={act.id} className="flex gap-3 text-sm pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="mt-0.5 bg-blue-50 text-blue-600 p-1.5 rounded-lg flex-shrink-0">
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-medium">{act.details}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{act.user?.name}</span>
                      <span>•</span>
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No recent activity logs.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
