import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function RepaymentFilters({
  filters,
  setFilters,
  statusFilters,
  searchInput,
  setSearchInput,
  handleSearch,
  applySearchNow,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 pb-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilters({ ...filters, status: f.value, page: 1 })}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              filters.status === f.value
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, mobile, or UTR..."
            className="pl-9 h-9 bg-white border-slate-200"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <Button
          variant="outline"
          className="h-9 px-4 border-slate-200 text-slate-700"
          onClick={applySearchNow}
        >
          Search
        </Button>
      </div>
    </div>
  );
}
