/**
 * Unit test for updating a profile with a new image URL.
 * Mocks out persistence layers to avoid external calls.
 */

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: '+1-555-000-0000',
  address_line1: '1 Main St',
  address_city: 'San Jose',
  address_state: 'CA',
  address_zip_code: '95126',
  profile_image_url: 'http://old.example.com/avatar.png',
  profile_type: 'traveler',
  data_source: 'postgres',
};

const updateUserMock = jest.fn(async () => ({
  ...mockUser,
  profile_image_url: 'http://new.example.com/avatar.png',
}));

const getUserByIdMock = jest.fn(async () => mockUser);

jest.unstable_mockModule('../src/services/users.service.js', () => ({
  getUserById: getUserByIdMock,
  updateUser: updateUserMock,
  createUser: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.unstable_mockModule('../src/services/auth.service.js', () => ({
  getUserById: jest.fn(async () => null),
  updateUserProfile: jest.fn(async () => null),
  deleteUserAccount: jest.fn(async () => null),
}));

jest.unstable_mockModule('../src/services/bookings.service.js', () => ({
  getBlockingBookingsForDeletion: jest.fn(async () => []),
}));

jest.unstable_mockModule('../src/utils/cache.js', () => ({
  invalidateUserProfileCache: jest.fn(async () => null),
}));

let updateProfile;

beforeAll(async () => {
  ({ updateProfile } = await import('../src/services/profile.service.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
  getUserByIdMock
    .mockReset()
    .mockResolvedValueOnce(mockUser) // initial fetch
    .mockResolvedValueOnce({
      ...mockUser,
      profile_image_url: 'http://new.example.com/avatar.png',
    }); // fetch after update
});

describe('profile.service - updateProfile', () => {
  test('updates profile image URL and returns normalized profile', async () => {
    const result = await updateProfile('user-1', {
      profileImageUrl: 'http://new.example.com/avatar.png',
    });

    expect(updateUserMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        profileImageUrl: 'http://new.example.com/avatar.png',
      })
    );
    expect(result).toHaveProperty('profileImageUrl', 'http://new.example.com/avatar.png');
    expect(result).toHaveProperty('firstName', mockUser.first_name);
    expect(result).toHaveProperty('email', mockUser.email);
  });
});
