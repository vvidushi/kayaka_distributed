import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../hooks/useToast';
import { ownerApi } from '../../services/api/owner';
import { bookingsApi } from '../../services/api/bookings';
import { FaPlane, FaBed, FaCar, FaUser, FaTimes, FaCheckCircle, FaClock } from 'react-icons/fa';

const OwnerBookingsPage = () => {
  useDocumentTitle('My Bookings');
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  // Fetch all bookings to get counts
  const { data: allBookingsData } = useQuery({
    queryKey: ['owner-bookings-all'],
    queryFn: async () => {
      return await ownerApi.getBookings({});
    },
  });

  const allBookings = allBookingsData?.items || [];

  // Get counts for each status
  const statusCounts = {
    all: allBookings.length,
    pending: allBookings.filter(b => b.status?.toUpperCase() === 'PENDING').length,
    confirmed: allBookings.filter(b => b.status?.toUpperCase() === 'CONFIRMED').length,
    cancelled: allBookings.filter(b => b.status?.toUpperCase() === 'CANCELLED').length,
    completed: allBookings.filter(b => b.status?.toUpperCase() === 'COMPLETED').length,
  };

  // Fetch filtered bookings
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['owner-bookings', statusFilter, typeFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.bookingType = typeFilter;
      return await ownerApi.getBookings(params);
    },
  });

  const bookings = data?.items || [];

  const handleOpenCancelModal = (booking) => {
    setSelectedBookingForCancel(booking);
    setCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setCancelModalOpen(false);
    setSelectedBookingForCancel(null);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;

    try {
      setCancellingBooking(true);
      await bookingsApi.cancelBooking(selectedBookingForCancel.id);
      toast.showSuccess('Booking cancelled successfully');
      handleCloseCancelModal();
      refetch();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.showError(error.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBooking(false);
    }
  };

  const canCancelBooking = (booking) => {
    const status = booking.status?.toLowerCase();
    return status === 'pending' || status === 'confirmed';
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-error';
      case 'completed':
        return 'badge-info';
      default:
        return 'badge-ghost';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Error loading bookings: {error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
        <p className="text-base-content/70 mb-4">View and manage bookings for your properties and cars</p>
        
        {/* Status Tabs */}
        <div className="tabs tabs-boxed w-fit">
          <button 
            className={`tab ${statusFilter === 'all' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({statusCounts.all})
          </button>
          <button 
            className={`tab ${statusFilter === 'pending' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <FaClock className="mr-2" />
            Pending ({statusCounts.pending})
          </button>
          <button 
            className={`tab ${statusFilter === 'confirmed' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('confirmed')}
          >
            <FaCheckCircle className="mr-2" />
            Confirmed ({statusCounts.confirmed})
          </button>
          <button 
            className={`tab ${statusFilter === 'cancelled' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            <FaTimes className="mr-2" />
            Cancelled ({statusCounts.cancelled})
          </button>
          <button 
            className={`tab ${statusFilter === 'completed' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            <FaCheckCircle className="mr-2" />
            Completed ({statusCounts.completed})
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-6">
        <div className="form-control w-fit">
          <label className="label">
            <span className="label-text">Filter by Type</span>
          </label>
          <select
            className="select select-bordered"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="hotel">Hotels</option>
            <option value="car">Cars</option>
            <option value="flight">Flights</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-base-content/70">No bookings found.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const Icon = booking.bookingType === 'flight' ? FaPlane : 
                        booking.bookingType === 'hotel' ? FaBed : FaCar;
            return (
              <div key={booking.id} className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Icon className="w-8 h-8 text-primary mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold capitalize">{booking.bookingType} Booking</h3>
                        <p className="text-sm text-base-content/70 flex gap-2 items-center">
                          <span>Status: <span className={`badge badge-sm ${getStatusBadgeClass(booking.status)}`}>{booking.status}</span></span>
                        </p>
                        {booking.user && (
                          <p className="text-sm text-base-content/70 mt-1">
                            <FaUser className="inline mr-1" />
                            {booking.user.firstName} {booking.user.lastName} ({booking.user.email})
                          </p>
                        )}
                        {booking.itinerary && (
                          <div className="mt-2 space-y-1 text-sm">
                            {booking.bookingType === 'flight' && booking.itinerary.outbound && (
                              <p>{booking.itinerary.outbound.from} → {booking.itinerary.outbound.to}</p>
                            )}
                            {booking.bookingType === 'hotel' && booking.itinerary.hotelName && (
                              <p>{booking.itinerary.hotelName} - {booking.itinerary.city}</p>
                            )}
                            {booking.bookingType === 'car' && booking.itinerary.vendor && (
                              <p>{booking.itinerary.vendor} - {booking.itinerary.type}</p>
                            )}
                            {booking.itinerary.checkIn && (
                              <p>Check-in: {booking.itinerary.checkIn}</p>
                            )}
                            {booking.itinerary.checkOut && (
                              <p>Check-out: {booking.itinerary.checkOut}</p>
                            )}
                            {booking.itinerary.pickupDate && (
                              <p>Pickup: {booking.itinerary.pickupDate}</p>
                            )}
                            {booking.itinerary.dropoffDate && (
                              <p>Drop-off: {booking.itinerary.dropoffDate}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {booking.createdAt && (
                        <p className="text-xs text-base-content/70">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-primary">
                        {booking.price?.currency || 'USD'} {booking.price?.amount?.toFixed(2) || '0.00'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {canCancelBooking(booking) && (
                          <button
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleOpenCancelModal(booking)}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancelModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Cancel Booking</h3>
            
            {selectedBookingForCancel && (
              <div className="mb-4">
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Are you sure you want to cancel this booking?</span>
                </div>

                <div className="mt-4 p-4 bg-base-200 rounded-lg">
                  <p className="font-semibold capitalize">
                    {selectedBookingForCancel.bookingType} Booking
                  </p>
                  {selectedBookingForCancel.itinerary?.hotelName && (
                    <p className="text-sm text-base-content/70">{selectedBookingForCancel.itinerary.hotelName}</p>
                  )}
                  {selectedBookingForCancel.itinerary?.vendor && (
                    <p className="text-sm text-base-content/70">{selectedBookingForCancel.itinerary.vendor}</p>
                  )}
                  {selectedBookingForCancel.itinerary?.outbound && (
                    <p className="text-sm text-base-content/70">
                      {selectedBookingForCancel.itinerary.outbound.from} → {selectedBookingForCancel.itinerary.outbound.to}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary mt-2">
                    {selectedBookingForCancel.price?.currency || 'USD'} {selectedBookingForCancel.price?.amount?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="mt-4 text-sm text-base-content/70">
                  <p>⚠️ This action cannot be undone.</p>
                  <p>• The booking will be cancelled immediately</p>
                  <p>• Refund will be processed according to the cancellation policy</p>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={handleCloseCancelModal}
                disabled={cancellingBooking}
              >
                Keep Booking
              </button>
              <button
                className="btn btn-error"
                onClick={handleCancelBooking}
                disabled={cancellingBooking}
              >
                {cancellingBooking ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookingsPage;

