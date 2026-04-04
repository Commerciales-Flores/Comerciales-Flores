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
    icon: React.ReactNode;
    title: string;
    iconWrapper: string;
  }
> = {
  error: {
    icon: <AlertCircle className="size-4 text-red-500" />,
    title: 'Error',
    iconWrapper: 'bg-red-50',
  },
  warning: {
    icon: <TriangleAlert className="size-4 text-amber-500" />,
    title: 'Warning',
    iconWrapper: 'bg-amber-50',
  },
  success: {
    icon: <CheckCircle2 className="size-4 text-emerald-500" />,
    title: 'Success',
    iconWrapper: 'bg-emerald-50',
  },
  info: {
    icon: <Info className="size-4 text-blue-500" />,
    title: 'Notice',
    iconWrapper: 'bg-blue-50',
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

  const style = variantStyles[variant];

  return (
    <div
      className={`transform rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition-all duration-200 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
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
          <p className="text-sm font-semibold text-gray-900">{style.title}</p>
          <p className="mt-1 leading-relaxed text-gray-600">{message}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss notice"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}