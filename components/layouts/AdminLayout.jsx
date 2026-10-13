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

const SIDEBAR_IMAGE_BY_ID = {
  dashboard: 'dashboard.webp',
  leads: 'leads.webp',
  sanction: 'sanction.webp',
  payment: 'payments.webp',
  reports: 'reports.webp',
  approval: 'for approval.webp',
  collections: 'self-collect (1).webp',
  risk: 'risk&credit.webp',
  administration: 'Administration.webp',
  fresh: 'fresh.webp',
  'bucket-fresh': 'fresh.webp',
  drafts: 'drafts.webp',
  'all-apps': 'application.webp',
  repeat: 'Repeat customers.webp',
  'bucket-repeat': 'Repeat customers.webp',
  blacklist: 'black-list.webp',
  'under-review': 'under-review.webp',
  recommended: 'recommended.webp',
  approved: 'approved-process.webp',
  rejected: 'rejected-process.webp',
  'payout-review': 'payout-review.webp',
  'disbursal-sheet': 'disbursal-sheet.webp',
  video: 'video-decalration.webp',
  repayments: 'repayment.webp',
  'telecaller-performance': 'telecaller.webp',
  'uw-performance': 'underwriting-reports.webp',
  'ops-performance': 'operation-report.webp',
  'mgmt-funnel': 'management funnel.webp',
  'loan-book-mis': 'loan book mis.webp',
  analytics: 'analytics.webp',
  portfolio: 'disburse-portofolio.webp',
  cibil: 'credit-cibil.webp',
  'collection-report': 'collection-report.webp',
  'online-payment': 'online-payment.webp',
  settlements: 'settlement-approvals.webp',
  reconciliation: 'reconciliation.webp',
  'coll-dashboard': 'collection-dashboard.webp',
  overdue: 'overduw-loans.webp',
  ptp: 'promise to pay.webp',
  'bre-mgmt': 'bre-management.webp',
  'credit-policy': 'credit-policy.webp',
  ledger: 'ledger-book.webp',
  users: 'users.webp',
  'staff-users': 'staff-users.webp',
  roles: 'role-management.webp',
  'credit-buckets': 'credit-bucket.webp',
  products: 'loan product.webp',
  'bucket-sanctional': 'sanction.webp',
};

function sidebarImageSrc(id) {
  const file = SIDEBAR_IMAGE_BY_ID[id];
  return file ? `/sidebar-icons/${encodeURIComponent(file)}` : null;
}

function NavGlyph({ id, Icon, className, strokeWidth }) {
  const src = sidebarImageSrc(id);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-5 w-5 shrink-0 object-contain"
      />
    );
  }
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

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
      className="h-10 pl-9 pr-3 rounded-lg border-[#E5E5E5] bg-white text-sm placeholder:text-[#999999]"
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
    <div className="min-h-screen bg-[#F1F1F1] flex flex-col font-sans">
      {isNavigating && <PageProgressBar />}
      
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[#F1F1F1] text-[#111111] border-r border-[#D4D4D4]',
          'transition-[width,transform] duration-200 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          showWideSidebar ? 'w-[240px] lg:w-[272px]' : 'w-20'
        )}
      >
        <div className="flex flex-col h-full relative">
           <button
                type="button"
                onClick={() => dispatch(toggleSidebar())}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden lg:flex absolute -right-3 top-8 z-50 bg-white text-[#444444] hover:text-[#111111] border border-[#E5E5E5] rounded-full p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/25"
           >
                {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
           </button>

          <div
            className={cn(
              'flex items-center overflow-hidden',
              navCompact ? 'h-16 justify-center px-2' : 'h-[72px] justify-start px-5 lg:px-6'
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

          <nav aria-label="Admin" className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3 py-2 lg:px-4">
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
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    title={navCompact ? `${group.label} · ${item.label}` : undefined}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={() => preloadRoute(item.path)}
                    className={cn(
                      'group relative w-full flex items-center rounded-xl transition-colors duration-150 ease-out',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20',
                      navCompact ? 'h-11 justify-center px-2' : 'gap-3',
                      nested && !navCompact && 'h-10 pl-3 pr-2',
                      !nested && !navCompact && 'h-11 px-3',
                      active
                        ? 'bg-white text-[#111111] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        : 'text-[#444444] hover:bg-white/70 hover:text-[#111111]'
                    )}
                  >
                    <NavGlyph
                      id={item.id}
                      Icon={Icon}
                      strokeWidth={active ? 2 : 1.75}
                      className={cn(
                        'shrink-0 transition-colors duration-150',
                        navCompact ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                        active ? 'text-[#111111]' : 'text-[#444444] group-hover:text-[#111111]'
                      )}
                    />
                    {!navCompact && (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className={cn('truncate', nested ? 'text-[13px]' : 'text-sm')}>{item.label}</span>
                        {showAppsBadge && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FFB58F] px-1.5 text-[11px] font-medium leading-none text-[#111111]">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                    {navCompact && showAppsBadge && (
                      <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FFB58F] px-1 text-[9px] font-medium leading-none text-[#111111]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              };

              if (navCompact) {
                return (
                  <div key={group.id} className="mb-2 space-y-1">
                    {group.children.map((item) => renderNavItem(item))}
                  </div>
                );
              }

              const singleChild = group.children.length === 1;

              if (singleChild) {
                return (
                  <div key={group.id} className="mb-1">
                    {renderNavItem(group.children[0])}
                  </div>
                );
              }

              return (
                <div key={group.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className={cn(
                      'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20',
                      groupHasActive
                        ? 'text-[#111111]'
                        : 'text-[#444444] hover:bg-white/70 hover:text-[#111111]'
                    )}
                  >
                    <NavGlyph
                      id={group.id}
                      Icon={GroupIcon}
                      strokeWidth={groupHasActive ? 2 : 1.75}
                      className={cn('h-[18px] w-[18px] shrink-0', groupHasActive ? 'text-[#111111]' : 'text-[#444444]')}
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-[#666666] transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="relative ml-[21px] mt-1 space-y-0.5 border-l border-[#E5E5E5] pl-2">
                      {group.children.map((item) => renderNavItem(item, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-[#E5E5E5] p-3 lg:p-4">
            <button
              type="button"
              onClick={handleLogout}
              title={navCompact ? 'Sign Out' : undefined}
              className={cn(
                'flex h-11 w-full items-center rounded-xl text-sm font-medium text-[#444444] transition-colors duration-150 hover:bg-white hover:text-[#111111]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20',
                navCompact ? 'justify-center px-2' : 'gap-3 px-3'
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!navCompact && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => dispatch(setIsMobileMenuOpen(false))}
          aria-hidden="true"
        />
      )}

      <div className={cn(
          'flex min-w-0 flex-1 flex-col bg-[#F1F1F1] transition-[margin] duration-200 ease-out',
          showWideSidebar ? 'lg:ml-[272px]' : 'lg:ml-20'
      )}>
        <header className="sticky top-0 z-30 border-b border-[#D4D4D4] bg-[#F1F1F1]">
          <div className="flex h-[72px] items-center justify-between gap-4 px-6">
            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => dispatch(setIsMobileMenuOpen(!isMobileMenuOpen))}
              className="rounded-lg p-2 -ml-2 text-[#111111] transition-colors duration-150 hover:bg-[#F1F1F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20 lg:hidden"
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

        <main className={cn('flex-1 overflow-auto bg-[#F1F1F1]', !isApplicationDetail && 'p-6')}>
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
