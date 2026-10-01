import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

function pickPrimaryButton(footerEl) {
  if (!footerEl) return null;
  const buttons = footerEl.querySelectorAll('button');
  if (buttons.length === 0) return null;

  for (const btn of buttons) {
    const text = (btn.textContent || '').trim().toLowerCase();
    const cls = btn.getAttribute('class') || '';
    if (
      text !== 'back' &&
      text !== 'cancel' &&
      !cls.includes('border-gray') &&
      !cls.includes('bg-white')
    ) {
      return btn;
    }
  }

  for (const btn of buttons) {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text !== 'back' && text !== 'cancel') return btn;
  }

  return buttons[buttons.length - 1] || null;
}

function readActionState(btn) {
  const text = (btn.textContent || '').trim();
  const loading = !!(
    text.includes('...') ||
    btn.querySelector('.animate-spin') ||
    btn.querySelector('.spinner') ||
    btn.querySelector('svg.animate-spin')
  );
  return {
    text: text.replace(/\.\.\./g, '').trim(),
    disabled: !!btn.disabled,
    loading,
  };
}

const MOBILE_QUERY = '(max-width: 639px)';

/**
 * Below Tailwind's `sm`, where the CTA belongs in a bottom bar within thumb reach.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

/**
 * Shared shell for customer onboarding steps.
 * On desktop the primary footer CTA is mirrored into the header without re-rendering
 * on every keystroke; on mobile the real button stays put in a pinned bottom bar.
 */
export default function StepLayout({
  title,
  description,
  onClose,
  children,
  footer,
  loading = false,
  icon: Icon,
  className = '',
}) {
  const footerRef = useRef(null);
  const primaryBtnRef = useRef(null);
  const actionSnapshotRef = useRef(null);
  const rafRef = useRef(0);
  const [headerAction, setHeaderAction] = useState(null);
  const isMobile = useIsMobile();

  const syncHeaderAction = useCallback(() => {
    const footerEl = footerRef.current;
    if (!footerEl) return;

    const buttons = footerEl.querySelectorAll('button');
    const primaryBtn = pickPrimaryButton(footerEl);

    if (!primaryBtn) {
      primaryBtnRef.current = null;
      if (actionSnapshotRef.current !== null) {
        actionSnapshotRef.current = null;
        setHeaderAction(null);
      }
      footerEl.style.display = 'block';
      return;
    }

    if (isMobile) {
      // Bottom bar shows the real button — undo any mirroring from a wider viewport
      primaryBtn.style.display = '';
      primaryBtnRef.current = primaryBtn;
      footerEl.style.display = 'block';
      if (actionSnapshotRef.current !== null) {
        actionSnapshotRef.current = null;
        setHeaderAction(null);
      }
      return;
    }

    // Keep primary in footer for a11y/submit, hide visually — mirror in header
    primaryBtn.style.display = 'none';
    primaryBtnRef.current = primaryBtn;

    const next = readActionState(primaryBtn);
    const prev = actionSnapshotRef.current;
    if (
      !prev ||
      prev.text !== next.text ||
      prev.disabled !== next.disabled ||
      prev.loading !== next.loading
    ) {
      actionSnapshotRef.current = next;
      setHeaderAction(next);
    }

    const visibleButtons = Array.from(buttons).filter((btn) => btn.style.display !== 'none');
    footerEl.style.display = visibleButtons.length === 0 ? 'none' : 'block';
  }, [isMobile]);

  useEffect(() => {
    actionSnapshotRef.current = null;
    primaryBtnRef.current = null;
    setHeaderAction(null);

    if (!footer) return undefined;

    if (footerRef.current) {
      footerRef.current.style.display = 'block';
    }

    const timer = setTimeout(syncHeaderAction, 40);

    const scheduleSync = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(syncHeaderAction);
    };

    let observer;
    // Only watch disabled/class — not characterData/subtree noise from form re-renders
    const startObserver = () => {
      if (!footerRef.current) return;
      observer = new MutationObserver(scheduleSync);
      observer.observe(footerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'class', 'aria-disabled'],
      });
    };

    const observerTimer = setTimeout(startObserver, 40);

    return () => {
      clearTimeout(timer);
      clearTimeout(observerTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (observer) observer.disconnect();
    };
  }, [title, !!footer, loading, isMobile, syncHeaderAction]);

  const handleHeaderClick = useCallback(() => {
    primaryBtnRef.current?.click();
  }, []);

  return (
    <div className={`bg-white rounded-lg border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden ${className}`.trim()}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-zinc-950 text-white flex items-center justify-center shadow-md shadow-zinc-200 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight leading-tight truncate">
              {title}
            </h2>
            <p className="text-xs font-black text-slate-500 truncate uppercase tracking-wider">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerAction && (
            <Button
              type="button"
              onClick={handleHeaderClick}
              disabled={headerAction.disabled || headerAction.loading}
              className="h-8.5 px-3 text-[10px] font-black bg-zinc-950 hover:bg-black text-white shadow-md shadow-zinc-200/10 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wider flex items-center gap-1.5 border border-slate-200"
            >
              {headerAction.loading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              ) : null}
              <span>{headerAction.text}</span>
              <ArrowRight className="w-3 h-3 hidden sm:inline" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8.5 w-8.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        className={`p-5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar ${
          footer && isMobile ? 'pb-28' : ''
        }`.trim()}
      >
        {children}
      </div>

      {footer && (
        <div
          ref={footerRef}
          className={
            isMobile
              ? 'fixed inset-x-0 bottom-0 z-40 px-4 pt-3 bg-white border-t border-gray-200 shadow-[0_-6px_20px_rgba(15,23,42,0.08)]'
              : 'px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 shrink-0'
          }
          style={
            isMobile
              ? { paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))' }
              : undefined
          }
        >
          {footer}
        </div>
      )}
    </div>
  );
}
