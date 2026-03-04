import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, LogOut, ShieldAlert } from 'lucide-react';

interface TopIndicatorProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'login' | 'logout' | 'security';
  onClose?: () => void;
  duration?: number;
}

export default function TopIndicator({ 
  message, 
  type = 'success', 
  duration = 2000, 
  onClose 
}: TopIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    
    const animationTimeout = setTimeout(() => setVisible(true), 10);
    
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) setTimeout(onClose, 300); 
    }, duration);

    return () => {
      clearTimeout(animationTimeout);
      clearTimeout(timer);
    };
  }, [message, duration, onClose]);

  // Switched to solid, saturated colors for high visibility on white backgrounds
  const styles = {
    success: {
      bg: 'bg-emerald-600 border-emerald-500 text-white',
      icon: <CheckCircle2 className="size-4 text-emerald-100" />,
      progress: 'bg-white/40'
    },
    error: {
      bg: 'bg-rose-600 border-rose-500 text-white',
      icon: <AlertCircle className="size-4 text-rose-100" />,
      progress: 'bg-white/40'
    },
    security: {
    bg: 'bg-orange-700 border-orange-600 text-white shadow-[0_15px_30px_rgba(194,65,12,0.4)]',
    icon: <AlertCircle className="size-4 text-orange-200 animate-pulse" />,
    progress: 'bg-white/60'
    },

    info: {
      bg: 'bg-blue-600 border-blue-500 text-white',
      icon: <AlertCircle className="size-4 text-blue-100" />,
      progress: 'bg-white/40'
    }
  };

  const visualType = type === 'security' 
  ? 'security' 
  : (type === 'login' || type === 'success') 
    ? 'success' 
    : (type === 'logout' || type === 'error') 
      ? 'error' 
      : 'info';

const current = styles[visualType];

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      {/* Added shadow-xl and shadow-color for extra depth against white */}
      <div className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border shadow-[0_20px_40px_rgba(0,0,0,0.2)] ${current.bg}`}>
        
        <div className="shrink-0">
        {type === 'security' ? (
            <ShieldAlert className="size-4 text-orange-200 animate-pulse" />
        ) : type === 'logout' ? (
            <LogOut className="size-4 text-rose-100" />
        ) : (
            current.icon
        )}
        </div>

        <p className="text-sm font-bold tracking-tight">
          {message}
        </p>

        <button 
          onClick={() => setVisible(false)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors group"
        >
          <X className="size-4 text-white/70 group-hover:text-white" />
        </button>

        {/* The Timeout Bar */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/10">
          <div 
            className={`h-full transition-all linear ${current.progress}`}
            style={{ 
              width: visible ? '0%' : '100%', 
              transitionDuration: `${duration}ms` 
            }}
          />
        </div>
      </div>
    </div>
  );
}