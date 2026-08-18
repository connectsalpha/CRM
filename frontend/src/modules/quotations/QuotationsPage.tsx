import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
import { useToastStore } from '../../shared/hooks/useToastStore.js';
import { formatCurrency } from '../../shared/utils/format.js';
import { Plus, Printer, X, FileText, Trash2 } from 'lucide-react';

const quotationSchema = z.object({
  customerId: z.preprocess((val) => Number(val), z.number().min(1, 'Customer is required')),
  quoteNo: z.string().min(1, 'Quote number is required'),
  status: z.string().default('Draft'),
  items: z.array(z.object({
    itemName: z.string().min(1, 'Item name required'),
    quantity: z.preprocess((val) => Number(val) || 1, z.number().min(1)),
    price: z.preprocess((val) => Number(val) || 0, z.number().nonnegative()),
  })).min(1, 'At least one item is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printingQuote, setPrintingQuote] = useState<any>(null);

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const res = await api.get('/quotations');
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
    mutationFn: (data: QuotationFormValues) => api.post('/quotations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setIsModalOpen(false);
      reset();
      addToast('Quotation created successfully!');
    },
    onError: (err: any) => {
      const serverErrors = err.response?.data?.errors;
      const firstError = serverErrors ? Object.values(serverErrors)[0] : null;
      addToast((firstError as string) || err.response?.data?.error || 'Failed to create quotation', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      addToast('Quotation deleted successfully!');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to delete quotation', 'error');
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      items: [{ itemName: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onFormError = (errors: any) => {
    addToast('Please correct the highlighted fields before creating the quotation.', 'error');
  };

  const onSubmit = (data: QuotationFormValues) => {
    createMutation.mutate(data);
  };

  const handlePrint = (quote: any) => {
    setPrintingQuote(quote);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Quotations
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Quotation
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse print:hidden font-sans">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between">
            <div className="bg-slate-200 h-4 w-28 rounded-lg"></div>
            <div className="bg-slate-200 h-4 w-32 rounded-lg"></div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="bg-slate-200 h-4 w-20 rounded-lg"></div>
                <div className="bg-slate-200 h-4 w-32 rounded-lg"></div>
                <div className="bg-slate-200 h-4 w-12 rounded-lg"></div>
                <div className="bg-slate-200 h-4 w-16 rounded-lg flex-1"></div>
                <div className="bg-slate-200 h-4.5 w-10 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-4">Quote No</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q: any) => (
                  <tr key={q.id} className="table-row-premium border-b border-slate-100 last:border-b-0 h-12 text-[14px]">
                    <td className="p-4 font-semibold text-text-primary">#{q.quoteNo}</td>
                    <td className="p-4 text-text-secondary">{q.customer?.lead?.name}</td>
                    <td className="p-4 text-text-secondary">{q.items?.length || 0}</td>
                    <td className="p-4 font-bold text-text-primary">{formatCurrency(q.total)}</td>
                    <td className="p-4">
                      <span className={`text-[12px] px-2.5 py-1 rounded-full font-semibold ${
                        q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        q.status === 'Declined' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>{q.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrint(q)}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Print Quotation"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this quotation?')) {
                              deleteMutation.mutate(q.id);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
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

      {printingQuote && (
        <div className="fixed inset-0 z-[100] bg-white p-8 overflow-y-auto hidden print:block font-sans">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-wide">ALPHA CONNECTS</h1>
                <p className="text-xs text-slate-400 mt-1">Premium Business Solutions Provider</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">QUOTATION</h2>
                <p className="text-sm text-slate-500 mt-1">Quote No: <b>#{printingQuote.quoteNo}</b></p>
                <p className="text-xs text-slate-400">Date: {new Date(printingQuote.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prepared For</p>
                <p className="font-semibold text-slate-800 mt-1">{printingQuote.customer?.lead?.name}</p>
                {printingQuote.customer?.lead?.businessName && <p className="text-slate-500">{printingQuote.customer.lead.businessName}</p>}
                <p className="text-slate-500">{printingQuote.customer?.lead?.email}</p>
                <p className="text-slate-500">{printingQuote.customer?.lead?.mobile}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <p className="font-semibold text-slate-800 mt-1">{printingQuote.status}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-50">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printingQuote.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.itemName}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="font-black text-lg text-blue-600">{formatCurrency(printingQuote.total)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
              <p>Thank you for your business. This is a computer-generated quotation.</p>
              <button
                onClick={() => setPrintingQuote(null)}
                className="mt-6 bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-bold print:hidden"
              >
                Close Print View
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Create Quotation</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onFormError)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Customer</label>
                  <select {...register('customerId')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all bg-white text-sm font-medium ${errors.customerId ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}>
                    <option value="">Select a Customer</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.lead?.name}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quote Number</label>
                  <input type="text" {...register('quoteNo')} className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.quoteNo ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`} placeholder="QT-1001" />
                  {errors.quoteNo && <p className="text-xs text-red-500 mt-1">{errors.quoteNo.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Items</label>
                {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items.message}</p>}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Item Name"
                        {...register(`items.${index}.itemName` as const)}
                        className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${errors.items?.[index]?.itemName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
                      />
                      {errors.items?.[index]?.itemName && <p className="text-xs text-red-500 mt-1">{errors.items[index]?.itemName?.message}</p>}
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        placeholder="Qty"
                        {...register(`items.${index}.quantity` as const)}
                        className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium text-center ${errors.items?.[index]?.quantity ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
                      />
                      {errors.items?.[index]?.quantity && <p className="text-xs text-red-500 mt-1 text-center">{errors.items[index]?.quantity?.message}</p>}
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        step="any"
                        placeholder="Price"
                        {...register(`items.${index}.price` as const)}
                        className={`w-full border px-3.5 py-2 rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium text-right ${errors.items?.[index]?.price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
                      />
                      {errors.items?.[index]?.price && <p className="text-xs text-red-500 mt-1 text-right">{errors.items[index]?.price?.message}</p>}
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ itemName: '', quantity: 1, price: 0 })}
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 mt-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Item
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  )}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
