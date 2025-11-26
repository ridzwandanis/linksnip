/**
 * Health Routes Tests
 * Tests for health check endpoint
 */

const request = require('supertest');
const createApp = require('../app');
const { isConnected } = require('../config/database');

// Mock the database module
jest.mock('../config/database');

describe('Health Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and healthy status when database is connected', async () => {
      // Mock database as connected
      isConnected.mockReturnValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        status: 'healthy',
        server: 'ok',
        database: 'connected',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should return 503 and unhealthy status when database is disconnected', async () => {
      // Mock database as disconnected
      isConnected.mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        success: false,
        status: 'unhealthy',
        server: 'ok',
        database: 'disconnected',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });
});
