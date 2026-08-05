import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../shared/services/api.js';
import { Search, Eye, Phone, Mail, Building } from 'lucide-react';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    },
  });

  const filteredCustomers = customers.filter((cust: any) => {
    const name = cust.lead?.name || '';
    const email = cust.lead?.email || '';
    const businessName = cust.lead?.businessName || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      businessName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg w-full text-sm outline-none focus:border-blue-500 transition-all bg-slate-50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredCustomers.map((customer: any) => (
            <div
              key={customer.id}
              className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{customer.lead?.name}</h4>
                    {customer.lead?.businessName && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {customer.lead?.businessName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-slate-500 pt-2 border-t border-slate-100">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{customer.lead?.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{customer.lead?.mobile}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="w-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
