import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';

export default function AdminFormShell({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'bg-slate-900',
  onBack,
  headerRight,
  children,
  footer,
  className,
  showIcon = true,
}) {
  return (
    <div className={cn(adminUi.page, 'animate-in fade-in duration-300 pb-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 w-9 p-0 rounded-md shrink-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 mt-0.5"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {showIcon && Icon && (
            <div className={cn('p-2 rounded-md shrink-0 mt-0.5', iconClassName)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <h1 className={adminUi.pageHeader}>{title}</h1>
            {subtitle && (
              <p className={cn(adminUi.pageSubtitle, 'mt-0.5')}>{subtitle}</p>
            )}
          </div>
        </div>
        {headerRight && (
          <div className="flex items-center gap-2 sm:pt-0.5">{headerRight}</div>
        )}
      </div>

      {children}

      {footer && (
        <div className="sticky bottom-0 z-10 pt-2">
          <div className="flex justify-end gap-2 border-t border-slate-300 bg-white/95 backdrop-blur-sm px-0 py-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
