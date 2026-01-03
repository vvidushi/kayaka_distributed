import client from 'prom-client';
import { logger } from '../config/logger.js';

// Enable default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'kayak_backend_' });

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1e9;

      const route = req.route?.path || req.originalUrl || req.url || 'unknown';

      httpRequestDuration
        .labels(req.method, route, String(res.statusCode))
        .observe(durationSeconds);
    } catch (error) {
      logger.error('Error recording metrics:', error);
    }
  });

  next();
};

export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to collect metrics:', error);
    res.status(500).send('Failed to collect metrics');
  }
};


