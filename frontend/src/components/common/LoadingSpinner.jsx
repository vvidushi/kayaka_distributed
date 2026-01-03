const LoadingSpinner = ({ size = 'md', text = 'Loading...', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-75 z-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-2">
        <span className={`loading loading-spinner ${sizeClasses[size]} text-primary`}></span>
        {text && <p className="text-sm text-base-content opacity-70">{text}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;

