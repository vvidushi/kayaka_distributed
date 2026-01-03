import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/api/users';
import { Link } from 'react-router-dom';
import { getStateName } from '../../constants/usStates';
import { useToast } from '../../hooks/useToast';
import { FaBan, FaCheckCircle } from 'react-icons/fa';

const UsersPage = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.listUsers(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId) => usersApi.deactivateUser(userId),
    onSuccess: () => {
      toast.showSuccess('User account deactivated');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      toast.showError(error.response?.data?.message || 'Failed to deactivate user');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId) => usersApi.reactivateUser(userId),
    onSuccess: () => {
      toast.showSuccess('User account reactivated');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      toast.showError(error.response?.data?.message || 'Failed to reactivate user');
    },
  });

  const handleDeactivate = (userId, email) => {
    if (window.confirm(`Are you sure you want to deactivate the account for ${email}?`)) {
      deactivateMutation.mutate(userId);
    }
  };

  const handleReactivate = (userId, email) => {
    if (window.confirm(`Are you sure you want to reactivate the account for ${email}?`)) {
      reactivateMutation.mutate(userId);
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
        <span>Error loading users: {error.message}</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>State</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((user) => {
              const isSuspended = user.role === 'suspended';
              return (
                <tr key={user.id} className={isSuspended ? 'opacity-60' : ''}>
                  <td>{user.id}</td>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>{getStateName(user.address_state)}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-error' : user.role === 'moderator' ? 'badge-warning' : 'badge-info'}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td>
                    {isSuspended ? (
                      <span className="badge badge-error">Suspended</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/users/${user.id}`}
                        className="btn btn-sm btn-primary"
                      >
                        View
                      </Link>
                      {isSuspended ? (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleReactivate(user.id, user.email)}
                          disabled={reactivateMutation.isLoading}
                        >
                          <FaCheckCircle className="mr-1" />
                          Reactivate
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleDeactivate(user.id, user.email)}
                          disabled={deactivateMutation.isLoading || user.role === 'admin'}
                          title={user.role === 'admin' ? 'Admins cannot be deactivated' : ''}
                        >
                          <FaBan className="mr-1" />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;

