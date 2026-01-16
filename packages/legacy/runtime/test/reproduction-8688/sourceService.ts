import fs from 'fs';
import path from 'path';
import express from 'express';
import { createDisposableServer } from '../../../../testing/createDisposableServer';

export function startService() {
  const app = express();
  const port = 3000;

  // Middleware
  app.use(express.json());

  let activeConnections = 0;

  app.use((req, res, next) => {
    activeConnections++;
    console.log(`Active connections: ${activeConnections}`);

    res.on('finish', () => {
      activeConnections--;
      console.log(`Active connections: ${activeConnections}`);
    });

    next();
  });

  // Single GET endpoint
  app.get('/api/data', (req, res) => {
    try {
      // Try to read from mock-data directory first
      const mockDataPath = path.join(__dirname, 'response.json');

      if (fs.existsSync(mockDataPath)) {
        const mockData = fs.readFileSync(mockDataPath, 'utf8');
        res.json(JSON.parse(mockData));
      } else {
        // Fallback to default mock data
        const defaultMockData = {
          message: 'Hello from Mock API!',
          timestamp: new Date().toISOString(),
          status: 'success',
          data: {
            id: 1,
            name: 'Mock Service',
            description: 'This is a mock API service with a single GET endpoint',
          },
        };
        res.json(defaultMockData);
      }
    } catch (error) {
      console.error('Error reading mock data:', error);
      res.status(500).json({
        error: 'Failed to load mock data',
        message: error.message,
      });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Mock API Service',
      endpoints: {
        'GET /api/data': 'Returns mock data',
        'GET /health': 'Health check endpoint',
      },
    });
  });

  return createDisposableServer(app, { port });
}
