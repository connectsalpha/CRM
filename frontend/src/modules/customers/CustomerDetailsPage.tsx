import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/services/api.js';
import { formatCurrency } from '../../shared/utils/format.js';
import {
  ArrowLeft,
  User,
  MessageSquare,
  FileText,
  IndianRupee,
  Paperclip,
  CheckCircle,
  Plus,
  Send,
  Upload,
} from 'lucide-react';

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'conversation' | 'quotations' | 'payments' | 'documents' | 'feedback'>('conversation');

  const [newMsg, setNewMsg] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (customer) {
      setFeedback(customer.feedback || '');
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/customers/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setSelectedFile(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse font-sans">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl h-32 flex items-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-200"></div>
          <div className="space-y-2.5 flex-1">
            <div className="bg-slate-200 h-5 w-48 rounded-lg"></div>
            <div className="bg-slate-200 h-3.5 w-64 rounded-lg"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-100 p-4 rounded-2xl h-64 space-y-3 shadow-sm">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-200 h-10 rounded-xl"></div>
            ))}
          </div>
          <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl h-96 shadow-sm">
            <div className="bg-slate-200 h-5 w-32 rounded-lg mb-6"></div>
            <div className="bg-slate-200 h-64 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-red-600 bg-red-50/50 border border-red-200 p-4 rounded-xl font-medium text-sm font-sans">
        Customer details could not be loaded. Please ensure the backend connection is stable.
      </div>
    );
  }

  const profile = customer.profile ? JSON.parse(customer.profile) : {};
  const conversations = customer.conversationHistory ? JSON.parse(customer.conversationHistory) : [];
  const payments = customer.payments ? JSON.parse(customer.payments) : [];
  const documents = customer.documents ? JSON.parse(customer.documents) : [];

  const handleAddConversation = () => {
    if (!newMsg.trim()) return;
    const updatedHistory = [
      ...conversations,
      { date: new Date().toISOString(), message: newMsg.trim() },
    ];
    updateMutation.mutate({ conversationHistory: updatedHistory });
    setNewMsg('');
  };

  const handleSaveFeedback = () => {
    updateMutation.mutate({ feedback });
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="w-8 h-8 flex items-center justify-center bg-white border border-border hover:bg-slate-50 rounded-md text-text-primary transition-colors"
          title="Back to Customers"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{customer.lead?.name}</h2>
          <p className="text-sm text-text-secondary">Customer Profile & Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 self-start">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" />
            Customer Profile
          </h3>

          <div className="space-y-4">
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Business Name</span>
              <span className="text-slate-800 font-semibold">{profile.businessName || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Interested Service</span>
              <span className="text-slate-800 font-semibold">{profile.interestedService || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Location</span>
              <span className="text-slate-800 font-semibold">{profile.location || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Email</span>
              <span className="text-slate-800 font-semibold">{customer.lead?.email}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Phone</span>
              <span className="text-slate-800 font-semibold">{customer.lead?.mobile}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Lead Source</span>
              <span className="text-slate-800 font-semibold">{customer.lead?.source}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Deal Value</span>
              <span className="text-emerald-600 font-bold text-lg">{formatCurrency(customer.lead?.dealValue)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[
              { id: 'conversation', label: 'Conversation', icon: MessageSquare },
              { id: 'quotations', label: 'Quotations', icon: FileText },
              { id: 'payments', label: 'Payments', icon: IndianRupee },
              { id: 'documents', label: 'Documents', icon: Paperclip },
              { id: 'feedback', label: 'Feedback', icon: CheckCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 outline-none whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
            {activeTab === 'conversation' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                  {conversations.map((c: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-slate-700 text-sm">{c.message}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(c.date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <input
                    type="text"
                    placeholder="Add a conversation note..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    className="flex-1 border border-border px-4 h-10 rounded-md text-sm outline-none focus:border-primary bg-slate-50"
                  />
                  <button
                    onClick={handleAddConversation}
                    className="bg-primary hover:bg-primary/95 text-white w-10 h-10 rounded-md transition-all active:scale-95 flex items-center justify-center"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'quotations' && (
              <div className="space-y-4">
                {customer.quotations && customer.quotations.length > 0 ? (
                  customer.quotations.map((q: any) => (
                    <div key={q.id} className="border border-slate-100 p-4 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Quote #{q.quoteNo}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(q.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-800">{formatCurrency(q.total)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                          {q.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No quotations linked to this customer.</p>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                {payments.length > 0 ? (
                  payments.map((p: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.description || 'Invoice Payment'}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(p.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {p.status || 'Paid'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No payments recorded.</p>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1 custom-scrollbar">
                  {documents.map((doc: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm truncate max-w-xs">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">{new Date(doc.uploadedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <a
                        href={`/${doc.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleUploadFile} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="flex-1 text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="btn-primary"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Customer Feedback Notes
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={8}
                    placeholder="Enter customer feedback here..."
                    className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 bg-slate-50 text-sm"
                  />
                </div>

                <div className="mt-4 border-t border-border pt-4 flex justify-end">
                  <button
                    onClick={handleSaveFeedback}
                    className="btn-primary px-6"
                  >
                    Save Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
