import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
import { useToastStore } from '../../shared/hooks/useToastStore.js';
import { 
  Search, 
  Eye, 
  Phone, 
  Mail, 
  Building, 
  Edit2, 
  Users, 
  Clock, 
  X, 
  MapPin, 
  Briefcase,
  FileText
} from 'lucide-react';

const customerEditSchema = z.object({
  address: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  feedback: z.string().optional(),
});

type EditFormValues = z.infer<typeof customerEditSchema>;

export default function CustomersPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  // Fetch customers
  const { data: customers = [], isLoading, isError, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    },
  });

  // Edit Customer Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addToast('Customer profile updated successfully!');
      setIsModalOpen(false);
      setEditingCustomer(null);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to update customer', 'error');
    },
  });

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(customerEditSchema),
  });

  const openEditModal = (customer: any) => {
    setEditingCustomer(customer);
    let prof: any = {};
    try {
      prof = customer.profile ? JSON.parse(customer.profile) : {};
    } catch (e) {
      prof = {};
    }

    reset({
      address: prof.address || '',
      industry: prof.industry || '',
      companySize: prof.companySize || '',
      feedback: customer.feedback || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    reset();
  };

  const onSubmit = (data: EditFormValues) => {
    if (editingCustomer) {
      const profile = JSON.stringify({
        address: data.address || '',
        industry: data.industry || '',
        companySize: data.companySize || '',
      });
      editMutation.mutate({
        id: editingCustomer.id,
        data: {
          profile,
          feedback: data.feedback || '',
        },
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Stats calculation
  const totalCount = customers.length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCount = customers.filter((c: any) => new Date(c.createdAt) >= thirtyDaysAgo).length;

  const filteredCustomers = customers.filter((cust: any) => {
    const name = cust.lead?.name || '';
    const email = cust.lead?.email || '';
    const mobile = cust.lead?.mobile || '';
    const businessName = cust.lead?.businessName || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      businessName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Customers Database</h2>
          <p className="text-sm text-text-secondary">View profile history, quotation logs, conversation notes, and upload related docs.</p>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border p-5 rounded-lg shadow-card flex flex-col items-start gap-4 cursor-default hover:border-primary/20 hover:shadow-md transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-[32px] font-bold leading-[1.1] text-text-primary tracking-tight">{totalCount}</h3>
            <p className="text-[13px] font-medium uppercase text-text-secondary tracking-[0.03em]">Total Customers</p>
            <p className="text-[13px] text-text-secondary mt-1">Clients converted from leads</p>
          </div>
        </div>
        <div className="bg-white border border-border p-5 rounded-lg shadow-card flex flex-col items-start gap-4 cursor-default hover:border-primary/20 hover:shadow-md transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-[32px] font-bold leading-[1.1] text-text-primary tracking-tight">{newCount}</h3>
            <p className="text-[13px] font-medium uppercase text-text-secondary tracking-[0.03em]">New Customers</p>
            <p className="text-[13px] text-text-secondary mt-1">Converted within last 30 days</p>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-5 rounded-lg border border-border shadow-card">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by name, email, phone or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-border p-5 rounded-lg h-56 space-y-4 shadow-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                <div className="space-y-2 flex-1">
                  <div className="bg-slate-200 h-4 w-1/3 rounded-md"></div>
                  <div className="bg-slate-200 h-3 w-1/4 rounded-md"></div>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="bg-slate-200 h-3 w-1/2 rounded-md"></div>
                <div className="bg-slate-200 h-3 w-2/3 rounded-md"></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-200 h-9 flex-1 rounded-md"></div>
                <div className="bg-slate-200 h-9 flex-1 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center text-danger shadow-card">
          <p className="font-semibold text-base mb-1">Error Loading Customers</p>
          <p className="text-sm text-text-secondary">{(error as any)?.response?.data?.error || 'Failed to fetch directory from the server.'}</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center shadow-card">
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="font-semibold text-text-primary text-base mb-1">No Customers Found</p>
          <p className="text-sm text-text-secondary">Converted customers will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer: any) => (
            <div
              key={customer.id}
              className="bg-white border border-border p-5 rounded-lg shadow-card hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 cursor-default group"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none">
                    {getInitials(customer.lead?.name)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-text-primary text-[15px] leading-tight truncate">{customer.lead?.name}</h4>
                    {customer.lead?.businessName && (
                      <p className="text-[13px] text-text-secondary truncate mt-0.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 flex-shrink-0" />
                        {customer.lead?.businessName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-[13px] text-text-secondary pt-3 border-t border-border">
                  <a 
                    href={`mailto:${customer.lead?.email}`} 
                    className="flex items-center gap-2 hover:text-primary transition-colors truncate"
                    title={`Email ${customer.lead?.name}`}
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{customer.lead?.email}</span>
                  </a>
                  <a 
                    href={`tel:${customer.lead?.mobile}`} 
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                    title={`Call ${customer.lead?.name}`}
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{customer.lead?.mobile}</span>
                  </a>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                  title="View Profile Details"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>
                <button
                  onClick={() => openEditModal(customer)}
                  className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                  title="Edit Customer Profile"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-border rounded-lg w-full max-w-md overflow-hidden shadow-card animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
              <h3 className="font-bold text-text-primary text-[16px]">
                Edit Customer Profile
              </h3>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Read Only Fields */}
              <div className="p-3 bg-slate-50 rounded-md border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Lead Info (Read-only)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-secondary">Name:</span>
                    <p className="font-semibold text-text-primary mt-0.5">{editingCustomer?.lead?.name}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Business:</span>
                    <p className="font-semibold text-text-primary mt-0.5 truncate">{editingCustomer?.lead?.businessName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Email:</span>
                    <p className="font-semibold text-text-primary mt-0.5 truncate">{editingCustomer?.lead?.email}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Phone:</span>
                    <p className="font-semibold text-text-primary mt-0.5">{editingCustomer?.lead?.mobile}</p>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-secondary" /> Address
                </label>
                <input
                  type="text"
                  {...register('address')}
                  className="input-premium"
                  placeholder="e.g. 12th Floor, MG Road, Bengaluru"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-text-secondary" /> Industry
                  </label>
                  <input
                    type="text"
                    {...register('industry')}
                    className="input-premium"
                    placeholder="e.g. SaaS, Fintech"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-text-secondary" /> Company Size
                  </label>
                  <input
                    type="text"
                    {...register('companySize')}
                    className="input-premium"
                    placeholder="e.g. 10-50, 100+"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-text-secondary" /> Customer Feedback / Notes
                </label>
                <textarea
                  {...register('feedback')}
                  rows={3}
                  className="input-premium py-2 resize-none"
                  placeholder="Enter custom customer feedback or general notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="btn-primary"
                >
                  {editMutation.isPending && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
