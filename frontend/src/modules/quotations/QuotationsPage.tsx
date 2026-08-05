import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
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
        <div className="flex items-center justify-center h-64 print:hidden">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:hidden">
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
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">#{q.quoteNo}</td>
                    <td className="p-4 text-slate-500">{q.customer?.lead?.name}</td>
                    <td className="p-4 text-slate-500">{q.items?.length || 0}</td>
                    <td className="p-4 font-bold text-slate-800">${q.total}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                        q.status === 'Declined' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>{q.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrint(q)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          title="Print Quotation"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(q.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
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
        <div className="fixed inset-0 z-[100] bg-white p-8 overflow-y-auto hidden print:block">
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
                    <td className="py-3 px-4 text-right text-slate-600">${item.price}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">${item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="font-black text-lg text-blue-600">${printingQuote.total}</span>
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

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Customer</label>
                  <select {...register('customerId')} className="w-full border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option value="">Select a Customer</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.lead?.name}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quote Number</label>
                  <input type="text" {...register('quoteNo')} className="w-full border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500" placeholder="QT-1001" />
                  {errors.quoteNo && <p className="text-xs text-red-500 mt-1">{errors.quoteNo.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Items</label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Item Name"
                      {...register(`items.${index}.itemName` as const)}
                      className="flex-1 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      {...register(`items.${index}.quantity` as const)}
                      className="w-16 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 text-sm text-center"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      {...register(`items.${index}.price` as const)}
                      className="w-24 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 text-sm text-right"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ itemName: '', quantity: 1, price: 0 })}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Item
                </button>
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
