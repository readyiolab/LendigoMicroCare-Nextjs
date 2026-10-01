import { cn } from '@/lib/utils';
import { collectionUi } from './collectionUi';

export default function CollectionSection({ title, subtitle, actions, children, className }) {
  return (
    <section className={cn('border border-slate-200 bg-white', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            {title && <h3 className={collectionUi.sectionTitle}>{title}</h3>}
            {subtitle && <p className={collectionUi.sectionSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
