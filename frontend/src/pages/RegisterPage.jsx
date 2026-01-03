import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getHomePageFlightImages } from '../services/backgroundImages.service.js';
import { ALL_STATES } from '../constants/internationalStates';
import { formatUsPhoneInput, getE164UsPhone, isValidUsPhone } from '../utils/phone';

const RegisterPage = () => {
  useDocumentTitle('Create Account');
  
  const flightImages = getHomePageFlightImages();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileType: 'traveler',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
    },
    partnerProfile: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      portfolioSize: '',
      website: '',
    },
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, loading, error } = useAuth();
  const roleOptions = [
    {
      id: 'traveler',
      title: 'User/Traveler',
      description: 'Search and book flights, hotels, and cars.',
    },
    {
      id: 'owner',
      title: 'Owner/Partner',
      description: 'List and manage properties, hotels, or car rentals.',
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'profileType') {
      setFormData({
        ...formData,
        profileType: value,
      });
      setErrors((prev) => ({
        ...prev,
        partnerCompanyName: undefined,
        partnerContactEmail: undefined,
        partnerPortfolioSize: undefined,
      }));
    } else if (name === 'phoneNumber') {
      const formatted = value ? formatUsPhoneInput(value) : '';
      setFormData({
        ...formData,
        phoneNumber: formatted,
      });
      if (errors.phoneNumber) {
        setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
      }
    } else if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      // Validate zip code length in real-time
      if (field === 'zipCode') {
        // Limit zip code to 12 characters (accommodates US ZIP+4, UK postcodes, etc.)
        const trimmedValue = value.slice(0, 12);
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            [field]: trimmedValue,
          },
        });
        // Clear zip code error if user is typing valid input
        if (errors['address.zipCode']) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors['address.zipCode'];
            return newErrors;
          });
        }
      } else {
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            [field]: value,
          },
        });
      }
    } else if (name.startsWith('partnerProfile.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        partnerProfile: {
          ...formData.partnerProfile,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.phoneNumber.trim() || !isValidUsPhone(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid US phone number (+1 123 456 7890)';
    }

    // Validate zip code: 3-12 characters (accommodates various international formats)
    const zipCode = formData.address.zipCode.trim();
    if (!zipCode) {
      newErrors['address.zipCode'] = 'Zip/Postal code is required';
    } else if (zipCode.length < 3) {
      newErrors['address.zipCode'] = 'Zip/Postal code must be at least 3 characters';
    } else if (zipCode.length > 12) {
      newErrors['address.zipCode'] = 'Zip/Postal code must be 12 characters or less';
    }

    if (formData.profileType === 'owner') {
      if (!formData.partnerProfile.companyName.trim()) {
        newErrors.partnerCompanyName = 'Company name is required for owners';
      }
      if (!formData.partnerProfile.contactEmail.trim()) {
        newErrors.partnerContactEmail = 'Contact email is required for owners';
      } else if (!/^\S+@\S+\.\S+$/.test(formData.partnerProfile.contactEmail)) {
        newErrors.partnerContactEmail = 'Contact email is invalid';
      }
      if (
        formData.partnerProfile.portfolioSize &&
        (Number.isNaN(Number(formData.partnerProfile.portfolioSize)) ||
          Number(formData.partnerProfile.portfolioSize) < 0)
      ) {
        newErrors.partnerPortfolioSize = 'Portfolio size must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    try {
      const { confirmPassword, partnerProfile, ...userData } = formData;
      const normalizedPhone = getE164UsPhone(formData.phoneNumber) || formData.phoneNumber;
      const payload = {
        ...userData,
        phoneNumber: normalizedPhone,
        partnerProfile:
          formData.profileType === 'owner'
            ? {
                companyName: partnerProfile.companyName.trim(),
                contactName: partnerProfile.contactName.trim(),
                contactEmail: partnerProfile.contactEmail.trim(),
                portfolioSize: partnerProfile.portfolioSize,
                website: partnerProfile.website.trim(),
              }
            : null,
      };
      await register(payload);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-100 relative overflow-hidden">
      {/* Background images for all screen sizes */}
      <div className="absolute inset-0 z-0">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 h-full p-2 lg:p-4 opacity-20 lg:opacity-100">
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight1}
              alt="Travel 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight2}
              alt="Travel 2"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:block h-full rounded-3xl overflow-hidden shadow-lg">
            <img
              src={flightImages.flight3}
              alt="Travel 3"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      <div className="hero-content w-full max-w-4xl relative z-10">
        <div className="card bg-base-100 w-full shadow-2xl border border-base-300">
          <div className="card-body">
            <h1 className="text-3xl font-bold text-center mb-4">Create Account</h1>
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {error.includes('already exists') || error.includes('CONFLICT') 
                    ? 'User with this email already exists. Please use a different email or try logging in.' 
                    : error}
                </span>
              </div>
            )}
            <div className="mb-8">
              <p className="text-sm text-base-content/70 mb-2">Choose the account type that matches your goal.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleOptions.map((option) => {
                  const isActive = formData.profileType === option.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => handleChange({ target: { name: 'profileType', value: option.id } })}
                      className={`card border transition text-left ${
                        isActive ? 'border-primary shadow-xl' : 'border-base-200 hover:shadow-lg'
                      }`}
                      disabled={loading}
                    >
                      <div className="card-body">
                        <h2 className="card-title flex items-center justify-between">
                          {option.title}
                          {isActive && <span className="badge badge-primary">Selected</span>}
                        </h2>
                        <p className="text-sm text-base-content/70">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">First Name <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className="input input-bordered"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Last Name</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className="input input-bordered"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="input input-bordered"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Phone Number <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="+1 234 567 8900"
                    className={`input input-bordered ${errors.phoneNumber ? 'input-error' : ''}`}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    inputMode="numeric"
                    pattern="\+1\s\d{3}\s\d{3}\s\d{4}"
                    required
                    disabled={loading}
                  />
                  {errors.phoneNumber && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.phoneNumber}</span>
                    </label>
                  )}
                </div>
                {formData.profileType === 'owner' && (
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Company Name <span className="text-error">*</span></span>
                        </label>
                        <input
                          type="text"
                          name="partnerProfile.companyName"
                          className={`input input-bordered ${errors.partnerCompanyName ? 'input-error' : ''}`}
                          value={formData.partnerProfile.companyName}
                          onChange={handleChange}
                          disabled={loading}
                        />
                        {errors.partnerCompanyName && (
                          <label className="label">
                            <span className="label-text-alt text-error">{errors.partnerCompanyName}</span>
                          </label>
                        )}
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Primary Contact Name</span>
                        </label>
                        <input
                          type="text"
                          name="partnerProfile.contactName"
                          className="input input-bordered"
                          value={formData.partnerProfile.contactName}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Primary Contact Email <span className="text-error">*</span></span>
                        </label>
                        <input
                          type="email"
                          name="partnerProfile.contactEmail"
                          className={`input input-bordered ${errors.partnerContactEmail ? 'input-error' : ''}`}
                          value={formData.partnerProfile.contactEmail}
                          onChange={handleChange}
                          disabled={loading}
                        />
                        {errors.partnerContactEmail && (
                          <label className="label">
                            <span className="label-text-alt text-error">{errors.partnerContactEmail}</span>
                          </label>
                        )}
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Portfolio Size (properties)</span>
                        </label>
                        <input
                          type="number"
                          name="partnerProfile.portfolioSize"
                          className={`input input-bordered ${errors.partnerPortfolioSize ? 'input-error' : ''}`}
                          value={formData.partnerProfile.portfolioSize}
                          onChange={handleChange}
                          min="0"
                          disabled={loading}
                        />
                        {errors.partnerPortfolioSize && (
                          <label className="label">
                            <span className="label-text-alt text-error">{errors.partnerPortfolioSize}</span>
                          </label>
                        )}
                      </div>
                      <div className="form-control md:col-span-2">
                        <label className="label">
                          <span className="label-text">Company Website (optional)</span>
                        </label>
                        <input
                          type="url"
                          name="partnerProfile.website"
                          className="input input-bordered"
                          value={formData.partnerProfile.website}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Password <span className="text-error">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <FaEyeSlash className="h-5 w-5" />
                      ) : (
                        <FaEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.password}</span>
                    </label>
                  )}
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Confirm Password <span className="text-error">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      className={`input input-bordered w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <FaEyeSlash className="h-5 w-5" />
                      ) : (
                        <FaEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.confirmPassword}</span>
                    </label>
                  )}
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Address Line 1 <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="address.line1"
                    className="input input-bordered"
                    value={formData.address.line1}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Address Line 2</span>
                  </label>
                  <input
                    type="text"
                    name="address.line2"
                    className="input input-bordered"
                    value={formData.address.line2}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">City <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    className="input input-bordered"
                    value={formData.address.city}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">State/Province <span className="text-error">*</span></span>
                  </label>
                  <select
                    name="address.state"
                    className="select select-bordered"
                    value={formData.address.state}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="" disabled hidden>
                      Select state/province
                    </option>
                    {ALL_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label} ({state.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Zip/Postal Code <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="address.zipCode"
                    className={`input input-bordered ${errors['address.zipCode'] ? 'input-error' : ''}`}
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    placeholder="e.g., 10001 or 400001"
                    maxLength={12}
                    required
                    disabled={loading}
                  />
                  {errors['address.zipCode'] && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors['address.zipCode']}</span>
                    </label>
                  )}
                </div>
              </div>
              {formData.profileType === 'owner' && (
                <p
                  className="text-xs font-semibold text-rose-500 mt-3"
                  style={{ fontFamily: '"Comic Sans MS", "Trebuchet MS", cursive' }}
                >
                  Owners can finish SSN verification later, but we need business details to set up your owner workspace.
                </p>
              )}
              <div className="form-control mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Register'}
                </button>
              </div>
              <div className="text-center mt-4">
                <span className="text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="link link-primary">
                    Login
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
