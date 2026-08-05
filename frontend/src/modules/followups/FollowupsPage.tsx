import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
import { Plus, Check, X, Clock, Calendar, Trash2 } from 'lucide-react';

const followupSchema = z.object({
  customerId: z.preprocess((val) => Number(val), z.number().min(1, 'Customer is required')),
  date: z.string().min(1, 'Date is required'),
  reminder: z.boolean().default(false),
  notes: z.string().optional(),
  status: z.string().default('Pending'),
});

type FollowupFormValues = z.infer<typeof followupSchema>;

export default function FollowupsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const res = await api.get('/followups');
      return res.data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FollowupFormValues) => api.post('/followups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/followups/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/followups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FollowupFormValues>({
    resolver: zodResolver(followupSchema),
  });

  const onSubmit = (data: FollowupFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Follow-up Schedules
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Schedule Follow-up
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4">Reminder Set</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followups.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{f.customer?.lead?.name}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(f.date).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{f.notes || '-'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${f.reminder ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                        {f.reminder ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        f.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                        f.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>{f.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: f.id, status: 'Completed' })}
                              className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                              title="Mark Completed"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: f.id, status: 'Cancelled' })}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(f.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Schedule Follow-up</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Customer</label>
                <select {...register('customerId')} className="w-full border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option value="">Select a Customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.lead?.name} ({c.lead?.businessName || 'No Company'})</option>
                  ))}
                </select>
                {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Follow-up Date & Time</label>
                <input type="datetime-local" {...register('date')} className="w-full border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500" />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="reminder" {...register('reminder')} className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500" />
                <label htmlFor="reminder" className="text-sm font-semibold text-slate-600">Set Reminder Notification</label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes / Objectives</label>
                <textarea {...register('notes')} rows={3} className="w-full border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
