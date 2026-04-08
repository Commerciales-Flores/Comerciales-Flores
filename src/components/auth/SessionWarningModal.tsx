import { useEffect, useState } from 'react';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';

interface SessionWarningModalProps {
  open: boolean;
  countdown: number;
  title?: string;
  onStaySignedIn: () => void;
  onLogout: () => void | Promise<void>;
}

export default function SessionWarningModal({
  open,
  countdown,
  title = 'Session expiring soon',
  onStaySignedIn,
  onLogout,
}: SessionWarningModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    const animationTimeout = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(animationTimeout);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        visible
          ? 'bg-slate-950/50 '
          : 'bg-slate-950/0 backdrop-blur-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full max-w-md transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        <div className="relative overflow-hidden rounded-[1.75rem] border border-orange-600 bg-orange-700 text-white shadow-[0_20px_40px_rgba(194,65,12,0.35)]">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 size-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                <ShieldAlert className="size-6 text-orange-200 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black tracking-tight">
                  {title}
                </h2>

                <p className="mt-2 text-sm text-orange-100/90 leading-relaxed font-medium">
                  For your security, you will be logged out soon due to inactivity.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm font-bold text-white">
                  <Clock className="size-4 text-orange-200" />
                  {countdown}s remaining
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onStaySignedIn}
                className="w-full py-3 rounded-xl font-black bg-white text-orange-700 hover:bg-orange-50 transition-all active:scale-[0.98] shadow-sm"
              >
                Stay Signed In
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 rounded-xl font-black bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogOut className="size-4" />
                Log Out Now
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 h-[4px] w-full bg-black/10">
            <div
              className="h-full bg-white/60 transition-all linear"
              style={{
                width: `${Math.max((countdown / 60) * 100, 0)}%`,
                transitionDuration: '1000ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}