import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../shared/services/api.js';
import { formatCurrency } from '../../shared/utils/format.js';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { BarChart3, FileText, Users, Download } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState<'leads' | 'customers' | 'sales'>('leads');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/users/employees');
      return res.data;
    },
  });

  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ['report', reportType, startDate, endDate, selectedEmployeeId, selectedStatus],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedEmployeeId) params.employeeId = selectedEmployeeId;
      if (selectedStatus && reportType === 'leads') params.status = selectedStatus;

      const res = await api.get(`/reports/${reportType}`, { params });
      return res.data;
    },
  });

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    let headers: string[] = [];
    let rows: any[] = [];

    if (reportType === 'leads') {
      headers = ['Name', 'Business Name', 'Email', 'Source', 'Status', 'Priority', 'Assigned To', 'Created Date'];
      rows = reportData.map((lead: any) => [
        lead.name,
        lead.businessName || '',
        lead.email,
        lead.source,
        lead.status,
        lead.priority,
        lead.assignedEmployee?.name || 'Unassigned',
        new Date(lead.createdAt).toLocaleDateString(),
      ]);
    } else if (reportType === 'customers') {
      headers = ['Name', 'Email', 'Phone', 'Assigned To', 'Converted Date'];
      rows = reportData.map((cust: any) => [
        cust.lead?.name || '',
        cust.lead?.email || '',
        cust.lead?.mobile || '',
        cust.lead?.assignedEmployee?.name || 'Unassigned',
        new Date(cust.createdAt).toLocaleDateString(),
      ]);
    } else if (reportType === 'sales') {
      headers = ['Lead/Customer', 'Business Name', 'Assigned Employee', 'Sale Date', 'Revenue Value'];
      rows = reportData.map((sale: any) => [
        sale.name,
        sale.businessName || '',
        sale.assignedEmployee?.name || 'Unassigned',
        new Date(sale.updatedAt).toLocaleDateString(),
        sale.dealValue,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex gap-2">
            {[
              { id: 'leads', label: 'Lead Report', icon: FileText },
              { id: 'customers', label: 'Customer Report', icon: Users },
              { id: 'sales', label: 'Sales Report', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setReportType(tab.id as any);
                    setSelectedStatus('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    reportType === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!reportData || reportData.length === 0}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
            />
          </div>

          {user?.role === 'Admin' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white font-medium"
              >
                <option value="">All Employees</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'leads' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white font-medium"
              >
                <option value="">All Statuses</option>
                {['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Follow-up', 'Converted', 'Lost'].map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse font-sans">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="bg-slate-200 h-4 w-32 rounded-lg"></div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="bg-slate-200 h-4 w-28 rounded-lg"></div>
                <div className="bg-slate-200 h-4 w-36 rounded-lg"></div>
                <div className="bg-slate-200 h-4 w-24 rounded-lg flex-1"></div>
                <div className="bg-slate-200 h-4 w-12 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {reportType === 'leads' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Business Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-bg transition-colors h-12 text-[14px]">
                      <td className="p-4 font-semibold text-text-primary">{lead.name}</td>
                      <td className="p-4 text-text-secondary">{lead.businessName || '-'}</td>
                      <td className="p-4 text-text-secondary">{lead.email}</td>
                      <td className="p-4 text-text-secondary">{lead.source}</td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[12px] font-semibold">{lead.status}</span></td>
                      <td className="p-4"><span className="bg-slate-100 text-text-secondary px-2.5 py-1 rounded-full text-[12px]">{lead.priority}</span></td>
                      <td className="p-4 text-text-secondary">{lead.assignedEmployee?.name || 'Unassigned'}</td>
                      <td className="p-4 text-text-secondary">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Converted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((cust: any) => (
                    <tr key={cust.id} className="hover:bg-bg transition-colors h-12 text-[14px]">
                      <td className="p-4 font-semibold text-text-primary">{cust.lead?.name}</td>
                      <td className="p-4 text-text-secondary">{cust.lead?.email}</td>
                      <td className="p-4 text-text-secondary">{cust.lead?.mobile}</td>
                      <td className="p-4 text-text-secondary">{cust.lead?.assignedEmployee?.name || 'Unassigned'}</td>
                      <td className="p-4 text-text-secondary">{new Date(cust.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'sales' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-4">Lead/Customer</th>
                    <th className="p-4">Business Name</th>
                    <th className="p-4">Assigned Employee</th>
                    <th className="p-4">Sale Date</th>
                    <th className="p-4 text-right">Revenue Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-bg transition-colors h-12 text-[14px]">
                      <td className="p-4 font-semibold text-text-primary">{sale.name}</td>
                      <td className="p-4 text-text-secondary">{sale.businessName || '-'}</td>
                      <td className="p-4 text-text-secondary">{sale.assignedEmployee?.name || 'Unassigned'}</td>
                      <td className="p-4 text-text-secondary">{new Date(sale.updatedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right font-bold text-success">{formatCurrency(sale.dealValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
