import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireModerator = false,
  requireOwner = false 
}) => {
  const { isAuthenticated, isAdmin, isModerator, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" />;
  }

  if (requireModerator && !isModerator()) {
    return <Navigate to="/" />;
  }

  if (requireOwner && user?.profileType !== 'owner') {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
