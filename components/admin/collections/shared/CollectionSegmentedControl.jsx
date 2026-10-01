import { cn } from '@/lib/utils';
import { collectionUi } from './collectionUi';

export default function CollectionSegmentedControl({ options, value, onChange, className }) {
  return (
    <div className={cn(collectionUi.segmentGroup, className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => onChange?.(opt.value)}
            className={cn(
              collectionUi.segmentBtn,
              active && collectionUi.segmentBtnActive
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
