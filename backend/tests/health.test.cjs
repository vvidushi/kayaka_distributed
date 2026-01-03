const request = require('supertest');

let app;

beforeAll(() => {
  // Import the compiled ES module server via default export pattern
  // The server file exports the Express app as default for testing
  // If not, we can require a separate app export file.
  // For now, we hit the running server on localhost:3000 as a smoke test.
});

describe('Health endpoints', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  test('GET /health/live should return alive status', async () => {
    const res = await request(baseUrl).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'alive');
  });

  test('GET /health/ready should return ready status', async () => {
    const res = await request(baseUrl).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ready');
  });
});


