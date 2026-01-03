import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaHotel, FaArrowLeft, FaImage, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { uploadImage } from '../../services/image.service';
import { ownerApi } from '../../services/api/owner';

const AddHotelPage = () => {
  useDocumentTitle('Add New Hotel');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    pricePerNight: '',
    rating: '',
    amenities: [],
    lat: '',
    lng: '',
    images: [],
  });

  const availableAmenities = [
    'wifi',
    'breakfast',
    'pool',
    'spa',
    'restaurant',
    'gym',
    'parking',
    'concierge',
    'room_service',
    'bar',
  ];

  const handleAmenityChange = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
    }

    setUploadingImage(true);
    try {
      // Upload all images in parallel
      const uploadPromises = files.map(file => uploadImage(file, 'hotels'));
      const results = await Promise.all(uploadPromises);
      
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...results.map(r => r.url)],
      }));
      
      toast.success(`${files.length} image(s) uploaded successfully!`);
      e.target.value = ''; // Clear input
    } catch (error) {
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      return await ownerApi.createHotel(data);
    },
    onSuccess: (response) => {
      // Invalidate and refetch hotels list
      queryClient.invalidateQueries({ queryKey: ['owner-hotels'] });
      toast.success('Hotel created successfully!');
      navigate('/owner/hotels');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create hotel');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        pricePerNight: parseFloat(formData.pricePerNight),
        rating: formData.rating ? parseFloat(formData.rating) : null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
      };
      await mutation.mutateAsync(submitData);
    } catch (error) {
      console.error('Error submitting hotel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => navigate('/owner/hotels')}
          className="btn btn-ghost mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Hotels
        </button>
        <h1 className="text-4xl font-bold mb-2">Add New Hotel</h1>
        <p className="text-base-content/70">Create a new hotel listing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaHotel className="text-primary" />
              Basic Information
            </h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Hotel Name *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">City *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Address *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Pricing & Rating</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Price per Night (USD) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered"
                  value={formData.pricePerNight}
                  onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Rating (1-5)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  className="input input-bordered"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableAmenities.map((amenity) => (
                <label key={amenity} className="label cursor-pointer">
                  <span className="label-text capitalize">{amenity.replace('_', ' ')}</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => handleAmenityChange(amenity)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaImage className="text-primary" />
              Hotel Images
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Upload images of your hotel (max 5MB per image, JPG/PNG/WebP)
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Images (Multiple)</span>
              </label>
              <input
                id="hotel-image-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="file-input file-input-bordered w-full"
                disabled={uploadingImage}
              />
              <label className="label">
                <span className="label-text-alt">You can select multiple images at once</span>
              </label>
            </div>

            {uploadingImage && (
              <div className="flex items-center gap-2 mt-4">
                <span className="loading loading-spinner loading-sm text-primary"></span>
                <span className="text-sm">Uploading images...</span>
              </div>
            )}

            {formData.images.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">
                  Uploaded Images ({formData.images.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Hotel ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-base-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 btn btn-error btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 badge badge-primary badge-sm">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Location (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Latitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input input-bordered"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Longitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input input-bordered"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/owner/hotels')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || mutation.isLoading}
          >
            {isSubmitting || mutation.isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating Hotel...
              </>
            ) : (
              'Create Hotel'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddHotelPage;

