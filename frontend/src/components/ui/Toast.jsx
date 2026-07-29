import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const COLOR_MAP = {
  success: { bg: 'bg-accent-green/10', border: 'border-accent-green/20', text: 'text-accent-green' },
  error: { bg: 'bg-accent-red/10', border: 'border-accent-red/20', text: 'text-accent-red' },
  warning: { bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20', text: 'text-accent-yellow' },
};

function ToastItem({ id, message, type = 'error', onDismiss }) {
  const Icon = ICON_MAP[type] || AlertCircle;
  const colors = COLOR_MAP[type] || COLOR_MAP.error;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl ${colors.bg} border ${colors.border} shadow-lg shadow-black/20 max-w-sm`}
    >
      <Icon size={16} className={`${colors.text} mt-0.5 flex-shrink-0`} />
      <span className="text-sm text-text-primary flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="text-text-dim hover:text-text-primary transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={dismissToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  return { addToast, ToastContainer };
}
