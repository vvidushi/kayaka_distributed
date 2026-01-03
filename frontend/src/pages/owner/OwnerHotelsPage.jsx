import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaHotel, FaPlus, FaEdit, FaTrash, FaCheckCircle, FaClock, FaPause, FaEyeSlash, FaPlay } from 'react-icons/fa';
import { ownerApi } from '../../services/api/owner';
import toast from 'react-hot-toast';

const OwnerHotelsPage = () => {
  useDocumentTitle('My Hotels');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'unlisted'
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-hotels', page],
    queryFn: async () => {
      return await ownerApi.getHotels();
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async (hotelId) => {
      return await ownerApi.updateHotelStatus(hotelId, 'snoozed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-hotels'] });
      toast.success('Hotel snoozed! It will be hidden from search.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to snooze hotel');
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async (hotelId) => {
      return await ownerApi.updateHotelStatus(hotelId, 'active');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-hotels'] });
      toast.success('Hotel activated! It is now visible in search.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to activate hotel');
    },
  });

  // Unlist mutation
  const unlistMutation = useMutation({
    mutationFn: async (hotelId) => {
      return await ownerApi.updateHotelStatus(hotelId, 'unlisted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Hotel unlisted. It has been removed from search. Check Unlisted tab to reactivate.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unlist hotel');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (hotelId) => {
      return await ownerApi.deleteHotel(hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Hotel deleted permanently!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete hotel');
    },
  });

  const handleSnooze = (hotelId) => {
    if (window.confirm('Snooze this hotel? It will be temporarily hidden from search results.')) {
      snoozeMutation.mutate(hotelId);
    }
  };

  const handleActivate = (hotelId) => {
    activateMutation.mutate(hotelId);
  };

  const handleUnlist = (hotelId) => {
    if (window.confirm('Unlist this hotel? It will be removed from active listings. You can reactivate it from the Unlisted tab.')) {
      unlistMutation.mutate(hotelId);
    }
  };

  const handleDelete = (hotelId, hotelName) => {
    if (window.confirm(`Permanently delete "${hotelName}"? This action cannot be undone!`)) {
      deleteMutation.mutate(hotelId);
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
      <div className="alert alert-error">
        <span>Error loading hotels: {error.message}</span>
      </div>
    );
  }

  const allHotels = data?.items || [];
  
  // Filter hotels based on active tab
  const hotels = activeTab === 'active' 
    ? allHotels.filter(h => h.status !== 'unlisted')
    : allHotels.filter(h => h.status === 'unlisted');

  const activeCount = allHotels.filter(h => h.status !== 'unlisted').length;
  const unlistedCount = allHotels.filter(h => h.status === 'unlisted').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Hotels</h1>
          <p className="text-base-content/70">Manage your hotel listings</p>
        </div>
        <Link to="/owner/hotels/new" className="btn btn-primary">
          <FaPlus className="mr-2" />
          Add New Hotel
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6 bg-base-200">
        <button 
          className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Properties ({activeCount})
        </button>
        <button 
          className={`tab ${activeTab === 'unlisted' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('unlisted')}
        >
          Unlisted ({unlistedCount})
        </button>
      </div>

      {hotels.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-16">
            <FaHotel className="text-6xl text-base-content/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {activeTab === 'active' ? 'No active hotels' : 'No unlisted hotels'}
            </h2>
            <p className="text-base-content/70 mb-6">
              {activeTab === 'active' 
                ? 'Start by adding your first hotel listing to reach travelers.'
                : 'No properties have been unlisted yet.'}
            </p>
            {activeTab === 'active' && (
              <Link to="/owner/hotels/new" className="btn btn-primary">
                <FaPlus className="mr-2" />
                Add Your First Hotel
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {hotels.map((hotel) => (
              <div key={hotel.id || hotel._id} className="card bg-base-100 shadow-xl">
                <figure>
                  {hotel.images?.length > 0 ? (
                    <img 
                      src={hotel.images[0]} 
                      alt={hotel.name} 
                      className="w-full h-48 object-cover"
                    />
                  ) : hotel.imageUrl ? (
                    <img 
                      src={hotel.imageUrl} 
                      alt={hotel.name} 
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-base-200 flex items-center justify-center">
                      <FaHotel className="text-4xl text-base-content/30" />
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="card-title">{hotel.name}</h2>
                    {hotel.status === 'active' ? (
                      <div className="badge badge-success badge-sm">Active</div>
                    ) : hotel.status === 'snoozed' ? (
                      <div className="badge badge-warning badge-sm">Snoozed</div>
                    ) : hotel.status === 'unlisted' ? (
                      <div className="badge badge-error badge-sm">Unlisted</div>
                    ) : (
                      <div className="badge badge-info badge-sm">{hotel.status}</div>
                    )}
                  </div>
                  <p className="text-sm text-base-content/70">{hotel.city}</p>
                  <p className="text-lg font-semibold">${hotel.pricePerNight}/night</p>
                  
                  <div className="card-actions justify-end mt-4 flex-wrap gap-1">
                    {/* Show different buttons based on status */}
                    {hotel.status === 'active' && (
                      <>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleSnooze(hotel._id || hotel.id)}
                          disabled={snoozeMutation.isLoading}
                        >
                          <FaPause className="mr-1" />
                          Snooze
                        </button>
                        <button 
                          className="btn btn-sm btn-error"
                          onClick={() => handleUnlist(hotel._id || hotel.id)}
                          disabled={unlistMutation.isLoading}
                        >
                          <FaEyeSlash className="mr-1" />
                          Unlist
                        </button>
                        <Link 
                          to={`/owner/hotels/${hotel._id || hotel.id}/edit`}
                          className="btn btn-sm btn-ghost"
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </Link>
                      </>
                    )}
                    
                    {hotel.status === 'snoozed' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleActivate(hotel._id || hotel.id)}
                          disabled={activateMutation.isLoading}
                        >
                          <FaPlay className="mr-1" />
                          Activate
                        </button>
                        <Link 
                          to={`/owner/hotels/${hotel._id || hotel.id}/edit`}
                          className="btn btn-sm btn-ghost"
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </Link>
                      </>
                    )}
                    
                    {hotel.status === 'unlisted' && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => handleActivate(hotel._id || hotel.id)}
                        disabled={activateMutation.isLoading}
                      >
                        <FaPlay className="mr-1" />
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                className="btn btn-outline"
                disabled={!data.pagination.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="btn btn-disabled">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={!data.pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerHotelsPage;

