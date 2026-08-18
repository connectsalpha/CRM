import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../shared/services/api.js';
import { formatCurrency } from '../../shared/utils/format.js';
import {
  Target,
  Users,
  Clock,
  IndianRupee,
  TrendingUp,
  Activity as ActivityIcon,
  LogIn,
  LogOut,
  Sparkles,
  RefreshCw,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  Calendar,
  AlertCircle,
  Lightbulb,
  Phone,
  CheckCircle,
  Handshake,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data.leads || res.data;
    },
  });

  const isLoading = statsLoading || leadsLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse font-sans">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl h-28 flex items-center justify-between">
              <div className="space-y-2.5 flex-1">
                <div className="bg-slate-200 h-3.5 w-20 rounded-lg"></div>
                <div className="bg-slate-200 h-6 w-16 rounded-lg"></div>
              </div>
              <div className="bg-slate-200 w-12 h-12 rounded-xl"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl h-96 lg:col-span-2">
            <div className="bg-slate-200 h-6 w-32 rounded-lg mb-6"></div>
            <div className="bg-slate-200 h-64 w-full rounded-xl"></div>
          </div>
          <div className="bg-white border border-slate-100 p-6 rounded-2xl h-96">
            <div className="bg-slate-200 h-6 w-32 rounded-lg mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="bg-slate-200 w-8 h-8 rounded-lg flex-shrink-0"></div>
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="bg-slate-200 h-3 w-full rounded-lg"></div>
                    <div className="bg-slate-200 h-2 w-2/3 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="text-red-650 bg-red-50/50 border border-red-200 p-4 rounded-2xl font-medium text-sm font-sans flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span>Error loading dashboard statistics. Please ensure the backend connection is stable.</span>
      </div>
    );
  }

  // 1. Calculate source distribution dynamically
  const sourceCounts: Record<string, number> = {};
  leads.forEach((l: any) => {
    const src = l.source || 'Manual Entry';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const leadsBySourceData = Object.entries(sourceCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  // 2. Calculate pipeline progress summary by status
  const PIPELINE_STATUS_CONFIG = [
    {
      status: 'New Lead',
      description: 'Fresh leads entering the pipeline',
      icon: UserPlus,
      colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
      barColor: 'bg-blue-600',
    },
    {
      status: 'Contacted',
      description: 'Initial outreach & conversation started',
      icon: Phone,
      colorClass: 'text-orange-600 bg-orange-50 border-orange-100',
      barColor: 'bg-orange-600',
    },
    {
      status: 'Qualified',
      description: 'Confirmed need, budget, and interest',
      icon: CheckCircle,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      barColor: 'bg-emerald-600',
    },
    {
      status: 'Proposal Sent',
      description: 'Sent commercial quotation or offer',
      icon: FileText,
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      barColor: 'bg-indigo-600',
    },
    {
      status: 'Negotiation',
      description: 'Discussing terms, pricing, or contract',
      icon: Handshake,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-100',
      barColor: 'bg-amber-600',
    },
    {
      status: 'Follow-up',
      description: 'Active nurture and scheduled followups',
      icon: Calendar,
      colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      barColor: 'bg-cyan-600',
    },
  ];

  // 3. Compute CRM Insights
  const activeLeadsCount = leads.filter((l: any) => l.status !== 'Converted' && l.status !== 'Lost').length;
  const negotiationCount = leads.filter((l: any) => l.status === 'Negotiation').length;
  const convertedCount = leads.filter((l: any) => l.status === 'Converted').length;
  const totalLeadsCount = leads.length;
  const conversionRate = totalLeadsCount > 0 ? ((convertedCount / totalLeadsCount) * 100).toFixed(1) : '0';
  const unconvertedPipelineValue = leads
    .filter((l: any) => l.status !== 'Converted' && l.status !== 'Lost')
    .reduce((sum: number, l: any) => sum + (l.dealValue || 0), 0);

  const cardStats = [
    {
      name: 'Total Leads',
      value: stats.totalLeads,
      description: 'Active client opportunities',
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:scale-110 transition-transform duration-300',
    },
    {
      name: 'Total Customers',
      value: stats.totalCustomers,
      description: 'Converted client profiles',
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:scale-110 transition-transform duration-300',
    },
    {
      name: 'Pending Follow-ups',
      value: stats.pendingFollowups,
      description: 'Scheduled tasks pending',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:scale-110 transition-transform duration-300',
    },
    {
      name: 'Revenue Generated',
      value: formatCurrency(stats.revenue),
      description: 'Total converted contract value',
      icon: IndianRupee,
      color: 'bg-violet-50 text-violet-600 border-violet-100 group-hover:scale-110 transition-transform duration-300',
    },
  ];

  const activityChartData = [
    { day: 'Mon', activities: 4 },
    { day: 'Tue', activities: 7 },
    { day: 'Wed', activities: 5 },
    { day: 'Thu', activities: 12 },
    { day: 'Fri', activities: stats.recentActivities?.length || 8 },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'USER_LOGIN': return LogIn;
      case 'USER_LOGOUT': return LogOut;
      case 'LEAD_CREATED': return Target;
      case 'LEAD_UPDATED': return Edit;
      case 'LEAD_CONVERT': return Sparkles;
      case 'LEAD_STATUS_CHANGE': return RefreshCw;
      case 'LEAD_ASSIGN': return UserPlus;
      case 'LEAD_DELETE': return Trash2;
      case 'QUOTATION_CREATE': return FileText;
      case 'FOLLOWUP_CREATE': return Calendar;
      default: return ActivityIcon;
    }
  };

  const getActivityBadgeClass = (type: string) => {
    if (type.startsWith('LEAD_')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (type.startsWith('USER_')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (type.startsWith('QUOTATION_')) return 'bg-purple-50 text-purple-600 border-purple-100';
    if (type.startsWith('FOLLOWUP_')) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardStats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-card hover-card-premium flex flex-col items-start gap-4 cursor-default">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-[32px] font-bold leading-[1.1] text-text-primary tracking-tight">{card.value}</h3>
                <p className="text-[13px] font-medium uppercase text-text-secondary tracking-[0.03em]">{card.name}</p>
                <p className="text-[13px] text-text-secondary mt-1">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-card lg:col-span-2 space-y-6 flex flex-col justify-between hover-card-premium">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Activity Volume
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              Last 5 Days
            </span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="activities" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAct)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Leads By Source */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-card flex flex-col justify-between h-[352px] hover-card-premium">
          <h3 className="font-bold text-slate-800 text-base">Leads by Source</h3>
          <div className="flex-1 relative flex items-center justify-center">
            {leadsBySourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsBySourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadsBySourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, bottom: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-400 text-xs font-medium">No lead source metrics available.</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Summary Progress Bars */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-card lg:col-span-2 flex flex-col justify-between gap-5 font-sans hover-card-premium">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-text-primary text-[16px] leading-[1.3]">Pipeline Stage Summary</h3>
            </div>
            <p className="text-[13px] text-text-secondary mt-1">Track leads across every stage of your sales pipeline.</p>
          </div>

          <div className="space-y-3">
            {PIPELINE_STATUS_CONFIG.map(({ status, description, icon: Icon, colorClass, barColor }) => {
              const count = leads.filter((l: any) => l.status === status).length;
              const percent = totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0;
              const label = count === 1 ? '1 Lead' : `${count} Leads`;
              
              return (
                <div 
                  key={status} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-md border border-border bg-white hover:border-primary/20 hover:shadow-sm transition-all duration-200 gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${colorClass}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-[14px] leading-tight">{status}</p>
                      <p className="text-[12px] text-text-secondary truncate mt-0.5">{description}</p>
                    </div>
                  </div>

                  <div className="flex-1 max-w-[200px] md:max-w-[250px] hidden md:block">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`${barColor} h-1.5 rounded-full transition-all duration-500 ease-out`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[130px] flex-shrink-0">
                    <span className="text-[14px] font-bold text-text-primary text-right sm:min-w-[65px]">
                      {label}
                    </span>
                    <span className={`text-[12px] px-2.5 py-0.5 rounded-full font-semibold border ${colorClass} min-w-[55px] text-center`}>
                      {percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Summary block using real computed parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
            <div className="p-3 bg-slate-50 rounded-md text-center border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-secondary">Total Leads</p>
              <p className="text-[18px] font-bold text-text-primary mt-0.5">{totalLeadsCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md text-center border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-secondary">Active Pipeline</p>
              <p className="text-[18px] font-bold text-text-primary mt-0.5">{activeLeadsCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md text-center border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-secondary">Won Leads</p>
              <p className="text-[18px] font-bold text-text-primary mt-0.5">{convertedCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md text-center border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-secondary">Conversion Rate</p>
              <p className="text-[18px] font-bold text-text-primary mt-0.5">{conversionRate}%</p>
            </div>
          </div>
        </div>

        {/* CRM Insights & Quick activities logs */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Actionable Insights */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-card space-y-4 flex-1 hover-card-premium">
            <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-700" />
              SaaS CRM Insights
            </h4>
            <ul className="space-y-2.5 text-xs text-indigo-950 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>{activeLeadsCount} total active sales opportunities</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>{negotiationCount} leads currently in price negotiation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Unconverted Pipeline Value: <b>{formatCurrency(unconvertedPipelineValue)}</b></span>
              </li>
            </ul>
          </div>

          {/* Activities Timeline Feed */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-card h-64 flex flex-col justify-between hover-card-premium">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-blue-600" />
              Recent System Activities
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-3 custom-scrollbar">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act: any) => {
                  const Icon = getActivityIcon(act.type);
                  return (
                    <div key={act.id} className="flex gap-3 text-xs pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                      <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${getActivityBadgeClass(act.type)}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 font-semibold truncate">{act.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          <span>By {act.user?.name}</span>
                          <span className="mx-1.5">•</span>
                          <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-xs">No recent activity logs found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
