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
    icon: <AlertCircle className="size-4 text-rose-100" />,
    title: 'Error',
    iconWrapper: 'bg-white/20',
    container: 'border-rose-500 bg-rose-600 text-white',
    titleClass: 'text-white',
    messageClass: 'text-white/90',
    closeButtonClass: 'text-white/70 hover:bg-white/20 hover:text-white',
  },
  warning: {
    icon: <TriangleAlert className="size-4 text-orange-200" />,
    title: 'Warning',
    iconWrapper: 'bg-white/20',
    container: 'border-orange-600 bg-orange-700 text-white',
    titleClass: 'text-white',
    messageClass: 'text-white/90',
    closeButtonClass: 'text-white/70 hover:bg-white/20 hover:text-white',
  },
  success: {
    icon: <CheckCircle2 className="size-4 text-emerald-100" />,
    title: 'Success',
    iconWrapper: 'bg-white/20',
    container: 'border-emerald-500 bg-emerald-600 text-white',
    titleClass: 'text-white',
    messageClass: 'text-white/90',
    closeButtonClass: 'text-white/70 hover:bg-white/20 hover:text-white',
  },
  info: {
    icon: <Info className="size-4 text-blue-100" />,
    title: 'Notice',
    iconWrapper: 'bg-white/20',
    container: 'border-blue-500 bg-blue-600 text-white',
    titleClass: 'text-white',
    messageClass: 'text-white/90',
    closeButtonClass: 'text-white/70 hover:bg-white/20 hover:text-white',
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
      className={`fixed right-4 top-4 z-[200] w-[calc(100%-2rem)] max-w-sm transform rounded-2xl border px-4 py-3 text-sm shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${style.container} ${
        isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0 pointer-events-none'
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
          <p className={`text-sm font-bold tracking-tight ${style.titleClass}`}>
            {style.title}
          </p>
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