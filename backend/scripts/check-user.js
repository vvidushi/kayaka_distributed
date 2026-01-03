import { getPostgresPool, getMongoDB } from '../src/config/database.js';
import { logger } from '../src/config/logger.js';
import { ObjectId } from 'mongodb';

const email = process.argv[2] || 'jane@example.com';

async function checkUser() {
  try {
    logger.info(`Checking user: ${email}`);
    
    // Check PostgreSQL
    logger.info('Checking PostgreSQL...');
    try {
      const pool = getPostgresPool();
      const pgResult = await pool.query(
        `SELECT id, email, first_name, last_name, phone_number,
         address_line1, address_line2, address_city, address_state, address_zip_code,
         profile_image_url, role, loyalty_tier, profile_type, ssn_verified_at,
         partner_details, created_at, updated_at, last_login
         FROM users WHERE email = $1`,
        [email]
      );
      
      if (pgResult.rows.length > 0) {
        logger.info('Found in PostgreSQL:');
        logger.info(JSON.stringify(pgResult.rows[0], null, 2));
        logger.info(`\nKey fields:
          - ID: ${pgResult.rows[0].id}
          - Email: ${pgResult.rows[0].email || 'MISSING'}
          - First Name: ${pgResult.rows[0].first_name || 'MISSING'}
          - Last Name: ${pgResult.rows[0].last_name || 'MISSING'}
        `);
      } else {
        logger.info('Not found in PostgreSQL');
      }
    } catch (pgError) {
      logger.warn(`PostgreSQL check failed: ${pgError.message}`);
    }
    
    // Check MongoDB
    logger.info('\nChecking MongoDB...');
    try {
      const db = await getMongoDB();
      const usersCollection = db.collection('users');
      const mongoUser = await usersCollection.findOne({ email });
      
      if (mongoUser) {
        logger.info('Found in MongoDB:');
        logger.info(JSON.stringify(mongoUser, null, 2));
        logger.info(`\nKey fields:
          - ID: ${mongoUser._id.toString()}
          - Email: ${mongoUser.email || 'MISSING'}
          - First Name: ${mongoUser.firstName || 'MISSING'}
          - Last Name: ${mongoUser.lastName || 'MISSING'}
        `);
        
        // Also test getUserById with the MongoDB ID
        logger.info(`\nTesting getUserById with MongoDB ID: ${mongoUser._id.toString()}`);
        const { getUserById } = await import('../src/services/users.service.js');
        const userById = await getUserById(mongoUser._id.toString());
        if (userById) {
          logger.info('getUserById result:');
          logger.info(`  - ID: ${userById.id}`);
          logger.info(`  - Email: ${userById.email || 'MISSING'}`);
          logger.info(`  - First Name: ${userById.first_name || 'MISSING'}`);
          logger.info(`  - Last Name: ${userById.last_name || 'MISSING'}`);
          logger.info(`  - Data Source: ${userById.data_source || 'unknown'}`);
        } else {
          logger.warn('getUserById returned null');
        }
      } else {
        logger.info('Not found in MongoDB');
      }
    } catch (mongoError) {
      logger.warn(`MongoDB check failed: ${mongoError.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error checking user:', error);
    process.exit(1);
  }
}

checkUser();

