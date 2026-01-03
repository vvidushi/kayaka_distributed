import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api/users';
import { profileApi } from '../services/api/profile';
import { useAuth } from '../hooks/useAuth';
import { updateUser as updateUserAction } from '../store/slices/authSlice';
import { uploadProfileImage } from '../services/image.service';
import { useToast } from '../hooks/useToast';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaImage, FaSave, FaSpinner } from 'react-icons/fa';
import { US_STATES, getStateCode } from '../constants/usStates';
import { formatPhoneForDisplay, formatUsPhoneInput, getE164UsPhone, isValidUsPhone } from '../utils/phone';

const US_CITIES = [
  'New York City', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
  'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'San Francisco', 'Columbus',
  'Fort Worth', 'Indianapolis', 'Charlotte', 'Seattle', 'Denver', 'Washington, D.C.', 'Boston',
  'El Paso', 'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee',
];

const ProfilePage = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
    },
    profileImageUrl: '',
  });
  
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [ssnValue, setSsnValue] = useState('');
  const [ssnError, setSsnError] = useState('');
  const [ssnSuccess, setSsnSuccess] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    enabled: !!currentUser?.id,
  });

  // Update form data when user data is loaded
  useEffect(() => {
    if (data) {
      // Convert state name to state code if needed
      const stateValue = data.address?.state || data.address_state || '';
      const stateCode = getStateCode(stateValue);
      
      setFormData({
        firstName: data.firstName || data.first_name || '',
        lastName: data.lastName || data.last_name || '',
        email: data.email || '',
        phoneNumber: formatPhoneForDisplay(data.phoneNumber || data.phone_number || ''),
        address: {
          line1: data.address?.line1 || data.address_line1 || '',
          line2: data.address?.line2 || data.address_line2 || '',
          city: data.address?.city || data.address_city || '',
          state: stateCode, // Store state code, not full name
          zipCode: data.address?.zipCode || data.address_zip_code || '',
        },
        profileImageUrl: data.profileImageUrl || data.profile_image_url || '',
      });
      setProfileImagePreview(data.profileImageUrl || data.profile_image_url || null);
    }
  }, [data]);

  const isPropertyOwner = data?.profileType === 'property_owner' || data?.profile_type === 'property_owner';
  const partnerDetails = data?.partnerDetails || data?.partner_details || null;
  const ssnOnFile = Boolean(data?.ssn);

  const updateProfileMutation = useMutation({
    mutationFn: async (formDataToUpdate) => {
      let profileImageUrl = formDataToUpdate.profileImageUrl;
      
      // If there's a new image file, upload it first
      if (profileImageFile) {
        setIsUploadingImage(true);
        try {
          const imageResult = await uploadProfileImage(profileImageFile, currentUser.id);
          profileImageUrl = imageResult.url;
        } catch (error) {
          toast.showError(`Failed to upload image: ${error.message}`);
          throw error;
        } finally {
          setIsUploadingImage(false);
        }
      }
      
      const response = await profileApi.updateProfile({
        firstName: formDataToUpdate.firstName,
        lastName: formDataToUpdate.lastName,
        phoneNumber: formDataToUpdate.phoneNumber,
        address: formDataToUpdate.address,
        profileImageUrl,
      });
      
      return { ...response, profileImageUrl };
    },
    onSuccess: (response) => {
      toast.showSuccess('Profile updated successfully');
      queryClient.invalidateQueries(['profile']);
      
      // Get the updated profile image URL from response or mutation result
      const updatedProfile = response.data || response;
      const updatedProfileImageUrl = updatedProfile.profileImageUrl || updatedProfile.profile_image_url || formData.profileImageUrl;
      
      // Update Redux store with new user data
      dispatch(updateUserAction({
        firstName: updatedProfile.firstName || updatedProfile.first_name || formData.firstName,
        lastName: updatedProfile.lastName || updatedProfile.last_name || formData.lastName,
        phoneNumber: updatedProfile.phoneNumber || updatedProfile.phone_number || formData.phoneNumber,
        address: updatedProfile.address || formData.address,
        profileImageUrl: updatedProfileImageUrl,
      }));
      
      // Update form data with the new image URL
      if (updatedProfileImageUrl) {
        setFormData(prev => ({
          ...prev,
          profileImageUrl: updatedProfileImageUrl,
          firstName: updatedProfile.firstName || updatedProfile.first_name || prev.firstName,
          lastName: updatedProfile.lastName || updatedProfile.last_name || prev.lastName,
          phoneNumber: formatPhoneForDisplay(updatedProfile.phoneNumber || updatedProfile.phone_number || prev.phoneNumber),
          address: updatedProfile.address || prev.address,
        }));
        setProfileImagePreview(updatedProfileImageUrl);
      }
      
      // Clear image file state
      setProfileImageFile(null);
    },
    onError: (error) => {
      toast.showError(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const ssnMutation = useMutation({
    mutationFn: (payload) => usersApi.updateSsn(currentUser.id, payload),
    onSuccess: (response) => {
      const verifiedAt = response.data?.compliance?.verifiedAt || new Date().toISOString();
      setSsnValue('');
      setSsnError('');
      setSsnSuccess('SSN saved. You can now submit properties for approval.');
      queryClient.invalidateQueries(['user', currentUser.id]);
      dispatch(
        updateUserAction({
          profileType: response.data?.profileType || currentUser?.profileType,
          hasSsnOnFile: response.data?.compliance?.ssnOnFile,
          requiresSsn: response.data?.compliance?.requiresSsn,
          compliance: {
            ...response.data?.compliance,
            verifiedAt,
          },
        })
      );
    },
    onError: (mutationError) => {
      const message = mutationError.response?.data?.message || 'Unable to save SSN';
      setSsnError(message);
      setSsnSuccess('');
    },
  });

  const handleInputChange = (field, value) => {
    if (field === 'phoneNumber') {
      const formatted = value ? formatUsPhoneInput(value) : '';
      setFormData((prev) => ({
        ...prev,
        phoneNumber: formatted,
      }));
      if (phoneError) {
        setPhoneError('');
      }
      return;
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.showError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.showError('Image size must be less than 5MB');
        return;
      }
      
      setProfileImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber.trim() || !isValidUsPhone(formData.phoneNumber)) {
      setPhoneError('Enter a valid US phone number (+1 123 456 7890)');
      return;
    }
    const payload = {
      ...formData,
      phoneNumber: getE164UsPhone(formData.phoneNumber) || formData.phoneNumber,
    };
    updateProfileMutation.mutate(payload);
  };

  const deleteProfileMutation = useMutation({
    mutationFn: () => profileApi.deleteProfile(),
    onSuccess: () => {
      toast.showSuccess('Profile deleted. Signing out...');
      logout();
    },
    onError: (mutationError) => {
      const message =
        mutationError.response?.data?.message ||
        mutationError.userMessage ||
        'Unable to delete profile';
      toast.showError(message);
    },
  });

  const handleDeleteProfile = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your profile? This action cannot be undone.'
    );
    if (!confirmed) return;
    deleteProfileMutation.mutate();
  };

  const handleSsnSubmit = (event) => {
    event.preventDefault();
    const trimmed = ssnValue.trim();
    const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
    if (!ssnPattern.test(trimmed)) {
      setSsnError('SSN must be in format XXX-XX-XXXX');
      setSsnSuccess('');
      return;
    }
    ssnMutation.mutate({ ssn: trimmed });
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
        <span>Error loading profile: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaImage className="mr-2" />
              Profile Picture
            </h2>
            
            <div className="flex items-center gap-6">
              <div className="avatar">
                <div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile" className="object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-2xl uppercase">
                      {formData.firstName?.charAt(0) || ''}{formData.lastName?.charAt(0) || ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <label className="form-control">
                  <div className="label">
                    <span className="label-text">Upload Profile Image</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="file-input file-input-bordered w-full"
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                  />
                  <div className="label">
                    <span className="label-text-alt">JPEG, PNG, WebP, or GIF (max 5MB)</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaUser className="mr-2" />
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">
                    <FaEnvelope className="inline mr-2" />
                    Email
                  </span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={formData.email}
                  disabled
                  readOnly
                />
                <div className="label">
                  <span className="label-text-alt">Email cannot be changed</span>
                </div>
              </div>
              
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">
                    <FaPhone className="inline mr-2" />
                    Phone Number
                  </span>
                </label>
                <input
                  type="tel"
                  className={`input input-bordered ${phoneError ? 'input-error' : ''}`}
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+1 555 123 4567"
                  inputMode="numeric"
                />
                {phoneError && (
                  <div className="label">
                    <span className="label-text-alt text-error">{phoneError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FaMapMarkerAlt className="mr-2" />
              Address
            </h2>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Address Line 1</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.address.line1}
                  onChange={(e) => handleInputChange('address.line1', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Address Line 2 (Optional)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.address.line2}
                  onChange={(e) => handleInputChange('address.line2', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">City</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    required
                  >
                    <option value="">Select city</option>
                    {US_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">State</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    required
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((state) => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">ZIP Code</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.address.zipCode}
                    onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateProfileMutation.isLoading || isUploadingImage}
          >
            {updateProfileMutation.isLoading || isUploadingImage ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* SSN Section for Property Owners */}
      {isPropertyOwner && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body space-y-2">
            <h3 className="card-title">Property Compliance</h3>
            <p>SSN on file: {ssnOnFile ? 'Yes' : 'No'}</p>
            <p>
              Status:{' '}
              {ssnOnFile
                ? data?.ssnVerifiedAt || data?.ssn_verified_at
                  ? `Verified ${new Date(data.ssnVerifiedAt || data.ssn_verified_at).toLocaleString()}`
                  : 'Pending verification'
                : 'Missing'}
            </p>
            {!ssnOnFile && (
              <p className="text-sm text-base-content/70">
                Property partners must add their SSN before submitting a property for approval.
              </p>
            )}

            <form className="mt-4 space-y-3" onSubmit={handleSsnSubmit}>
              <label className="form-control">
                <div className="label">
                  <span className="label-text">Add or update SSN</span>
                </div>
                <input
                  type="text"
                  name="ssn"
                  value={ssnValue}
                  placeholder="XXX-XX-XXXX"
                  className={`input input-bordered ${ssnError ? 'input-error' : ''}`}
                  onChange={(e) => {
                    setSsnValue(e.target.value);
                    if (ssnError) setSsnError('');
                  }}
                />
              </label>
              {ssnError && <p className="text-error text-sm">{ssnError}</p>}
              {ssnSuccess && <p className="text-success text-sm">{ssnSuccess}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={ssnMutation.isLoading}
              >
                {ssnMutation.isLoading ? 'Saving...' : 'Save SSN'}
              </button>
              <p className="text-xs text-base-content/70">
                We store this securely and only use it to verify tax compliance before approving
                your properties.
              </p>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="btn btn-error btn-outline"
          onClick={handleDeleteProfile}
          disabled={deleteProfileMutation.isLoading}
        >
          {deleteProfileMutation.isLoading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Deleting...
            </>
          ) : (
            'Delete Profile'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
