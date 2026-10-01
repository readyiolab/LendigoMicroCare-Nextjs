import { Spinner } from '@/components/ui/spinner';

export default function CollectionEmptyState({ icon: Icon, title, description, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <Spinner className="w-6 h-6" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && <Icon className="w-8 h-8 text-slate-300 mb-3" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-md">{description}</p>}
    </div>
  );
}
