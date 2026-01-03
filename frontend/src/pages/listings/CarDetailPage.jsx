import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '../../services/api/listings';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaCar, FaUsers, FaCog, FaGasPump, FaMapMarkerAlt, FaStar } from 'react-icons/fa';

const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';

const resolveCarImageUrl = (rawUrl) => {
  if (!rawUrl) return null;

  // If it's already a full URL, return it
  if (rawUrl.startsWith('http')) {
    return rawUrl;
  }

  // If it's a Firebase storage path, construct the URL
  let path = rawUrl;
  if (!path.startsWith('kayak/')) {
    path = `kayak/cars/${path}`;
  }

  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
};

const CarDetailPage = () => {
  const { carId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const searchData = location.state?.searchData;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { data: car, isLoading, error } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => listingsApi.getCar(carId),
    enabled: !!carId,
  });

  useDocumentTitle(car ? `${car.model || car.type} - Car Details` : 'Car Details');

  const carImageUrl = car?.imageStoragePath 
    ? resolveCarImageUrl(car.imageStoragePath)
    : car?.imageUrl || null;

  const handleBookNow = async () => {
    // Track the click
    try {
      await listingsApi.trackClick({
        listingId: car.id || car._id,
        listingType: 'car',
        action: 'click',
        page: 'car-detail',
        metadata: {
          carModel: car.model,
          vendor: car.vendor,
          city: car.city,
          price: car.pricePerDay
        }
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }

    // Check authentication
    if (!isAuthenticated) {
      toast.showError('Please log in to continue with booking');
      const pickupDate = searchData?.pickupDate || new Date().toISOString().split('T')[0];
      const dropoffDate = searchData?.dropoffDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const pickupDateTime = new Date(pickupDate);
      const dropoffDateTime = new Date(dropoffDate);
      const days = Math.ceil((dropoffDateTime - pickupDateTime) / (1000 * 60 * 60 * 24)) || 1;

      const bookingData = {
        type: 'car',
        car,
        pickupDate,
        dropoffDate,
        days,
        location: searchData?.location || car.city,
      };
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      sessionStorage.setItem('returnPath', '/bookings');
      navigate('/login');
      return;
    }

    // Proceed to booking
    const pickupDate = searchData?.pickupDate || new Date().toISOString().split('T')[0];
    const dropoffDate = searchData?.dropoffDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const pickupDateTime = new Date(pickupDate);
    const dropoffDateTime = new Date(dropoffDate);
    const days = Math.ceil((dropoffDateTime - pickupDateTime) / (1000 * 60 * 60 * 24)) || 1;

    const bookingData = {
      type: 'car',
      car,
      pickupDate,
      dropoffDate,
      days,
      location: searchData?.location || car.city,
    };

    navigate('/bookings', { state: { bookingData } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Car Not Found</h2>
          <button className="btn btn-primary" onClick={() => navigate('/cars')}>
            Back to Cars
          </button>
        </div>
      </div>
    );
  }

  const pickupDate = searchData?.pickupDate || new Date().toISOString().split('T')[0];
  const dropoffDate = searchData?.dropoffDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const pickupDateTime = new Date(pickupDate);
  const dropoffDateTime = new Date(dropoffDate);
  const days = Math.ceil((dropoffDateTime - pickupDateTime) / (1000 * 60 * 60 * 24)) || 1;
  const totalPrice = car.pricePerDay * days;

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            className="btn btn-ghost btn-sm mb-4"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">{car.model || car.type}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="badge badge-lg badge-primary">{car.vendor}</span>
            <div className="flex items-center gap-1 text-base-content/70">
              <FaMapMarkerAlt />
              <span>{car.city}, {car.state}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car Image */}
            <div className="w-full h-96 bg-base-200 rounded-lg overflow-hidden relative">
              {carImageUrl && !imageError ? (
                <img
                  src={carImageUrl}
                  alt={car.model || car.type}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">🚗</div>
                    <p className="text-base-content/70">{car.model || car.type}</p>
                  </div>
                </div>
              )}
              {carImageUrl && !imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              )}
            </div>

            {/* Vehicle Details */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">Vehicle Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                  <div className="text-center">
                    <FaUsers className="text-3xl text-primary mx-auto mb-2" />
                    <p className="font-semibold">{car.seats} Seats</p>
                    <p className="text-sm text-base-content/70">Capacity</p>
                  </div>
                  <div className="text-center">
                    <FaCog className="text-3xl text-primary mx-auto mb-2" />
                    <p className="font-semibold">{car.transmission}</p>
                    <p className="text-sm text-base-content/70">Transmission</p>
                  </div>
                  <div className="text-center">
                    <FaGasPump className="text-3xl text-primary mx-auto mb-2" />
                    <p className="font-semibold">{car.fuelType}</p>
                    <p className="text-sm text-base-content/70">Fuel Type</p>
                  </div>
                  <div className="text-center">
                    <FaCar className="text-3xl text-primary mx-auto mb-2" />
                    <p className="font-semibold">{car.type}</p>
                    <p className="text-sm text-base-content/70">Type</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            {car.features && car.features.length > 0 && (
              <div className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Features</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {car.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pickup Location */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">Pickup Location</h2>
                <div className="flex items-start gap-3 mt-4">
                  <FaMapMarkerAlt className="text-primary text-xl mt-1" />
                  <div>
                    <p className="font-semibold">{car.vendor}</p>
                    {car.location && <p className="text-base-content/70">{car.location}</p>}
                    <p className="text-base-content/70">{car.city}, {car.state}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Policy */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">Rental Policy</h2>
                <div className="space-y-2 mt-4 text-sm">
                  <p>• Valid driver's license required</p>
                  <p>• Minimum age: 21 years old</p>
                  <p>• Credit card required for security deposit</p>
                  <p>• Fuel policy: Pick up full, return full</p>
                  <p>• Cancellation: Free up to 24 hours before pickup</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl border border-base-300 sticky top-4">
              <div className="card-body">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    ${car.pricePerDay}
                  </span>
                  <span className="text-base-content/70">/ day</span>
                </div>

                {!car.available && (
                  <div className="badge badge-error mt-2">Not Available</div>
                )}

                <div className="divider"></div>

                {/* Rental Details */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-base-content/70">Pickup Date</label>
                    <p className="font-semibold">{new Date(pickupDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/70">Drop-off Date</label>
                    <p className="font-semibold">{new Date(dropoffDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/70">Rental Duration</label>
                    <p className="font-semibold">{days} day(s)</p>
                  </div>
                </div>

                <div className="divider"></div>

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>${car.pricePerDay} × {days} day(s)</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-base-content/70">
                    <span>Taxes & Fees</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block mt-4"
                  onClick={handleBookNow}
                  disabled={!car.available}
                >
                  {car.available ? 'Book Now' : 'Not Available'}
                </button>

                <p className="text-xs text-center text-base-content/70 mt-2">
                  You won't be charged yet
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetailPage;
