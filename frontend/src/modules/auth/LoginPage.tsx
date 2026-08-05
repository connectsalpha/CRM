import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { KeyRound, Mail, AlertCircle, ShieldAlert } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
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

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex bg-blue-600 p-3 rounded-2xl text-white font-black text-2xl shadow-lg shadow-blue-500/20 mb-3">
              AC
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Alpha Connects CRM</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  {...register('email')}
                  className="w-full bg-slate-900/50 border border-slate-800 text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
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
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-slate-900/50 border border-slate-800 text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Demo Credentials
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg">
                <p className="font-semibold text-slate-300">Admin Account</p>
                <p className="text-slate-500 mt-1">admin@alphacmr.com</p>
                <p className="text-slate-500">Admin123!</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg">
                <p className="font-semibold text-slate-300">Employee Account</p>
                <p className="text-slate-500 mt-1">employee@alphacmr.com</p>
                <p className="text-slate-500">Employee123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
