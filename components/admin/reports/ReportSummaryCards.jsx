export default function ReportSummaryCards({ allocated = 0, pending = 0, finished = 0, averageHours = null, loading = false }) {
  const cards = [
    ['Allocated', allocated],
    ['Still pending', pending],
    ['Finished', finished],
    ['Average time', averageHours == null ? '—' : `${averageHours} hours`],
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function averageHours(rows, field) {
  const values = (rows || []).map((row) => Number(row[field])).filter((value) => value > 0);
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
