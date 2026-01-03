import { getMongoDB } from '../src/config/database.js';
import { hashPassword } from '../src/services/auth.service.js';
import { logger } from '../src/config/logger.js';

/**
 * Seed test users for E2E testing
 * Creates traveler, owner, and admin test accounts
 */

const TEST_USERS = [
  {
    email: 'e2e.traveler@test.kayak.com',
    password: 'TestTraveler123!',
    firstName: 'Test',
    lastName: 'Traveler',
    phoneNumber: '+1-555-123-4567',
    role: 'user',
    profileType: 'traveler',
    loyaltyTier: 'none',
    address: {
      line1: '123 Test Street',
      line2: '',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
    },
    partnerProfile: null,
  },
  {
    email: 'e2e.owner@test.kayak.com',
    password: 'TestOwner123!',
    firstName: 'Test',
    lastName: 'Owner',
    phoneNumber: '+1-555-987-6543',
    role: 'user',
    profileType: 'owner',
    loyaltyTier: 'none',
    ssn: '123-45-6789',
    address: {
      line1: '456 Property Ave',
      line2: 'Suite 100',
      city: 'Business City',
      state: 'NY',
      zipCode: '54321',
    },
    partnerProfile: {
      companyName: 'Test Properties Inc',
      contactName: 'Test Owner',
      contactEmail: 'e2e.owner@test.kayak.com',
      portfolioSize: '50',
      website: 'https://testproperties.example.com',
    },
  },
  {
    email: 'e2e.admin@test.kayak.com',
    password: 'TestAdmin123!',
    firstName: 'Test',
    lastName: 'Admin',
    phoneNumber: '+1-555-000-0000',
    role: 'admin',
    profileType: 'traveler',
    loyaltyTier: 'platinum',
    address: {
      line1: '789 Admin Blvd',
      line2: '',
      city: 'Admin City',
      state: 'CA',
      zipCode: '99999',
    },
    partnerProfile: null,
  },
];

async function seedTestUsers() {
  try {
    const db = await getMongoDB();
    const usersCollection = db.collection('users');

    logger.info('Starting test user seed...');

    for (const userData of TEST_USERS) {
      const { password, ...userWithoutPassword } = userData;
      
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: userData.email });
      
      if (existingUser) {
        logger.info(`User ${userData.email} already exists, updating...`);
        
        // Update existing user with hashed password
        const passwordHash = await hashPassword(password);
        await usersCollection.updateOne(
          { email: userData.email },
          {
            $set: {
              ...userWithoutPassword,
              passwordHash,
              updatedAt: new Date(),
            },
          }
        );
        logger.info(`Updated user: ${userData.email}`);
      } else {
        // Create new user
        const passwordHash = await hashPassword(password);
        const newUser = {
          ...userWithoutPassword,
          passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
          ssnVerifiedAt: userData.ssn ? new Date() : null,
        };

        await usersCollection.insertOne(newUser);
        logger.info(`Created user: ${userData.email}`);
      }
    }

    logger.info('Test user seed completed successfully!');
    logger.info('\nTest Credentials:');
    logger.info('==================');
    logger.info('Traveler:');
    logger.info('  Email: e2e.traveler@test.kayak.com');
    logger.info('  Password: TestTraveler123!');
    logger.info('\nOwner:');
    logger.info('  Email: e2e.owner@test.kayak.com');
    logger.info('  Password: TestOwner123!');
    logger.info('\nAdmin:');
    logger.info('  Email: e2e.admin@test.kayak.com');
    logger.info('  Password: TestAdmin123!');
    logger.info('==================\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding test users:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUsers();
}

export default seedTestUsers;

