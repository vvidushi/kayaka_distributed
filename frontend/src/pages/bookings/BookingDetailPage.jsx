import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsApi } from '../../services/api/bookings';
import { reviewsApi } from '../../services/api/reviews';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { FaPlane, FaBed, FaCar, FaArrowLeft, FaSpinner, FaCreditCard } from 'react-icons/fa';

const iconByType = {
  flight: FaPlane,
  hotel: FaBed,
  car: FaCar,
};

const BookingDetailPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [review, setReview] = useState({
    rating: 5,
    title: '',
    body: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await bookingsApi.getBooking(bookingId);
        setBooking(data);
      } catch (error) {
        console.error('Error loading booking', error);
        toast.showError(error.response?.data?.message || 'Unable to load booking');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId, toast]);

  const listingInfo = useMemo(() => {
    if (!booking?.itinerary) return { listingId: null, listingLabel: 'Listing' };
    if (booking.bookingType === 'hotel') {
      return {
        listingId: booking.itinerary.hotelId || booking.itinerary.hotelName,
        listingLabel: booking.itinerary.hotelName || 'Hotel',
      };
    }
    if (booking.bookingType === 'car') {
      return {
        listingId: booking.itinerary.carId || booking.itinerary.vendor,
        listingLabel: `${booking.itinerary.vendor || 'Car'} ${booking.itinerary.type || ''}`.trim(),
      };
    }
    return {
      listingId: booking.itinerary.outbound?.id || booking.itinerary.flightId || booking.itinerary?.id,
      listingLabel: `${booking.itinerary.outbound?.airline || 'Flight'} ${booking.itinerary.outbound?.from || ''}-${booking.itinerary.outbound?.to || ''}`.trim(),
    };
  }, [booking]);

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!listingInfo.listingId) {
      toast.showError('Cannot submit review: missing listing ID');
      return;
    }
    try {
      setReviewSubmitting(true);
      await reviewsApi.createReview({
        listingType: booking.bookingType,
        listingId: listingInfo.listingId,
        rating: review.rating,
        title: review.title,
        body: review.body,
      });
      toast.showSuccess('Review submitted');
      setReview({ rating: 5, title: '', body: '' });
    } catch (error) {
      console.error('Error creating review', error);
      toast.showError(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const Icon = iconByType[booking?.bookingType] || FaPlane;

  const handleContinueToPayment = () => {
    if (!booking) return;
    navigate('/payments', {
      state: {
        bookingId: booking.id,
        amount: booking.price?.amount || 0,
        currency: booking.price?.currency || 'USD',
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-base-content/70">Booking not found</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <FaArrowLeft className="mr-2" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold capitalize">{booking.bookingType} Booking</h1>
              <p className="text-sm text-base-content/70">Status: {booking.status}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="card-title mb-2">Booking Info</h3>
              <p className="text-sm text-base-content/70">Booking ID: {booking.id}</p>
              <p className="text-lg font-semibold mt-2">
                {booking.price?.currency || 'USD'} {booking.price?.amount?.toFixed(2)}
              </p>
            </div>
            <div className="text-sm space-y-1">
              {booking.itinerary?.outbound && (
                <p>
                  {booking.itinerary.outbound.from} → {booking.itinerary.outbound.to}{' '}
                  ({booking.itinerary.outbound.airline})
                </p>
              )}
              {booking.itinerary?.hotelName && (
                <p>
                  {booking.itinerary.hotelName} - {booking.itinerary.city}
                </p>
              )}
              {booking.itinerary?.car && booking.itinerary.car.vendor && (
                <p>
                  {booking.itinerary.car.vendor} - {booking.itinerary.car.type}
                </p>
              )}
              {booking.status === 'PENDING' && (
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary" onClick={handleContinueToPayment}>
                    Continue to Payment <FaCreditCard className="ml-2" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {booking.status === 'COMPLETED' && (
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body space-y-3">
              <h3 className="card-title">Leave a review</h3>
              <form className="space-y-3" onSubmit={handleCreateReview}>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Rating (1-5)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="input input-bordered w-24"
                    value={review.rating}
                    onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Title</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={review.title}
                    onChange={(e) => setReview({ ...review, title: e.target.value })}
                    placeholder="Great stay!"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Review</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    rows="3"
                    value={review.body}
                    onChange={(e) => setReview({ ...review, body: e.target.value })}
                    placeholder="What did you like or dislike?"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailPage;
