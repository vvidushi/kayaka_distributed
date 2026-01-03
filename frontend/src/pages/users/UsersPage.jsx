import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/api/users';
import { Link } from 'react-router-dom';
import { getStateName } from '../../constants/usStates';

const UsersPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.listUsers(),
  });

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{getStateName(user.address_state)}</td>
                <td>
                  <Link
                    to={`/users/${user.id}`}
                    className="btn btn-sm btn-primary"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;

