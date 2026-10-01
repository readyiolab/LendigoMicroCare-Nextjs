import React from 'react';
import { useNavigate, useLocation } from '@/lib/router';
import { Users, Shield, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'users', label: 'Staff Users', path: '/admin/staff-users', icon: Users },
  { id: 'roles', label: 'Roles', path: '/admin/roles', icon: Shield },
  { id: 'statuses', label: 'Status Types', path: '/admin/roles?tab=statuses', icon: Key },
];

export default function AccessManagementTabs({ className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tabParam = params.get('tab');

  const activeId = (() => {
    if (location.pathname.startsWith('/admin/staff-users')) return 'users';
    if (location.pathname.startsWith('/admin/roles')) {
      return tabParam === 'statuses' ? 'statuses' : 'roles';
    }
    return 'users';
  })();

  return (
    <div className={cn('bg-white p-0.5 h-auto rounded-md border border-slate-300 flex flex-wrap items-center gap-0.5 w-fit', className)}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-medium transition-colors border-none cursor-pointer',
              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
