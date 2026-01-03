import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsApi } from '../../services/api/bookings';
import { usersApi } from '../../services/api/users';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaPlane, FaBed, FaCar, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaArrowRight } from 'react-icons/fa';
import { US_STATES, getStateCode } from '../../constants/usStates';
import { formatPhoneForDisplay, formatUsPhoneInput, getE164UsPhone, isValidUsPhone } from '../../utils/phone';

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
        
        // Calculate total with taxes (10% tax)
        let subtotal = outbound.price;
        if (returnFlight) {
          subtotal += returnFlight.price;
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
        // Calculate total with taxes (10% tax)
        const subtotal = hotel.pricePerNight * nights;
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
            guests: bookingData.guests || 1,
            nights,
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
        // Calculate total with taxes (10% tax)
        const subtotal = car.pricePerDay * days;
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
      const subtotal = outbound.price + (returnFlight ? returnFlight.price : 0);

      return {
        type: 'Flight',
        icon: FaPlane,
        title: `${outbound.from} → ${outbound.to}${returnFlight ? ` → ${returnFlight.from}` : ''}`,
        details: [
          { label: 'Outbound', value: `${outbound.airline} • ${outbound.departDate} ${outbound.departureTime}` },
          returnFlight && { label: 'Return', value: `${returnFlight.airline} • ${returnFlight.departDate} ${returnFlight.departureTime}` },
          { label: 'Travelers', value: bookingData.searchParams?.travelers || 1 },
        ].filter(Boolean),
        price: subtotal, // Subtotal for display, taxes added in sidebar
        currency: outbound.currency || 'USD',
      };
    } else if (bookingData.type === 'hotel') {
      const hotel = bookingData.hotel;
      const nights = bookingData.nights || 1;
      const subtotal = hotel.pricePerNight * nights;
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
          { label: 'Guests', value: bookingData.guests || 1 },
        ],
        price: subtotal, // Subtotal for display, taxes added in sidebar
        currency: hotel.currency || 'USD',
      };
    } else if (bookingData.type === 'car') {
      const car = bookingData.car;
      const days = bookingData.days || 1;
      const subtotal = car.pricePerDay * days;

      return {
        type: 'Car Rental',
        icon: FaCar,
        title: `${car.vendor} - ${car.type}`,
        details: [
          { label: 'Location', value: car.city || car.location },
          { label: 'Pick-up', value: `${bookingData.pickupDate} ${bookingData.pickupTime || ''}` },
          { label: 'Drop-off', value: `${bookingData.dropoffDate} ${bookingData.dropoffTime || ''}` },
          { label: 'Days', value: days },
        ],
        price: subtotal, // Subtotal for display, taxes added in sidebar
        currency: car.currency || 'USD',
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
                          <button
                            className="btn btn-sm btn-ghost mt-2"
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Type:</span>
                    <span className="font-medium">{summary.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Subtotal:</span>
                    <span className="font-medium">{summary.currency} {summary.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/70">Taxes & Fees:</span>
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
