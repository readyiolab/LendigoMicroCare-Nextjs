import { Button } from '@/components/ui/button';

export default function CasePager({ page = 1, pageSize = 25, total = 0, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 text-[12px] text-slate-600">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={to >= total} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
