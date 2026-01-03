import { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/common/Toast';

/**
 * Toast Context
 * Provides toast notification functionality throughout the app
 */
const ToastContext = createContext();

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = toastId++;
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration (handled by Toast component)
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message, duration) => addToast(message, 'success', duration),
    [addToast]
  );

  const showError = useCallback(
    (message, duration) => addToast(message, 'error', duration),
    [addToast]
  );

  const showWarning = useCallback(
    (message, duration) => addToast(message, 'warning', duration),
    [addToast]
  );

  const showInfo = useCallback(
    (message, duration) => addToast(message, 'info', duration),
    [addToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    addToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Custom hook to use toast notifications
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastContext;

