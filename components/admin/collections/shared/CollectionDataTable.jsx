import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collectionUi } from './collectionUi';
import CollectionEmptyState from './CollectionEmptyState';

export default function CollectionDataTable({
  children,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  pagination,
  onPageChange,
  className,
}) {
  return (
    <div className={cn(collectionUi.tableShell, className)}>
      {loading ? (
        <CollectionEmptyState loading />
      ) : emptyTitle ? (
        <CollectionEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}

      {pagination && pagination.totalPages > 1 && !loading && !emptyTitle && (
        <div className={cn('flex items-center justify-between px-4 py-3', collectionUi.tablePagination)}>
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
