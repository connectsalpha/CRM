import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore.js';
import {
  LayoutDashboard,
  Target,
  Users,
  Clock,
  FileText,
  BarChart3,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: Target },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Follow-ups', path: '/followups', icon: Clock },
    { name: 'Quotations', path: '/quotations', icon: FileText },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const currentNavName = navItems.find((n) => {
    if (n.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(n.path);
  })?.name || 'CRM System';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-lg">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white font-bold shadow-md shadow-blue-500/20">
            AC
          </div>
          <span className="font-semibold text-lg tracking-wider text-slate-100">
            Alpha Connects
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 gap-3 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-full text-slate-300">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-slate-200">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <h1 className="font-semibold text-xl text-slate-800">
            {currentNavName}
          </h1>
          <div className="text-sm text-slate-500 font-medium">
            Welcome, <span className="text-slate-800 font-semibold">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
