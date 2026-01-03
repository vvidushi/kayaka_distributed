import { FaExclamationCircle, FaTimes } from 'react-icons/fa';

const ErrorMessage = ({ 
  message, 
  onDismiss = null, 
  variant = 'error',
  className = '' 
}) => {
  const variantClasses = {
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  };

  if (!message) return null;

  return (
    <div className={`alert ${variantClasses[variant]} ${className}`}>
      <FaExclamationCircle />
      <span>{message}</span>
      {onDismiss && (
        <button className="btn btn-sm btn-ghost" onClick={onDismiss}>
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;

