import { useNavigate, useLocation } from '@/lib/router';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Headphones, 
  Shield, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Users,
  Bell,
  Check
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { loanAPI } from '@/lib/api/loan';

import { cn } from "@/lib/utils";
import { preloadRoute } from '@/lib/services/preloader';

function NotificationBell() {
  return null;
}

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await loanAPI.getNotifications();
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) { /* Silently fail */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Using dvh for mobile browsers
  const [height, setHeight] = useState('100vh');

  useEffect(() => {
    // Fix for 100vh on mobile browsers
    const setRealHeight = () => {
      setHeight(`${window.innerHeight}px`);
    };
    window.addEventListener('resize', setRealHeight);
    setRealHeight();
    return () => window.removeEventListener('resize', setRealHeight);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Wallet, label: 'My Loans', path: '/loan/applications' },
    { icon: Banknote, label: 'Repayment', path: '/repayment' },
    { icon: User, label: 'My Account', path: '/account' },
    { icon: ShieldCheck, label: '2FA Settings', path: '/account/2fa' },
    { icon: Users, label: 'Refer & Earn', path: '/referrals' },
    { icon: Headphones, label: 'Support', path: '/support' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prefer login email (bugfix) — display identity matches OTP login
  const displayEmail = user?.email || user?.profile?.personalEmail || '';

  return (
    <div 
      className="bg-background flex overflow-hidden"
      style={{ height: height }}
    >
      {/* Sidebar - Fixed Position */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col",
          "bg-gradient-to-b from-[#0A2E46] via-[#0D3E5E] to-[#061F31] text-white shadow-2xl border-r border-[#0D3E5E]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[80px]" : "w-72",
          "lg:m-4 lg:rounded-lg lg:h-[calc(100dvh-2rem)] lg:border lg:border-white/10"
        )}
      >
        {/* Banner / Logo Area */}
        <div className={cn(
          "flex items-center h-20 px-6 border-b border-white/10 flex-shrink-0 transition-all duration-500",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}>
           {!isCollapsed && (
             <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-teal-400/20 to-emerald-400/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/10">
                   <Shield className="w-6 h-6 text-teal-400 fill-teal-400/10" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-lg tracking-tight whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-gray-300">Lendigo</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-teal-400 -mt-1">Microcare</span>
                </div>
             </div>
           )}
           {isCollapsed && (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-teal-400/20 to-emerald-400/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/10 hover:scale-110 transition-transform cursor-pointer">
                <Shield className="w-6 h-6 text-teal-400 fill-teal-400/10" />
             </div>
           )}

           {/* Collapse Toggle Handle */}
           {!isCollapsed && (
             <button 
               onClick={() => setIsCollapsed(true)}
               className="hidden lg:flex w-8 h-8 items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300 group"
             >
               <div className="relative">
                 <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                 <div className="absolute inset-0 bg-teal-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             </button>
           )}
        </div>

        {/* Collapsed Expand Toggle */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-4 border-b border-white/5">
             <button 
                onClick={() => setIsCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-300 group"
             >
               <div className="relative">
                 <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                 <div className="absolute inset-0 bg-teal-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             </button>
          </div>
        )}

        {/* Scrollable Menu Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1.5 scrollbar-none custom-scrollbar">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                             (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                disabled={isActive}
                title={isCollapsed ? item.label : undefined}
                onMouseEnter={() => preloadRoute(item.path)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-gradient-to-r from-[#0D4B75] to-[#0A2E46] text-white shadow-lg shadow-[#0A2E46]/40 ring-1 ring-white/20 border-teal-400" 
                    : "text-slate-300 hover:bg-white/10 hover:text-white active:scale-[0.98]",
                  isCollapsed && "justify-center px-0"
                )}
                style={{
                  transitionDelay: `${index * 30}ms`
                }}
              >
                <div className="relative z-10 flex items-center justify-center">
                  <Icon
                    className={cn(
                      "flex-shrink-0 w-5 h-5 transition-all duration-500",
                      isActive ? "scale-110 text-teal-400" : "group-hover:scale-110 text-slate-300 group-hover:text-teal-400"
                    )} 
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-teal-400 blur-lg opacity-30 animate-pulse" />
                  )}
                </div>

                {!isCollapsed && (
                  <span className={cn(
                    "truncate text-sm font-semibold tracking-wide transition-all duration-500 relative z-10",
                    isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                  )}>
                    {item.label}
                  </span>
                )}
                
                {!isCollapsed && isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-in fade-in zoom-in duration-500" />
                )}
                
                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-2xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Content */}
        <div className="p-4 border-t border-white/5 flex-shrink-0">
           {!isCollapsed ? (
             <div className="bg-white/5 border border-white/5 rounded-lg p-4 mb-4 backdrop-blur-sm group hover:bg-white/10 transition-colors duration-300">
                <div className="flex items-center gap-3">
                   <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white font-semibold shadow-lg">
                         {(user?.profile?.fullName || user?.fullName)?.charAt(0) || 'U'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-950 rounded-full" />
                   </div>
                   <div className="overflow-hidden min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">{user?.profile?.fullName || user?.fullName || 'User'}</p>
                      <p className="text-[10px] text-gray-500 truncate normal-case tracking-normal font-medium">{displayEmail}</p>
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex justify-center mb-4 relative group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white font-semibold shadow-lg hover:scale-110 transition-transform">
                     {(user?.profile?.fullName || user?.fullName)?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full" />
                  
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-2xl">
                     Account Detail
                  </div>
             </div>
           )}

          <button 
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={cn(
              "w-full flex items-center gap-3.5 px-4 py-3 rounded-lg transition-all duration-300 group",
              "text-gray-500 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98]",
              isCollapsed && "justify-center px-0"
            )}
          >
            <div className="relative">
               <LogOut className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
               <div className="absolute inset-0 bg-red-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {!isCollapsed && <span className="font-semibold text-sm tracking-wide">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Wrapper - Shifts with Sidebar */}
      <div 
        className={cn(
            "flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-500",
            isCollapsed ? "lg:ml-[112px]" : "lg:ml-80"
        )}
      >
        {/* Header - Fixed & Flex-shrink-0 */}
        <header className="bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] flex-none z-30 h-20 flex items-center justify-between px-6 sm:px-8 lg:px-10">
            <div className="flex items-center gap-6">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100/50 hover:text-black transition-all active:scale-95"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight">
                  {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                </h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">
                   Customer Portal / {menuItems.find(item => item.path === location.pathname)?.label || 'Overview'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative">
               {/* Real-time Toast (Customer) */}
               {activeToast && (
                <div className="absolute top-16 right-0 z-[100] w-72 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-[#0F172A] text-white rounded-lg shadow-2xl p-4 flex gap-3 border border-white/10 backdrop-blur-xl">
                    <div className="bg-blue-600/20 p-2 rounded-lg h-fit">
                      <Bell className="w-4 h-4 text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold tracking-tight truncate">{activeToast.title}</p>
                      <p className="text-[10px] text-slate-200 font-medium line-clamp-2 mt-0.5">{activeToast.message}</p>
                    </div>
                    <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-white transition-colors h-fit p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
               )}

               <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100/50 shadow-sm shadow-emerald-500/5 transition-all hover:bg-emerald-50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 tracking-wide">Verified Account</span>
               </div>
               


               {/* Decorative User Ring */}
               <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all cursor-pointer">
                  <User className="w-5 h-5" />
               </div>
            </div>
        </header>

        {/* Scrollable Page Content - Flex-1 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
           <div className="max-w-6xl mx-auto min-h-full"> 
             {children}
           </div>
         </main>

        {/* Footer - Fixed at bottom (Flex-none) */}
        <footer className="bg-white border-t border-[#E2E8F0] py-4 px-4 sm:px-6 lg:px-8 flex-none z-30">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              © 2024 <span className="font-semibold text-gray-700">Lendigo Microcare</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 opacity-75 hover:opacity-100 transition-opacity">
              <Shield className="w-3 h-3 text-[#2563EB]" />
              Secure 256-bit SSL Encrypted
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
