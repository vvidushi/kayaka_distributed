import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../hooks/useToast';
import { ownerApi } from '../../services/api/owner';
import { FaBed, FaCar, FaUser, FaCalendar, FaDollarSign, FaCheck, FaTimes, FaClock } from 'react-icons/fa';

const OwnerBookingRequestsPage = () => {
  useDocumentTitle('Booking Requests - Owner Dashboard');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(null); // 'accept' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'cancelled'

  // Fetch booking requests
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-booking-requests'],
    queryFn: async () => {
      const response = await ownerApi.getBookingRequests();
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const allBookings = data?.items || [];
  
  // Filter bookings based on selected status
  const bookings = statusFilter === 'all' 
    ? allBookings 
    : allBookings.filter(b => b.status?.toUpperCase() === statusFilter.toUpperCase());

  // Accept booking mutation
  const acceptMutation = useMutation({
    mutationFn: (bookingId) => ownerApi.acceptBooking(bookingId),
    onSuccess: () => {
      toast.showSuccess('Booking accepted successfully!');
      queryClient.invalidateQueries(['owner-booking-requests']);
      queryClient.invalidateQueries(['owner-stats']);
      closeModal();
    },
    onError: (error) => {
      toast.showError(error.response?.data?.message || 'Failed to accept booking');
    },
  });

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, reason }) => ownerApi.rejectBooking(bookingId, reason),
    onSuccess: () => {
      toast.showSuccess('Booking rejected');
      queryClient.invalidateQueries(['owner-booking-requests']);
      closeModal();
    },
    onError: (error) => {
      toast.showError(error.response?.data?.message || 'Failed to reject booking');
    },
  });

  const openModal = (booking, actionType) => {
    setSelectedBooking(booking);
    setAction(actionType);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setAction(null);
    setRejectionReason('');
  };

  const handleConfirmAction = () => {
    if (!selectedBooking) return;

    if (action === 'accept') {
      acceptMutation.mutate(selectedBooking.id);
    } else if (action === 'reject') {
      rejectMutation.mutate({ bookingId: selectedBooking.id, reason: rejectionReason });
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'badge-success';
      case 'PENDING':
        return 'badge-warning';
      case 'CANCELLED':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const canCancelBooking = (booking) => {
    const status = booking.status?.toUpperCase();
    // Owner can cancel CONFIRMED bookings
    return status === 'CONFIRMED';
  };

  const getPropertyName = (booking) => {
    return booking.itinerary?.hotelName || booking.itinerary?.vendor || 'Property';
  };

  const getPropertyLocation = (booking) => {
    const city = booking.itinerary?.city || booking.itinerary?.location;
    const state = booking.itinerary?.state;
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    return '';
  };

  const pendingCount = allBookings.filter(b => b.status?.toUpperCase() === 'PENDING').length;
  const confirmedCount = allBookings.filter(b => b.status?.toUpperCase() === 'CONFIRMED').length;
  const cancelledCount = allBookings.filter(b => b.status?.toUpperCase() === 'CANCELLED').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Booking Requests</h1>
        <p className="text-base-content/70 mb-4">Manage booking requests for your properties</p>
        
        {/* Filter Tabs */}
        <div className="tabs tabs-boxed w-fit">
          <button 
            className={`tab ${statusFilter === 'all' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({allBookings.length})
          </button>
          <button 
            className={`tab ${statusFilter === 'pending' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <FaClock className="mr-2" />
            Pending ({pendingCount})
          </button>
          <button 
            className={`tab ${statusFilter === 'confirmed' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('confirmed')}
          >
            <FaCheck className="mr-2" />
            Confirmed ({confirmedCount})
          </button>
          <button 
            className={`tab ${statusFilter === 'cancelled' ? 'tab-active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            <FaTimes className="mr-2" />
            Cancelled ({cancelledCount})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body text-center">
            <p className="text-base-content/70">No booking requests yet</p>
            <p className="text-sm text-base-content/60 mt-2">
              Booking requests will appear here when travelers book your properties
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const Icon = booking.bookingType === 'hotel' ? FaBed : FaCar;
            const isPending = booking.status?.toUpperCase() === 'PENDING';
            const isConfirmed = booking.status?.toUpperCase() === 'CONFIRMED';
            
            return (
              <div key={booking.id} className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg transition-shadow">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left side - Booking details */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{getPropertyName(booking)}</h3>
                          <span className={`badge ${getStatusBadgeClass(booking.status)} font-semibold`}>
                            {booking.status?.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-base-content/70 text-sm mb-2">
                          {getPropertyLocation(booking)}
                        </p>

                        {/* Customer Info */}
                        <div className="flex items-center gap-2 text-sm text-base-content/70 mb-2">
                          <FaUser className="w-4 h-4" />
                          <span>{booking.userName}</span>
                        </div>

                        {/* Dates */}
                        {booking.itinerary && (
                          <div className="flex items-center gap-2 text-sm text-base-content/70">
                            <FaCalendar className="w-4 h-4" />
                            <span>
                              {booking.itinerary.checkIn || booking.itinerary.pickupDate} - {' '}
                              {booking.itinerary.checkOut || booking.itinerary.dropoffDate}
                            </span>
                            {booking.itinerary.nights && (
                              <span className="badge badge-sm badge-outline">
                                {booking.itinerary.nights} nights
                              </span>
                            )}
                            {booking.itinerary.guests && (
                              <span className="badge badge-sm badge-outline">
                                {booking.itinerary.guests} guests
                              </span>
                            )}
                          </div>
                        )}

                        {/* Additional Details */}
                        {booking.bookingType === 'hotel' && booking.itinerary?.rooms && (
                          <p className="text-sm text-base-content/60 mt-1">
                            {booking.itinerary.rooms} room{booking.itinerary.rooms !== 1 ? 's' : ''}
                          </p>
                        )}
                        
                        <p className="text-xs text-base-content/50 mt-2">
                          Requested: {new Date(booking.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Price and actions */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        <FaDollarSign className="text-primary" />
                        <span className="text-2xl font-bold text-primary">
                          {booking.price.currency} {booking.price.amount.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Action buttons for pending bookings */}
                      {isPending && (
                        <div className="flex gap-2 mt-4">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openModal(booking, 'accept')}
                            disabled={acceptMutation.isPending || rejectMutation.isPending}
                          >
                            <FaCheck className="w-3 h-3" />
                            Accept
                          </button>
                          <button
                            className="btn btn-error btn-sm btn-outline"
                            onClick={() => openModal(booking, 'reject')}
                            disabled={acceptMutation.isPending || rejectMutation.isPending}
                          >
                            <FaTimes className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Cancel button for confirmed bookings */}
                      {isConfirmed && (
                        <div className="flex gap-2 mt-4">
                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => openModal(booking, 'reject')}
                            disabled={acceptMutation.isPending || rejectMutation.isPending}
                          >
                            <FaTimes className="w-3 h-3" />
                            Cancel Booking
                          </button>
                        </div>
                      )}
                      
                      {/* Show status for cancelled bookings */}
                      {booking.status?.toUpperCase() === 'CANCELLED' && (
                        <div className="text-sm text-base-content/60 mt-2">
                          Cancelled: {new Date(booking.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && selectedBooking && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {action === 'accept' ? 'Accept Booking Request' : 'Reject Booking Request'}
            </h3>

            <div className="mb-4 p-4 bg-base-200 rounded-lg">
              <p className="font-semibold">{getPropertyName(selectedBooking)}</p>
              <p className="text-sm text-base-content/70">{getPropertyLocation(selectedBooking)}</p>
              <p className="text-sm text-base-content/70 mt-2">
                Customer: {selectedBooking.userName}
              </p>
              <p className="text-lg font-bold text-primary mt-2">
                {selectedBooking.price.currency} {selectedBooking.price.amount.toFixed(2)}
              </p>
            </div>

            {action === 'accept' ? (
              <div className="alert alert-success">
                <FaCheck className="w-5 h-5" />
                <span>This booking will be confirmed and the traveler will be notified.</span>
              </div>
            ) : (
              <>
                <div className="alert alert-warning mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>This booking will be cancelled. The traveler will be notified.</span>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Reason for rejection (optional):</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="e.g., Property not available for selected dates..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    maxLength={500}
                  />
                  <label className="label">
                    <span className="label-text-alt">{rejectionReason.length}/500</span>
                  </label>
                </div>
              </>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                Cancel
              </button>
              <button
                className={`btn ${action === 'accept' ? 'btn-success' : 'btn-error'}`}
                onClick={handleConfirmAction}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                {(acceptMutation.isPending || rejectMutation.isPending) ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    {action === 'accept' ? <FaCheck className="mr-2" /> : <FaTimes className="mr-2" />}
                    {action === 'accept' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookingRequestsPage;

