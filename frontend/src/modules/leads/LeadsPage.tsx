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
  Paperclip,
  FileText,
} from 'lucide-react';

const leadSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .refine(v => !/^\d+$/.test(v), 'Please enter a valid name.'),
  mobile: z.string()
    .trim()
    .refine(v => /^\d{10}$/.test(v), 'Mobile number must be exactly 10 digits'),
  whatsappNumber: z.string()
    .trim()
    .min(1, 'WhatsApp number is required')
    .refine(v => /^\d{10}$/.test(v), 'WhatsApp number must be exactly 10 digits'),
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  businessName: z.string()
    .trim()
    .min(1, 'Business name is required'),
  location: z.string()
    .trim()
    .min(1, 'Location is required'),
  interestedService: z.string()
    .trim()
    .min(1, 'Interested service is required'),
  source: z.string().min(1, 'Source is required'),
  status: z.string().default('New Lead'),
  priority: z.string().default('Medium'),
  dealValue: z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? -1 : num;
  }, z.number().nonnegative('Deal value cannot be negative')),
  followupDate: z.string()
    .trim()
    .min(1, 'Follow-up date is required')
    .refine(v => {
      const date = Date.parse(v);
      return !isNaN(date);
    }, 'Invalid date format'),
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .transform(v => v ? v.trim() : ''),
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
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

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
    onError: (err: any) => {
      const serverErrors = err.response?.data?.errors;
      const firstError = serverErrors ? Object.values(serverErrors)[0] : null;
      addToast((firstError as string) || err.response?.data?.error || 'Failed to create lead', 'error');
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
    onError: (err: any) => {
      const serverErrors = err.response?.data?.errors;
      const firstError = serverErrors ? Object.values(serverErrors)[0] : null;
      addToast((firstError as string) || err.response?.data?.error || 'Failed to update lead', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast('Lead deleted successfully!');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to delete lead', 'error');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => api.post(`/leads/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast('Lead converted to Customer successfully!');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to convert lead', 'error');
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

  const handlePhoneKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const onFormError = (errors: any) => {
    addToast('Please correct the highlighted fields before creating the lead.', 'error');
  };

  const openCreateModal = () => {
    setEditingLead(null);
    setUploadedFiles([]);
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
      followupDate: '',
      notes: '',
      assignedEmployeeId: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setUploadedFiles(lead.attachments || []);
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
    const payload = {
      ...data,
      attachments: uploadedFiles.filter((f: any) => !f.id).map((f: any) => ({
        filename: f.filename,
        originalName: f.originalName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        storagePath: f.storagePath
      }))
    };
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Frontend validation: Size and format checks
    const allowedExts = ['.pdf', '.xls', '.xlsx', '.csv', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      addToast('Invalid file format. Please attach PDF, Excel, CSV, Word, or Image files.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      addToast('File size exceeds the 10MB limit.', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/leads/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFiles(prev => [...prev, res.data]);
      addToast('Document uploaded successfully!');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const res = await api.get(`/leads/attachments/${attachment.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      addToast('Failed to download attachment. Access denied or file missing.', 'error');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number, filename: string) => {
    // If it's a newly uploaded file that hasn't been saved in db yet, just remove from state
    if (!attachmentId) {
      setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
      addToast('Document removed from selection.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/leads/attachments/${attachmentId}`);
        addToast('Document deleted successfully!');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        setUploadedFiles(prev => prev.filter(f => f.id !== attachmentId));
        if (selectedLeadForDetails) {
          setSelectedLeadForDetails((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              attachments: prev.attachments.filter((a: any) => a.id !== attachmentId)
            };
          });
        }
      } catch (err) {
        addToast('Failed to delete document.', 'error');
      }
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
                      className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover-card-premium cursor-grab active:cursor-grabbing transition-all space-y-3 group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 
                            onClick={() => setSelectedLeadForDetails(lead)}
                            className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors cursor-pointer hover:underline"
                          >
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
                        <td className="p-4 font-semibold text-text-primary">
                          <span 
                            onClick={() => setSelectedLeadForDetails(lead)}
                            className="hover:text-indigo-600 transition-colors cursor-pointer hover:underline"
                          >
                            {lead.name}
                          </span>
                        </td>
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

            <form onSubmit={handleSubmit(onSubmit, onFormError)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                  <input type="text" {...register('name')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input type="email" {...register('email')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                  <input type="tel" inputMode="numeric" maxLength={10} onKeyPress={handlePhoneKeyPress} {...register('mobile')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.mobile ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Number</label>
                  <input type="tel" inputMode="numeric" maxLength={10} onKeyPress={handlePhoneKeyPress} {...register('whatsappNumber')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.whatsappNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.whatsappNumber && <p className="text-xs text-red-500 mt-1">{errors.whatsappNumber.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
                  <input type="text" {...register('businessName')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.businessName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                  <input type="text" {...register('location')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interested Service</label>
                  <input type="text" {...register('interestedService')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.interestedService ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.interestedService && <p className="text-xs text-red-500 mt-1">{errors.interestedService.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source</label>
                  <select {...register('source')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium bg-white ${errors.source ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}>
                    {LEAD_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                  {errors.source && <p className="text-xs text-red-500 mt-1">{errors.source.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select {...register('status')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium bg-white ${errors.status ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}>
                    {LEAD_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                  <select {...register('priority')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium bg-white ${errors.priority ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deal Value (₹)</label>
                  <input type="number" step="any" {...register('dealValue')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.dealValue ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.dealValue && <p className="text-xs text-red-500 mt-1">{errors.dealValue.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Follow-up Date</label>
                  <input type="date" {...register('followupDate')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.followupDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} />
                  {errors.followupDate && <p className="text-xs text-red-500 mt-1">{errors.followupDate.message}</p>}
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

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  Lead Documents
                </label>
                <div className="border border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 transition-all bg-slate-50/50 flex flex-col items-center justify-center relative cursor-pointer group h-24">
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-center pointer-events-none">
                    <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors uppercase tracking-wide">
                      {uploading ? 'Uploading document...' : 'Attach Documents'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PDF, Word, Excel, CSV, or Images up to 10MB (optional)
                    </span>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attached Documents:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={file.id || idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover-card-premium">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{file.originalName}</p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                {(file.fileSize / 1024).toFixed(1)} KB • {file.mimeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {file.id && (
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(file)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                title="Download"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(file.id, file.filename)}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea {...register('notes')} rows={3} className={`w-full border px-3.5 py-2.5 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.notes ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}></textarea>
                {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes.message}</p>}
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
      {/* Lead Details Modal */}
      {selectedLeadForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">Lead Details: {selectedLeadForDetails.name}</h3>
              <button onClick={() => setSelectedLeadForDetails(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Name</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.businessName || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interested Service</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.interestedService || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.mobile}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.whatsappNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Source</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.source}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status / Pipeline Stage</span>
                  <span className={`inline-block px-2.5 py-0.5 mt-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(selectedLeadForDetails.status)}`}>
                    {selectedLeadForDetails.status}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority Level</span>
                  <span className={`inline-block px-2.5 py-0.5 mt-0.5 rounded-full text-xs font-semibold ${getPriorityBadgeClass(selectedLeadForDetails.priority)}`}>
                    {selectedLeadForDetails.priority}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deal Value</span>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(selectedLeadForDetails.dealValue)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-up Date</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedLeadForDetails.followupDate ? new Date(selectedLeadForDetails.followupDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLeadForDetails.assignedEmployee?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</span>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedLeadForDetails.notes || 'No notes added for this lead.'}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Documents</span>
                {!selectedLeadForDetails.attachments || selectedLeadForDetails.attachments.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-450 font-semibold">No documents attached</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {selectedLeadForDetails.attachments.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover-card-premium">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{file.originalName}</p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              {(file.fileSize / 1024).toFixed(1)} KB • {file.mimeType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                            title="Download"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(file.id, file.filename)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLeadForDetails(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
