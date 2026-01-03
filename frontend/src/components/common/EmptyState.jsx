import { FaInbox, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

const EmptyState = ({ 
  icon = 'inbox', 
  title = 'No data found', 
  message = 'There is nothing to display here.',
  action = null 
}) => {
  const iconMap = {
    inbox: FaInbox,
    search: FaSearch,
    warning: FaExclamationTriangle,
  };

  const IconComponent = iconMap[icon] || FaInbox;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <IconComponent className="text-6xl text-base-content opacity-20 mb-4" />
      <h3 className="text-xl font-semibold text-base-content mb-2">{title}</h3>
      <p className="text-base-content opacity-70 mb-4 max-w-md">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;

