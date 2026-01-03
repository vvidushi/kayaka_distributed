import { getPostgresPool } from '../config/database.js';
import { doesProfileRequireSsn } from '../constants/profileTypes.js';

export const requirePropertyCompliance = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query(
      'SELECT profile_type, ssn, ssn_verified_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    const profile = rows[0];

    if (!doesProfileRequireSsn(profile.profile_type)) {
      return next();
    }

    if (!profile.ssn || !profile.ssn_verified_at) {
      return res.status(403).json({
        code: 'SSN_REQUIRED',
        message: 'Add and verify your SSN before creating or approving properties.',
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
