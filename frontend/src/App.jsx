import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import AuthInitializer from './components/common/AuthInitializer';
import ErrorBoundary from './components/common/ErrorBoundary';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UsersPage from './pages/users/UsersPage';
import UserDetailPage from './pages/users/UserDetailPage';
import FlightsPage from './pages/listings/FlightsPage';
import HotelsPage from './pages/listings/HotelsPage';
import HotelDetailPage from './pages/listings/HotelDetailPage';
import CarsPage from './pages/listings/CarsPage';
import CarDetailPage from './pages/listings/CarDetailPage';
import BookingsPage from './pages/bookings/BookingsPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';
// PaymentsPage removed - payment is now inline in BookingsPage
import AdminPage from './pages/admin/AdminPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AgentFlightsPage from './pages/listings/AgentFlightsPage';

// Owner Portal Pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerHotelsPage from './pages/owner/OwnerHotelsPage';
import OwnerCarsPage from './pages/owner/OwnerCarsPage';
import OwnerBookingRequestsPage from './pages/owner/OwnerBookingRequestsPage';
import AddHotelPage from './pages/owner/AddHotelPage';
import AddCarPage from './pages/owner/AddCarPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthInitializer />
      <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute requireAdmin>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:userId"
          element={
            <ProtectedRoute>
              <UserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/agent/flights" element={<AgentFlightsPage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/hotels/:hotelId" element={<HotelDetailPage />} />
        <Route path="/cars" element={<CarsPage />} />
        <Route path="/cars/:carId" element={<CarDetailPage />} />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:bookingId"
          element={
            <ProtectedRoute>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Payments route removed - payment is now inline in BookingsPage */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        
        {/* Owner Portal Routes */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute requireOwner>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/hotels"
          element={
            <ProtectedRoute requireOwner>
              <OwnerHotelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/hotels/new"
          element={
            <ProtectedRoute requireOwner>
              <AddHotelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/cars"
          element={
            <ProtectedRoute requireOwner>
              <OwnerCarsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/cars/new"
          element={
            <ProtectedRoute requireOwner>
              <AddCarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute requireOwner>
              <OwnerBookingRequestsPage />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
