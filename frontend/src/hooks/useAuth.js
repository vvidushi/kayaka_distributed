import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { setAuth, clearAuth, setLoading, setError, clearError } from '../store/slices/authSlice';
import { authApi } from '../services/api/auth';

const buildAuthErrorMessage = (err, fallbackMessage) => {
  const response = err?.response?.data;
  const statusText = err?.response?.statusText;
  const apiMessage = response?.message;
  const apiCode = response?.code;
  const detail = response?.details;
  const validationErrors = response?.errors;

  if (typeof validationErrors === 'object') {
    const extracted = Array.isArray(validationErrors)
      ? validationErrors
      : Object.values(validationErrors || {});
    if (extracted.length > 0) {
      return `${apiMessage || fallbackMessage}: ${extracted.join(', ')}`;
    }
  }

  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }

  if (apiMessage) {
    return apiCode ? `${apiMessage} (${apiCode})` : apiMessage;
  }

  if (statusText) {
    return `${fallbackMessage} (${statusText})`;
  }

  return err?.message || fallbackMessage;
};

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, loading, error } = useSelector(
    (state) => state.auth
  );

  const login = async (email, password) => {
    try {
      dispatch(setLoading(true));
      
      // Clear any old tokens before login to prevent stale token issues
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      const response = await authApi.login(email, password);
      if (response.code === 'SUCCESS') {
        dispatch(setAuth({
          user: response.data.user,
          token: response.data.token,
        }));
        dispatch(clearError());
        
        // Don't redirect here - let LoginPage handle redirect based on sessionStorage
        // This allows for redirecting back to booking flow after login
      }
    } catch (err) {
      const errorMessage = buildAuthErrorMessage(err, 'Login failed');
      dispatch(setError(errorMessage));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const register = async (userData) => {
    try {
      dispatch(setLoading(true));
      const response = await authApi.register(userData);
      if (response.code === 'SUCCESS') {
        dispatch(clearError());
        dispatch(clearAuth());
        toast.success('Registered successfully! Please log in.');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (err) {
      const errorMessage = buildAuthErrorMessage(err, 'Registration failed');
      dispatch(setError(errorMessage));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      dispatch(clearAuth());
      navigate('/login');
    }
  };

  const getMe = async () => {
    try {
      dispatch(setLoading(true));
      const response = await authApi.getMe();
      if (response.code === 'SUCCESS') {
        dispatch(setAuth({
          user: response.data,
          token: localStorage.getItem('authToken'),
        }));
      }
    } catch (err) {
      dispatch(clearAuth());
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isModerator = () => ['admin', 'moderator'].includes(user?.role);
  const isSuspended = () => user?.role === 'suspended';

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    getMe,
    isAdmin,
    isModerator,
    isSuspended,
  };
};
