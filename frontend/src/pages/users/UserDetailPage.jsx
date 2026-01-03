import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { usersApi } from '../../services/api/users';
import { useAuth } from '../../hooks/useAuth';
import { updateUser as updateUserAction } from '../../store/slices/authSlice';
import { getStateName } from '../../constants/usStates';

const UserDetailPage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [ssnValue, setSsnValue] = useState('');
  const [ssnError, setSsnError] = useState('');
  const [ssnSuccess, setSsnSuccess] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUser(userId),
  });

  const isSelf = currentUser?.id === userId;
  const isPropertyOwner = data?.profile_type === 'property_owner';
  const partnerDetails = data?.partner_details || null;
  const ssnOnFile = Boolean(data?.ssn);

  const ssnMutation = useMutation({
    mutationFn: (payload) => usersApi.updateSsn(userId, payload),
    onSuccess: (response) => {
      const verifiedAt = response.data?.compliance?.verifiedAt || new Date().toISOString();
      setSsnValue('');
      setSsnError('');
      setSsnSuccess('SSN saved. You can now submit properties for approval.');
      queryClient.invalidateQueries(['user', userId]);
      if (isSelf) {
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
      }
    },
    onError: (mutationError) => {
      const message = mutationError.response?.data?.message || 'Unable to save SSN';
      setSsnError(message);
      setSsnSuccess('');
    },
  });

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
        <span>Error loading user: {error.message}</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Details</h1>
      {data && (
        <>
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">
                {data.first_name} {data.last_name}
              </h2>
              <p>Email: {data.email}</p>
              <p>Phone: {data.phone_number}</p>
              <p>
                Address: {data.address_line1}, {data.address_city}, {getStateName(data.address_state)}{' '}
                {data.address_zip_code}
              </p>
              <p>Profile Type: {isPropertyOwner ? 'Property partner' : 'Traveler'}</p>
            </div>
          </div>

          {isPropertyOwner && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body space-y-2">
                <h3 className="card-title">Partner Details</h3>
                <p>Company: {partnerDetails?.companyName || 'Not provided'}</p>
                <p>Contact Name: {partnerDetails?.contactName || 'Not provided'}</p>
                <p>Contact Email: {partnerDetails?.contactEmail || 'Not provided'}</p>
                <p>Website: {partnerDetails?.website || 'Not provided'}</p>
                <p>
                  Portfolio Size:{' '}
                  {partnerDetails?.portfolioSize !== null && partnerDetails?.portfolioSize !== undefined
                    ? partnerDetails.portfolioSize
                    : 'Not provided'}
                </p>
              </div>
            </div>
          )}

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body space-y-2">
              <h3 className="card-title">Property Compliance</h3>
              <p>SSN on file: {ssnOnFile ? 'Yes' : 'No'}</p>
              <p>
                Status:{' '}
                {ssnOnFile
                  ? data.ssn_verified_at
                    ? `Verified ${new Date(data.ssn_verified_at).toLocaleString()}`
                    : 'Pending verification'
                  : 'Missing'}
              </p>
              {isPropertyOwner && !ssnOnFile && (
                <p className="text-sm text-base-content/70">
                  Property partners must add their SSN before submitting a property for approval.
                </p>
              )}

              {isSelf && isPropertyOwner && (
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
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserDetailPage;
