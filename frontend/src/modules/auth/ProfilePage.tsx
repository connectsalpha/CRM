import React from 'react';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { User, Mail, Shield, UserCheck } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xl hover:scale-105 hover:bg-indigo-100 transition-all duration-200 cursor-default shadow-sm">
          {(() => {
            if (!user?.name) return 'U';
            const parts = user.name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
          })()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user?.name}</h2>
          <p className="text-sm text-slate-400 capitalize">{user?.role} Profile</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-slate-400" />
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase">Email Address</span>
            <span className="text-slate-800 font-semibold">{user?.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-slate-400" />
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase">Access Level (RBAC)</span>
            <span className="text-slate-800 font-semibold capitalize">{user?.role}</span>
          </div>
        </div>

        {user?.employeeId && (
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-slate-400" />
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase">Employee Identifier</span>
              <span className="text-slate-800 font-semibold">EMP-{user.employeeId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
