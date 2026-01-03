import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const AuthInitializer = () => {
  const { getMe, isAuthenticated, user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only run once on mount
    if (initialized) return;
    
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token && !user) {
        try {
          await getMe();
        } catch (error) {
          console.error('Failed to restore session:', error);
          // Only clear token if it's actually invalid (401)
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
          }
        }
      }
      setInitialized(true);
    };

    initAuth();
  }, [initialized]);

  return null;
};

export default AuthInitializer;
