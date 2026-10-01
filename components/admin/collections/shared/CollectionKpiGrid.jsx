import { cn } from '@/lib/utils';
import { collectionUi } from './collectionUi';

const TONE_VALUE = {
  default: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-blue-700',
};

export default function CollectionKpiGrid({ items = [], className }) {
  return (
    <div className={cn(collectionUi.kpiGrid, className)}>
      {items.map((item) => {
        const clickable = typeof item.onClick === 'function';
        const classNameCell = cn(
          collectionUi.kpiCell,
          clickable &&
            'w-full text-left cursor-pointer hover:border-slate-400 hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
        );

        const body = (
          <>
            <p className={collectionUi.kpiLabel}>{item.label}</p>
            <p className={cn(collectionUi.kpiValue, TONE_VALUE[item.tone || 'default'])}>{item.value}</p>
            {item.hint && (
              <p className={cn(collectionUi.kpiHint, clickable && 'underline-offset-2 group-hover:underline')}>
                {item.hint}
                {clickable ? ' · View' : ''}
              </p>
            )}
          </>
        );

        if (clickable) {
          return (
            <button
              key={item.key || item.label}
              type="button"
              onClick={item.onClick}
              className={cn(classNameCell, 'group')}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={item.key || item.label} className={classNameCell}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
