// Simple health check script for Docker
import http from 'node:http';

const port = process.env.PORT || 3000;
const options = {
  hostname: 'localhost',
  port: port,
  path: '/health/live',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      console.error(`Health check failed: Status ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  // ECONNREFUSED means server isn't running yet, which is OK during start_period
  if (error.code === 'ECONNREFUSED') {
    console.log(`Server not ready yet on port ${port}`);
    process.exit(1);
  } else {
    console.error(`Health check error: ${error.message}`);
    process.exit(1);
  }
});

req.on('timeout', () => {
  console.error('Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
