import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '../../services/api/listings';
import { reviewsApi } from '../../services/api/reviews';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaWifi, FaParking, FaUtensils, FaDumbbell, FaSwimmingPool, FaPaw, FaStar, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';

const resolveHotelImageUrl = (rawUrl) => {
  if (!rawUrl) return null;

  // If it's already a full URL, return it
  if (rawUrl.startsWith('http')) {
    return rawUrl;
  }

  // If it's a Firebase storage path, construct the URL
  let path = rawUrl;
  if (!path.startsWith('kayak/')) {
    path = `kayak/hotels/${path}`;
  }

  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
};

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const amenityIcons = {
  wifi: <FaWifi />,
  parking: <FaParking />,
  breakfast: <FaUtensils />,
  gym: <FaDumbbell />,
  pool: <FaSwimmingPool />,
  pet_friendly: <FaPaw />,
};

const HotelDetailPage = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const searchData = location.state?.searchData;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { data: hotel, isLoading, error } = useQuery({
    queryKey: ['hotel', hotelId],
    queryFn: () => listingsApi.getHotel(hotelId),
    enabled: !!hotelId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', hotelId],
    queryFn: () => reviewsApi.listReviews({ listingId: hotelId, listingType: 'hotel' }),
    enabled: !!hotelId,
  });

  const reviews = reviewsData?.reviews || [];

  useDocumentTitle(hotel ? `${hotel.name} - Hotel Details` : 'Hotel Details');

  const hotelImageUrl = hotel?.imageStoragePath 
    ? resolveHotelImageUrl(hotel.imageStoragePath)
    : hotel?.imageUrl || null;

  const handleBookNow = async () => {
    // Track the click
    try {
      await listingsApi.trackClick({
        listingId: hotel.id || hotel._id,
        listingType: 'hotel',
        action: 'click',
        page: 'hotel-detail',
        metadata: {
          hotelName: hotel.name,
          city: hotel.city,
          price: hotel.pricePerNight
        }
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }

    // Check authentication
    if (!isAuthenticated) {
      toast.showError('Please log in to continue with booking');
      const checkIn = searchData?.checkIn || new Date().toISOString().split('T')[0];
      const checkOut = searchData?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;

      const bookingData = {
        type: 'hotel',
        hotel,
        checkIn,
        checkOut,
        nights,
        guests: searchData?.guests || 1,
      };
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      sessionStorage.setItem('returnPath', '/bookings');
      navigate('/login');
      return;
    }

    // Proceed to booking
    const checkIn = searchData?.checkIn || new Date().toISOString().split('T')[0];
    const checkOut = searchData?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;

    const bookingData = {
      type: 'hotel',
      hotel,
      checkIn,
      checkOut,
      nights,
      guests: searchData?.guests || 1,
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

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Hotel Not Found</h2>
          <button className="btn btn-primary" onClick={() => navigate('/hotels')}>
            Back to Hotels
          </button>
        </div>
      </div>
    );
  }

  const checkIn = searchData?.checkIn || new Date().toISOString().split('T')[0];
  const checkOut = searchData?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;
  const totalPrice = hotel.pricePerNight * nights;

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
          <h1 className="text-3xl font-bold">{hotel.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <FaStar className="text-warning" />
              <span className="font-semibold">{hotel.rating}</span>
              <span className="text-sm text-base-content/70">Very good</span>
            </div>
            <div className="flex items-center gap-1 text-base-content/70">
              <FaMapMarkerAlt />
              <span>{hotel.city}, {hotel.state}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hotel Image */}
            <div className="w-full h-96 bg-base-200 rounded-lg overflow-hidden">
              {hotelImageUrl && !imageError ? (
                <img
                  src={hotelImageUrl}
                  alt={hotel.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">🏨</div>
                    <p className="text-base-content/70">{hotel.name}</p>
                  </div>
                </div>
              )}
              {hotelImageUrl && !imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">About this property</h2>
                <p className="text-base-content/80">
                  {hotel.neighbourhood && `Located in ${hotel.neighbourhood}, `}
                  {hotel.name} offers comfortable accommodations with excellent amenities.
                  {hotel.availableRooms && ` Currently ${hotel.availableRooms} rooms available.`}
                </p>
              </div>
            </div>

            {/* Amenities */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {hotel.amenities && hotel.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <span className="text-primary text-xl">
                        {amenityIcons[amenity] || <FaStar />}
                      </span>
                      <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Map */}
            {hotel.lat && hotel.lng && (
              <div className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Location</h2>
                  <div className="h-64 rounded-lg overflow-hidden mt-4">
                    <MapContainer
                      center={[hotel.lat, hotel.lng]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker position={[hotel.lat, hotel.lng]}>
                        <Popup>{hotel.name}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <p className="text-sm text-base-content/70 mt-2">
                    {hotel.neighbourhood && `${hotel.neighbourhood}, `}
                    {hotel.city}, {hotel.state}
                  </p>
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title">Guest Reviews</h2>
                {reviews.length > 0 ? (
                  <div className="space-y-4 mt-4">
                    {reviews.map((review) => (
                      <div key={review.id || review._id} className="border-b border-base-300 pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="avatar placeholder">
                              <div className="bg-primary text-primary-content rounded-full w-10">
                                <FaUser />
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold">{review.userName || 'Guest'}</p>
                              <p className="text-xs text-base-content/60">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <FaStar
                                key={i}
                                className={i < review.rating ? 'text-warning' : 'text-base-300'}
                                size={16}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-base-content/80">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/60 mt-4">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl border border-base-300 sticky top-4">
              <div className="card-body">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    ${hotel.pricePerNight}
                  </span>
                  <span className="text-base-content/70">/ night</span>
                </div>

                {hotel.isDeal && (
                  <div className="badge badge-secondary mt-2">Special Deal</div>
                )}
                {hotel.limitedAvailability && (
                  <div className="badge badge-warning mt-2">Limited Availability</div>
                )}

                <div className="divider"></div>

                {/* Booking Details */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-base-content/70">Check-in</label>
                    <p className="font-semibold">{new Date(checkIn).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/70">Check-out</label>
                    <p className="font-semibold">{new Date(checkOut).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/70">Guests</label>
                    <p className="font-semibold">{searchData?.guests || 1} guest(s)</p>
                  </div>
                </div>

                <div className="divider"></div>

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>${hotel.pricePerNight} × {nights} night(s)</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block mt-4"
                  onClick={handleBookNow}
                >
                  Book Now
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

export default HotelDetailPage;
