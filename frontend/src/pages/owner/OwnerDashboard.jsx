import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaHotel, FaCar, FaChartLine, FaDollarSign, FaUsers, FaChartBar } from 'react-icons/fa';

const OwnerDashboard = () => {
  useDocumentTitle('Owner Dashboard');
  const { user } = useAuth();

  // TODO: Replace with actual API calls when backend endpoints are ready
  const { data: stats, isLoading } = useQuery({
    queryKey: ['owner-stats'],
    queryFn: async () => {
      // Placeholder - replace with actual API call
      return {
        totalHotels: 0,
        totalCars: 0,
        totalBookings: 0,
        totalRevenue: 0,
        pendingApprovals: 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Owner Dashboard</h1>
        <p className="text-base-content/70">Welcome back, {user?.firstName || user?.email}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Total Hotels</p>
                <p className="text-3xl font-bold">{stats?.totalHotels || 0}</p>
              </div>
              <FaHotel className="text-4xl text-primary opacity-50" />
            </div>
            <Link to="/owner/hotels" className="btn btn-sm btn-ghost mt-4">
              Manage Hotels →
            </Link>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Total Cars</p>
                <p className="text-3xl font-bold">{stats?.totalCars || 0}</p>
              </div>
              <FaCar className="text-4xl text-primary opacity-50" />
            </div>
            <Link to="/owner/cars" className="btn btn-sm btn-ghost mt-4">
              Manage Cars →
            </Link>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Total Bookings</p>
                <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
              </div>
              <FaUsers className="text-4xl text-primary opacity-50" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Total Revenue</p>
                <p className="text-3xl font-bold">${stats?.totalRevenue?.toLocaleString() || '0'}</p>
              </div>
              <FaDollarSign className="text-4xl text-primary opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <FaHotel className="text-primary" />
              Hotels
            </h2>
            <p className="text-base-content/70 mb-4">
              Manage your hotel listings and add new properties.
            </p>
            <div className="card-actions">
              <Link to="/owner/hotels" className="btn btn-primary">
                View All Hotels
              </Link>
              <Link to="/owner/hotels/new" className="btn btn-outline">
                Add New Hotel
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <FaCar className="text-primary" />
              Cars
            </h2>
            <p className="text-base-content/70 mb-4">
              Manage your car rental listings and add new vehicles.
            </p>
            <div className="card-actions">
              <Link to="/owner/cars" className="btn btn-primary">
                View All Cars
              </Link>
              <Link to="/owner/cars/new" className="btn btn-outline">
                Add New Car
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <FaChartBar className="text-primary" />
              Analytics
            </h2>
            <p className="text-base-content/70 mb-4">
              View analytics, clicks, reviews, and user traces for your properties.
            </p>
            <div className="card-actions">
              <Link to="/analytics" className="btn btn-primary">
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {stats?.pendingApprovals > 0 && (
        <div className="card bg-warning shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-warning-content">
              <FaChartLine />
              Pending Approvals
            </h2>
            <p className="text-warning-content">
              You have {stats.pendingApprovals} listing{stats.pendingApprovals !== 1 ? 's' : ''} pending approval.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;

