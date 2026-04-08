import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type NoticeVariant = 'error' | 'warning' | 'success' | 'info';

type AppNoticeProps = {
  message: string;
  variant?: NoticeVariant;
  onClose?: () => void;
  className?: string;
  autoHideMs?: number;
};

const variantStyles: Record<
  NoticeVariant,
  {
    icon: ReactNode;
    title: string;
    iconWrapper: string;
    container: string;
    titleClass: string;
    messageClass: string;
    closeButtonClass: string;
  }
> = {
  error: {
    icon: <AlertCircle className="size-4 text-red-700" />,
    title: 'Error',
    iconWrapper: 'bg-red-200/80',
    container: 'border-red-300 bg-red-100',
    titleClass: 'text-red-900',
    messageClass: 'text-red-800',
    closeButtonClass: 'text-red-500 hover:bg-red-200/70 hover:text-red-700',
  },
  warning: {
    icon: <TriangleAlert className="size-4 text-amber-700" />,
    title: 'Warning',
    iconWrapper: 'bg-amber-200/80',
    container: 'border-amber-300 bg-amber-100',
    titleClass: 'text-amber-900',
    messageClass: 'text-amber-800',
    closeButtonClass: 'text-amber-500 hover:bg-amber-200/70 hover:text-amber-700',
  },
  success: {
    icon: <CheckCircle2 className="size-4 text-emerald-700" />,
    title: 'Success',
    iconWrapper: 'bg-emerald-200/80',
    container: 'border-emerald-300 bg-emerald-100',
    titleClass: 'text-emerald-900',
    messageClass: 'text-emerald-800',
    closeButtonClass:
      'text-emerald-500 hover:bg-emerald-200/70 hover:text-emerald-700',
  },
  info: {
    icon: <Info className="size-4 text-blue-700" />,
    title: 'Notice',
    iconWrapper: 'bg-blue-200/80',
    container: 'border-blue-300 bg-blue-100',
    titleClass: 'text-blue-900',
    messageClass: 'text-blue-800',
    closeButtonClass: 'text-blue-500 hover:bg-blue-200/70 hover:text-blue-700',
  },
};

export default function AppNotice({
  message,
  variant = 'info',
  onClose,
  className = '',
  autoHideMs,
}: AppNoticeProps) {
  const [isVisible, setIsVisible] = useState(false);

  const style = variantStyles[variant];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!autoHideMs || !onClose) return;

    const timeout = window.setTimeout(() => {
      handleClose();
    }, autoHideMs);

    return () => window.clearTimeout(timeout);
  }, [autoHideMs, onClose]);

  const handleClose = () => {
    if (!onClose) return;
    setIsVisible(false);
    window.setTimeout(() => {
      onClose();
    }, 180);
  };

  return (
    <div
      className={`fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm transform rounded-2xl border px-4 py-3 text-sm shadow-lg transition-all duration-200 ${style.container} ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-2 opacity-0 pointer-events-none'
      } ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${style.iconWrapper}`}
        >
          {style.icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${style.titleClass}`}>{style.title}</p>
          <p className={`mt-1 leading-relaxed ${style.messageClass}`}>{message}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className={`rounded-full p-1.5 transition ${style.closeButtonClass}`}
            aria-label="Dismiss notice"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}