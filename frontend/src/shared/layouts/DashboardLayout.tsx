import React, { useState } from 'react';
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: Target },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Follow-ups', path: '/followups', icon: Clock },
    { name: 'Quotations', path: '/quotations', icon: FileText },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ name: 'Team', path: '/team', icon: UserIcon });
  }

  const currentNavName = navItems.find((n) => {
    if (n.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(n.path);
  })?.name || 'CRM System';

  const asideClass = `bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-xl transition-all duration-300 ease-in-out z-20 relative ${
    isCollapsed ? 'w-20' : 'w-64'
  } hidden md:flex`;

  const NavLinkList = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.path === '/' 
          ? location.pathname === '/' 
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.name}
            to={item.path}
            onClick={onItemClick}
            className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 gap-3 group px-4 py-3.5 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
            }`}
            title={isCollapsed ? item.name : undefined}
          >
            <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
            <span className={`transition-opacity duration-300 truncate ${isCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Mobile Drawer Slide-over */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 flex-shrink-0">
          <Link to="/" onClick={() => setIsMobileOpen(false)} className="block relative z-10">
            <div className="relative p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40 overflow-hidden group/logo transition-all duration-300 animate-brand-fade-in hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5">
              {/* Soft radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.06)_0%,_transparent_70%)] pointer-events-none" />
              <img 
                src="/assets/alpha-connects-logo.png" 
                alt="Alpha Connects Logo" 
                className="h-11 max-w-[170px] object-contain rounded-lg group-hover/logo:scale-[1.03] transition-transform duration-300"
              />
            </div>
          </Link>
          <button onClick={() => setIsMobileOpen(false)} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <NavLinkList onItemClick={() => setIsMobileOpen(false)} />
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 flex items-center justify-center font-bold text-sm hover:scale-105 hover:bg-indigo-500/30 transition-all duration-200 cursor-default shadow-sm flex-shrink-0">
            {getInitials(user?.name)}
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

      {/* Desktop Sidebar */}
      <aside className={asideClass}>
        <div className={`h-20 flex items-center border-b border-slate-800/80 flex-shrink-0 relative transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className="flex items-center justify-center w-full transition-all duration-300">
            <Link to="/" className={`relative z-10 block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-full max-w-[180px]'} flex justify-center`}>
              <div className="relative p-1 rounded-xl bg-slate-950/45 border border-slate-800/40 overflow-hidden group/logo transition-all duration-300 animate-brand-fade-in hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10">
                {/* Soft radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)] pointer-events-none" />
                <img 
                  src="/assets/alpha-connects-logo.png" 
                  alt="Alpha Connects Logo" 
                  className={`h-16 rounded-lg transition-all duration-300 group-hover/logo:scale-[1.03] ${
                    isCollapsed ? 'w-16 object-cover object-left' : 'w-auto max-w-full object-contain'
                  }`}
                />
              </div>
            </Link>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="absolute -right-3 top-7 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 p-1 rounded-full shadow-md transition-all duration-200 hidden md:block z-30 hover:scale-110 active:scale-95"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavLinkList />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 flex items-center justify-center font-bold text-sm hover:scale-105 hover:bg-indigo-500/30 transition-all duration-200 cursor-default shadow-sm flex-shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'}`}>
              <p className="text-sm font-semibold truncate text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
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

      {/* Main Workspace content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)} 
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-xl text-slate-800">
              {currentNavName}
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Welcome, <span className="text-slate-800 font-semibold">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
