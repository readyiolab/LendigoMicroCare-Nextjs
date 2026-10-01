import { cn } from '@/lib/utils';
import { collectionUi } from './collectionUi';

export default function CollectionFilterBar({ children, actions, className }) {
  return (
    <div className={cn(collectionUi.filterBar, className)}>
      {children}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
