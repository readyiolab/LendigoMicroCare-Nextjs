export function DsaStatSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm animate-pulse">
          <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
          <div className="h-8 w-16 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export function DsaTableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden animate-pulse">
      <div className="bg-slate-50 h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-t">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 bg-slate-50 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
