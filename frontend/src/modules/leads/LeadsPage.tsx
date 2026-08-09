import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { useToastStore } from '../../shared/hooks/useToastStore.js';
import { formatCurrency } from '../../shared/utils/format.js';
import {
  Plus,
  Kanban as KanbanIcon,
  Table as TableIcon,
  Search,
  UserCheck,
  Edit2,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  whatsappNumber: z.string().optional(),
  email: z.string().email('Invalid email'),
  businessName: z.string().optional(),
  location: z.string().optional(),
  interestedService: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  status: z.string().default('New Lead'),
  priority: z.string().default('Medium'),
  dealValue: z.preprocess((val) => Number(val) || 0, z.number().nonnegative()),
  followupDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  assignedEmployeeId: z.preprocess((val) => val ? Number(val) : null, z.number().nullable().optional()),
});

type LeadFormValues = z.infer<typeof leadSchema>;

const LEAD_STATUSES = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Follow-up',
  'Converted',
  'Lost',
];

const LEAD_SOURCES = [
  'Website',
  'WhatsApp',
  'Meta Ads',
  'Google Ads',
  'Social Media',
  'QR Code',
  'Phone Calls',
  'Referrals',
  'Manual Entry',
];

const PRIORITIES = ['Low', 'Medium', 'High'];

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'New Lead': return 'bg-sky-50 text-sky-600 border border-sky-100';
    case 'Contacted': return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    case 'Qualified': return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    case 'Proposal Sent': return 'bg-purple-50 text-purple-600 border border-purple-100';
    case 'Negotiation': return 'bg-pink-50 text-pink-600 border border-pink-105';
    case 'Follow-up': return 'bg-amber-50 text-amber-600 border border-amber-100';
    case 'Converted': return 'bg-teal-50 text-teal-600 border border-teal-100';
    case 'Lost': return 'bg-rose-50 text-rose-600 border border-rose-100';
    default: return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case 'High': return 'bg-red-50 text-red-600 border border-red-100';
    case 'Medium': return 'bg-amber-50 text-amber-600 border border-amber-100';
    case 'Low': return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    default: return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
};

export default function LeadsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSource]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/users/employees');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: LeadFormValues) => api.post('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsModalOpen(false);
      addToast('Lead created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LeadFormValues> }) =>
      api.put(`/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsModalOpen(false);
      setEditingLead(null);
      addToast('Lead updated successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => api.post(`/leads/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  const openCreateModal = () => {
    setEditingLead(null);
    reset({
      name: '',
      mobile: '',
      whatsappNumber: '',
      email: '',
      businessName: '',
      location: '',
      interestedService: '',
      source: 'Website',
      status: 'New Lead',
      priority: 'Medium',
      dealValue: 0,
      notes: '',
      assignedEmployeeId: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    reset({
      name: lead.name,
      mobile: lead.mobile,
      whatsappNumber: lead.whatsappNumber || '',
      email: lead.email,
      businessName: lead.businessName || '',
      location: lead.location || '',
      interestedService: lead.interestedService || '',
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      dealValue: lead.dealValue,
      followupDate: lead.followupDate ? new Date(lead.followupDate).toISOString().substring(0, 10) : '',
      notes: lead.notes || '',
      assignedEmployeeId: lead.assignedEmployeeId,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: LeadFormValues) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('leadId', id.toString());
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    const leadId = Number(e.dataTransfer.getData('leadId'));
    if (leadId) {
      updateMutation.mutate({ id: leadId, data: { status } });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.businessName && lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSource = !selectedSource || lead.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              viewMode === 'kanban' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <KanbanIcon className="w-4 h-4" /> Pipeline
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TableIcon className="w-4 h-4" /> Table View
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg w-full text-sm outline-none focus:border-blue-500 transition-all bg-slate-50"
            />
          </div>

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {leadsLoading ? (
        viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-250px)] animate-pulse">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="w-80 bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl flex flex-col flex-shrink-0">
                <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(2)].map((_, cardIdx) => (
                    <div key={cardIdx} className="bg-white border border-slate-200 p-4 rounded-xl h-28 space-y-3">
                      <div className="bg-slate-200 h-4 w-2/3 rounded"></div>
                      <div className="bg-slate-200 h-3.5 w-1/2 rounded"></div>
                      <div className="bg-slate-200 h-3 w-1/3 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between">
              <div className="bg-slate-200 h-4 w-24 rounded"></div>
              <div className="bg-slate-200 h-4 w-32 rounded"></div>
            </div>
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="bg-slate-200 h-4 w-28 rounded"></div>
                  <div className="bg-slate-200 h-4 w-24 rounded"></div>
                  <div className="bg-slate-200 h-4 w-32 rounded"></div>
                  <div className="bg-slate-200 h-4 w-16 rounded"></div>
                  <div className="bg-slate-200 h-4 w-20 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-250px)]">
          {LEAD_STATUSES.map((status) => {
            const statusLeads = filteredLeads.filter((l: any) => l.status === status);
            return (
              <div
                key={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                className="w-80 bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl flex flex-col flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h4 className="font-bold text-slate-800 text-sm">{status}</h4>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {statusLeads.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {statusLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3 group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                            {lead.name}
                          </h5>
                          {lead.businessName && (
                            <p className="text-xs text-slate-400 mt-0.5">{lead.businessName}</p>
                          )}
                        </div>
                        <span className={`text-[12px] font-medium py-1 px-2.5 rounded-full ${getPriorityBadgeClass(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Val: <b className="text-slate-800 font-bold">{formatCurrency(lead.dealValue)}</b></span>
                        <span>Src: <b className="text-slate-800 font-bold">{lead.source}</b></span>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[12px] text-text-secondary bg-slate-100 py-1 px-2 rounded-md font-medium">
                          {lead.assignedEmployee?.name || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lead.status !== 'Converted' && (
                            <button
                              onClick={() => convertMutation.mutate(lead.id)}
                              className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                              title="Convert to Customer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(lead)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this lead?')) {
                                  deleteMutation.mutate(lead.id);
                                }
                              }}
                              className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Business</th>
                    <th className="p-4">Mobile</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads
                    .slice((currentPage - 1) * 10, currentPage * 10)
                    .map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-bg transition-colors h-12 text-[14px]">
                        <td className="p-4 font-semibold text-text-primary">{lead.name}</td>
                        <td className="p-4 text-text-secondary">{lead.businessName || '-'}</td>
                        <td className="p-4 text-text-secondary">{lead.mobile}</td>
                        <td className="p-4 text-text-secondary">{lead.email}</td>
                        <td className="p-4"><span className="bg-slate-100 text-text-secondary px-2.5 py-1 rounded-full text-[12px] font-medium">{lead.source}</span></td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${getStatusBadgeClass(lead.status)}`}>{lead.status}</span></td>
                        <td className="p-4">
                          <span className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${getPriorityBadgeClass(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="p-4 text-text-secondary">{lead.assignedEmployee?.name || 'Unassigned'}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lead.status !== 'Converted' && (
                              <button
                                onClick={() => {
                                  convertMutation.mutate(lead.id);
                                  addToast('Lead converted to Customer successfully!');
                                }}
                                className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Convert to Customer"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(lead)}
                              className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'Admin' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this lead?')) {
                                    deleteMutation.mutate(lead.id);
                                    addToast('Lead deleted successfully!');
                                  }
                                }}
                                className="w-8 h-8 flex items-center justify-center text-danger hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredLeads.length > 10 && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 text-sm font-semibold">
              <span className="text-slate-500">
                Showing {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, filteredLeads.length)} of {filteredLeads.length} leads
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage * 10 >= filteredLeads.length}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                  <input type="text" {...register('name')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                  <input type="text" {...register('mobile')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                  {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Number</label>
                  <input type="text" {...register('whatsappNumber')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
                  <input type="text" {...register('businessName')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                  <input type="text" {...register('location')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interested Service</label>
                  <input type="text" {...register('interestedService')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source</label>
                  <select {...register('source')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium bg-white">
                    {LEAD_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select {...register('status')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium bg-white">
                    {LEAD_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                  <select {...register('priority')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium bg-white">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deal Value (₹)</label>
                  <input type="number" {...register('dealValue')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Follow-up Date</label>
                  <input type="date" {...register('followupDate')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
                </div>

                {user?.role === 'Admin' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Employee</label>
                    <select {...register('assignedEmployeeId')} className="w-full border border-slate-200 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium bg-white">
                      <option value="">Unassigned (Auto-Assign if new)</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea {...register('notes')} rows={3} className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  )}
                  <span>{editingLead ? 'Save Changes' : 'Add Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
