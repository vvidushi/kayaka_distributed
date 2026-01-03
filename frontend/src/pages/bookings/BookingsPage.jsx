import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsApi } from '../../services/api/bookings';
import { usersApi } from '../../services/api/users';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaPlane, FaBed, FaCar, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaArrowRight, FaStar } from 'react-icons/fa';
import { US_STATES, getStateCode } from '../../constants/usStates';
import { formatPhoneForDisplay, formatUsPhoneInput, getE164UsPhone, isValidUsPhone } from '../../utils/phone';
import apiClient from '../../config/api';

const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';

const resolveHotelImageUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('http')) return rawUrl;
  let path = rawUrl;
  if (!path.startsWith('kayak/')) {
    path = `kayak/hotels/${path}`;
  }
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
};

const resolveCarImageUrl = (rawUrl) => {
  if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined') return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  
  let path = rawUrl;
  // Handle different path formats
  if (path.startsWith('kayak/product/cars/')) {
    // Already in correct format
  } else if (path.startsWith('kayak/cars/')) {
    // Convert old format to new format
    path = path.replace('kayak/cars/', 'kayak/product/cars/');
  } else if (!path.startsWith('kayak/')) {
    // Add kayak/product/cars/ prefix if not present
    path = `kayak/product/cars/${path}`;
  }
  
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
};

// Helper to get car image from multiple possible fields
const getCarImage = (car) => {
  return car?.imageStoragePath || 
         car?.imageUrl || 
         car?.images?.[0] || 
         car?.image ||
         car?.photo ||
         car?.photoUrl ||
         null;
};

const US_CITIES = [
  'New York City', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
  'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'San Francisco', 'Columbus',
  'Fort Worth', 'Indianapolis', 'Charlotte', 'Seattle', 'Denver', 'Washington, D.C.', 'Boston',
  'El Paso', 'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee',
];

const BookingsPage = () => {
  useDocumentTitle('Checkout & Booking');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1: Review, 2: Billing, 3: Payment
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: formatPhoneForDisplay(user?.phoneNumber || ''),
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
    },
  });
  const [errors, setErrors] = useState({});

  // Load booking data from navigation state or sessionStorage
  useEffect(() => {
    if (location.state?.bookingData) {
      setBookingData(location.state.bookingData);
      setStep(1);
      // Clear sessionStorage if we got data from state
      sessionStorage.removeItem('pendingBooking');
    } else {
      // Check sessionStorage for pending booking (from login redirect)
      const pendingBooking = sessionStorage.getItem('pendingBooking');
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);
          setBookingData(bookingData);
          setStep(1);
          sessionStorage.removeItem('pendingBooking');
        } catch (err) {
          console.error('Failed to parse pending booking:', err);
          loadBookings();
        }
      } else {
        // If no booking data, show existing bookings
        loadBookings();
      }
    }
  }, [location.state, user]);

    useEffect(() => {
      if (user?.phoneNumber) {
        setBillingInfo((prev) => ({
          ...prev,
          phone: formatPhoneForDisplay(user.phoneNumber),
        }));
      }
    }, [user?.phoneNumber]);

  const loadBookings = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await usersApi.getUserBookings(user.id);
      if (response.items) {
        setExistingBookings(response.items);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.showError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
    setReviewData({ rating: 5, comment: '' });
    setReviewModalOpen(true);
  };

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
      // Reload bookings
      await loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.showError(error.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBooking(false);
    }
  };

  const canCancelBooking = (booking) => {
    const status = booking.status?.toLowerCase();
    // Can cancel if status is pending or confirmed (not cancelled or completed)
    return status === 'pending' || status === 'confirmed';
  };

  const handleSubmitReview = async () => {
    if (!selectedBookingForReview) return;
    
    if (!reviewData.comment.trim()) {
      toast.showError('Please write a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      
      // Determine listing ID and type from booking
      let listingId, listingType;
      if (selectedBookingForReview.bookingType === 'hotel') {
        listingId = selectedBookingForReview.itinerary?.hotelId;
        listingType = 'hotel';
      } else if (selectedBookingForReview.bookingType === 'car') {
        listingId = selectedBookingForReview.itinerary?.carId;
        listingType = 'car';
      } else if (selectedBookingForReview.bookingType === 'flight') {
        listingId = selectedBookingForReview.itinerary?.flightId;
        listingType = 'flight';
      }

      if (!listingId) {
        toast.showError('Cannot submit review: listing information missing');
        return;
      }

      await apiClient.post('/reviews', {
        listingId,
        listingType,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });

      toast.showSuccess('Review submitted successfully!');
      setReviewModalOpen(false);
      setSelectedBookingForReview(null);
      setReviewData({ rating: 5, comment: '' });
      
      // Reload bookings to update review status
      await loadBookings();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.showError(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const validateBillingInfo = () => {
    const newErrors = {};
    
    if (!billingInfo.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!billingInfo.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!billingInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingInfo.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!billingInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!isValidUsPhone(billingInfo.phone)) {
      newErrors.phone = 'Enter a valid US phone number (+1 XXX XXX XXXX)';
    }
    if (!billingInfo.address.line1.trim()) {
      newErrors['address.line1'] = 'Address line 1 is required';
    }
    if (!billingInfo.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!billingInfo.address.state.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (!billingInfo.address.zipCode.trim()) {
      newErrors['address.zipCode'] = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBillingChange = (field, value) => {
    let nextValue = value;
    if (field === 'phone') {
      nextValue = value ? formatUsPhoneInput(value) : '';
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: nextValue,
        },
      }));
    } else {
      setBillingInfo(prev => ({
        ...prev,
        [field]: nextValue,
      }));
    }
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCreateBooking = async () => {
    if (!validateBillingInfo()) {
      toast.showError('Please fill in all required billing information');
      return;
    }

    if (!bookingData) {
      toast.showError('No booking data available');
      return;
    }

    try {
      setLoading(true);

      // Prepare booking data based on type
      let bookingPayload = {};
      let totalPrice = 0;
      const normalizedPhone = getE164UsPhone(billingInfo.phone);
      const billingInfoForPayload = {
        ...billingInfo,
        phone: normalizedPhone || billingInfo.phone,
      };

      if (bookingData.type === 'round-trip' || bookingData.type === 'one-way') {
        // Flight booking
        const outbound = bookingData.outbound;
        const returnFlight = bookingData.return;
        const travelers = bookingData.searchParams?.travelers || 1;
        
        // Calculate total with taxes (10% tax)
        // Price per person * number of travelers
        let subtotal = outbound.price * travelers;
        if (returnFlight) {
          subtotal += returnFlight.price * travelers;
        }
        totalPrice = subtotal * 1.1; // Add 10% tax

        bookingPayload = {
          bookingType: 'flight',
          listingId: outbound.id || outbound._id,
          priceAmount: totalPrice,
          priceCurrency: outbound.currency || 'USD',
          itinerary: {
            type: bookingData.type,
            outbound: {
              id: outbound.id || outbound._id,
              from: outbound.from,
              to: outbound.to,
              departDate: outbound.departDate,
              departureTime: outbound.departureTime,
              arrivalTime: outbound.arrivalTime,
              airline: outbound.airline,
              durationMinutes: outbound.durationMinutes,
              nonstop: outbound.nonstop,
            },
            return: returnFlight ? {
              id: returnFlight.id || returnFlight._id,
              from: returnFlight.from,
              to: returnFlight.to,
              departDate: returnFlight.departDate,
              departureTime: returnFlight.departureTime,
              arrivalTime: returnFlight.arrivalTime,
              airline: returnFlight.airline,
              durationMinutes: returnFlight.durationMinutes,
              nonstop: returnFlight.nonstop,
            } : null,
            travelers: bookingData.searchParams?.travelers || 1,
          },
          metadata: {
            searchParams: bookingData.searchParams,
            billingInfo,
          },
        };
      } else if (bookingData.type === 'hotel') {
        // Hotel booking
        const hotel = bookingData.hotel;
        const nights = bookingData.nights || 1;
        const guests = bookingData.guests || 1;
        const maxOccupancy = hotel.maxOccupancy || hotel.capacity || 2; // Default 2 per room
        
        // Calculate number of rooms needed
        const roomsNeeded = Math.ceil(guests / maxOccupancy);
        
        // Calculate total with taxes (10% tax)
        // Price per night * nights * number of rooms needed
        const subtotal = hotel.pricePerNight * nights * roomsNeeded;
        totalPrice = subtotal * 1.1; // Add 10% tax

        bookingPayload = {
          bookingType: 'hotel',
          listingId: hotel.id || hotel._id,
          priceAmount: totalPrice,
          priceCurrency: hotel.currency || 'USD',
          itinerary: {
            hotelId: hotel.id || hotel._id,
            hotelName: hotel.name,
            city: hotel.city,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            guests,
            nights,
            roomsNeeded,
            maxOccupancy,
          },
          metadata: {
            hotel: {
              rating: hotel.rating,
              amenities: hotel.amenities,
              lat: hotel.lat,
              lng: hotel.lng,
            },
            billingInfo: billingInfoForPayload,
          },
        };
      } else if (bookingData.type === 'car') {
        // Car booking
        const car = bookingData.car;
        const days = bookingData.days || 1;
        const passengers = bookingData.passengers || 1;
        const carCapacity = car.seats || car.capacity || 4; // Default 4 passengers
        
        // Calculate number of cars needed
        const carsNeeded = Math.ceil(passengers / carCapacity);
        
        // Calculate total with taxes (10% tax)
        // Price per day * days * number of cars needed
        const subtotal = car.pricePerDay * days * carsNeeded;
        totalPrice = subtotal * 1.1; // Add 10% tax

        bookingPayload = {
          bookingType: 'car',
          listingId: car.id || car._id,
          priceAmount: totalPrice,
          priceCurrency: car.currency || 'USD',
          itinerary: {
            carId: car.id || car._id,
            vendor: car.vendor,
            type: car.type,
            location: car.city || car.location,
            pickupDate: bookingData.pickupDate,
            pickupTime: bookingData.pickupTime,
            dropoffDate: bookingData.dropoffDate,
            dropoffTime: bookingData.dropoffTime,
            days,
            passengers,
            carsNeeded,
            carCapacity,
          },
          metadata: {
            car: {
              seats: car.seats,
            },
            billingInfo: billingInfoForPayload,
          },
        };
      }

      // Create booking
      const booking = await bookingsApi.createBooking(bookingPayload);
      toast.showSuccess('Booking created successfully!');

      // Navigate to payment page with booking ID
      navigate('/payments', {
        state: {
          bookingId: booking.id,
          amount: booking.price.amount,
          currency: booking.price.currency,
          bookingType: booking.bookingType,
        },
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.showError(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const getBookingSummary = () => {
    if (!bookingData) return null;

    if (bookingData.type === 'round-trip' || bookingData.type === 'one-way') {
      const outbound = bookingData.outbound;
      const returnFlight = bookingData.return;
      const travelers = bookingData.searchParams?.travelers || 1;
      const pricePerPerson = outbound.price + (returnFlight ? returnFlight.price : 0);
      const subtotal = pricePerPerson * travelers;

      return {
        type: 'Flight',
        icon: FaPlane,
        title: `${outbound.from} → ${outbound.to}${returnFlight ? ` → ${returnFlight.from}` : ''}`,
        details: [
          { label: 'Outbound', value: `${outbound.airline} • ${outbound.departDate} ${outbound.departureTime}` },
          returnFlight && { label: 'Return', value: `${returnFlight.airline} • ${returnFlight.departDate} ${returnFlight.departureTime}` },
          { label: 'Travelers', value: travelers },
        ].filter(Boolean),
        price: subtotal,
        currency: outbound.currency || 'USD',
        priceBreakdown: {
          basePrice: pricePerPerson,
          multiplier: travelers,
          multiplierLabel: travelers === 1 ? '1 traveler' : `${travelers} travelers`,
          perUnitLabel: 'per person',
        },
      };
    } else if (bookingData.type === 'hotel') {
      const hotel = bookingData.hotel;
      const nights = bookingData.nights || 1;
      const guests = bookingData.guests || 1;
      const maxOccupancy = hotel.maxOccupancy || hotel.capacity || 2;
      const roomsNeeded = Math.ceil(guests / maxOccupancy);
      const subtotal = hotel.pricePerNight * nights * roomsNeeded;
      const totalPrice = subtotal * 1.1; // Add 10% tax

      return {
        type: 'Hotel',
        icon: FaBed,
        title: hotel.name,
        details: [
          { label: 'Location', value: `${hotel.city}, ${hotel.state || ''}` },
          { label: 'Check-in', value: bookingData.checkIn },
          { label: 'Check-out', value: bookingData.checkOut },
          { label: 'Nights', value: nights },
          { label: 'Guests', value: guests },
          roomsNeeded > 1 && { label: 'Rooms Needed', value: `${roomsNeeded} (max ${maxOccupancy} per room)` },
        ].filter(Boolean),
        price: subtotal,
        currency: hotel.currency || 'USD',
        priceBreakdown: {
          basePrice: hotel.pricePerNight,
          multiplier: nights * roomsNeeded,
          multiplierLabel: roomsNeeded === 1 
            ? `${nights} night${nights > 1 ? 's' : ''}` 
            : `${nights} night${nights > 1 ? 's' : ''} × ${roomsNeeded} room${roomsNeeded > 1 ? 's' : ''}`,
          perUnitLabel: 'per night per room',
        },
      };
    } else if (bookingData.type === 'car') {
      const car = bookingData.car;
      const days = bookingData.days || 1;
      const passengers = bookingData.passengers || 1;
      const carCapacity = car.seats || car.capacity || 4;
      const carsNeeded = Math.ceil(passengers / carCapacity);
      const subtotal = car.pricePerDay * days * carsNeeded;

      return {
        type: 'Car Rental',
        icon: FaCar,
        title: `${car.vendor} - ${car.type}`,
        details: [
          { label: 'Location', value: car.city || car.location },
          { label: 'Pick-up', value: `${bookingData.pickupDate} ${bookingData.pickupTime || ''}` },
          { label: 'Drop-off', value: `${bookingData.dropoffDate} ${bookingData.dropoffTime || ''}` },
          { label: 'Days', value: days },
          { label: 'Passengers', value: passengers },
          carsNeeded > 1 && { label: 'Cars Needed', value: `${carsNeeded} (${carCapacity} seats each)` },
        ].filter(Boolean),
        price: subtotal,
        currency: car.currency || 'USD',
        priceBreakdown: {
          basePrice: car.pricePerDay,
          multiplier: days * carsNeeded,
          multiplierLabel: carsNeeded === 1 
            ? `${days} day${days > 1 ? 's' : ''}` 
            : `${days} day${days > 1 ? 's' : ''} × ${carsNeeded} car${carsNeeded > 1 ? 's' : ''}`,
          perUnitLabel: 'per day per car',
        },
      };
    }

    return null;
  };

  const summary = getBookingSummary();

  // If no booking data, show existing bookings view
  if (!bookingData && !loading) {
    return (
      <div className="min-h-screen bg-base-100">
        <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-base-content">My Bookings</h1>
            <p className="text-base-content/70">View and manage your travel bookings</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {existingBookings.length === 0 ? (
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <p className="text-base-content/70">No bookings found. Select a flight, hotel, or car to begin.</p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => navigate('/')}
                >
                  Start New Search
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {existingBookings.map((booking) => {
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
                              <span>Status: <span className="badge badge-sm">{booking.status}</span></span>
                              {booking.timeline && (
                                <span className="badge badge-outline badge-sm">
                                  {booking.timeline.toUpperCase()}
                                </span>
                              )}
                            </p>
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
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {booking.startDate && booking.endDate && (
                            <p className="text-xs text-base-content/70">
                              {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-2xl font-bold text-primary">
                            {booking.price?.currency || 'USD'} {booking.price?.amount?.toFixed(2) || '0.00'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => navigate(`/bookings/${booking.id}`)}
                            >
                              View Details
                            </button>
                            {canCancelBooking(booking) && (
                              <button
                                className="btn btn-sm btn-error btn-outline"
                                onClick={() => handleOpenCancelModal(booking)}
                              >
                                Cancel Booking
                              </button>
                            )}
                            {booking.status === 'confirmed' && booking.timeline === 'past' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleOpenReviewModal(booking)}
                              >
                                <FaStar className="w-3 h-3" />
                                Write Review
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
        </div>

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
                    <p>• Your booking will be cancelled immediately</p>
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

        {/* Review Modal */}
        {reviewModalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Write a Review</h3>
              
              {selectedBookingForReview && (
                <div className="mb-4 p-4 bg-base-200 rounded-lg">
                  <p className="font-semibold">
                    {selectedBookingForReview.itinerary?.hotelName || 
                     selectedBookingForReview.itinerary?.vendor ||
                     'Your Booking'}
                  </p>
                  {selectedBookingForReview.itinerary?.city && (
                    <p className="text-sm text-base-content/70">{selectedBookingForReview.itinerary.city}</p>
                  )}
                </div>
              )}

              {/* Star Rating */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Rating</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className={`text-3xl ${star <= reviewData.rating ? 'text-warning' : 'text-base-300'}`}
                    >
                      <FaStar />
                    </button>
                  ))}
                  <span className="ml-2 self-center">{reviewData.rating} / 5</span>
                </div>
              </div>

              {/* Review Comment */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Your Review</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="Share your experience..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  maxLength={1000}
                />
                <label className="label">
                  <span className="label-text-alt">{reviewData.comment.length} / 1000 characters</span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setReviewModalOpen(false);
                    setSelectedBookingForReview(null);
                    setReviewData({ rating: 5, comment: '' });
                  }}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewData.comment.trim()}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-base-content/70">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const Icon = summary.icon;

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-base-content">Complete Your Booking</h1>
          </div>
          <div className="flex gap-2">
            <div className={`badge ${step >= 1 ? 'badge-primary' : 'badge-ghost'}`}>1. Review</div>
            <div className={`badge ${step >= 2 ? 'badge-primary' : 'badge-ghost'}`}>2. Billing</div>
            <div className={`badge ${step >= 3 ? 'badge-primary' : 'badge-ghost'}`}>3. Payment</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Review Booking */}
            {step === 1 && (
              <div className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Review Your Booking</h2>
                  
                  <div className="divider"></div>

                  <div className="space-y-4">
                    {/* Hotel or Car Image */}
                    {bookingData?.type === 'hotel' && bookingData?.hotel && (
                      <div className="w-full h-64 bg-base-200 rounded-lg overflow-hidden mb-4">
                        {(() => {
                          const hotel = bookingData.hotel;
                          const imageUrl = hotel.imageStoragePath 
                            ? resolveHotelImageUrl(hotel.imageStoragePath)
                            : hotel.imageUrl || hotel.images?.[0] || null;
                          
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={hotel.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null;
                        })()}
                        <div className="w-full h-full flex items-center justify-center bg-base-200" style={{ display: 'none' }}>
                          <FaBed className="text-6xl text-base-content/30" />
                        </div>
                      </div>
                    )}

                    {bookingData?.type === 'car' && bookingData?.car && (
                      <div className="w-full h-64 bg-base-200 rounded-lg overflow-hidden mb-4">
                        {(() => {
                          const car = bookingData.car;
                          const imageSource = getCarImage(car);
                          const imageUrl = imageSource ? resolveCarImageUrl(imageSource) : null;
                          
                          if (!imageSource) {
                            console.warn(`Car booking image missing for ${car.vendor} ${car.type}:`, {
                              imageStoragePath: car.imageStoragePath,
                              imageUrl: car.imageUrl,
                              images: car.images,
                              image: car.image
                            });
                          }
                          
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${car.vendor} ${car.type}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error(`Failed to load car booking image:`, {
                                  attemptedUrl: e.target.src,
                                  imageSource,
                                  car: { id: car.id, vendor: car.vendor, type: car.type }
                                });
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null;
                        })()}
                        <div className="w-full h-full flex items-center justify-center bg-base-200" style={{ display: 'none' }}>
                          <FaCar className="text-6xl text-base-content/30" />
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-lg mb-2">{summary.title}</h3>
                      <div className="space-y-2">
                        {summary.details.map((detail, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-base-content/70">{detail.label}:</span>
                            <span className="font-medium">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divider"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {summary.currency} {summary.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <button
                      className="btn btn-primary"
                      onClick={() => setStep(2)}
                    >
                      Continue to Billing <FaArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Billing Information */}
            {step === 2 && (
              <div className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Billing Information</h2>
                  
                  <div className="divider"></div>

                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">First Name <span className="text-error">*</span></span>
                        </label>
                        <input
                          type="text"
                          className={`input input-bordered ${errors.firstName ? 'input-error' : ''}`}
                          value={billingInfo.firstName}
                          onChange={(e) => handleBillingChange('firstName', e.target.value)}
                          placeholder="John"
                        />
                        {errors.firstName && <label className="label"><span className="label-text-alt text-error">{errors.firstName}</span></label>}
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Last Name <span className="text-error">*</span></span>
                        </label>
                        <input
                          type="text"
                          className={`input input-bordered ${errors.lastName ? 'input-error' : ''}`}
                          value={billingInfo.lastName}
                          onChange={(e) => handleBillingChange('lastName', e.target.value)}
                          placeholder="Doe"
                        />
                        {errors.lastName && <label className="label"><span className="label-text-alt text-error">{errors.lastName}</span></label>}
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium"><FaEnvelope className="inline mr-2" />Email <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="email"
                        className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                        value={billingInfo.email}
                        onChange={(e) => handleBillingChange('email', e.target.value)}
                        placeholder="john.doe@example.com"
                      />
                      {errors.email && <label className="label"><span className="label-text-alt text-error">{errors.email}</span></label>}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium"><FaPhone className="inline mr-2" />Phone <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={16}
                        className={`input input-bordered ${errors.phone ? 'input-error' : ''}`}
                        value={billingInfo.phone}
                        onChange={(e) => handleBillingChange('phone', e.target.value)}
                        placeholder="+1 555 123 4567"
                      />
                      {errors.phone && <label className="label"><span className="label-text-alt text-error">{errors.phone}</span></label>}
                    </div>

                    <div className="divider">Address</div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium"><FaMapMarkerAlt className="inline mr-2" />Address Line 1 <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="text"
                        className={`input input-bordered ${errors['address.line1'] ? 'input-error' : ''}`}
                        value={billingInfo.address.line1}
                        onChange={(e) => handleBillingChange('address.line1', e.target.value)}
                        placeholder="123 Main Street"
                      />
                      {errors['address.line1'] && <label className="label"><span className="label-text-alt text-error">{errors['address.line1']}</span></label>}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Address Line 2</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        value={billingInfo.address.line2}
                        onChange={(e) => handleBillingChange('address.line2', e.target.value)}
                        placeholder="Apt 4B (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">City <span className="text-error">*</span></span>
                        </label>
                        <select
                          className={`select select-bordered ${errors['address.city'] ? 'select-error' : ''}`}
                          value={billingInfo.address.city}
                          onChange={(e) => handleBillingChange('address.city', e.target.value)}
                        >
                          <option value="">Select city</option>
                          {US_CITIES.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                        {errors['address.city'] && <label className="label"><span className="label-text-alt text-error">{errors['address.city']}</span></label>}
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">State <span className="text-error">*</span></span>
                        </label>
                        <select
                          className={`select select-bordered ${errors['address.state'] ? 'select-error' : ''}`}
                          value={billingInfo.address.state}
                          onChange={(e) => handleBillingChange('address.state', e.target.value)}
                        >
                          <option value="">Select state</option>
                          {US_STATES.map((state) => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                        {errors['address.state'] && <label className="label"><span className="label-text-alt text-error">{errors['address.state']}</span></label>}
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">ZIP Code <span className="text-error">*</span></span>
                        </label>
                        <input
                          type="text"
                          className={`input input-bordered ${errors['address.zipCode'] ? 'input-error' : ''}`}
                          value={billingInfo.address.zipCode}
                          onChange={(e) => handleBillingChange('address.zipCode', e.target.value)}
                          placeholder="10001"
                        />
                        {errors['address.zipCode'] && <label className="label"><span className="label-text-alt text-error">{errors['address.zipCode']}</span></label>}
                      </div>
                    </div>
                  </div>

                  <div className="card-actions justify-between mt-6">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleCreateBooking}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="loading loading-spinner"></span>
                      ) : (
                        <>
                          Continue to Payment <FaCreditCard className="ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-md border border-base-300 sticky top-24">
              <div className="card-body">
                <h3 className="card-title">Booking Summary</h3>
                <div className="divider"></div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Type:</span>
                    <span className="font-medium">{summary.type}</span>
                  </div>
                  
                  {/* Price Breakdown */}
                  <div className="bg-base-200 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">Base Rate {summary.priceBreakdown.perUnitLabel}:</span>
                      <span className="font-medium">{summary.currency} {summary.priceBreakdown.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">× {summary.priceBreakdown.multiplierLabel}:</span>
                      <span className="font-medium">×{summary.priceBreakdown.multiplier}</span>
                    </div>
                    <div className="divider my-1"></div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Subtotal:</span>
                      <span>{summary.currency} {summary.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Taxes & Fees (10%):</span>
                    <span className="font-medium">{summary.currency} {(summary.price * 0.1).toFixed(2)}</span>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {summary.currency} {(summary.price * 1.1).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;
