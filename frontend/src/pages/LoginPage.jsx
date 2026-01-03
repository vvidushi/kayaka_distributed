import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getHomePageFlightImages } from '../services/backgroundImages.service.js';

const LoginPage = () => {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  
  const flightImages = getHomePageFlightImages();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, isAuthenticated, user } = useAuth();

  // Redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      const returnPath = sessionStorage.getItem('returnPath');
      const pendingBooking = sessionStorage.getItem('pendingBooking');
      
      // Clear sessionStorage
      sessionStorage.removeItem('returnPath');
      sessionStorage.removeItem('pendingBooking');
      
      // Check if user is owner - redirect to owner page (but only if no return path)
      if (user?.profileType === 'owner' && !returnPath) {
        navigate('/owner');
        return;
      }
      
      // Navigate to return path or bookings with pending booking data
      if (pendingBooking && returnPath === '/bookings') {
        try {
          const bookingData = JSON.parse(pendingBooking);
          navigate(returnPath, { state: { bookingData } });
        } catch (err) {
          console.error('Failed to parse pending booking:', err);
          navigate(returnPath || '/');
        }
      } else if (returnPath) {
        navigate(returnPath);
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-100 relative overflow-hidden">
      {/* Background images for all screen sizes */}
      <div className="absolute inset-0 z-0">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 h-full p-2 lg:p-4 opacity-20 lg:opacity-100">
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight1}
              alt="Travel 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight2}
              alt="Travel 2"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:block h-full rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight3}
              alt="Travel 3"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      <div className="hero-content flex-col lg:flex-row-reverse w-full max-w-7xl relative z-10">
        {/* Right side - Image Grid (visible on large screens) */}
        <div className="hidden lg:flex lg:w-1/2 gap-3">
          {/* Column 1 */}
          <div className="flex-1 grid grid-cols-1 gap-3">
            <div className="h-48 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight1}
                alt="Travel 1"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-56 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight2}
                alt="Travel 2"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-40 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight3}
                alt="Travel 3"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {/* Column 2 */}
          <div className="flex-1 grid grid-cols-1 gap-3">
            <div className="h-56 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight4}
                alt="Travel 4"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-40 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight5}
                alt="Travel 5"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-48 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={flightImages.flight6}
                alt="Travel 6"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Left side - Login Form */}
        <div className="lg:w-1/2">
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-5xl font-bold">Login now!</h1>
            <p className="py-6">
              Access your bookings, manage your profile, and more.
            </p>
          </div>
          <div className="card bg-base-100 w-full max-w-sm mx-auto shadow-2xl border border-base-300">
          <form className="card-body" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="password"
                  className="input input-bordered w-full pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                  disabled={loading}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <label className="label">
                <Link to="/forgot-password" className="label-text-alt link link-hover">
                  Forgot password?
                </Link>
              </label>
            </div>
            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
            <div className="text-center mt-4">
              <span className="text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="link link-primary">
                  Register
                </Link>
              </span>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
