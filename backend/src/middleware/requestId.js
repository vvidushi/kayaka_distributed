import { randomUUID } from 'crypto';

export const requestId = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

