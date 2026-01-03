export const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

export const getJWTExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

