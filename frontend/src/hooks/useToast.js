import { useToast as useToastContext } from '../contexts/ToastContext';

/**
 * Custom hook to use toast notifications
 * 
 * Usage:
 * 
 * const toast = useToast();
 * 
 * // Success message
 * toast.showSuccess('Booking created successfully!');
 * 
 * // Error message
 * toast.showError('Failed to process payment');
 * 
 * // Warning message
 * toast.showWarning('Session will expire in 5 minutes');
 * 
 * // Info message
 * toast.showInfo('New deals available!');
 * 
 * // Custom duration
 * toast.showSuccess('Saved!', 3000); // 3 seconds
 */
export const useToast = () => {
  return useToastContext();
};

export default useToast;

