import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaCar, FaPlus, FaEdit, FaTrash, FaCheckCircle, FaClock, FaPause, FaEyeSlash, FaPlay } from 'react-icons/fa';
import { ownerApi } from '../../services/api/owner';
import toast from 'react-hot-toast';

const OwnerCarsPage = () => {
  useDocumentTitle('My Cars');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'unlisted'
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-cars', page],
    queryFn: async () => {
      return await ownerApi.getCars();
    },
  });

  // Mutations
  const snoozeMutation = useMutation({
    mutationFn: async (carId) => await ownerApi.updateCarStatus(carId, 'snoozed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-cars'] });
      toast.success('Car snoozed! It will be hidden from search.');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (carId) => await ownerApi.updateCarStatus(carId, 'active'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-cars'] });
      toast.success('Car activated! It is now visible in search.');
    },
  });

  const unlistMutation = useMutation({
    mutationFn: async (carId) => await ownerApi.updateCarStatus(carId, 'unlisted'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-cars'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Car unlisted. It has been removed from search. Check Unlisted tab to reactivate.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (carId) => await ownerApi.deleteCar(carId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-cars'] });
      toast.success('Car deleted permanently!');
    },
  });

  const handleSnooze = (carId) => {
    if (window.confirm('Snooze this car? It will be temporarily hidden from search results.')) {
      snoozeMutation.mutate(carId);
    }
  };

  const handleActivate = (carId) => {
    activateMutation.mutate(carId);
  };

  const handleUnlist = (carId) => {
    if (window.confirm('Unlist this car? It will be removed from active listings. You can reactivate it from the Unlisted tab.')) {
      unlistMutation.mutate(carId);
    }
  };

  const handleDelete = (carId, carName) => {
    if (window.confirm(`Permanently delete "${carName}"? This action cannot be undone!`)) {
      deleteMutation.mutate(carId);
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
        <span>Error loading cars: {error.message}</span>
      </div>
    );
  }

  const allCars = data?.items || [];
  
  // Filter cars based on active tab
  const cars = activeTab === 'active' 
    ? allCars.filter(c => c.status !== 'unlisted')
    : allCars.filter(c => c.status === 'unlisted');

  const activeCount = allCars.filter(c => c.status !== 'unlisted').length;
  const unlistedCount = allCars.filter(c => c.status === 'unlisted').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Cars</h1>
          <p className="text-base-content/70">Manage your car rental listings</p>
        </div>
        <Link to="/owner/cars/new" className="btn btn-primary">
          <FaPlus className="mr-2" />
          Add New Car
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

      {cars.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-16">
            <FaCar className="text-6xl text-base-content/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {activeTab === 'active' ? 'No active cars' : 'No unlisted cars'}
            </h2>
            <p className="text-base-content/70 mb-6">
              {activeTab === 'active' 
                ? 'Start by adding your first car listing to reach travelers.'
                : 'No properties have been unlisted yet.'}
            </p>
            {activeTab === 'active' && (
              <Link to="/owner/cars/new" className="btn btn-primary">
                <FaPlus className="mr-2" />
                Add Your First Car
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {cars.map((car) => (
              <div key={car.id || car._id} className="card bg-base-100 shadow-xl">
                <figure>
                  {car.images?.length > 0 ? (
                    <img 
                      src={car.images[0]} 
                      alt={`${car.vendor} ${car.type}`}
                      className="w-full h-48 object-cover"
                    />
                  ) : car.imageUrl ? (
                    <img 
                      src={car.imageUrl} 
                      alt={`${car.vendor} ${car.type}`}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-base-200 flex items-center justify-center">
                      <FaCar className="text-4xl text-base-content/30" />
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="card-title">{car.type}</h2>
                      <p className="text-sm text-base-content/70">{car.vendor}</p>
                    </div>
                    {car.status === 'active' ? (
                      <div className="badge badge-success badge-sm">Active</div>
                    ) : car.status === 'snoozed' ? (
                      <div className="badge badge-warning badge-sm">Snoozed</div>
                    ) : car.status === 'unlisted' ? (
                      <div className="badge badge-error badge-sm">Unlisted</div>
                    ) : (
                      <div className="badge badge-info badge-sm">{car.status}</div>
                    )}
                  </div>
                  <p className="text-sm text-base-content/70">{car.location}</p>
                  <p className="text-sm text-base-content/70">{car.seats} seats</p>
                  <p className="text-lg font-semibold">${car.pricePerDay}/day</p>
                  
                  <div className="card-actions justify-end mt-4 flex-wrap gap-1">
                    {car.status === 'active' && (
                      <>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleSnooze(car._id || car.id)}
                          disabled={snoozeMutation.isLoading}
                        >
                          <FaPause className="mr-1" />
                          Snooze
                        </button>
                        <button 
                          className="btn btn-sm btn-error"
                          onClick={() => handleUnlist(car._id || car.id)}
                          disabled={unlistMutation.isLoading}
                        >
                          <FaEyeSlash className="mr-1" />
                          Unlist
                        </button>
                        <Link 
                          to={`/owner/cars/${car._id || car.id}/edit`}
                          className="btn btn-sm btn-ghost"
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </Link>
                      </>
                    )}
                    
                    {car.status === 'snoozed' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleActivate(car._id || car.id)}
                          disabled={activateMutation.isLoading}
                        >
                          <FaPlay className="mr-1" />
                          Activate
                        </button>
                        <Link 
                          to={`/owner/cars/${car._id || car.id}/edit`}
                          className="btn btn-sm btn-ghost"
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </Link>
                      </>
                    )}
                    
                    {car.status === 'unlisted' && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => handleActivate(car._id || car.id)}
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

export default OwnerCarsPage;

