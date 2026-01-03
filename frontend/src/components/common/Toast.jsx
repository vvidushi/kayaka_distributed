import { useEffect, useState } from 'react';
import { IoClose, IoCheckmarkCircle, IoCloseCircle, IoAlertCircle, IoInformationCircle } from 'react-icons/io5';

/**
 * Stylish Toast Notification Component
 * Beautiful, minimal, and cute design with smooth animations
 */
const Toast = ({ id, type = 'info', message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) {
      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 50));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 50);

      // Auto-close timer
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [id, duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-emerald-50 to-teal-50',
          iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
          icon: <IoCheckmarkCircle className="w-5 h-5 text-white" />,
          text: 'text-emerald-900',
          progressBar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
          shadow: 'shadow-emerald-100',
        };
      case 'error':
        return {
          gradient: 'from-rose-50 to-pink-50',
          iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500',
          icon: <IoCloseCircle className="w-5 h-5 text-white" />,
          text: 'text-rose-900',
          progressBar: 'bg-gradient-to-r from-rose-400 to-pink-500',
          shadow: 'shadow-rose-100',
        };
      case 'warning':
        return {
          gradient: 'from-amber-50 to-orange-50',
          iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
          icon: <IoAlertCircle className="w-5 h-5 text-white" />,
          text: 'text-amber-900',
          progressBar: 'bg-gradient-to-r from-amber-400 to-orange-500',
          shadow: 'shadow-amber-100',
        };
      case 'info':
      default:
        return {
          gradient: 'from-sky-50 to-blue-50',
          iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500',
          icon: <IoInformationCircle className="w-5 h-5 text-white" />,
          text: 'text-sky-900',
          progressBar: 'bg-gradient-to-r from-sky-400 to-blue-500',
          shadow: 'shadow-sky-100',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 
        rounded-2xl bg-gradient-to-br ${styles.gradient}
        backdrop-blur-sm
        shadow-xl ${styles.shadow}
        border border-white/60
        transition-all duration-300 ease-out
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
      role="alert"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 ${styles.progressBar} transition-all duration-50 ease-linear rounded-full`}
        style={{ width: `${progress}%` }}
      />

      {/* Icon with gradient background */}
      <div className={`relative flex-shrink-0 ${styles.iconBg} rounded-xl p-2 shadow-lg`}>
        {styles.icon}
      </div>

      {/* Message */}
      <div className={`relative flex-1 ${styles.text} pt-0.5`}>
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(id), 300);
        }}
        className={`
          relative flex-shrink-0 ${styles.text} 
          hover:bg-white/50 active:bg-white/70
          rounded-lg p-1.5 
          transition-all duration-200
          hover:scale-110 active:scale-95
        `}
        aria-label="Close notification"
      >
        <IoClose className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container
 * Manages multiple toast notifications with stacking animation
 */
export const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[9999] w-full max-w-md pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="space-y-3 pointer-events-auto">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              transform: `translateY(${index * 4}px) scale(${1 - index * 0.02})`,
              opacity: 1 - index * 0.1,
              zIndex: toasts.length - index,
            }}
            className="transition-all duration-300"
          >
            <Toast
              id={toast.id}
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onClose={onClose}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Toast;

