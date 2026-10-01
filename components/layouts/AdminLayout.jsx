import { useNavigate, useLocation, Outlet } from '@/lib/router';
import { DsaPartnerRouteGuard } from '@/components/admin/DsaPartnerRouteGuard';
import PaymentApprovalsBell from '@/components/admin/header/PaymentApprovalsBell';
import { useNotifications } from '@/contexts';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Shield,
  ShieldBan,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Banknote,
  UserCog,
  Package,
  Video,
  AlertTriangle,
  Check,
  BookCheck,
  Headset,
  History,
  ServerCrash,
  LineChart,
  UserPlus,
  PieChart,
  HandCoins,
  Scale,
  AlertCircle,
  Sparkles,
  ClipboardList,
  UserCheck,
  Eye,
  ThumbsUp,
  ShieldCheck,
  XCircle,
  Coins,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { resolveAdminApplicationSearch } from '@/utils/adminApplicationSearch';
import { preloadRoute } from '@/lib/services/preloader';
import {
  clearBrePolicyVaultToken,
  isVaultProtectedAdminPath,
} from '@/lib/services/brePolicyVault';
import {
  ADMIN_NAV_GROUPS,
  filterNavGroups,
  normalizeAdminRole,
} from '@/config/adminNavigation';

const NAV_ICON_MAP = {
  LayoutDashboard,
  Activity,
  FileText,
  Video,
  Banknote,
  AlertTriangle,
  BookCheck,
  Shield,
  ShieldBan,
  LineChart,
  UserPlus,
  PieChart,
  HandCoins,
  Users,
  UserCog,
  Package,
  Settings,
  Headset,
  History,
  Check,
  AlertCircle,
  Scale,
  Sparkles,
  ClipboardList,
  UserCheck,
  Eye,
  ThumbsUp,
  ShieldCheck,
  XCircle,
  Coins,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Layers,
};
// ==========================================
// PAGE PROGRESS BAR
// ==========================================
const PageProgressBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[9999]">
    <div className="h-1 w-full bg-[#DBEAFE] overflow-hidden">
      <div className="h-full bg-[#2563EB] w-1/3 animate-pulse"></div>
    </div>
  </div>
);

import { useSelector, useDispatch } from 'react-redux';
import { setIsMobileMenuOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// Own state so each keystroke re-renders only this input, not the whole layout (sidebar + page outlet)
function HeaderSearch({ navigate }) {
  const [value, setValue] = useState('');
  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          resolveAdminApplicationSearch(navigate, value);
        }
      }}
      placeholder="Customer ID, PAN, Lead, mobile"
      className="h-10 pl-9 pr-3 rounded-lg border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400"
    />
  );
}

const ADMIN_BRAND_LOGO_URL =
  'https://res.cloudinary.com/dbyjiqjui/image/upload/v1770539125/logo_meijmf.webp';

export default function AdminLayout() {
  const dispatch = useDispatch();
  const { admin, adminLogout } = useAdminAuth();
  const { isSidebarCollapsed, isMobileMenuOpen } = useSelector((state) => state.ui);
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const isApplicationDetail = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path.startsWith('/admin/applications/fill/')) return false;
    return /^\/admin\/applications\/[^/]+$/.test(path);
  }, [location.pathname]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverLeaveTimer = useRef(null);

  /** Pinned open = user clicked expand; hover peek = temporary overlay without shifting main content */
  const isPinnedOpen = !isSidebarCollapsed;
  const showWideSidebar = isPinnedOpen || hoverExpanded;
  const navCompact = !showWideSidebar;

  const handleSidebarEnter = useCallback(() => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    if (isSidebarCollapsed) {
      setHoverExpanded(true);
    }
  }, [isSidebarCollapsed]);

  const handleSidebarLeave = useCallback(() => {
    hoverLeaveTimer.current = setTimeout(() => {
      setHoverExpanded(false);
      hoverLeaveTimer.current = null;
    }, 100);
  }, []);

  useEffect(() => () => {
    if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
  }, []);

  // Sync navigation state with location changes
  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

  // Lock BRE vault when leaving protected pages (not when switching BRE ↔ credit policy)
  useEffect(() => {
    if (!isVaultProtectedAdminPath(location.pathname)) {
      clearBrePolicyVaultToken();
    }
  }, [location.pathname]);

  const handleNavigate = (path) => {
    const currentFull = location.pathname + location.search;
    if (currentFull !== path) {
      setIsNavigating(true);
      navigate(path);
      dispatch(setIsMobileMenuOpen(false));
    }
  };

  const menuGroups = useMemo(() => {
    return ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      icon: NAV_ICON_MAP[group.icon] || LayoutDashboard,
      children: group.children.map((child) => ({
        ...child,
        icon: NAV_ICON_MAP[child.icon] || FileText,
      })),
    }));
  }, []);

  const adminRoleKey = useMemo(
    () => normalizeAdminRole(admin?.role || admin?.role_code),
    [admin?.role, admin?.role_code]
  );

  const filteredGroups = useMemo(
    () =>
      filterNavGroups(menuGroups, adminRoleKey, {
        creditBuckets: admin?.creditBuckets,
        permissionMap: admin?.permissionMap,
        hasCustomPermissions: !!admin?.has_custom_permissions,
      }),
    [menuGroups, adminRoleKey, admin?.creditBuckets, admin?.permissionMap, admin?.has_custom_permissions]
  );

  const isActive = useCallback((path) => {
    const currentFull = location.pathname + location.search;
    if (path.includes('?')) return currentFull === path;
    if (location.search) return false;
    return location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
  }, [location.pathname, location.search]);

  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      filteredGroups.forEach((group) => {
        const childActive = group.children.some((c) => isActive(c.path));
        if (childActive) next[group.id] = true;
      });
      return next;
    });
  }, [location.pathname, location.search, filteredGroups, isActive]);

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleLogout = async () => {
    setIsNavigating(true);
    try {
      await adminLogout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  useEffect(() => {
    if (admin) localStorage.setItem('adminData', JSON.stringify(admin));
  }, [admin]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {isNavigating && <PageProgressBar />}
      
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#1E3A8A] text-[#E2E8F0] border-r border-slate-800',
          'transition-[width,box-shadow] duration-200 ease-out will-change-[width]',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          showWideSidebar ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex flex-col h-full relative">
           <button 
                onClick={() => dispatch(toggleSidebar())}
                className="hidden lg:flex absolute -right-3 top-9 z-50 bg-[#0F172A] text-slate-400 hover:text-white border border-slate-700 rounded-full p-1 shadow-md transition-colors"
           >
                {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
           </button>

          <div
            className={cn(
              'h-16 flex items-center border-b border-slate-800 bg-white overflow-hidden',
              navCompact ? 'justify-center px-2' : 'justify-start px-3'
            )}
          >
             <img
               src={ADMIN_BRAND_LOGO_URL}
               alt="Lendigo Microcare"
               className={cn(
                 'object-contain object-left',
                 navCompact ? 'h-9 w-9' : 'h-10 w-auto max-w-full'
               )}
             />
          </div>

          <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto overflow-x-hidden no-scrollbar">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openGroups[group.id] ?? false;
              const groupHasActive = group.children.some((c) => isActive(c.path));

              const renderNavItem = (item, nested = false) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const showAppsBadge = item.badge === 'applications' && unreadCount > 0;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    title={navCompact ? `${group.label} · ${item.label}` : undefined}
                    onMouseEnter={() => preloadRoute(item.path)}
                    className={cn(
                      'group relative w-full flex items-center rounded-md transition-colors duration-150 ease-out',
                      navCompact ? 'justify-center px-2 py-2.5' : 'gap-3 py-2',
                      nested && !navCompact && 'pl-9 pr-3',
                      !nested && !navCompact && 'px-3.5 py-2.5',
                      active
                        ? 'bg-gradient-to-r from-[#2563EB]/20 to-[#1E3A8A]/10 text-white font-medium shadow-inner'
                        : 'text-[#E2E8F0]/70 hover:bg-[#1E293B] hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'transition-colors duration-200 shrink-0',
                        !navCompact && 'w-4 h-4',
                        navCompact && 'w-5 h-5',
                        active ? 'text-[#38BDF8]' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                      strokeWidth={active ? 2 : 1.75}
                    />
                    {!navCompact && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-sm tracking-wide truncate">{item.label}</span>
                        {showAppsBadge && (
                          <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse ml-1">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                    {navCompact && showAppsBadge && (
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#EF4444] border-2 border-[#0F172A] rounded-full" />
                    )}
                    {active && !navCompact && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#2563EB] rounded-r-full" />
                    )}
                  </button>
                );
              };

              if (navCompact) {
                return (
                  <div key={group.id} className="space-y-1">
                    {group.children.map((item) => renderNavItem(item))}
                  </div>
                );
              }

              const singleChild = group.children.length === 1;

              if (singleChild) {
                return (
                  <div key={group.id} className="space-y-0.5">
                    <p className="px-3.5 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {group.label}
                    </p>
                    {renderNavItem(group.children[0])}
                  </div>
                );
              }

              return (
                <div key={group.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3.5 py-2 rounded-lg text-left transition-colors',
                      groupHasActive
                        ? 'text-white bg-[#1E293B]/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/40'
                    )}
                  >
                    <GroupIcon className="w-4 h-4 shrink-0 text-[#38BDF8]/80" strokeWidth={1.75} />
                    <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-0.5 border-l border-slate-700/80 ml-4 pl-1">
                      {group.children.map((item) => renderNavItem(item, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-800 bg-white/[0.02]">
            <button
              onClick={handleLogout}
              title={navCompact ? 'Sign Out' : undefined}
              className={cn(
                'w-full flex items-center rounded-md text-sm font-medium transition-colors duration-150 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10',
                navCompact ? 'justify-center' : 'gap-3'
              )}
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              {!navCompact && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => dispatch(setIsMobileMenuOpen(false))}
          aria-hidden="true"
        />
      )}

      <div className={cn(
          'flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-out',
          showWideSidebar ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        <header className="bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
          <div className="flex items-center justify-between gap-4 h-20 px-6 lg:px-10">
            <button
              onClick={() => dispatch(setIsMobileMenuOpen(!isMobileMenuOpen))}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="hidden sm:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <HeaderSearch navigate={navigate} />
              </div>
            </div>

            <div className="flex items-center gap-4 ml-auto">
               <PaymentApprovalsBell />
               <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Session</span>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                     <span className="text-sm font-medium text-slate-800">Active</span>
                  </div>
               </div>
            </div>
          </div>
        </header>

        <main className={cn('flex-1 overflow-auto bg-background', !isApplicationDetail && 'p-4 lg:p-6')}>
          <div
            className={cn(
              location.pathname.includes('/admin/applications/fill/') || isApplicationDetail
                ? 'max-w-none mx-0 px-0'
                : 'max-w-7xl mx-auto'
            )}
          >
             <Suspense fallback={<Spinner.Full />}>
                <DsaPartnerRouteGuard>
                  <Outlet />
                </DsaPartnerRouteGuard>
             </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
