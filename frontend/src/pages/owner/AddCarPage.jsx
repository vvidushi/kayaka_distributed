import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FaCar, FaArrowLeft, FaImage, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { uploadImage } from '../../services/image.service';
import { ownerApi } from '../../services/api/owner';

const AddCarPage = () => {
  useDocumentTitle('Add New Car');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    vendor: '',
    type: '',
    location: '',
    seats: '',
    pricePerDay: '',
    description: '',
    images: [],
  });

  const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Convertible', 'Coupe', 'Wagon', 'Van', 'Truck'];
  const vendors = ['Hertz', 'Avis', 'Enterprise', 'Budget', 'National', 'Alamo', 'Local Rentals'];

  const mutation = useMutation({
    mutationFn: async (data) => {
      return await ownerApi.createCar(data);
    },
    onSuccess: (response) => {
      // Invalidate and refetch cars list
      queryClient.invalidateQueries({ queryKey: ['owner-cars'] });
      toast.success('Car created successfully!');
      navigate('/owner/cars');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create car');
    },
  });

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
      const uploadPromises = files.map(file => uploadImage(file, 'cars'));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        seats: parseInt(formData.seats, 10),
        pricePerDay: parseFloat(formData.pricePerDay),
      };
      await mutation.mutateAsync(submitData);
    } catch (error) {
      console.error('Error submitting car:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => navigate('/owner/cars')}
          className="btn btn-ghost mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Cars
        </button>
        <h1 className="text-4xl font-bold mb-2">Add New Car</h1>
        <p className="text-base-content/70">Create a new car rental listing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaCar className="text-primary" />
              Basic Information
            </h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vendor *</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                required
              >
                <option value="">Select a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Car Type *</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="">Select a type</option>
                {carTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Location *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., San Francisco, New York"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Number of Seats *</span>
              </label>
              <input
                type="number"
                min="2"
                max="15"
                className="input input-bordered"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Price per Day (USD) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="input input-bordered"
                value={formData.pricePerDay}
                onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
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
                placeholder="Additional details about the car..."
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaImage className="text-primary" />
              Car Images
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Upload images of your car (max 5MB per image, JPG/PNG/WebP)
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Images (Multiple)</span>
              </label>
              <input
                id="car-image-input"
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
                        alt={`Car ${index + 1}`}
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

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/owner/cars')}
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
                Creating Car...
              </>
            ) : (
              'Create Car'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCarPage;

