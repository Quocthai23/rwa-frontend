'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '@radix-ui/react-slot';
import { X } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal: boolean;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) {
    throw new Error('Sheet components must be used within <Sheet>');
  }
  return ctx;
}

function Sheet({
  open,
  onOpenChange,
  children,
  modal = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  modal?: boolean;
}) {
  const value = React.useMemo(() => ({ open, onOpenChange, modal }), [open, onOpenChange, modal]);
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

function SheetTrigger({
  asChild,
  className,
  children,
  onClick,
  ...props
}: React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const { open, onOpenChange } = useSheetContext();
  const handleToggle = React.useCallback(() => onOpenChange(!open), [onOpenChange, open]);
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      data-slot="sheet-trigger"
      className={className}
      {...props}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        handleToggle();
      }}
    >
      {children}
    </Comp>
  );
}

function SheetClose({
  asChild,
  className,
  children,
  onClick,
  ...props
}: React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext();
  const handleClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      data-slot="sheet-close"
      className={className}
      {...props}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        handleClose();
      }}
    >
      {children}
    </Comp>
  );
}

const PANEL_MS = 220;

type InteractOutsideEvent = { preventDefault: () => void };

type SheetContentProps = React.ComponentPropsWithoutRef<'div'> & {
  side?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  withOverlay?: boolean;
  overlayClassName?: string;
  showCloseButton?: boolean;
  title?: React.ReactNode | null;
  forceMount?: boolean;
  onOpenAutoFocus?: (event: { preventDefault: () => void }) => void;
  onInteractOutside?: (event: InteractOutsideEvent) => void;
};

function SheetContent({
  className,
  children,
  side = 'bottom',
  withOverlay = true,
  overlayClassName,
  showCloseButton = false,
  title = 'Sheet',
  forceMount = false,
  onOpenAutoFocus,
  onInteractOutside,
  style: styleProp,
  onTransitionEnd: onTransitionEndProp,
  ...props
}: SheetContentProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, modal } = useSheetContext();
  const [inDom, setInDom] = React.useState(() => open || forceMount);
  const [entered, setEntered] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const [docReady, setDocReady] = React.useState(false);

  React.useEffect(() => setDocReady(true), []);

  React.useEffect(() => {
    if (open) {
      setInDom(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
  }, [open]);

  React.useEffect(() => {
    if (open || !inDom || forceMount) return;
    const t = window.setTimeout(() => setInDom(false), PANEL_MS + 80);
    return () => window.clearTimeout(t);
  }, [open, inDom, forceMount]);

  React.useEffect(() => {
    if (!inDom || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inDom, open]);

  React.useEffect(() => {
    if (!inDom || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inDom, open, onOpenChange]);

  React.useEffect(() => {
    if (!open || !entered || !panelRef.current) return;
    const ev = {
      defaultPrevented: false,
      preventDefault() {
        ev.defaultPrevented = true;
      },
    };
    onOpenAutoFocus?.(ev);
    if (!ev.defaultPrevented) {
      panelRef.current.focus({ preventScroll: true });
    }
  }, [open, entered, onOpenAutoFocus]);

  const onPanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (side === 'center') {
      if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    } else if (e.propertyName !== 'transform') return;
    if (!open && !forceMount) setInDom(false);
  };

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleOverlayClick = React.useCallback(() => {
    let prevented = false;
    onInteractOutside?.({
      preventDefault: () => {
        prevented = true;
      },
    });
    if (!prevented) close();
  }, [close, onInteractOutside]);

  if (!docReady || !inDom) return null;

  const isBottom = side === 'bottom';
  const isTop = side === 'top';
  const isCenter = side === 'center';
  const isLeft = side === 'left';
  const hasAriaTitle = title != null && title !== '';

  const panelBase =
    'bg-background z-10 flex max-h-dvh flex-col gap-4 outline-none focus:outline-none focus-visible:ring-0 motion-reduce:transition-none max-w-3xl mx-auto';

  const panelPosition = isCenter
    ? 'border-border fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-0 shadow-lg transition-[opacity,transform] ease-out dark:shadow-[0_14px_40px_-16px_rgba(0,0,0,0.45)]'
    : isTop
      ? 'border-border fixed inset-x-0 top-0 rounded-b-xl border-b shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition-transform ease-out dark:shadow-[0_10px_36px_-14px_rgba(0,0,0,0.45)]'
      : isBottom
        ? 'border-border fixed inset-x-0 bottom-0 rounded-t border-t shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.12)] transition-transform ease-out dark:shadow-[0_-10px_36px_-14px_rgba(0,0,0,0.45)]'
        : isLeft
          ? 'border-border fixed inset-y-0 left-0 h-full w-3/4 border-r transition-transform ease-out sm:max-w-sm'
          : 'border-border fixed inset-y-0 right-0 h-full w-3/4 border-l transition-transform ease-out sm:max-w-sm';

  const panelVisible = isCenter
    ? open && entered
      ? 'pointer-events-auto opacity-100 scale-100'
      : 'pointer-events-none opacity-0 scale-95'
    : open && entered
      ? 'pointer-events-auto translate-x-0 translate-y-0'
      : isTop
        ? 'pointer-events-none -translate-y-full'
        : isBottom
          ? 'pointer-events-none translate-y-full'
          : isLeft
            ? 'pointer-events-none -translate-x-full'
            : 'pointer-events-none translate-x-full';

  const portal = (
    <div className="pointer-events-none fixed inset-0 z-50" data-sheet-side={side}>
      {withOverlay ? (
        <div
          role="presentation"
          className={cn(
            'fixed inset-0 z-0 mx-auto max-w-3xl bg-black/50 transition-opacity ease-out motion-reduce:transition-none',
            open && entered ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            overlayClassName,
          )}
          style={{ transitionDuration: `${PANEL_MS}ms` }}
          onClick={handleOverlayClick}
        />
      ) : null}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={modal}
        aria-hidden={!open}
        aria-labelledby={hasAriaTitle ? titleId : undefined}
        tabIndex={-1}
        data-slot="sheet-content"
        className={cn(panelBase, panelPosition, panelVisible, className, 'bg-background')}
        {...props}
        style={{
          ...styleProp,
          transitionDuration: `${PANEL_MS}ms`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTransitionEnd={(e) => {
          onPanelTransitionEnd(e);
          onTransitionEndProp?.(e);
        }}
      >
        {hasAriaTitle ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : null}
        {children}
        {showCloseButton ? (
          <button
            type="button"
            aria-label={t('common.close')}
            className="text-muted-foreground ring-offset-background focus:ring-ring hover:bg-muted hover:text-foreground absolute top-4 right-4 rounded-xs p-0.5 opacity-70 transition-[opacity,background-color,color] hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
            onClick={close}
          >
            <X size={24} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );

  return createPortal(portal, document.body);
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

const SheetCustom = Sheet;
const SheetCustomContent = SheetContent;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetCustom,
  SheetCustomContent,
};
