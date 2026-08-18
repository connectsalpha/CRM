import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { KeyRound, Mail, AlertCircle, ShieldAlert, Check } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, error, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCopy = (email: string, pass: string, key: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true });
    setValue('password', pass, { shouldValidate: true, shouldDirty: true });
    navigator.clipboard.writeText(`${email} | ${pass}`);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-black pointer-events-none" />

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl transition-all duration-300">
          <div className="text-center mb-8 flex flex-col items-center">
            <img 
              src="/assets/alpha-connects-logo.png" 
              alt="Alpha Connects Logo" 
              className="h-12 w-auto object-contain rounded-xl shadow-lg mb-4 hover:scale-105 transition-transform duration-200 cursor-default"
            />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Alpha Connects CRM</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to manage your customer relationships</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-800/60 text-red-300 p-4 rounded-xl flex items-start gap-3 animate-shake">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors" />
                <input
                  type="email"
                  {...register('email')}
                  className="w-full bg-slate-950/50 border border-slate-800 text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder-slate-600 font-medium"
                  placeholder="admin@alphacmr.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors" />
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-slate-950/50 border border-slate-800 text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder-slate-600 font-medium"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Click to Autofill & Copy Credentials
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div 
                onClick={() => handleCopy('admin@alphacmr.com', 'Admin123!', 'admin')}
                className="bg-slate-950/30 border border-slate-800/80 p-3 rounded-xl cursor-pointer hover:bg-slate-800/40 hover:border-slate-700 transition-all select-none group relative"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-300">Admin</p>
                  {copiedText === 'admin' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-slate-500 mt-1 truncate">admin@alphacmr.com</p>
                <p className="text-slate-600 truncate">Admin123!</p>
              </div>
              <div 
                onClick={() => handleCopy('employee@alphacmr.com', 'Employee123!', 'employee')}
                className="bg-slate-950/30 border border-slate-800/80 p-3 rounded-xl cursor-pointer hover:bg-slate-800/40 hover:border-slate-700 transition-all select-none group relative"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-300">Employee</p>
                  {copiedText === 'employee' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-slate-500 mt-1 truncate">employee@alphacmr.com</p>
                <p className="text-slate-600 truncate">Employee123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
